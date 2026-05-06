// Centralized runtime config for static frontend
// Keep this file in sync with your deployed backend URL.
(function () {
  var configuredBase = "https://ebook-website-v2mj.onrender.com";
  if (window.location.protocol === "https:" && /^http:\/\//i.test(configuredBase)) {
    configuredBase = configuredBase.replace(/^http:\/\//i, "https://");
  }
  window.API_BASE = configuredBase.replace(/\/$/, "");
})();

