const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Book = require("../models/book");
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
    const userId = req.user._id || req.user.id;

    const books = await Book.find({ author: userId });

    const totalBooks = books.length;

    const totalSales = books.reduce((sum, b) => {
      return sum + (b.salesCount || 0);
    }, 0);

    const totalRevenue = books.reduce((sum, b) => {
      return sum + (b.earnings || 0);
    }, 0);

    const totalEarnings = totalRevenue;

    const totalViews = books.reduce((sum, b) => {
      return sum + (b.downloads || 0);
    }, 0);

    // Temporary Monthly Demo Data
    const monthlyRevenue = [1200, 2100, 1800, 2600, 3200, 4100];
    const monthlySales = [5, 8, 6, 10, 12, 15];

    res.status(200).json({
      success: true,
      analytics: {
        totalBooks,
        totalSales,
        totalRevenue,
        totalEarnings,
        totalViews,
        monthlyRevenue,
        monthlySales
      }
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