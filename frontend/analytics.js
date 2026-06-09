(function () {
  var MEASUREMENT_ID = "G-KMJ0XPRDR0";

  if (window.__EBOOK_ANALYTICS_BOOTSTRAPPED__) {
    return;
  }

  window.__EBOOK_ANALYTICS_BOOTSTRAPPED__ = true;
  window.EBOOK_GA_MEASUREMENT_ID = MEASUREMENT_ID;
  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  if (typeof window.gtag !== "function") {
    window.gtag = gtag;
  }

  function isLocalRuntime() {
    var hostname = String(window.location.hostname || "").trim().toLowerCase();
    var protocol = String(window.location.protocol || "").trim().toLowerCase();
    return protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1";
  }

  function normalizeNumber(value) {
    var parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  window.trackAnalyticsEvent = function trackAnalyticsEvent(eventName, params) {
    if (!eventName || typeof window.gtag !== "function" || isLocalRuntime()) {
      return;
    }

    window.gtag("event", eventName, params || {});
  };

  window.trackStoreContactIntent = function trackStoreContactIntent(method, payload) {
    var details = payload && typeof payload === "object" ? payload : {};
    var itemCount = normalizeNumber(details.itemCount);
    var value = normalizeNumber(details.value);

    window.trackAnalyticsEvent("generate_lead", {
      event_category: "contact_order",
      event_label: String(method || "unknown"),
      currency: details.currency || "INR",
      value: value,
      contact_method: String(method || "unknown"),
      item_id: String(details.itemId || ""),
      item_name: String(details.itemName || ""),
      item_count: itemCount,
      source_page: String(details.sourcePage || window.location.pathname || "/"),
      page_location: String(window.location.href || ""),
    });
  };

  if (!MEASUREMENT_ID || isLocalRuntime()) {
    return;
  }

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
  });

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(script);
})();
