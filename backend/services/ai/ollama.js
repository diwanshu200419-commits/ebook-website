const { normalizeWhitespace } = require("./text");

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getOllamaBaseUrl() {
  return readEnv("OLLAMA_BASE_URL").replace(/\/+$/, "");
}

function getOllamaModel() {
  return readEnv("OLLAMA_MODEL");
}

function getOllamaEmbeddingModel() {
  return readEnv("OLLAMA_EMBEDDING_MODEL");
}

function getOllamaAuthToken() {
  return readEnv("OLLAMA_AUTH_TOKEN");
}

function hasOllama() {
  return Boolean(getOllamaBaseUrl() && getOllamaModel());
}

function hasOllamaEmbeddings() {
  return Boolean(getOllamaBaseUrl() && getOllamaEmbeddingModel());
}

function getOllamaTimeoutMs() {
  const raw = Number(process.env.OLLAMA_TIMEOUT_MS || 90000);
  if (!Number.isFinite(raw) || raw < 1000) {
    return 90000;
  }

  return Math.round(raw);
}

async function postOllama(pathname, body) {
  if (typeof fetch !== "function") {
    throw new Error("This Node.js runtime does not expose the Fetch API needed for Ollama.");
  }

  const baseUrl = getOllamaBaseUrl();
  if (!baseUrl) {
    throw new Error("OLLAMA_BASE_URL is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOllamaTimeoutMs());

  try {
    const headers = {
      "Content-Type": "application/json",
    };
    const authToken = getOllamaAuthToken();
    if (authToken) {
      headers.Authorization = /^bearer\s+/i.test(authToken)
        ? authToken
        : `Bearer ${authToken}`;
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload = {};

    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Ollama returned a response that was not valid JSON.");
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Ollama request failed with status ${response.status}.`);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Ollama request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runStructuredOllamaChat({ instructions = "", prompt = "", schema }) {
  if (!hasOllama()) {
    return null;
  }

  const groundedPrompt = [
    normalizeWhitespace(prompt),
    schema
      ? `Return JSON only. Match this JSON schema exactly: ${JSON.stringify(schema)}`
      : "Return JSON only.",
  ].filter(Boolean).join("\n\n");

  const payload = await postOllama("/api/chat", {
    model: getOllamaModel(),
    stream: false,
    format: schema || "json",
    messages: [
      {
        role: "system",
        content: normalizeWhitespace(instructions),
      },
      {
        role: "user",
        content: groundedPrompt,
      },
    ],
    options: {
      temperature: 0,
    },
  });

  const content = normalizeWhitespace(payload?.message?.content || "");
  if (!content) {
    throw new Error("Ollama returned an empty response.");
  }

  return JSON.parse(content);
}

async function createOllamaEmbedding(input, dimensions = 0) {
  if (!hasOllamaEmbeddings()) {
    return [];
  }

  const body = {
    model: getOllamaEmbeddingModel(),
    input: normalizeWhitespace(input),
    truncate: true,
  };

  if (Number.isFinite(dimensions) && dimensions > 0) {
    body.dimensions = Math.round(dimensions);
  }

  const payload = await postOllama("/api/embed", body);
  return Array.isArray(payload?.embeddings?.[0]) ? payload.embeddings[0] : [];
}

module.exports = {
  createOllamaEmbedding,
  getOllamaBaseUrl,
  getOllamaAuthToken,
  getOllamaEmbeddingModel,
  getOllamaModel,
  hasOllama,
  hasOllamaEmbeddings,
  runStructuredOllamaChat,
};
