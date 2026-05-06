const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
    trim: true
  },

  authorName: {
    type: String,
    required: true
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  category: {
    type: String,
    enum: [
      "Book",
      "Notes",
      "Study",
      "AI",
      "Comics",
      "Education",
      "Technology",
      "Self Help",
      "Fiction",
      "Competitive",
      "Other"
    ],
    default: "Book"
  },

  description: {
    type: String
  },

  price: {
    type: Number,
    default: 0
  },

  /* =====================
     📂 FILE SYSTEM (UPDATED)
  ===================== */

  filePath: {
    type: String,
    required: true   // FULL PDF (keep existing logic)
  },

  previewPath: {
    type: String,    // 👈 NEW (preview PDF)
    default: ""
  },

  coverImage: {
    type: String
  },

  isPaid: {
    type: Boolean,
    default: false   // 👈 NEW
  },

  /* =====================
     🔐 ACCESS CONTROL
  ===================== */

  requiresLogin: {
    type: Boolean,
    default: true
  },

  /* =====================
     STATUS SYSTEM
  ===================== */

  status: {
    type: String,
    enum: [
      "AI_Review",
      "Admin_Review",
      "Approved",
      "Rejected"
    ],
    default: "AI_Review"
  },

  aiScore: {
    type: Number,
    default: 0
  },

  aiStatus: {
    type: String,
    enum: ["approved", "pending", "rejected"],
    default: "pending"
  },

  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  aiSuggestion: {
    type: String,
    default: ""
  },

  /* =====================
     💰 EARNING SYSTEM
  ===================== */

  downloads: {
    type: Number,
    default: 0
  },

  salesCount: {
    type: Number,
    default: 0
  },

  earnings: {
    type: Number,
    default: 0
  },

  platformRevenue: {
    type: Number,
    default: 0
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Book", BookSchema);