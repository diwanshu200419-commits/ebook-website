// Centralized runtime config for static frontend
// Keep this file in sync with your deployed backend URL.
(function () {
  var configuredBackend = "https://ebook-website-v2mj.onrender.com";
  var hostname = window.location.hostname || "";
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
  var isFilePreview = window.location.protocol === "file:";
  var url = new URL(window.location.href);
  var queryOverride = (url.searchParams.get("apiBase") || "").trim();
  var storedOverride = "";

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

  if (window.location.protocol === "https:" && /^http:\/\//i.test(configuredBackend)) {
    configuredBackend = configuredBackend.replace(/^http:\/\//i, "https://");
  }

  configuredBackend = configuredBackend.replace(/\/$/, "");

  var overrideBackend = (queryOverride || storedOverride).replace(/\/$/, "");
  var backendOrigin = overrideBackend || configuredBackend;

  window.BACKEND_ORIGIN = backendOrigin;
  window.API_BASE = isLocalHost || isFilePreview ? backendOrigin : "";
})();

