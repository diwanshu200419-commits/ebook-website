const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Book = require("../models/book");

/* =====================================
   GET USER EARNINGS
   GET /api/earnings/user
===================================== */

router.get("/user", protect, async (req, res) => {
  try {

    const userId = req.user.id;

    // Get all books by this creator
    const books = await Book.find({ author: userId });

    let pending = 0;
    let available = 0;
    let withdrawn = 0;
    let lifetime = 0;

    let category = {
      books: 0,
      notes: 0,
      study: 0,
      ai: 0
    };

    let transactions = [];

    books.forEach(book => {

      const earnings = book.earnings || 0;
      const downloads = book.downloads || 0;

      lifetime += earnings;

      // Simple payout logic
      available += earnings;

      // Category breakdown
      if (book.category === "Book") category.books += earnings;
      if (book.category === "Notes") category.notes += earnings;
      if (book.category === "Study") category.study += earnings;
      if (book.category === "AI") category.ai += earnings;

      // Add transaction entry
      transactions.push({
        title: book.title,
        type: book.category || "Book",
        amount: earnings,
        status: "available",
        date: book.createdAt || new Date()
      });

    });

    // Monthly chart (dummy for now — later DB based)
    const chart = {
      labels: ["Jan","Feb","Mar","Apr","May","Jun"],
      values: [1200, 2100, 1800, 2600, 3200, 2800]
    };

    res.json({
      pending,
      available,
      withdrawn,
      lifetime,
      transactions,
      chart,
      category
    });

  } catch (err) {
    console.error("Earnings Route Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* =====================================
   REQUEST WITHDRAWAL
   POST /api/earnings/withdraw
===================================== */

router.post("/withdraw", protect, async (req, res) => {
  try {

    const userId = req.user.id;

    const books = await Book.find({ author: userId });

    const totalAvailable = books.reduce(
      (sum, book) => sum + (book.earnings || 0),
      0
    );

    if (totalAvailable < 500) {
      return res.status(400).json({
        message: "Minimum ₹500 required to withdraw"
      });
    }

    // Future: create WithdrawRequest model
    // For now we just simulate success

    res.json({
      message: "Withdrawal request submitted successfully"
    });

  } catch (err) {
    console.error("Withdraw Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;