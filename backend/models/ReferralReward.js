const mongoose = require("mongoose");

const referralRewardSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    triggerType: {
      type: String,
      enum: ["first_purchase"],
      default: "first_purchase",
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

referralRewardSchema.index({ referredUser: 1, triggerType: 1 }, { unique: true });
referralRewardSchema.index({ referrer: 1, createdAt: -1 });

module.exports = mongoose.model("ReferralReward", referralRewardSchema);
