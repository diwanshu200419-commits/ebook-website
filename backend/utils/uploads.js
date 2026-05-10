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

function ensureUploadDir(...segments) {
  const dirPath = path.join(uploadsRoot, ...segments.map(normalizeSegment));
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function buildPublicUploadPath(...segments) {
  const normalized = segments.map(normalizeSegment).filter(Boolean);
  return `/${["uploads", ...normalized].join("/")}`;
}

function resolvePublicUploadPath(publicPath) {
  const normalizedPath = normalizeSegment(publicPath);
  if (!normalizedPath.startsWith("uploads/")) {
    return "";
  }

  const relativePath = normalizedPath.replace(/^uploads\//, "");
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
  ensureUploadDir,
  buildPublicUploadPath,
  resolvePublicUploadPath,
  safeDeletePublicFile,
};
