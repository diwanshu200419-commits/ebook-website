const express = require("express");
const Joi = require("joi");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const { serializeBook } = require("../services/bookData");
const { buildSignedBookAccessUrls } = require("../services/bookAccess");
const {
  generateDescriptionWithAI,
  getBookAiReport,
} = require("../services/ai/pipeline");
const { buildCreatorAssist } = require("../services/ai/creatorAssist");
const {
  getConfiguredAiProvider,
  getEmbeddingDimensions,
  getEmbeddingModel,
  getModerationModel,
  getOpenAIBaseUrl,
  hasOpenAI,
  hasOllama,
  hasOllamaEmbeddings,
} = require("../services/ai/client");
const { enqueueBookAIProcessing } = require("../services/ai/queue");
const {
  getOptionalUserFromRequest,
  getRecommendedBooks,
} = require("../services/ai/search");

const router = express.Router();

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: "AI request limit reached. Try again shortly.",
  },
});

const descriptionSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160).required(),
  category: Joi.string().trim().max(60).allow(""),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(32)).max(8),
    Joi.string().allow("")
  ),
  notes: Joi.string().trim().max(5000).allow(""),
  excerpt: Joi.string().trim().max(6000).allow(""),
});

const creatorAssistSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160).required(),
  type: Joi.string().trim().max(60).allow(""),
  category: Joi.string().trim().max(60).allow(""),
  language: Joi.string().trim().max(40).allow(""),
  price: Joi.number().min(0).max(100000).default(0),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(32)).max(8),
    Joi.string().allow("")
  ),
  notes: Joi.string().trim().max(5000).allow(""),
  excerpt: Joi.string().trim().max(6000).allow(""),
});

router.use(aiLimiter);

router.get("/status", (req, res) => {
  const provider = getConfiguredAiProvider();
  const embeddingModel = getEmbeddingModel();

  return res.json({
    success: true,
    provider,
    model: getModerationModel(),
    embeddingModel: embeddingModel || null,
    embeddingDimensions: embeddingModel ? getEmbeddingDimensions() : 0,
    embeddingsReady: hasOpenAI() || hasOllamaEmbeddings(),
    mode:
      provider === "openai"
        ? (getOpenAIBaseUrl() ? "hosted-compatible" : "openai")
        : provider === "ollama"
          ? "ollama"
          : "fallback",
    hosted: hasOpenAI() || hasOllama(),
  });
});

async function assertAiReportAccess(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.bookId)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.bookId).select("author");
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(book.author) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    req.aiBook = book;
    return next();
  } catch (error) {
    console.error("AI access check error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to validate access" });
  }
}

router.get("/books/:bookId/report", protect, authorize("admin", "creator", "author"), assertAiReportAccess, async (req, res) => {
  try {
    const payload = await getBookAiReport(req.params.bookId);
    if (!payload) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    return res.json({
      success: true,
      book: serializeBook(payload.book, {
        backendBaseUrl,
        includeFilePath: false,
        previewUrl: payload.book.previewPath ? `/api/books/${payload.book._id}/preview` : "",
        downloadUrl: `/api/books/${payload.book._id}/download`,
        ...buildSignedBookAccessUrls(payload.book, {
          canPreview: true,
          canDownload: true,
          isOwner: true,
          isAdmin: req.user.role === "admin",
          isPurchased: false,
        }),
        access: {
          canPreview: true,
          canDownload: true,
          isOwner: true,
          isAdmin: req.user.role === "admin",
          isPurchased: false,
        },
      }),
      report: payload.report,
    });
  } catch (error) {
    console.error("Get AI report error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load AI report" });
  }
});

router.post("/books/:bookId/reprocess", protect, authorize("admin", "creator", "author"), assertAiReportAccess, async (req, res) => {
  try {
    await Book.findByIdAndUpdate(req.params.bookId, {
      aiProcessingState: "queued",
      status: req.user.role === "admin" ? "Admin_Review" : "AI_Review",
      aiStatus: "pending",
      moderationReason: "AI review queued again.",
      aiSuggestion: "A fresh AI scan has been queued for this upload.",
    });

    enqueueBookAIProcessing(req.params.bookId, { allowStatusChange: true });

    return res.json({
      success: true,
      message: "AI reprocessing queued successfully",
      processingState: "queued",
    });
  } catch (error) {
    console.error("Queue AI reprocess error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to queue AI reprocessing" });
  }
});

router.post("/generate-description", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const parsedTags = Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

    const { value, error } = descriptionSchema.validate(
      {
        ...req.body,
        tags: parsedTags,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await generateDescriptionWithAI(value);
    return res.json({
      success: true,
      description: result.description,
      suggestedCategory: result.suggestedCategory,
      generatedTags: result.generatedTags,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("Generate description error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to generate description" });
  }
});

router.post("/creator-assist", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const parsedTags = Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

    const { value, error } = creatorAssistSchema.validate(
      {
        ...req.body,
        price: Number(req.body.price || 0),
        tags: parsedTags,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await buildCreatorAssist(value);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Creator assist error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to build creator assist suggestions" });
  }
});

router.get("/recommendations", async (req, res) => {
  try {
    const viewer = await getOptionalUserFromRequest(req);
    const books = await getRecommendedBooks({
      backendBaseUrl,
      bookId: String(req.query.bookId || ""),
      userId: viewer?._id ? String(viewer._id) : "",
      limit: req.query.limit || 6,
    });

    return res.json({
      success: true,
      books,
    });
  } catch (error) {
    console.error("Recommendations error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load recommendations" });
  }
});

router.get("/admin/overview", protect, authorize("admin"), async (req, res) => {
  try {
    const [statusCounts, riskCounts, processingCounts, topFlagged] = await Promise.all([
      Book.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Book.aggregate([
        {
          $facet: {
            highRisk: [{ $match: { plagiarismScore: { $gte: 70 } } }, { $count: "count" }],
            manualReview: [{ $match: { aiStatus: "pending" } }, { $count: "count" }],
            autoApproved: [{ $match: { aiStatus: "approved" } }, { $count: "count" }],
            rejected: [{ $match: { aiStatus: "rejected" } }, { $count: "count" }],
          },
        },
      ]),
      Book.aggregate([
        { $group: { _id: "$aiProcessingState", count: { $sum: 1 } } },
      ]),
      Book.find({
        $or: [
          { aiStatus: "pending" },
          { plagiarismScore: { $gte: 60 } },
          { aiProcessingState: "failed" },
        ],
      })
        .sort({ plagiarismScore: -1, aiScore: 1, createdAt: -1 })
        .limit(5)
        .select("title aiScore aiStatus plagiarismScore qualityScore moderationReason"),
    ]);

    const mapFromAggregate = (entries) => entries.reduce((accumulator, entry) => {
      accumulator[entry._id || "Unknown"] = entry.count;
      return accumulator;
    }, {});
    const riskSummary = riskCounts[0] || {};

    return res.json({
      success: true,
      summary: {
        statuses: mapFromAggregate(statusCounts),
        processing: mapFromAggregate(processingCounts),
        highRisk: riskSummary.highRisk?.[0]?.count || 0,
        manualReview: riskSummary.manualReview?.[0]?.count || 0,
        autoApproved: riskSummary.autoApproved?.[0]?.count || 0,
        rejected: riskSummary.rejected?.[0]?.count || 0,
      },
      topFlagged: topFlagged.map((book) => serializeBook(book, { backendBaseUrl, includeFilePath: false })),
    });
  } catch (error) {
    console.error("AI admin overview error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load AI overview" });
  }
});

module.exports = router;
