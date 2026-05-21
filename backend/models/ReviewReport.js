const mongoose = require("mongoose");

const reviewReportSchema = new mongoose.Schema(
  {
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookReview",
      required: true,
      index: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: ["spam", "abuse", "fake", "offensive", "other"],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    actionTaken: {
      type: String,
      enum: ["none", "kept", "removed"],
      default: "none",
    },
    adminNote: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reviewReportSchema.index({ review: 1, reporter: 1 }, { unique: true });
reviewReportSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("ReviewReport", reviewReportSchema);
