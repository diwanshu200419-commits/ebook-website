const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");

const Payment = require("../models/Payment");


// ==============================
// AUTH MIDDLEWARE
// ==============================

function auth(req, res, next) {

  const token =
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}


// ==============================
// FILE UPLOAD (SCREENSHOT)
// ==============================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });


// ==============================
// SUBMIT PAYMENT (QR METHOD)
// ==============================

router.post("/submit", auth, upload.single("screenshot"), async (req, res) => {

  try {

    const { bookId } = req.body;

    if (!bookId || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Missing data"
      });
    }

    const payment = new Payment({
      userId: req.user.id,
      bookId,
      screenshot: req.file.filename,
      status: "pending"
    });

    await payment.save();

    res.json({
      success: true,
      message: "Payment submitted"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }

});


// ==============================
// GET USER PAYMENT STATUS
// ==============================

router.get("/status/:bookId", auth, async (req, res) => {

  try {

    const payment = await Payment.findOne({
      userId: req.user.id,
      bookId: req.params.bookId,
      status: "approved"
    });

    if (payment) {
      return res.json({
        success: true,
        access: true
      });
    }

    res.json({
      success: false,
      access: false
    });

  } catch (err) {

    res.status(500).json({
      success: false
    });

  }

});


// ==============================
// ADMIN APPROVE PAYMENT
// ==============================

router.post("/approve/:id", async (req, res) => {

  try {

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    payment.status = "approved";
    await payment.save();

    res.json({
      success: true,
      message: "Payment approved"
    });

  } catch (err) {

    res.status(500).json({
      success: false
    });

  }

});


module.exports = router;