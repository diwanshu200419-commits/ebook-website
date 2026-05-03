// models/WithdrawRequest.js

const mongoose = require("mongoose");

const WithdrawRequestSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 100
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "paid"],
    default: "pending"
  },

  method: {
    type: String,
    default: "bank"
  },

  accountDetails: {
    type: Object,
    default: {}
  },

  requestedAt: {
    type: Date,
    default: Date.now
  },

  processedAt: {
    type: Date
  },

  adminNote: {
    type: String
  }

});

module.exports = mongoose.model("WithdrawRequest", WithdrawRequestSchema);
