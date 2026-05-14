const DEFAULT_PREVIEW_PAGES = 5;
const MAX_PREVIEW_PAGES = 25;

const CATEGORY_OPTIONS = [
  "Book",
  "Notes",
  "Study",
  "AI",
  "Comics",
  "Education",
  "Technology",
  "Self Help",
  "Fiction",
  "Competitive",
  "Programming",
  "Business",
  "Design",
  "Finance",
  "Self Growth",
  "Handwritten",
  "Horror",
  "Literature",
  "Language Learning",
  "Other",
];

function clampNumber(value, min, max, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function normalizePreviewPages(value) {
  return Math.round(
    clampNumber(value, 1, MAX_PREVIEW_PAGES, DEFAULT_PREVIEW_PAGES)
  );
}

function normalizeBooleanFlag(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on", "premium", "featured"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizePricing(input = {}) {
  const directPrice = clampNumber(input.price, 0, 100000, 0);
  const originalPrice = clampNumber(
    input.originalPrice,
    0,
    100000,
    directPrice
  );
  const requestedDiscount = clampNumber(
    input.discountPrice,
    0,
    100000,
    directPrice
  );
  const effectivePrice = directPrice || requestedDiscount;
  const normalizedOriginal = Math.max(originalPrice, effectivePrice);

  return {
    price: effectivePrice,
    originalPrice: normalizedOriginal,
    discountPrice: effectivePrice,
    isPaid: effectivePrice > 0,
  };
}

function pickDefaultCover(category = "", type = "") {
  const normalizedCategory = String(category || "").toLowerCase();
  const normalizedType = String(type || "").toLowerCase();

  if (
    normalizedCategory.includes("technology")
    || normalizedCategory.includes("program")
    || normalizedCategory.includes("ai")
    || normalizedType.includes("ai")
  ) {
    return "assets/covers/ai.png";
  }

  if (
    normalizedCategory.includes("study")
    || normalizedCategory.includes("education")
    || normalizedCategory.includes("language")
    || normalizedCategory.includes("note")
    || normalizedType.includes("note")
  ) {
    return "assets/covers/topper-notes.png";
  }

  return "assets/covers/Ebook_AI.png";
}

module.exports = {
  CATEGORY_OPTIONS,
  DEFAULT_PREVIEW_PAGES,
  MAX_PREVIEW_PAGES,
  normalizeBooleanFlag,
  normalizePreviewPages,
  normalizePricing,
  pickDefaultCover,
};
