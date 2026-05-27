const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const BookReview = require("../models/BookReview");
const User = require("../models/user");
const Payment = require("../models/Payment");
const ReviewReport = require("../models/ReviewReport");
const WithdrawRequest = require("../models/WithdrawRequest");
const { createNotification, createNotifications } = require("../services/notifications");
const { getCampaignAnalytics } = require("../services/campaignTelemetry");
const {
  captureLifecycleStrategySnapshot,
  listLifecycleStrategySnapshots,
  listLifecycleStrategies,
  updateLifecycleStrategy,
} = require("../services/lifecycleStrategies");
const { getLaunchReadinessSummary } = require("../services/platformReadiness");
const {
  getFounderPaymentSettings,
  getFounderPaymentSettingsSnapshot,
  updateFounderPaymentSettings,
} = require("../services/paymentSettings");
const { syncBookAndCreatorRatings } = require("../services/reviewData");
const { normalizeBooleanFlag } = require("../utils/bookCatalog");
const { roundMoney } = require("../utils/revenue");
const {
  buildPublicUploadPath,
  ensureUploadDir,
  safeDeletePublicFile,
} = require("../utils/uploads");

const founderPaymentRailsUploadPath = ensureUploadDir("payment-rails");
const founderPaymentMethodKeys = new Set(["UPI", "GPay", "PayPal"]);

function safeFounderPaymentFilename(originalname, methodKey) {
  const extension = path.extname(String(originalname || "")).toLowerCase();
  const baseName = path
    .basename(String(originalname || ""), extension)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 60);

  const prefix = String(methodKey || "payment")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 20) || "payment";

  return `${Date.now()}-${prefix}-${baseName || "qr"}${extension}`;
}

function isFounderPaymentRailPath(source) {
  return /^\/uploads\/payment-rails\//i.test(String(source || "").trim());
}

function cleanupRetiredFounderPaymentRail(previousPath, nextPath = "") {
  const currentPath = String(previousPath || "").trim();
  if (!currentPath || currentPath === String(nextPath || "").trim()) {
    return;
  }

  if (isFounderPaymentRailPath(currentPath)) {
    safeDeletePublicFile(currentPath);
  }
}

const founderPaymentAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, founderPaymentRailsUploadPath),
    filename: (req, file, cb) => {
      const methodKey = String(req.body?.methodKey || "payment").trim();
      cb(null, safeFounderPaymentFilename(file.originalname, methodKey));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(String(file?.originalname || "")).toLowerCase();
    const isImage = Boolean(file?.mimetype?.startsWith("image/"))
      || [".jpg", ".jpeg", ".png", ".webp"].includes(extension);

    if (!isImage) {
      return cb(new Error("Only PNG, JPG, or WEBP QR images are allowed"), false);
    }

    return cb(null, true);
  },
}).single("qrImage");

function buildTypeBreakdown(books = []) {
  const breakdown = books.reduce((accumulator, book) => {
    const key = String(book.type || "Book");
    if (!accumulator[key]) {
      accumulator[key] = {
        type: key,
        products: 0,
        sales: 0,
        gmv: 0,
        creatorRevenue: 0,
        platformRevenue: 0,
      };
    }

    accumulator[key].products += 1;
    accumulator[key].sales += Number(book.salesCount || 0);
    accumulator[key].creatorRevenue += Number(book.earnings || 0);
    accumulator[key].platformRevenue += Number(book.platformRevenue || 0);
    accumulator[key].gmv += Number(book.earnings || 0) + Number(book.platformRevenue || 0);
    return accumulator;
  }, {});

  return Object.values(breakdown)
    .map((entry) => ({
      ...entry,
      gmv: roundMoney(entry.gmv),
      creatorRevenue: roundMoney(entry.creatorRevenue),
      platformRevenue: roundMoney(entry.platformRevenue),
    }))
    .sort((left, right) => right.gmv - left.gmv || right.sales - left.sales);
}

function buildDeliveryBreakdown(books = []) {
  const breakdown = books.reduce((accumulator, book) => {
    const key = String(book.delivery?.mode || "file");
    if (!accumulator[key]) {
      accumulator[key] = {
        mode: key,
        products: 0,
        sales: 0,
      };
    }

    accumulator[key].products += 1;
    accumulator[key].sales += Number(book.salesCount || 0);
    return accumulator;
  }, {});

  return Object.values(breakdown)
    .sort((left, right) => right.sales - left.sales || right.products - left.products);
}

/* =====================================
   🧑‍💼 ADMIN: GET ALL BOOKS (PENDING/APPROVED/REJECTED)
===================================== */
router.get("/books", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (!normalizeBooleanFlag(req.query?.includeArchived, false)) {
      filter.isArchived = { $ne: true };
    }

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

router.get("/review-reports", protect, authorize("admin"), async (req, res) => {
  try {
    const reports = await ReviewReport.find({ status: "pending" })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate({
        path: "review",
        populate: {
          path: "reviewer",
          select: "name username verified",
        },
      })
      .populate("book", "title category")
      .populate("reporter", "name username email")
      .populate("reviewOwner", "name username email");

    return res.json({ success: true, reports });
  } catch (err) {
    console.error("Get Review Reports Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/payment-settings", protect, authorize("admin"), async (req, res) => {
  try {
    const settings = await getFounderPaymentSettingsSnapshot();
    return res.json({ success: true, settings });
  } catch (err) {
    console.error("Get Payment Settings Error:", err.message);
    return res.status(500).json({ success: false, message: "Could not load payment settings" });
  }
});

router.post("/payment-settings/assets", protect, authorize("admin"), (req, res) => {
  founderPaymentAssetUpload(req, res, async (uploadError) => {
    if (uploadError instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: uploadError.message });
    }

    if (uploadError) {
      return res.status(400).json({ success: false, message: uploadError.message || "QR image upload failed" });
    }

    const methodKey = String(req.body?.methodKey || "").trim();
    if (!founderPaymentMethodKeys.has(methodKey)) {
      if (req.file?.filename) {
        safeDeletePublicFile(buildPublicUploadPath("payment-rails", req.file.filename));
      }
      return res.status(400).json({ success: false, message: "Invalid payment method for QR upload" });
    }

    if (!req.file?.filename) {
      return res.status(400).json({ success: false, message: "Upload a QR image first" });
    }

    try {
      const settings = await getFounderPaymentSettings();
      if (!settings) {
        throw new Error("Could not load founder payment settings");
      }

      const previousQrImage = String(settings.methods?.[methodKey]?.qrImage || "").trim();
      const nextQrImage = buildPublicUploadPath("payment-rails", req.file.filename);

      settings.methods = settings.methods || {};
      settings.methods[methodKey] = settings.methods[methodKey] || {};
      settings.methods[methodKey].qrImage = nextQrImage;
      await settings.save();

      cleanupRetiredFounderPaymentRail(previousQrImage, nextQrImage);

      const snapshot = await getFounderPaymentSettingsSnapshot(settings);
      return res.json({
        success: true,
        message: `${methodKey} QR uploaded`,
        asset: {
          methodKey,
          qrImage: nextQrImage,
        },
        settings: snapshot,
      });
    } catch (err) {
      if (req.file?.filename) {
        safeDeletePublicFile(buildPublicUploadPath("payment-rails", req.file.filename));
      }
      console.error("Upload Payment Asset Error:", err.message);
      return res.status(500).json({ success: false, message: "Could not upload payment QR" });
    }
  });
});

router.put("/payment-settings", protect, authorize("admin"), async (req, res) => {
  try {
    const previousSettings = await getFounderPaymentSettingsSnapshot();
    const settings = await updateFounderPaymentSettings(req.body || {});
    const snapshot = await getFounderPaymentSettingsSnapshot(settings);
    founderPaymentMethodKeys.forEach((methodKey) => {
      cleanupRetiredFounderPaymentRail(
        previousSettings?.methods?.[methodKey]?.qrImage,
        snapshot?.methods?.[methodKey]?.qrImage
      );
    });
    return res.json({
      success: true,
      message: "Payment settings updated",
      settings: snapshot,
    });
  } catch (err) {
    console.error("Update Payment Settings Error:", err.message);
    return res.status(500).json({ success: false, message: "Could not update payment settings" });
  }
});

router.put("/review-reports/:reportId/status", protect, authorize("admin"), async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();
    const action = String(req.body?.action || "").trim().toLowerCase();
    const adminNote = String(req.body?.adminNote || req.body?.note || "").trim().slice(0, 600);

    if (!["resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid report status" });
    }

    if (!["keep_review", "remove_review", ""].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid moderation action" });
    }

    const report = await ReviewReport.findById(req.params.reportId).populate("review", "book creator");
    if (!report) {
      return res.status(404).json({ success: false, message: "Review report not found" });
    }

    if (report.status !== "pending") {
      return res.status(400).json({ success: false, message: "Review report already processed" });
    }

    let reviewRemoved = false;
    if (status === "resolved" && action === "remove_review" && report.review?._id) {
      await BookReview.findByIdAndDelete(report.review._id);
      await syncBookAndCreatorRatings({
        _id: report.review.book,
        author: report.review.creator,
      });
      reviewRemoved = true;
    }

    report.status = status;
    report.actionTaken = reviewRemoved
      ? "removed"
      : status === "dismissed"
        ? "kept"
        : action === "keep_review"
          ? "kept"
          : "none";
    report.adminNote = adminNote;
    report.reviewedAt = new Date();
    await report.save();

    return res.json({
      success: true,
      message: reviewRemoved
        ? "Reported review removed"
        : status === "dismissed"
          ? "Report dismissed"
          : "Report resolved",
      report,
    });
  } catch (err) {
    console.error("Update Review Report Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
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

    const creator = book.author
      ? await User.findById(book.author).select("email username followers notifications status isDeleted")
      : null;

    if (creator) {
      await createNotification({
        user: creator,
        type: "success",
        category: "release",
        preferenceKey: "releases",
        title: "Your product is now live",
        message: `${book.title} was approved and is now discoverable in the marketplace.`,
        link: `book_view.html?id=${encodeURIComponent(String(book._id))}`,
        email: {
          subject: `Your product is live: ${book.title}`,
          body: `${book.title} was approved and is now discoverable in the marketplace.`,
          ctaLabel: "View product page",
          ctaUrl: `book_view.html?id=${encodeURIComponent(String(book._id))}`,
          tags: [{ name: "campaign", value: "creator_release" }],
        },
      }).catch((error) => {
        console.error("Creator publish notification error:", error.message);
      });

      await createNotifications({
        userIds: Array.isArray(creator.followers) ? creator.followers : [],
        type: "info",
        category: "release",
        preferenceKey: "releases",
        title: "New creator drop",
        message: `${book.authorName || "A creator you follow"} just launched ${book.title}.`,
        link: `book_view.html?id=${encodeURIComponent(String(book._id))}`,
        email: {
          subject: `New creator drop: ${book.title}`,
          body: `${book.authorName || "A creator you follow"} just launched ${book.title}. Open the product page to see if it fits your goals.`,
          ctaLabel: "Open new drop",
          ctaUrl: `book_view.html?id=${encodeURIComponent(String(book._id))}`,
          tags: [{ name: "campaign", value: "follower_release" }],
        },
      }).catch((error) => {
        console.error("Follower release notification error:", error.message);
      });
    }

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
router.put("/books/:bookId/featured", protect, authorize("admin"), async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const isFeatured = normalizeBooleanFlag(req.body?.isFeatured, !book.isFeatured);
    if (isFeatured && book.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved live books can be added to featured placement",
      });
    }

    book.isFeatured = isFeatured;
    await book.save();

    return res.json({
      success: true,
      message: isFeatured
        ? "Book added to featured placement"
        : "Book removed from featured placement",
      book,
    });
  } catch (err) {
    console.error("Update Featured Book Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get Users Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/creators/overview", protect, authorize("admin"), async (req, res) => {
  try {
    const [verificationRequests, topReferrers, summaryCounts] = await Promise.all([
      User.find({
        role: { $in: ["creator", "author"] },
        isDeleted: { $ne: true },
        "creatorVerification.status": { $in: ["pending", "rejected"] },
      })
        .select("name email username role verified profileImage referralStats creatorStats creatorVerification createdAt")
        .sort({
          "creatorVerification.status": 1,
          "creatorVerification.submittedAt": -1,
          createdAt: -1,
        })
        .limit(20),
      User.find({
        isDeleted: { $ne: true },
        $or: [
          { "referralStats.signupsCount": { $gt: 0 } },
          { "referralStats.creatorsCount": { $gt: 0 } },
        ],
      })
        .select("name email username role verified referralCode referralStats creatorStats")
        .sort({
          "referralStats.signupsCount": -1,
          "referralStats.creatorsCount": -1,
          createdAt: -1,
        })
        .limit(10),
      User.aggregate([
        {
          $facet: {
            pending: [
              {
                $match: {
                  role: { $in: ["creator", "author"] },
                  isDeleted: { $ne: true },
                  "creatorVerification.status": "pending",
                },
              },
              { $count: "count" },
            ],
            verifiedCreators: [
              {
                $match: {
                  role: { $in: ["creator", "author"] },
                  isDeleted: { $ne: true },
                  verified: true,
                },
              },
              { $count: "count" },
            ],
            totalReferralSignups: [
              {
                $group: {
                  _id: null,
                  total: { $sum: "$referralStats.signupsCount" },
                  creators: { $sum: "$referralStats.creatorsCount" },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const totals = summaryCounts?.[0] || {};
    const referralTotals = totals.totalReferralSignups?.[0] || {};

    return res.json({
      success: true,
      summary: {
        pendingVerifications: totals.pending?.[0]?.count || 0,
        verifiedCreators: totals.verifiedCreators?.[0]?.count || 0,
        totalReferralSignups: referralTotals.total || 0,
        totalReferredCreators: referralTotals.creators || 0,
      },
      verificationRequests,
      topReferrers,
    });
  } catch (err) {
    console.error("Get Creators Overview Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/creators/:userId/verification", protect, authorize("admin"), async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();
    const adminNote = String(req.body?.adminNote || req.body?.note || "").trim().slice(0, 600);

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid verification status" });
    }

    if (status === "rejected" && !adminNote) {
      return res.status(400).json({ success: false, message: "Admin note is required when rejecting verification" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Creator account not found" });
    }

    if (!["creator", "author", "admin"].includes(String(user.role || "").toLowerCase())) {
      return res.status(400).json({ success: false, message: "This account is not in creator mode" });
    }

    user.creatorVerification = {
      ...(user.creatorVerification || {}),
      status,
      reviewedAt: new Date(),
      submittedAt: user.creatorVerification?.submittedAt || new Date(),
      adminNote,
    };
    user.verified = status === "approved";

    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: status === "approved"
        ? "Creator verification approved"
        : "Creator verification rejected",
      creator: user,
    });
  } catch (err) {
    console.error("Update Creator Verification Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/withdrawals", protect, authorize("admin"), async (req, res) => {
  try {
    const requestedStatus = String(req.query.status || "").trim().toLowerCase();
    let filter = {};

    if (requestedStatus === "actionable" || !requestedStatus) {
      filter.status = { $in: ["pending", "approved"] };
    } else if (["pending", "approved", "rejected", "paid"].includes(requestedStatus)) {
      filter.status = requestedStatus;
    }

    const withdrawals = await WithdrawRequest.find(filter)
      .sort({ requestedAt: -1 })
      .populate("user", "name email username payout wallet verified");

    const summary = {
      pending: withdrawals.filter((item) => item.status === "pending").length,
      approved: withdrawals.filter((item) => item.status === "approved").length,
      totalAmount: roundMoney(
        withdrawals.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      ),
    };

    return res.json({ success: true, withdrawals, summary });
  } catch (err) {
    console.error("Get Withdrawals Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/withdrawals/:withdrawalId/status", protect, authorize("admin"), async (req, res) => {
  try {
    const nextStatus = String(req.body?.status || "").trim().toLowerCase();
    const adminNote = String(req.body?.adminNote || req.body?.note || "").trim();
    const allowedStatuses = ["approved", "rejected", "paid"];

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal status" });
    }

    const withdrawal = await WithdrawRequest.findById(req.params.withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found" });
    }

    const allowedTransitions = {
      pending: ["approved", "rejected", "paid"],
      approved: ["rejected", "paid"],
      rejected: [],
      paid: [],
    };

    if (!allowedTransitions[withdrawal.status]?.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move withdrawal from ${withdrawal.status} to ${nextStatus}`
      });
    }

    if (nextStatus === "paid") {
      const creator = await User.findById(withdrawal.user);
      if (!creator) {
        return res.status(404).json({ success: false, message: "Creator account not found" });
      }

      creator.wallet.availableBalance = roundMoney(
        Math.max(0, Number(creator.wallet?.availableBalance || 0) - Number(withdrawal.amount || 0))
      );
      creator.wallet.withdrawnTotal = roundMoney(
        Number(creator.wallet?.withdrawnTotal || 0) + Number(withdrawal.amount || 0)
      );
      await creator.save();
    }

    withdrawal.status = nextStatus;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = adminNote || withdrawal.adminNote || "";
    await withdrawal.save();

    const populatedWithdrawal = await WithdrawRequest.findById(withdrawal._id)
      .populate("user", "name email username payout wallet verified");

    return res.json({
      success: true,
      message: `Withdrawal marked ${nextStatus}`,
      withdrawal: populatedWithdrawal,
    });
  } catch (err) {
    console.error("Update Withdrawal Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: GET ANALYTICS
===================================== */
router.get("/analytics", protect, authorize("admin"), async (req, res) => {
  try {
    const [totalUsers, totalBooks, approvedBooks, pendingAiReviews, rejectedBooks, approvedPayments, approvedCatalog, creators, campaignAnalytics] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Book.countDocuments({ status: "Approved" }),
      Book.countDocuments({
        $or: [{ aiStatus: "pending" }, { status: "Admin_Review" }, { aiProcessingState: "queued" }]
      }),
      Book.countDocuments({ status: "Rejected" }),
      Payment.find({ status: "approved" }).select("amount creatorAmount platformFee"),
      Book.find({ status: "Approved", isArchived: { $ne: true } })
        .select("title type category delivery salesCount earnings platformRevenue"),
      User.countDocuments({ role: { $in: ["creator", "author"] }, isDeleted: { $ne: true } }),
      getCampaignAnalytics({ days: 90, limit: 180 }),
    ]);
    const [lifecycleStrategies, lifecycleSnapshots] = await Promise.all([
      listLifecycleStrategies({ analytics: campaignAnalytics }),
      listLifecycleStrategySnapshots({ limit: 8 }),
    ]);

    const totalGmv = roundMoney(
      approvedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    );
    const creatorPayouts = roundMoney(
      approvedPayments.reduce((sum, payment) => sum + Number(payment.creatorAmount || 0), 0)
    );
    const totalRevenue = roundMoney(
      approvedPayments.reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0)
    );
    const totalSales = approvedPayments.length;
    const topProducts = approvedCatalog
      .slice()
      .sort((left, right) => {
        const rightScore = Number(right.salesCount || 0) * 5 + Number(right.earnings || 0);
        const leftScore = Number(left.salesCount || 0) * 5 + Number(left.earnings || 0);
        return rightScore - leftScore;
      })
      .slice(0, 6)
      .map((book) => ({
        id: book._id,
        title: book.title,
        type: book.type || "Book",
        category: book.category || "Other",
        deliveryMode: book.delivery?.mode || "file",
        sales: Number(book.salesCount || 0),
        creatorRevenue: roundMoney(book.earnings || 0),
        platformRevenue: roundMoney(book.platformRevenue || 0),
      }));

    res.json({
      success: true,
      analytics: {
        totalUsers,
        activeCreators: creators,
        totalBooks,
        approvedBooks,
        pendingAiReviews,
        rejectedBooks,
        totalRevenue,
        totalSales,
        totalGmv,
        creatorPayouts,
      },
      typeBreakdown: buildTypeBreakdown(approvedCatalog),
      deliveryBreakdown: buildDeliveryBreakdown(approvedCatalog),
      topProducts,
      campaignAnalytics,
      lifecycleStrategies,
      lifecycleSnapshots,
      launchReadiness: getLaunchReadinessSummary(),
    });
  } catch (err) {
    console.error("Get Analytics Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/lifecycle-strategies/:campaignKey", protect, authorize("admin"), async (req, res) => {
  try {
    const strategy = await updateLifecycleStrategy(
      req.params.campaignKey,
      {
        resolutionMode: req.body?.resolutionMode,
        manualVariant: req.body?.manualVariant,
        fallbackVariant: req.body?.fallbackVariant,
        notes: req.body?.notes,
        reason: req.body?.reason,
      },
      req.user.id
    );

    return res.json({
      success: true,
      message: `${strategy.label} strategy saved`,
      strategy,
    });
  } catch (err) {
    console.error("Update Lifecycle Strategy Error:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Unable to update lifecycle strategy",
    });
  }
});

router.post("/lifecycle-snapshots", protect, authorize("admin"), async (req, res) => {
  try {
    const snapshot = await captureLifecycleStrategySnapshot({
      triggerType: "admin",
      triggeredBy: req.user.id,
      note: req.body?.note || "",
    });

    return res.json({
      success: true,
      message: "Lifecycle snapshot captured",
      snapshot,
    });
  } catch (err) {
    console.error("Capture Lifecycle Snapshot Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Unable to capture lifecycle snapshot",
    });
  }
});

module.exports = router;
