const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const {
  buildCreatorDashboard,
} = require("../services/dashboardData");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

router.get("/test", (req, res) => {
  res.json({ message: "Analytics working" });
});

router.get("/creator", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const [books, payments] = await Promise.all([
      Book.find({ author: userId }).sort({ createdAt: -1 }),
      Payment.find({ creator: userId, status: "approved" })
        .populate("book", "title category coverImage price authorName isPaid status filePath previewPath downloads views salesCount earnings isArchived")
        .populate("user", "name email"),
    ]);

    const creator = buildCreatorDashboard(req.user, books, payments, backendBaseUrl);

    const analytics = {
      totalBooks: creator.creatorStats.totalBooks,
      totalSales: creator.creatorStats.totalSales,
      totalRevenue: creator.creatorStats.totalEarnings,
      totalEarnings: creator.creatorStats.totalEarnings,
      totalViews: creator.creatorStats.totalViews,
      chart: creator.chart,
      monthlyRevenue: creator.monthlyRevenue,
      monthlySales: creator.monthlySales,
      creatorScore: creator.creatorStats.creatorScore,
      categoryRevenue: creator.categoryRevenue,
      statusBreakdown: creator.statusBreakdown,
      topBooks: creator.topBooks,
    };

    res.status(200).json({
      success: true,
      ...analytics,
      analytics,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: "Analytics error",
    });
  }
});

module.exports = router;
