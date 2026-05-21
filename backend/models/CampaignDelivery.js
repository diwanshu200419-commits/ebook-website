const mongoose = require("mongoose");

const campaignDeliverySchema = new mongoose.Schema(
  {
    notification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    relatedCreators: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }],
      default: [],
    },
    campaignKey: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      type: String,
      default: "default",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    channel: {
      inAppDelivered: {
        type: Boolean,
        default: true,
      },
      emailEligible: {
        type: Boolean,
        default: false,
      },
      emailAttempted: {
        type: Boolean,
        default: false,
      },
      emailDelivered: {
        type: Boolean,
        default: false,
      },
      emailProvider: {
        type: String,
        default: "",
        trim: true,
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    filtersSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

campaignDeliverySchema.index({ campaignKey: 1, sentAt: -1 });
campaignDeliverySchema.index({ campaignKey: 1, variant: 1, sentAt: -1 });
campaignDeliverySchema.index({ user: 1, sentAt: -1 });
campaignDeliverySchema.index({ creator: 1, sentAt: -1 });
campaignDeliverySchema.index({ relatedCreators: 1, sentAt: -1 });

module.exports = mongoose.model("CampaignDelivery", campaignDeliverySchema);
