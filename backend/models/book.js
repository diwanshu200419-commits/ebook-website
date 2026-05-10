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

  type: {
    type: String,
    enum: ["Book", "Notes", "Study", "AI", "Comics", "Other"],
    default: "Book"
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
      "Programming",
      "Business",
      "Design",
      "Finance",
      "Self Growth",
      "Handwritten",
      "Other"
    ],
    default: "Book"
  },

  language: {
    type: String,
    default: "English"
  },

  tags: {
    type: [String],
    default: []
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

  coverAlt: {
    type: String,
    default: ""
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

  views: {
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

  isArchived: {
    type: Boolean,
    default: false
  },

  archivedAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Book", BookSchema);
