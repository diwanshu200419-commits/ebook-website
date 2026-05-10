const LEGACY_FRONTEND_ORIGIN = "https://ebook-website-theta-nine.vercel.app";
const DEFAULT_DEV_FRONTEND_BASE = "http://127.0.0.1:5501/frontend";
const DEFAULT_DEV_FRONTEND_ORIGINS = [
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://localhost:5173"
];

const isProduction = () => process.env.NODE_ENV === "production";

const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const normalizePath = (value) => {
  const path = String(value || "/login.html").trim();
  return path.startsWith("/") ? path : `/${path}`;
};

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => normalizeUrl(entry))
    .filter(Boolean);

const getConfiguredFrontendUrls = () =>
  unique(
    [process.env.CLIENT_URL, process.env.FRONTEND_URL]
      .map((value) => normalizeUrl(value))
      .filter(Boolean)
  );

const getUrlOrigin = (value) => {
  const parsed = parseUrl(normalizeUrl(value));
  return parsed ? parsed.origin : "";
};

const buildFrontendUrl = (baseUrl, fallbackPath = "/login.html") => {
  const normalizedBase = normalizeUrl(baseUrl);
  const parsed = parseUrl(normalizedBase);

  if (!parsed) {
    return "";
  }

  const pathname = parsed.pathname || "/";
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return `${parsed.origin}${pathname}${parsed.search || ""}`;
  }

  const normalizedFallback = normalizePath(fallbackPath);
  const trimmedPath = pathname === "/" ? "" : pathname.replace(/\/$/, "");

  return `${parsed.origin}${trimmedPath}${normalizedFallback}`;
};

const normalizeFrontendPath = (pathname, fallbackPath = "/login.html") => {
  const fallback = normalizePath(fallbackPath);
  const currentPath = pathname || "/";

  if (currentPath === "/" || currentPath === "") {
    return fallback;
  }

  if (currentPath === "/frontend" || currentPath === "/frontend/") {
    return "/frontend/login.html";
  }

  if (currentPath === "/login") return "/login.html";
  if (currentPath === "/register") return "/register.html";
  if (currentPath === "/dashboard") return "/dashboard/dashboard.html";
  if (currentPath === "/admin") return "/admin/admin.html";

  if (/\.[a-z0-9]+$/i.test(currentPath)) {
    return currentPath;
  }

  if (currentPath.endsWith("/frontend")) {
    return `${currentPath}/login.html`;
  }

  if (currentPath.endsWith("/frontend/")) {
    return `${currentPath}login.html`;
  }

  return fallback;
};

const getFrontendBaseUrl = () => {
  const configured = getConfiguredFrontendUrls()[0];
  if (configured) {
    return configured;
  }

  return isProduction() ? "" : DEFAULT_DEV_FRONTEND_BASE;
};

const getAllowedFrontendOrigins = () => {
  const configuredOrigins = getConfiguredFrontendUrls()
    .map((value) => getUrlOrigin(value))
    .filter(Boolean);

  const extraOrigins = splitCsv(process.env.ALLOWED_ORIGINS)
    .map((value) => getUrlOrigin(value))
    .filter(Boolean);

  const localOrigins = isProduction() ? [] : DEFAULT_DEV_FRONTEND_ORIGINS;

  return unique([
    ...configuredOrigins,
    ...extraOrigins,
    LEGACY_FRONTEND_ORIGIN,
    ...localOrigins
  ]);
};

const resolveFrontendRedirectUrl = (input, fallbackPath = "/login.html") => {
  const fallbackUrl = buildFrontendUrl(getFrontendBaseUrl(), fallbackPath);

  if (!input) {
    return fallbackUrl;
  }

  let decodedValue = String(input || "").trim();
  try {
    decodedValue = decodeURIComponent(decodedValue);
  } catch {
    decodedValue = String(input || "").trim();
  }

  const parsed = parseUrl(decodedValue);
  if (!parsed) {
    return fallbackUrl;
  }

  const allowedOrigins = new Set(getAllowedFrontendOrigins());
  if (!allowedOrigins.has(parsed.origin)) {
    return fallbackUrl;
  }

  const safePath = normalizeFrontendPath(parsed.pathname, fallbackPath);
  return `${parsed.origin}${safePath}${parsed.search || ""}`;
};

const getBackendBaseUrl = () => {
  const configured = normalizeUrl(
    process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      (!isProduction() ? `http://localhost:${process.env.PORT || 5000}` : "")
  );

  return configured;
};

const getGoogleCallbackUrl = () => {
  const configuredCallback = normalizeUrl(process.env.GOOGLE_CALLBACK_URL);
  if (configuredCallback) {
    return configuredCallback;
  }

  const backendBaseUrl = getBackendBaseUrl();
  return backendBaseUrl ? `${backendBaseUrl}/api/auth/google/callback` : "";
};

module.exports = {
  getAllowedFrontendOrigins,
  getBackendBaseUrl,
  getFrontendBaseUrl,
  getGoogleCallbackUrl,
  getUrlOrigin,
  isProduction,
  normalizeUrl,
  resolveFrontendRedirectUrl
};
