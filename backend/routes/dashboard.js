// =====================================
// 📊 USER DASHBOARD ROUTES
// =====================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Book = require("../models/book");

/* =====================================
   GET USER DASHBOARD DATA
   GET /api/dashboard/user
===================================== */

router.get("/user", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // =====================================
    // 1️⃣ GET USER BOOKS
    // =====================================

    const books = await Book.find({ author: userId });

    const totalBooks = books.length;

    const totalDownloads = books.reduce(
      (sum, book) => sum + (book.downloads || 0),
      0
    );

    const totalEarnings = books.reduce(
      (sum, book) => sum + (book.earnings || 0),
      0
    );

    // =====================================
    // 2️⃣ MONTHLY EARNINGS CALCULATION
    // =====================================

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyEarnings = books.reduce((sum, book) => {
      if (!book.createdAt) return sum;

      const bookDate = new Date(book.createdAt);

      if (
        bookDate.getMonth() === currentMonth &&
        bookDate.getFullYear() === currentYear
      ) {
        return sum + (book.earnings || 0);
      }

      return sum;
    }, 0);

    // =====================================
    // 3️⃣ WALLET BALANCE (Future payout logic)
    // =====================================

    const walletBalance = totalEarnings; // Later: subtract withdrawn amount

    // =====================================
    // 4️⃣ REAL CHART DATA (Last 6 Months)
    // =====================================

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const chartData = {
      labels: [],
      values: []
    };

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      const month = date.getMonth();
      const year = date.getFullYear();

      const monthlyValue = books.reduce((sum, book) => {
        if (!book.createdAt) return sum;

        const bookDate = new Date(book.createdAt);

        if (
          bookDate.getMonth() === month &&
          bookDate.getFullYear() === year
        ) {
          return sum + (book.earnings || 0);
        }

        return sum;
      }, 0);

      chartData.labels.push(monthNames[month]);
      chartData.values.push(monthlyValue);
    }

    // =====================================
    // 5️⃣ TOP PERFORMING BOOKS
    // =====================================

    const topBooks = books
      .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
      .slice(0, 5)
      .map((book) => ({
        id: book._id,
        title: book.title,
        downloads: book.downloads || 0,
        earnings: book.earnings || 0,
      }));

    // =====================================
    // 6️⃣ FINAL RESPONSE
    // =====================================

    res.status(200).json({
      success: true,
      totalEarnings,
      monthlyEarnings,
      totalDownloads,
      totalBooks,
      walletBalance,
      chart: chartData,
      topBooks,
    });

  } catch (error) {
    console.error("🔥 Dashboard Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;