const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");

const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const Cart = require("../models/Cart");
const Payment = require("../models/Payment");
const User = require("../models/user");
const { grantFirstPurchaseReferralReward } = require("../services/referralRewards");
const { createNotification } = require("../services/notifications");
const { buildPurchasePayload } = require("../services/dashboardData");
const {
  buildCheckoutAmount,
  getPaymentConfig,
  hasAutomaticTaxEnabled,
  hasStripeEnabled,
} = require("../services/globalMarkets");
const {
  ensureUploadDir,
  buildPublicUploadPath,
  resolvePublicUploadPath,
} = require("../utils/uploads");
const { getRevenueSplit } = require("../utils/revenue");
const { getFrontendBaseUrl, normalizeUrl } = require("../utils/urlConfig");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2023-10-16"
});

const uploadPath = ensureUploadDir("payments");
const PAYMENT_METHODS = ["UPI", "GPay", "PayPal"];

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function safeFilename(originalname) {
  const extension = path.extname(String(originalname || "")).toLowerCase();
  const baseName = path
    .basename(String(originalname || ""), extension)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);

  return `${Date.now()}-${baseName || "payment"}${extension}`;
}

function buildFrontendPageUrl(pageName) {
  const baseUrl = normalizeUrl(getFrontendBaseUrl());
  if (!baseUrl) {
    return "";
  }

  try {
    const parsed = new URL(baseUrl);
    const pathname = parsed.pathname || "/";
    const directory = /\.[a-z0-9]+$/i.test(pathname)
      ? pathname.replace(/[^/]+$/, "")
      : pathname.endsWith("/")
        ? pathname
        : `${pathname}/`;

    return `${parsed.origin}${directory}${pageName}`;
  } catch {
    return "";
  }
}

function buildManualCheckoutUrl({ bookId = "", reason = "stripe" } = {}) {
  const checkoutUrl = buildFrontendPageUrl("checkout.html");
  if (!checkoutUrl) {
    return "";
  }

  try {
    const parsed = new URL(checkoutUrl);
    if (bookId) {
      parsed.searchParams.set("bookId", String(bookId));
    }
    if (reason) {
      parsed.searchParams.set("fallback", String(reason));
    }
    return parsed.toString();
  } catch {
    const params = [];
    if (bookId) {
      params.push(`bookId=${encodeURIComponent(String(bookId))}`);
    }
    if (reason) {
      params.push(`fallback=${encodeURIComponent(String(reason))}`);
    }
    return params.length ? `${checkoutUrl}?${params.join("&")}` : checkoutUrl;
  }
}

function buildManualFallbackPayload({
  market,
  bookId = "",
  scope = "single",
} = {}) {
  if (!market?.manualCheckoutEnabled) {
    return null;
  }

  const url = buildManualCheckoutUrl({
    bookId,
    reason: scope === "cart" ? "stripe_cart" : "stripe_single",
  });
  if (!url) {
    return null;
  }

  return {
    success: true,
    checkoutMode: "manual_fallback",
    fallback: {
      type: "manual_checkout",
      reason: "stripe_temporarily_unavailable",
      marketCountry: market.countryCode || "IN",
      marketCurrency: market.currency || "INR",
    },
    url,
    message:
      scope === "cart"
        ? "Stripe card checkout is temporarily unavailable. Continue with manual proof checkout for this order."
        : "Stripe card checkout is temporarily unavailable. Continue with manual proof checkout for this product.",
  };
}

function createPaymentUploader() {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadPath),
      filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(String(file?.originalname || "")).toLowerCase();
      const isImage = Boolean(file?.mimetype?.startsWith("image/")) ||
        [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension);

      if (!isImage) {
        return cb(new Error("Only image screenshots are allowed"), false);
      }

      return cb(null, true);
    }
  });
}

const upload = createPaymentUploader();

async function applyApprovedPaymentEffects(creatorId, bookId, amount, options = {}) {
  const split = getRevenueSplit(amount);

  await User.findByIdAndUpdate(creatorId, {
    $inc: {
      "wallet.totalEarnings": split.creatorAmount,
      "wallet.availableBalance": split.creatorAmount
    }
  });

  await Book.findByIdAndUpdate(bookId, {
    $inc: {
      salesCount: 1,
      earnings: split.creatorAmount,
      platformRevenue: split.platformFee
    }
  });

  if (options.userId && options.paymentId) {
    try {
      await grantFirstPurchaseReferralReward({
        paymentId: options.paymentId,
        userId: options.userId,
      });
    } catch (error) {
      console.error("Referral Reward Error:", error.message);
    }
  }

  try {
    const [creator, book, buyer] = await Promise.all([
      User.findById(creatorId).select("name username email notifications status isDeleted"),
      Book.findById(bookId).select("title"),
      options.userId ? User.findById(options.userId).select("name username status isDeleted") : null,
    ]);

    if (creator && book) {
      await createNotification({
        user: creator,
        type: "success",
        category: "sale",
        preferenceKey: "sales",
        title: "New sale unlocked",
        message: `${buyer?.name || buyer?.username || "A buyer"} purchased ${book.title}. Rs. ${split.creatorAmount.toLocaleString("en-IN")} was added to your creator balance.`,
        link: "dashboard/earning.html",
        email: {
          subject: `New sale: ${book.title}`,
          body: `${buyer?.name || buyer?.username || "A buyer"} purchased ${book.title}. ${formatCurrency(split.creatorAmount)} was added to your creator balance.`,
          ctaLabel: "Open earnings dashboard",
          ctaUrl: "dashboard/earning.html",
          tags: [{ name: "campaign", value: "sale_alert" }],
        },
      });
    }

    if (options.userId && book) {
      await createNotification({
        user: options.userId,
        type: "success",
        category: "purchase",
        title: "Purchase unlocked",
        message: `${book.title} is now unlocked in your dashboard and ready to open or download.`,
        link: "dashboard/dashboard.html",
        email: {
          subject: `Your purchase is unlocked: ${book.title}`,
          body: `${book.title} is now unlocked in your dashboard and ready to open or download.`,
          ctaLabel: "Open dashboard",
          ctaUrl: "dashboard/dashboard.html",
          tags: [{ name: "campaign", value: "purchase_unlock" }],
        },
      });
    }
  } catch (error) {
    console.error("Payment Notification Error:", error.message);
  }

  return split;
}

function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
}

function normalizeManualBookIds(payload = {}) {
  const rawBookIds = payload.bookIds;

  if (Array.isArray(rawBookIds)) {
    return rawBookIds.map((value) => String(value || "").trim()).filter(Boolean);
  }

  if (typeof rawBookIds === "string" && rawBookIds.trim()) {
    try {
      const parsed = JSON.parse(rawBookIds);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value || "").trim()).filter(Boolean);
      }
    } catch {
      return rawBookIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  if (payload.bookId) {
    return [String(payload.bookId).trim()].filter(Boolean);
  }

  return [];
}

function createManualPaymentGroupId(userId) {
  const userSlug = String(userId || "").slice(-6) || "user";
  const random = Math.random().toString(36).slice(2, 8);
  return `manual_${userSlug}_${Date.now().toString(36)}_${random}`;
}

function createInternalManualTransactionId(groupId, bookId) {
  return `${groupId}:${String(bookId)}`;
}

async function upsertApprovedPayment({
  userId,
  bookId,
  creatorId,
  amount,
  paymentMethod = "Stripe",
  transactionId,
  paymentReference = transactionId,
  paymentGroupId = transactionId,
  screenshot = "stripe_auto",
  adminNote = "Payment confirmed automatically."
}) {
  const normalizedAmount = Number(amount || 0);
  const normalizedMethod = normalizePaymentMethod(paymentMethod);

  let existingPayment = await Payment.findOne({ transactionId });
  if (existingPayment) {
    return { payment: existingPayment, created: false };
  }

  existingPayment = await Payment.findOne({ user: userId, book: bookId });
  if (existingPayment) {
    if (existingPayment.status === "approved") {
      return { payment: existingPayment, created: false };
    }

    existingPayment.creator = creatorId;
    existingPayment.amount = normalizedAmount;
    existingPayment.paymentMethod = normalizedMethod;
    existingPayment.transactionId = transactionId;
    existingPayment.paymentReference = paymentReference;
    existingPayment.paymentGroupId = paymentGroupId;
    existingPayment.screenshot = screenshot;
    existingPayment.status = "approved";
    existingPayment.reviewedAt = new Date();
    existingPayment.adminNote = adminNote;

    try {
      await existingPayment.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const duplicatePayment = await Payment.findOne({
          $or: [
            { transactionId },
            { user: userId, book: bookId, status: "approved" },
          ],
        });

        if (duplicatePayment) {
          return { payment: duplicatePayment, created: false };
        }
      }

      throw error;
    }

    await applyApprovedPaymentEffects(creatorId, bookId, normalizedAmount, {
      paymentId: existingPayment._id,
      userId,
    });
    return { payment: existingPayment, created: true };
  }

  try {
    const createdPayment = await Payment.create({
      user: userId,
      book: bookId,
      creator: creatorId,
        amount: normalizedAmount,
        paymentMethod: normalizedMethod,
        transactionId,
        paymentReference,
        paymentGroupId,
        screenshot,
        status: "approved",
      reviewedAt: new Date(),
      adminNote,
    });

    await applyApprovedPaymentEffects(creatorId, bookId, normalizedAmount, {
      paymentId: createdPayment._id,
      userId,
    });
    return { payment: createdPayment, created: true };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicatePayment = await Payment.findOne({
        $or: [
          { transactionId },
          { user: userId, book: bookId, status: "approved" },
        ],
      });

      if (duplicatePayment) {
        return { payment: duplicatePayment, created: false };
      }
    }

    throw error;
  }
}

async function removeBookFromCart(userId, bookIds) {
  if (!userId || !bookIds?.length) {
    return;
  }

  await Cart.findOneAndUpdate(
    { user: userId },
    {
      $pull: {
        items: {
          book: { $in: bookIds.map((bookId) => new mongoose.Types.ObjectId(bookId)) }
        }
      }
    }
  );
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function buildProofHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function sendProtectedProofFile(res, screenshotPath) {
  if (isAbsoluteUrl(screenshotPath)) {
    return res.redirect(String(screenshotPath || "").trim());
  }

  const targetPath = resolvePublicUploadPath(screenshotPath);
  if (!targetPath) {
    return res.status(404).json({
      success: false,
      message: "Payment proof file not found",
    });
  }

  return res.sendFile(targetPath, {
    headers: buildProofHeaders(),
  });
}

async function processStripeSession(session) {
  if (!session) {
    throw new Error("Stripe session missing");
  }

  if (session.payment_status !== "paid") {
    return { success: false, payment: "pending" };
  }

  const { bookId, userId, creatorId, bookIds } = session.metadata || {};

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Stripe session is missing a valid user reference");
  }

  if (bookIds) {
    const parsedIds = bookIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!parsedIds.length) {
      throw new Error("Stripe session cart metadata is invalid");
    }

    const books = await Book.find({ _id: { $in: parsedIds } }).select("_id price author");
    const createdPayments = [];

    for (const book of books) {
      const result = await upsertApprovedPayment({
        userId,
        bookId: book._id,
        creatorId: book.author,
        amount: Number(book.price || 0),
        paymentMethod: "Stripe",
        transactionId: `${session.id}:${book._id}`,
        paymentReference: session.id,
        paymentGroupId: session.id,
        screenshot: "stripe_auto",
        adminNote: "Recorded from Stripe cart checkout.",
      });

      if (result.created) {
        createdPayments.push(result.payment);
      }
    }

    await removeBookFromCart(userId, parsedIds);

    const purchases = await Payment.find({
      user: userId,
      paymentReference: session.id,
      status: "approved",
    })
      .populate("book", "title type authorName bookAuthor category subcategory price originalPrice discountPrice filePath previewPath coverImage isPaid status isArchived delivery")
      .populate("creator", "name username");

    return {
      success: true,
      payment: "completed",
      created: createdPayments.length,
      paymentIds: createdPayments.map((payment) => payment._id),
      purchases: purchases.map((payment) => buildPurchasePayload(payment)),
    };
  }

  if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error("Stripe session is missing a valid book reference");
  }

  const book = await Book.findById(bookId).select("_id price author");
  const result = await upsertApprovedPayment({
    userId,
    bookId,
    creatorId: book?.author || creatorId,
    amount: book ? Number(book.price || 0) : Number(session.amount_total || 0) / 100,
    paymentMethod: "Stripe",
    transactionId: session.id,
    paymentReference: session.id,
    paymentGroupId: session.id,
    screenshot: "stripe_auto",
    adminNote: "Recorded from Stripe checkout.",
  });

  await removeBookFromCart(userId, [bookId]);

  const purchases = await Payment.find({
    user: userId,
    paymentReference: session.id,
    status: "approved",
  })
    .populate("book", "title type authorName bookAuthor category subcategory price originalPrice discountPrice filePath previewPath coverImage isPaid status isArchived delivery")
    .populate("creator", "name username");

  return {
    success: true,
    payment: "completed",
    paymentId: result.payment?._id,
    created: result.created ? 1 : 0,
    purchases: purchases.map((payment) => buildPurchasePayload(payment)),
  };
}

function normalizePaymentMethod(value) {
  const normalized = String(value || "").trim();
  if (PAYMENT_METHODS.includes(normalized)) {
    return normalized;
  }

  if (/stripe|card/i.test(normalized)) {
    return "Stripe";
  }

  return "Other";
}

router.get("/config", (req, res) => {
  return res.json({
    success: true,
    ...getPaymentConfig({
      country: req.query?.country,
      currency: req.query?.currency,
    }),
  });
});

/* =====================================
   Create Stripe Checkout
===================================== */
router.post("/create-checkout", protect, async (req, res) => {
  try {
    const { bookId, country, currency } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid bookId" });
    }

    const book = await Book.findById(bookId);
    if (!book || book.isArchived || book.status !== "Approved") {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (!book.price || book.price <= 0 || !book.isPaid) {
      return res.status(400).json({ success: false, message: "Only paid approved books can be purchased" });
    }

    const existing = await Payment.findOne({
      user: req.user.id,
      book: book._id,
      status: "approved"
    });
    if (existing) {
      return res.status(200).json({ success: true, message: "Already purchased" });
    }

    const successUrl = buildFrontendPageUrl("success.html");
    const cancelUrl = buildFrontendPageUrl("cancel.html");
    const checkoutAmount = buildCheckoutAmount(book.price, { country, currency });
    const manualFallback = buildManualFallbackPayload({
      market: checkoutAmount.market,
      bookId: book._id,
      scope: "single",
    });

    if (!hasStripeEnabled()) {
      if (manualFallback) {
        return res.json(manualFallback);
      }

      return res.status(503).json({
        success: false,
        message: "Stripe checkout is not configured yet",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      ...(hasAutomaticTaxEnabled() ? { automatic_tax: { enabled: true } } : {}),
      line_items: [
        {
          price_data: {
            currency: checkoutAmount.market.currency.toLowerCase(),
            product_data: { name: book.title },
            unit_amount: checkoutAmount.displayMinorAmount,
          },
          quantity: 1
        }
      ],
      metadata: {
        bookId: book._id.toString(),
        userId: req.user.id.toString(),
        creatorId: book.author.toString(),
        marketCountry: checkoutAmount.market.countryCode,
        marketCurrency: checkoutAmount.market.currency,
        pricingBaseCurrency: checkoutAmount.market.baseCurrency,
        baseAmountInInr: String(checkoutAmount.baseAmountInInr),
        convertedAmount: String(checkoutAmount.displayAmount),
        conversionRateFromInr: String(checkoutAmount.market.conversionRateFromInr),
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error.message);
    const bookId = req.body?.bookId;
    if (mongoose.Types.ObjectId.isValid(bookId)) {
      const book = await Book.findById(bookId).select("_id price");
      if (book) {
        const checkoutAmount = buildCheckoutAmount(book.price, {
          country: req.body?.country,
          currency: req.body?.currency,
        });
        const manualFallback = buildManualFallbackPayload({
          market: checkoutAmount.market,
          bookId: book._id,
          scope: "single",
        });
        if (manualFallback) {
          return res.status(200).json(manualFallback);
        }
      }
    }
    return res.status(500).json({ success: false, message: "Stripe checkout failed" });
  }
});

/* =====================================
   Create Stripe Checkout For Cart
===================================== */
router.post("/create-checkout-cart", protect, async (req, res) => {
  try {
    const inputBookIds = Array.isArray(req.body.bookIds) ? req.body.bookIds : [];
    if (!inputBookIds.length) {
      return res.status(400).json({ success: false, message: "No books selected" });
    }

    const validIds = inputBookIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const books = await Book.find({
      _id: { $in: validIds },
      status: "Approved",
      isPaid: true,
      isArchived: { $ne: true }
    });

    if (!books.length) {
      return res.status(400).json({ success: false, message: "No valid paid books found" });
    }

    const purchased = await Payment.find({
      user: req.user.id,
      status: "approved",
      book: { $in: books.map((book) => book._id) }
    }).select("book");

    const purchasedSet = new Set(purchased.map((payment) => String(payment.book)));
    const payableBooks = books.filter((book) => !purchasedSet.has(String(book._id)));

    if (!payableBooks.length) {
      return res.status(200).json({
        success: true,
        message: "All selected books already purchased"
      });
    }

    const checkoutSelection = {
      country: req.body?.country,
      currency: req.body?.currency,
    };
    const marketSnapshot = buildCheckoutAmount(payableBooks[0]?.price || 0, checkoutSelection).market;
    const manualFallback = buildManualFallbackPayload({
      market: marketSnapshot,
      scope: "cart",
    });

    if (!hasStripeEnabled()) {
      if (manualFallback) {
        return res.json(manualFallback);
      }

      return res.status(503).json({
        success: false,
        message: "Stripe checkout is not configured yet",
      });
    }

    const lineItems = payableBooks.map((book) => {
      const amount = buildCheckoutAmount(book.price, checkoutSelection);
      return ({
      price_data: {
        currency: amount.market.currency.toLowerCase(),
        product_data: { name: book.title },
        unit_amount: amount.displayMinorAmount,
      },
      quantity: 1
    });
    });

    const successUrl = buildFrontendPageUrl("success.html");
    const cancelUrl = buildFrontendPageUrl("cancel.html");
    const baseCartTotal = payableBooks.reduce((sum, book) => sum + Number(book.price || 0), 0);
    const convertedCartTotal = payableBooks.reduce((sum, book) => {
      const amount = buildCheckoutAmount(book.price, checkoutSelection);
      return sum + Number(amount.displayAmount || 0);
    }, 0);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      ...(hasAutomaticTaxEnabled() ? { automatic_tax: { enabled: true } } : {}),
      line_items: lineItems,
      metadata: {
        bookIds: payableBooks.map((book) => String(book._id)).join(","),
        userId: req.user.id.toString(),
        marketCountry: marketSnapshot.countryCode,
        marketCurrency: marketSnapshot.currency,
        pricingBaseCurrency: marketSnapshot.baseCurrency,
        baseAmountInInr: String(baseCartTotal),
        convertedAmount: String(Math.round(convertedCartTotal * 100) / 100),
        conversionRateFromInr: String(marketSnapshot.conversionRateFromInr),
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe Cart Checkout Error:", error.message);
    const fallbackBookIds = Array.isArray(req.body?.bookIds)
      ? req.body.bookIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];
    if (fallbackBookIds.length) {
      const sampleBook = await Book.findOne({
        _id: { $in: fallbackBookIds },
        status: "Approved",
        isPaid: true,
        isArchived: { $ne: true },
      }).select("price");

      if (sampleBook) {
        const marketSnapshot = buildCheckoutAmount(sampleBook.price || 0, {
          country: req.body?.country,
          currency: req.body?.currency,
        }).market;
        const manualFallback = buildManualFallbackPayload({
          market: marketSnapshot,
          scope: "cart",
        });
        if (manualFallback) {
          return res.status(200).json(manualFallback);
        }
      }
    }
    return res.status(500).json({ success: false, message: "Stripe checkout failed" });
  }
});

/* =====================================
   Verify Stripe Session
===================================== */
router.get("/verify-session", protect, async (req, res) => {
  try {
    const { session_id: sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID missing" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const verificationResult = await processStripeSession(session);
    return res.json(verificationResult);
  } catch (error) {
    console.error("Stripe Verify Error:", error.message);
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});

/* =====================================
   Manual Payment Submission
===================================== */
router.post("/manual", protect, (req, res) => {
  upload.single("screenshot")(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message: uploadError.message || "Invalid screenshot upload"
      });
    }

    try {
      const { paymentMethod, transactionId } = req.body;
      const trimmedTransactionId = String(transactionId || "").trim();
      const requestedBookIds = normalizeManualBookIds(req.body)
        .filter((bookId) => mongoose.Types.ObjectId.isValid(bookId));

      if (!requestedBookIds.length || !paymentMethod || !trimmedTransactionId || !req.file) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      const uniqueBookIds = [...new Set(requestedBookIds)];
      if (!uniqueBookIds.length) {
        return res.status(400).json({ success: false, message: "Select at least one valid product" });
      }

      const books = await Book.find({
        _id: { $in: uniqueBookIds },
        isArchived: { $ne: true },
        status: "Approved",
      }).select("_id title price author isPaid");

      if (!books.length) {
        return res.status(404).json({ success: false, message: "No valid products found" });
      }

      const bookMap = new Map(books.map((book) => [String(book._id), book]));
      const invalidSelections = uniqueBookIds.filter((bookId) => !bookMap.has(String(bookId)));
      if (invalidSelections.length) {
        return res.status(400).json({
          success: false,
          message: "Some selected products are no longer available"
        });
      }

      const freeSelections = books.filter((book) => !book.isPaid || Number(book.price || 0) <= 0);
      if (freeSelections.length) {
        return res.status(400).json({
          success: false,
          message: "Free products do not require manual checkout"
        });
      }

      const existingPayments = await Payment.find({
        user: req.user.id,
        book: { $in: uniqueBookIds },
      });

      const approvedPayments = existingPayments.filter((payment) => payment.status === "approved");
      if (approvedPayments.length) {
        const approvedTitles = approvedPayments
          .map((payment) => bookMap.get(String(payment.book))?.title)
          .filter(Boolean)
          .join(", ");
        return res.status(400).json({
          success: false,
          message: approvedTitles
            ? `You already own: ${approvedTitles}`
            : "You already own one or more selected products"
        });
      }

      const pendingPayments = existingPayments.filter((payment) => payment.status === "pending");
      if (pendingPayments.length) {
        const pendingTitles = pendingPayments
          .map((payment) => bookMap.get(String(payment.book))?.title)
          .filter(Boolean)
          .join(", ");
        return res.status(400).json({
          success: false,
          message: pendingTitles
            ? `These products already have proofs under review: ${pendingTitles}`
            : "Your previous payment proof is still under review"
        });
      }

      const rejectedByBookId = new Map(
        existingPayments
          .filter((payment) => payment.status === "rejected")
          .map((payment) => [String(payment.book), payment])
      );

      const paymentGroupId = createManualPaymentGroupId(req.user.id);
      const screenshotPath = buildPublicUploadPath("payments", req.file.filename);
      const normalizedMethod = normalizePaymentMethod(paymentMethod);
      const payments = [];

      for (const bookId of uniqueBookIds) {
        const book = bookMap.get(String(bookId));
        const existingRejectedPayment = rejectedByBookId.get(String(bookId));
        const internalTransactionId = createInternalManualTransactionId(paymentGroupId, bookId);

        if (existingRejectedPayment) {
          existingRejectedPayment.creator = book.author;
          existingRejectedPayment.amount = Number(book.price || 0);
          existingRejectedPayment.paymentMethod = normalizedMethod;
          existingRejectedPayment.transactionId = internalTransactionId;
          existingRejectedPayment.paymentReference = trimmedTransactionId;
          existingRejectedPayment.paymentGroupId = paymentGroupId;
          existingRejectedPayment.screenshot = screenshotPath;
          existingRejectedPayment.status = "pending";
          existingRejectedPayment.adminNote = "";
          existingRejectedPayment.reviewedAt = null;
          existingRejectedPayment.submissionCount = Number(existingRejectedPayment.submissionCount || 1) + 1;

          await existingRejectedPayment.save();
          payments.push(existingRejectedPayment);
          continue;
        }

        const payment = await Payment.create({
          user: req.user.id,
          book: book._id,
          creator: book.author,
          amount: Number(book.price || 0),
          paymentMethod: normalizedMethod,
          transactionId: internalTransactionId,
          paymentReference: trimmedTransactionId,
          paymentGroupId,
          screenshot: screenshotPath,
          status: "pending"
        });

        payments.push(payment);
      }

      await removeBookFromCart(req.user.id, uniqueBookIds);

      return res.status(201).json({
        success: true,
        message: payments.some((payment) => Number(payment.submissionCount || 1) > 1)
          ? "Payment proof resubmitted for verification"
          : "Payment submitted for verification",
        paymentGroupId,
        paymentReference: trimmedTransactionId,
        count: payments.length,
        payments,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({
          success: false,
          message: "This transaction ID is already linked to another payment"
        });
      }

      console.error("Manual Payment Error:", error.message);
      return res.status(500).json({ success: false, message: "Failed to submit payment" });
    }
  });
});

router.get("/:paymentId/proof", protect, authorize("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.paymentId)) {
      return res.status(400).json({ success: false, message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(req.params.paymentId).select("screenshot");
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (!payment.screenshot || payment.screenshot === "stripe_auto") {
      return res.status(404).json({
        success: false,
        message: "No payment proof is stored for this payment",
      });
    }

    return sendProtectedProofFile(res, payment.screenshot);
  } catch (error) {
    console.error("Get Payment Proof Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/groups/:paymentGroupId/proof", protect, authorize("admin"), async (req, res) => {
  try {
    const paymentGroupId = String(req.params.paymentGroupId || "").trim();
    if (!paymentGroupId) {
      return res.status(400).json({ success: false, message: "Invalid payment group" });
    }

    const payment = await Payment.findOne({
      paymentGroupId,
      status: { $in: ["pending", "approved", "rejected"] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select("screenshot");

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment group not found" });
    }

    if (!payment.screenshot || payment.screenshot === "stripe_auto") {
      return res.status(404).json({
        success: false,
        message: "No payment proof is stored for this payment group",
      });
    }

    return sendProtectedProofFile(res, payment.screenshot);
  } catch (error) {
    console.error("Get Payment Group Proof Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   Admin Payment Review
===================================== */
router.get("/pending", protect, authorize("admin"), async (req, res) => {
  try {
    const payments = await Payment.find({ status: "pending" })
      .sort({ updatedAt: -1 })
      .populate("user", "name email")
      .populate("book", "title price category coverImage")
      .populate("creator", "name email");

    res.json({ success: true, payments });
  } catch (error) {
    console.error("Get Pending Payments Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/groups/:paymentGroupId/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const note = String(req.body?.note || req.body?.adminNote || "").trim();
    const payments = await Payment.find({
      paymentGroupId: req.params.paymentGroupId,
      status: "pending"
    });

    if (!payments.length) {
      return res.status(404).json({ success: false, message: "Payment group not found" });
    }

    const reviewedAt = new Date();
    const bookIds = [];
    for (const payment of payments) {
      payment.status = "approved";
      payment.reviewedAt = reviewedAt;
      payment.adminNote = note || "Approved by admin review";
      await payment.save();
      await applyApprovedPaymentEffects(payment.creator, payment.book, payment.amount, {
        paymentId: payment._id,
        userId: payment.user,
      });
      bookIds.push(String(payment.book));
    }

    await removeBookFromCart(payments[0].user, bookIds);

    return res.json({
      success: true,
      message: `${payments.length} payment item(s) approved`,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error("Approve Payment Group Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/groups/:paymentGroupId/reject", protect, authorize("admin"), async (req, res) => {
  try {
    const note = String(req.body?.note || req.body?.adminNote || "").trim();
    const payments = await Payment.find({
      paymentGroupId: req.params.paymentGroupId,
      status: "pending"
    });

    if (!payments.length) {
      return res.status(404).json({ success: false, message: "Payment group not found" });
    }

    const reviewedAt = new Date();
    for (const payment of payments) {
      payment.status = "rejected";
      payment.reviewedAt = reviewedAt;
      payment.adminNote = note || "Rejected by admin review";
      await payment.save();
    }

    return res.json({
      success: true,
      message: `${payments.length} payment item(s) rejected`,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error("Reject Payment Group Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:paymentId/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const note = String(req.body?.note || req.body?.adminNote || "").trim();
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({ success: false, message: "Payment already processed" });
    }

    payment.status = "approved";
    payment.reviewedAt = new Date();
    payment.adminNote = note || "Approved by admin review";
    await payment.save();

    await applyApprovedPaymentEffects(payment.creator, payment.book, payment.amount, {
      paymentId: payment._id,
      userId: payment.user,
    });
    await removeBookFromCart(payment.user, [String(payment.book)]);

    res.json({ success: true, message: "Payment approved", payment });
  } catch (error) {
    console.error("Approve Payment Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:paymentId/reject", protect, authorize("admin"), async (req, res) => {
  try {
    const note = String(req.body?.note || req.body?.adminNote || "").trim();
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({ success: false, message: "Payment already processed" });
    }

    payment.status = "rejected";
    payment.reviewedAt = new Date();
    payment.adminNote = note || "Rejected by admin review";
    await payment.save();

    res.json({ success: true, message: "Payment rejected", payment });
  } catch (error) {
    console.error("Reject Payment Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   User Purchases
===================================== */
router.get("/my-purchases", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id, status: "approved" })
      .populate("book", "title authorName bookAuthor category subcategory price originalPrice discountPrice filePath coverImage isPaid status isArchived");

    res.json({ success: true, purchases: payments });
  } catch (error) {
    console.error("Get Purchases Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

async function handleStripeWebhook(req, res) {
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  const signature = req.headers["stripe-signature"];

  if (!webhookSecret) {
    return res.status(503).json({
      success: false,
      message: "Stripe webhook secret is not configured"
    });
  }

  if (!signature) {
    return res.status(400).json({
      success: false,
      message: "Stripe signature missing"
    });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe Webhook Signature Error:", error.message);
    return res.status(400).json({ success: false, message: "Invalid Stripe signature" });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await processStripeSession(event.data.object);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe Webhook Processing Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to process Stripe webhook"
    });
  }
}

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;
