const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const {
  buildCreatorDashboard,
  buildReaderDashboard,
} = require("../services/dashboardData");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

async function buildDashboardPayload(user) {
  const [userPayments, creatorBooks, creatorPayments] = await Promise.all([
    Payment.find({ user: user.id })
      .populate("book", "title category coverImage price authorName isPaid status filePath previewPath downloads views salesCount earnings isArchived")
      .populate("creator", "name username"),
    Book.find({ author: user.id }).sort({ createdAt: -1 }),
    Payment.find({ creator: user.id, status: "approved" })
      .populate("book", "title category coverImage price authorName isPaid status filePath previewPath downloads views salesCount earnings isArchived")
      .populate("user", "name email"),
  ]);

  const reader = buildReaderDashboard(user, userPayments, backendBaseUrl);
  const creator = buildCreatorDashboard(user, creatorBooks, creatorPayments, backendBaseUrl);

  return {
    success: true,
    role: user.role,
    viewer: user.role === "reader" ? "reader" : "creator",
    profile: reader.profile,
    purchases: reader.purchases,
    orderHistory: reader.orderHistory,
    readerStats: reader.readerStats,
    uploadedBooks: creator.uploadedBooks,
    creatorStats: creator.creatorStats,
    recentSales: creator.recentSales,
    topBooks: creator.topBooks,
    chart: creator.chart,
    monthlyRevenue: creator.monthlyRevenue,
    monthlySales: creator.monthlySales,
    categoryRevenue: creator.categoryRevenue,
    categoryCounts: creator.categoryCounts,
    statusBreakdown: creator.statusBreakdown,

    // Backward-compatible creator keys used by existing pages.
    totalEarnings: creator.creatorStats.totalEarnings,
    monthlyEarnings: creator.creatorStats.monthlyEarnings,
    totalDownloads: creator.creatorStats.totalDownloads,
    totalBooks: creator.creatorStats.totalBooks,
    walletBalance: creator.creatorStats.walletBalance,
  };
}

router.get("/", protect, async (req, res) => {
  try {
    const payload = await buildDashboardPayload(req.user);

    return res.status(200).json({
      success: true,
      stats: {
        totalBooks: payload.readerStats.totalPurchased,
        totalSalesAmount: payload.readerStats.totalSpent,
        totalDownloads: payload.creatorStats.totalDownloads,
      },
      recentActivity: payload.orderHistory.slice(0, 5).map((order) => ({
        message: `${order.title} payment ${order.status}`,
        createdAt: order.purchaseDate,
        amount: order.amount,
      })),
      viewer: payload.viewer,
      profile: payload.profile,
    });
  } catch (error) {
    console.error("Dashboard Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

router.get("/user", protect, async (req, res) => {
  try {
    const payload = await buildDashboardPayload(req.user);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Dashboard Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
