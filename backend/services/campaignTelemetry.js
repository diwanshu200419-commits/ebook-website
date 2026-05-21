const CampaignDelivery = require("../models/CampaignDelivery");
const Payment = require("../models/Payment");
const Book = require("../models/book");
const ReferralReward = require("../models/ReferralReward");
const User = require("../models/user");
const { roundMoney } = require("../utils/revenue");

const CRM_CAMPAIGN_KEYS = [
  "abandoned_cart",
  "post_purchase_upsell",
  "creator_launch_sequence",
  "referral_prompt",
];

const SUPPORTED_CAMPAIGN_VARIANTS = [
  "default",
  "urgency",
  "social_proof",
  "value",
];
const MIN_WINNER_SAMPLE = 5;
const MIN_WINNER_CONVERSIONS = 2;
const MIN_WINNER_LEAD_RATE = 5;

const CAMPAIGN_DEFINITIONS = {
  abandoned_cart: {
    label: "Abandoned Cart Recovery",
    description: "Win back high-intent buyers before their cart cools off.",
    metricLabel: "Recovered GMV",
    creatorMetricLabel: "Recovered earnings",
  },
  post_purchase_upsell: {
    label: "Post-Purchase Upsell",
    description: "Recommend the next unlock after a successful purchase.",
    metricLabel: "Upsell GMV",
    creatorMetricLabel: "Upsell earnings",
  },
  creator_launch_sequence: {
    label: "Creator Launch Sequence",
    description: "Push creators toward launch, distribution, and second-product momentum.",
    metricLabel: "Activated creators",
    creatorMetricLabel: "Activated creators",
  },
  referral_prompt: {
    label: "Referral Prompt",
    description: "Turn referral links into signups, rewards, and creator cashflow.",
    metricLabel: "Referral value",
    creatorMetricLabel: "Referral value",
  },
};

function normalizeCampaignKey(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return CRM_CAMPAIGN_KEYS.includes(key) ? key : "";
}

function getCampaignDefinition(key = "") {
  return CAMPAIGN_DEFINITIONS[normalizeCampaignKey(key)] || {
    label: "Campaign",
    description: "Lifecycle campaign",
    metricLabel: "Value",
    creatorMetricLabel: "Value",
  };
}

function normalizeCampaignVariant(value = "") {
  const variant = String(value || "default").trim().toLowerCase();
  return SUPPORTED_CAMPAIGN_VARIANTS.includes(variant) ? variant : "default";
}

function formatVariantLabel(value = "") {
  const normalized = normalizeCampaignVariant(value);
  if (normalized === "social_proof") {
    return "Social Proof";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildExperimentInsights({ variantBreakdown = [] } = {}) {
  const variantsByCampaign = new Map();

  variantBreakdown.forEach((entry) => {
    const key = normalizeCampaignKey(entry.campaignKey);
    if (!key) {
      return;
    }

    if (!variantsByCampaign.has(key)) {
      variantsByCampaign.set(key, []);
    }

    variantsByCampaign.get(key).push(entry);
  });

  const winners = [];
  const recommendations = [];
  const promotedVariants = {};

  variantsByCampaign.forEach((variants, campaignKey) => {
    const sorted = variants
      .slice()
      .sort((left, right) => {
        if ((right.conversionRate || 0) !== (left.conversionRate || 0)) {
          return (right.conversionRate || 0) - (left.conversionRate || 0);
        }

        if ((right.primaryMetricValue || 0) !== (left.primaryMetricValue || 0)) {
          return (right.primaryMetricValue || 0) - (left.primaryMetricValue || 0);
        }

        return (right.sent || 0) - (left.sent || 0);
      });

    const leader = sorted[0];
    const runnerUp = sorted[1] || null;
    if (!leader) {
      return;
    }

    const leadRate = Number(leader.conversionRate || 0) - Number(runnerUp?.conversionRate || 0);
    const sampleStrongEnough = Number(leader.sent || 0) >= MIN_WINNER_SAMPLE;
    const conversionsStrongEnough = Number(leader.converted || 0) >= MIN_WINNER_CONVERSIONS;
    const runnerComparable = runnerUp && Number(runnerUp.sent || 0) >= Math.max(3, Math.floor(MIN_WINNER_SAMPLE / 2));
    const clearLead = !runnerComparable || leadRate >= MIN_WINNER_LEAD_RATE;
    const shouldPromote = sampleStrongEnough && conversionsStrongEnough && clearLead;

    const insight = {
      campaignKey,
      label: leader.label || getCampaignDefinition(campaignKey).label,
      winningVariant: leader.variant,
      winningVariantLabel: leader.variantLabel || formatVariantLabel(leader.variant),
      sent: Number(leader.sent || 0),
      converted: Number(leader.converted || 0),
      conversionRate: Number(leader.conversionRate || 0),
      leadRate: Number(leadRate.toFixed(1)),
      primaryMetricType: leader.primaryMetricType || "currency",
      primaryMetricValue: leader.primaryMetricValue || 0,
      runnerUp: runnerUp
        ? {
            variant: runnerUp.variant,
            variantLabel: runnerUp.variantLabel || formatVariantLabel(runnerUp.variant),
            conversionRate: Number(runnerUp.conversionRate || 0),
            sent: Number(runnerUp.sent || 0),
          }
        : null,
      confidence: shouldPromote
        ? "ready"
        : sampleStrongEnough
          ? "testing"
          : "collecting",
      action: shouldPromote ? "promote" : "observe",
      rationale: shouldPromote
        ? `${leader.variantLabel || formatVariantLabel(leader.variant)} is leading by ${Number(leadRate.toFixed(1))}% conversion rate.`
        : sampleStrongEnough
          ? "Variant data is directional, but the lead is not strong enough to auto-promote yet."
          : "The sample is still too small to auto-promote a winner.",
    };

    recommendations.push(insight);
    if (shouldPromote) {
      winners.push(insight);
      promotedVariants[campaignKey] = leader.variant;
    }
  });

  return {
    promotedVariants,
    winners,
    recommendations: recommendations.sort((left, right) => {
      if (left.action !== right.action) {
        return left.action === "promote" ? -1 : 1;
      }

      return (right.conversionRate || 0) - (left.conversionRate || 0);
    }),
  };
}

function getId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
}

function uniqueIds(values = []) {
  return [...new Set(
    values
      .map((value) => getId(value).trim())
      .filter(Boolean)
  )];
}

function toDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function buildHistoryHeadline(event, outcome, creatorScoped = false) {
  if (outcome.converted) {
    if (outcome.recoveredGmv > 0) {
      return `${creatorScoped ? "Earnings influenced" : "Recovered GMV"} ${formatCurrency(
        creatorScoped ? outcome.creatorRevenue : outcome.recoveredGmv
      )}`;
    }

    if (outcome.creatorRevenue > 0) {
      return `${getCampaignDefinition(event.campaignKey).creatorMetricLabel} ${formatCurrency(outcome.creatorRevenue)}`;
    }

    return outcome.detail || "Converted";
  }

  return "Awaiting conversion";
}

function formatCurrency(value = 0) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function baseOutcome() {
  return {
    converted: false,
    status: "pending",
    conversionUnits: 0,
    recoveredGmv: 0,
    creatorRevenue: 0,
    platformRevenue: 0,
    occurredAt: null,
    detail: "",
  };
}

async function evaluateRevenueRecoveryEvent(event, { creatorId = "" } = {}, itemKey) {
  const outcome = baseOutcome();
  const items = Array.isArray(event.metadata?.[itemKey]) ? event.metadata[itemKey] : [];
  const scopedItems = creatorId
    ? items.filter((item) => getId(item.creatorId) === creatorId)
    : items;
  const bookIds = uniqueIds(scopedItems.map((item) => item.bookId));

  if (!bookIds.length) {
    return outcome;
  }

  let payments = await Payment.find({
    user: getId(event.user),
    book: { $in: bookIds },
    status: "approved",
    createdAt: { $gt: toDate(event.sentAt) || toDate(event.createdAt) || new Date(0) },
  })
    .select("amount creatorAmount platformFee creator book createdAt")
    .lean();

  if (creatorId) {
    payments = payments.filter((payment) => getId(payment.creator) === creatorId);
  }

  if (!payments.length) {
    return outcome;
  }

  outcome.converted = true;
  outcome.status = "converted";
  outcome.conversionUnits = payments.length;
  outcome.recoveredGmv = roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  outcome.creatorRevenue = roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.creatorAmount || 0), 0)
  );
  outcome.platformRevenue = roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0)
  );
  outcome.occurredAt = payments
    .map((payment) => toDate(payment.createdAt))
    .filter(Boolean)
    .sort((left, right) => left - right)[0] || null;
  outcome.detail = `${payments.length} purchase${payments.length === 1 ? "" : "s"} closed`;
  return outcome;
}

async function evaluateCreatorLaunchEvent(event, { creatorId = "" } = {}) {
  const outcome = baseOutcome();
  const targetCreatorId = creatorId || getId(event.creator) || getId(event.user);
  if (!targetCreatorId) {
    return outcome;
  }

  const threshold = toDate(event.sentAt) || toDate(event.createdAt) || new Date(0);
  const [newBooks, payments] = await Promise.all([
    Book.find({
      author: targetCreatorId,
      status: "Approved",
      isArchived: { $ne: true },
      $or: [
        { publishedAt: { $gt: threshold } },
        { publishedAt: null, createdAt: { $gt: threshold } },
      ],
    })
      .select("title publishedAt createdAt")
      .lean(),
    Payment.find({
      creator: targetCreatorId,
      status: "approved",
      createdAt: { $gt: threshold },
    })
      .select("amount creatorAmount platformFee createdAt")
      .lean(),
  ]);

  if (!newBooks.length && !payments.length) {
    return outcome;
  }

  outcome.converted = true;
  outcome.status = "converted";
  outcome.conversionUnits = Math.max(newBooks.length, payments.length, 1);
  outcome.recoveredGmv = roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  outcome.creatorRevenue = roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.creatorAmount || 0), 0)
  );
  outcome.platformRevenue = roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0)
  );
  outcome.occurredAt = [
    ...newBooks.map((book) => toDate(book.publishedAt) || toDate(book.createdAt)),
    ...payments.map((payment) => toDate(payment.createdAt)),
  ]
    .filter(Boolean)
    .sort((left, right) => left - right)[0] || null;
  outcome.detail = newBooks.length
    ? `${newBooks.length} new launch${newBooks.length === 1 ? "" : "es"} shipped`
    : `${payments.length} new sale${payments.length === 1 ? "" : "s"} landed`;
  return outcome;
}

async function evaluateReferralPromptEvent(event) {
  const outcome = baseOutcome();
  const userId = getId(event.user);
  if (!userId) {
    return outcome;
  }

  const threshold = toDate(event.sentAt) || toDate(event.createdAt) || new Date(0);
  const [rewards, signups] = await Promise.all([
    ReferralReward.find({
      referrer: userId,
      createdAt: { $gt: threshold },
    })
      .select("amount createdAt")
      .lean(),
    User.countDocuments({
      referredBy: userId,
      createdAt: { $gt: threshold },
      isDeleted: { $ne: true },
    }),
  ]);

  if (!rewards.length && !signups) {
    return outcome;
  }

  outcome.converted = true;
  outcome.status = "converted";
  outcome.conversionUnits = rewards.length || signups;
  outcome.creatorRevenue = roundMoney(
    rewards.reduce((sum, reward) => sum + Number(reward.amount || 0), 0)
  );
  outcome.occurredAt = rewards
    .map((reward) => toDate(reward.createdAt))
    .filter(Boolean)
    .sort((left, right) => left - right)[0] || null;
  outcome.detail = rewards.length
    ? `${rewards.length} rewarded purchase${rewards.length === 1 ? "" : "s"}`
    : `${signups} signup${signups === 1 ? "" : "s"} generated`;
  return outcome;
}

async function evaluateCampaignOutcome(event, options = {}) {
  const key = normalizeCampaignKey(event?.campaignKey);
  if (!key) {
    return baseOutcome();
  }

  if (key === "abandoned_cart") {
    return evaluateRevenueRecoveryEvent(event, options, "cartItems");
  }

  if (key === "post_purchase_upsell") {
    return evaluateRevenueRecoveryEvent(event, options, "recommendedProducts");
  }

  if (key === "creator_launch_sequence") {
    return evaluateCreatorLaunchEvent(event, options);
  }

  if (key === "referral_prompt") {
    return evaluateReferralPromptEvent(event, options);
  }

  return baseOutcome();
}

async function logCampaignDelivery({
  notification = null,
  userId,
  creatorId = null,
  relatedCreatorIds = [],
  campaignKey,
  variant = "default",
  title,
  message = "",
  link = "",
  metadata = {},
  filtersSnapshot = {},
}) {
  const normalizedCampaignKey = normalizeCampaignKey(campaignKey);
  const normalizedVariant = normalizeCampaignVariant(variant);
  const resolvedUserId = getId(userId);

  if (!normalizedCampaignKey || !resolvedUserId || !title) {
    return null;
  }

  const deliveryMeta = notification?.deliveryMeta || {};
  return CampaignDelivery.create({
    notification: notification?._id || null,
    user: resolvedUserId,
    creator: creatorId || null,
    relatedCreators: uniqueIds([creatorId, ...relatedCreatorIds]),
    campaignKey: normalizedCampaignKey,
    variant: normalizedVariant,
    title: String(title || "").trim().slice(0, 140),
    message: String(message || "").trim().slice(0, 600),
    link: String(link || "").trim(),
    channel: {
      inAppDelivered: Boolean(notification?._id),
      emailEligible: deliveryMeta.emailEligible === true,
      emailAttempted: deliveryMeta.emailAttempted === true,
      emailDelivered: deliveryMeta.emailDelivered === true,
      emailProvider: String(deliveryMeta.emailProvider || "").trim(),
    },
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    filtersSnapshot: filtersSnapshot && typeof filtersSnapshot === "object" ? filtersSnapshot : {},
    sentAt: new Date(),
  });
}

async function getCampaignAnalytics({
  creatorId = null,
  days = 90,
  limit = 180,
} = {}) {
  const creatorScopeId = getId(creatorId);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - Math.max(Number(days || 90), 1));

  const filter = {
    campaignKey: { $in: CRM_CAMPAIGN_KEYS },
    sentAt: { $gte: since },
  };

  if (creatorScopeId) {
    filter.$or = [
      { creator: creatorScopeId },
      { relatedCreators: creatorScopeId },
      { user: creatorScopeId, campaignKey: { $in: ["creator_launch_sequence", "referral_prompt"] } },
    ];
  }

  const maxRecords = Math.max(Number(limit || 180), 1);
  const deliveries = await CampaignDelivery.find(filter)
    .sort({ sentAt: -1, createdAt: -1 })
    .limit(maxRecords)
    .populate("user", "name email username")
    .populate("creator", "name email username")
    .lean();

  const outcomes = await Promise.all(
    deliveries.map((delivery) => evaluateCampaignOutcome(delivery, { creatorId: creatorScopeId }))
  );

  const breakdownMap = new Map();
  const variantMap = new Map();
  let converted = 0;
  let emailDelivered = 0;
  let recoveredGmv = 0;
  let creatorRevenueInfluenced = 0;
  let platformRevenueInfluenced = 0;

  deliveries.forEach((delivery, index) => {
    const outcome = outcomes[index];
    const definition = getCampaignDefinition(delivery.campaignKey);
    const key = normalizeCampaignKey(delivery.campaignKey);
    const variant = normalizeCampaignVariant(delivery.variant);
    const variantKey = `${key}:${variant}`;

    if (!breakdownMap.has(key)) {
      breakdownMap.set(key, {
        campaignKey: key,
        label: definition.label,
        description: definition.description,
        metricLabel: creatorScopeId ? definition.creatorMetricLabel : definition.metricLabel,
        sent: 0,
        emailDelivered: 0,
        converted: 0,
        recoveredGmv: 0,
        creatorRevenueInfluenced: 0,
        platformRevenueInfluenced: 0,
        lastSentAt: null,
      });
    }

    if (!variantMap.has(variantKey)) {
      variantMap.set(variantKey, {
        campaignKey: key,
        label: definition.label,
        variant,
        variantLabel: formatVariantLabel(variant),
        sent: 0,
        emailDelivered: 0,
        converted: 0,
        recoveredGmv: 0,
        creatorRevenueInfluenced: 0,
        platformRevenueInfluenced: 0,
        lastSentAt: null,
      });
    }

    const entry = breakdownMap.get(key);
    entry.sent += 1;
    entry.emailDelivered += delivery.channel?.emailDelivered ? 1 : 0;
    entry.converted += outcome.converted ? 1 : 0;
    entry.recoveredGmv = roundMoney(entry.recoveredGmv + Number(outcome.recoveredGmv || 0));
    entry.creatorRevenueInfluenced = roundMoney(entry.creatorRevenueInfluenced + Number(outcome.creatorRevenue || 0));
    entry.platformRevenueInfluenced = roundMoney(entry.platformRevenueInfluenced + Number(outcome.platformRevenue || 0));
    entry.lastSentAt = entry.lastSentAt || delivery.sentAt || delivery.createdAt || null;

    const variantEntry = variantMap.get(variantKey);
    variantEntry.sent += 1;
    variantEntry.emailDelivered += delivery.channel?.emailDelivered ? 1 : 0;
    variantEntry.converted += outcome.converted ? 1 : 0;
    variantEntry.recoveredGmv = roundMoney(variantEntry.recoveredGmv + Number(outcome.recoveredGmv || 0));
    variantEntry.creatorRevenueInfluenced = roundMoney(variantEntry.creatorRevenueInfluenced + Number(outcome.creatorRevenue || 0));
    variantEntry.platformRevenueInfluenced = roundMoney(variantEntry.platformRevenueInfluenced + Number(outcome.platformRevenue || 0));
    variantEntry.lastSentAt = variantEntry.lastSentAt || delivery.sentAt || delivery.createdAt || null;

    converted += outcome.converted ? 1 : 0;
    emailDelivered += delivery.channel?.emailDelivered ? 1 : 0;
    recoveredGmv += Number(outcome.recoveredGmv || 0);
    creatorRevenueInfluenced += Number(outcome.creatorRevenue || 0);
    platformRevenueInfluenced += Number(outcome.platformRevenue || 0);
  });

  const breakdown = [...breakdownMap.values()]
    .map((entry) => {
      const isCountMetric = entry.campaignKey === "creator_launch_sequence"
        || (entry.campaignKey === "referral_prompt" && entry.creatorRevenueInfluenced <= 0);
      const primaryMetricValue = isCountMetric
        ? Number(entry.converted || 0)
        : roundMoney(
            creatorScopeId
              ? (entry.creatorRevenueInfluenced > 0 ? entry.creatorRevenueInfluenced : entry.recoveredGmv)
              : (entry.recoveredGmv > 0 ? entry.recoveredGmv : entry.creatorRevenueInfluenced)
          );

      return {
        ...entry,
        conversionRate: entry.sent
          ? Number(((entry.converted / entry.sent) * 100).toFixed(1))
          : 0,
        primaryMetricType: isCountMetric ? "count" : "currency",
        primaryMetricValue,
      };
    })
    .sort((left, right) => {
      if (right.converted !== left.converted) {
        return right.converted - left.converted;
      }

      if (right.sent !== left.sent) {
        return right.sent - left.sent;
      }

      return (new Date(right.lastSentAt || 0)) - (new Date(left.lastSentAt || 0));
    });

  const variantBreakdown = [...variantMap.values()]
    .map((entry) => {
      const isCountMetric = entry.campaignKey === "creator_launch_sequence"
        || (entry.campaignKey === "referral_prompt" && entry.creatorRevenueInfluenced <= 0);
      return {
        ...entry,
        conversionRate: entry.sent
          ? Number(((entry.converted / entry.sent) * 100).toFixed(1))
          : 0,
        primaryMetricType: isCountMetric ? "count" : "currency",
        primaryMetricValue: isCountMetric
          ? Number(entry.converted || 0)
          : roundMoney(
              creatorScopeId
                ? (entry.creatorRevenueInfluenced > 0 ? entry.creatorRevenueInfluenced : entry.recoveredGmv)
                : (entry.recoveredGmv > 0 ? entry.recoveredGmv : entry.creatorRevenueInfluenced)
            ),
      };
    })
    .sort((left, right) => {
      if (right.converted !== left.converted) {
        return right.converted - left.converted;
      }

      if (right.sent !== left.sent) {
        return right.sent - left.sent;
      }

      return (new Date(right.lastSentAt || 0)) - (new Date(left.lastSentAt || 0));
    });

  const recentDeliveries = deliveries.slice(0, 12).map((delivery, index) => {
    const outcome = outcomes[index];
    const definition = getCampaignDefinition(delivery.campaignKey);
    return {
      id: delivery._id,
      campaignKey: normalizeCampaignKey(delivery.campaignKey),
      label: definition.label,
      variant: normalizeCampaignVariant(delivery.variant),
      variantLabel: formatVariantLabel(delivery.variant),
      title: delivery.title,
      recipient: delivery.user
        ? {
            name: delivery.user.name || delivery.user.username || "Member",
            email: delivery.user.email || "",
            username: delivery.user.username || "",
          }
        : null,
      sentAt: delivery.sentAt || delivery.createdAt,
      channel: delivery.channel || {},
      converted: outcome.converted,
      conversionStatus: outcome.status,
      conversionDetail: outcome.detail || "",
      recoveredGmv: roundMoney(outcome.recoveredGmv || 0),
      creatorRevenueInfluenced: roundMoney(outcome.creatorRevenue || 0),
      platformRevenueInfluenced: roundMoney(outcome.platformRevenue || 0),
      historyHeadline: buildHistoryHeadline(delivery, outcome, Boolean(creatorScopeId)),
      link: delivery.link || "",
      filtersSnapshot: delivery.filtersSnapshot || {},
    };
  });

  const topCampaign = breakdown[0] || null;
  const totalSent = deliveries.length;
  const experimentInsights = buildExperimentInsights({ variantBreakdown });

  return {
    summary: {
      windowDays: Math.max(Number(days || 90), 1),
      totalSent,
      emailDelivered,
      converted,
      conversionRate: totalSent
        ? Number(((converted / totalSent) * 100).toFixed(1))
        : 0,
      recoveredGmv: roundMoney(recoveredGmv),
      creatorRevenueInfluenced: roundMoney(creatorRevenueInfluenced),
      platformRevenueInfluenced: roundMoney(platformRevenueInfluenced),
      topCampaign: topCampaign
        ? {
            campaignKey: topCampaign.campaignKey,
            label: topCampaign.label,
            conversionRate: topCampaign.conversionRate,
          }
        : null,
      promotedVariants: experimentInsights.promotedVariants,
      sampled: deliveries.length >= maxRecords,
    },
    breakdown,
    variantBreakdown,
    experimentInsights,
    recentDeliveries,
  };
}

module.exports = {
  CRM_CAMPAIGN_KEYS,
  SUPPORTED_CAMPAIGN_VARIANTS,
  buildExperimentInsights,
  getCampaignDefinition,
  getCampaignAnalytics,
  normalizeCampaignVariant,
  logCampaignDelivery,
  normalizeCampaignKey,
};
