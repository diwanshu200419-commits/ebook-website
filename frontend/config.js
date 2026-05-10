// Centralized runtime config for static frontend
// Keep this file in sync with your deployed backend URL.
(function () {
  var configuredBackend = "https://ebook-website-v2mj.onrender.com";
  var hostname = window.location.hostname || "";
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
  var isFilePreview = window.location.protocol === "file:";

  if (window.location.protocol === "https:" && /^http:\/\//i.test(configuredBackend)) {
    configuredBackend = configuredBackend.replace(/^http:\/\//i, "https://");
  }

  configuredBackend = configuredBackend.replace(/\/$/, "");

  window.BACKEND_ORIGIN = configuredBackend;
  window.API_BASE = isLocalHost || isFilePreview ? configuredBackend : "";
})();

