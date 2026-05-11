const OpenAI = require("openai");
const {
  getOllamaEmbeddingModel,
  getOllamaModel,
  hasOllama,
  hasOllamaEmbeddings,
} = require("./ollama");

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
  if (hasOpenAI()) {
    return process.env.OPENAI_MODERATION_MODEL || "gpt-4o-mini";
  }

  if (hasOllama()) {
    return getOllamaModel();
  }

  return "local-heuristic";
}

function getEmbeddingModel() {
  if (hasOpenAI()) {
    return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  }

  if (hasOllamaEmbeddings()) {
    return getOllamaEmbeddingModel();
  }

  return "";
}

function getEmbeddingDimensions() {
  const raw = hasOpenAI()
    ? Number(process.env.OPENAI_EMBEDDING_DIMENSIONS || 512)
    : Number(process.env.OLLAMA_EMBEDDING_DIMENSIONS || 0);

  if (!Number.isFinite(raw) || raw <= 0) {
    return hasOpenAI() ? 512 : 0;
  }

  return Math.round(raw);
}

function getConfiguredAiProvider() {
  if (hasOpenAI()) {
    return "openai";
  }

  if (hasOllama()) {
    return "ollama";
  }

  return "local";
}

module.exports = {
  getConfiguredAiProvider,
  getOpenAIClient,
  getModerationModel,
  getEmbeddingDimensions,
  getEmbeddingModel,
  hasOpenAI,
  hasOllama,
  hasOllamaEmbeddings,
};
