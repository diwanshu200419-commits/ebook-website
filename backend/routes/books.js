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
const BookReview = require("../models/BookReview");
const Payment = require("../models/Payment");
const ReviewReport = require("../models/ReviewReport");
const User = require("../models/user");
const { buildAIReview } = require("../services/aiReview");
const { enqueueBookAIProcessing } = require("../services/ai/queue");
const {
  getOptionalUserFromRequest,
  searchApprovedBooks,
} = require("../services/ai/search");
const { serializeBook } = require("../services/bookData");
const {
  serializeBookReview,
  syncBookAndCreatorRatings,
} = require("../services/reviewData");
const {
  getImportableLibraryCatalog,
  importBuiltinLibraryForCreator,
} = require("../services/catalogImport");
const {
  buildSignedBookAccessUrls,
  verifyBookAssetToken,
} = require("../services/bookAccess");
const { readCookieValue } = require("../utils/authCookies");
const {
  ensureUploadDir,
  buildPublicUploadPath,
  resolvePublicUploadPath,
  safeDeletePublicFile,
} = require("../utils/uploads");
const {
  normalizeBooleanFlag,
  normalizePreviewPages,
  normalizePricing,
} = require("../utils/bookCatalog");
const {
  buildDeliveryMode,
  buildDownloadFilename,
  buildTextPreview,
  isPdfLikeFile,
  isPdfRequiredType,
  isSupportedPrimaryFile,
  isTextFirstType,
} = require("../utils/productTypes");
const { createBookPreview } = require("../utils/pdfPreview");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

const PRODUCT_FILE_FIELDS = new Set(["pdf", "bookFile", "productFile"]);
const IMAGE_FIELDS = new Set(["cover", "thumbnail"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const categoryValues = Book.schema.path("category").enumValues;
const typeValues = Book.schema.path("type").enumValues;

const uploadSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160).required(),
  description: Joi.string().trim().min(30).max(5000).required(),
  price: Joi.number().min(0).max(100000).default(0),
  originalPrice: Joi.number().min(0).max(100000).optional(),
  discountPrice: Joi.number().min(0).max(100000).optional(),
  category: Joi.string().valid(...categoryValues).required(),
  subcategory: Joi.string().trim().max(80).allow(""),
  type: Joi.string().valid(...typeValues).default("Book"),
  language: Joi.string().trim().max(40).default("English"),
  authorName: Joi.string().trim().max(120).allow(""),
  bookAuthor: Joi.string().trim().max(120).allow(""),
  promptText: Joi.string().trim().max(20000).allow(""),
  deliveryInstructions: Joi.string().trim().max(2000).allow(""),
  deliveryIncludes: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(120)).max(10),
    Joi.string().allow("")
  ),
  externalUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow(""),
  previewPages: Joi.number().integer().min(1).max(25).default(5),
  isPremium: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(24)).max(8),
    Joi.string().allow("")
  ),
});

const updateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160),
  description: Joi.string().trim().min(30).max(5000),
  price: Joi.number().min(0).max(100000),
  originalPrice: Joi.number().min(0).max(100000),
  discountPrice: Joi.number().min(0).max(100000),
  category: Joi.string().valid(...categoryValues),
  subcategory: Joi.string().trim().max(80).allow(""),
  type: Joi.string().valid(...typeValues),
  language: Joi.string().trim().max(40),
  bookAuthor: Joi.string().trim().max(120).allow(""),
  promptText: Joi.string().trim().max(20000).allow(""),
  deliveryInstructions: Joi.string().trim().max(2000).allow(""),
  deliveryIncludes: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(120)).max(10),
    Joi.string().allow("")
  ),
  externalUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow(""),
  previewPages: Joi.number().integer().min(1).max(25),
  isPremium: Joi.boolean(),
  isFeatured: Joi.boolean(),
  tags: Joi.array().items(Joi.string().trim().max(24)).max(8),
});

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().max(120).allow(""),
  comment: Joi.string().trim().min(20).max(1200).required(),
});

const reviewReportSchema = Joi.object({
  reason: Joi.string().valid("spam", "abuse", "fake", "offensive", "other").required(),
  details: Joi.string().trim().max(600).allow(""),
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

function parseListField(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 10);
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
      return parseListField(parsed);
    }
  } catch {
    // fall through to line parsing
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function validateDeliveryPayload({ type, primaryFile, promptText, externalUrl }) {
  const safeType = String(type || "Book");
  const hasFile = Boolean(primaryFile);
  const hasText = Boolean(String(promptText || "").trim());
  const hasExternalUrl = Boolean(String(externalUrl || "").trim());

  if (isPdfRequiredType(safeType)) {
    if (!primaryFile || !isPdfLikeFile(primaryFile)) {
      return "A valid PDF file is required for books, notes, study packs, and comics";
    }

    return "";
  }

  if (primaryFile && !isSupportedPrimaryFile(primaryFile)) {
    return "Supported product files include PDF, ZIP, TXT, MD, JSON, CSV, DOCX, PPTX, XLSX, PNG, JPG, and WEBP";
  }

  if (isTextFirstType(safeType) && !hasText && !hasFile) {
    return "Prompt products need a prompt text body or an attached file";
  }

  if (!hasFile && !hasText && !hasExternalUrl) {
    return "Add a file, prompt text, or an external delivery link before publishing this product";
  }

  return "";
}

function isPaidProduct(book) {
  return Boolean(book?.isPaid || Number(book?.price || 0) > 0);
}

function buildDeliveryMetadata({ primaryFile, promptText, deliveryInstructions, deliveryIncludes, externalUrl }) {
  const textContent = String(promptText || "").trim();
  const includedItems = parseListField(deliveryIncludes);
  const hasFile = Boolean(primaryFile);
  const hasText = Boolean(textContent);
  const hasExternalUrl = Boolean(String(externalUrl || "").trim());

  return {
    mode: buildDeliveryMode({ hasFile, hasText, hasExternalUrl }),
    fileName: primaryFile?.originalname || "",
    fileMimeType: primaryFile?.mimetype || "",
    fileSize: Number(primaryFile?.size || 0),
    textContent,
    previewText: buildTextPreview(textContent),
    externalUrl: String(externalUrl || "").trim(),
    instructions: String(deliveryInstructions || "").trim(),
    includedItems,
  };
}

function buildCatalogFields(payload = {}) {
  const pricing = normalizePricing(payload);

  return {
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discountPrice: pricing.discountPrice,
    isPaid: pricing.isPaid,
    previewPages: normalizePreviewPages(payload.previewPages),
    isPremium: normalizeBooleanFlag(payload.isPremium, pricing.price >= 499),
    isFeatured: normalizeBooleanFlag(payload.isFeatured, false),
  };
}

function buildBookPayload(book, access) {
  const accessUrls = buildSignedBookAccessUrls(book, access);
  return serializeBook(book, {
    backendBaseUrl,
    includeFilePath: false,
    previewUrl: access.canPreview && book.previewPath ? `/api/books/${book._id}/preview` : "",
    downloadUrl: access.canDownload ? `/api/books/${book._id}/download` : "",
    previewAccessUrl: accessUrls.previewAccessUrl,
    downloadAccessUrl: accessUrls.downloadAccessUrl,
    statusLabel: book.isArchived ? "Archived" : book.status,
    access,
  });
}

function createUploadMiddleware() {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (PRODUCT_FILE_FIELDS.has(file.fieldname)) {
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
      if (PRODUCT_FILE_FIELDS.has(file.fieldname)) {
        return isSupportedPrimaryFile(file)
          ? cb(null, true)
          : cb(new Error("Unsupported product file type"));
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
      { name: "productFile", maxCount: 1 },
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

    if (PRODUCT_FILE_FIELDS.has(file.fieldname)) {
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

  const cookieToken = readCookieValue(req);
  if (cookieToken) {
    return cookieToken;
  }

  return "";
}

function getAssetToken(req) {
  if (typeof req.query?.asset === "string" && req.query.asset.trim()) {
    return req.query.asset.trim();
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
  const hasPublicPreview = Boolean(book.previewPath);
  const paidProduct = isPaidProduct(book);

  if (!paidProduct) {
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
      canPreview: hasPublicPreview,
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
    canPreview: Boolean(purchaseExists) || hasPublicPreview,
    canDownload: Boolean(purchaseExists),
  };
}

function getReviewAccess(book, access, user) {
  const isSignedIn = Boolean(user?._id || user?.id);
  const isOwnerOrAdmin = Boolean(access?.isOwner || access?.isAdmin);
  const paidProduct = isPaidProduct(book);
  const canReviewPaidBook = Boolean(paidProduct && access?.isPurchased);
  const canReviewFreeBook = Boolean(!paidProduct && isSignedIn);
  const canReview = isSignedIn && !isOwnerOrAdmin && (canReviewPaidBook || canReviewFreeBook);

  let gateMessage = "Reviews are not available for this product yet.";
  if (!isSignedIn) {
    gateMessage = "Sign in to leave a review.";
  } else if (isOwnerOrAdmin) {
    gateMessage = "Creators and admins cannot review their own marketplace products.";
  } else if (paidProduct && !access?.isPurchased) {
    gateMessage = "Complete the purchase flow to unlock reviews for this paid product.";
  }

  return {
    canReview,
    verifiedPurchase: Boolean(paidProduct && access?.isPurchased),
    gateMessage,
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
  let generatedPreviewPath = "";
  try {
    await runUpload(req, res);

    const rawTags = parseTags(req.body.tags);
    const rawIncludes = parseListField(req.body.deliveryIncludes);
    const { value, error } = uploadSchema.validate(
      {
        ...req.body,
        price: Number(req.body.price || 0),
        originalPrice: req.body.originalPrice !== undefined ? Number(req.body.originalPrice) : undefined,
        discountPrice: req.body.discountPrice !== undefined ? Number(req.body.discountPrice) : undefined,
        previewPages: req.body.previewPages !== undefined ? Number(req.body.previewPages) : undefined,
        isPremium: req.body.isPremium !== undefined ? normalizeBooleanFlag(req.body.isPremium) : undefined,
        isFeatured: req.body.isFeatured !== undefined ? normalizeBooleanFlag(req.body.isFeatured) : undefined,
        tags: rawTags,
        deliveryIncludes: rawIncludes,
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

    const primaryFile = req.files?.pdf?.[0] || req.files?.bookFile?.[0] || req.files?.productFile?.[0];
    const coverFile = req.files?.cover?.[0] || req.files?.thumbnail?.[0];

    const deliveryValidationError = validateDeliveryPayload({
      type: value.type,
      primaryFile,
      promptText: value.promptText,
      externalUrl: value.externalUrl,
    });
    if (deliveryValidationError) {
      cleanupUploadedFiles(req);
      return res.status(400).json({
        success: false,
        message: deliveryValidationError,
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
      price: buildCatalogFields(value).price,
      tags: value.tags,
      type: value.type,
    });

    const catalogFields = buildCatalogFields(value);
    const filePath = primaryFile ? buildPublicUploadPath("books", primaryFile.filename) : "";
    const canGeneratePdfPreview = Boolean(primaryFile && isPdfLikeFile(primaryFile));
    const preview = canGeneratePdfPreview
      ? await createBookPreview({
        sourcePublicPath: filePath,
        title: value.title,
        isPaid: catalogFields.isPaid,
        previewPages: catalogFields.previewPages,
      })
      : {
        previewPath: "",
        previewPages: canGeneratePdfPreview ? catalogFields.previewPages : 0,
        pageCount: 0,
      };
    generatedPreviewPath = preview.previewPath;
    const coverImage = coverFile
      ? buildPublicUploadPath("covers", coverFile.filename)
      : "";
    const delivery = buildDeliveryMetadata({
      primaryFile,
      promptText: value.promptText,
      deliveryInstructions: value.deliveryInstructions,
      deliveryIncludes: value.deliveryIncludes,
      externalUrl: value.externalUrl,
    });
    const usesQueuedPdfReview = canGeneratePdfPreview;
    const resolvedStatus = aiReview.aiStatus === "rejected"
      ? "Rejected"
      : usesQueuedPdfReview
        ? "AI_Review"
        : aiReview.aiStatus === "approved"
          ? "Approved"
          : "Admin_Review";
    const resolvedAiStatus = aiReview.aiStatus === "rejected"
      ? "rejected"
      : usesQueuedPdfReview
        ? "pending"
        : aiReview.aiStatus;
    const resolvedAiSuggestion = aiReview.aiStatus === "rejected"
      ? aiReview.aiSuggestion
      : usesQueuedPdfReview
        ? "AI scan queued. Full PDF moderation is processing in the background."
        : aiReview.aiStatus === "approved"
          ? "Initial AI review approved this digital product for marketplace delivery."
          : "Initial AI review completed. This digital product is waiting for admin review.";
    const resolvedModerationReason = aiReview.aiStatus === "rejected"
      ? aiReview.aiSuggestion
      : usesQueuedPdfReview
        ? "Initial validation passed. Full PDF AI review has been queued."
        : aiReview.aiStatus === "approved"
          ? "Metadata and delivery checks passed without requiring a PDF scan."
          : "Delivery metadata is valid, but this product needs admin review before launch.";

    const book = await Book.create({
      title: value.title,
      authorName: value.authorName || req.user.name,
      bookAuthor: value.bookAuthor || "",
      author: req.user.id,
      type: value.type,
      category: value.category,
      subcategory: value.subcategory || "",
      language: value.language,
      tags: value.tags,
      description: value.description,
      price: catalogFields.price,
      originalPrice: catalogFields.originalPrice,
      discountPrice: catalogFields.discountPrice,
      filePath,
      delivery,
      previewPath: preview.previewPath,
      previewPages: preview.previewPages,
      pageCount: preview.pageCount,
      coverImage,
      coverAlt: value.title,
      isPaid: catalogFields.isPaid,
      isPremium: catalogFields.isPremium,
      requiresLogin: true,
      status: resolvedStatus,
      aiStatus: resolvedAiStatus,
      aiScore: aiReview.aiScore,
      plagiarismScore: aiReview.plagiarismScore,
      qualityScore: aiReview.qualityScore,
      aiSuggestion: resolvedAiSuggestion,
      moderationReason: resolvedModerationReason,
      aiCategory: value.category,
      aiTags: value.tags,
      aiProcessingState: aiReview.aiStatus === "rejected"
        ? "completed"
        : usesQueuedPdfReview
          ? "queued"
          : "completed",
      isFeatured: catalogFields.isFeatured,
    });

    if (aiReview.aiStatus !== "rejected" && usesQueuedPdfReview) {
      enqueueBookAIProcessing(book._id, { allowStatusChange: true });
    }

    const access = await getBookAccess(book, req.user);

    return res.status(201).json({
      success: true,
      message: aiReview.aiStatus === "rejected"
        ? "Product uploaded, but the initial AI checks flagged it for rejection."
        : usesQueuedPdfReview
          ? "Product uploaded successfully and AI review has started."
          : resolvedStatus === "Approved"
            ? "Digital product uploaded and approved for marketplace delivery."
            : "Digital product uploaded successfully and routed to admin review.",
      book: buildBookPayload(book, access),
      moderation: {
        status: book.status,
        aiStatus: book.aiStatus,
        aiScore: aiReview.aiScore,
        plagiarismScore: aiReview.plagiarismScore,
        qualityScore: aiReview.qualityScore,
        provider: aiReview.provider || "local",
        model: aiReview.model || "local-heuristic",
        aiSuggestion: book.aiSuggestion,
        processingState: book.aiProcessingState,
      },
      aiStatus: book.aiStatus,
      aiScore: aiReview.aiScore,
      plagiarismScore: aiReview.plagiarismScore,
      qualityScore: aiReview.qualityScore,
      aiProvider: aiReview.provider || "local",
      aiModel: aiReview.model || "local-heuristic",
      aiSuggestion: book.aiSuggestion,
      aiProcessingState: book.aiProcessingState,
    });
  } catch (error) {
    cleanupUploadedFiles(req);
    if (generatedPreviewPath && generatedPreviewPath.startsWith("/uploads/previews/")) {
      safeDeletePublicFile(generatedPreviewPath);
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Upload limit exceeded. Product files can be up to 50MB."
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

router.get("/library-import/catalog", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const catalog = getImportableLibraryCatalog();

    const existing = await Book.find({
      author: req.user.id,
      $or: [
        { catalogKey: { $in: catalog.map((entry) => entry.catalogKey) } },
        { title: { $in: catalog.map((entry) => entry.title) } },
      ],
    }).select("catalogKey title status price isArchived");

    const existingMap = new Map(
      existing.map((book) => [String(book.catalogKey || ""), book])
    );
    const existingTitleMap = new Map(
      existing.map((book) => [String(book.title || "").trim().toLowerCase(), book])
    );

    const books = catalog.map((entry) => {
      const imported =
        existingMap.get(entry.catalogKey)
        || existingTitleMap.get(String(entry.title || "").trim().toLowerCase());
      return {
        catalogKey: entry.catalogKey,
        title: entry.title,
        bookAuthor: entry.bookAuthor,
        category: entry.category,
        subcategory: entry.subcategory,
        price: Number(entry.discountPrice || 0),
        originalPrice: Number(entry.originalPrice || entry.discountPrice || 0),
        previewPages: Number(entry.previewPages || 0),
        filePath: buildPublicUploadPath("books", entry.filename),
        coverImage: entry.coverImage || "",
        sourceLabel: entry.sourceLabel || "",
        catalogType: entry.catalogType || "curated",
        imported: Boolean(imported),
        importedBookId: imported?._id || null,
        importedStatus: imported?.status || "",
      };
    });

    return res.json({
      success: true,
      books,
      summary: {
        total: books.length,
        imported: books.filter((book) => book.imported).length,
        pendingImport: books.filter((book) => !book.imported).length,
      },
    });
  } catch (error) {
    console.error("Library catalog load error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load the project PDF catalog",
    });
  }
});

router.post("/library-import", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const result = await importBuiltinLibraryForCreator(req.user);
    return res.status(201).json({
      success: true,
      message: result.created
        ? `${result.created} project PDF books imported successfully.`
        : "Project PDF import completed with no new books created.",
      ...result,
    });
  } catch (error) {
    console.error("Library import error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to import the project PDF catalog",
    });
  }
});

/* =====================================
   Get Marketplace Books
===================================== */
router.get("/", async (req, res) => {
  try {
    const viewer = await getOptionalUserFromRequest(req);
    const result = await searchApprovedBooks({
      backendBaseUrl,
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      search: req.query.search,
      sort: req.query.sort,
      language: req.query.language,
      userId: viewer?._id ? String(viewer._id) : "",
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

router.get("/:id/reviews", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id).select(
      "_id author isPaid isArchived requiresLogin ratingAverage ratingCount"
    );
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const user = await getOptionalUser(req);
    const access = await getBookAccess(book, user);
    const reviewAccess = getReviewAccess(book, access, user);

    if (book.isArchived && !access.canDownload && !access.isOwner && !access.isAdmin) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const [reviews, viewerReview] = await Promise.all([
      BookReview.find({ book: book._id })
        .populate("reviewer", "name username profileImage verified")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(24),
      user
        ? BookReview.findOne({
            book: book._id,
            reviewer: user._id || user.id,
          }).populate("reviewer", "name username profileImage verified")
        : null,
    ]);

    return res.json({
      success: true,
      summary: {
        ratingAverage: Number(book.ratingAverage || 0),
        ratingCount: Number(book.ratingCount || 0),
      },
      reviewAccess,
      viewerReview: viewerReview
        ? serializeBookReview(viewerReview, backendBaseUrl)
        : null,
      reviews: reviews.map((review) => serializeBookReview(review, backendBaseUrl)),
    });
  } catch (error) {
    console.error("Get Book Reviews Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/:id/reviews", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const { value, error } = reviewSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const book = await Book.findById(req.params.id).select("_id author isPaid isArchived requiresLogin");
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const access = await getBookAccess(book, req.user);
    const reviewAccess = getReviewAccess(book, access, req.user);

    if (book.isArchived && !access.canDownload && !access.isOwner && !access.isAdmin) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (!reviewAccess.canReview) {
      return res.status(403).json({
        success: false,
        message: reviewAccess.gateMessage,
      });
    }

    let review = await BookReview.findOne({
      book: book._id,
      reviewer: req.user.id,
    });
    const isUpdate = Boolean(review);

    if (!review) {
      review = new BookReview({
        book: book._id,
        creator: book.author,
        reviewer: req.user.id,
      });
    }

    review.creator = book.author;
    review.rating = Number(value.rating);
    review.title = String(value.title || "").trim();
    review.comment = String(value.comment || "").trim();
    review.verifiedPurchase = reviewAccess.verifiedPurchase;

    await review.save();
    await review.populate("reviewer", "name username profileImage verified");

    const metrics = await syncBookAndCreatorRatings(book);

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? "Review updated successfully" : "Review published successfully",
      review: serializeBookReview(review, backendBaseUrl),
      summary: metrics?.bookStats || {
        ratingAverage: Number(book.ratingAverage || 0),
        ratingCount: Number(book.ratingCount || 0),
      },
    });
  } catch (error) {
    console.error("Save Book Review Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/:id/reviews/:reviewId/report", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.reviewId)) {
      return res.status(400).json({ success: false, message: "Invalid review target" });
    }

    const { value, error } = reviewReportSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const review = await BookReview.findOne({
      _id: req.params.reviewId,
      book: req.params.id,
    }).select("_id book reviewer creator");

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (String(review.reviewer) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot report your own review",
      });
    }

    let report = await ReviewReport.findOne({
      review: review._id,
      reporter: req.user.id,
    });

    if (report?.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "You have already reported this review",
      });
    }

    if (!report) {
      report = new ReviewReport({
        review: review._id,
        book: review.book,
        reporter: req.user.id,
        reviewOwner: review.reviewer,
      });
    }

    report.book = review.book;
    report.reviewOwner = review.reviewer;
    report.reason = value.reason;
    report.details = String(value.details || "").trim();
    report.status = "pending";
    report.actionTaken = "none";
    report.reviewedAt = null;
    report.adminNote = "";

    await report.save();

    return res.status(201).json({
      success: true,
      message: "Review report submitted for moderation",
    });
  } catch (error) {
    console.error("Report Review Error:", error.message);
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

    const assetGrant = verifyBookAssetToken(getAssetToken(req), {
      bookId: req.params.id,
      kind: "preview",
    });
    const user = assetGrant ? null : await getOptionalUser(req);
    const access = assetGrant
      ? {
          canPreview: true,
          canDownload: false,
          isOwner: false,
          isAdmin: false,
          isPurchased: false,
        }
      : await getBookAccess(book, user);

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
router.get("/:id/download", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const assetGrant = verifyBookAssetToken(getAssetToken(req), {
      bookId: req.params.id,
      kind: "download",
    });
    const user = assetGrant ? null : await getOptionalUser(req);
    const access = assetGrant
      ? {
          canPreview: true,
          canDownload: true,
          isOwner: false,
          isAdmin: false,
          isPurchased: true,
        }
      : await getBookAccess(book, user);

    if (!access.canDownload) {
      return res.status(403).json({
        success: false,
        message: "Purchase required to download",
      });
    }

    await Book.findByIdAndUpdate(book._id, { $inc: { downloads: 1 } });
    if (book.delivery?.mode === "link" && book.delivery?.externalUrl) {
      return res.redirect(book.delivery.externalUrl);
    }

    if (book.delivery?.textContent && !book.filePath) {
      const filename = buildDownloadFilename(book);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(book.delivery.textContent);
    }

    const filePath = resolvePublicUploadPath(book.filePath);
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    return res.download(filePath, buildDownloadFilename(book));
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
      deliveryIncludes: parseListField(req.body.deliveryIncludes),
    };

    if (payload.price !== undefined) {
      payload.price = Number(payload.price);
    }
    if (payload.originalPrice !== undefined) {
      payload.originalPrice = Number(payload.originalPrice);
    }
    if (payload.discountPrice !== undefined) {
      payload.discountPrice = Number(payload.discountPrice);
    }
    if (payload.previewPages !== undefined) {
      payload.previewPages = Number(payload.previewPages);
    }
    if (payload.isPremium !== undefined) {
      payload.isPremium = normalizeBooleanFlag(payload.isPremium);
    }
    if (payload.isFeatured !== undefined) {
      payload.isFeatured = normalizeBooleanFlag(payload.isFeatured);
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

    const persistedPrimaryFile = book.filePath
      ? {
        originalname: book.delivery?.fileName || path.basename(book.filePath),
        mimetype: book.delivery?.fileMimeType || "",
        size: Number(book.delivery?.fileSize || 0),
      }
      : null;
    const deliveryValidationError = validateDeliveryPayload({
      type: value.type !== undefined ? value.type : book.type,
      primaryFile: persistedPrimaryFile,
      promptText: value.promptText !== undefined ? value.promptText : book.delivery?.textContent,
      externalUrl: value.externalUrl !== undefined ? value.externalUrl : book.delivery?.externalUrl,
    });
    if (deliveryValidationError) {
      return res.status(400).json({
        success: false,
        message: deliveryValidationError,
      });
    }

    const nextDeliveryInput = {
      promptText: value.promptText !== undefined ? value.promptText : book.delivery?.textContent,
      deliveryInstructions: value.deliveryInstructions !== undefined ? value.deliveryInstructions : book.delivery?.instructions,
      deliveryIncludes: value.deliveryIncludes !== undefined ? value.deliveryIncludes : book.delivery?.includedItems,
      externalUrl: value.externalUrl !== undefined ? value.externalUrl : book.delivery?.externalUrl,
    };
    const nextBookFields = { ...value };
    delete nextBookFields.promptText;
    delete nextBookFields.deliveryInstructions;
    delete nextBookFields.deliveryIncludes;
    delete nextBookFields.externalUrl;

    Object.assign(book, nextBookFields);

    const catalogFields = buildCatalogFields({
      price: value.price !== undefined ? value.price : book.price,
      originalPrice: value.originalPrice !== undefined ? value.originalPrice : book.originalPrice,
      discountPrice: value.discountPrice !== undefined ? value.discountPrice : book.discountPrice,
      previewPages: value.previewPages !== undefined ? value.previewPages : book.previewPages,
      isPremium: value.isPremium !== undefined ? value.isPremium : book.isPremium,
      isFeatured: value.isFeatured !== undefined ? value.isFeatured : book.isFeatured,
    });

    book.price = catalogFields.price;
    book.originalPrice = catalogFields.originalPrice;
    book.discountPrice = catalogFields.discountPrice;
    book.isPaid = catalogFields.isPaid;
    book.isPremium = catalogFields.isPremium;
    book.isFeatured = catalogFields.isFeatured;

    book.delivery = {
      ...(book.delivery?.toObject ? book.delivery.toObject() : book.delivery || {}),
      ...buildDeliveryMetadata({
        primaryFile: book.filePath
          ? {
            originalname: book.delivery?.fileName || path.basename(book.filePath),
            mimetype: book.delivery?.fileMimeType || "",
            size: Number(book.delivery?.fileSize || 0),
          }
          : null,
        ...nextDeliveryInput,
      }),
    };

    const usesQueuedPdfReview = Boolean(book.filePath && isPdfLikeFile({
      originalname: book.delivery?.fileName || book.filePath,
      mimetype: book.delivery?.fileMimeType || "",
    }));

    if (usesQueuedPdfReview) {
      const previousPreviewPath = book.previewPath;
      const regeneratedPreview = await createBookPreview({
        sourcePublicPath: book.filePath,
        title: book.title,
        isPaid: book.isPaid,
        previewPages: catalogFields.previewPages,
      });

      book.previewPath = regeneratedPreview.previewPath;
      book.previewPages = regeneratedPreview.previewPages;
      book.pageCount = regeneratedPreview.pageCount;

      if (
        previousPreviewPath
        && previousPreviewPath !== book.filePath
        && previousPreviewPath !== book.previewPath
        && previousPreviewPath.startsWith("/uploads/previews/")
      ) {
        safeDeletePublicFile(previousPreviewPath);
      }
    } else {
      if (
        book.previewPath
        && book.previewPath !== book.filePath
        && book.previewPath.startsWith("/uploads/previews/")
      ) {
        safeDeletePublicFile(book.previewPath);
      }
      book.previewPath = "";
      book.previewPages = 0;
      book.pageCount = 0;
    }

    book.aiProcessingState = usesQueuedPdfReview ? "queued" : "completed";
    book.aiStatus = usesQueuedPdfReview ? "pending" : "approved";
    book.status = usesQueuedPdfReview ? "AI_Review" : "Approved";
    book.aiSuggestion = usesQueuedPdfReview
      ? "Metadata updated. AI analysis is refreshing."
      : "Metadata updated. This digital product remains ready for marketplace delivery.";
    book.moderationReason = usesQueuedPdfReview
      ? "Metadata changed after upload. AI analysis queued again."
      : "Metadata updated without requiring a PDF preview refresh.";

    await book.save();
    if (usesQueuedPdfReview) {
      enqueueBookAIProcessing(book._id, { allowStatusChange: false });
    }
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
