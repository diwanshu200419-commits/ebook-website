const Payment = require("../models/Payment");
const ReferralReward = require("../models/ReferralReward");
const User = require("../models/user");
const { createNotification } = require("./notifications");
const { roundMoney } = require("../utils/revenue");

function getFirstPurchaseRewardAmount() {
  const configured = Number(process.env.REFERRAL_FIRST_PURCHASE_REWARD || 50);
  if (!Number.isFinite(configured) || configured < 0) {
    return 50;
  }

  return roundMoney(configured);
}

function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
}

async function grantFirstPurchaseReferralReward({ paymentId, userId }) {
  if (!paymentId || !userId) {
    return null;
  }

  const buyer = await User.findById(userId).select("referredBy isDeleted status");
  if (!buyer || buyer.isDeleted || buyer.status !== "active" || !buyer.referredBy) {
    return null;
  }

  const priorApprovedCount = await Payment.countDocuments({
    user: buyer._id,
    status: "approved",
    _id: { $ne: paymentId },
  });

  if (priorApprovedCount > 0) {
    return null;
  }

  const rewardAmount = getFirstPurchaseRewardAmount();
  if (rewardAmount <= 0) {
    return null;
  }

  const existingReward = await ReferralReward.findOne({
    referredUser: buyer._id,
    triggerType: "first_purchase",
  });

  if (existingReward) {
    return existingReward;
  }

  try {
    const reward = await ReferralReward.create({
      referrer: buyer.referredBy,
      referredUser: buyer._id,
      payment: paymentId,
      amount: rewardAmount,
      triggerType: "first_purchase",
      note: "Reward unlocked from the referral's first approved marketplace purchase.",
    });

    await User.findByIdAndUpdate(buyer.referredBy, {
      $inc: {
        "wallet.totalEarnings": rewardAmount,
        "wallet.availableBalance": rewardAmount,
        "wallet.referralEarnings": rewardAmount,
        "referralStats.rewardedPurchasesCount": 1,
        "referralStats.totalRewardAmount": rewardAmount,
      },
      $set: {
        "referralStats.lastRewardAt": new Date(),
      },
    });

    const [referrer, referredUser] = await Promise.all([
      User.findById(buyer.referredBy).select("name username email notifications status isDeleted referralCode"),
      User.findById(buyer._id).select("name username"),
    ]);

    if (referrer) {
      await createNotification({
        user: referrer,
        type: "success",
        category: "referral",
        title: "Referral reward unlocked",
        message: `${referredUser?.name || referredUser?.username || "Your referral"} completed a first purchase. Rs. ${Number(rewardAmount || 0).toLocaleString("en-IN")} was added to your referral earnings.`,
        link: "dashboard/earning.html",
        email: {
          subject: "Referral reward unlocked",
          body: `${referredUser?.name || referredUser?.username || "Your referral"} completed a first purchase. Rs. ${Number(rewardAmount || 0).toLocaleString("en-IN")} was added to your referral earnings.`,
          ctaLabel: "Open earnings dashboard",
          ctaUrl: "dashboard/earning.html",
          tags: [{ name: "campaign", value: "referral_reward" }],
        },
      }).catch((error) => {
        console.error("Referral Reward Notification Error:", error.message);
      });
    }

    return reward;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return ReferralReward.findOne({
        referredUser: buyer._id,
        triggerType: "first_purchase",
      });
    }

    throw error;
  }
}

module.exports = {
  getFirstPurchaseRewardAmount,
  grantFirstPurchaseReferralReward,
};
