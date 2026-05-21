const fs = require("fs");
const path = require("path");

const uploadsRoot = path.resolve(
  process.env.UPLOAD_ROOT || path.join(__dirname, "..", "uploads")
);

function normalizeSegment(segment) {
  return String(segment || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function getUploadStorageProvider() {
  return String(process.env.UPLOAD_STORAGE_PROVIDER || "local")
    .trim()
    .toLowerCase();
}

function getUploadsPublicBaseUrl() {
  return normalizeUrl(process.env.UPLOAD_PUBLIC_BASE_URL || "");
}

function describeUploadStorage() {
  const provider = getUploadStorageProvider();
  const publicBaseUrl = getUploadsPublicBaseUrl();
  const servesLocally = provider === "local" || provider === "hybrid" || !publicBaseUrl;

  return {
    provider,
    uploadsRoot,
    publicBaseUrl,
    servesLocally,
    usesExternalPublicBase: Boolean(publicBaseUrl),
  };
}

function ensureUploadDir(...segments) {
  const dirPath = path.join(uploadsRoot, ...segments.map(normalizeSegment));
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function buildPublicUploadPath(...segments) {
  const normalized = segments.map(normalizeSegment).filter(Boolean);
  return `/${["uploads", ...normalized].join("/")}`;
}

function extractUploadPathname(source) {
  const raw = String(source || "").trim();
  if (!raw) {
    return "";
  }

  if (isAbsoluteUrl(raw)) {
    try {
      return new URL(raw).pathname || "";
    } catch {
      return "";
    }
  }

  if (/^uploads\//i.test(raw)) {
    return `/${raw.replace(/^\/+/, "")}`;
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

function isUploadPath(source) {
  return /^\/uploads\//i.test(extractUploadPathname(source));
}

function buildPublicAssetUrl(source, fallbackBaseUrl = "") {
  const raw = String(source || "").trim();
  if (!raw) {
    return "";
  }

  if (isAbsoluteUrl(raw) || /^data:/i.test(raw)) {
    return raw;
  }

  const pathname = extractUploadPathname(raw);
  if (!pathname) {
    return raw;
  }

  if (!isUploadPath(pathname)) {
    if (pathname.startsWith("/assets/")) {
      return pathname;
    }

    const normalizedBase = normalizeUrl(fallbackBaseUrl);
    return normalizedBase ? `${normalizedBase}${pathname}` : pathname;
  }

  const publicBaseUrl = getUploadsPublicBaseUrl();
  if (publicBaseUrl) {
    return `${publicBaseUrl}${pathname}`;
  }

  const normalizedBase = normalizeUrl(fallbackBaseUrl);
  return normalizedBase ? `${normalizedBase}${pathname}` : pathname;
}

function resolvePublicUploadPath(publicPath) {
  const pathname = extractUploadPathname(publicPath);
  if (!/^\/uploads\//i.test(pathname)) {
    return "";
  }

  const relativePath = normalizeSegment(pathname.replace(/^\/uploads\//i, ""));
  if (!relativePath) {
    return "";
  }

  const absolutePath = path.resolve(uploadsRoot, relativePath);
  if (!absolutePath.startsWith(uploadsRoot)) {
    return "";
  }

  return absolutePath;
}

function safeDeletePublicFile(publicPath) {
  const absolutePath = resolvePublicUploadPath(publicPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return false;
  }

  fs.unlinkSync(absolutePath);
  return true;
}

module.exports = {
  uploadsRoot,
  buildPublicAssetUrl,
  buildPublicUploadPath,
  describeUploadStorage,
  ensureUploadDir,
  getUploadStorageProvider,
  getUploadsPublicBaseUrl,
  isUploadPath,
  resolvePublicUploadPath,
  safeDeletePublicFile,
};
