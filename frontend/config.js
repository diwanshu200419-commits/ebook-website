// Centralized runtime config for the static frontend.
// In production on Vercel, same-origin /api and /uploads routes are handled
// by Vercel proxy functions, so API_BASE stays empty there.
(function () {
  var hostname = window.location.hostname || "";
  var protocol = window.location.protocol || "";
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
  var isFilePreview = protocol === "file:";
  var url = new URL(window.location.href);
  var queryOverride = (url.searchParams.get("apiBase") || "").trim();
  var metaOverride = "";
  var globalOverride = "";
  var storedOverride = "";
  var localDefaultBackend = "http://localhost:5000";
  var localDefaultFrontend = "http://127.0.0.1:5501/frontend";

  try {
    var metaTag = document.querySelector('meta[name="ebook-backend-origin"]');
    metaOverride = metaTag ? String(metaTag.getAttribute("content") || "").trim() : "";
  } catch (error) {
    metaOverride = "";
  }

  try {
    globalOverride = String(window.__EBOOK_BACKEND_ORIGIN__ || "").trim();
  } catch (error) {
    globalOverride = "";
  }

  try {
    storedOverride = (window.sessionStorage.getItem("ebookApiBase") || "").trim();
  } catch (error) {
    storedOverride = "";
  }

  if (queryOverride) {
    try {
      window.sessionStorage.setItem("ebookApiBase", queryOverride);
    } catch (error) {
      // Ignore storage failures and just use the query override for this load.
    }
  }

  function normalizeOrigin(value) {
    return String(value || "").trim().replace(/\/$/, "");
  }

  var overrideBackend = normalizeOrigin(
    queryOverride ||
    metaOverride ||
    globalOverride ||
    storedOverride
  );

  var localBackend = normalizeOrigin(localDefaultBackend);
  var backendOrigin = overrideBackend || (isLocalHost || isFilePreview ? localBackend : "");

  function normalizePath(value) {
    var source = String(value || "/login.html").trim();
    if (!source) {
      return "/login.html";
    }

    return source.charAt(0) === "/" ? source : "/" + source;
  }

  function buildPreferredFrontendReturnUrl(pathname) {
    var safePath = normalizePath(pathname);

    if (protocol === "http:" || protocol === "https:") {
      return new URL(safePath, window.location.href).href;
    }

    if (isFilePreview) {
      return normalizeOrigin(localDefaultFrontend) + safePath;
    }

    return safePath;
  }

  window.BACKEND_ORIGIN = backendOrigin;
  window.API_BASE = isLocalHost || isFilePreview ? backendOrigin : "";
  window.getFrontendReturnUrl = buildPreferredFrontendReturnUrl;
})();
