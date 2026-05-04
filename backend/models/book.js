const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    authorName: {
      type: String,
      required: true,
      trim: true,
    },

    // 👤 CREATOR (USE THIS)
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["Book", "Notes", "Comics", "AI"],
      default: "Book",
    },

    category: {
      type: String,
      default: "General",
      trim: true,
    },

    language: {
      type: String,
      default: "English",
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    filePath: {
      type: String,
      required: true,
    },

    previewPath: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    isPaid: {
      type: Boolean,
      default: false,
    },

    requiresLogin: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "AI_Review",
        "Admin_Review",
        "Changes_Requested",
        "Approved",
        "Rejected",
      ],
      default: "AI_Review",
    },

    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },

    aiScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    downloads: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 💰 SALES DATA
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    earnings: {
      type: Number,
      default: 0,
      min: 0,
    },

    platformRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Book || mongoose.model("Book", BookSchema);