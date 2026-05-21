const User = require("../models/user");

function normalizeReferralCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);
}

function isCreatorRoleValue(role = "") {
  return ["creator", "author", "admin"].includes(String(role || "").trim().toLowerCase());
}

async function findReferrerByCode(code = "") {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return null;
  }

  return User.findOne({
    referralCode: normalizedCode,
    isDeleted: { $ne: true },
    status: "active",
  });
}

async function applyReferralSignup(referrerId, options = {}) {
  if (!referrerId) {
    return null;
  }

  const countCreator = Boolean(options.countCreator);
  return User.findByIdAndUpdate(
    referrerId,
    {
      $inc: {
        "referralStats.signupsCount": 1,
        "referralStats.creatorsCount": countCreator ? 1 : 0,
      },
      $set: {
        "referralStats.lastSignupAt": new Date(),
      },
    },
    { new: true }
  );
}

async function applyReferralCreatorActivation(userOrId) {
  const user = typeof userOrId === "object" && userOrId
    ? userOrId
    : await User.findById(userOrId).select("referredBy");

  if (!user?.referredBy) {
    return null;
  }

  return User.findByIdAndUpdate(
    user.referredBy,
    {
      $inc: {
        "referralStats.creatorsCount": 1,
      },
      $set: {
        "referralStats.lastSignupAt": new Date(),
      },
    },
    { new: true }
  );
}

module.exports = {
  applyReferralCreatorActivation,
  applyReferralSignup,
  findReferrerByCode,
  isCreatorRoleValue,
  normalizeReferralCode,
};
