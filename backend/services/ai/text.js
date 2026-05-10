const crypto = require("crypto");

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "for", "from", "had", "has", "have", "he", "her", "hers", "him", "his",
  "how", "i", "if", "in", "into", "is", "it", "its", "me", "my", "of", "on",
  "or", "our", "ours", "she", "so", "that", "the", "their", "them", "they",
  "this", "to", "too", "was", "we", "were", "what", "when", "where", "which",
  "who", "why", "will", "with", "you", "your", "yours",
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAnalysisText(value) {
  return normalizeWhitespace(value)
    .replace(/[^\w\s.,!?;:'"()\-[\]\/]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function limitText(value, maxLength = 50000) {
  const text = normalizeAnalysisText(value);
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim();
}

function tokenizeText(value) {
  return normalizeAnalysisText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && token.length > 2 && !STOP_WORDS.has(token));
}

function buildShingles(value, size = 3, limit = 3000) {
  const tokens = tokenizeText(value).slice(0, limit);
  const shingles = new Set();

  if (tokens.length < size) {
    tokens.forEach((token) => shingles.add(token));
    return shingles;
  }

  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.add(tokens.slice(index, index + size).join(" "));
  }

  return shingles;
}

function jaccardSimilarity(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let intersection = 0;
  leftSet.forEach((item) => {
    if (rightSet.has(item)) {
      intersection += 1;
    }
  });

  return intersection / (leftSet.size + rightSet.size - intersection || 1);
}

function lexicalSimilarity(leftText, rightText) {
  if (!leftText || !rightText) {
    return 0;
  }

  const leftTokens = tokenizeText(leftText);
  const rightTokens = tokenizeText(rightText);

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const tokenScore = jaccardSimilarity(new Set(leftTokens), new Set(rightTokens));
  const shingleScore = jaccardSimilarity(buildShingles(leftText), buildShingles(rightText));

  return clamp((tokenScore * 0.45) + (shingleScore * 0.55), 0, 1);
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || !left.length || !right.length) {
    return 0;
  }

  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index] || 0);
    const rightValue = Number(right[index] || 0);
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return clamp(dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude)), -1, 1);
}

function estimateSyllables(word) {
  const normalized = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!normalized) {
    return 1;
  }

  const groups = normalized.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

function computeReadability(text) {
  const normalized = normalizeAnalysisText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const sentences = normalized.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);

  if (!words.length) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      avgSentenceLength: 0,
      readabilityScore: 0,
    };
  }

  const syllableCount = words.reduce((sum, word) => sum + estimateSyllables(word), 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = words.length / sentenceCount;
  const flesch = 206.835 - (1.015 * avgSentenceLength) - (84.6 * (syllableCount / words.length));

  return {
    wordCount: words.length,
    sentenceCount,
    avgSentenceLength: Number(avgSentenceLength.toFixed(2)),
    readabilityScore: clamp(Math.round(flesch), 0, 100),
  };
}

function buildKeywordList(text, limit = 8) {
  const frequencies = new Map();
  tokenizeText(text).forEach((token) => {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  });

  return [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function buildHash(text) {
  return crypto
    .createHash("sha256")
    .update(normalizeAnalysisText(text))
    .digest("hex");
}

function splitIntoChunks(text, maxChunkLength = 3200, maxChunks = 10) {
  const normalized = normalizeAnalysisText(text);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      return;
    }

    const nextValue = current ? `${current}\n\n${paragraph}` : paragraph;
    if (nextValue.length <= maxChunkLength) {
      current = nextValue;
      return;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= maxChunkLength) {
      current = paragraph;
      return;
    }

    for (let index = 0; index < paragraph.length; index += maxChunkLength) {
      chunks.push(paragraph.slice(index, index + maxChunkLength));
      if (chunks.length >= maxChunks) {
        return;
      }
    }
  });

  if (current && chunks.length < maxChunks) {
    chunks.push(current);
  }

  return chunks.slice(0, maxChunks);
}

function buildLocalDescription({ title, category, tags, description, text }) {
  const cleanDescription = normalizeWhitespace(description);
  if (cleanDescription.length >= 120) {
    return cleanDescription;
  }

  const sentences = normalizeWhitespace(text)
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  const topicLine = [
    title || "This digital book",
    category ? `in ${category}` : "",
    Array.isArray(tags) && tags.length ? `covering ${tags.slice(0, 4).join(", ")}` : "",
  ].filter(Boolean).join(" ");

  const contentLine = sentences.join(". ");
  return normalizeWhitespace(
    `${topicLine}. ${contentLine || "Designed for readers looking for practical, searchable, and well-structured learning material."}`
  );
}

module.exports = {
  buildHash,
  buildKeywordList,
  buildLocalDescription,
  clamp,
  computeReadability,
  cosineSimilarity,
  lexicalSimilarity,
  limitText,
  normalizeAnalysisText,
  normalizeWhitespace,
  splitIntoChunks,
  tokenizeText,
};
