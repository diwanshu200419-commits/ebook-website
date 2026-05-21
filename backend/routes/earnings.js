const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const ReferralReward = require("../models/ReferralReward");
const User = require("../models/user");
const WithdrawRequest = require("../models/WithdrawRequest");
const {
  buildCreatorDashboard,
} = require("../services/dashboardData");
const {
  getCampaignAnalytics,
  getCampaignDefinition,
} = require("../services/campaignTelemetry");
const { roundMoney } = require("../utils/revenue");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

const CREATOR_CAMPAIGN_LINKS = {
  abandoned_cart: {
    mode: "cart",
    actionLabel: "Open cart recovery loop",
    actionLink: "../cart.html",
  },
  post_purchase_upsell: {
    mode: "upsell",
    actionLabel: "Refresh your discovery funnel",
    actionLink: "../explore.html",
  },
  creator_launch_sequence: {
    mode: "creator",
    actionLabel: "Ship your next launch",
    actionLink: "upload.html",
  },
  referral_prompt: {
    mode: "referral",
    actionLabel: "Open referral tools",
    actionLink: "setting.html",
  },
};

function formatVariantLabel(variant = "default") {
  const normalized = String(variant || "default").trim().toLowerCase();
  if (normalized === "social_proof") {
    return "Social Proof";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildCreatorCampaignRecommendations({
  creator,
  creatorAccount,
  books = [],
  referralSummary = {},
  campaignAnalytics = {},
}) {
  const liveProducts = books.filter((book) => String(book?.status || "") === "Approved" && book?.isArchived !== true);
  const totalSales = Number(creator?.creatorStats?.totalSales || 0);
  const totalViews = Number(creator?.creatorStats?.totalViews || 0);
  const totalBooks = liveProducts.length;
  const followersCount = Number(creatorAccount?.creatorStats?.followersCount || 0);
  const signupsCount = Number(referralSummary?.signupsCount || 0);
  const rewardedPurchasesCount = Number(referralSummary?.rewardedPurchasesCount || 0);
  const breakdown = Array.isArray(campaignAnalytics.breakdown) ? campaignAnalytics.breakdown : [];
  const experimentRecommendations = Array.isArray(campaignAnalytics.experimentInsights?.recommendations)
    ? campaignAnalytics.experimentInsights.recommendations
    : [];
  const promotedVariants = campaignAnalytics.experimentInsights?.promotedVariants || {};

  const breakdownByKey = breakdown.reduce((result, entry) => {
    result[String(entry.campaignKey || "")] = entry;
    return result;
  }, {});
  const insightsByKey = experimentRecommendations.reduce((result, entry) => {
    result[String(entry.campaignKey || "")] = entry;
    return result;
  }, {});

  const buildItem = (campaignKey, score, reason, nextStep) => {
    const definition = getCampaignDefinition(campaignKey);
    const campaignEntry = breakdownByKey[campaignKey] || {};
    const experimentInsight = insightsByKey[campaignKey] || {};
    const promotedVariant = promotedVariants[campaignKey];
    const recommendedVariant = promotedVariant || experimentInsight.winningVariant || "default";
    const variantSource = promotedVariant
      ? "auto_promoted"
      : experimentInsight.winningVariant
        ? "top_variant"
        : "default";
    const conversionRate = Number(campaignEntry.conversionRate || experimentInsight.conversionRate || 0);
    const sent = Number(campaignEntry.sent || experimentInsight.sent || 0);
    const converted = Number(campaignEntry.converted || experimentInsight.converted || 0);
    const creatorRevenueInfluenced = roundMoney(
      campaignEntry.creatorRevenueInfluenced
      || (
        experimentInsight.primaryMetricType === "currency"
          ? experimentInsight.primaryMetricValue
          : 0
      )
      || 0
    );
    const scoreBoost = (promotedVariant ? 8 : 0)
      + (experimentInsight.action === "promote" ? 6 : 0)
      + (creatorRevenueInfluenced > 0 ? 4 : 0);
    const priority = Math.min(99, Math.max(0, Math.round(score + scoreBoost)));
    const playbook = CREATOR_CAMPAIGN_LINKS[campaignKey] || {};

    return {
      campaignKey,
      mode: playbook.mode || "",
      label: definition.label,
      description: definition.description,
      reason,
      nextStep,
      actionLabel: playbook.actionLabel || "Open workflow",
      actionLink: playbook.actionLink || "dashboard.html",
      recommendedVariant,
      recommendedVariantLabel: formatVariantLabel(recommendedVariant),
      variantSource,
      priority,
      status: promotedVariant
        ? "winner_ready"
        : sent > 0
          ? "learning"
          : "new_test",
      metrics: {
        sent,
        converted,
        conversionRate,
        creatorRevenueInfluenced,
      },
      insight: experimentInsight.rationale || "",
    };
  };

  const suggestions = [];

  if (totalBooks === 0) {
    suggestions.push(buildItem(
      "creator_launch_sequence",
      96,
      "You do not have an approved live product yet, so launch sequencing will unlock the biggest compounding gain.",
      "Publish your first monetizable product, then use launch nudges to distribute it faster."
    ));
  } else if (totalSales === 0) {
    suggestions.push(buildItem(
      "creator_launch_sequence",
      88,
      "You have live products, but no approved sales yet. Distribution and launch sequencing is the fastest bottleneck to attack.",
      "Rework your newest listing, tighten the value prop, and trigger a fresh launch push."
    ));
  } else if (totalBooks < 3) {
    suggestions.push(buildItem(
      "creator_launch_sequence",
      70,
      "Your catalog is still small, so every launch has outsized impact on repeat revenue and follow notifications.",
      "Add another product so the marketplace has more surfaces to recommend and upsell."
    ));
  }

  if (totalSales > 0) {
    suggestions.push(buildItem(
      "post_purchase_upsell",
      Math.min(92, 62 + totalSales * 2),
      "You already have paying buyers, which makes post-purchase cross-sells one of the cleanest revenue multipliers.",
      "Bundle adjacent products and sharpen the next-best recommendation path after checkout."
    ));
  }

  if (totalViews > 24 || totalSales > 1 || followersCount > 20) {
    suggestions.push(buildItem(
      "abandoned_cart",
      Math.min(86, 56 + Math.min(18, Math.round(totalViews / 15)) + Math.min(10, Math.round(followersCount / 50))),
      "You have enough audience intent to benefit from cart recovery, especially when product discovery is active.",
      "Keep pricing, urgency, and checkout proof friction tight so warm buyers convert before they cool off."
    ));
  }

  if (creatorAccount?.referralCode) {
    suggestions.push(buildItem(
      "referral_prompt",
      signupsCount > rewardedPurchasesCount
        ? 82
        : Math.min(76, 52 + signupsCount * 2 + rewardedPurchasesCount * 4),
      signupsCount > rewardedPurchasesCount
        ? "Your invite link is already attracting signups, so the next upside is converting more of them into first purchases."
        : "Referral loops are active and can keep compounding creator earnings outside direct marketplace traffic.",
      "Share your invite link with a sharper promise and connect it to products with a clear beginner win."
    ));
  }

  return suggestions
    .filter((entry) => entry.priority >= 40)
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return Number(right.metrics?.creatorRevenueInfluenced || 0) - Number(left.metrics?.creatorRevenueInfluenced || 0);
    })
    .slice(0, 3);
}

router.get("/user", protect, authorize("creator", "author", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;

    const [creatorAccount, books, payments, withdrawRequests, referralRewards, campaignAnalytics] = await Promise.all([
      User.findById(userId).select("wallet payout referralCode referralStats creatorStats"),
      Book.find({ author: userId }).sort({ createdAt: -1 }),
      Payment.find({ creator: userId, status: "approved" })
        .populate("book", "title category coverImage price authorName isPaid status filePath previewPath downloads views salesCount earnings isArchived")
        .populate("user", "name email"),
      WithdrawRequest.find({ user: userId }).sort({ requestedAt: -1 }),
      ReferralReward.find({ referrer: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("referredUser", "name username"),
      getCampaignAnalytics({ creatorId: userId, days: 90, limit: 120 }),
    ]);

    const creator = buildCreatorDashboard(
      creatorAccount || req.user,
      books,
      payments,
      backendBaseUrl
    );

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
    const referralSummary = {
      code: creatorAccount?.referralCode || "",
      signupsCount: Number(creatorAccount?.referralStats?.signupsCount || 0),
      creatorsCount: Number(creatorAccount?.referralStats?.creatorsCount || 0),
      rewardedPurchasesCount: Number(creatorAccount?.referralStats?.rewardedPurchasesCount || 0),
      totalRewardAmount: roundMoney(creatorAccount?.referralStats?.totalRewardAmount || 0),
      walletReferralEarnings: roundMoney(creatorAccount?.wallet?.referralEarnings || 0),
    };

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
        transactionId: payment.paymentReference || payment.transactionId,
      }));

    const withdrawalHistory = withdrawRequests.map((request) => ({
      id: request._id,
      amount: roundMoney(request.amount || 0),
      status: request.status,
      method: request.method || "bank",
      requestedAt: request.requestedAt,
      processedAt: request.processedAt,
      adminNote: request.adminNote || "",
    }));
    const referralRewardHistory = referralRewards.map((reward) => ({
      id: reward._id,
      amount: roundMoney(reward.amount || 0),
      referredUser: reward.referredUser
        ? {
            name: reward.referredUser.name || "Member",
            username: reward.referredUser.username || "",
          }
        : null,
      triggerType: reward.triggerType || "first_purchase",
      createdAt: reward.createdAt,
      note: reward.note || "",
    }));

    const topBooks = creator.topBooks.map((book) => ({
      title: book.title,
      sales: book.sales,
      earnings: book.earnings,
      coverUrl: book.coverUrl,
      status: book.status,
    }));

    const lifetimeEarnings = roundMoney(
      Number(creator.creatorStats.totalEarnings || 0) + Number(referralSummary.totalRewardAmount || 0)
    );
    const campaignInsights = campaignAnalytics.experimentInsights || {};
    const campaignRecommendations = buildCreatorCampaignRecommendations({
      creator,
      creatorAccount,
      books,
      referralSummary,
      campaignAnalytics,
    });

    res.json({
      pending,
      available,
      withdrawn,
      lifetime: lifetimeEarnings,
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
      withdrawRequests: withdrawalHistory,
      referralSummary,
      referralRewards: referralRewardHistory,
      campaignOverview: campaignAnalytics.summary || {},
      campaignBreakdown: campaignAnalytics.breakdown || [],
      campaignInsights,
      campaignRecommendations,
      campaignHistory: campaignAnalytics.recentDeliveries || [],
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
