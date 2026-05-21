const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  runLifecycleCampaigns,
  previewLifecycleCampaigns,
  getLifecycleExperimentConfig,
  normalizeLifecycleFilters,
} = require("../services/lifecycleCampaigns");
const {
  captureLifecycleStrategySnapshot,
} = require("../services/lifecycleStrategies");
const { isEmailConfigured } = require("../services/emailService");

const LIFECYCLE_EXPERIMENT_CONFIG = getLifecycleExperimentConfig();
const SUPPORTED_LIFECYCLE_MODES = LIFECYCLE_EXPERIMENT_CONFIG.supportedModes || [];

function parseLifecyclePayload(req) {
  const mode = String(req.body?.mode || req.query.mode || "all").trim().toLowerCase();
  const limit = Math.min(Math.max(parseInt(req.body?.limit || req.query.limit, 10) || 20, 1), 100);
  const force = String(req.body?.force || req.query.force || "false").toLowerCase() === "true";
  const variant = String(req.body?.variant || req.query.variant || "default").trim().toLowerCase();
  const filters = normalizeLifecycleFilters({
    ...(req.body?.filters || {}),
    cohortRole: req.body?.cohortRole || req.query.cohortRole || req.body?.filters?.cohortRole,
    marketplaceLanguage: req.body?.marketplaceLanguage || req.query.marketplaceLanguage || req.body?.filters?.marketplaceLanguage,
  });

  return {
    mode,
    limit,
    force,
    variant,
    filters,
  };
}

function hasValidCronSecret(req) {
  const configuredSecret = String(process.env.LIFECYCLE_CRON_SECRET || "").trim();
  const providedSecret = String(req.headers["x-cron-secret"] || req.query.secret || req.body?.secret || "").trim();

  return Boolean(configuredSecret) && configuredSecret === providedSecret;
}

async function authorizeLifecycleRun(req, res, next) {
  if (hasValidCronSecret(req)) {
    req.lifecycleInvoker = { type: "cron" };
    return next();
  }

  return protect(req, res, () => {
    const role = String(req.user?.role || "").toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin or cron access required" });
    }

    req.lifecycleInvoker = { type: "admin", userId: req.user.id };
    return next();
  });
}

router.get("/status", authorizeLifecycleRun, async (req, res) => {
  return res.json({
    success: true,
    emailConfigured: isEmailConfigured(),
    cronSecretConfigured: Boolean(String(process.env.LIFECYCLE_CRON_SECRET || "").trim()),
    invoker: req.lifecycleInvoker?.type || "unknown",
    supportedModes: SUPPORTED_LIFECYCLE_MODES,
    supportedVariants: LIFECYCLE_EXPERIMENT_CONFIG.supportedVariants || [],
    supportedFilters: LIFECYCLE_EXPERIMENT_CONFIG.filters || {},
  });
});

router.post("/preview", authorizeLifecycleRun, async (req, res) => {
  try {
    const payload = parseLifecyclePayload(req);
    const result = await previewLifecycleCampaigns(payload);
    return res.json({
      success: true,
      invoker: req.lifecycleInvoker?.type || "unknown",
      emailConfigured: isEmailConfigured(),
      supportedModes: SUPPORTED_LIFECYCLE_MODES,
      supportedVariants: LIFECYCLE_EXPERIMENT_CONFIG.supportedVariants || [],
      supportedFilters: LIFECYCLE_EXPERIMENT_CONFIG.filters || {},
      ...result,
    });
  } catch (error) {
    console.error("Lifecycle Preview Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lifecycle preview failed",
    });
  }
});

router.post("/run", authorizeLifecycleRun, async (req, res) => {
  try {
    const payload = parseLifecyclePayload(req);
    const result = await runLifecycleCampaigns(payload);
    return res.json({
      success: true,
      invoker: req.lifecycleInvoker?.type || "unknown",
      emailConfigured: isEmailConfigured(),
      supportedModes: SUPPORTED_LIFECYCLE_MODES,
      supportedVariants: LIFECYCLE_EXPERIMENT_CONFIG.supportedVariants || [],
      supportedFilters: LIFECYCLE_EXPERIMENT_CONFIG.filters || {},
      ...result,
    });
  } catch (error) {
    console.error("Lifecycle Run Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lifecycle campaigns failed",
    });
  }
});

router.post("/snapshot", authorizeLifecycleRun, async (req, res) => {
  try {
    const snapshot = await captureLifecycleStrategySnapshot({
      triggerType: req.lifecycleInvoker?.type === "cron" ? "cron" : "admin",
      triggeredBy: req.lifecycleInvoker?.type === "admin" ? req.user?.id || null : null,
      note: req.body?.note || req.query.note || "",
    });

    return res.json({
      success: true,
      invoker: req.lifecycleInvoker?.type || "unknown",
      snapshot,
    });
  } catch (error) {
    console.error("Lifecycle Snapshot Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lifecycle snapshot failed",
    });
  }
});

module.exports = router;
