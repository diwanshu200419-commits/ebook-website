const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const User = require("../models/user");
const Payment = require("../models/Payment");

/* =====================================
   🧑‍💼 ADMIN: GET ALL BOOKS (PENDING/APPROVED/REJECTED)
===================================== */
router.get("/books", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const books = await Book.find(filter).populate("author", "name email");
    res.json({ success: true, books });
  } catch (err) {
    console.error("Get Books Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: AI FLAGGED BOOKS
===================================== */
router.get("/books/flagged", protect, authorize("admin"), async (req, res) => {
  try {
    const books = await Book.find({
      $or: [
        { aiStatus: "pending" },
        { status: "Admin_Review" },
        { aiProcessingState: "failed" },
        { plagiarismScore: { $gte: 60 } }
      ]
    })
      .sort({ plagiarismScore: -1, aiScore: 1, createdAt: -1 })
      .populate("author", "name email");

    res.json({ success: true, books });
  } catch (err) {
    console.error("Get Flagged Books Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: APPROVE BOOK
===================================== */
router.put("/books/:bookId/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    book.status = "Approved";
    book.aiStatus = "approved";
    book.aiProcessingState = "completed";
    book.adminNotes = String(req.body?.adminNotes || "").trim();
    book.moderationReason = book.adminNotes || book.moderationReason || "Approved by admin review.";
    book.aiSuggestion = "Approved by admin review.";
    if (!book.publishedAt) {
      book.publishedAt = new Date();
    }
    book.aiReviewedAt = new Date();
    await book.save();

    res.json({ success: true, message: "Book approved", book });
  } catch (err) {
    console.error("Approve Book Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: REJECT BOOK
===================================== */
router.put("/books/:bookId/reject", protect, authorize("admin"), async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    book.status = "Rejected";
    book.aiStatus = "rejected";
    book.aiProcessingState = "completed";
    book.adminNotes = String(req.body?.adminNotes || "").trim();
    book.moderationReason = book.adminNotes || book.moderationReason || "Rejected by admin review.";
    book.aiSuggestion = book.adminNotes || "Rejected by admin review.";
    book.aiReviewedAt = new Date();
    await book.save();

    res.json({ success: true, message: "Book rejected", book });
  } catch (err) {
    console.error("Reject Book Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/books/:bookId/request-changes", protect, authorize("admin"), async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const notes = String(req.body?.adminNotes || req.body?.note || "").trim();
    if (!notes) {
      return res.status(400).json({ success: false, message: "Admin notes are required" });
    }

    book.status = "Admin_Review";
    book.aiStatus = "pending";
    book.aiProcessingState = "completed";
    book.adminNotes = notes;
    book.moderationReason = "Changes requested by admin review.";
    book.aiSuggestion = notes;
    book.aiReviewedAt = new Date();
    await book.save();

    return res.json({
      success: true,
      message: "Changes requested successfully",
      book,
    });
  } catch (err) {
    console.error("Request Changes Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: GET ALL USERS
===================================== */
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get Users Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: GET ANALYTICS
===================================== */
router.get("/analytics", protect, authorize("admin"), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBooks = await Book.countDocuments();
    const approvedBooks = await Book.countDocuments({ status: "Approved" });
    const pendingAiReviews = await Book.countDocuments({
      $or: [{ aiStatus: "pending" }, { status: "Admin_Review" }, { aiProcessingState: "queued" }]
    });
    const rejectedBooks = await Book.countDocuments({ status: "Rejected" });
    const totalRevenue = await Book.aggregate([
      { $group: { _id: null, total: { $sum: "$platformRevenue" } } }
    ]);
    const totalSales = await Payment.countDocuments({ status: "approved" });

    res.json({
      success: true,
      analytics: {
        totalUsers,
        totalBooks,
        approvedBooks,
        pendingAiReviews,
        rejectedBooks,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalSales
      }
    });
  } catch (err) {
    console.error("Get Analytics Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
