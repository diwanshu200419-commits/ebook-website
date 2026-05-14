const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const {
  ensureUploadDir,
  buildPublicUploadPath,
  resolvePublicUploadPath,
} = require("./uploads");
const { normalizePreviewPages } = require("./bookCatalog");

const previewUploadPath = ensureUploadDir("previews");

function safePreviewFilename(title = "preview") {
  const baseName = String(title || "preview")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .slice(0, 80);

  return `${Date.now()}-${baseName || "preview"}.pdf`;
}

async function loadPdfPageCount(sourceAbsolutePath) {
  const bytes = await fs.readFile(sourceAbsolutePath);
  const pdf = await PDFDocument.load(bytes);
  return {
    bytes,
    pageCount: pdf.getPageCount(),
  };
}

async function createBookPreview({
  sourcePublicPath = "",
  title = "",
  isPaid = false,
  previewPages = 5,
}) {
  const sourceAbsolutePath = resolvePublicUploadPath(sourcePublicPath);
  if (!sourceAbsolutePath) {
    return {
      previewPath: "",
      previewPages: 0,
      pageCount: 0,
    };
  }

  const { bytes, pageCount } = await loadPdfPageCount(sourceAbsolutePath);
  const normalizedPreviewPages = normalizePreviewPages(previewPages);

  if (!isPaid) {
    return {
      previewPath: sourcePublicPath,
      previewPages: Math.min(normalizedPreviewPages, pageCount || normalizedPreviewPages),
      pageCount,
    };
  }

  if (pageCount <= 1) {
    return {
      previewPath: "",
      previewPages: 0,
      pageCount,
    };
  }

  const copyCount = Math.min(normalizedPreviewPages, pageCount - 1);
  if (copyCount <= 0) {
    return {
      previewPath: "",
      previewPages: 0,
      pageCount,
    };
  }

  const sourcePdf = await PDFDocument.load(bytes);
  const previewPdf = await PDFDocument.create();
  const pagesToCopy = await previewPdf.copyPages(
    sourcePdf,
    Array.from({ length: copyCount }, (_, index) => index)
  );

  pagesToCopy.forEach((page) => previewPdf.addPage(page));

  const previewFilename = safePreviewFilename(title);
  const previewAbsolutePath = path.join(previewUploadPath, previewFilename);
  const previewBytes = await previewPdf.save();
  await fs.writeFile(previewAbsolutePath, previewBytes);

  return {
    previewPath: buildPublicUploadPath("previews", previewFilename),
    previewPages: copyCount,
    pageCount,
  };
}

module.exports = {
  createBookPreview,
};
