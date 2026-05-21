const { getBackendBaseUrl, getFrontendBaseUrl, normalizeUrl } = require("../utils/urlConfig");
const { describeUploadStorage } = require("../utils/uploads");
const { getConfiguredAiProvider, hasOpenAI, hasOllama } = require("./ai/client");
const { getSupportedMarkets, hasAutomaticTaxEnabled, hasStripeEnabled } = require("./globalMarkets");

function createCheck(key, label, status, summary, details = []) {
  return {
    key,
    label,
    status,
    summary,
    details,
  };
}

function isHttpsUrl(value) {
  return String(value || "").trim().toLowerCase().startsWith("https://");
}

function getLaunchReadinessSummary() {
  const frontendUrl = normalizeUrl(getFrontendBaseUrl());
  const backendUrl = normalizeUrl(getBackendBaseUrl());
  const stripeWebhookConfigured = Boolean(String(process.env.STRIPE_WEBHOOK_SECRET || "").trim());
  const emailConfigured = Boolean(String(process.env.RESEND_API_KEY || process.env.EMAIL_WEBHOOK_URL || "").trim());
  const emailFromConfigured = Boolean(String(process.env.EMAIL_FROM || process.env.ADMIN_EMAIL || "").trim());
  const googleAuthConfigured = Boolean(
    String(process.env.GOOGLE_CLIENT_ID || "").trim() &&
    String(process.env.GOOGLE_CLIENT_SECRET || "").trim()
  );
  const cronConfigured = Boolean(String(process.env.LIFECYCLE_CRON_SECRET || "").trim());
  const databaseConfigured = Boolean(String(process.env.MONGO_URI || "").trim());
  const jwtConfigured = Boolean(String(process.env.JWT_SECRET || "").trim());
  const storage = describeUploadStorage();
  const aiProvider = getConfiguredAiProvider();
  const aiReady = hasOpenAI() || hasOllama();

  const checks = [
    createCheck(
      "database",
      "Database",
      databaseConfigured ? "ready" : "blocked",
      databaseConfigured ? "MongoDB connection string is configured." : "MONGO_URI is missing.",
      databaseConfigured ? ["Atlas or Mongo runtime can connect when the backend boots."] : ["Set MONGO_URI before production deploy."]
    ),
    createCheck(
      "auth",
      "Authentication",
      jwtConfigured && googleAuthConfigured ? "ready" : jwtConfigured ? "warning" : "blocked",
      jwtConfigured && googleAuthConfigured
        ? "JWT auth and Google OAuth are configured."
        : jwtConfigured
          ? "JWT auth is configured, but Google OAuth is incomplete."
          : "JWT secret is missing.",
      [
        jwtConfigured ? "JWT signing secret is present." : "Add JWT_SECRET.",
        googleAuthConfigured ? "Google OAuth client credentials are present." : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for social sign-in.",
      ]
    ),
    createCheck(
      "payments",
      "Payments",
      hasStripeEnabled() && stripeWebhookConfigured ? "ready" : hasStripeEnabled() ? "warning" : "blocked",
      hasStripeEnabled() && stripeWebhookConfigured
        ? "Stripe card checkout and webhook verification are configured."
        : hasStripeEnabled()
          ? "Stripe checkout is on, but webhook verification is incomplete."
          : "Stripe is not configured for live card payments.",
      [
        hasStripeEnabled() ? "STRIPE_SECRET_KEY is present." : "Add STRIPE_SECRET_KEY.",
        stripeWebhookConfigured ? "STRIPE_WEBHOOK_SECRET is present." : "Add STRIPE_WEBHOOK_SECRET.",
        hasAutomaticTaxEnabled()
          ? "Automatic tax is enabled for checkout sessions."
          : "Automatic tax is off. Set STRIPE_AUTOMATIC_TAX=true when ready.",
      ]
    ),
    createCheck(
      "email",
      "Lifecycle Email",
      emailConfigured && emailFromConfigured ? "ready" : emailConfigured ? "warning" : "warning",
      emailConfigured && emailFromConfigured
        ? "Lifecycle and transactional emails can be delivered."
        : emailConfigured
          ? "Email transport is configured, but the sender identity is incomplete."
          : "Email delivery is not configured yet.",
      [
        emailConfigured ? "At least one outbound email transport is configured." : "Set RESEND_API_KEY or EMAIL_WEBHOOK_URL.",
        emailFromConfigured ? "EMAIL_FROM or ADMIN_EMAIL is configured." : "Set EMAIL_FROM for branded production email.",
      ]
    ),
    createCheck(
      "urls",
      "Public URLs",
      frontendUrl && backendUrl && isHttpsUrl(frontendUrl) && isHttpsUrl(backendUrl) ? "ready" : frontendUrl && backendUrl ? "warning" : "blocked",
      frontendUrl && backendUrl
        ? "Frontend and backend URLs are configured."
        : "Frontend or backend public URL is missing.",
      [
        frontendUrl ? `Frontend: ${frontendUrl}` : "Set FRONTEND_URL or CLIENT_URL.",
        backendUrl ? `Backend: ${backendUrl}` : "Set BACKEND_URL or RENDER_EXTERNAL_URL.",
        isHttpsUrl(frontendUrl) && isHttpsUrl(backendUrl)
          ? "Both public surfaces are HTTPS-ready."
          : "Use HTTPS URLs for both frontend and backend in production.",
      ]
    ),
    createCheck(
      "storage",
      "File Storage",
      storage.provider !== "local" || storage.usesExternalPublicBase ? "ready" : "warning",
      storage.provider !== "local" || storage.usesExternalPublicBase
        ? `Upload storage is configured for ${storage.provider}${storage.publicBaseUrl ? " with an external public asset base" : ""}.`
        : "Uploads still use backend-local disk paths.",
      [
        storage.servesLocally
          ? "Backend can still serve upload assets directly."
          : "Public upload delivery is expected to happen from the external asset base.",
        storage.publicBaseUrl
          ? `Public asset base: ${storage.publicBaseUrl}`
          : "Set UPLOAD_PUBLIC_BASE_URL when moving public assets to a CDN or object storage domain.",
        `Current upload root: ${storage.uploadsRoot}`,
      ]
    ),
    createCheck(
      "ai",
      "AI Layer",
      aiReady ? "ready" : "warning",
      aiReady
        ? `AI services are configured with ${aiProvider}.`
        : "AI routes fall back to local heuristics only.",
      [
        hasOpenAI() ? "OpenAI API access is configured." : "OpenAI API access is not configured.",
        hasOllama() ? "Ollama runtime is available." : "Ollama runtime is not configured.",
      ]
    ),
    createCheck(
      "automation",
      "Lifecycle Automation",
      cronConfigured ? "ready" : "warning",
      cronConfigured
        ? "Lifecycle cron secret is configured for scheduled growth campaigns."
        : "Lifecycle automation can run manually, but the cron secret is missing.",
      [
        cronConfigured ? "Scheduled lifecycle jobs can be protected." : "Set LIFECYCLE_CRON_SECRET before enabling scheduled jobs.",
      ]
    ),
  ];

  const blockerCount = checks.filter((check) => check.status === "blocked").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const readyCount = checks.filter((check) => check.status === "ready").length;
  const overallStatus = blockerCount ? "blocked" : warningCount ? "warning" : "ready";

  return {
    generatedAt: new Date().toISOString(),
    overallStatus,
    blockerCount,
    warningCount,
    readyCount,
    supportedMarkets: getSupportedMarkets(),
    checks,
    nextSteps: checks
      .filter((check) => check.status !== "ready")
      .slice(0, 4)
      .map((check) => `${check.label}: ${check.summary}`),
  };
}

module.exports = {
  getLaunchReadinessSummary,
};
