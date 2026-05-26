const jwt = require("jsonwebtoken");

const Book = require("../../models/book");
const BookAI = require("../../models/BookAI");
const Payment = require("../../models/Payment");
const User = require("../../models/user");
const { serializeBook } = require("../bookData");
const {
  cosineSimilarity,
  lexicalSimilarity,
  clamp,
  normalizeWhitespace,
} = require("./text");
const {
  getEmbeddingDimensions,
  getEmbeddingModel,
  getOpenAIClient,
  hasOpenAI,
  hasOllamaEmbeddings,
} = require("./client");
const { createOllamaEmbedding } = require("./ollama");

function getSortConfig(sort) {
  switch (String(sort || "").toLowerCase()) {
    case "oldest":
      return { createdAt: 1 };
    case "newest":
      return { publishedAt: -1, createdAt: -1, price: -1 };
    case "price-low":
      return { price: 1, createdAt: -1 };
    case "price-high":
      return { price: -1, createdAt: -1 };
    case "title":
      return { title: 1 };
    case "trending":
      return { publishedAt: -1, createdAt: -1, price: -1, salesCount: -1, views: -1, downloads: -1, aiScore: -1 };
    default:
      return { publishedAt: -1, createdAt: -1, price: -1 };
  }
}

function applyExplicitSort(entries, sort) {
  const normalized = String(sort || "").toLowerCase();
  const list = [...entries];
  const newestFirst = (left, right) => {
    const leftDate = new Date(left.book.publishedAt || left.book.createdAt || 0).getTime();
    const rightDate = new Date(right.book.publishedAt || right.book.createdAt || 0).getTime();
    return rightDate - leftDate || Number(right.book.price || 0) - Number(left.book.price || 0);
  };

  switch (normalized) {
    case "oldest":
      return list.sort((left, right) => new Date(left.book.createdAt) - new Date(right.book.createdAt));
    case "newest":
      return list.sort(newestFirst);
    case "price-low":
      return list.sort((left, right) => Number(left.book.price || 0) - Number(right.book.price || 0));
    case "price-high":
      return list.sort((left, right) => Number(right.book.price || 0) - Number(left.book.price || 0));
    case "title":
      return list.sort((left, right) => String(left.book.title || "").localeCompare(String(right.book.title || "")));
    case "trending":
      return list.sort((left, right) => {
        const freshness = newestFirst(left, right);
        if (freshness !== 0) {
          return freshness;
        }

        const leftTrend = Number(left.book.salesCount || 0) * 4 + Number(left.book.views || 0) + Number(left.book.downloads || 0) * 2;
        const rightTrend = Number(right.book.salesCount || 0) * 4 + Number(right.book.views || 0) + Number(right.book.downloads || 0) * 2;
        return rightTrend - leftTrend || right.score - left.score;
      });
    default:
      return list.sort((left, right) => right.score - left.score);
  }
}

async function buildQueryEmbedding(query) {
  const input = normalizeWhitespace(query).slice(0, 3000);
  if (!input) {
    return [];
  }

  if (hasOpenAI()) {
    try {
      const client = getOpenAIClient();
      const response = await client.embeddings.create({
        model: getEmbeddingModel(),
        input,
        dimensions: getEmbeddingDimensions(),
      });

      return Array.isArray(response.data?.[0]?.embedding) ? response.data[0].embedding : [];
    } catch (error) {
      console.error("AI query embedding error:", error.message);
      return [];
    }
  }

  if (hasOllamaEmbeddings()) {
    try {
      return await createOllamaEmbedding(input, getEmbeddingDimensions());
    } catch (error) {
      console.error("Ollama query embedding error:", error.message);
      return [];
    }
  }

  return [];
}

function buildSearchText(book, aiDoc) {
  return normalizeWhitespace([
    book.title,
    book.authorName,
    book.description,
    book.category,
    book.subcategory,
    Array.isArray(book.tags) ? book.tags.join(", ") : "",
    aiDoc?.suggestedCategory || "",
    Array.isArray(aiDoc?.generatedTags) ? aiDoc.generatedTags.join(", ") : "",
    aiDoc?.generatedDescription || "",
    aiDoc?.extractedTextPreview || "",
  ].filter(Boolean).join("\n\n"));
}

async function getCategoryCounts() {
  const categoryCounts = await Book.aggregate([
    { $match: { status: "Approved", isArchived: { $ne: true } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return categoryCounts.map((entry) => ({
    name: entry._id || "Other",
    count: entry.count,
  }));
}

function normalizeMarketplaceLanguage(value, fallback = "All") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return fallback;
  }

  const lower = normalized.toLowerCase();
  if (lower === "all") {
    return "All";
  }
  if (lower === "english") {
    return "English";
  }
  if (lower === "hindi") {
    return "Hindi";
  }

  return fallback;
}

function buildApprovedBookFilter({ category = "", language = "All" }) {
  const filter = {
    status: "Approved",
    isArchived: { $ne: true },
  };

  if (category) {
    filter.category = category;
  }

  if (language && language !== "All") {
    filter.language = language;
  }

  return filter;
}

function buildRecommendationReason({
  followedCreator = false,
  sameLanguage = false,
  sameCategory = false,
  tagOverlap = 0,
}) {
  if (followedCreator && sameLanguage) {
    return "From a creator you follow in your preferred language";
  }
  if (followedCreator) {
    return "Fresh drop from a creator you follow";
  }
  if (sameCategory && tagOverlap > 0) {
    return "Matches your recent category and topic interests";
  }
  if (sameCategory && sameLanguage) {
    return "Strong category match in your preferred language";
  }
  if (tagOverlap > 0) {
    return "Similar to the skills and topics you explored recently";
  }
  if (sameLanguage) {
    return "Popular pick in your preferred language";
  }
  return "Trending across the creator marketplace";
}

async function searchApprovedBooks({
  backendBaseUrl = "",
  page = 1,
  limit = 12,
  category = "",
  search = "",
  sort = "",
  language = "",
  userId = "",
}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 60);
  const safeCategory = String(category || "").trim();
  const safeSearch = String(search || "").trim();
  const viewer = userId ? await User.findById(userId).select("preferences following") : null;
  const effectiveLanguage = normalizeMarketplaceLanguage(
    language || viewer?.preferences?.marketplaceLanguage || "All"
  );
  const followedCreatorIds = new Set(
    (Array.isArray(viewer?.following) ? viewer.following : [])
      .map((entry) => String(entry || ""))
      .filter(Boolean)
  );

  if (!safeSearch) {
    const filter = buildApprovedBookFilter({
      category: safeCategory,
      language: effectiveLanguage,
    });

    const skip = (safePage - 1) * safeLimit;
    const [books, total, categories] = await Promise.all([
      Book.find(filter)
        .populate("author", "name username")
        .sort(getSortConfig(sort))
        .skip(skip)
        .limit(safeLimit),
      Book.countDocuments(filter),
      getCategoryCounts(),
    ]);

    const payload = books
      .map((book) => ({
        ...serializeBook(book, {
          backendBaseUrl,
          includeFilePath: false,
          previewUrl: book.previewPath ? `/api/books/${book._id}/preview` : "",
        }),
        recommendationReason: followedCreatorIds.has(String(book.author?._id || book.author))
          ? "From a creator you follow"
          : "",
      }));

    const normalizedSort = String(sort || "").toLowerCase();
    if (!["price-low", "price-high", "title", "oldest"].includes(normalizedSort)) {
      payload.sort((left, right) => {
        const leftFollowed = followedCreatorIds.has(String(left.authorId || ""));
        const rightFollowed = followedCreatorIds.has(String(right.authorId || ""));
        return Number(rightFollowed) - Number(leftFollowed);
      });
    }

    return {
      page: safePage,
      limit: safeLimit,
      total,
      pages: total ? Math.ceil(total / safeLimit) : 0,
      books: payload,
      filters: { categories },
      summary: {
        totalApprovedBooks: total,
        totalCategories: categories.length,
        totalFreeBooks: payload.filter((book) => Number(book.price || 0) <= 0).length,
        totalPaidBooks: payload.filter((book) => Number(book.price || 0) > 0).length,
        appliedLanguage: effectiveLanguage,
      },
    };
  }

  const filter = buildApprovedBookFilter({
    category: safeCategory,
    language: effectiveLanguage,
  });

  const books = await Book.find(filter).populate("author", "name username");
  const aiDocs = await BookAI.find({ book: { $in: books.map((book) => book._id) } })
    .select("+embedding book extractedTextPreview generatedDescription suggestedCategory generatedTags")
    .lean();
  const aiByBook = new Map(aiDocs.map((entry) => [String(entry.book), entry]));
  const queryEmbedding = await buildQueryEmbedding(safeSearch);

  const ranked = books
    .map((book) => {
      const aiDoc = aiByBook.get(String(book._id));
      const searchText = buildSearchText(book, aiDoc);
      const titleText = normalizeWhitespace(book.title || "").toLowerCase();
      const queryText = safeSearch.toLowerCase();
      const lexical = lexicalSimilarity(safeSearch, searchText);
      const titleBoost = titleText.includes(queryText) ? 0.24 : 0;
      const categoryBoost = String(book.category || "").toLowerCase().includes(queryText) ? 0.15 : 0;
      const followsBoost = followedCreatorIds.has(String(book.author?._id || book.author)) ? 0.16 : 0;
      const languageBoost = effectiveLanguage !== "All"
        && String(book.language || "").toLowerCase() === effectiveLanguage.toLowerCase()
        ? 0.1
        : 0;
      const semantic = queryEmbedding.length && Array.isArray(aiDoc?.embedding) && aiDoc.embedding.length
        ? clamp((cosineSimilarity(queryEmbedding, aiDoc.embedding) + 1) / 2, 0, 1)
        : 0;
      const popularity = clamp(
        (Number(book.salesCount || 0) * 0.08) + (Number(book.views || 0) * 0.004) + (Number(book.aiScore || 0) * 0.003),
        0,
        0.2
      );
      const score = clamp(
        (lexical * 0.55)
          + (semantic * 0.25)
          + titleBoost
          + categoryBoost
          + popularity
          + followsBoost
          + languageBoost,
        0,
        1.5
      );

      return {
        book,
        aiDoc,
        score,
      };
    })
    .filter((entry) => entry.score >= 0.08)
    .sort((left, right) => right.score - left.score);

  const sorted = applyExplicitSort(ranked, sort || "relevance");
  const total = sorted.length;
  const start = (safePage - 1) * safeLimit;
  const paged = sorted.slice(start, start + safeLimit);
  const categories = await getCategoryCounts();
  const payload = paged.map(({ book, score }) => ({
    ...serializeBook(book, {
      backendBaseUrl,
      includeFilePath: false,
      previewUrl: book.previewPath ? `/api/books/${book._id}/preview` : "",
    }),
    relevanceScore: Number(score.toFixed(3)),
  }));

  return {
    page: safePage,
    limit: safeLimit,
    total,
    pages: total ? Math.ceil(total / safeLimit) : 0,
    books: payload,
    filters: { categories },
    summary: {
      totalApprovedBooks: total,
      totalCategories: categories.length,
      totalFreeBooks: payload.filter((book) => Number(book.price || 0) <= 0).length,
      totalPaidBooks: payload.filter((book) => Number(book.price || 0) > 0).length,
      appliedLanguage: effectiveLanguage,
    },
  };
}

async function getRecommendedBooks({
  backendBaseUrl = "",
  bookId = "",
  userId = "",
  limit = 6,
}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 12);
  const viewer = userId ? await User.findById(userId).select("preferences following") : null;
  const preferredLanguage = normalizeMarketplaceLanguage(
    viewer?.preferences?.marketplaceLanguage || "All"
  );
  const followedCreatorIds = new Set(
    (Array.isArray(viewer?.following) ? viewer.following : [])
      .map((entry) => String(entry || ""))
      .filter(Boolean)
  );
  const approvedBooks = await Book.find({
    status: "Approved",
    isArchived: { $ne: true },
  }).populate("author", "name username");

  if (!approvedBooks.length) {
    return [];
  }

  const aiDocs = await BookAI.find({ book: { $in: approvedBooks.map((book) => book._id) } })
    .select("+embedding book suggestedCategory generatedTags extractedTextPreview generatedDescription")
    .lean();
  const aiByBook = new Map(aiDocs.map((entry) => [String(entry.book), entry]));

  let anchorBook = null;
  let anchorAi = null;
  let purchasedIds = new Set();
  let profileTags = [];
  let profileCategory = "";

  if (bookId) {
    anchorBook = approvedBooks.find((book) => String(book._id) === String(bookId)) || null;
    anchorAi = anchorBook ? aiByBook.get(String(anchorBook._id)) : null;
    profileCategory = anchorAi?.suggestedCategory || anchorBook?.category || "";
    profileTags = [
      ...(anchorBook?.tags || []),
      ...(anchorAi?.generatedTags || []),
    ];
  } else if (userId) {
    const payments = await Payment.find({ user: userId, status: "approved" })
      .populate("book", "category tags")
      .sort({ createdAt: -1 })
      .limit(12);

    purchasedIds = new Set(payments.map((payment) => String(payment.book?._id || payment.book)));
    const recentBook = payments.find((payment) => payment.book);
    profileCategory = recentBook?.book?.category || "";
    profileTags = payments.flatMap((payment) => payment.book?.tags || []);
  }

  const anchorEmbedding = anchorAi?.embedding || [];
  const tagSet = new Set(profileTags.map((tag) => String(tag || "").toLowerCase()).filter(Boolean));

  const ranked = approvedBooks
    .filter((book) => !bookId || String(book._id) !== String(bookId))
    .filter((book) => !purchasedIds.has(String(book._id)))
    .map((book) => {
      const aiDoc = aiByBook.get(String(book._id));
      const candidateTags = new Set([
        ...(book.tags || []).map((tag) => String(tag || "").toLowerCase()),
        ...((aiDoc?.generatedTags || []).map((tag) => String(tag || "").toLowerCase())),
      ]);
      const tagOverlap = [...candidateTags].reduce((sum, tag) => sum + (tagSet.has(tag) ? 1 : 0), 0);
      const sameCategory = profileCategory
        && (String(book.category || "").toLowerCase() === String(profileCategory).toLowerCase()
          || String(aiDoc?.suggestedCategory || "").toLowerCase() === String(profileCategory).toLowerCase());
      const followedCreator = followedCreatorIds.has(String(book.author?._id || book.author));
      const sameLanguage = preferredLanguage !== "All"
        && String(book.language || "").toLowerCase() === preferredLanguage.toLowerCase();
      const semantic = anchorEmbedding.length && Array.isArray(aiDoc?.embedding) && aiDoc.embedding.length
        ? clamp((cosineSimilarity(anchorEmbedding, aiDoc.embedding) + 1) / 2, 0, 1)
        : 0;
      const trend = clamp(
        (Number(book.salesCount || 0) * 0.1) + (Number(book.views || 0) * 0.005) + (Number(book.aiScore || 0) * 0.004),
        0,
        0.35
      );
      const score = clamp(
        (sameCategory ? 0.35 : 0)
          + Math.min(tagOverlap * 0.12, 0.36)
          + (semantic * 0.22)
          + (followedCreator ? 0.28 : 0)
          + (sameLanguage ? 0.14 : 0)
          + trend,
        0,
        1.5
      );

      return {
        book,
        score,
        reason: buildRecommendationReason({
          followedCreator,
          sameLanguage,
          sameCategory,
          tagOverlap,
        }),
      };
    })
    .sort((left, right) => right.score - left.score);

  const picks = (ranked.some((entry) => entry.score > 0) ? ranked : ranked.sort((left, right) => {
    const leftTrend = Number(left.book.salesCount || 0) + Number(left.book.views || 0);
    const rightTrend = Number(right.book.salesCount || 0) + Number(right.book.views || 0);
    return rightTrend - leftTrend;
  }))
    .slice(0, safeLimit)
    .map(({ book, score, reason }) => ({
      ...serializeBook(book, {
        backendBaseUrl,
        includeFilePath: false,
        previewUrl: book.previewPath ? `/api/books/${book._id}/preview` : "",
      }),
      recommendationScore: Number(score.toFixed(3)),
      recommendationReason: reason,
    }));

  return picks;
}

async function getOptionalUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  let token = "";

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (typeof req.query?.token === "string" && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.status === "blocked" || user.isDeleted) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

module.exports = {
  getOptionalUserFromRequest,
  getRecommendedBooks,
  searchApprovedBooks,
};
