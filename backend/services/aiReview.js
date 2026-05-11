const {
  getConfiguredAiProvider,
  getModerationModel,
  hasOllama,
  getOpenAIClient,
  hasOpenAI,
} = require("./ai/client");
const { runStructuredOllamaChat } = require("./ai/ollama");
const {
  buildKeywordList,
  clamp,
  normalizeWhitespace,
  tokenizeText,
} = require("./ai/text");

const INITIAL_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["qualityScore", "plagiarismScore", "aiStatus", "aiSuggestion"],
  properties: {
    qualityScore: { type: "integer", minimum: 0, maximum: 100 },
    plagiarismScore: { type: "integer", minimum: 0, maximum: 100 },
    aiStatus: { type: "string", enum: ["approved", "pending", "rejected"] },
    aiSuggestion: { type: "string", minLength: 8, maxLength: 240 },
  },
};

function buildInitialHeuristicReview(book) {
  const title = normalizeWhitespace(book.title || "");
  const description = normalizeWhitespace(book.description || "");
  const text = normalizeWhitespace([
    title,
    description,
    book.category || "",
    book.type || "",
    Array.isArray(book.tags) ? book.tags.join(", ") : "",
  ].join("\n\n"));
  const tokens = tokenizeText(text);
  const uniqueRatio = tokens.length ? new Set(tokens).size / tokens.length : 0;
  const tagCount = Array.isArray(book.tags) ? book.tags.length : 0;

  let qualityScore = 42;
  if (title.length >= 12) qualityScore += 10;
  if (description.length >= 120) qualityScore += 22;
  if (description.length >= 240) qualityScore += 10;
  if (tagCount >= 3) qualityScore += 6;
  if (tokens.length >= 80) qualityScore += 6;
  qualityScore = clamp(qualityScore, 0, 100);

  let plagiarismScore = 8;
  plagiarismScore += clamp(Math.round((1 - uniqueRatio) * 60), 0, 45);
  plagiarismScore += description.length < 80 ? 15 : 0;
  plagiarismScore += tokens.length < 35 ? 12 : 0;
  plagiarismScore = clamp(plagiarismScore, 0, 100);

  let aiStatus = "pending";
  if (plagiarismScore >= 75 || qualityScore < 32) {
    aiStatus = "rejected";
  } else if (plagiarismScore <= 24 && qualityScore >= 76) {
    aiStatus = "approved";
  }

  const aiScore = clamp(Math.round((qualityScore * 0.65) + ((100 - plagiarismScore) * 0.35)), 0, 100);
  const aiSuggestion =
    aiStatus === "rejected"
      ? "Initial AI checks flagged this upload for weak originality or incomplete content."
      : aiStatus === "approved"
        ? "Initial AI checks look healthy. Full PDF moderation will confirm the final decision."
        : "Initial AI checks passed, but the full PDF scan is still required.";

  return {
    aiStatus,
    qualityScore,
    plagiarismScore,
    aiSuggestion,
    aiScore,
    provider: "local",
    model: "local-heuristic",
    keywords: buildKeywordList(text, 6),
  };
}

async function buildOpenAiInitialReview(book, fallback) {
  if (!hasOpenAI()) {
    return fallback;
  }

  try {
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getModerationModel(),
      instructions: [
        "You perform a quick pre-screen for an ebook marketplace upload before deeper PDF analysis runs.",
        "Return JSON only.",
      ].join(" "),
      input: [
        `Title: ${book.title || ""}`,
        `Description: ${book.description || ""}`,
        `Category: ${book.category || ""}`,
        `Type: ${book.type || ""}`,
        `Price: ${book.price || 0}`,
        `Tags: ${Array.isArray(book.tags) ? book.tags.join(", ") : ""}`,
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "ebook_initial_review",
          strict: true,
          schema: INITIAL_REVIEW_SCHEMA,
        },
      },
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const qualityScore = clamp(Number(parsed.qualityScore || fallback.qualityScore), 0, 100);
    const plagiarismScore = clamp(Number(parsed.plagiarismScore || fallback.plagiarismScore), 0, 100);
    return {
      ...fallback,
      qualityScore,
      plagiarismScore,
      aiStatus: ["approved", "pending", "rejected"].includes(parsed.aiStatus) ? parsed.aiStatus : fallback.aiStatus,
      aiSuggestion: normalizeWhitespace(parsed.aiSuggestion || fallback.aiSuggestion),
      aiScore: clamp(Math.round((qualityScore * 0.65) + ((100 - plagiarismScore) * 0.35)), 0, 100),
      provider: "openai",
      model: getModerationModel(),
    };
  } catch (error) {
    console.error("Initial OpenAI review error:", error.message);
    return fallback;
  }
}

async function buildOllamaInitialReview(book, fallback) {
  if (!hasOllama()) {
    return fallback;
  }

  try {
    const parsed = await runStructuredOllamaChat({
      instructions: [
        "You perform a quick pre-screen for an ebook marketplace upload before deeper PDF analysis runs.",
        "Be conservative and return JSON only.",
      ].join(" "),
      prompt: [
        `Title: ${book.title || ""}`,
        `Description: ${book.description || ""}`,
        `Category: ${book.category || ""}`,
        `Type: ${book.type || ""}`,
        `Price: ${book.price || 0}`,
        `Tags: ${Array.isArray(book.tags) ? book.tags.join(", ") : ""}`,
      ].join("\n"),
      schema: INITIAL_REVIEW_SCHEMA,
    });

    const qualityScore = clamp(Number(parsed.qualityScore || fallback.qualityScore), 0, 100);
    const plagiarismScore = clamp(Number(parsed.plagiarismScore || fallback.plagiarismScore), 0, 100);
    return {
      ...fallback,
      qualityScore,
      plagiarismScore,
      aiStatus: ["approved", "pending", "rejected"].includes(parsed.aiStatus) ? parsed.aiStatus : fallback.aiStatus,
      aiSuggestion: normalizeWhitespace(parsed.aiSuggestion || fallback.aiSuggestion),
      aiScore: clamp(Math.round((qualityScore * 0.65) + ((100 - plagiarismScore) * 0.35)), 0, 100),
      provider: "ollama",
      model: getModerationModel(),
    };
  } catch (error) {
    console.error("Initial Ollama review error:", error.message);
    return fallback;
  }
}

async function buildAIReview(book) {
  const heuristic = buildInitialHeuristicReview(book);
  heuristic.provider = getConfiguredAiProvider();
  heuristic.model = heuristic.provider === "local" ? "local-heuristic" : getModerationModel();

  if (hasOpenAI()) {
    return buildOpenAiInitialReview(book, heuristic);
  }

  if (hasOllama()) {
    return buildOllamaInitialReview(book, heuristic);
  }

  return heuristic;
}

module.exports = {
  buildAIReview,
};
