const OpenAI = require("openai");
const {
  getOllamaEmbeddingModel,
  getOllamaModel,
  hasOllama,
  hasOllamaEmbeddings,
} = require("./ollama");

let cachedClient = null;

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function hasOpenAI() {
  return Boolean(readEnv("OPENAI_API_KEY"));
}

function getOpenAIBaseUrl() {
  return readEnv("OPENAI_BASE_URL").replace(/\/+$/, "");
}

function getOpenAIClient() {
  if (!hasOpenAI()) {
    return null;
  }

  if (!cachedClient) {
    const baseURL = getOpenAIBaseUrl();
    cachedClient = new OpenAI({
      apiKey: readEnv("OPENAI_API_KEY"),
      ...(baseURL ? { baseURL } : {}),
    });
  }

  return cachedClient;
}

function getModerationModel() {
  if (hasOpenAI()) {
    return readEnv("OPENAI_MODERATION_MODEL") || "gpt-4o-mini";
  }

  if (hasOllama()) {
    return getOllamaModel();
  }

  return "local-heuristic";
}

function getEmbeddingModel() {
  if (hasOpenAI()) {
    return readEnv("OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small";
  }

  if (hasOllamaEmbeddings()) {
    return getOllamaEmbeddingModel();
  }

  return "";
}

function getEmbeddingDimensions() {
  const raw = hasOpenAI()
    ? Number(readEnv("OPENAI_EMBEDDING_DIMENSIONS") || 512)
    : Number(readEnv("OLLAMA_EMBEDDING_DIMENSIONS") || 0);

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
  getOpenAIBaseUrl,
  getModerationModel,
  getEmbeddingDimensions,
  getEmbeddingModel,
  hasOpenAI,
  hasOllama,
  hasOllamaEmbeddings,
};
