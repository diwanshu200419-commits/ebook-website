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
  limits: { fileSize: 20 * 1024 * 1024 },
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
router.post("/upload", protect, upload.fields([{ name: "pdf", maxCount: 1 }, { name: "cover", maxCount: 1 }]), async (req, res) => {
  try {
    const { title, description, price, category, authorName } = req.body;

    if (!title || !req.files?.pdf) {
      return res.status(400).json({ success: false, message: "Title and PDF are required" });
    }

    const pdfPath = `/uploads/books/${req.files.pdf[0].filename}`;
    const coverPath = req.files?.cover ? `/uploads/covers/${req.files.cover[0].filename}` : "";

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
      status: "AI_Review"
    });

    res.status(201).json({ success: true, book });

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

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      books
    });

  } catch (err) {
    console.error("Get Books Error:", err.message);
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

    const filePath = path.join(__dirname, "..", book.filePath);
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

module.exports = router;
