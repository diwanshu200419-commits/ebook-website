const User = require("../models/user");
const Book = require("../models/book");
const Payment = require("../models/Payment");
const Cart = require("../models/Cart");
const { createNotification } = require("./notifications");
const { getFirstPurchaseRewardAmount } = require("./referralRewards");
const {
  logCampaignDelivery,
  normalizeCampaignVariant,
  SUPPORTED_CAMPAIGN_VARIANTS,
} = require("./campaignTelemetry");
const {
  resolveLifecycleStrategyVariant,
} = require("./lifecycleStrategies");

const DIGEST_GAP_DAYS = 6;
const COMEBACK_REMINDER_AFTER_DAYS = 5;
const COMEBACK_COOLDOWN_DAYS = 7;
const CART_RECOVERY_AFTER_DAYS = 1;
const CART_RECOVERY_COOLDOWN_DAYS = 3;
const UPSELL_AFTER_DAYS = 2;
const UPSELL_COOLDOWN_DAYS = 5;
const CREATOR_LAUNCH_AFTER_DAYS = 3;
const CREATOR_LAUNCH_COOLDOWN_DAYS = 7;
const REFERRAL_PROMPT_AFTER_DAYS = 4;
const REFERRAL_PROMPT_COOLDOWN_DAYS = 10;
const SUPPORTED_COHORT_ROLES = ["all", "reader", "creator"];
const SUPPORTED_LANGUAGE_FILTERS = ["all", "english", "hindi"];
const SUPPORTED_EXPERIMENT_MODES = [
  "all",
  "digest",
  "reminder",
  "crm",
  "cart",
  "upsell",
  "creator",
  "referral",
];
const SUPPORTED_REQUEST_VARIANTS = ["auto", ...SUPPORTED_CAMPAIGN_VARIANTS];
const CRM_MODE_TO_CAMPAIGN_KEY = {
  cart: "abandoned_cart",
  upsell: "post_purchase_upsell",
  creator: "creator_launch_sequence",
  referral: "referral_prompt",
};

function isCreatorRole(role) {
  return ["creator", "author", "admin"].includes(String(role || "").toLowerCase());
}

function daysBetween(now, previous) {
  if (!previous) {
    return null;
  }

  return Math.floor((new Date(now).getTime() - new Date(previous).getTime()) / 86400000);
}

function getWeeklyWindowStart() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function normalizeCohortRole(value = "") {
  const role = String(value || "all").trim().toLowerCase();
  return SUPPORTED_COHORT_ROLES.includes(role) ? role : "all";
}

function normalizeLanguageFilter(value = "") {
  const language = String(value || "all").trim().toLowerCase();
  return SUPPORTED_LANGUAGE_FILTERS.includes(language) ? language : "all";
}

function normalizeLifecycleFilters(filters = {}) {
  return {
    cohortRole: normalizeCohortRole(filters?.cohortRole || filters?.role),
    marketplaceLanguage: normalizeLanguageFilter(filters?.marketplaceLanguage || filters?.language),
  };
}

function getLifecycleExperimentConfig() {
  return {
    supportedModes: SUPPORTED_EXPERIMENT_MODES,
    supportedVariants: SUPPORTED_REQUEST_VARIANTS,
    filters: {
      cohortRole: SUPPORTED_COHORT_ROLES,
      marketplaceLanguage: SUPPORTED_LANGUAGE_FILTERS,
    },
  };
}

function getExperimentOptions(options = {}) {
  return {
    variant: normalizeCampaignVariant(options?.variant),
    filters: normalizeLifecycleFilters(options?.filters || {}),
    manual: Boolean(options?.manual),
  };
}

function normalizeRequestedVariant(value = "") {
  const variant = String(value || "default").trim().toLowerCase();
  if (variant === "auto") {
    return "auto";
  }

  return normalizeCampaignVariant(variant);
}

async function resolveModeVariant(mode, requestedVariant = "default", { creatorId = null } = {}) {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  const normalizedRequested = normalizeRequestedVariant(requestedVariant);
  const campaignKey = CRM_MODE_TO_CAMPAIGN_KEY[normalizedMode];

  if (!campaignKey) {
    return {
      requestedVariant: normalizedRequested,
      appliedVariant: normalizeCampaignVariant(normalizedRequested),
      variantSource: "not_applicable",
      campaignKey: "",
    };
  }

  if (normalizedRequested !== "auto") {
    return {
      requestedVariant: normalizedRequested,
      appliedVariant: normalizeCampaignVariant(normalizedRequested),
      variantSource: "manual",
      campaignKey,
    };
  }

  const strategyResolution = await resolveLifecycleStrategyVariant(campaignKey);
  return {
    requestedVariant: "auto",
    appliedVariant: normalizeCampaignVariant(strategyResolution.appliedVariant || "default"),
    variantSource: strategyResolution.variantSource || "default_fallback",
    campaignKey,
  };
}

function getUserLanguagePreference(user) {
  const marketplaceLanguage = String(user?.preferences?.marketplaceLanguage || "All").trim();
  const interfaceLanguage = String(user?.preferences?.interfaceLanguage || "English").trim();

  if (marketplaceLanguage && marketplaceLanguage !== "All") {
    return marketplaceLanguage.toLowerCase();
  }

  return interfaceLanguage.toLowerCase();
}

function matchesLifecycleFilters(user, filters = {}) {
  if (!user) {
    return false;
  }

  const role = String(user.role || "").toLowerCase();
  if (role === "admin") {
    return false;
  }

  const normalizedFilters = normalizeLifecycleFilters(filters);
  if (normalizedFilters.cohortRole === "creator" && !isCreatorRole(role)) {
    return false;
  }

  if (normalizedFilters.cohortRole === "reader" && isCreatorRole(role)) {
    return false;
  }

  if (normalizedFilters.marketplaceLanguage !== "all") {
    const language = getUserLanguagePreference(user);
    if (language !== normalizedFilters.marketplaceLanguage) {
      return false;
    }
  }

  return true;
}

function getCandidateUser(candidate) {
  if (!candidate) {
    return null;
  }

  if (candidate.user) {
    return candidate.user;
  }

  return candidate;
}

function applyLifecycleFilters(candidates = [], filters = {}) {
  const normalizedFilters = normalizeLifecycleFilters(filters);
  return candidates.filter((candidate) => matchesLifecycleFilters(getCandidateUser(candidate), normalizedFilters));
}

function summarizeRecipient(user) {
  return {
    id: String(user?._id || ""),
    name: user?.name || user?.username || "Member",
    email: user?.email || "",
    role: String(user?.role || "reader").toLowerCase(),
    language: getUserLanguagePreference(user),
  };
}

function summarizeExperimentCandidate(mode, candidate) {
  const user = getCandidateUser(candidate);
  const recipient = summarizeRecipient(user);

  if (mode === "cart") {
    const items = Array.isArray(candidate?.items) ? candidate.items : [];
    const totalValue = items.reduce((sum, item) => sum + Number(item.priceAtAdd || item.book?.price || 0), 0);
    return {
      ...recipient,
      headline: `${items.length} item${items.length === 1 ? "" : "s"} in cart`,
      detail: `Cart value ${formatCurrency(totalValue)}`,
    };
  }

  if (mode === "upsell") {
    return {
      ...recipient,
      headline: candidate?.latestPayment?.book?.title || "Recent buyer",
      detail: `Anchor category ${candidate?.latestPayment?.book?.category || "Other"}`,
    };
  }

  if (mode === "creator") {
    return {
      ...recipient,
      headline: `${Number(user?.creatorStats?.totalSales || 0).toLocaleString("en-IN")} sales`,
      detail: `${Number(user?.creatorStats?.followersCount || 0).toLocaleString("en-IN")} followers`,
    };
  }

  if (mode === "referral") {
    return {
      ...recipient,
      headline: `Code ${user?.referralCode || "Pending"}`,
      detail: `${Number(user?.referralStats?.signupsCount || 0).toLocaleString("en-IN")} signups`,
    };
  }

  return {
    ...recipient,
    headline: recipient.role,
    detail: `${recipient.language} cohort`,
  };
}

async function getFilteredDigestCandidates({ limit = 20, force = false, filters = {} } = {}) {
  const users = await findDigestCandidates(limit, force);
  return applyLifecycleFilters(users, filters).slice(0, Math.max(Number(limit || 20), 1));
}

async function getFilteredComebackCandidates({ limit = 20, force = false, filters = {} } = {}) {
  const users = await findComebackCandidates(limit, force);
  return applyLifecycleFilters(users, filters).slice(0, Math.max(Number(limit || 20), 1));
}

async function getFilteredCartCandidates({ limit = 20, force = false, filters = {} } = {}) {
  const carts = await findAbandonedCartCandidates(limit, force);
  return applyLifecycleFilters(carts, filters).slice(0, Math.max(Number(limit || 20), 1));
}

async function getFilteredUpsellCandidates({ limit = 20, force = false, filters = {} } = {}) {
  const candidates = await findUpsellCandidates(limit, force);
  return applyLifecycleFilters(candidates, filters).slice(0, Math.max(Number(limit || 20), 1));
}

async function getFilteredCreatorCandidates({ limit = 20, force = false, filters = {} } = {}) {
  const users = await findCreatorLaunchCandidates(limit, force);
  return applyLifecycleFilters(users, filters).slice(0, Math.max(Number(limit || 20), 1));
}

async function getFilteredReferralCandidates({ limit = 20, force = false, filters = {} } = {}) {
  const users = await findReferralPromptCandidates(limit, force);
  return applyLifecycleFilters(users, filters).slice(0, Math.max(Number(limit || 20), 1));
}

function sanitizeTitleList(items = [], limit = 3) {
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function pickVariantCopy(variant, copies) {
  return copies[normalizeCampaignVariant(variant)] || copies.default;
}

function buildAbandonedCartCopy({ variant, itemTitles, total, itemCount }) {
  return pickVariantCopy(variant, {
    default: {
      title: "Your cart still has high-intent products waiting",
      subject: "Your cart is still waiting",
      message: `${itemTitles.join(", ")} ${itemTitles.length > 1 ? "are" : "is"} still in your cart. Return now to unlock everything for ${formatCurrency(total)} before your next study sprint or creator session.`,
    },
    urgency: {
      title: "Your cart is cooling off - finish checkout today",
      subject: "Your cart is cooling off",
      message: `You already shortlisted ${itemCount} product${itemCount === 1 ? "" : "s"} worth ${formatCurrency(total)}. Return today so that momentum turns into output instead of another abandoned tab.`,
    },
    social_proof: {
      title: "Creators like you move faster when the stack is complete",
      subject: "Complete your creator stack",
      message: `Students and creators keep stacking products like ${itemTitles.join(", ")} when they are ready to ship faster. Your ${itemCount} saved pick${itemCount === 1 ? "" : "s"} are still waiting in cart.`,
    },
    value: {
      title: "You already curated a high-signal cart",
      subject: "Your curated cart is ready",
      message: `You already assembled ${itemCount} practical product${itemCount === 1 ? "" : "s"} worth ${formatCurrency(total)}. Check out now and turn that research into notes, assets, launches, or earnings.`,
    },
  });
}

function buildUpsellCopy({ variant, anchorTitle, picks }) {
  const joinedPicks = picks.join(" | ");
  return pickVariantCopy(variant, {
    default: {
      title: "Recommended next unlocks for your journey",
      subject: "Recommended next unlocks",
      message: `Because you bought ${anchorTitle}, the next strong matches are ${joinedPicks}. Open the marketplace and stack your next high-signal purchase.`,
    },
    urgency: {
      title: "Keep the momentum from your last purchase alive",
      subject: "Keep your purchase momentum alive",
      message: `Your recent unlock around ${anchorTitle} is still fresh. Move now on ${joinedPicks} while your learning or creator sprint is already in motion.`,
    },
    social_proof: {
      title: "People who buy this next usually keep compounding faster",
      subject: "Buyers like you keep climbing from here",
      message: `After buying ${anchorTitle}, high-intent buyers often keep climbing with picks like ${joinedPicks}. That next step is already lined up for you.`,
    },
    value: {
      title: "Compound the value of your last unlock",
      subject: "Compound your last unlock",
      message: `${anchorTitle} already moved you forward. Products like ${joinedPicks} can compound that spend into better outputs, stronger portfolios, and faster skill stacking.`,
    },
  });
}

function buildCreatorLaunchCopy({ variant, stage, latestBookTitle }) {
  const stageCopies = {
    first_publish: {
      default: {
        title: "Your creator launch sequence starts with the first live product",
        message: "You activated creator mode, but your storefront still needs a first approved product. Publish one practical digital offer to unlock discovery, follows, and revenue signals.",
        actionLabel: "Publish first product",
        actionLink: "dashboard/upload.html",
      },
      urgency: {
        title: "Ship your first product this week",
        message: "The fastest path to creator momentum is the first live product. Publish this week so discovery, follow, and revenue loops start working for you instead of waiting.",
        actionLabel: "Publish first product",
        actionLink: "dashboard/upload.html",
      },
      social_proof: {
        title: "Creators who publish once unlock the real flywheel",
        message: "The jump from creator mode to creator business happens when the first practical product goes live. Publish now so your storefront becomes something people can follow, share, and buy.",
        actionLabel: "Publish first product",
        actionLink: "dashboard/upload.html",
      },
      value: {
        title: "One product can unlock your first revenue loop",
        message: "Your first approved product is the asset that turns profile views into sales, reviews, and referrals. Publish something practical now so the marketplace can start compounding for you.",
        actionLabel: "Publish first product",
        actionLink: "dashboard/upload.html",
      },
    },
    distribution_push: {
      default: {
        title: "Your first live product needs a launch push",
        message: `${latestBookTitle} is live, but it still needs distribution. Share your creator link, promote your referral code, and ask early buyers for the first review.`,
        actionLabel: "Open creator settings",
        actionLink: "dashboard/setting.html",
      },
      urgency: {
        title: "Do not let your first launch go quiet",
        message: `${latestBookTitle} is already live. Push distribution now while the launch is fresh so your first product can collect signals, reviews, and real buyer proof quickly.`,
        actionLabel: "Open creator settings",
        actionLink: "dashboard/setting.html",
      },
      social_proof: {
        title: "First products grow when creators keep showing them",
        message: `${latestBookTitle} is live, and creators who keep sharing their first offer usually earn the first reviews and follow momentum faster. Push your link and referral code now.`,
        actionLabel: "Open creator settings",
        actionLink: "dashboard/setting.html",
      },
      value: {
        title: "Your first product only pays when distribution starts",
        message: `${latestBookTitle} is live, but value appears when people actually see it. Share the storefront, activate referrals, and turn this launch into the first cashflow proof point.`,
        actionLabel: "Open creator settings",
        actionLink: "dashboard/setting.html",
      },
    },
    catalog_expansion: {
      default: {
        title: "Turn your first sales into a creator flywheel",
        message: "You already proved demand. Launch a second or third product now so buyers have a ladder to climb and your storefront compounds faster.",
        actionLabel: "Launch next product",
        actionLink: "dashboard/upload.html",
      },
      urgency: {
        title: "Use your current sales momentum before it fades",
        message: "You already proved demand. Launch the second product now so that early momentum turns into a catalog, not a one-product spike.",
        actionLabel: "Launch next product",
        actionLink: "dashboard/upload.html",
      },
      social_proof: {
        title: "Top creators do not stop at the first sale",
        message: "You already proved demand. Creators who keep shipping a second and third product give buyers a ladder to climb and compound their storefront faster.",
        actionLabel: "Launch next product",
        actionLink: "dashboard/upload.html",
      },
      value: {
        title: "A second product makes your storefront more valuable",
        message: "You already proved demand. Another product gives buyers more ways to spend, improves bundle potential, and makes every new visitor worth more.",
        actionLabel: "Launch next product",
        actionLink: "dashboard/upload.html",
      },
    },
  };

  return pickVariantCopy(variant, stageCopies[stage] || stageCopies.catalog_expansion);
}

function buildReferralPromptCopy({
  variant,
  referralCode,
  rewardAmount,
  signups,
  rewardedPurchases,
  totalRewardAmount,
}) {
  if (!signups) {
    return pickVariantCopy(variant, {
      default: {
        title: "Your referral link is ready to bring in the first signup",
        message: `Share your code ${referralCode} and earn ${formatCurrency(rewardAmount)} when a referred user completes a first marketplace purchase.`,
      },
      urgency: {
        title: "Share your referral link while your momentum is warm",
        message: `Your code ${referralCode} is live right now. Share it this week and unlock ${formatCurrency(rewardAmount)} on the first referred purchase instead of letting that channel stay idle.`,
      },
      social_proof: {
        title: "Referral loops start with the first person you invite",
        message: `Creators often unlock their first referral earnings by sharing one useful product with a focused audience. Your code ${referralCode} is ready to bring in that first signup and ${formatCurrency(rewardAmount)} reward.`,
      },
      value: {
        title: "Your referral link is a ready-made revenue channel",
        message: `Code ${referralCode} can turn every strong recommendation into ${formatCurrency(rewardAmount)} once the first referred buyer converts. Share it where your audience already trusts you.`,
      },
    });
  }

  if (signups > 0 && !rewardedPurchases) {
    return pickVariantCopy(variant, {
      default: {
        title: "Turn referral signups into real reward revenue",
        message: `${signups} referral signup${signups === 1 ? "" : "s"} already came through. Share your strongest product or notes pack so they complete the first purchase and unlock ${formatCurrency(rewardAmount)} for you.`,
      },
      urgency: {
        title: "Your referral signups need a conversion push now",
        message: `${signups} referral signup${signups === 1 ? "" : "s"} already arrived. Push a strong offer now so they convert while the referral intent is still fresh and unlock ${formatCurrency(rewardAmount)} for you.`,
      },
      social_proof: {
        title: "You already have referral interest - now turn it into proof",
        message: `${signups} referral signup${signups === 1 ? "" : "s"} already landed. Creators usually unlock their first referral reward by sending one high-confidence product to that warm audience.`,
      },
      value: {
        title: "There is reward value already waiting in your funnel",
        message: `${signups} referral signup${signups === 1 ? "" : "s"} already exist in your funnel. One converted purchase unlocks ${formatCurrency(rewardAmount)} and proves the channel can pay repeatedly.`,
      },
    });
  }

  return pickVariantCopy(variant, {
    default: {
      title: "Your referral funnel already converts - scale it",
      message: `You have ${signups} signup${signups === 1 ? "" : "s"} and ${rewardedPurchases} rewarded purchase${rewardedPurchases === 1 ? "" : "s"}, worth ${formatCurrency(totalRewardAmount)} so far. Keep sharing the link to compound that channel.`,
    },
    urgency: {
      title: "Your referral channel is working - press it harder now",
      message: `You already generated ${rewardedPurchases} rewarded purchase${rewardedPurchases === 1 ? "" : "s"} worth ${formatCurrency(totalRewardAmount)}. Push the link again now while the proof is fresh and the channel is warm.`,
    },
    social_proof: {
      title: "You already have referral proof - now scale the loop",
      message: `With ${signups} signup${signups === 1 ? "" : "s"} and ${rewardedPurchases} rewarded purchase${rewardedPurchases === 1 ? "" : "s"}, your referral channel already has proof. Share the story and keep compounding that signal.`,
    },
    value: {
      title: "Your referral funnel is already a paying asset",
      message: `Your referral funnel has already produced ${formatCurrency(totalRewardAmount)} from ${rewardedPurchases} rewarded purchase${rewardedPurchases === 1 ? "" : "s"}. Scaling that link turns creator trust into repeatable revenue.`,
    },
  });
}

async function buildAbandonedCartCampaignPreview(cart, options = {}) {
  const { variant } = getExperimentOptions(options);
  const user = cart?.user || null;
  if (!user) {
    return null;
  }

  const validItems = (Array.isArray(cart?.items) ? cart.items : [])
    .filter((item) => item.book && item.book.isArchived !== true && String(item.book.status || "") === "Approved");
  if (!validItems.length) {
    return null;
  }

  const itemTitles = sanitizeTitleList(validItems.map((item) => item.book?.title));
  const total = validItems.reduce((sum, item) => sum + Number(item.priceAtAdd || item.book?.price || 0), 0);
  const copy = buildAbandonedCartCopy({
    variant,
    itemTitles,
    total,
    itemCount: validItems.length,
  });

  return {
    user,
    recipient: summarizeRecipient(user),
    variant,
    title: copy.title,
    subject: copy.subject,
    message: copy.message,
    actionLabel: "Return to cart",
    actionLink: "cart.html",
    relatedCreatorIds: validItems.map((item) => item.book?.author).filter(Boolean),
    metadata: {
      totalAmount: roundMoney(total),
      itemCount: validItems.length,
      cartItems: validItems.map((item) => ({
        bookId: item.book?._id || null,
        creatorId: item.book?.author || null,
        title: item.book?.title || "",
        price: roundMoney(item.priceAtAdd || item.book?.price || 0),
      })),
    },
  };
}

async function buildUpsellCampaignPreview(candidate, options = {}) {
  const { variant } = getExperimentOptions(options);
  const user = candidate?.user || null;
  const latestPayment = candidate?.latestPayment || null;
  if (!user || !latestPayment?.book) {
    return null;
  }

  const ownedPayments = await Payment.find({
    user: user._id,
    status: "approved",
  }).select("book");

  const ownedBookIds = ownedPayments.map((payment) => payment.book);
  const recommendedProducts = await loadRecommendedProducts(user, 3, {
    category: latestPayment.book.category || "",
    excludeBookIds: ownedBookIds,
  });

  if (!recommendedProducts.length) {
    return null;
  }

  const picks = recommendedProducts.map((book) => `${book.title} by ${book.authorName || "Creator"}`);
  const copy = buildUpsellCopy({
    variant,
    anchorTitle: latestPayment.book.title,
    picks,
  });

  return {
    user,
    recipient: summarizeRecipient(user),
    variant,
    title: copy.title,
    subject: copy.subject,
    message: copy.message,
    actionLabel: "Explore recommendations",
    actionLink: "explore.html",
    relatedCreatorIds: recommendedProducts.map((book) => book.author).filter(Boolean),
    metadata: {
      anchorBookId: latestPayment.book?._id || null,
      anchorBookTitle: latestPayment.book?.title || "",
      anchorCategory: latestPayment.book?.category || "",
      recommendedProducts: recommendedProducts.map((book) => ({
        bookId: book._id || null,
        creatorId: book.author || null,
        title: book.title || "",
        price: roundMoney(book.price || 0),
      })),
    },
  };
}

async function buildCreatorLaunchCampaignPreview(user, options = {}) {
  const { variant } = getExperimentOptions(options);
  if (!user?._id) {
    return null;
  }

  const approvedBooks = await Book.find({
    author: user._id,
    status: "Approved",
    isArchived: { $ne: true },
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(3)
    .select("title type salesCount publishedAt createdAt");

  const totalApproved = approvedBooks.length;
  const totalSales = Number(user.creatorStats?.totalSales || 0);
  const latestBook = approvedBooks[0] || null;
  const latestBookAge = latestBook
    ? daysBetween(new Date(), latestBook.publishedAt || latestBook.createdAt)
    : null;

  let stage = "";
  if (!totalApproved) {
    stage = "first_publish";
  } else if (totalApproved === 1 && totalSales === 0 && (latestBookAge === null || latestBookAge >= CREATOR_LAUNCH_AFTER_DAYS)) {
    stage = "distribution_push";
  } else if (totalApproved < 3 && totalSales > 0 && (latestBookAge === null || latestBookAge >= CREATOR_LAUNCH_COOLDOWN_DAYS)) {
    stage = "catalog_expansion";
  } else {
    return null;
  }

  const copy = buildCreatorLaunchCopy({
    variant,
    stage,
    latestBookTitle: latestBook?.title || "Your live product",
  });

  return {
    user,
    recipient: summarizeRecipient(user),
    variant,
    title: copy.title,
    subject: copy.title,
    message: copy.message,
    actionLabel: copy.actionLabel,
    actionLink: copy.actionLink,
    relatedCreatorIds: [user._id],
    metadata: {
      triggerStage: stage,
      totalApprovedAtSend: totalApproved,
      totalSalesAtSend: totalSales,
      latestBookId: latestBook?._id || null,
      latestBookTitle: latestBook?.title || "",
    },
  };
}

async function buildReferralPromptCampaignPreview(user, options = {}) {
  const { variant } = getExperimentOptions(options);
  if (!user?.referralCode) {
    return null;
  }

  const rewardAmount = getFirstPurchaseRewardAmount();
  const signups = Number(user.referralStats?.signupsCount || 0);
  const rewardedPurchases = Number(user.referralStats?.rewardedPurchasesCount || 0);
  const totalRewardAmount = Number(user.referralStats?.totalRewardAmount || 0);
  const inviteLink = `register.html?ref=${encodeURIComponent(user.referralCode)}`;
  const copy = buildReferralPromptCopy({
    variant,
    referralCode: user.referralCode,
    rewardAmount,
    signups,
    rewardedPurchases,
    totalRewardAmount,
  });

  return {
    user,
    recipient: summarizeRecipient(user),
    variant,
    title: copy.title,
    subject: copy.title,
    message: copy.message,
    actionLabel: "Open referral tools",
    actionLink: "dashboard/setting.html",
    relatedCreatorIds: [user._id],
    metadata: {
      referralCode: user.referralCode,
      inviteLink,
      rewardAmount: roundMoney(rewardAmount),
      signupsAtSend: signups,
      rewardedPurchasesAtSend: rewardedPurchases,
      totalRewardAmountAtSend: roundMoney(totalRewardAmount),
    },
  };
}

async function buildLifecycleModeCopyPreview(mode, candidate, options = {}) {
  if (mode === "cart") {
    return buildAbandonedCartCampaignPreview(candidate, options);
  }

  if (mode === "upsell") {
    return buildUpsellCampaignPreview(candidate, options);
  }

  if (mode === "creator") {
    return buildCreatorLaunchCampaignPreview(candidate, options);
  }

  if (mode === "referral") {
    return buildReferralPromptCampaignPreview(candidate, options);
  }

  return null;
}

async function findDigestCandidates(limit = 20, force = false) {
  const users = await User.find({
    status: { $ne: "blocked" },
    isDeleted: { $ne: true },
    "notifications.email": { $ne: false },
    "engagement.lastActiveAt": { $ne: null },
  })
    .sort({ "engagement.lastActiveAt": -1 })
    .limit(Math.max(Number(limit || 20), 1))
    .select("name email role notifications preferences following creatorStats engagement createdAt updatedAt referralCode referralStats");

  if (force) {
    return users;
  }

  return users.filter((user) => {
    const daysSinceDigest = daysBetween(new Date(), user.engagement?.lastDigestEmailAt);
    return daysSinceDigest === null || daysSinceDigest >= DIGEST_GAP_DAYS;
  });
}

async function findComebackCandidates(limit = 20, force = false) {
  const now = new Date();
  const users = await User.find({
    status: { $ne: "blocked" },
    isDeleted: { $ne: true },
    "notifications.email": { $ne: false },
    "engagement.lastActiveAt": { $ne: null },
  })
    .sort({ "engagement.lastActiveAt": 1 })
    .limit(Math.max(Number(limit || 20), 1) * 4)
    .select("name email role notifications preferences following creatorStats engagement createdAt updatedAt referralCode referralStats");

  const filtered = users.filter((user) => {
    const inactiveDays = daysBetween(now, user.engagement?.lastActiveAt);
    if (inactiveDays === null || inactiveDays < COMEBACK_REMINDER_AFTER_DAYS) {
      return false;
    }

    if (force) {
      return true;
    }

    const cooldownDays = daysBetween(now, user.engagement?.lastComebackEmailAt);
    return cooldownDays === null || cooldownDays >= COMEBACK_COOLDOWN_DAYS;
  });

  return filtered.slice(0, Math.max(Number(limit || 20), 1));
}

async function findAbandonedCartCandidates(limit = 20, force = false) {
  const now = new Date();
  const carts = await Cart.find({
    "items.0": { $exists: true },
  })
    .sort({ updatedAt: 1 })
    .limit(Math.max(Number(limit || 20), 1) * 4)
    .populate("user", "name email role status isDeleted notifications engagement")
    .populate("items.book", "title price category type authorName author isArchived status isPaid");

  return carts
    .filter((cart) => {
      const user = cart.user;
      if (!user || user.isDeleted || user.status === "blocked" || user.notifications?.email === false) {
        return false;
      }

      const ageDays = daysBetween(now, cart.updatedAt);
      if (!force && (ageDays === null || ageDays < CART_RECOVERY_AFTER_DAYS)) {
        return false;
      }

      if (force) {
        return true;
      }

      const cooldownDays = daysBetween(now, user.engagement?.lastCartRecoveryAt);
      return cooldownDays === null || cooldownDays >= CART_RECOVERY_COOLDOWN_DAYS;
    })
    .slice(0, Math.max(Number(limit || 20), 1));
}

async function findUpsellCandidates(limit = 20, force = false) {
  const now = new Date();
  const users = await User.find({
    status: { $ne: "blocked" },
    isDeleted: { $ne: true },
    "notifications.email": { $ne: false },
  })
    .sort({ "engagement.lastUpsellEmailAt": 1, updatedAt: -1 })
    .limit(Math.max(Number(limit || 20), 1) * 4)
    .select("name email role status isDeleted notifications preferences following creatorStats engagement createdAt updatedAt");

  const candidates = [];
  for (const user of users) {
    if (!force) {
      const cooldownDays = daysBetween(now, user.engagement?.lastUpsellEmailAt);
      if (cooldownDays !== null && cooldownDays < UPSELL_COOLDOWN_DAYS) {
        continue;
      }
    }

    const latestPayment = await Payment.findOne({
      user: user._id,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .populate("book", "title category language type");

    if (!latestPayment) {
      continue;
    }

    const purchaseAgeDays = daysBetween(now, latestPayment.createdAt);
    if (!force && (purchaseAgeDays === null || purchaseAgeDays < UPSELL_AFTER_DAYS)) {
      continue;
    }

    candidates.push({ user, latestPayment });
    if (candidates.length >= Math.max(Number(limit || 20), 1)) {
      break;
    }
  }

  return candidates;
}

async function findCreatorLaunchCandidates(limit = 20, force = false) {
  const now = new Date();
  const users = await User.find({
    role: { $in: ["creator", "author"] },
    status: { $ne: "blocked" },
    isDeleted: { $ne: true },
    "notifications.email": { $ne: false },
  })
    .sort({ createdAt: 1 })
    .limit(Math.max(Number(limit || 20), 1) * 4)
    .select("name email role username referralCode notifications creatorStats engagement createdAt updatedAt");

  return users.filter((user) => {
    const accountAgeDays = daysBetween(now, user.createdAt);
    if (!force && (accountAgeDays === null || accountAgeDays < CREATOR_LAUNCH_AFTER_DAYS)) {
      return false;
    }

    if (force) {
      return true;
    }

    const cooldownDays = daysBetween(now, user.engagement?.lastCreatorLaunchEmailAt);
    return cooldownDays === null || cooldownDays >= CREATOR_LAUNCH_COOLDOWN_DAYS;
  }).slice(0, Math.max(Number(limit || 20), 1));
}

async function findReferralPromptCandidates(limit = 20, force = false) {
  const now = new Date();
  const users = await User.find({
    referralCode: { $exists: true, $ne: "" },
    status: { $ne: "blocked" },
    isDeleted: { $ne: true },
    "notifications.email": { $ne: false },
  })
    .sort({ "referralStats.lastRewardAt": 1, createdAt: 1 })
    .limit(Math.max(Number(limit || 20), 1) * 4)
    .select("name email role username referralCode notifications creatorStats engagement createdAt updatedAt referralStats");

  return users.filter((user) => {
    const accountAgeDays = daysBetween(now, user.createdAt);
    if (!force && (accountAgeDays === null || accountAgeDays < REFERRAL_PROMPT_AFTER_DAYS)) {
      return false;
    }

    if (force) {
      return true;
    }

    const cooldownDays = daysBetween(now, user.engagement?.lastReferralPromptAt);
    return cooldownDays === null || cooldownDays >= REFERRAL_PROMPT_COOLDOWN_DAYS;
  }).slice(0, Math.max(Number(limit || 20), 1));
}

async function loadRecommendedProducts(user, limit = 3, options = {}) {
  const filter = {
    status: "Approved",
    isArchived: { $ne: true },
  };

  const preferredLanguage = String(user.preferences?.marketplaceLanguage || "All");
  if (preferredLanguage !== "All") {
    filter.language = preferredLanguage;
  }

  const excludedBookIds = new Set(
    (options.excludeBookIds || [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  if (excludedBookIds.size) {
    filter._id = { $nin: [...excludedBookIds] };
  }

  const followingIds = Array.isArray(user.following) ? user.following : [];
  if (followingIds.length) {
    filter.$or = [
      { author: { $in: followingIds } },
      { isFeatured: true },
    ];
  }

  if (options.category) {
    filter.category = options.category;
  }

  return Book.find(filter)
    .sort({ salesCount: -1, views: -1, createdAt: -1 })
    .limit(Math.max(Number(limit || 3), 1))
    .select("title authorName author type category price language");
}

async function buildCreatorDigest(user) {
  const weeklyStart = getWeeklyWindowStart();
  const [weeklyPayments, recentBooks] = await Promise.all([
    Payment.find({
      creator: user._id,
      status: "approved",
      createdAt: { $gte: weeklyStart },
    }).select("amount creatorAmount createdAt"),
    Book.find({
      author: user._id,
      status: "Approved",
      isArchived: { $ne: true },
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(2)
      .select("title type"),
  ]);

  const weeklySales = weeklyPayments.length;
  const weeklyRevenue = weeklyPayments.reduce((sum, payment) => sum + Number(payment.creatorAmount || 0), 0);
  const followerCount = Number(user.creatorStats?.followersCount || 0);
  const recentTitles = recentBooks.map((book) => `${book.title} (${book.type || "Product"})`);

  const summary = weeklySales > 0
    ? `You generated ${weeklySales} sale${weeklySales === 1 ? "" : "s"} and ${formatCurrency(weeklyRevenue)} in creator revenue this week.`
    : `No new sales landed this week, but ${followerCount.toLocaleString("en-IN")} follower${followerCount === 1 ? "" : "s"} can still be activated by a fresh drop.`;

  const body = recentTitles.length
    ? `${summary} Your recent catalog includes ${recentTitles.join(", ")}.`
    : `${summary} Publish one new product to reignite discovery and follow-triggered traffic.`;

  return {
    headline: "Your weekly creator digest is ready",
    body,
    actionLabel: "Open creator hub",
    actionLink: "dashboard/dashboard.html",
  };
}

async function buildReaderDigest(user) {
  const weeklyStart = getWeeklyWindowStart();
  const [weeklyPurchases, recommendedProducts] = await Promise.all([
    Payment.find({
      user: user._id,
      status: "approved",
      createdAt: { $gte: weeklyStart },
    })
      .populate("book", "title")
      .select("book createdAt"),
    loadRecommendedProducts(user, 3),
  ]);

  const purchaseTitles = weeklyPurchases
    .map((payment) => payment.book?.title)
    .filter(Boolean)
    .slice(0, 3);
  const recommendationTitles = recommendedProducts
    .map((book) => `${book.title} by ${book.authorName || "Creator"}`)
    .slice(0, 3);

  const purchaseSummary = weeklyPurchases.length
    ? `You unlocked ${weeklyPurchases.length} product${weeklyPurchases.length === 1 ? "" : "s"} this week${purchaseTitles.length ? `, including ${purchaseTitles.join(", ")}` : ""}.`
    : "You did not unlock anything new this week, which means there is room to improve your personalized feed.";

  const recommendationSummary = recommendationTitles.length
    ? ` Fresh picks for you: ${recommendationTitles.join(" | ")}.`
    : " Browse a few more products and the feed will keep adapting to your goals.";

  return {
    headline: "Your weekly marketplace digest is here",
    body: `${purchaseSummary}${recommendationSummary}`,
    actionLabel: "Explore products",
    actionLink: "explore.html",
  };
}

async function sendWeeklyDigestToUser(user) {
  const digest = isCreatorRole(user.role)
    ? await buildCreatorDigest(user)
    : await buildReaderDigest(user);

  await createNotification({
    user,
    type: "info",
    category: "general",
    title: digest.headline,
    message: digest.body,
    link: digest.actionLink,
    email: {
      subject: digest.headline,
      body: digest.body,
      ctaLabel: digest.actionLabel,
      ctaUrl: digest.actionLink,
      tags: [{ name: "campaign", value: "weekly_digest" }],
    },
  });

  user.engagement = {
    ...(user.engagement || {}),
    lastDigestEmailAt: new Date(),
  };
  await user.save({ validateBeforeSave: false });

  return digest;
}

async function sendComebackReminderToUser(user) {
  const recommendedProducts = await loadRecommendedProducts(user, 2);
  const recommendationSnippet = recommendedProducts.length
    ? recommendedProducts
      .map((book) => `${book.title} (${book.type || "Product"})`)
      .join(" and ")
    : "fresh creator products";
  const inactiveDays = Math.max(
    daysBetween(new Date(), user.engagement?.lastActiveAt) || COMEBACK_REMINDER_AFTER_DAYS,
    COMEBACK_REMINDER_AFTER_DAYS
  );

  const title = isCreatorRole(user.role)
    ? "Come back and ship your next creator drop"
    : "Come back and unlock your next product";
  const message = isCreatorRole(user.role)
    ? `You have been away for ${inactiveDays} days. Your storefront can regain momentum with a fresh launch, especially while your audience is still warm.`
    : `You have been away for ${inactiveDays} days. ${recommendationSnippet} are ready to pull your feed and earning goals forward again.`;
  const actionLink = isCreatorRole(user.role) ? "dashboard/upload.html" : "explore.html";
  const actionLabel = isCreatorRole(user.role) ? "Launch a product" : "Return to marketplace";

  await createNotification({
    user,
    type: "warning",
    category: "nudge",
    title,
    message,
    link: actionLink,
    email: {
      subject: title,
      body: message,
      ctaLabel: actionLabel,
      ctaUrl: actionLink,
      tags: [{ name: "campaign", value: "comeback_reminder" }],
    },
  });

  user.engagement = {
    ...(user.engagement || {}),
    lastComebackEmailAt: new Date(),
  };
  await user.save({ validateBeforeSave: false });

  return { title, message, actionLabel, actionLink };
}

async function sendAbandonedCartRecovery(cart, options = {}) {
  const { variant, filters } = getExperimentOptions(options);
  const preview = await buildAbandonedCartCampaignPreview(cart, { variant, filters });
  if (!preview) {
    return null;
  }
  const { user, title, subject, message, actionLabel, actionLink, relatedCreatorIds, metadata } = preview;

  const notification = await createNotification({
    user,
    type: "warning",
    category: "cart",
    title,
    message,
    link: actionLink,
    email: {
      subject,
      body: message,
      ctaLabel: actionLabel,
      ctaUrl: actionLink,
      tags: [{ name: "campaign", value: "abandoned_cart" }],
    },
  });

  await logCampaignDelivery({
    notification,
    userId: user._id,
    relatedCreatorIds,
    campaignKey: "abandoned_cart",
    variant,
    title,
    message,
    link: actionLink,
    metadata,
    filtersSnapshot: filters,
  }).catch((error) => {
    console.error("Abandoned Cart Tracking Error:", error.message);
  });

  user.engagement = {
    ...(user.engagement || {}),
    lastCartRecoveryAt: new Date(),
  };
  await user.save({ validateBeforeSave: false });

  return { title, message, actionLabel, actionLink, variant };
}

async function sendUpsellToUser({ user, latestPayment }, options = {}) {
  const { variant, filters } = getExperimentOptions(options);
  const preview = await buildUpsellCampaignPreview({ user, latestPayment }, { variant, filters });
  if (!preview) {
    return null;
  }
  const {
    title,
    subject,
    message,
    actionLabel,
    actionLink,
    relatedCreatorIds,
    metadata,
  } = preview;

  const notification = await createNotification({
    user,
    type: "info",
    category: "purchase",
    title,
    message,
    link: actionLink,
    email: {
      subject,
      body: message,
      ctaLabel: actionLabel,
      ctaUrl: actionLink,
      tags: [{ name: "campaign", value: "post_purchase_upsell" }],
    },
  });

  await logCampaignDelivery({
    notification,
    userId: user._id,
    relatedCreatorIds,
    campaignKey: "post_purchase_upsell",
    variant,
    title,
    message,
    link: actionLink,
    metadata,
    filtersSnapshot: filters,
  }).catch((error) => {
    console.error("Upsell Tracking Error:", error.message);
  });

  user.engagement = {
    ...(user.engagement || {}),
    lastUpsellEmailAt: new Date(),
  };
  await user.save({ validateBeforeSave: false });

  return { title, message, actionLabel, actionLink, variant };
}

async function sendCreatorLaunchSequenceToUser(user, options = {}) {
  const { variant, filters } = getExperimentOptions(options);
  const preview = await buildCreatorLaunchCampaignPreview(user, { variant, filters });
  if (!preview) {
    return null;
  }
  const { title, message, subject, actionLabel, actionLink, metadata } = preview;

  const notification = await createNotification({
    user,
    type: "info",
    category: "nudge",
    title,
    message,
    link: actionLink,
    email: {
      subject,
      body: message,
      ctaLabel: actionLabel,
      ctaUrl: actionLink,
      tags: [{ name: "campaign", value: "creator_launch_sequence" }],
    },
  });

  await logCampaignDelivery({
    notification,
    userId: user._id,
    creatorId: user._id,
    relatedCreatorIds: [user._id],
    campaignKey: "creator_launch_sequence",
    variant,
    title,
    message,
    link: actionLink,
    metadata,
    filtersSnapshot: filters,
  }).catch((error) => {
    console.error("Creator Launch Tracking Error:", error.message);
  });

  user.engagement = {
    ...(user.engagement || {}),
    lastCreatorLaunchEmailAt: new Date(),
  };
  await user.save({ validateBeforeSave: false });

  return { title, message, actionLabel, actionLink, variant };
}

async function sendReferralPromptToUser(user, options = {}) {
  const { variant, filters } = getExperimentOptions(options);
  const preview = await buildReferralPromptCampaignPreview(user, { variant, filters });
  if (!preview) {
    return null;
  }
  const { title, message, subject, actionLabel, actionLink, metadata } = preview;

  const notification = await createNotification({
    user,
    type: "info",
    category: "referral",
    title,
    message,
    link: actionLink,
    email: {
      subject,
      body: `${message} Your invite link is ready in creator settings.`,
      ctaLabel: actionLabel,
      ctaUrl: actionLink,
      tags: [{ name: "campaign", value: "referral_prompt" }],
    },
  });

  await logCampaignDelivery({
    notification,
    userId: user._id,
    creatorId: user._id,
    relatedCreatorIds: [user._id],
    campaignKey: "referral_prompt",
    variant,
    title,
    message,
    link: actionLink,
    metadata,
    filtersSnapshot: filters,
  }).catch((error) => {
    console.error("Referral Prompt Tracking Error:", error.message);
  });

  user.engagement = {
    ...(user.engagement || {}),
    lastReferralPromptAt: new Date(),
  };
  await user.save({ validateBeforeSave: false });

  return { title, message, actionLabel, actionLink, variant };
}

async function runWeeklyDigests({ limit = 20, force = false, filters = {} } = {}) {
  const users = await getFilteredDigestCandidates({ limit, force, filters });
  let sent = 0;

  for (const user of users) {
    try {
      await sendWeeklyDigestToUser(user);
      sent += 1;
    } catch (error) {
      console.error("Weekly Digest Error:", error.message);
    }
  }

  return {
    success: true,
    mode: "digest",
    filtersApplied: normalizeLifecycleFilters(filters),
    candidates: users.length,
    sent,
  };
}

async function runComebackReminders({ limit = 20, force = false, filters = {} } = {}) {
  const users = await getFilteredComebackCandidates({ limit, force, filters });
  let sent = 0;

  for (const user of users) {
    try {
      await sendComebackReminderToUser(user);
      sent += 1;
    } catch (error) {
      console.error("Comeback Reminder Error:", error.message);
    }
  }

  return {
    success: true,
    mode: "reminder",
    filtersApplied: normalizeLifecycleFilters(filters),
    candidates: users.length,
    sent,
  };
}

async function runAbandonedCartRecovery({ limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const variantResolution = await resolveModeVariant("cart", variant);
  const carts = await getFilteredCartCandidates({ limit, force, filters });
  let sent = 0;

  for (const cart of carts) {
    try {
      const result = await sendAbandonedCartRecovery(cart, {
        variant: variantResolution.appliedVariant,
        filters,
      });
      if (result) {
        sent += 1;
      }
    } catch (error) {
      console.error("Abandoned Cart Recovery Error:", error.message);
    }
  }

  return {
    success: true,
    mode: "cart",
    variantRequested: variantResolution.requestedVariant,
    variantApplied: variantResolution.appliedVariant,
    variantSource: variantResolution.variantSource,
    filtersApplied: normalizeLifecycleFilters(filters),
    candidates: carts.length,
    sent,
  };
}

async function runPostPurchaseUpsells({ limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const variantResolution = await resolveModeVariant("upsell", variant);
  const candidates = await getFilteredUpsellCandidates({ limit, force, filters });
  let sent = 0;

  for (const candidate of candidates) {
    try {
      const result = await sendUpsellToUser(candidate, {
        variant: variantResolution.appliedVariant,
        filters,
      });
      if (result) {
        sent += 1;
      }
    } catch (error) {
      console.error("Post Purchase Upsell Error:", error.message);
    }
  }

  return {
    success: true,
    mode: "upsell",
    variantRequested: variantResolution.requestedVariant,
    variantApplied: variantResolution.appliedVariant,
    variantSource: variantResolution.variantSource,
    filtersApplied: normalizeLifecycleFilters(filters),
    candidates: candidates.length,
    sent,
  };
}

async function runCreatorLaunchSequences({ limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const variantResolution = await resolveModeVariant("creator", variant);
  const users = await getFilteredCreatorCandidates({ limit, force, filters });
  let sent = 0;

  for (const user of users) {
    try {
      const result = await sendCreatorLaunchSequenceToUser(user, {
        variant: variantResolution.appliedVariant,
        filters,
      });
      if (result) {
        sent += 1;
      }
    } catch (error) {
      console.error("Creator Launch Sequence Error:", error.message);
    }
  }

  return {
    success: true,
    mode: "creator",
    variantRequested: variantResolution.requestedVariant,
    variantApplied: variantResolution.appliedVariant,
    variantSource: variantResolution.variantSource,
    filtersApplied: normalizeLifecycleFilters(filters),
    candidates: users.length,
    sent,
  };
}

async function runReferralPrompts({ limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const variantResolution = await resolveModeVariant("referral", variant);
  const users = await getFilteredReferralCandidates({ limit, force, filters });
  let sent = 0;

  for (const user of users) {
    try {
      const result = await sendReferralPromptToUser(user, {
        variant: variantResolution.appliedVariant,
        filters,
      });
      if (result) {
        sent += 1;
      }
    } catch (error) {
      console.error("Referral Prompt Error:", error.message);
    }
  }

  return {
    success: true,
    mode: "referral",
    variantRequested: variantResolution.requestedVariant,
    variantApplied: variantResolution.appliedVariant,
    variantSource: variantResolution.variantSource,
    filtersApplied: normalizeLifecycleFilters(filters),
    candidates: users.length,
    sent,
  };
}

async function runCrmCampaigns({ limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const normalizedRequestedVariant = normalizeRequestedVariant(variant);
  const [cartRecovery, upsells, creatorLaunch, referralPrompts] = await Promise.all([
    runAbandonedCartRecovery({ limit, force, variant, filters }),
    runPostPurchaseUpsells({ limit, force, variant, filters }),
    runCreatorLaunchSequences({ limit, force, variant, filters }),
    runReferralPrompts({ limit, force, variant, filters }),
  ]);

  return {
    success: true,
    mode: "crm",
    variantRequested: normalizedRequestedVariant,
    variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(variant),
    variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
    filtersApplied: normalizeLifecycleFilters(filters),
    cartRecovery,
    upsells,
    creatorLaunch,
    referralPrompts,
  };
}

async function previewModeCandidates(mode, { limit = 20, force = false, filters = {}, variant = "default" } = {}) {
  const normalizedFilters = normalizeLifecycleFilters(filters);
  const variantResolution = CRM_MODE_TO_CAMPAIGN_KEY[mode]
    ? await resolveModeVariant(mode, variant)
    : null;
  let candidates = [];

  if (mode === "digest") {
    candidates = await getFilteredDigestCandidates({ limit, force, filters: normalizedFilters });
  } else if (mode === "reminder") {
    candidates = await getFilteredComebackCandidates({ limit, force, filters: normalizedFilters });
  } else if (mode === "cart") {
    candidates = await getFilteredCartCandidates({ limit, force, filters: normalizedFilters });
  } else if (mode === "upsell") {
    candidates = await getFilteredUpsellCandidates({ limit, force, filters: normalizedFilters });
  } else if (mode === "creator") {
    candidates = await getFilteredCreatorCandidates({ limit, force, filters: normalizedFilters });
  } else if (mode === "referral") {
    candidates = await getFilteredReferralCandidates({ limit, force, filters: normalizedFilters });
  }

  const copyPreview = candidates.length && variantResolution?.appliedVariant
    ? await buildLifecycleModeCopyPreview(mode, candidates[0], {
        variant: variantResolution.appliedVariant,
        filters: normalizedFilters,
      })
    : null;

  return {
    success: true,
    mode,
    variantRequested: variantResolution?.requestedVariant || null,
    variantApplied: variantResolution?.appliedVariant || null,
    variantSource: variantResolution?.variantSource || null,
    filtersApplied: normalizedFilters,
    candidates: candidates.length,
    samples: candidates.slice(0, 5).map((candidate) => summarizeExperimentCandidate(mode, candidate)),
    copyPreview: copyPreview
      ? {
          recipient: copyPreview.recipient || null,
          variant: copyPreview.variant || variantResolution?.appliedVariant || "default",
          title: copyPreview.title,
          subject: copyPreview.subject || copyPreview.title,
          message: copyPreview.message,
          actionLabel: copyPreview.actionLabel || "Open workflow",
          actionLink: copyPreview.actionLink || "",
        }
      : null,
  };
}

async function previewLifecycleCampaigns({ mode = "cart", limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const normalizedMode = String(mode || "cart").trim().toLowerCase();
  const normalizedFilters = normalizeLifecycleFilters(filters);
  const normalizedRequestedVariant = normalizeRequestedVariant(variant);

  if (normalizedMode === "crm") {
    const [cartRecovery, upsells, creatorLaunch, referralPrompts] = await Promise.all([
      previewModeCandidates("cart", { limit, force, filters: normalizedFilters, variant: normalizedRequestedVariant }),
      previewModeCandidates("upsell", { limit, force, filters: normalizedFilters, variant: normalizedRequestedVariant }),
      previewModeCandidates("creator", { limit, force, filters: normalizedFilters, variant: normalizedRequestedVariant }),
      previewModeCandidates("referral", { limit, force, filters: normalizedFilters, variant: normalizedRequestedVariant }),
    ]);

    return {
      success: true,
      mode: normalizedMode,
      variantRequested: normalizedRequestedVariant,
      variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
      variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
      filtersApplied: normalizedFilters,
      crm: { cartRecovery, upsells, creatorLaunch, referralPrompts },
    };
  }

  if (normalizedMode === "all") {
    const [digest, reminders, crm] = await Promise.all([
      previewModeCandidates("digest", { limit, force, filters: normalizedFilters }),
      previewModeCandidates("reminder", { limit, force, filters: normalizedFilters }),
      previewLifecycleCampaigns({ mode: "crm", limit, force, variant: normalizedRequestedVariant, filters: normalizedFilters }),
    ]);

    return {
      success: true,
      mode: normalizedMode,
      variantRequested: normalizedRequestedVariant,
      variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
      variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
      filtersApplied: normalizedFilters,
      digest,
      reminders,
      crm: crm.crm,
    };
  }

  const preview = await previewModeCandidates(normalizedMode, {
    limit,
    force,
    filters: normalizedFilters,
    variant: normalizedRequestedVariant,
  });
  return {
    success: true,
    mode: normalizedMode,
    filtersApplied: normalizedFilters,
    ...preview,
  };
}

async function runLifecycleCampaigns({ mode = "all", limit = 20, force = false, variant = "default", filters = {} } = {}) {
  const normalizedMode = String(mode || "all").trim().toLowerCase();
  const normalizedFilters = normalizeLifecycleFilters(filters);
  const normalizedRequestedVariant = normalizeRequestedVariant(variant);
  const result = {
    success: true,
    mode: normalizedMode,
    variantRequested: normalizedRequestedVariant,
    variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
    variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
    filtersApplied: normalizedFilters,
    digest: null,
    reminders: null,
    crm: null,
  };

  if (normalizedMode === "all" || normalizedMode === "digest") {
    result.digest = await runWeeklyDigests({ limit, force, filters: normalizedFilters });
  }

  if (normalizedMode === "all" || normalizedMode === "reminder") {
    result.reminders = await runComebackReminders({ limit, force, filters: normalizedFilters });
  }

  if (
    normalizedMode === "all"
    || normalizedMode === "crm"
    || normalizedMode === "cart"
    || normalizedMode === "upsell"
    || normalizedMode === "creator"
    || normalizedMode === "referral"
  ) {
    if (normalizedMode === "crm" || normalizedMode === "all") {
      result.crm = await runCrmCampaigns({ limit, force, variant: normalizedRequestedVariant, filters: normalizedFilters });
    } else if (normalizedMode === "cart") {
      result.crm = {
        success: true,
        mode: "crm",
        variantRequested: normalizedRequestedVariant,
        variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
        variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
        filtersApplied: normalizedFilters,
        cartRecovery: await runAbandonedCartRecovery({ limit, force, variant: normalizedRequestedVariant, filters: normalizedFilters }),
        upsells: null,
        creatorLaunch: null,
        referralPrompts: null,
      };
    } else if (normalizedMode === "upsell") {
      result.crm = {
        success: true,
        mode: "crm",
        variantRequested: normalizedRequestedVariant,
        variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
        variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
        filtersApplied: normalizedFilters,
        cartRecovery: null,
        upsells: await runPostPurchaseUpsells({ limit, force, variant: normalizedRequestedVariant, filters: normalizedFilters }),
        creatorLaunch: null,
        referralPrompts: null,
      };
    } else if (normalizedMode === "creator") {
      result.crm = {
        success: true,
        mode: "crm",
        variantRequested: normalizedRequestedVariant,
        variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
        variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
        filtersApplied: normalizedFilters,
        cartRecovery: null,
        upsells: null,
        creatorLaunch: await runCreatorLaunchSequences({ limit, force, variant: normalizedRequestedVariant, filters: normalizedFilters }),
        referralPrompts: null,
      };
    } else if (normalizedMode === "referral") {
      result.crm = {
        success: true,
        mode: "crm",
        variantRequested: normalizedRequestedVariant,
        variantApplied: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : normalizeCampaignVariant(normalizedRequestedVariant),
        variantSource: normalizedRequestedVariant === "auto" ? "per_campaign_auto" : "manual",
        filtersApplied: normalizedFilters,
        cartRecovery: null,
        upsells: null,
        creatorLaunch: null,
        referralPrompts: await runReferralPrompts({ limit, force, variant: normalizedRequestedVariant, filters: normalizedFilters }),
      };
    }
  }

  return result;
}

module.exports = {
  runWeeklyDigests,
  runComebackReminders,
  runAbandonedCartRecovery,
  runPostPurchaseUpsells,
  runCreatorLaunchSequences,
  runReferralPrompts,
  runCrmCampaigns,
  previewLifecycleCampaigns,
  getLifecycleExperimentConfig,
  normalizeLifecycleFilters,
  runLifecycleCampaigns,
};
