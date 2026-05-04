const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Book = require("../models/book");
const { protect } = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const { generateAIScore, decideStatus } = require("../services/aiReview");
const {
  serializeBook,
  escapeRegex,
} = require("../services/bookData");

const router = express.Router();

const uploadsRoot = path.resolve(__dirname, "../uploads");
const booksPath = path.join(uploadsRoot, "books");
const coversPath = path.join(uploadsRoot, "covers");

[booksPath, coversPath].forEach((directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const destination =
      file.fieldname === "thumbnail" ? coversPath : booksPath;

    callback(null, destination);
  },
  filename: (req, file, callback) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    callback(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (file.fieldname === "thumbnail") {
      if (!file.mimetype.startsWith("image/")) {
        return callback(new Error("Thumbnail must be an image"));
      }

      return callback(null, true);
    }

    const isPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
      return callback(new Error("Only PDF files are allowed"));
    }

    return callback(null, true);
  },
});

function parseTags(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch (error) {
    return String(value)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function deleteStoredFile(relativePath) {
  if (!relativePath) {
    return;
  }

  const sanitized = relativePath.replace(/^\//, "");
  const absolutePath = path.resolve(__dirname, "..", sanitized);

  if (!absolutePath.startsWith(uploadsRoot)) {
    return;
  }

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function isOwnerOrAdmin(book, user) {
  return (
    String(book.author) === String(user._id || user.id) ||
    user.role === "admin"
  );
}

router.get("/featured", async (req, res) => {
  try {
    const books = await Book.find({ status: "Approved" })
      .sort({ isFeatured: -1, downloads: -1, salesCount: -1, createdAt: -1 })
      .limit(6)
      .populate("author", "name username");

    return res.json({
      success: true,
      books: books.map(serializeBook),
    });
  } catch (error) {
    console.error("Featured books error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load featured books",
    });
  }
});

router.get("/my-books", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("author", "name username");

    return res.json({
      success: true,
      books: books.map(serializeBook),
    });
  } catch (error) {
    console.error("My books error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load books",
    });
  }
});

router.get("/admin/review", protect, adminAuth, async (req, res) => {
  try {
    const books = await Book.find({
      status: {
        $in: ["AI_Review", "Admin_Review", "Changes_Requested"],
      },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("author", "name username email");

    return res.json({
      success: true,
      books: books.map(serializeBook),
    });
  } catch (error) {
    console.error("Admin review list error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load review queue",
    });
  }
});

router.get("/admin/library", protect, adminAuth, async (req, res) => {
  try {
    const status = req.query.status
      ? { status: new RegExp(`^${escapeRegex(req.query.status)}$`, "i") }
      : { status: { $in: ["Approved", "Rejected", "Draft"] } };

    const books = await Book.find(status)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("author", "name username email");

    return res.json({
      success: true,
      books: books.map(serializeBook),
    });
  } catch (error) {
    console.error("Admin library error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load library",
    });
  }
});

router.get("/admin/:id", protect, adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book id",
      });
    }

    const book = await Book.findById(req.params.id).populate(
      "author",
      "name username email profileImage"
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.json({
      success: true,
      book: serializeBook(book),
    });
  } catch (error) {
    console.error("Admin book detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load book details",
    });
  }
});

router.post(
  "/upload",
  protect,
  upload.fields([
    { name: "bookFile", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!["creator", "author", "admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only creators and authors can upload content",
        });
      }

      const pdfFile =
        req.files?.bookFile?.[0] ||
        req.files?.pdf?.[0] ||
        null;
      const thumbnail = req.files?.thumbnail?.[0] || null;

      const {
        title,
        description,
        price,
        category,
        type,
        language,
        status: requestedStatus,
      } = req.body;

      if (!title || !pdfFile) {
        return res.status(400).json({
          success: false,
          message: "Title and PDF file are required",
        });
      }

      const parsedPrice = Math.max(0, Number(price || 0));
      const tags = parseTags(req.body.tags).slice(0, 5);
      const aiScore = generateAIScore({
        description,
        price: parsedPrice,
        category: type || category || "Book",
      });

      const status =
        requestedStatus === "Draft" ? "Draft" : decideStatus(aiScore);

      const book = await Book.create({
        title: title.trim(),
        authorName: req.user.name || req.user.username || "Creator",
        author: req.user.id,
        type: type || "Book",
        category: category || "General",
        language: language || "English",
        tags,
        description: description || "",
        price: parsedPrice,
        filePath: `/uploads/books/${pdfFile.filename}`,
        previewPath: `/uploads/books/${pdfFile.filename}`,
        coverImage: thumbnail ? `/uploads/covers/${thumbnail.filename}` : "",
        isPaid: parsedPrice > 0,
        status,
        aiScore,
        isFeatured: parsedPrice === 0,
      });

      return res.status(201).json({
        success: true,
        message:
          status === "Draft"
            ? "Draft saved successfully"
            : "Book submitted for review",
        aiScore,
        book: serializeBook(book),
      });
    } catch (error) {
      console.error("Upload book error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Upload failed",
      });
    }
  }
);

router.put("/admin/status/:id", protect, adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const allowedStatuses = [
      "Admin_Review",
      "Changes_Requested",
      "Approved",
      "Rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status update",
      });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    book.status = status;
    book.adminNotes = adminNotes || "";

    if (status === "Approved") {
      book.publishedAt = new Date();
      if (!book.coverImage) {
        book.isFeatured = true;
      }
    }

    await book.save();

    return res.json({
      success: true,
      message: "Book status updated",
      book: serializeBook(book),
    });
  } catch (error) {
    console.error("Admin status update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update book status",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(24, Math.max(1, Number(req.query.limit || 24)));

    const books = await Book.find({ status: "Approved" })
      .sort({ isFeatured: -1, downloads: -1, salesCount: -1, createdAt: -1 })
      .limit(limit)
      .populate("author", "name username");

    return res.json({
      success: true,
      books: books.map(serializeBook),
    });
  } catch (error) {
    console.error("Public books error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load books",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book id",
      });
    }

    const book = await Book.findById(req.params.id).populate(
      "author",
      "name username"
    );

    if (!book || book.status !== "Approved") {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.json({
      success: true,
      book: serializeBook(book),
    });
  } catch (error) {
    console.error("Book detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load book",
    });
  }
});

router.get("/:id/download", protect, async (req, res) => {
  try {

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // 🔐 OWNER OR ADMIN CHECK
    if (!isOwnerOrAdmin(book, req.user) && book.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 💰 PAYMENT CHECK (IMPORTANT)
    const Payment = require("../models/Payment");

    if (book.isPaid) {
      const hasAccess = await Payment.findOne({
        userId: req.user.id,
        bookId: book._id,
        status: "approved",
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Please complete payment first",
        });
      }
    }

    // 📁 FILE PATH
    const sanitized = book.filePath.replace(/^\//, "");
    const absolutePath = path.resolve(__dirname, "..", sanitized);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // 📥 ONLY DOWNLOAD COUNT
    book.downloads += 1;
    await book.save();

    return res.download(absolutePath, `${book.title}.pdf`);

  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download book",
    });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (!isOwnerOrAdmin(book, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this book",
      });
    }

    deleteStoredFile(book.filePath);
    deleteStoredFile(book.previewPath);
    deleteStoredFile(book.coverImage);
    await book.deleteOne();

    return res.json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete book",
    });
  }
});

module.exports = router;
