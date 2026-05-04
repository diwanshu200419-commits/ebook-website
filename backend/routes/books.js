// routes/books.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Book = require("Models/book");
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
        cb(null, `${req.user.id}-${Date.now()}-${file.originalname.replace(/\s/g, "_")}`)
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
            return res.status(400).json({ msg: "Title and PDF are required" });
        }

        // ✅ Convert path for browser use
        const relativePath = `/uploads/books/${req.file.filename}`;

        const book = await Book.create({
            title,
            authorName: "Unknown",
            category: "General",
            description,
            price: Number(price),
            author: req.user.id,

            filePath: relativePath,
            previewPath: relativePath,

            isPaid: Number(price) > 0,
            status: "AI_Review"
        });

        res.json({ msg: "Book uploaded", book });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Upload error" });
    }
});

// ============================
// 👑 ADMIN REVIEW LIST
// ============================
router.get("/admin/review", protect, adminAuth, async (req, res) => {
    const list = await Book.find({
        status: { $in: ["Pending", "AI_Review", "Admin_Review"] }
    });
    res.json(list);
});

// ============================
// 👑 ADMIN APPROVE/REJECT
// ============================
router.put("/admin/status/:id", protect, adminAuth, async (req, res) => {
    const { status, adminNotes } = req.body;

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ msg: "Book not found" });

    book.status = status;
    book.adminNotes = adminNotes;
    await book.save();

    res.json({ msg: "Status updated", book });
});

// ============================
// 🌍 PUBLIC APPROVED BOOKS
// ============================
router.get("/", async (req, res) => {
    const books = await Book.find({ status: "Approved" });
    res.json(books);
});

// ============================
// 📘 GET SINGLE BOOK (PREVIEW)
// ============================
router.get("/:id", async (req, res) => {
    try {
        // ✅ Validate ID first
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: "Invalid book ID" });
        }

        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ msg: "Book not found" });
        }

        res.json({
            book: {
                id: book._id,
                title: book.title,
                cover: book.coverImage,
                previewPdf: book.previewPath,
                price: book.price,
                isPaid: book.isPaid
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error" });
    }
});

// ============================
// 🔐 FULL PDF (PAID PROTECTED)
// ============================
router.get("/:id/full", protect, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ msg: "Book not found" });
        }

        if (book.isPaid && !req.user) {
            return res.status(403).json({ msg: "Login required" });
        }

        res.json({
            pdfUrl: book.filePath
        });

    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// ============================
// 📥 DOWNLOAD FILE
// ============================
router.get("/:id/download", protect, async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ msg: "Book not found" });

    const absolutePath = path.join(__dirname, "..", book.filePath);

    if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ msg: "File not found" });
    }

    res.download(absolutePath, `${book.title}.pdf`);
});

module.exports = router;