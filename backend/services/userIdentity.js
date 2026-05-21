const User = require("../models/user");

function buildUsernameBase(value = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return normalized || "member";
}

async function generateUniqueUsername(seedValue = "", excludeUserId = "") {
  const base = buildUsernameBase(seedValue);
  let candidate = base;
  let suffix = 1;

  while (
    await User.findOne({
      username: candidate,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    }).select("_id")
  ) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function ensureUserUsername(user) {
  if (!user) {
    return user;
  }

  const currentUsername = String(user.username || "").trim().toLowerCase();
  if (currentUsername) {
    user.username = currentUsername;
    return user;
  }

  const fallbackSeed = user.name || String(user.email || "").split("@")[0] || "member";
  user.username = await generateUniqueUsername(fallbackSeed, String(user._id || user.id || ""));
  await user.save({ validateBeforeSave: false });
  return user;
}

module.exports = {
  ensureUserUsername,
  generateUniqueUsername,
};
