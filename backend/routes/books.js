// routes/books.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

/* ============================
   📂 Ensure upload folder
============================ */
const uploadPath = path.join(__dirname, "../uploads/books");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* ============================
   🔐 MULTER (SECURE)
============================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF allowed"), false);
    }
    cb(null, true);
  }
});

/* ============================
   📤 UPLOAD BOOK
============================ */
router.post("/upload", protect, upload.single("pdf"), async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({ msg: "Title & PDF required" });
    }

    const relativePath = `/uploads/books/${req.file.filename}`;

    const book = await Book.create({
      title,
      description,
      price: Number(price) || 0,
      author: req.user.id,
      filePath: relativePath,
      previewPath: relativePath,
      isPaid: Number(price) > 0,
      status: "Approved",
      views: 0,
      sales: 0,
      rating: 0
    });

    res.json({ success: true, book });

  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ msg: "Upload failed" });
  }
});

/* ============================
   🌍 GET BOOKS (PAGINATION)
============================ */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      Book.find({ status: "Approved" })
        .skip(skip)
        .limit(limit)
        .populate("author", "name"),
      Book.countDocuments({ status: "Approved" })
    ]);

    const formatted = books.map(b => ({
      _id: b._id,
      title: b.title,
      price: b.price,
      authorName: b.author?.name || "Unknown",
      cover: b.coverImage
        ? `${process.env.BASE_URL || ""}${b.coverImage}`
        : null
    }));

    res.json({
      success: true,
      page,
      total,
      pages: Math.ceil(total / limit),
      books: formatted
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ============================
   📘 GET SINGLE BOOK
============================ */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: "Invalid ID" });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ msg: "Book not found" });
    }

    res.json({
      success: true,
      book: {
        _id: book._id,
        title: book.title,
        description: book.description,
        price: book.price,
        previewPath: `${process.env.BASE_URL || ""}${book.previewPath}`
      }
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ============================
   📥 SECURE DOWNLOAD (FIXED)
============================ */
router.get("/:id/download", protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ msg: "Book not found" });
    }

    // 🔥 Check payment if paid book
    if (book.isPaid) {
      const payment = await Payment.findOne({
        user: req.user.id,
        book: book._id,
        status: "approved"
      });

      if (!payment) {
        return res.status(403).json({
          msg: "Purchase required"
        });
      }
    }

    const filePath = path.join(__dirname, "..", book.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: "File missing" });
    }

    // 🔥 Increase sales for paid books
    if (book.isPaid) {
      await Book.findByIdAndUpdate(book._id, {
        $inc: { sales: 1 }
      });
    }

    res.download(filePath, `${book.title}.pdf`);

  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;