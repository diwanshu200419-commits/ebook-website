const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["info", "success", "warning", "error"],
    default: "info"
  },
  category: {
    type: String,
    enum: ["general", "sale", "follow", "release", "streak", "nudge", "purchase", "cart", "referral"],
    default: "general"
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Notification", NotificationSchema);
