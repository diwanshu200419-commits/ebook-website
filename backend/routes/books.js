const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const User = require("../models/user");
const { buildAIReview } = require("../services/aiReview");
const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

// Ensure upload folders exist
const booksUploadPath = path.join(__dirname, "../uploads/books");
const coversUploadPath = path.join(__dirname, "../uploads/covers");
if (!fs.existsSync(booksUploadPath)) {
  fs.mkdirSync(booksUploadPath, { recursive: true });
}
if (!fs.existsSync(coversUploadPath)) {
  fs.mkdirSync(coversUploadPath, { recursive: true });
}

// Multer storage for PDFs and covers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, booksUploadPath);
    } else if (file.mimetype.startsWith("image/")) {
      cb(null, coversUploadPath);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files allowed"), false);
    }
  }
});

/* =====================================
   📤 UPLOAD BOOK (PDF + Cover)
===================================== */
router.post("/upload", protect, upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "bookFile", maxCount: 1 },
  { name: "cover", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, price, category, authorName } = req.body;
    const pdfFile = req.files?.pdf?.[0] || req.files?.bookFile?.[0];
    const coverFile = req.files?.cover?.[0] || req.files?.thumbnail?.[0];

    if (!title || !pdfFile) {
      return res.status(400).json({ success: false, message: "Title and PDF are required" });
    }

    const pdfPath = `/uploads/books/${pdfFile.filename}`;
    const coverPath = coverFile ? `/uploads/covers/${coverFile.filename}` : "";

    const aiReview = await buildAIReview({
      title,
      description,
      category: category || "Book",
      price: Number(price) || 0
    });

    const moderationStatus =
      aiReview.aiStatus === "approved"
        ? "Approved"
        : aiReview.aiStatus === "rejected"
          ? "Rejected"
          : "Admin_Review";

    const book = await Book.create({
      title,
      authorName: authorName || req.user.name,
      author: req.user.id,
      category: category || "Book",
      description,
      price: Number(price) || 0,
      filePath: pdfPath,
      previewPath: pdfPath,
      coverImage: coverPath,
      isPaid: Number(price) > 0,
      status: moderationStatus,
      aiStatus: aiReview.aiStatus,
      aiScore: aiReview.aiScore,
      plagiarismScore: aiReview.plagiarismScore,
      qualityScore: aiReview.qualityScore,
      aiSuggestion: aiReview.aiSuggestion
    });

    res.status(201).json({
      success: true,
      message: "Book uploaded successfully",
      aiStatus: aiReview.aiStatus,
      aiScore: aiReview.aiScore,
      plagiarismScore: aiReview.plagiarismScore,
      qualityScore: aiReview.qualityScore,
      aiSuggestion: aiReview.aiSuggestion,
      book
    });

  } catch (err) {
    console.error("Upload Error:", err.message);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

/* =====================================
   🌍 GET ALL APPROVED BOOKS
===================================== */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    let filter = { status: "Approved" };
    if (category) filter.category = category;
    if (search) filter.title = { $regex: search, $options: "i" };

    const [books, total] = await Promise.all([
      Book.find(filter)
        .skip(skip)
        .limit(limit)
        .populate("author", "name username")
        .sort({ createdAt: -1 }),
      Book.countDocuments(filter)
    ]);

    const booksWithUrls = books.map((book) => {
      const plain = book.toObject();
      const coverPath = plain.coverImage || "";
      return {
        ...plain,
        coverImage: coverPath,
        cover: coverPath, // backward-compatible key used by existing frontend
        coverUrl: coverPath && backendBaseUrl ? `${backendBaseUrl}${coverPath}` : coverPath
      };
    });

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      books: booksWithUrls
    });

  } catch (err) {
    console.error("Get Books Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   👤 GET MY BOOKS (Creator)
===================================== */
router.get("/my/books", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, books });
  } catch (err) {
    console.error("Get My Books Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Backward-compatible alias used by existing frontend
router.get("/my-books", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, books });
  } catch (err) {
    console.error("Get My Books Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   📘 GET SINGLE BOOK
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

    res.json({ success: true, book });

  } catch (err) {
    console.error("Get Book Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   📥 DOWNLOAD BOOK
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

    // Check if user has purchased if it's a paid book
    if (book.isPaid) {
      const payment = await Payment.findOne({
        user: req.user.id,
        book: book._id,
        status: "approved"
      });
      if (!payment) {
        return res.status(403).json({ success: false, message: "Purchase required to download" });
      }
    }

    const normalizedFilePath = String(book.filePath || "").replace(/^[/\\]+/, "");
    const filePath = path.join(__dirname, "..", normalizedFilePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Increment download count
    await Book.findByIdAndUpdate(book._id, { $inc: { downloads: 1 } });

    res.download(filePath, `${book.title}.pdf`);

  } catch (err) {
    console.error("Download Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🗑️ DELETE BOOK (author/admin)
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

    await Book.findByIdAndDelete(book._id);
    return res.json({ success: true, message: "Book deleted successfully" });
  } catch (err) {
    console.error("Delete Book Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
