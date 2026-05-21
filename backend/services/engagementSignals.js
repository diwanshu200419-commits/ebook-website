const User = require("../models/user");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const { createNotification } = require("./notifications");

const INDIA_TIMEZONE = "Asia/Kolkata";
const READER_NUDGE_GAP_DAYS = 7;
const CREATOR_NUDGE_GAP_DAYS = 10;
const STREAK_REWARD_MILESTONES = [
  { days: 3, points: 15 },
  { days: 7, points: 40 },
  { days: 14, points: 90 },
  { days: 30, points: 220 },
];

function isCreatorRole(role) {
  return ["creator", "author", "admin"].includes(String(role || "").toLowerCase());
}

function getIndiaDateParts(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(value));
  const year = Number(parts.find((part) => part.type === "year")?.value || 0);
  const month = Number(parts.find((part) => part.type === "month")?.value || 0);
  const day = Number(parts.find((part) => part.type === "day")?.value || 0);

  return { year, month, day };
}

function getIndiaDayNumber(value) {
  if (!value) {
    return null;
  }

  const { year, month, day } = getIndiaDateParts(value);
  if (!year || !month || !day) {
    return null;
  }

  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function diffIndiaDays(left, right) {
  const leftNumber = getIndiaDayNumber(left);
  const rightNumber = getIndiaDayNumber(right);

  if (leftNumber === null || rightNumber === null) {
    return null;
  }

  return leftNumber - rightNumber;
}

function pluralize(value, singular, plural) {
  const safeValue = Number(value || 0);
  return safeValue === 1 ? singular : plural;
}

function getLatestRewardMilestone(streakCount) {
  return STREAK_REWARD_MILESTONES
    .filter((milestone) => Number(streakCount || 0) >= milestone.days)
    .sort((left, right) => right.days - left.days)[0] || null;
}

async function syncUserEngagement(userOrId) {
  const user = userOrId && typeof userOrId === "object" && userOrId._id
    ? userOrId
    : await User.findById(userOrId).select("name email role status isDeleted notifications engagement followers creatorStats createdAt updatedAt");

  if (!user) {
    return null;
  }

  const now = new Date();
  const lastActiveAt = user.engagement?.lastActiveAt || null;
  const dayDelta = lastActiveAt ? diffIndiaDays(now, lastActiveAt) : null;
  const safeCurrentStreak = Math.max(Number(user.engagement?.streakCount || 0), 0);

  let nextStreak = safeCurrentStreak;
  let streakAdvanced = false;

  if (dayDelta === 0) {
    nextStreak = safeCurrentStreak || 1;
  } else if (dayDelta === 1) {
    nextStreak = Math.max(safeCurrentStreak, 1) + 1;
    streakAdvanced = true;
  } else {
    nextStreak = 1;
    streakAdvanced = true;
  }

  user.engagement = {
    ...(user.engagement || {}),
    streakCount: nextStreak,
    bestStreakCount: Math.max(Number(user.engagement?.bestStreakCount || 0), nextStreak),
    rewardPoints: Number(user.engagement?.rewardPoints || 0),
    lifetimeRewardPoints: Number(user.engagement?.lifetimeRewardPoints || 0),
    lastRewardMilestone: Number(user.engagement?.lastRewardMilestone || 0),
    lastActiveAt: now,
    lastStreakNotificationAt: user.engagement?.lastStreakNotificationAt || null,
    lastReaderNudgeAt: user.engagement?.lastReaderNudgeAt || null,
    lastCreatorNudgeAt: user.engagement?.lastCreatorNudgeAt || null,
    lastDigestEmailAt: user.engagement?.lastDigestEmailAt || null,
    lastComebackEmailAt: user.engagement?.lastComebackEmailAt || null,
  };

  let rewardUnlocked = null;
  const latestRewardMilestone = getLatestRewardMilestone(nextStreak);
  if (
    latestRewardMilestone
    && streakAdvanced
    && latestRewardMilestone.days > Number(user.engagement.lastRewardMilestone || 0)
  ) {
    user.engagement.rewardPoints += latestRewardMilestone.points;
    user.engagement.lifetimeRewardPoints += latestRewardMilestone.points;
    user.engagement.lastRewardMilestone = latestRewardMilestone.days;
    rewardUnlocked = latestRewardMilestone;
  }

  const shouldNotifyStreak = streakAdvanced
    && nextStreak >= 2
    && diffIndiaDays(now, user.engagement.lastStreakNotificationAt) !== 0;

  if (shouldNotifyStreak) {
    await createNotification({
      user,
      type: "success",
      category: "streak",
      title: `Your ${nextStreak}-day streak is live`,
      message: isCreatorRole(user.role)
        ? rewardUnlocked
          ? `Consistency compounds in creator marketplaces. You also unlocked ${rewardUnlocked.points} momentum points for hitting ${rewardUnlocked.days} days.`
          : "Consistency compounds in creator marketplaces. Ship, review, or explore today to keep momentum alive."
        : rewardUnlocked
          ? `You unlocked ${rewardUnlocked.points} momentum points for hitting ${rewardUnlocked.days} days. Explore one more high-signal product today to keep the streak going.`
          : "You are building marketplace momentum. Explore one more high-signal product today to keep the streak going.",
      link: isCreatorRole(user.role) ? "dashboard/upload.html" : "explore.html",
      email: rewardUnlocked
        ? {
          subject: `You unlocked ${rewardUnlocked.points} momentum points`,
          ctaLabel: isCreatorRole(user.role) ? "Open creator hub" : "Explore marketplace",
          ctaUrl: isCreatorRole(user.role) ? "dashboard/upload.html" : "explore.html",
          body: isCreatorRole(user.role)
            ? `Your ${nextStreak}-day creator streak just unlocked ${rewardUnlocked.points} momentum points. Keep shipping to turn consistency into discovery and revenue.`
            : `Your ${nextStreak}-day marketplace streak just unlocked ${rewardUnlocked.points} momentum points. Keep exploring and buying to strengthen your feed.`,
          tags: [
            { name: "campaign", value: "streak_reward" },
            { name: "milestone", value: String(rewardUnlocked.days) },
          ],
        }
        : null,
    }).catch((error) => {
      console.error("Streak notification error:", error.message);
    });

    user.engagement.lastStreakNotificationAt = now;
  }

  await user.save({ validateBeforeSave: false });
  return user;
}

async function maybeCreateReaderNudge(user) {
  const now = new Date();
  const cooldownDays = diffIndiaDays(now, user.engagement?.lastReaderNudgeAt);
  if (cooldownDays !== null && cooldownDays < READER_NUDGE_GAP_DAYS) {
    return null;
  }

  const latestPayment = await Payment.findOne({
    user: user._id,
    status: "approved",
  })
    .sort({ createdAt: -1 })
    .populate("book", "title category");

  if (!latestPayment) {
    return null;
  }

  const daysSincePurchase = diffIndiaDays(now, latestPayment.createdAt);
  if (daysSincePurchase === null || daysSincePurchase < READER_NUDGE_GAP_DAYS) {
    return null;
  }

  const bookTitle = latestPayment.book?.title || "your last product";
  const category = latestPayment.book?.category || "creator";
  const message = `Your last unlock was ${bookTitle}. Explore fresh ${category} products to keep your learning and earning rhythm moving.`;

  await createNotification({
    user,
    type: "info",
    category: "nudge",
    title: "Your momentum is ready for the next unlock",
    message,
    link: "explore.html",
    email: {
      subject: "New products are ready for your next unlock",
      ctaLabel: "Browse marketplace",
      ctaUrl: "explore.html",
      body: message,
      tags: [{ name: "campaign", value: "reader_nudge" }],
    },
  }).catch((error) => {
    console.error("Reader nudge notification error:", error.message);
  });

  user.engagement.lastReaderNudgeAt = now;
  await user.save({ validateBeforeSave: false });

  return {
    title: "Your momentum is ready for the next unlock",
    body: message,
    actionLabel: "Browse marketplace",
    actionLink: "explore.html",
  };
}

async function maybeCreateCreatorNudge(user) {
  const now = new Date();
  const cooldownDays = diffIndiaDays(now, user.engagement?.lastCreatorNudgeAt);
  if (cooldownDays !== null && cooldownDays < CREATOR_NUDGE_GAP_DAYS) {
    return null;
  }

  const followersCount = Array.isArray(user.followers)
    ? user.followers.length
    : Number(user.creatorStats?.followersCount || 0);
  const totalSales = Number(user.creatorStats?.totalSales || 0);
  if (followersCount <= 0 && totalSales <= 0) {
    return null;
  }

  const latestBook = await Book.findOne({
    author: user._id,
    status: "approved",
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select("title type createdAt updatedAt");

  const latestActivity = latestBook?.updatedAt || latestBook?.createdAt || user.updatedAt || user.createdAt;
  const daysSinceLaunch = diffIndiaDays(now, latestActivity);
  if (daysSinceLaunch === null || daysSinceLaunch < CREATOR_NUDGE_GAP_DAYS) {
    return null;
  }

  const followersLabel = `${followersCount} ${pluralize(followersCount, "follower", "followers")}`;
  const productType = latestBook?.type || "digital product";
  const message = `${followersLabel} and your existing catalog can benefit from a fresh drop. Publish a new ${productType} this week to stay visible in the feed.`;

  await createNotification({
    user,
    type: "info",
    category: "nudge",
    title: "Your audience is waiting for the next drop",
    message,
    link: "dashboard/upload.html",
    email: {
      subject: "Your creator audience is ready for a fresh drop",
      ctaLabel: "Launch a new drop",
      ctaUrl: "dashboard/upload.html",
      body: message,
      tags: [{ name: "campaign", value: "creator_nudge" }],
    },
  }).catch((error) => {
    console.error("Creator nudge notification error:", error.message);
  });

  user.engagement.lastCreatorNudgeAt = now;
  await user.save({ validateBeforeSave: false });

  return {
    title: "Your audience is waiting for the next drop",
    body: message,
    actionLabel: "Launch a new drop",
    actionLink: "dashboard/upload.html",
  };
}

function buildEngagementSummary(user, override = null) {
  const streakCount = Number(user.engagement?.streakCount || 0);
  const bestStreakCount = Number(user.engagement?.bestStreakCount || 0);
  const rewardPoints = Number(user.engagement?.rewardPoints || 0);
  const lifetimeRewardPoints = Number(user.engagement?.lifetimeRewardPoints || 0);
  const creatorRole = isCreatorRole(user.role);
  const followersCount = Array.isArray(user.followers)
    ? user.followers.length
    : Number(user.creatorStats?.followersCount || 0);
  const totalBooks = Number(user.creatorStats?.totalBooks || 0);

  if (override) {
    return {
      streakCount,
      bestStreakCount,
      rewardPoints,
      lifetimeRewardPoints,
      headline: override.title,
      body: override.body,
      actionLabel: override.actionLabel,
      actionLink: override.actionLink,
    };
  }

  if (creatorRole) {
    if (streakCount >= 7) {
      return {
        streakCount,
        bestStreakCount,
        rewardPoints,
        lifetimeRewardPoints,
        headline: `${streakCount}-day creator streak`,
        body: `Consistency is compounding. Your best streak is ${bestStreakCount} days, and you have ${rewardPoints} momentum points to show for it.`,
        actionLabel: "Open creator hub",
        actionLink: "dashboard/upload.html",
      };
    }

    if (followersCount > 0) {
      return {
        streakCount,
        bestStreakCount,
        rewardPoints,
        lifetimeRewardPoints,
        headline: `${followersCount} follower${followersCount === 1 ? "" : "s"} watching your next move`,
        body: totalBooks > 0
          ? "New releases trigger follow notifications and keep your storefront active in discovery."
          : "Publish your first live product and turn follower interest into creator momentum.",
        actionLabel: "Publish a product",
        actionLink: "dashboard/upload.html",
      };
    }

    return {
      streakCount,
      bestStreakCount,
      rewardPoints,
      lifetimeRewardPoints,
      headline: "Creator momentum starts with consistency",
      body: "Regular uploads improve discovery, repeat purchases, and trust signals across the marketplace.",
      actionLabel: "Launch your next product",
      actionLink: "dashboard/upload.html",
    };
  }

  if (streakCount >= 7) {
    return {
      streakCount,
      bestStreakCount,
      rewardPoints,
      lifetimeRewardPoints,
      headline: `${streakCount}-day learning streak`,
      body: `You are building repeat marketplace habits. Keep exploring practical products and grow beyond your current ${rewardPoints} momentum points.`,
      actionLabel: "Browse new drops",
      actionLink: "explore.html",
    };
  }

  if (streakCount >= 2) {
    return {
      streakCount,
      bestStreakCount,
      rewardPoints,
      lifetimeRewardPoints,
      headline: `${streakCount}-day marketplace streak`,
      body: "Small daily actions compound. Keep browsing, buying, or reviewing to strengthen your feed and creator recommendations.",
      actionLabel: "Explore products",
      actionLink: "explore.html",
    };
  }

  return {
    streakCount,
    bestStreakCount,
    rewardPoints,
    lifetimeRewardPoints,
    headline: "Your next unlock shapes the feed",
    body: "Browse a few live products and the marketplace will keep improving recommendations around your learning goals.",
    actionLabel: "Open marketplace",
    actionLink: "explore.html",
  };
}

async function ensureRetentionSignals(userId) {
  const syncedUser = await syncUserEngagement(userId);
  if (!syncedUser) {
    return null;
  }

  let override = null;
  if (isCreatorRole(syncedUser.role)) {
    override = await maybeCreateCreatorNudge(syncedUser);
  } else {
    override = await maybeCreateReaderNudge(syncedUser);
  }

  return buildEngagementSummary(syncedUser, override);
}

module.exports = {
  syncUserEngagement,
  ensureRetentionSignals,
  buildEngagementSummary,
};
