const mongoose = require("mongoose");

const User = require("../models/user");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const { createNotification } = require("./notifications");
const { buildAbsoluteUrl, serializeBook } = require("./bookData");
const { buildSignedBookAccessUrls } = require("./bookAccess");
const { roundMoney } = require("../utils/revenue");

function isCreatorRole(role) {
  return ["creator", "author", "admin"].includes(String(role || "").toLowerCase());
}

function normalizeUrlValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

function normalizeTextList(value, limit = 8) {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )].slice(0, limit);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return normalizeTextList(parsed, limit);
    }
  } catch {
    // Fall back to comma-separated parsing.
  }

  return normalizeTextList(
    trimmed.split(","),
    limit
  );
}

function buildCategoryBreakdown(books) {
  return books.reduce((accumulator, book) => {
    const key = String(book.category || "Other");
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function buildCategoryRevenue(books) {
  return books.reduce((accumulator, book) => {
    const key = String(book.category || "Other");
    accumulator[key] = roundMoney(Number(accumulator[key] || 0) + Number(book.earnings || 0));
    return accumulator;
  }, {});
}

function buildPopularCategories(categoryBreakdown) {
  return Object.entries(categoryBreakdown)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));
}

function buildMonthlySeries(entries, valueSelector, months = 6, dateSelector) {
  const labels = [];
  const values = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let index = months - 1; index >= 0; index -= 1) {
    const bucketDate = new Date();
    bucketDate.setDate(1);
    bucketDate.setHours(0, 0, 0, 0);
    bucketDate.setMonth(bucketDate.getMonth() - index);

    const month = bucketDate.getMonth();
    const year = bucketDate.getFullYear();

    const total = entries.reduce((sum, entry) => {
      const sourceDate = new Date(
        typeof dateSelector === "function"
          ? dateSelector(entry)
          : entry?.createdAt
      );

      if (Number.isNaN(sourceDate.getTime())) {
        return sum;
      }

      if (sourceDate.getMonth() === month && sourceDate.getFullYear() === year) {
        return sum + Number(valueSelector(entry) || 0);
      }

      return sum;
    }, 0);

    labels.push(monthNames[month]);
    values.push(roundMoney(total));
  }

  return { labels, values };
}

function buildCreatorRankScore({ totalSales, totalViews, totalEarnings, followersCount }) {
  return Math.min(
    100,
    Math.round(
      Number(totalSales || 0) * 5
      + Number(totalViews || 0) * 0.05
      + Number(totalEarnings || 0) / 150
      + Number(followersCount || 0) * 1.5
    )
  );
}

function buildCreatorTrustProfile({
  verified,
  role,
  followersCount,
  totalBooks,
  totalSales,
  totalEarnings,
  ratingAverage,
  ratingCount,
}) {
  const safeFollowersCount = Number(followersCount || 0);
  const safeTotalBooks = Number(totalBooks || 0);
  const safeTotalSales = Number(totalSales || 0);
  const safeTotalEarnings = Number(totalEarnings || 0);
  const safeRatingAverage = Number(ratingAverage || 0);
  const safeRatingCount = Number(ratingCount || 0);

  if (!isCreatorRole(role)) {
    return {
      badge: "Member",
      trustLevel: "member",
      trustReason: "Marketplace member exploring creator products.",
    };
  }

  if (verified && safeTotalSales >= 25 && safeRatingCount >= 8 && safeRatingAverage >= 4.6) {
    return {
      badge: "Verified Mentor",
      trustLevel: "elite",
      trustReason: `Verified creator with ${safeRatingCount} learner reviews and ${safeTotalSales} completed sales.`,
    };
  }

  if (safeTotalSales >= 10 && safeRatingCount >= 5 && safeRatingAverage >= 4.4) {
    return {
      badge: "Top Seller",
      trustLevel: "trusted",
      trustReason: `Top-performing creator with ${safeTotalSales} sales and a ${safeRatingAverage.toFixed(1)}/5 rating.`,
    };
  }

  if (verified) {
    return {
      badge: "Verified Creator",
      trustLevel: "verified",
      trustReason: "Identity verified and catalog approved by the platform.",
    };
  }

  if (safeFollowersCount >= 50 || safeTotalEarnings >= 10000 || safeTotalSales >= 5) {
    return {
      badge: "Rising Creator",
      trustLevel: "rising",
      trustReason: `Growing marketplace traction with ${safeFollowersCount} followers and real revenue momentum.`,
    };
  }

  if (safeTotalBooks >= 2) {
    return {
      badge: "Emerging Creator",
      trustLevel: "emerging",
      trustReason: `Publishing consistently with ${safeTotalBooks} live products in the marketplace.`,
    };
  }

  return {
    badge: "New Creator",
    trustLevel: "new",
    trustReason: "Early-stage creator building their first digital income stream.",
  };
}

function buildFollowPreview(user, backendBaseUrl = "") {
  return {
    id: user?._id || null,
    name: user?.name || "Member",
    username: user?.username || "",
    role: user?.role || "reader",
    verified: Boolean(user?.verified),
    bio: String(user?.bio || "").trim(),
    avatar: user?.profileImage || "/assets/default-avatar.png",
    avatarUrl: user?.profileImage
      ? buildAbsoluteUrl(backendBaseUrl, user.profileImage)
      : "/assets/default-avatar.png",
  };
}

function buildCreatorIdentity(user, backendBaseUrl = "", stats = {}) {
  const safeStats = stats && typeof stats === "object" ? stats : {};
  const followersCount = Number(
    safeStats.followersCount
      ?? (Array.isArray(user?.followers)
        ? user.followers.length
        : Number(user?.creatorStats?.followersCount || 0))
  );
  const followingCount = Number(
    safeStats.followingCount
      ?? (Array.isArray(user?.following)
        ? user.following.length
        : Number(user?.creatorStats?.followingCount || 0))
  );
  const totalBooks = Number(
    safeStats.totalBooks ?? Number(user?.creatorStats?.totalBooks || 0)
  );
  const totalSales = Number(
    safeStats.totalSales ?? Number(user?.creatorStats?.totalSales || 0)
  );
  const totalEarnings = Number(
    safeStats.totalEarnings ?? Number(user?.creatorStats?.totalEarnings || 0)
  );
  const ratingAverage = Number(
    safeStats.ratingAverage ?? Number(user?.creatorStats?.ratingAverage || 0)
  );
  const ratingCount = Number(
    safeStats.ratingCount ?? Number(user?.creatorStats?.ratingCount || 0)
  );
  const trustProfile = buildCreatorTrustProfile({
    verified: Boolean(user?.verified),
    role: user?.role,
    followersCount,
    totalBooks,
    totalSales,
    totalEarnings,
    ratingAverage,
    ratingCount,
  });

  return {
    id: user?._id || null,
    name: user?.name || "Creator",
    username: user?.username || "",
    role: user?.role || "reader",
    verified: Boolean(user?.verified),
    badge: trustProfile.badge,
    trustLevel: trustProfile.trustLevel,
    trustReason: trustProfile.trustReason,
    bio: String(user?.bio || "").trim(),
    about: String(user?.about || user?.bio || "").trim(),
    avatar: user?.profileImage || "/assets/default-avatar.png",
    avatarUrl: user?.profileImage
      ? buildAbsoluteUrl(backendBaseUrl, user.profileImage)
      : "/assets/default-avatar.png",
    bannerImage: user?.bannerImage || "",
    bannerUrl: user?.bannerImage
      ? buildAbsoluteUrl(backendBaseUrl, user.bannerImage)
      : "",
    website: normalizeUrlValue(user?.website),
    socialLinks: {
      twitter: normalizeUrlValue(user?.socialLinks?.twitter),
      instagram: normalizeUrlValue(user?.socialLinks?.instagram),
      linkedin: normalizeUrlValue(user?.socialLinks?.linkedin),
      youtube: normalizeUrlValue(user?.socialLinks?.youtube),
    },
    creatorCategories: normalizeTextList(user?.creatorCategories || []),
    specialties: normalizeTextList(user?.specialties || []),
    joinedAt: user?.createdAt || null,
    followersCount,
    followingCount,
    ratingAverage,
    ratingCount,
  };
}

function normalizeCreatorCollectionAccess(access = {}, book = null) {
  const hasPreview = Boolean(book?.previewPath);
  return {
    canPreview: Boolean(access.canPreview || hasPreview),
    canDownload: Boolean(access.canDownload),
    isOwner: Boolean(access.isOwner),
    isAdmin: Boolean(access.isAdmin),
    isPurchased: Boolean(access.isPurchased),
  };
}

function buildCreatorCollections(books, backendBaseUrl = "", access = {}) {
  const serialized = books.map((book) =>
    {
      const safeAccess = normalizeCreatorCollectionAccess(access, book);
      const accessUrls = buildSignedBookAccessUrls(book, safeAccess);

      return serializeBook(book, {
        backendBaseUrl,
        includeFilePath: false,
        previewUrl: safeAccess.canPreview && book.previewPath
          ? `/api/books/${book._id}/preview`
          : "",
        downloadUrl: safeAccess.canDownload
          ? `/api/books/${book._id}/download`
          : "",
        previewAccessUrl: accessUrls.previewAccessUrl,
        downloadAccessUrl: accessUrls.downloadAccessUrl,
        access: safeAccess,
      });
    }
  );

  const trending = [...serialized]
    .sort((left, right) => {
      const rightScore = Number(right.salesCount || 0) * 5 + Number(right.views || 0) + Number(right.downloads || 0) * 2;
      const leftScore = Number(left.salesCount || 0) * 5 + Number(left.views || 0) + Number(left.downloads || 0) * 2;
      return rightScore - leftScore || new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    })
    .slice(0, 6);

  return {
    all: serialized,
    trending,
    free: serialized.filter((book) => Number(book.price || 0) <= 0),
    paid: serialized.filter((book) => Number(book.price || 0) > 0),
  };
}

function buildCreatorAnalytics(user, books, approvedPayments) {
  const followersCount = Array.isArray(user?.followers) ? user.followers.length : Number(user?.creatorStats?.followersCount || 0);
  const followingCount = Array.isArray(user?.following) ? user.following.length : Number(user?.creatorStats?.followingCount || 0);
  const totalBooks = books.length;
  const totalSales = books.reduce((sum, book) => sum + Number(book.salesCount || 0), 0);
  const totalDownloads = books.reduce((sum, book) => sum + Number(book.downloads || 0), 0);
  const totalViews = books.reduce((sum, book) => sum + Number(book.views || 0), 0);
  const totalEarnings = roundMoney(books.reduce((sum, book) => sum + Number(book.earnings || 0), 0));
  const categoryBreakdown = buildCategoryBreakdown(books);
  const categoryRevenue = buildCategoryRevenue(books);
  const monthlyRevenue = buildMonthlySeries(approvedPayments, (payment) => payment.creatorAmount || 0);
  const monthlySales = buildMonthlySeries(approvedPayments, () => 1);

  return {
    followersCount,
    followingCount,
    totalBooks,
    totalSales,
    totalDownloads,
    totalViews,
    totalEarnings,
    ratingAverage: Number(user?.creatorStats?.ratingAverage || 0),
    ratingCount: Number(user?.creatorStats?.ratingCount || 0),
    creatorScore: buildCreatorRankScore({
      totalSales,
      totalViews,
      totalEarnings,
      followersCount,
    }),
    categoryBreakdown,
    categoryRevenue,
    popularCategories: buildPopularCategories(categoryBreakdown),
    monthlyRevenue,
    monthlySales,
  };
}

async function refreshCreatorStats(userOrId) {
  const user = typeof userOrId === "object" && userOrId
    ? userOrId
    : await User.findById(userOrId);

  if (!user) {
    return null;
  }

  const [books, approvedPayments] = await Promise.all([
    Book.find({
      author: user._id,
      status: "Approved",
      isArchived: { $ne: true },
    }),
    Payment.find({
      creator: user._id,
      status: "approved",
    }),
  ]);

  const analytics = buildCreatorAnalytics(user, books, approvedPayments);

  user.creatorStats = {
    ...user.creatorStats,
    followersCount: analytics.followersCount,
    followingCount: analytics.followingCount,
    totalBooks: analytics.totalBooks,
    totalSales: analytics.totalSales,
    totalDownloads: analytics.totalDownloads,
    totalViews: analytics.totalViews,
    totalEarnings: analytics.totalEarnings,
    ratingAverage: analytics.ratingAverage,
    ratingCount: analytics.ratingCount,
    updatedAt: new Date(),
  };

  user.metrics = {
    ...user.metrics,
    totalBooks: analytics.totalBooks,
    totalDownloads: analytics.totalDownloads,
    rankScore: analytics.creatorScore,
  };

  await user.save({ validateBeforeSave: false });

  return analytics;
}

async function buildPublicCreatorProfile({
  username,
  viewerId = "",
  backendBaseUrl = "",
}) {
  const creator = await User.findOne({
    username: String(username || "").trim().toLowerCase(),
    isDeleted: { $ne: true },
  })
    .populate("followers", "name username role verified bio profileImage")
    .populate("following", "name username role verified bio profileImage");

  if (!creator) {
    return null;
  }

  const [books, approvedPayments, analytics] = await Promise.all([
    Book.find({
      author: creator._id,
      status: "Approved",
      isArchived: { $ne: true },
    })
      .populate("author", "name username")
      .sort({ publishedAt: -1, createdAt: -1 }),
    Payment.find({
      creator: creator._id,
      status: "approved",
    }).sort({ createdAt: -1 }),
    refreshCreatorStats(creator),
  ]);

  const creatorIdentity = buildCreatorIdentity(creator, backendBaseUrl, analytics);
  const safeViewerId = String(viewerId || "");
  const isSelf = safeViewerId && safeViewerId === String(creator._id);
  const collections = buildCreatorCollections(books, backendBaseUrl, {
    canPreview: true,
    canDownload: Boolean(isSelf),
    isOwner: Boolean(isSelf),
    isAdmin: false,
    isPurchased: false,
  });
  const followers = Array.isArray(creator.followers) ? creator.followers : [];
  const following = Array.isArray(creator.following) ? creator.following : [];
  const isFollowing = safeViewerId
    ? followers.some((follower) => String(follower?._id || follower) === safeViewerId)
    : false;

  return {
    creator: {
      ...creatorIdentity,
      stats: analytics,
    },
    books: collections,
    analytics,
    relationship: {
      isSelf,
      isFollowing,
      canFollow: Boolean(safeViewerId) && !isSelf,
    },
    followers: followers.map((user) => buildFollowPreview(user, backendBaseUrl)),
    following: following.map((user) => buildFollowPreview(user, backendBaseUrl)),
  };
}

async function buildTrendingCreators(backendBaseUrl = "", limit = 6) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 18);

  const [creators, bookStats] = await Promise.all([
    User.find({
      role: { $in: ["creator", "author"] },
      isDeleted: { $ne: true },
      status: "active",
    }).select("name username bio profileImage bannerImage verified role followers following creatorStats"),
    Book.aggregate([
      {
        $match: {
          status: "Approved",
          isArchived: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$author",
          totalBooks: { $sum: 1 },
          totalSales: { $sum: "$salesCount" },
          totalDownloads: { $sum: "$downloads" },
          totalViews: { $sum: "$views" },
          totalEarnings: { $sum: "$earnings" },
        },
      },
    ]),
  ]);

  const statsByUser = new Map(
    bookStats.map((entry) => [String(entry._id), entry])
  );

  return creators
    .map((creator) => {
      const bookStat = statsByUser.get(String(creator._id)) || {};
      const followersCount = Array.isArray(creator.followers) ? creator.followers.length : Number(creator.creatorStats?.followersCount || 0);
      const followingCount = Array.isArray(creator.following) ? creator.following.length : Number(creator.creatorStats?.followingCount || 0);
      const totalBooks = Number(bookStat.totalBooks || 0);
      const totalSales = Number(bookStat.totalSales || 0);
      const totalDownloads = Number(bookStat.totalDownloads || 0);
      const totalViews = Number(bookStat.totalViews || 0);
      const totalEarnings = roundMoney(bookStat.totalEarnings || 0);
      const ratingAverage = Number(creator.creatorStats?.ratingAverage || 0);
      const ratingCount = Number(creator.creatorStats?.ratingCount || 0);
      const creatorScore = buildCreatorRankScore({
        totalSales,
        totalViews,
        totalEarnings,
        followersCount,
      });

      return {
        ...buildCreatorIdentity(creator, backendBaseUrl, {
          followersCount,
          followingCount,
          totalBooks,
          totalSales,
          totalDownloads,
          totalViews,
          totalEarnings,
          ratingAverage,
          ratingCount,
        }),
        stats: {
          followersCount,
          followingCount,
          totalBooks,
          totalSales,
          totalDownloads,
          totalViews,
          totalEarnings,
          ratingAverage,
          ratingCount,
          creatorScore,
        },
      };
    })
    .filter((creator) => creator.stats.totalBooks > 0)
    .sort((left, right) => {
      const rightScore = Number(right.stats.creatorScore || 0) + Number(right.stats.followersCount || 0);
      const leftScore = Number(left.stats.creatorScore || 0) + Number(left.stats.followersCount || 0);
      return rightScore - leftScore || String(left.name || "").localeCompare(String(right.name || ""));
    })
    .slice(0, safeLimit);
}

async function followCreator({ viewerId, creatorId }) {
  if (!viewerId || !creatorId) {
    throw new Error("Viewer and creator are required.");
  }

  if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(creatorId)) {
    throw new Error("Invalid follow target.");
  }

  if (String(viewerId) === String(creatorId)) {
    throw new Error("You cannot follow your own profile.");
  }

  const [viewer, creator] = await Promise.all([
    User.findById(viewerId),
    User.findById(creatorId),
  ]);

  if (!viewer || viewer.isDeleted || viewer.status === "blocked") {
    throw new Error("Viewer account is not available.");
  }

  if (!creator || creator.isDeleted || creator.status === "blocked") {
    throw new Error("Creator profile was not found.");
  }

  const viewerFollowing = Array.isArray(viewer.following) ? viewer.following : [];
  const alreadyFollowing = viewerFollowing.some((id) => String(id) === String(creatorId));

  if (alreadyFollowing) {
    await Promise.all([
      User.findByIdAndUpdate(viewerId, { $pull: { following: creator._id } }),
      User.findByIdAndUpdate(creatorId, { $pull: { followers: viewer._id } }),
    ]);
  } else {
    await Promise.all([
      User.findByIdAndUpdate(viewerId, { $addToSet: { following: creator._id } }),
      User.findByIdAndUpdate(creatorId, { $addToSet: { followers: viewer._id } }),
    ]);
  }

  const [updatedViewer, updatedCreator] = await Promise.all([
    User.findById(viewerId),
    User.findById(creatorId),
  ]);

  if (updatedViewer) {
    updatedViewer.creatorStats = {
      ...updatedViewer.creatorStats,
      followingCount: Array.isArray(updatedViewer.following) ? updatedViewer.following.length : 0,
      updatedAt: new Date(),
    };
    await updatedViewer.save({ validateBeforeSave: false });
  }

  if (updatedCreator) {
    updatedCreator.creatorStats = {
      ...updatedCreator.creatorStats,
      followersCount: Array.isArray(updatedCreator.followers) ? updatedCreator.followers.length : 0,
      updatedAt: new Date(),
    };
    await updatedCreator.save({ validateBeforeSave: false });
  }

  if (!alreadyFollowing && updatedCreator && viewer) {
    await createNotification({
      user: updatedCreator,
      type: "success",
      category: "follow",
      preferenceKey: "follows",
      title: "New follower on your creator profile",
      message: `${viewer.name || viewer.username || "A learner"} just followed your creator page.`,
      link: updatedCreator.username
        ? `creator/creator.html?username=${encodeURIComponent(updatedCreator.username)}`
        : "dashboard/setting.html",
      email: {
        subject: "You have a new follower",
        body: `${viewer.name || viewer.username || "A learner"} just followed your creator page. Keep the momentum going with a fresh product or update.`,
        ctaLabel: "Open creator profile",
        ctaUrl: updatedCreator.username
          ? `creator/creator.html?username=${encodeURIComponent(updatedCreator.username)}`
          : "dashboard/setting.html",
        tags: [{ name: "campaign", value: "new_follower" }],
      },
    }).catch((error) => {
      console.error("Follow notification error:", error.message);
    });
  }

  return {
    following: !alreadyFollowing,
    followersCount: Array.isArray(updatedCreator?.followers) ? updatedCreator.followers.length : 0,
    followingCount: Array.isArray(updatedViewer?.following) ? updatedViewer.following.length : 0,
  };
}

module.exports = {
  buildCreatorAnalytics,
  buildCreatorCollections,
  buildCreatorIdentity,
  buildFollowPreview,
  buildPublicCreatorProfile,
  buildTrendingCreators,
  followCreator,
  isCreatorRole,
  normalizeTextList,
  normalizeUrlValue,
  refreshCreatorStats,
};
