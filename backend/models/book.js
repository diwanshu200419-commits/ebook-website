const mongoose = require("mongoose");
const { PRODUCT_TYPES } = require("../utils/productTypes");

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

  bookAuthor: {
    type: String,
    default: ""
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  type: {
    type: String,
    enum: PRODUCT_TYPES,
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
      "Horror",
      "Literature",
      "Language Learning",
      "Other"
    ],
    default: "Book"
  },

  subcategory: {
    type: String,
    default: ""
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

  originalPrice: {
    type: Number,
    default: 0
  },

  discountPrice: {
    type: Number,
    default: 0
  },

  previewPages: {
    type: Number,
    default: 5
  },

  pageCount: {
    type: Number,
    default: 0
  },

  isPremium: {
    type: Boolean,
    default: false
  },

  catalogKey: {
    type: String,
    default: ""
  },

  /* =====================
     📂 FILE SYSTEM (UPDATED)
  ===================== */

  filePath: {
    type: String,
    default: ""
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

  delivery: {
    mode: {
      type: String,
      enum: ["file", "text", "link", "mixed"],
      default: "file"
    },
    fileName: {
      type: String,
      default: ""
    },
    fileMimeType: {
      type: String,
      default: ""
    },
    fileSize: {
      type: Number,
      default: 0
    },
    textContent: {
      type: String,
      default: ""
    },
    previewText: {
      type: String,
      default: ""
    },
    externalUrl: {
      type: String,
      default: ""
    },
    instructions: {
      type: String,
      default: ""
    },
    includedItems: {
      type: [String],
      default: []
    }
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

  moderationReason: {
    type: String,
    default: ""
  },

  aiCategory: {
    type: String,
    default: ""
  },

  aiTags: {
    type: [String],
    default: []
  },

  aiProcessingState: {
    type: String,
    enum: ["idle", "queued", "processing", "completed", "failed"],
    default: "idle"
  },

  aiReviewedAt: {
    type: Date,
    default: null
  },

  adminNotes: {
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

  ratingAverage: {
    type: Number,
    default: 0
  },

  ratingCount: {
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

  publishedAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Book", BookSchema);
