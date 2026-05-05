const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Book = require("../models/book");
const Payment = require("../models/Payment");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

/* =====================================
   🔐 AUTH MIDDLEWARE
===================================== */
function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token =
    authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.query.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // should contain id
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* =====================================
   💳 CREATE STRIPE CHECKOUT (SECURE)
===================================== */
router.post("/create-checkout", auth, async (req, res) => {
  try {
    const { bookId } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "Invalid bookId" });
    }

    // Fetch book from DB (never trust client price)
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (!book.price || book.price <= 0) {
      return res.status(400).json({ message: "Invalid book price" });
    }

    // Prevent re-purchase if already approved
    const existing = await Payment.findOne({
      user: req.user.id,
      book: book._id,
      status: "approved"
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already purchased"
      });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: book.title
            },
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

      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel.html`
    });

    return res.json({
      success: true,
      url: session.url
    });

  } catch (err) {
    console.error("Stripe Checkout Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Stripe checkout failed"
    });
  }
});

/* =====================================
   ✅ VERIFY PAYMENT + SAVE DB (IDEMPOTENT)
===================================== */
router.get("/verify-session", auth, async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ message: "Session ID missing" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.json({
        success: false,
        payment: "pending"
      });
    }

    const { bookId, userId, creatorId } = session.metadata;

    // Validate ids
    if (
      !mongoose.Types.ObjectId.isValid(bookId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ message: "Invalid metadata" });
    }

    // Idempotency: avoid duplicates by transactionId
    let payment = await Payment.findOne({
      transactionId: session.id
    });

    if (payment) {
      return res.json({
        success: true,
        message: "Already verified",
        paymentId: payment._id
      });
    }

    // Also block duplicates per (user, book)
    const existing = await Payment.findOne({
      user: userId,
      book: bookId,
      status: "approved"
    });

    if (existing) {
      return res.json({
        success: true,
        message: "Already purchased",
        paymentId: existing._id
      });
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

    return res.json({
      success: true,
      payment: "completed",
      paymentId: payment._id
    });

  } catch (err) {
    console.error("Stripe Verify Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
});

module.exports = router;