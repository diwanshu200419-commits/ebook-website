const DEFAULT_COVER = "/assets/covers/Ebook_AI.png";

function normalizeClientPath(value = "") {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  if (/^https?:\/\//i.test(source) || /^data:/i.test(source)) {
    return source;
  }

  if (/^(assets|uploads)\//i.test(source)) {
    return `/${source.replace(/^\/+/, "")}`;
  }

  return source;
}

function buildAbsoluteUrl(baseUrl, relativePath) {
  const normalizedBase = String(baseUrl || "").replace(/\/$/, "");
  const normalizedPath = normalizeClientPath(relativePath);

  if (
    !normalizedPath
    || /^https?:\/\//i.test(normalizedPath)
    || /^data:/i.test(normalizedPath)
  ) {
    return normalizedPath;
  }

  // Frontend-bundled assets should stay on the frontend origin.
  if (normalizedPath.startsWith("/assets/")) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
}

function serializeBook(book, options = {}) {
  const {
    backendBaseUrl = "",
    previewUrl = "",
    downloadUrl = "",
    includeFilePath = true,
    statusLabel = "",
  } = options;

  const raw = book && typeof book.toObject === "function"
    ? book.toObject()
    : book;

  const author =
    raw && raw.author && typeof raw.author === "object" ? raw.author : null;
  const normalizedCoverImage = normalizeClientPath(raw?.coverImage || DEFAULT_COVER);
  const normalizedPreviewPath = normalizeClientPath(previewUrl || raw?.previewPath || "");
  const normalizedFilePath = normalizeClientPath(raw?.filePath || "");

  return {
    id: raw?._id,
    _id: raw?._id,
    title: raw?.title || "Untitled Book",
    authorName: raw?.authorName || author?.name || "Unknown Creator",
    bookAuthor: raw?.bookAuthor || "",
    authorId: author?._id || raw?.author || null,
    authorUsername: author?.username || "",
    type: raw?.type || "Book",
    category: raw?.category || "General",
    subcategory: raw?.subcategory || "",
    language: raw?.language || "English",
    tags: raw?.tags || [],
    description: raw?.description || "",
    price: Number(raw?.price || 0),
    originalPrice: Number(raw?.originalPrice || raw?.price || 0),
    discountPrice: Number(raw?.discountPrice || raw?.price || 0),
    coverImage: normalizedCoverImage || DEFAULT_COVER,
    cover: normalizedCoverImage || DEFAULT_COVER,
    coverUrl: raw?.coverImage
      ? buildAbsoluteUrl(backendBaseUrl, raw.coverImage)
      : DEFAULT_COVER,
    previewPath: normalizedPreviewPath,
    previewPdf: normalizedPreviewPath,
    previewPages: Number(raw?.previewPages || 0),
    pageCount: Number(raw?.pageCount || 0),
    filePath: includeFilePath ? normalizedFilePath : "",
    pdfUrl: downloadUrl || "",
    isPaid: Boolean(raw?.isPaid),
    isPremium: Boolean(raw?.isPremium),
    requiresLogin: Boolean(raw?.requiresLogin),
    status: statusLabel || (raw?.isArchived ? "Archived" : raw?.status || "Draft"),
    rawStatus: raw?.status || "Draft",
    isArchived: Boolean(raw?.isArchived),
    adminNotes: raw?.adminNotes || "",
    aiScore: Number(raw?.aiScore || 0),
    aiStatus: raw?.aiStatus || "pending",
    plagiarismScore: Number(raw?.plagiarismScore || 0),
    qualityScore: Number(raw?.qualityScore || 0),
    aiSuggestion: raw?.aiSuggestion || "",
    moderationReason: raw?.moderationReason || "",
    aiCategory: raw?.aiCategory || "",
    aiTags: raw?.aiTags || [],
    aiProcessingState: raw?.aiProcessingState || "idle",
    aiReviewedAt: raw?.aiReviewedAt || null,
    downloads: Number(raw?.downloads || 0),
    views: Number(raw?.views || 0),
    salesCount: Number(raw?.salesCount || 0),
    sales: Number(raw?.salesCount || 0),
    earnings: Number(raw?.earnings || 0),
    revenue: Number(raw?.earnings || 0),
    platformRevenue: Number(raw?.platformRevenue || 0),
    isFeatured: Boolean(raw?.isFeatured),
    ratingAverage: Number(raw?.ratingAverage || 0),
    ratingCount: Number(raw?.ratingCount || 0),
    catalogKey: raw?.catalogKey || "",
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    publishedAt: raw?.publishedAt || null,
  };
}

function buildLastMonthsSeries(books, valueSelector, months = 6) {
  const labels = [];
  const values = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  for (let index = months - 1; index >= 0; index -= 1) {
    const bucketDate = new Date();
    bucketDate.setDate(1);
    bucketDate.setMonth(bucketDate.getMonth() - index);

    const month = bucketDate.getMonth();
    const year = bucketDate.getFullYear();

    const total = books.reduce((sum, book) => {
      const createdAt = new Date(book.createdAt || Date.now());
      if (
        createdAt.getMonth() === month &&
        createdAt.getFullYear() === year
      ) {
        return sum + Number(valueSelector(book) || 0);
      }

      return sum;
    }, 0);

    labels.push(monthNames[month]);
    values.push(total);
  }

  return { labels, values };
}

function buildCountrySales(books) {
  const labels = ["India", "United States", "United Kingdom", "Canada"];
  const seed = labels.reduce((accumulator, label) => {
    accumulator[label] = 0;
    return accumulator;
  }, {});

  if (!books.length) {
    return seed;
  }

  books.forEach((book, index) => {
    const label = labels[index % labels.length];
    const contribution =
      Number(book.earnings || 0) ||
      Number(book.salesCount || 0) * Number(book.price || 0) ||
      Number(book.downloads || 0) * 10;

    seed[label] += contribution;
  });

  return seed;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  DEFAULT_COVER,
  buildAbsoluteUrl,
  serializeBook,
  buildLastMonthsSeries,
  buildCountrySales,
  escapeRegex,
};
