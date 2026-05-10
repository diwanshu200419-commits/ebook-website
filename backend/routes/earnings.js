const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const WithdrawRequest = require("../models/WithdrawRequest");
const {
  buildCreatorDashboard,
} = require("../services/dashboardData");
const { roundMoney } = require("../utils/revenue");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

router.get("/user", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;

    const [books, payments, withdrawRequests] = await Promise.all([
      Book.find({ author: userId }).sort({ createdAt: -1 }),
      Payment.find({ creator: userId, status: "approved" })
        .populate("book", "title category coverImage price authorName isPaid status filePath previewPath downloads views salesCount earnings isArchived")
        .populate("user", "name email"),
      WithdrawRequest.find({ user: userId }).sort({ requestedAt: -1 }),
    ]);

    const creator = buildCreatorDashboard(req.user, books, payments, backendBaseUrl);

    const pending = roundMoney(
      withdrawRequests
        .filter((item) => ["pending", "approved"].includes(item.status))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const withdrawn = roundMoney(
      withdrawRequests
        .filter((item) => ["paid"].includes(item.status))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const available = Math.max(
      0,
      roundMoney(creator.creatorStats.walletBalance - pending)
    );

    const transactions = payments
      .slice()
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .map((payment) => ({
        id: payment._id,
        title: payment.book?.title || "Book removed",
        type: payment.book?.category || "Book",
        amount: roundMoney(payment.creatorAmount || 0),
        status: payment.status,
        date: payment.createdAt,
        transactionId: payment.transactionId,
      }));

    const topBooks = creator.topBooks.map((book) => ({
      title: book.title,
      sales: book.sales,
      earnings: book.earnings,
      coverUrl: book.coverUrl,
      status: book.status,
    }));

    res.json({
      pending,
      available,
      withdrawn,
      lifetime: creator.creatorStats.totalEarnings,
      totalSales: creator.creatorStats.totalSales,
      totalBooks: creator.creatorStats.totalBooks,
      creatorScore: creator.creatorStats.creatorScore,
      transactions,
      chart: creator.chart,
      category: creator.categoryRevenue,
      payout: req.user.payout || {},
      topBooks,
      categoryRevenue: creator.categoryRevenue,
      statusBreakdown: creator.statusBreakdown,
    });
  } catch (error) {
    console.error("Earnings Route Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/withdraw", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingRequests = await WithdrawRequest.find({
      user: userId,
      status: { $in: ["pending", "approved"] },
    });
    const pendingAmount = pendingRequests.reduce(
      (sum, request) => sum + Number(request.amount || 0),
      0
    );

    const availableBalance = Math.max(
      0,
      Number(req.user.wallet?.availableBalance || 0) - pendingAmount
    );

    if (availableBalance < 500) {
      return res.status(400).json({
        success: false,
        message: "Minimum Rs. 500 available balance is required to withdraw",
      });
    }

    const withdrawRequest = await WithdrawRequest.create({
      user: userId,
      amount: roundMoney(availableBalance),
      status: "pending",
      method: req.user.payout?.upiId ? "upi" : "bank",
      accountDetails: req.user.payout || {},
    });

    res.json({
      success: true,
      message: "Withdrawal request submitted successfully",
      request: withdrawRequest,
    });
  } catch (error) {
    console.error("Withdraw Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
