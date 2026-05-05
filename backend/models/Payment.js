const mongoose = require("mongoose");

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

  // 📊 Status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }

}, {
  timestamps: true
});


/* ============================
   🔥 AUTO CALCULATION
============================ */
paymentSchema.pre("save", function (next) {

  this.platformFee = this.amount * 0.18;
  this.creatorAmount = this.amount * 0.82;

  next();
});


/* ============================
   🔥 PREVENT DUPLICATES
============================ */
paymentSchema.index({ user: 1, book: 1 }, { unique: true });


module.exports = mongoose.model("Payment", paymentSchema);