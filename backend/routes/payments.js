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
const {
  ensureUploadDir,
  buildPublicUploadPath,
} = require("../utils/uploads");
const { getRevenueSplit } = require("../utils/revenue");
const { getFrontendBaseUrl, normalizeUrl } = require("../utils/urlConfig");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2023-10-16"
});

const uploadPath = ensureUploadDir("payments");

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

async function applyApprovedPaymentEffects(creatorId, bookId, amount) {
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

  return split;
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

/* =====================================
   Create Stripe Checkout
===================================== */
router.post("/create-checkout", protect, async (req, res) => {
  try {
    const { bookId } = req.body;

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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: book.title },
            unit_amount: Math.round(book.price * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        bookId: book._id.toString(),
        userId: req.user.id.toString(),
        creatorId: book.author.toString()
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error.message);
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

    const lineItems = payableBooks.map((book) => ({
      price_data: {
        currency: "inr",
        product_data: { name: book.title },
        unit_amount: Math.round(Number(book.price || 0) * 100)
      },
      quantity: 1
    }));

    const successUrl = buildFrontendPageUrl("success.html");
    const cancelUrl = buildFrontendPageUrl("cancel.html");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        bookIds: payableBooks.map((book) => String(book._id)).join(","),
        userId: req.user.id.toString()
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe Cart Checkout Error:", error.message);
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

    if (session.payment_status !== "paid") {
      return res.json({ success: false, payment: "pending" });
    }

    const { bookId, userId, creatorId, bookIds } = session.metadata || {};

    if (bookIds) {
      const parsedIds = bookIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      const books = await Book.find({ _id: { $in: parsedIds } });
      const createdPayments = [];

      for (const book of books) {
        const hasPayment = await Payment.findOne({
          user: userId,
          book: book._id,
          status: "approved"
        });

        if (hasPayment) {
          continue;
        }

        const payment = await Payment.create({
          user: userId,
          book: book._id,
          creator: book.author,
          amount: Number(book.price || 0),
          transactionId: `${session.id}:${book._id}`,
          screenshot: "stripe_auto",
          status: "approved"
        });

        await applyApprovedPaymentEffects(book.author, book._id, Number(book.price || 0));
        createdPayments.push(payment);
      }

      await removeBookFromCart(userId, parsedIds);

      return res.json({
        success: true,
        payment: "completed",
        created: createdPayments.length
      });
    }

    let payment = await Payment.findOne({ transactionId: session.id });
    if (payment) {
      return res.json({ success: true, message: "Already verified", paymentId: payment._id });
    }

    const existing = await Payment.findOne({
      user: userId,
      book: bookId,
      status: "approved"
    });

    if (existing) {
      return res.json({ success: true, message: "Already purchased", paymentId: existing._id });
    }

    payment = await Payment.create({
      user: userId,
      book: bookId,
      creator: creatorId,
      amount: Number(session.amount_total || 0) / 100,
      transactionId: session.id,
      screenshot: "stripe_auto",
      status: "approved"
    });

    await applyApprovedPaymentEffects(creatorId, bookId, payment.amount);
    await removeBookFromCart(userId, [bookId]);

    return res.json({ success: true, payment: "completed", paymentId: payment._id });
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
      const { bookId, paymentMethod, transactionId } = req.body;

      if (!bookId || !paymentMethod || !transactionId || !req.file) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ success: false, message: "Invalid bookId" });
      }

      const book = await Book.findById(bookId);
      if (!book || book.isArchived || book.status !== "Approved") {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      const existing = await Payment.findOne({ user: req.user.id, book: bookId });
      if (existing) {
        return res.status(400).json({ success: false, message: "Payment already submitted" });
      }

      const payment = await Payment.create({
        user: req.user.id,
        book: bookId,
        creator: book.author,
        amount: Number(book.price || 0),
        transactionId: transactionId.trim(),
        screenshot: buildPublicUploadPath("payments", req.file.filename),
        status: "pending"
      });

      return res.status(201).json({
        success: true,
        message: "Payment submitted for verification",
        payment
      });
    } catch (error) {
      console.error("Manual Payment Error:", error.message);
      return res.status(500).json({ success: false, message: "Failed to submit payment" });
    }
  });
});

/* =====================================
   Admin Payment Review
===================================== */
router.get("/pending", protect, authorize("admin"), async (req, res) => {
  try {
    const payments = await Payment.find({ status: "pending" })
      .populate("user", "name email")
      .populate("book", "title price")
      .populate("creator", "name email");

    res.json({ success: true, payments });
  } catch (error) {
    console.error("Get Pending Payments Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:paymentId/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({ success: false, message: "Payment already processed" });
    }

    payment.status = "approved";
    await payment.save();

    await applyApprovedPaymentEffects(payment.creator, payment.book, payment.amount);
    await removeBookFromCart(payment.user, [String(payment.book)]);

    res.json({ success: true, message: "Payment approved", payment });
  } catch (error) {
    console.error("Approve Payment Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:paymentId/reject", protect, authorize("admin"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({ success: false, message: "Payment already processed" });
    }

    payment.status = "rejected";
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
      .populate("book", "title authorName category price filePath coverImage isPaid status isArchived");

    res.json({ success: true, purchases: payments });
  } catch (error) {
    console.error("Get Purchases Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
