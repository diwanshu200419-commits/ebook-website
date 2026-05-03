const express = require("express");
const Book = require("../models/book");
const User = require("../models/user");
const WithdrawRequest = require("../models/WithdrawRequest");
const { protect } = require("../middleware/auth");
const {
  serializeBook,
  buildLastMonthsSeries,
  buildCountrySales,
} = require("../services/bookData");

const router = express.Router();

router.get("/user", protect, async (req, res) => {
  try {
    const [books, user, withdrawals] = await Promise.all([
      Book.find({ author: req.user.id }).sort({ createdAt: -1 }),
      User.findById(req.user.id).select("payout"),
      WithdrawRequest.find({ user: req.user.id }).sort({ requestedAt: -1 }),
    ]);

    const normalizedBooks = books.map(serializeBook);

    const lifetime = normalizedBooks.reduce(
      (sum, book) => sum + Number(book.earnings || 0),
      0
    );
    const withdrawn = withdrawals
      .filter((request) => ["approved", "paid"].includes(request.status))
      .reduce((sum, request) => sum + Number(request.amount || 0), 0);
    const pending = withdrawals
      .filter((request) => request.status === "pending")
      .reduce((sum, request) => sum + Number(request.amount || 0), 0);
    const available = Math.max(0, lifetime - withdrawn - pending);

    const category = normalizedBooks.reduce(
      (accumulator, book) => {
        const key = (book.type || "book").toLowerCase();
        if (!accumulator[key]) {
          accumulator[key] = 0;
        }

        accumulator[key] += Number(book.earnings || 0);
        return accumulator;
      },
      { book: 0, notes: 0, comics: 0, ai: 0 }
    );

    const chart = buildLastMonthsSeries(
      normalizedBooks,
      (book) => book.earnings || 0
    );

    const transactions = normalizedBooks.map((book) => ({
      title: book.title,
      type: book.type || "Book",
      amount: Number(book.earnings || 0),
      status: book.earnings > 0 ? "available" : "pending",
      date: book.updatedAt || book.createdAt || new Date(),
    }));

    const topBooks = [...normalizedBooks]
      .sort((left, right) => Number(right.earnings || 0) - Number(left.earnings || 0))
      .slice(0, 5)
      .map((book) => ({
        title: book.title,
        sales: book.salesCount,
        earnings: book.earnings,
      }));

    return res.json({
      success: true,
      pending,
      available,
      withdrawn,
      lifetime,
      totalBooks: normalizedBooks.length,
      totalSales: normalizedBooks.reduce(
        (sum, book) => sum + Number(book.salesCount || 0),
        0
      ),
      transactions,
      chart,
      category,
      topBooks,
      payout: user?.payout || null,
      countrySales: buildCountrySales(normalizedBooks),
    });
  } catch (error) {
    console.error("Earnings route error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/withdraw", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id });
    const user = await User.findById(req.user.id).select("payout");

    const totalAvailable = books.reduce(
      (sum, book) => sum + Number(book.earnings || 0),
      0
    );

    if (totalAvailable < 500) {
      return res.status(400).json({
        success: false,
        message: "Minimum Rs.500 required to withdraw",
      });
    }

    const payoutConfigured = Boolean(
      user?.payout?.upiId || user?.payout?.bankAccount
    );

    if (!payoutConfigured) {
      return res.status(400).json({
        success: false,
        message: "Please add payout details before requesting a withdrawal",
      });
    }

    await WithdrawRequest.create({
      user: req.user.id,
      amount: totalAvailable,
      method: user.payout.upiId ? "upi" : "bank",
      accountDetails: user.payout,
    });

    return res.json({
      success: true,
      message: "Withdrawal request submitted successfully",
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
