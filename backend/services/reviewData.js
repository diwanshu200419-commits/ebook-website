const Book = require("../models/book");
const BookReview = require("../models/BookReview");
const User = require("../models/user");
const { buildAbsoluteUrl } = require("./bookData");
const { refreshCreatorStats } = require("./creatorData");

function roundRating(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function serializeBookReview(review, backendBaseUrl = "") {
  const raw = review && typeof review.toObject === "function"
    ? review.toObject()
    : review || {};
  const reviewer =
    raw.reviewer && typeof raw.reviewer === "object" ? raw.reviewer : null;

  return {
    id: raw._id || null,
    _id: raw._id || null,
    book: raw.book || null,
    creator: raw.creator || null,
    rating: Number(raw.rating || 0),
    title: raw.title || "",
    comment: raw.comment || "",
    verifiedPurchase: Boolean(raw.verifiedPurchase),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    reviewer: {
      id: reviewer?._id || raw.reviewer || null,
      name: reviewer?.name || "Marketplace reader",
      username: reviewer?.username || "",
      verified: Boolean(reviewer?.verified),
      avatar: reviewer?.profileImage || "/assets/default-avatar.png",
      avatarUrl: reviewer?.profileImage
        ? buildAbsoluteUrl(backendBaseUrl, reviewer.profileImage)
        : "/assets/default-avatar.png",
    },
  };
}

async function aggregateRatings(match) {
  const [result] = await BookReview.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        ratingAverage: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  return {
    ratingAverage: roundRating(result?.ratingAverage || 0),
    ratingCount: Number(result?.ratingCount || 0),
  };
}

async function syncBookAndCreatorRatings(bookOrId) {
  const book = typeof bookOrId === "object" && bookOrId
    ? bookOrId
    : await Book.findById(bookOrId).select("_id author");

  if (!book?._id) {
    return null;
  }

  const bookStats = await aggregateRatings({ book: book._id });

  await Book.findByIdAndUpdate(book._id, {
    $set: {
      ratingAverage: bookStats.ratingAverage,
      ratingCount: bookStats.ratingCount,
    },
  });

  let creatorStats = null;
  if (book.author) {
    creatorStats = await aggregateRatings({ creator: book.author });

    await User.findByIdAndUpdate(book.author, {
      $set: {
        "creatorStats.ratingAverage": creatorStats.ratingAverage,
        "creatorStats.ratingCount": creatorStats.ratingCount,
        "creatorStats.updatedAt": new Date(),
      },
    });

    await refreshCreatorStats(book.author);
  }

  return {
    bookStats,
    creatorStats,
  };
}

module.exports = {
  serializeBookReview,
  syncBookAndCreatorRatings,
};
