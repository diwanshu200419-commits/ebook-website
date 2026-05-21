const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getBackendProxyOrigin() {
  return normalizeOrigin(
    process.env.BACKEND_PROXY_ORIGIN
      || process.env.BACKEND_URL
      || process.env.RENDER_EXTERNAL_URL
      || ""
  );
}

function buildPublicOrigin(req) {
  const protocol = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();

  return host ? `${protocol}://${host}` : "";
}

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return typeof value === "undefined" ? "" : String(value);
}

function buildForwardHeaders(headers = {}, publicOrigin = "") {
  const nextHeaders = {};

  Object.entries(headers).forEach(([key, value]) => {
    const normalizedKey = String(key || "").toLowerCase();
    if (!normalizedKey || HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return;
    }

    const normalizedValue = normalizeHeaderValue(value);
    if (!normalizedValue) {
      return;
    }

    nextHeaders[normalizedKey] = normalizedValue;
  });

  if (publicOrigin) {
    nextHeaders.origin = publicOrigin;
  }

  return nextHeaders;
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length ? Buffer.concat(chunks) : null;
}

function shouldSendBody(method = "GET") {
  const normalizedMethod = String(method || "GET").trim().toUpperCase();
  return !["GET", "HEAD"].includes(normalizedMethod);
}

function rewriteLocationHeader(value, backendOrigin, publicOrigin) {
  const location = String(value || "").trim();
  if (!location || !publicOrigin) {
    return location;
  }

  if (location.startsWith(backendOrigin)) {
    return `${publicOrigin}${location.slice(backendOrigin.length)}`;
  }

  if (location.startsWith("/")) {
    return `${publicOrigin}${location}`;
  }

  return location;
}

function writeProxyHeaders(res, upstream, backendOrigin, publicOrigin) {
  upstream.headers.forEach((value, key) => {
    const normalizedKey = String(key || "").toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return;
    }

    if (normalizedKey === "location") {
      res.setHeader(key, rewriteLocationHeader(value, backendOrigin, publicOrigin));
      return;
    }

    res.setHeader(key, value);
  });
}

async function proxyRequest(req, res) {
  const backendOrigin = getBackendProxyOrigin();
  if (!backendOrigin) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      success: false,
      message: "BACKEND_PROXY_ORIGIN is not configured.",
    }));
    return;
  }

  const requestUrl = String(req.url || "/");
  const publicOrigin = buildPublicOrigin(req);
  const targetUrl = new URL(requestUrl, `${backendOrigin}/`).toString();
  const method = String(req.method || "GET").toUpperCase();
  const body = shouldSendBody(method) ? await readRequestBody(req) : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers: buildForwardHeaders(req.headers, publicOrigin),
    body: body || undefined,
    redirect: "manual",
  });

  res.statusCode = upstream.status;
  writeProxyHeaders(res, upstream, backendOrigin, publicOrigin);

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.end(buffer);
}

module.exports = {
  proxyRequest,
};
