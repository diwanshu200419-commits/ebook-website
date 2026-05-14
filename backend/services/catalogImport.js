const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const Book = require("../models/book");
const User = require("../models/user");
const { BUILTIN_LIBRARY } = require("../data/builtinLibrary");
const {
  ensureUploadDir,
  buildPublicUploadPath,
  resolvePublicUploadPath,
} = require("../utils/uploads");
const {
  normalizePreviewPages,
  normalizePricing,
  pickDefaultCover,
} = require("../utils/bookCatalog");
const { createBookPreview } = require("../utils/pdfPreview");

const projectRoot = path.resolve(__dirname, "..", "..");
const frontendBooksDir = path.join(projectRoot, "frontend", "assets", "books");
const frontendCoversDir = path.join(projectRoot, "frontend", "assets", "covers");
const backendBooksDir = ensureUploadDir("books");
const COVER_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const DEFAULT_COVER_VALUES = new Set([
  "assets/covers/ai.png",
  "/assets/covers/ai.png",
  "assets/covers/ebook_ai.png",
  "/assets/covers/ebook_ai.png",
  "assets/covers/topper-notes.png",
  "/assets/covers/topper-notes.png",
]);

const SOURCE_PRIORITY = {
  "backend-uploads": 1,
  "frontend-assets": 2,
};

const OFFICIAL_PREVIEW_FILENAMES = new Set([
  "i-tried-8-different-ai-side-hustles-for-students-heres-which-ones-actually-pay.pdf",
]);
const MARKETPLACE_SYNC_INTERVAL_MS = 15000;
const MARKETPLACE_OWNER_EMAIL = "marketplace-library@ebook.local";

let marketplaceSyncPromise = null;
let marketplaceSyncCompletedAt = 0;

function normalizeFilenameKey(filename = "") {
  return path.basename(String(filename || "")).toLowerCase();
}

function normalizeAssetPath(value = "") {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "/")
    .toLowerCase();
}

function slugify(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function humanizeSegment(value = "") {
  const words = String(value || "")
    .replace(/[_]+/g, " ")
    .replace(/[.]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) {
    return "";
  }

  const uppercaseWords = new Set(["ai", "api", "css", "html", "ip", "js", "ml", "pdf", "tcp", "ui", "ux"]);

  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (uppercaseWords.has(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function deriveTitleAndAuthor(filename = "") {
  const baseName = path.basename(filename, path.extname(filename));
  const normalized = baseName
    .replace(/[_]+/g, " ")
    .replace(/[.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const authorMatch = normalized.match(/^(.*?)[\s-]+author[\s-]+(.+)$/i);
  const titleSource = (authorMatch ? authorMatch[1] : normalized).replace(/^\d+[\s._-]*/, "");
  const authorSource = authorMatch ? authorMatch[2] : "";

  return {
    title: humanizeSegment(titleSource) || "Imported PDF",
    author: humanizeSegment(authorSource),
  };
}

function inferCategory(text = "") {
  const source = String(text || "").toLowerCase();

  if (/lovecraft|poe|horror|gothic|ghost|terror/.test(source)) {
    return "Horror";
  }

  if (/network|protocol|computer|tcp|ip|internet|cyber|program|software|tech/.test(source)) {
    return "Technology";
  }

  if (/\bai\b|artificial intelligence|machine learning|prompt/.test(source)) {
    return "AI";
  }

  if (/side hustle|income|earn|pay|business|marketing|finance|sales/.test(source)) {
    return "Business";
  }

  if (/notes|study|exam|handwritten|lecture|syllabus|student/.test(source)) {
    return "Education";
  }

  if (/language|english|hindi|spanish|grammar/.test(source)) {
    return "Language Learning";
  }

  return "Book";
}

function inferSubcategory(category = "", text = "") {
  const source = String(text || "").toLowerCase();
  const normalizedCategory = String(category || "").toLowerCase();

  if (normalizedCategory === "technology" && /network|protocol/.test(source)) {
    return "Networking";
  }

  if (normalizedCategory === "horror") {
    return "Gothic Horror";
  }

  if (normalizedCategory === "business" && /side hustle|income|earn|pay/.test(source)) {
    return "Side Hustle";
  }

  if (normalizedCategory === "education" && /student|study/.test(source)) {
    return "Study Guide";
  }

  return "";
}

function inferTags(category = "", text = "") {
  const source = String(text || "").toLowerCase();
  const tags = [];

  const addTag = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || tags.includes(normalized) || tags.length >= 6) {
      return;
    }

    tags.push(normalized);
  };

  if (/network/.test(source)) addTag("networking");
  if (/protocol/.test(source)) addTag("protocols");
  if (/\bai\b|artificial intelligence/.test(source)) addTag("ai");
  if (/side hustle/.test(source)) addTag("side hustle");
  if (/student/.test(source)) addTag("students");
  if (/pay|income|earn/.test(source)) addTag("earnings");
  if (/lovecraft/.test(source)) addTag("lovecraft");
  if (/\bpoe\b|edgar allan poe/.test(source)) addTag("poe");
  if (/horror|gothic/.test(source)) addTag("horror");

  if (!tags.length && category) {
    addTag(category);
  }

  return tags;
}

function buildManualDescription(title = "") {
  return `${title} was imported from a PDF file you added manually to this project. Review the pricing, cover, and description after import to make the listing storefront-ready.`;
}

function buildCoverAssetPath(absolutePath = "") {
  if (!absolutePath) {
    return "";
  }

  return `/assets/${path.basename(path.dirname(absolutePath))}/${path.basename(absolutePath)}`.replace(/\\/g, "/");
}

function normalizeCoverStem(value = "") {
  return slugify(
    path.basename(String(value || ""), path.extname(String(value || "")))
      .replace(/(?:[-_\s]+)?(cover|thumbnail|thumb)$/i, "")
  );
}

function findCustomCoverMatch(filename = "") {
  const pdfBaseName = path.basename(filename, path.extname(filename));
  const normalizedPdfStem = normalizeCoverStem(pdfBaseName);
  const sidecarNames = new Set([
    pdfBaseName,
    `${pdfBaseName}-cover`,
    `${pdfBaseName}-thumbnail`,
    `${pdfBaseName}-thumb`,
  ].map((value) => normalizeCoverStem(value)));

  const searchDirectories = [frontendCoversDir, frontendBooksDir];

  for (const directoryPath of searchDirectories) {
    if (!fs.existsSync(directoryPath)) {
      continue;
    }

    const files = fs.readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && COVER_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()))
      .map((entry) => path.join(directoryPath, entry.name));

    const exactMatch = files.find((absolutePath) =>
      sidecarNames.has(normalizeCoverStem(absolutePath))
    );

    if (exactMatch) {
      return buildCoverAssetPath(exactMatch);
    }

    const fuzzyMatch = files.find((absolutePath) => {
      const coverStem = normalizeCoverStem(absolutePath);
      return coverStem && normalizedPdfStem && (
        coverStem.includes(normalizedPdfStem) || normalizedPdfStem.includes(coverStem)
      );
    });

    if (fuzzyMatch) {
      return buildCoverAssetPath(fuzzyMatch);
    }
  }

  return "";
}

function findMatchingCover(filename = "", category = "", type = "Book") {
  const customCover = findCustomCoverMatch(filename);
  if (customCover) {
    return {
      coverImage: customCover,
      hasCustomCover: true,
    };
  }

  return {
    coverImage: pickDefaultCover(category, type),
    hasCustomCover: false,
  };
}

function buildManualCatalogEntry(filename = "") {
  const normalizedFilename = normalizeFilenameKey(filename);
  if (OFFICIAL_PREVIEW_FILENAMES.has(normalizedFilename)) {
    return {
      catalogKey: `official-preview-${slugify(path.basename(filename, path.extname(filename)))}`,
      filename,
      title: "Side Hustles for Students",
      bookAuthor: "",
      type: "Book",
      category: "Business",
      subcategory: "Free Preview",
      language: "English",
      description: "Official free preview title used by the storefront demo. This PDF stays as the preview book and is not converted into a paid marketplace import.",
      tags: ["free preview", "official", "students", "demo"],
      originalPrice: 0,
      discountPrice: 0,
      previewPages: 5,
      isPremium: false,
      isFeatured: false,
      coverImage: "/assets/covers/Ebook_AI.png",
      hasCustomCover: false,
      catalogType: "manual",
      excludeFromImport: true,
      sourceLabel: "Official free preview",
    };
  }

  const { title, author } = deriveTitleAndAuthor(filename);
  const detectionSource = `${filename} ${title} ${author}`;
  const category = inferCategory(detectionSource);
  const subcategory = inferSubcategory(category, detectionSource);

  return {
    catalogKey: `manual-${slugify(path.basename(filename, path.extname(filename)))}`,
    filename,
    title,
    bookAuthor: author,
    type: "Book",
    category,
    subcategory,
    language: "English",
    description: buildManualDescription(title),
    tags: inferTags(category, detectionSource),
    originalPrice: 299,
    discountPrice: 199,
    previewPages: 5,
    isPremium: false,
    isFeatured: false,
    ...findMatchingCover(filename, category, "Book"),
    catalogType: "manual",
  };
}

function listPdfFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf")
    .map((entry) => path.join(directoryPath, entry.name));
}

function buildCatalogEntryFromSource({
  filename,
  sourceAbsolutePath,
  sourceKind,
  metadata,
}) {
  const detectedCover = findMatchingCover(filename, metadata.category, metadata.type);
  const coverImage = detectedCover.hasCustomCover
    ? detectedCover.coverImage
    : (metadata.coverImage || detectedCover.coverImage);

  return {
    ...metadata,
    filename,
    sourceAbsolutePath,
    sourceKind,
    sourceLabel: sourceKind === "frontend-assets" ? "Project PDF file" : "Backend upload file",
    coverImage,
    hasCustomCover: Boolean(detectedCover.hasCustomCover || metadata.hasCustomCover),
  };
}

function getImportableLibraryCatalog() {
  const entriesByFilename = new Map();
  const builtinByFilename = new Map(
    BUILTIN_LIBRARY.map((entry) => [normalizeFilenameKey(entry.filename), entry])
  );

  const registerSourceFile = (sourceAbsolutePath, sourceKind) => {
    const filename = path.basename(sourceAbsolutePath);
    const key = normalizeFilenameKey(filename);
    const builtin = builtinByFilename.get(key);
    const metadata = builtin
      ? { ...builtin, catalogType: "curated" }
      : buildManualCatalogEntry(filename);

    const nextEntry = buildCatalogEntryFromSource({
      filename,
      sourceAbsolutePath,
      sourceKind,
      metadata,
    });

    const existing = entriesByFilename.get(key);
    if (!existing) {
      entriesByFilename.set(key, nextEntry);
      return;
    }

    const currentPriority = SOURCE_PRIORITY[existing.sourceKind] || 0;
    const nextPriority = SOURCE_PRIORITY[sourceKind] || 0;
    if (nextPriority >= currentPriority) {
      existing.sourceAbsolutePath = sourceAbsolutePath;
      existing.sourceKind = sourceKind;
      existing.sourceLabel = nextEntry.sourceLabel;
    }

    if (!existing.coverImage && nextEntry.coverImage) {
      existing.coverImage = nextEntry.coverImage;
    }
  };

  listPdfFiles(backendBooksDir).forEach((filePath) => {
    registerSourceFile(filePath, "backend-uploads");
  });

  listPdfFiles(frontendBooksDir).forEach((filePath) => {
    registerSourceFile(filePath, "frontend-assets");
  });

  return Array.from(entriesByFilename.values()).sort((left, right) =>
    String(left.title || "").localeCompare(String(right.title || ""))
  ).filter((entry) => !entry.excludeFromImport);
}

function ensureCatalogBookIsStored(entry) {
  const targetPublicPath = buildPublicUploadPath("books", entry.filename);
  const targetAbsolutePath = resolvePublicUploadPath(targetPublicPath);

  if (!targetAbsolutePath) {
    throw new Error(`Unable to resolve upload path for ${entry.filename}`);
  }

  const sourceAbsolutePath = path.resolve(entry.sourceAbsolutePath);
  const targetResolvedPath = path.resolve(targetAbsolutePath);

  if (sourceAbsolutePath !== targetResolvedPath) {
    const sourceStats = fs.statSync(sourceAbsolutePath);
    const targetExists = fs.existsSync(targetResolvedPath);
    const targetStats = targetExists ? fs.statSync(targetResolvedPath) : null;
    const shouldCopy =
      !targetExists
      || targetStats.size !== sourceStats.size
      || sourceStats.mtimeMs > targetStats.mtimeMs + 500;

    if (shouldCopy) {
      fs.copyFileSync(sourceAbsolutePath, targetResolvedPath);
    }
  }

  return targetPublicPath;
}

async function ensureMarketplaceCatalogOwner() {
  const configuredAdminEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();

  if (configuredAdminEmail) {
    const configuredAdmin = await User.findOne({
      email: configuredAdminEmail,
      isDeleted: { $ne: true },
    });

    if (configuredAdmin) {
      return configuredAdmin;
    }
  }

  const existingAdmin = await User.findOne({
    role: "admin",
    isDeleted: { $ne: true },
    status: { $ne: "blocked" },
  }).sort({ createdAt: 1 });

  if (existingAdmin) {
    return existingAdmin;
  }

  const existingCatalogOwner = await User.findOne({
    email: MARKETPLACE_OWNER_EMAIL,
    isDeleted: { $ne: true },
  });

  if (existingCatalogOwner) {
    return existingCatalogOwner;
  }

  return User.create({
    name: "Marketplace Library",
    email: MARKETPLACE_OWNER_EMAIL,
    password: crypto.randomBytes(24).toString("hex"),
    role: "author",
    provider: "local",
    verified: true,
    bio: "System-managed marketplace catalog owner for folder-based PDF imports.",
  });
}

function buildImportedBookPayload(entry, creator, preview, filePath) {
  const pricing = normalizePricing({
    price: entry.discountPrice,
    originalPrice: entry.originalPrice,
    discountPrice: entry.discountPrice,
  });

  return {
    title: entry.title,
    authorName: creator.name,
    bookAuthor: entry.bookAuthor || "",
    author: creator._id || creator.id,
    type: entry.type || "Book",
    category: entry.category || "Book",
    subcategory: entry.subcategory || "",
    language: entry.language || "English",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    description: entry.description || "",
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discountPrice: pricing.discountPrice,
    filePath,
    previewPath: preview.previewPath || "",
    previewPages: preview.previewPages || normalizePreviewPages(entry.previewPages),
    pageCount: preview.pageCount || 0,
    coverImage: entry.coverImage || "",
    coverAlt: entry.title || "Book cover",
    isPaid: pricing.isPaid,
    isPremium: Boolean(entry.isPremium),
    requiresLogin: true,
    status: "Approved",
    aiStatus: "approved",
    aiScore: 96,
    plagiarismScore: 0,
    qualityScore: 96,
    aiSuggestion:
      entry.catalogType === "manual"
        ? "Imported from a manually added project PDF."
        : "Imported from the curated marketplace library.",
    moderationReason:
      entry.catalogType === "manual"
        ? "Imported from a manually added project PDF."
        : "Imported from the curated marketplace library.",
    aiCategory: entry.category || "Book",
    aiTags: Array.isArray(entry.tags) ? entry.tags : [],
    aiProcessingState: "completed",
    aiReviewedAt: new Date(),
    isFeatured: Boolean(entry.isFeatured),
    catalogKey: entry.catalogKey,
    publishedAt: new Date(),
  };
}

function shouldUpdateCoverImage(existingCover = "", incomingCover = "", hasCustomCover = false) {
  if (!incomingCover) {
    return false;
  }

  if (!existingCover) {
    return true;
  }

  const normalizedExisting = normalizeAssetPath(existingCover);
  const normalizedIncoming = normalizeAssetPath(incomingCover);

  if (normalizedExisting === normalizedIncoming) {
    return false;
  }

  if (hasCustomCover) {
    return true;
  }

  return DEFAULT_COVER_VALUES.has(normalizedExisting) && !DEFAULT_COVER_VALUES.has(normalizedIncoming);
}

async function importBuiltinLibraryForCreator(creator) {
  const creatorId = String(creator?._id || creator?.id || "").trim();
  if (!creatorId) {
    throw new Error("A valid creator account is required to import the library");
  }

  const catalog = getImportableLibraryCatalog();
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    missingFiles: 0,
    books: [],
  };

  for (const entry of catalog) {
    if (!entry.sourceAbsolutePath || !fs.existsSync(entry.sourceAbsolutePath)) {
      summary.missingFiles += 1;
      summary.books.push({
        catalogKey: entry.catalogKey,
        title: entry.title,
        sourceLabel: entry.sourceLabel,
        status: "missing_file",
      });
      continue;
    }

    const filePath = ensureCatalogBookIsStored(entry);
    const preview = await createBookPreview({
      sourcePublicPath: filePath,
      title: entry.title,
      isPaid: Number(entry.discountPrice || 0) > 0,
      previewPages: entry.previewPages,
    });

    const payload = buildImportedBookPayload(entry, creator, preview, filePath);
    const existing = await Book.findOne({
      author: creatorId,
      $or: [
        { catalogKey: entry.catalogKey },
        { title: entry.title },
      ],
    });

    if (!existing) {
      const created = await Book.create(payload);
      summary.created += 1;
      summary.books.push({
        id: created._id,
        catalogKey: entry.catalogKey,
        title: created.title,
        sourceLabel: entry.sourceLabel,
        status: "created",
      });
      continue;
    }

    let changed = false;
    const fillIfMissing = (key, value) => {
      const current = existing[key];
      const missing = current === undefined || current === null || current === "" || current === 0;
      if (missing && value !== undefined && value !== null && value !== "") {
        existing[key] = value;
        changed = true;
      }
    };

    fillIfMissing("price", payload.price);
    fillIfMissing("bookAuthor", payload.bookAuthor);
    fillIfMissing("subcategory", payload.subcategory);
    fillIfMissing("originalPrice", payload.originalPrice);
    fillIfMissing("discountPrice", payload.discountPrice);
    fillIfMissing("filePath", payload.filePath);
    fillIfMissing("previewPath", payload.previewPath);
    fillIfMissing("previewPages", payload.previewPages);
    fillIfMissing("pageCount", payload.pageCount);
    fillIfMissing("coverImage", payload.coverImage);
    fillIfMissing("catalogKey", payload.catalogKey);

    if (!existing.tags?.length && payload.tags.length) {
      existing.tags = payload.tags;
      changed = true;
    }

    if (!existing.description && payload.description) {
      existing.description = payload.description;
      changed = true;
    }

    if (shouldUpdateCoverImage(existing.coverImage, payload.coverImage, entry.hasCustomCover)) {
      existing.coverImage = payload.coverImage;
      changed = true;
    }

    if (Number(existing.price || 0) > 0 && !existing.isPaid) {
      existing.isPaid = true;
      changed = true;
    }

    if (payload.isPremium && !existing.isPremium) {
      existing.isPremium = true;
      changed = true;
    }

    if (payload.isFeatured && !existing.isFeatured) {
      existing.isFeatured = true;
      changed = true;
    }

    if (!existing.requiresLogin) {
      existing.requiresLogin = true;
      changed = true;
    }

    if (!existing.status || existing.status === "AI_Review") {
      existing.status = "Approved";
      existing.aiStatus = "approved";
      existing.aiProcessingState = "completed";
      if (!existing.publishedAt) {
        existing.publishedAt = new Date();
      }
      changed = true;
    }

    if (changed) {
      await existing.save();
      summary.updated += 1;
      summary.books.push({
        id: existing._id,
        catalogKey: entry.catalogKey,
        title: existing.title,
        sourceLabel: entry.sourceLabel,
        status: "updated",
      });
    } else {
      summary.skipped += 1;
      summary.books.push({
        id: existing._id,
        catalogKey: entry.catalogKey,
        title: existing.title,
        sourceLabel: entry.sourceLabel,
        status: "skipped",
      });
    }
  }

  return summary;
}

async function syncProjectCatalogToMarketplace(options = {}) {
  const force = Boolean(options.force);
  const now = Date.now();

  if (!force && marketplaceSyncCompletedAt && now - marketplaceSyncCompletedAt < MARKETPLACE_SYNC_INTERVAL_MS) {
    return {
      skipped: true,
      reason: "recent_sync",
    };
  }

  if (marketplaceSyncPromise) {
    return marketplaceSyncPromise;
  }

  marketplaceSyncPromise = (async () => {
    try {
      const owner = await ensureMarketplaceCatalogOwner();
      const result = await importBuiltinLibraryForCreator(owner);
      marketplaceSyncCompletedAt = Date.now();

      return {
        ownerId: owner._id,
        ownerEmail: owner.email,
        ...result,
      };
    } finally {
      marketplaceSyncPromise = null;
    }
  })();

  return marketplaceSyncPromise;
}

module.exports = {
  BUILTIN_LIBRARY,
  getImportableLibraryCatalog,
  importBuiltinLibraryForCreator,
  syncProjectCatalogToMarketplace,
};
