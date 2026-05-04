// routes/books.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Book = require("../models/Book"); // ✅ correct
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// ============================
// 📂 Ensure upload folder exists
// ============================
const uploadPath = path.join(__dirname, "../uploads/books");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ============================
// 📦 Multer storage
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ============================
// 📤 UPLOAD BOOK
// ============================
router.post("/upload", protect, upload.single("pdf"), async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({ msg: "Title and PDF required" });
    }

    const relativePath = `/uploads/books/${req.file.filename}`;

    const book = await Book.create({
      title,
      authorName: "Unknown",
      category: "General",
      description,
      price: Number(price) || 0,
      author: req.user.id,

      filePath: relativePath,
      previewPath: relativePath,

      isPaid: Number(price) > 0,
      status: "Approved" // ✅ directly visible
    });

    res.json({ success: true, book });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Upload error" });
  }
});

// ============================
// 🌍 GET ALL APPROVED BOOKS
// ============================
router.get("/", async (req, res) => {
  try {
    const books = await Book.find({ status: "Approved" });

    res.json({ success: true, books });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ============================
// 📘 GET SINGLE BOOK
// ============================
router.get("/:id", async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: "Invalid ID" });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ msg: "Book not found" });
    }

    res.json({
      success: true,
      book: {
        _id: book._id,
        title: book.title,
        authorName: book.authorName,
        category: book.category,
        description: book.description,
        price: book.price,
        previewPath: book.previewPath,
        filePath: book.filePath
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ============================
// 📥 DOWNLOAD
// ============================
router.get("/:id/download", protect, async (req, res) => {
  try {

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ msg: "Book not found" });
    }

    const filePath = path.join(__dirname, "..", book.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: "File missing" });
    }

    res.download(filePath, `${book.title}.pdf`);

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;