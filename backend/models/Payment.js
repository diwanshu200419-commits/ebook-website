const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

  // 👤 buyer
  userId: {
    type: String,
    required: true
  },

  // 📚 book
  bookId: {
    type: String,
    required: true
  },

  // 👨‍💻 creator (IMPORTANT)
  creatorId: {
    type: String,
    required: true
  },

  // 💰 full amount user paid
  amount: {
    type: Number,
    required: true
  },

  // 💸 your platform earning (18%)
  platformFee: {
    type: Number,
    default: 0
  },

  // 💵 creator earning (82%)
  creatorAmount: {
    type: Number,
    default: 0
  },

  // 📸 payment proof
  screenshot: {
    type: String,
    required: true
  },

  // 📊 status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Payment", paymentSchema);