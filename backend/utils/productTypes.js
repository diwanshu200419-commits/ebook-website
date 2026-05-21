const path = require("path");

const PRODUCT_TYPES = [
  "Book",
  "Notes",
  "Study",
  "Comics",
  "Prompt",
  "Template",
  "Course",
  "AI Asset",
  "Bundle",
  "Other",
];

const PDF_REQUIRED_TYPES = new Set(["Book", "Notes", "Study", "Comics"]);
const TEXT_FIRST_TYPES = new Set(["Prompt"]);
const ALLOWED_PRIMARY_EXTENSIONS = new Set([
  ".pdf",
  ".zip",
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

function normalizeProductType(type = "") {
  const safeType = String(type || "").trim();
  return PRODUCT_TYPES.includes(safeType) ? safeType : "Book";
}

function isPdfRequiredType(type = "") {
  return PDF_REQUIRED_TYPES.has(normalizeProductType(type));
}

function isTextFirstType(type = "") {
  return TEXT_FIRST_TYPES.has(normalizeProductType(type));
}

function normalizeDeliveryMode(mode = "") {
  return ["file", "text", "link", "mixed"].includes(String(mode || "").trim())
    ? String(mode).trim()
    : "file";
}

function getFileExtension(value = "") {
  return path.extname(String(value || "")).toLowerCase();
}

function isPdfLikeFile(file = null) {
  const extension = getFileExtension(file?.originalname || file?.fileName || file?.path || "");
  return file?.mimetype === "application/pdf" || extension === ".pdf";
}

function isSupportedPrimaryFile(file = null) {
  const extension = getFileExtension(file?.originalname || file?.fileName || file?.path || "");
  if (!file) {
    return false;
  }

  if (file?.mimetype === "application/pdf") {
    return true;
  }

  if (String(file?.mimetype || "").startsWith("image/")) {
    return true;
  }

  return ALLOWED_PRIMARY_EXTENSIONS.has(extension);
}

function buildTextPreview(value = "", limit = 420) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trim()}...`;
}

function buildDeliveryMode({ hasFile = false, hasText = false, hasExternalUrl = false } = {}) {
  if ((hasFile && hasText) || (hasFile && hasExternalUrl) || (hasText && hasExternalUrl)) {
    return "mixed";
  }

  if (hasText) {
    return "text";
  }

  if (hasExternalUrl) {
    return "link";
  }

  return "file";
}

function buildDeliveryLabel(type = "", delivery = {}) {
  const normalizedType = normalizeProductType(type);
  const mode = normalizeDeliveryMode(delivery.mode || "");

  if (normalizedType === "Prompt") {
    return mode === "mixed" ? "Prompt + files" : "Prompt delivery";
  }

  if (normalizedType === "Template") {
    return mode === "link" ? "Template access link" : "Template download";
  }

  if (normalizedType === "Course") {
    return mode === "link" ? "Course access link" : "Course pack";
  }

  if (normalizedType === "AI Asset") {
    return "AI asset pack";
  }

  if (normalizedType === "Bundle") {
    return "Digital bundle";
  }

  if (mode === "text") {
    return "Instant text delivery";
  }

  if (mode === "link") {
    return "External access link";
  }

  return "Digital download";
}

function buildDownloadFilename(book = {}) {
  const title = String(book?.title || "digital-product")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "digital-product";
  const deliveryFileName = book?.delivery?.fileName || "";
  const extension = getFileExtension(deliveryFileName)
    || (book?.delivery?.mode === "text" ? ".txt" : "")
    || getFileExtension(book?.filePath || "")
    || ".pdf";

  return `${title}${extension}`;
}

module.exports = {
  PRODUCT_TYPES,
  buildDeliveryLabel,
  buildDeliveryMode,
  buildDownloadFilename,
  buildTextPreview,
  isPdfLikeFile,
  isPdfRequiredType,
  isSupportedPrimaryFile,
  isTextFirstType,
  normalizeDeliveryMode,
  normalizeProductType,
};
