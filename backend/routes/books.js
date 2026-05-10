const express = require("express");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const BookAI = require("../models/BookAI");
const Payment = require("../models/Payment");
const User = require("../models/user");
const { buildAIReview } = require("../services/aiReview");
const { enqueueBookAIProcessing } = require("../services/ai/queue");
const { searchApprovedBooks } = require("../services/ai/search");
const { serializeBook } = require("../services/bookData");
const {
  ensureUploadDir,
  buildPublicUploadPath,
  resolvePublicUploadPath,
  safeDeletePublicFile,
} = require("../utils/uploads");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

const PDF_FIELDS = new Set(["pdf", "bookFile"]);
const IMAGE_FIELDS = new Set(["cover", "thumbnail"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const categoryValues = Book.schema.path("category").enumValues;
const typeValues = Book.schema.path("type").enumValues;

const uploadSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160).required(),
  description: Joi.string().trim().min(30).max(5000).required(),
  price: Joi.number().min(0).max(100000).default(0),
  category: Joi.string().valid(...categoryValues).required(),
  type: Joi.string().valid(...typeValues).default("Book"),
  language: Joi.string().trim().max(40).default("English"),
  authorName: Joi.string().trim().max(120).allow(""),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(24)).max(8),
    Joi.string().allow("")
  ),
});

const updateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160),
  description: Joi.string().trim().min(30).max(5000),
  price: Joi.number().min(0).max(100000),
  category: Joi.string().valid(...categoryValues),
  type: Joi.string().valid(...typeValues),
  language: Joi.string().trim().max(40),
  tags: Joi.array().items(Joi.string().trim().max(24)).max(8),
});

const booksUploadPath = ensureUploadDir("books");
const coversUploadPath = ensureUploadDir("covers");

function safeFilename(originalname) {
  const extension = path.extname(String(originalname || "")).toLowerCase();
  const baseName = path
    .basename(String(originalname || ""), extension)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);

  return `${Date.now()}-${baseName || "file"}${extension}`;
}

function isPdfFile(file) {
  const extension = path.extname(String(file?.originalname || "")).toLowerCase();
  return file?.mimetype === "application/pdf" || extension === ".pdf";
}

function isImageFile(file) {
  const extension = path.extname(String(file?.originalname || "")).toLowerCase();
  return Boolean(file?.mimetype?.startsWith("image/")) || IMAGE_EXTENSIONS.has(extension);
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parseTags(parsed);
    }
  } catch {
    // fall through to CSV parsing
  }

  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildBookPayload(book, access) {
  return serializeBook(book, {
    backendBaseUrl,
    includeFilePath: false,
    previewUrl: access.canPreview ? `/api/books/${book._id}/preview` : "",
    downloadUrl: access.canDownload ? `/api/books/${book._id}/download` : "",
    statusLabel: book.isArchived ? "Archived" : book.status,
  });
}

function createUploadMiddleware() {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (PDF_FIELDS.has(file.fieldname)) {
        return cb(null, booksUploadPath);
      }

      if (IMAGE_FIELDS.has(file.fieldname)) {
        return cb(null, coversUploadPath);
      }

      return cb(new Error("Unsupported upload field"));
    },
    filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
  });

  return multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (PDF_FIELDS.has(file.fieldname)) {
        return isPdfFile(file)
          ? cb(null, true)
          : cb(new Error("Only PDF files are allowed for book uploads"));
      }

      if (IMAGE_FIELDS.has(file.fieldname)) {
        return isImageFile(file)
          ? cb(null, true)
          : cb(new Error("Only image files are allowed for covers"));
      }

      return cb(new Error("Unsupported upload field"));
    },
  });
}

const upload = createUploadMiddleware();

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.fields([
      { name: "pdf", maxCount: 1 },
      { name: "bookFile", maxCount: 1 },
      { name: "cover", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ])(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function cleanupUploadedFiles(req) {
  const files = Object.values(req.files || {}).flat();
  files.forEach((file) => {
    if (!file?.filename) {
      return;
    }

    if (PDF_FIELDS.has(file.fieldname)) {
      safeDeletePublicFile(buildPublicUploadPath("books", file.filename));
      return;
    }

    if (IMAGE_FIELDS.has(file.fieldname)) {
      safeDeletePublicFile(buildPublicUploadPath("covers", file.filename));
    }
  });
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if (typeof req.query?.token === "string" && req.query.token.trim()) {
    return req.query.token.trim();
  }

  return "";
}

async function getOptionalUser(req) {
  const token = getAuthToken(req);
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.status === "blocked" || user.isDeleted) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

async function getBookAccess(book, user) {
  const userId = user?._id || user?.id;
  const isOwner = Boolean(userId) && String(book.author) === String(userId);
  const isAdmin = user?.role === "admin";

  if (!book.isPaid) {
    return {
      isOwner,
      isAdmin,
      isPurchased: false,
      canPreview: true,
      canDownload: Boolean(user) || !book.requiresLogin,
    };
  }

  if (!user) {
    return {
      isOwner,
      isAdmin,
      isPurchased: false,
      canPreview: false,
      canDownload: false,
    };
  }

  if (isOwner || isAdmin) {
    return {
      isOwner,
      isAdmin,
      isPurchased: false,
      canPreview: true,
      canDownload: true,
    };
  }

  const purchaseExists = await Payment.exists({
    user: userId,
    book: book._id,
    status: "approved",
  });

  return {
    isOwner,
    isAdmin,
    isPurchased: Boolean(purchaseExists),
    canPreview: Boolean(purchaseExists),
    canDownload: Boolean(purchaseExists),
  };
}

function getSortConfig(sort) {
  switch (String(sort || "").toLowerCase()) {
    case "oldest":
      return { createdAt: 1 };
    case "price-low":
      return { price: 1, createdAt: -1 };
    case "price-high":
      return { price: -1, createdAt: -1 };
    case "title":
      return { title: 1 };
    case "trending":
      return { salesCount: -1, views: -1, downloads: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

/* =====================================
   Upload Book
===================================== */
router.post("/upload", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    await runUpload(req, res);

    const rawTags = parseTags(req.body.tags);
    const { value, error } = uploadSchema.validate(
      {
        ...req.body,
        price: Number(req.body.price || 0),
        tags: rawTags,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      cleanupUploadedFiles(req);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const pdfFile = req.files?.pdf?.[0] || req.files?.bookFile?.[0];
    const coverFile = req.files?.cover?.[0] || req.files?.thumbnail?.[0];

    if (!pdfFile || !isPdfFile(pdfFile)) {
      cleanupUploadedFiles(req);
      return res.status(400).json({
        success: false,
        message: "A valid PDF file is required",
      });
    }

    if (coverFile && !isImageFile(coverFile)) {
      cleanupUploadedFiles(req);
      return res.status(400).json({
        success: false,
        message: "Cover image must be PNG, JPG, WEBP, or GIF",
      });
    }

    const aiReview = await buildAIReview({
      title: value.title,
      description: value.description,
      category: value.category,
      price: value.price,
      tags: value.tags,
      type: value.type,
    });

    const isPaid = Number(value.price || 0) > 0;
    const filePath = buildPublicUploadPath("books", pdfFile.filename);
    const coverImage = coverFile
      ? buildPublicUploadPath("covers", coverFile.filename)
      : "";

    const book = await Book.create({
      title: value.title,
      authorName: value.authorName || req.user.name,
      author: req.user.id,
      type: value.type,
      category: value.category,
      language: value.language,
      tags: value.tags,
      description: value.description,
      price: value.price,
      filePath,
      previewPath: isPaid ? "" : filePath,
      coverImage,
      coverAlt: value.title,
      isPaid,
      requiresLogin: true,
      status: aiReview.aiStatus === "rejected" ? "Rejected" : "AI_Review",
      aiStatus: aiReview.aiStatus === "rejected" ? "rejected" : "pending",
      aiScore: aiReview.aiScore,
      plagiarismScore: aiReview.plagiarismScore,
      qualityScore: aiReview.qualityScore,
      aiSuggestion:
        aiReview.aiStatus === "rejected"
          ? aiReview.aiSuggestion
          : "AI scan queued. Full PDF moderation is processing in the background.",
      moderationReason:
        aiReview.aiStatus === "rejected"
          ? aiReview.aiSuggestion
          : "Initial validation passed. Full PDF AI review has been queued.",
      aiCategory: value.category,
      aiTags: value.tags,
      aiProcessingState: aiReview.aiStatus === "rejected" ? "completed" : "queued",
    });

    if (aiReview.aiStatus !== "rejected") {
      enqueueBookAIProcessing(book._id, { allowStatusChange: true });
    }

    const access = await getBookAccess(book, req.user);

    return res.status(201).json({
      success: true,
      message: aiReview.aiStatus === "rejected"
        ? "Book uploaded, but the initial AI checks flagged it for rejection."
        : "Book uploaded successfully and AI review has started.",
      book: buildBookPayload(book, access),
      moderation: {
        status: book.status,
        aiStatus: book.aiStatus,
        aiScore: aiReview.aiScore,
        plagiarismScore: aiReview.plagiarismScore,
        qualityScore: aiReview.qualityScore,
        aiSuggestion: book.aiSuggestion,
        processingState: book.aiProcessingState,
      },
      aiStatus: book.aiStatus,
      aiScore: aiReview.aiScore,
      plagiarismScore: aiReview.plagiarismScore,
      qualityScore: aiReview.qualityScore,
      aiSuggestion: book.aiSuggestion,
      aiProcessingState: book.aiProcessingState,
    });
  } catch (error) {
    cleanupUploadedFiles(req);

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Upload limit exceeded. PDFs can be up to 50MB."
            : error.message,
      });
    }

    console.error("Upload Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
});

/* =====================================
   Get Marketplace Books
===================================== */
router.get("/", async (req, res) => {
  try {
    const result = await searchApprovedBooks({
      backendBaseUrl,
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      search: req.query.search,
      sort: req.query.sort,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get Books Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================
   Get Category Counts
===================================== */
router.get("/categories/counts", async (req, res) => {
  try {
    const categories = await Book.aggregate([
      { $match: { status: "Approved", isArchived: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const totalBooks = categories.reduce((sum, entry) => sum + Number(entry.count || 0), 0);

    return res.json({
      success: true,
      categories: categories.map((entry) => ({
        name: entry._id || "Other",
        count: entry.count,
      })),
      summary: {
        totalCategories: categories.length,
        totalBooks,
      },
    });
  } catch (error) {
    console.error("Get Category Counts Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================
   Get Creator Books
===================================== */
router.get("/my/books", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id }).sort({ createdAt: -1 });
    const payload = await Promise.all(
      books.map(async (book) => buildBookPayload(book, await getBookAccess(book, req.user)))
    );

    return res.json({
      success: true,
      books: payload,
      summary: {
        totalBooks: payload.length,
        publishedBooks: payload.filter((book) => book.rawStatus === "Approved" && !book.isArchived).length,
        archivedBooks: payload.filter((book) => book.isArchived).length,
      },
    });
  } catch (error) {
    console.error("Get My Books Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/my-books", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id }).sort({ createdAt: -1 });
    const payload = await Promise.all(
      books.map(async (book) => buildBookPayload(book, await getBookAccess(book, req.user)))
    );
    return res.json({ success: true, books: payload });
  } catch (error) {
    console.error("Get My Books Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================
   Preview Book
===================================== */
router.get("/:id/preview", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const user = await getOptionalUser(req);
    const access = await getBookAccess(book, user);

    if (book.isArchived && !access.canPreview && !access.isOwner && !access.isAdmin) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (!access.canPreview) {
      return res.status(403).json({
        success: false,
        message: "Preview unavailable until purchase",
      });
    }

    const targetPath = resolvePublicUploadPath(book.previewPath || book.filePath);
    if (!targetPath) {
      return res.status(404).json({
        success: false,
        message: "Preview file not found",
      });
    }

    return res.sendFile(targetPath, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Preview Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   Get Single Book
===================================== */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id).populate("author", "name username bio");
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const user = await getOptionalUser(req);
    const access = await getBookAccess(book, user);

    if (book.isArchived && !access.canDownload && !access.isOwner && !access.isAdmin) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (req.query.track === "1" && !book.isArchived) {
      await Book.findByIdAndUpdate(book._id, { $inc: { views: 1 } });
      book.views = Number(book.views || 0) + 1;
    }

    return res.json({
      success: true,
      book: buildBookPayload(book, access),
      access,
    });
  } catch (error) {
    console.error("Get Book Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   Download Book
===================================== */
router.get("/:id/download", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const access = await getBookAccess(book, req.user);
    if (!access.canDownload) {
      return res.status(403).json({
        success: false,
        message: "Purchase required to download",
      });
    }

    const filePath = resolvePublicUploadPath(book.filePath);
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    await Book.findByIdAndUpdate(book._id, { $inc: { downloads: 1 } });

    return res.download(filePath, `${book.title}.pdf`);
  } catch (error) {
    console.error("Download Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   Update Book Metadata
===================================== */
router.put("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const isOwner = String(book.author) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const payload = {
      ...req.body,
      tags: parseTags(req.body.tags),
    };

    if (payload.price !== undefined) {
      payload.price = Number(payload.price);
    }

    const { value, error } = updateSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    Object.assign(book, value);

    if (value.price !== undefined) {
      book.isPaid = Number(value.price || 0) > 0;
      if (!book.isPaid && !book.previewPath) {
        book.previewPath = book.filePath;
      }
      if (book.isPaid) {
        book.previewPath = "";
      }
    }

    book.aiProcessingState = "queued";
    book.aiStatus = "pending";
    book.aiSuggestion = "Metadata updated. AI analysis is refreshing.";
    book.moderationReason = "Metadata changed after upload. AI analysis queued again.";

    await book.save();
    enqueueBookAIProcessing(book._id, { allowStatusChange: false });
    const access = await getBookAccess(book, req.user);

    return res.json({
      success: true,
      message: "Book updated successfully",
      book: buildBookPayload(book, access),
    });
  } catch (error) {
    console.error("Update Book Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   Delete or Archive Book
===================================== */
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const isOwner = String(book.author) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const paymentExists = await Payment.exists({ book: book._id });

    if (paymentExists || Number(book.salesCount || 0) > 0) {
      book.isArchived = true;
      book.archivedAt = new Date();
      await book.save();

      return res.json({
        success: true,
        mode: "archived",
        message: "Book archived to preserve existing orders and downloads",
      });
    }

    const filesToDelete = [book.filePath, book.previewPath, book.coverImage].filter(Boolean);
    await Promise.all([
      Book.findByIdAndDelete(book._id),
      BookAI.deleteOne({ book: book._id }),
    ]);
    filesToDelete.forEach((publicPath) => safeDeletePublicFile(publicPath));

    return res.json({
      success: true,
      mode: "deleted",
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete Book Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
