const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/auth");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const User = require("../models/user");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2023-10-16"
});

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, "../uploads/payments");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"), false);
    }
    cb(null, true);
  }
});

/* =====================================
   💳 CREATE STRIPE CHECKOUT (SECURE)
===================================== */
router.post("/create-checkout", protect, async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "Invalid bookId" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (!book.price || book.price <= 0) {
      return res.status(400).json({ message: "Invalid book price" });
    }

    const existing = await Payment.findOne({ user: req.user.id, book: book._id, status: "approved" });
    if (existing) {
      return res.status(200).json({ success: true, message: "Already purchased" });
    }

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
      success_url: `${(process.env.CLIENT_URL || process.env.FRONTEND_URL)}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${(process.env.CLIENT_URL || process.env.FRONTEND_URL)}/cancel.html`
    });

    return res.json({ success: true, url: session.url });

  } catch (err) {
    console.error("Stripe Checkout Error:", err.message);
    return res.status(500).json({ success: false, message: "Stripe checkout failed" });
  }
});

/* =====================================
   ✅ VERIFY STRIPE PAYMENT
===================================== */
router.get("/verify-session", protect, async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ message: "Session ID missing" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.json({ success: false, payment: "pending" });
    }

    const { bookId, userId, creatorId } = session.metadata;

    let payment = await Payment.findOne({ transactionId: session.id });
    if (payment) {
      return res.json({ success: true, message: "Already verified", paymentId: payment._id });
    }

    const existing = await Payment.findOne({ user: userId, book: bookId, status: "approved" });
    if (existing) {
      return res.json({ success: true, message: "Already purchased", paymentId: existing._id });
    }

    const amount = session.amount_total / 100;
    payment = await Payment.create({
      user: userId,
      book: bookId,
      creator: creatorId,
      amount,
      transactionId: session.id,
      screenshot: "stripe_auto",
      status: "approved"
    });

    await updateCreatorEarnings(creatorId, amount * 0.82);
    await Book.findByIdAndUpdate(bookId, { $inc: { salesCount: 1, earnings: amount * 0.82, platformRevenue: amount * 0.18 } });

    return res.json({ success: true, payment: "completed", paymentId: payment._id });

  } catch (err) {
    console.error("Stripe Verify Error:", err.message);
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});

/* =====================================
   📸 MANUAL PAYMENT (UPI/GPay/PayPal)
===================================== */
router.post("/manual", protect, upload.single("screenshot"), async (req, res) => {
  try {
    const { bookId, paymentMethod, transactionId } = req.body;

    if (!bookId || !paymentMethod || !transactionId || !req.file) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid bookId" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
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
      amount: book.price,
      transactionId,
      screenshot: `/uploads/payments/${req.file.filename}`,
      status: "pending"
    });

    return res.status(201).json({ success: true, message: "Payment submitted for verification", payment });

  } catch (err) {
    console.error("Manual Payment Error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to submit payment" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: GET ALL PENDING PAYMENTS
===================================== */
router.get("/pending", protect, authorize("admin"), async (req, res) => {
  try {
    const payments = await Payment.find({ status: "pending" })
      .populate("user", "name email")
      .populate("book", "title price")
      .populate("creator", "name email");

    res.json({ success: true, payments });
  } catch (err) {
    console.error("Get Pending Payments Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: APPROVE PAYMENT
===================================== */
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

    await updateCreatorEarnings(payment.creator, payment.amount * 0.82);
    await Book.findByIdAndUpdate(payment.book, { $inc: { salesCount: 1, earnings: payment.amount * 0.82, platformRevenue: payment.amount * 0.18 } });

    res.json({ success: true, message: "Payment approved", payment });
  } catch (err) {
    console.error("Approve Payment Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🧑‍💼 ADMIN: REJECT PAYMENT
===================================== */
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
  } catch (err) {
    console.error("Reject Payment Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   📊 GET USER'S PURCHASES
===================================== */
router.get("/my-purchases", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id, status: "approved" })
      .populate("book", "title authorName price filePath coverImage");

    res.json({ success: true, purchases: payments });
  } catch (err) {
    console.error("Get Purchases Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   Helper: Update Creator Earnings
===================================== */
async function updateCreatorEarnings(creatorId, amount) {
  await User.findByIdAndUpdate(creatorId, {
    $inc: {
      "wallet.totalEarnings": amount,
      "wallet.availableBalance": amount
    }
  });
}

module.exports = router;
