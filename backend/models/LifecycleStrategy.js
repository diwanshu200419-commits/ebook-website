const mongoose = require("mongoose");

const lifecycleStrategySchema = new mongoose.Schema(
  {
    campaignKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    resolutionMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
      trim: true,
    },
    manualVariant: {
      type: String,
      enum: ["default", "urgency", "social_proof", "value"],
      default: "default",
      trim: true,
    },
    fallbackVariant: {
      type: String,
      enum: ["default", "urgency", "social_proof", "value"],
      default: "default",
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    history: {
      type: [{
        resolutionMode: {
          type: String,
          enum: ["auto", "manual"],
          default: "auto",
        },
        manualVariant: {
          type: String,
          enum: ["default", "urgency", "social_proof", "value"],
          default: "default",
        },
        fallbackVariant: {
          type: String,
          enum: ["default", "urgency", "social_proof", "value"],
          default: "default",
        },
        notes: {
          type: String,
          default: "",
          trim: true,
        },
        reason: {
          type: String,
          default: "",
          trim: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

lifecycleStrategySchema.index({ resolutionMode: 1, updatedAt: -1 });

module.exports = mongoose.model("LifecycleStrategy", lifecycleStrategySchema);
