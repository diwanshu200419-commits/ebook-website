const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Book = require("../models/Book");
const User = require("../models/user");

/* ======================================
   TEST ROUTE
====================================== */
router.get("/test", (req, res) => {
  res.json({ message: "Analytics working" });
});

/* ======================================
   CREATOR ANALYTICS
====================================== */
router.get("/creator", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const books = await Book.find({ author: userId });

    const totalBooks = books.length;

    const totalSales = books.reduce((sum, b) => {
      return sum + (b.sales || 0);
    }, 0);

    const totalRevenue = books.reduce((sum, b) => {
      return sum + (b.revenue || 0);
    }, 0);

    const totalViews = books.reduce((sum, b) => {
      return sum + (b.views || 0);
    }, 0);

    // Temporary Monthly Demo Data
    const monthlyRevenue = [1200, 2100, 1800, 2600, 3200, 4100];
    const monthlySales = [5, 8, 6, 10, 12, 15];

    res.status(200).json({
      success: true,
      totalBooks,
      totalSales,
      totalRevenue,
      totalViews,
      monthlyRevenue,
      monthlySales
    });

  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({
      success: false,
      message: "Analytics error"
    });
  }
});

/* ======================================
   EXPORT ROUTER (VERY IMPORTANT)
====================================== */
module.exports = router;