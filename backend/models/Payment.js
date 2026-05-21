const mongoose = require("mongoose");
const { getRevenueSplit } = require("../utils/revenue");

const paymentSchema = new mongoose.Schema({

  // 👤 Buyer
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // 📚 Book
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },

  // 👨‍💻 Creator
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // 💰 Total amount paid
  amount: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["UPI", "GPay", "PayPal", "Stripe", "Card", "Other"],
    default: "Other"
  },

  // 💸 Platform earning (auto)
  platformFee: {
    type: Number
  },

  // 💵 Creator earning (auto)
  creatorAmount: {
    type: Number
  },

  // 📸 Payment screenshot
  screenshot: {
    type: String,
    required: true
  },

  // 🔐 Unique transaction id
  transactionId: {
    type: String,
    required: true,
    unique: true
  },

  paymentReference: {
    type: String,
    default: ""
  },

  paymentGroupId: {
    type: String,
    default: ""
  },

  // 📊 Status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  adminNote: {
    type: String,
    default: ""
  },

  reviewedAt: {
    type: Date,
    default: null
  },

  submissionCount: {
    type: Number,
    default: 1
  }

}, {
  timestamps: true
});


/* ============================
   🔥 AUTO CALCULATION
============================ */
paymentSchema.pre("save", function (next) {
  const split = getRevenueSplit(this.amount);
  this.platformFee = split.platformFee;
  this.creatorAmount = split.creatorAmount;

  next();
});


/* ============================
   🔥 PREVENT DUPLICATES
============================ */
paymentSchema.index({ user: 1, book: 1 }, { unique: true });
paymentSchema.index({ paymentGroupId: 1 });


module.exports = mongoose.model("Payment", paymentSchema);
