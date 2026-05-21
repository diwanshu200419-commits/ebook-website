const LifecycleStrategy = require("../models/LifecycleStrategy");
const LifecycleStrategySnapshot = require("../models/LifecycleStrategySnapshot");
const {
  CRM_CAMPAIGN_KEYS,
  SUPPORTED_CAMPAIGN_VARIANTS,
  getCampaignAnalytics,
  getCampaignDefinition,
  normalizeCampaignKey,
  normalizeCampaignVariant,
} = require("./campaignTelemetry");

const STRATEGY_MODES = ["auto", "manual"];

function formatVariantLabel(variant = "default") {
  const normalized = normalizeCampaignVariant(variant);
  if (normalized === "social_proof") {
    return "Social Proof";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeStrategyMode(value = "auto") {
  const mode = String(value || "auto").trim().toLowerCase();
  return STRATEGY_MODES.includes(mode) ? mode : "auto";
}

function sanitizeNotes(value = "") {
  return String(value || "").trim().slice(0, 300);
}

function sanitizeReason(value = "") {
  return String(value || "").trim().slice(0, 200);
}

function normalizeLifecycleStrategyPayload(payload = {}) {
  return {
    resolutionMode: normalizeStrategyMode(payload.resolutionMode),
    manualVariant: normalizeCampaignVariant(payload.manualVariant),
    fallbackVariant: normalizeCampaignVariant(payload.fallbackVariant),
    notes: sanitizeNotes(payload.notes),
    reason: sanitizeReason(payload.reason),
  };
}

function buildStrategyMaps(analytics = {}) {
  const recommendations = Array.isArray(analytics.experimentInsights?.recommendations)
    ? analytics.experimentInsights.recommendations
    : [];
  const breakdown = Array.isArray(analytics.breakdown) ? analytics.breakdown : [];
  const promotedVariants = analytics.experimentInsights?.promotedVariants || {};

  return {
    recommendationMap: recommendations.reduce((result, entry) => {
      result[String(entry.campaignKey || "")] = entry;
      return result;
    }, {}),
    breakdownMap: breakdown.reduce((result, entry) => {
      result[String(entry.campaignKey || "")] = entry;
      return result;
    }, {}),
    promotedVariants,
  };
}

function serializeUpdatedBy(updatedBy = null) {
  if (!updatedBy) {
    return null;
  }

  return {
    id: String(updatedBy._id || ""),
    name: updatedBy.name || updatedBy.username || "Admin",
    email: updatedBy.email || "",
    username: updatedBy.username || "",
  };
}

function serializeStrategyHistory(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .slice()
    .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
    .slice(0, 6)
    .map((entry) => ({
      resolutionMode: normalizeStrategyMode(entry?.resolutionMode || "auto"),
      manualVariant: normalizeCampaignVariant(entry?.manualVariant || "default"),
      manualVariantLabel: formatVariantLabel(entry?.manualVariant || "default"),
      fallbackVariant: normalizeCampaignVariant(entry?.fallbackVariant || "default"),
      fallbackVariantLabel: formatVariantLabel(entry?.fallbackVariant || "default"),
      notes: String(entry?.notes || ""),
      reason: String(entry?.reason || ""),
      updatedAt: entry?.updatedAt || null,
      updatedBy: serializeUpdatedBy(entry?.updatedBy),
    }));
}

function buildLifecycleStrategySnapshot({
  campaignKey,
  document = null,
  analytics = {},
}) {
  const normalizedKey = normalizeCampaignKey(campaignKey);
  const definition = getCampaignDefinition(normalizedKey);
  const { recommendationMap, breakdownMap, promotedVariants } = buildStrategyMaps(analytics);
  const recommendation = recommendationMap[normalizedKey] || null;
  const breakdown = breakdownMap[normalizedKey] || null;

  const resolutionMode = normalizeStrategyMode(document?.resolutionMode || "auto");
  const manualVariant = normalizeCampaignVariant(document?.manualVariant || "default");
  const fallbackVariant = normalizeCampaignVariant(document?.fallbackVariant || "default");
  const promotedVariant = normalizeCampaignVariant(promotedVariants[normalizedKey] || "");

  let activeVariant = fallbackVariant;
  let activeSource = fallbackVariant === "default" ? "default_fallback" : "strategy_fallback";

  if (resolutionMode === "manual") {
    activeVariant = manualVariant;
    activeSource = "admin_manual";
  } else if (promotedVariants[normalizedKey]) {
    activeVariant = promotedVariant;
    activeSource = "auto_promoted";
  }

  return {
    campaignKey: normalizedKey,
    label: definition.label,
    description: definition.description,
    resolutionMode,
    strategyModes: STRATEGY_MODES,
    manualVariant,
    manualVariantLabel: formatVariantLabel(manualVariant),
    fallbackVariant,
    fallbackVariantLabel: formatVariantLabel(fallbackVariant),
    supportedVariants: SUPPORTED_CAMPAIGN_VARIANTS,
    activeVariant,
    activeVariantLabel: formatVariantLabel(activeVariant),
    activeSource,
    notes: String(document?.notes || ""),
    history: serializeStrategyHistory(document?.history || []),
    updatedAt: document?.updatedAt || null,
    updatedBy: serializeUpdatedBy(document?.updatedBy),
    suggestedWinner: recommendation
      ? {
          variant: normalizeCampaignVariant(recommendation.winningVariant || "default"),
          variantLabel: recommendation.winningVariantLabel || formatVariantLabel(recommendation.winningVariant || "default"),
          conversionRate: Number(recommendation.conversionRate || 0),
          leadRate: Number(recommendation.leadRate || 0),
          sent: Number(recommendation.sent || 0),
          converted: Number(recommendation.converted || 0),
          confidence: recommendation.confidence || "collecting",
          action: recommendation.action || "observe",
          rationale: recommendation.rationale || "",
        }
      : null,
    stats: breakdown
      ? {
          sent: Number(breakdown.sent || 0),
          converted: Number(breakdown.converted || 0),
          conversionRate: Number(breakdown.conversionRate || 0),
          emailDelivered: Number(breakdown.emailDelivered || 0),
          primaryMetricType: breakdown.primaryMetricType || "currency",
          primaryMetricValue: breakdown.primaryMetricValue || 0,
          creatorRevenueInfluenced: Number(breakdown.creatorRevenueInfluenced || 0),
          platformRevenueInfluenced: Number(breakdown.platformRevenueInfluenced || 0),
        }
      : {
          sent: 0,
          converted: 0,
          conversionRate: 0,
          emailDelivered: 0,
          primaryMetricType: "currency",
          primaryMetricValue: 0,
          creatorRevenueInfluenced: 0,
          platformRevenueInfluenced: 0,
        },
  };
}

async function getLifecycleStrategyDocument(campaignKey) {
  const normalizedKey = normalizeCampaignKey(campaignKey);
  if (!normalizedKey) {
    return null;
  }

  return LifecycleStrategy.findOne({ campaignKey: normalizedKey })
    .populate("updatedBy", "name email username")
    .populate("history.updatedBy", "name email username")
    .lean();
}

async function listLifecycleStrategies({ analytics = null } = {}) {
  const resolvedAnalytics = analytics || await getCampaignAnalytics({ days: 90, limit: 180 });
  const documents = await LifecycleStrategy.find({
    campaignKey: { $in: CRM_CAMPAIGN_KEYS },
  })
    .populate("updatedBy", "name email username")
    .populate("history.updatedBy", "name email username")
    .lean();

  const documentMap = documents.reduce((result, document) => {
    result[String(document.campaignKey || "")] = document;
    return result;
  }, {});

  return CRM_CAMPAIGN_KEYS.map((campaignKey) => buildLifecycleStrategySnapshot({
    campaignKey,
    document: documentMap[campaignKey] || null,
    analytics: resolvedAnalytics,
  }));
}

async function resolveLifecycleStrategyVariant(campaignKey, { analytics = null } = {}) {
  const normalizedKey = normalizeCampaignKey(campaignKey);
  if (!normalizedKey) {
    return {
      campaignKey: "",
      resolutionMode: "auto",
      appliedVariant: "default",
      variantSource: "not_applicable",
      manualVariant: "default",
      fallbackVariant: "default",
      suggestedWinner: null,
    };
  }

  const [resolvedAnalytics, document] = await Promise.all([
    analytics || getCampaignAnalytics({ days: 90, limit: 180 }),
    getLifecycleStrategyDocument(normalizedKey),
  ]);
  const snapshot = buildLifecycleStrategySnapshot({
    campaignKey: normalizedKey,
    document,
    analytics: resolvedAnalytics,
  });

  return {
    campaignKey: normalizedKey,
    resolutionMode: snapshot.resolutionMode,
    appliedVariant: snapshot.activeVariant,
    variantSource: snapshot.activeSource,
    manualVariant: snapshot.manualVariant,
    fallbackVariant: snapshot.fallbackVariant,
    suggestedWinner: snapshot.suggestedWinner,
  };
}

async function updateLifecycleStrategy(campaignKey, payload = {}, adminUserId = null, analytics = null) {
  const normalizedKey = normalizeCampaignKey(campaignKey);
  if (!normalizedKey) {
    throw new Error("Invalid campaign key");
  }

  const normalizedPayload = normalizeLifecycleStrategyPayload(payload);
  let strategy = await LifecycleStrategy.findOne({ campaignKey: normalizedKey });
  if (!strategy) {
    strategy = new LifecycleStrategy({ campaignKey: normalizedKey });
  }

  strategy.resolutionMode = normalizedPayload.resolutionMode;
  strategy.manualVariant = normalizedPayload.manualVariant;
  strategy.fallbackVariant = normalizedPayload.fallbackVariant;
  strategy.notes = normalizedPayload.notes;
  strategy.updatedBy = adminUserId || null;
  strategy.history = [
    {
      resolutionMode: normalizedPayload.resolutionMode,
      manualVariant: normalizedPayload.manualVariant,
      fallbackVariant: normalizedPayload.fallbackVariant,
      notes: normalizedPayload.notes,
      reason: normalizedPayload.reason,
      updatedBy: adminUserId || null,
      updatedAt: new Date(),
    },
    ...(Array.isArray(strategy.history) ? strategy.history : []),
  ].slice(0, 20);
  await strategy.save();

  const [resolvedAnalytics, populated] = await Promise.all([
    analytics || getCampaignAnalytics({ days: 90, limit: 180 }),
    LifecycleStrategy.findById(strategy._id)
      .populate("updatedBy", "name email username")
      .populate("history.updatedBy", "name email username")
      .lean(),
  ]);

  return buildLifecycleStrategySnapshot({
    campaignKey: normalizedKey,
    document: populated,
    analytics: resolvedAnalytics,
  });
}

async function listLifecycleStrategySnapshots({ limit = 8 } = {}) {
  const snapshots = await LifecycleStrategySnapshot.find({})
    .sort({ capturedAt: -1, createdAt: -1 })
    .limit(Math.max(Number(limit || 8), 1))
    .populate("triggeredBy", "name email username")
    .lean();

  return snapshots.map((snapshot) => ({
    id: String(snapshot._id || ""),
    triggerType: String(snapshot.triggerType || "admin"),
    note: String(snapshot.note || ""),
    windowDays: Number(snapshot.windowDays || 90),
    capturedAt: snapshot.capturedAt || snapshot.createdAt || null,
    triggeredBy: serializeUpdatedBy(snapshot.triggeredBy),
    summary: snapshot.summary || {},
    promotedVariants: snapshot.promotedVariants || {},
    campaigns: Array.isArray(snapshot.campaigns) ? snapshot.campaigns : [],
  }));
}

async function captureLifecycleStrategySnapshot({
  triggerType = "admin",
  triggeredBy = null,
  note = "",
  analytics = null,
} = {}) {
  const resolvedAnalytics = analytics || await getCampaignAnalytics({ days: 90, limit: 180 });
  const strategies = await listLifecycleStrategies({ analytics: resolvedAnalytics });

  const snapshot = await LifecycleStrategySnapshot.create({
    triggerType: ["admin", "cron", "system"].includes(String(triggerType || "").toLowerCase())
      ? String(triggerType || "").toLowerCase()
      : "admin",
    triggeredBy: triggeredBy || null,
    note: sanitizeNotes(note),
    windowDays: Number(resolvedAnalytics.summary?.windowDays || 90),
    summary: {
      totalSent: Number(resolvedAnalytics.summary?.totalSent || 0),
      converted: Number(resolvedAnalytics.summary?.converted || 0),
      conversionRate: Number(resolvedAnalytics.summary?.conversionRate || 0),
      recoveredGmv: Number(resolvedAnalytics.summary?.recoveredGmv || 0),
      creatorRevenueInfluenced: Number(resolvedAnalytics.summary?.creatorRevenueInfluenced || 0),
      platformRevenueInfluenced: Number(resolvedAnalytics.summary?.platformRevenueInfluenced || 0),
    },
    promotedVariants: resolvedAnalytics.experimentInsights?.promotedVariants || {},
    campaigns: strategies.map((strategy) => ({
      campaignKey: strategy.campaignKey,
      label: strategy.label,
      resolutionMode: strategy.resolutionMode,
      activeVariant: strategy.activeVariant,
      activeSource: strategy.activeSource,
      suggestedWinner: strategy.suggestedWinner || null,
      stats: strategy.stats || {},
    })),
    capturedAt: new Date(),
  });

  const populated = await LifecycleStrategySnapshot.findById(snapshot._id)
    .populate("triggeredBy", "name email username")
    .lean();

  return {
    id: String(populated._id || ""),
    triggerType: String(populated.triggerType || "admin"),
    note: String(populated.note || ""),
    windowDays: Number(populated.windowDays || 90),
    capturedAt: populated.capturedAt || populated.createdAt || null,
    triggeredBy: serializeUpdatedBy(populated.triggeredBy),
    summary: populated.summary || {},
    promotedVariants: populated.promotedVariants || {},
    campaigns: Array.isArray(populated.campaigns) ? populated.campaigns : [],
  };
}

module.exports = {
  STRATEGY_MODES,
  captureLifecycleStrategySnapshot,
  listLifecycleStrategySnapshots,
  listLifecycleStrategies,
  normalizeLifecycleStrategyPayload,
  resolveLifecycleStrategyVariant,
  updateLifecycleStrategy,
};
