const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const jwt = require("jsonwebtoken");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

/* =====================================
   AUTH MIDDLEWARE
===================================== */

function auth(req, res, next) {

  const token =
    req.headers.authorization?.split(" ")[1] ||
    req.query.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({
      message: "Invalid token"
    });

  }
}


/* =====================================
   CREATE STRIPE CHECKOUT
===================================== */

router.post("/create-checkout", auth, async (req, res) => {

  try {

    const { title, price, bookId } = req.body;

    // Validate input
    if (!title || !price || !bookId) {
      return res.status(400).json({
        message: "Missing book data"
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({
        message: "Invalid price"
      });
    }

    const session = await stripe.checkout.sessions.create({

      mode: "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: title
            },
            unit_amount: Math.round(price * 100)
          },
          quantity: 1
        }
      ],

      metadata: {
        bookId: String(bookId),
        userId: String(req.user.id)
      },

      success_url:
        `http://127.0.0.1:5501/frontend/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `http://127.0.0.1:5501/frontend/cancel.html`

    });

    return res.json({
      success: true,
      url: session.url
    });

  } catch (err) {

    console.error("Stripe Checkout Error:", err);

    return res.status(500).json({
      success: false,
      message: "Stripe checkout failed"
    });

  }

});


/* =====================================
   VERIFY PAYMENT SESSION
===================================== */

router.get("/verify-session", auth, async (req, res) => {

  try {

    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        message: "Session ID missing"
      });
    }

    const session =
      await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {

      return res.json({
        success: true,
        payment: "completed",
        bookId: session.metadata.bookId,
        userId: session.metadata.userId
      });

    }

    return res.json({
      success: false,
      payment: "pending"
    });

  } catch (err) {

    console.error("Stripe Verify Error:", err);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });

  }

});

module.exports = router;