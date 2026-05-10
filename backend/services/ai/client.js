const OpenAI = require("openai");

let cachedClient = null;

function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAIClient() {
  if (!hasOpenAI()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return cachedClient;
}

function getModerationModel() {
  return process.env.OPENAI_MODERATION_MODEL || "gpt-4o-mini";
}

function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}

function getEmbeddingDimensions() {
  const raw = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS || 512);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 512;
  }

  return Math.round(raw);
}

module.exports = {
  getOpenAIClient,
  getModerationModel,
  getEmbeddingDimensions,
  getEmbeddingModel,
  hasOpenAI,
};
