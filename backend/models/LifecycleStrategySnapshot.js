const mongoose = require("mongoose");

const snapshotCampaignSchema = new mongoose.Schema(
  {
    campaignKey: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      default: "",
      trim: true,
    },
    resolutionMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
    },
    activeVariant: {
      type: String,
      default: "default",
      trim: true,
    },
    activeSource: {
      type: String,
      default: "default_fallback",
      trim: true,
    },
    suggestedWinner: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const lifecycleStrategySnapshotSchema = new mongoose.Schema(
  {
    triggerType: {
      type: String,
      enum: ["admin", "cron", "system"],
      default: "admin",
      index: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    windowDays: {
      type: Number,
      default: 90,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    promotedVariants: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    campaigns: {
      type: [snapshotCampaignSchema],
      default: [],
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

lifecycleStrategySnapshotSchema.index({ capturedAt: -1, triggerType: 1 });

module.exports = mongoose.model("LifecycleStrategySnapshot", lifecycleStrategySnapshotSchema);
