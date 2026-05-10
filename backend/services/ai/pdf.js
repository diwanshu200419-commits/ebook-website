const fs = require("fs/promises");
const { PDFParse } = require("pdf-parse");

const {
  limitText,
  normalizeWhitespace,
} = require("./text");

function getMaxAiPdfBytes() {
  const rawValue = Number(process.env.AI_PDF_PARSE_MAX_BYTES || 20 * 1024 * 1024);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 20 * 1024 * 1024;
  }

  return Math.round(rawValue);
}

async function extractPdfAnalysis(filePath) {
  if (!filePath) {
    return {
      text: "",
      previewText: "",
      pageCount: 0,
      skipped: true,
      notice: "No PDF path available for AI processing.",
    };
  }

  try {
    const stats = await fs.stat(filePath);
    const maxBytes = getMaxAiPdfBytes();
    if (stats.size > maxBytes) {
      return {
        text: "",
        previewText: "",
        pageCount: 0,
        skipped: true,
        notice: `PDF is too large for full AI text extraction (${Math.round(stats.size / 1024 / 1024)}MB).`,
      };
    }

    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    let infoResult;
    let textResult;

    try {
      textResult = await parser.getText();
      infoResult = await parser.getInfo({ parsePageInfo: true });
    } finally {
      await parser.destroy().catch(() => null);
    }

    const text = limitText(textResult.text || "", 50000);
    const previewText = limitText(text, 7000);

    return {
      text,
      previewText,
      pageCount: Number(infoResult.total || textResult.total || 0),
      info: infoResult.info || {},
      metadata: infoResult.metadata || null,
      skipped: false,
      notice: "",
    };
  } catch (error) {
    return {
      text: "",
      previewText: "",
      pageCount: 0,
      skipped: true,
      notice: normalizeWhitespace(error.message || "PDF extraction failed"),
      error,
    };
  }
}

module.exports = {
  extractPdfAnalysis,
  getMaxAiPdfBytes,
};
