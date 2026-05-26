(() => {
const API_BASE = window.API_BASE || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login.html";
}

const navLinks = document.querySelectorAll(".sidebar-nav a");
const sections = document.querySelectorAll(".admin-section");
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const overviewStats = document.getElementById("overviewStats");
const overviewOpsBoard = document.getElementById("overviewOpsBoard");
const overviewLaunchBoard = document.getElementById("overviewLaunchBoard");
const overviewActivityFeed = document.getElementById("overviewActivityFeed");
const headerStatusBadge = document.getElementById("headerStatusBadge");
const headerSyncTime = document.getElementById("headerSyncTime");
const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const navReviewCount = document.getElementById("navReviewCount");
const navCreatorsCount = document.getElementById("navCreatorsCount");
const navPayoutsCount = document.getElementById("navPayoutsCount");
const navAiCount = document.getElementById("navAiCount");
const navReportsCount = document.getElementById("navReportsCount");
const adminIdentityName = document.getElementById("adminIdentityName");
const adminIdentityMeta = document.getElementById("adminIdentityMeta");
const adminIdentityAvatar = document.querySelector(".identity-avatar");
const jumpButtons = document.querySelectorAll("[data-jump-target]");
const contentList = document.getElementById("contentList");
const contentSearchInput = document.getElementById("contentSearchInput");
const contentTypeFilter = document.getElementById("contentTypeFilter");
const contentAiFilter = document.getElementById("contentAiFilter");
const contentSortFilter = document.getElementById("contentSortFilter");
const reviewReportList = document.getElementById("reviewReportList");
const approvedList = document.getElementById("approvedList");
const approvedSearchInput = document.getElementById("approvedSearchInput");
const approvedSortFilter = document.getElementById("approvedSortFilter");
const paymentReviewList = document.getElementById("paymentReviewList");
const withdrawRequestList = document.getElementById("withdrawRequestList");
const aiOverview = document.getElementById("aiOverview");
const aiFlaggedList = document.getElementById("aiFlaggedList");
const creatorOverview = document.getElementById("creatorOverview");
const verificationRequestList = document.getElementById("verificationRequestList");
const referralLeaderboardList = document.getElementById("referralLeaderboardList");
const reportsOverview = document.getElementById("reportsOverview");
const reportsLaunchOverview = document.getElementById("reportsLaunchOverview");
const reportsLaunchChecks = document.getElementById("reportsLaunchChecks");
const reportsTypeBreakdown = document.getElementById("reportsTypeBreakdown");
const reportsDeliveryBreakdown = document.getElementById("reportsDeliveryBreakdown");
const reportsTopProducts = document.getElementById("reportsTopProducts");
const reportsCampaignOverview = document.getElementById("reportsCampaignOverview");
const reportsExperimentWinners = document.getElementById("reportsExperimentWinners");
const reportsExperimentRecommendations = document.getElementById("reportsExperimentRecommendations");
const reportsLifecycleStrategies = document.getElementById("reportsLifecycleStrategies");
const reportsLifecycleSnapshots = document.getElementById("reportsLifecycleSnapshots");
const reportsCampaignBreakdown = document.getElementById("reportsCampaignBreakdown");
const reportsCampaignVariants = document.getElementById("reportsCampaignVariants");
const reportsCampaignHistory = document.getElementById("reportsCampaignHistory");
const captureLifecycleSnapshotBtn = document.getElementById("captureLifecycleSnapshotBtn");
const crmLabMode = document.getElementById("crmLabMode");
const crmLabVariant = document.getElementById("crmLabVariant");
const crmLabRole = document.getElementById("crmLabRole");
const crmLabLanguage = document.getElementById("crmLabLanguage");
const crmLabLimit = document.getElementById("crmLabLimit");
const crmLabForce = document.getElementById("crmLabForce");
const crmLabPreviewBtn = document.getElementById("crmLabPreviewBtn");
const crmLabRunBtn = document.getElementById("crmLabRunBtn");
const crmLabStatus = document.getElementById("crmLabStatus");
const crmLabPreview = document.getElementById("crmLabPreview");
const crmLabRunResult = document.getElementById("crmLabRunResult");
const settingsOverviewStats = document.getElementById("settingsOverviewStats");
const settingsRuntimeList = document.getElementById("settingsRuntimeList");
const settingsOpsList = document.getElementById("settingsOpsList");
let lifecycleLabConfig = null;
let activeSection = "overview";
let sectionChangeNonce = 0;
const adminState = {
  lastSyncedAt: null,
  flaggedBooksCount: 0,
  reviewReportsCount: 0,
  pendingPaymentGroupsCount: 0,
  actionableWithdrawCount: 0,
  pendingVerificationsCount: 0,
  aiHighRiskCount: 0,
  aiManualReviewCount: 0,
  reportsHotCount: 0,
};
const adminCollections = {
  pendingBooks: [],
  approvedBooks: [],
  reviewReports: [],
  pendingPayments: [],
  withdrawals: [],
  creatorOverview: null,
  settingsHealth: null,
  settingsAi: null,
};

const HEADERS = {
  overview: {
    title: "Command Center",
    sub: "Run moderation, creator growth, treasury, lifecycle experiments, and launch readiness from one founder-grade operating surface.",
  },
  review: {
    title: "Pending Content Review",
    sub: "Review quality, originality & monetization potential",
  },
  approved: {
    title: "Approved Library",
    sub: "Live & published content",
  },
  creators: {
    title: "Creators",
    sub: "Verification queue, referral growth & creator trust operations",
  },
  payouts: {
    title: "Payouts",
    sub: "Buyer payment verification and creator withdrawal operations",
  },
  ai: {
    title: "AI Signals",
    sub: "Demand, risk & AI insights",
  },
  reports: {
    title: "Reports",
    sub: "Revenue & platform analytics",
  },
  settings: {
    title: "Settings",
    sub: "Rules & admin configuration",
  },
};

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const target = link.dataset.target;
    if (target) {
      switchSection(target);
    }
  });
});

jumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-jump-target");
    if (target) {
      switchSection(target);
    }
  });
});

crmLabPreviewBtn?.addEventListener("click", previewLifecycleExperiment);
crmLabRunBtn?.addEventListener("click", runLifecycleExperiment);
captureLifecycleSnapshotBtn?.addEventListener("click", captureLifecycleSnapshot);
refreshAdminBtn?.addEventListener("click", refreshActiveSection);
contentSearchInput?.addEventListener("input", applyPendingBookFilters);
contentTypeFilter?.addEventListener("change", applyPendingBookFilters);
contentAiFilter?.addEventListener("change", applyPendingBookFilters);
contentSortFilter?.addEventListener("change", applyPendingBookFilters);
approvedSearchInput?.addEventListener("input", applyApprovedBookFilters);
approvedSortFilter?.addEventListener("change", applyApprovedBookFilters);
window.addEventListener("hashchange", () => {
  const target = resolveInitialSection();
  if (target !== activeSection) {
    void switchSection(target);
  }
});

function parseStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.warn("Failed to parse stored user:", error.message);
    return null;
  }
}

function syncAdminIdentity() {
  const user = parseStoredUser() || {};
  const displayName = user.name || user.username || "Admin";
  const secondary = user.email || user.role || "Marketplace operator";
  const avatarSource = String(displayName || "A").trim().charAt(0).toUpperCase() || "A";

  if (adminIdentityName) {
    adminIdentityName.textContent = displayName;
  }
  if (adminIdentityMeta) {
    adminIdentityMeta.textContent = secondary;
  }
  if (adminIdentityAvatar) {
    adminIdentityAvatar.textContent = avatarSource;
  }
}

function updateHeader(target) {
  pageTitle.textContent = HEADERS[target]?.title || "Admin";
  pageSub.textContent = HEADERS[target]?.sub || "";
}

function setActiveNav(target) {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.target === target);
  });
}

function setActiveSection(target) {
  sections.forEach((section) => {
    section.classList.toggle("active", section.id === target);
  });
}

function getSelectedText(selectElement, fallback = "") {
  if (!selectElement || selectElement.selectedIndex < 0) {
    return fallback;
  }

  return String(selectElement.options[selectElement.selectedIndex]?.text || fallback).trim();
}

function sortByCreatedAtDesc(left, right) {
  return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
}

function formatSupportedMarketLabel(market) {
  if (!market) {
    return "";
  }

  if (typeof market === "string") {
    return market;
  }

  const country = String(market.countryName || market.countryCode || "").trim();
  const currency = String(market.currency || "").trim();

  if (country && currency) {
    return `${country} (${currency})`;
  }

  return country || currency || "";
}

function formatSupportedMarkets(markets = []) {
  return markets
    .map((market) => formatSupportedMarketLabel(market))
    .filter(Boolean)
    .join(", ");
}

function resolveInitialSection() {
  const requested = String(window.location.hash || "").replace(/^#/, "").trim();
  return requested && document.getElementById(requested) ? requested : "overview";
}

async function switchSection(target) {
  const safeTarget = document.getElementById(target) ? target : "overview";
  const switchNonce = ++sectionChangeNonce;
  activeSection = safeTarget;
  setActiveNav(safeTarget);
  setActiveSection(safeTarget);
  updateHeader(safeTarget);
  if (window.location.hash !== `#${safeTarget}`) {
    history.replaceState(null, "", `#${safeTarget}`);
  }

  if (headerSyncTime) {
    headerSyncTime.textContent = `Loading ${HEADERS[safeTarget]?.title || "section"}...`;
  }

  try {
    await loadSectionData(safeTarget);
  } catch (error) {
    if (switchNonce !== sectionChangeNonce) {
      return;
    }

    console.error(`Admin section load failed for ${safeTarget}:`, error);
    setHeaderStatus("Section Error", "blocked");
    if (headerSyncTime) {
      headerSyncTime.textContent = error?.message || "Section failed to load";
    }
    renderSectionFailure(safeTarget, error);
  }
}

async function loadSectionData(target) {
  if (target === "overview") {
    await loadCommandCenter();
    return;
  }

  if (target === "review") {
    await Promise.all([loadPendingBooks(), loadReviewReports()]);
    return;
  }

  if (target === "approved") {
    await loadApprovedBooks();
    return;
  }

  if (target === "creators") {
    await loadCreatorsHub();
    return;
  }

  if (target === "payouts") {
    await Promise.all([loadPendingPayments(), loadWithdrawRequests()]);
    return;
  }

  if (target === "ai") {
    await loadAIOverview();
    return;
  }

  if (target === "reports") {
    await loadReportsOverview();
    return;
  }

  if (target === "settings") {
    await loadSettingsOverview();
  }
}

function renderSectionFailure(target, error) {
  const message = escapeHTML(error?.message || "Unable to load this admin section right now.");

  if (target === "review") {
    if (contentList) {
      contentList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    }
    if (reviewReportList) {
      reviewReportList.innerHTML = `<div class="empty-state"><p>Review reports are temporarily unavailable.</p></div>`;
    }
    return;
  }

  if (target === "approved" && approvedList) {
    approvedList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    return;
  }

  if (target === "creators") {
    creatorOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    verificationRequestList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    referralLeaderboardList.innerHTML = `<div class="empty-state"><p>Referral leaderboard unavailable right now.</p></div>`;
    return;
  }

  if (target === "payouts") {
    paymentReviewList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    withdrawRequestList.innerHTML = `<div class="empty-state"><p>Creator payout data is temporarily unavailable.</p></div>`;
    return;
  }

  if (target === "ai") {
    aiOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    aiFlaggedList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    return;
  }

  if (target === "reports") {
    reportsOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    reportsLaunchOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    reportsLaunchChecks.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    return;
  }

  if (target === "settings") {
    if (settingsOverviewStats) {
      settingsOverviewStats.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    }
    if (settingsRuntimeList) {
      settingsRuntimeList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    }
    if (settingsOpsList) {
      settingsOpsList.innerHTML = `<div class="empty-state"><p>Ops shortcuts are temporarily unavailable.</p></div>`;
    }
  }
}

async function refreshActiveSection() {
  if (refreshAdminBtn) {
    refreshAdminBtn.disabled = true;
    refreshAdminBtn.textContent = "Refreshing...";
  }

  try {
    await loadSectionData(activeSection);
  } catch (error) {
    console.error("Admin refresh failed:", error);
    setHeaderStatus("Refresh Failed", "blocked");
    if (headerSyncTime) {
      headerSyncTime.textContent = error?.message || "Unable to refresh dashboard";
    }
  } finally {
    if (refreshAdminBtn) {
      refreshAdminBtn.disabled = false;
      refreshAdminBtn.textContent = "Refresh Data";
    }
  }
}

function markAdminSynced() {
  adminState.lastSyncedAt = new Date();
  if (headerSyncTime) {
    headerSyncTime.textContent = `Synced ${adminState.lastSyncedAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
}

function setHeaderStatus(label, tone = "live") {
  if (!headerStatusBadge) {
    return;
  }

  headerStatusBadge.textContent = label;
  headerStatusBadge.className = `status-chip ${tone}`;
}

function updateNavCounts() {
  if (navReviewCount) {
    navReviewCount.textContent = String(adminState.flaggedBooksCount + adminState.reviewReportsCount);
  }
  if (navCreatorsCount) {
    navCreatorsCount.textContent = String(adminState.pendingVerificationsCount);
  }
  if (navPayoutsCount) {
    navPayoutsCount.textContent = String(adminState.pendingPaymentGroupsCount + adminState.actionableWithdrawCount);
  }
  if (navAiCount) {
    navAiCount.textContent = String(adminState.aiHighRiskCount + adminState.aiManualReviewCount);
  }
  if (navReportsCount) {
    navReportsCount.textContent = adminState.reportsHotCount > 0
      ? String(adminState.reportsHotCount)
      : "Live";
  }
}

function updateGlobalHealthStatus(launchReadiness = {}) {
  const launchBlockers = Number(launchReadiness.blockerCount || 0);
  const launchWarnings = Number(launchReadiness.warningCount || 0);
  const queuePressure = adminState.flaggedBooksCount
    + adminState.reviewReportsCount
    + adminState.pendingPaymentGroupsCount
    + adminState.actionableWithdrawCount
    + adminState.pendingVerificationsCount;
  const aiPressure = adminState.aiHighRiskCount + adminState.aiManualReviewCount;

  if (launchBlockers > 0 || aiPressure >= 10) {
    setHeaderStatus("Blockers Live", "blocked");
    return;
  }

  if (launchWarnings > 0 || queuePressure > 0 || aiPressure > 0) {
    setHeaderStatus("Attention Needed", "warning");
    return;
  }

  setHeaderStatus("Live Ops", "live");
}

async function adminFetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${path}`);
  }
  return data;
}

function renderCommandCenterLoading() {
  if (overviewStats) {
    overviewStats.innerHTML = Array.from({ length: 6 }, () => `
      <article class="stat-card">
        <h3>Loading</h3>
        <p>...</p>
      </article>
    `).join("");
  }

  if (overviewOpsBoard) {
    overviewOpsBoard.innerHTML = Array.from({ length: 4 }, () => `
      <article class="priority-card">
        <div class="priority-meta">
          <span class="priority-value">...</span>
          <span class="priority-tone attention">Syncing</span>
        </div>
        <h3>Loading priority</h3>
        <p>Pulling live admin queues and marketplace operations.</p>
      </article>
    `).join("");
  }

  if (overviewLaunchBoard) {
    overviewLaunchBoard.innerHTML = `
      <div class="empty-state">
        <p>Loading launch readiness and deployment signals...</p>
      </div>
    `;
  }

  if (overviewActivityFeed) {
    overviewActivityFeed.innerHTML = `
      <div class="empty-state">
        <p>Loading the latest marketplace activity...</p>
      </div>
    `;
  }
}

async function loadCommandCenter() {
  renderCommandCenterLoading();

  const [
    analyticsResult,
    creatorsResult,
    flaggedResult,
    reportsResult,
    paymentsResult,
    withdrawalsResult,
    aiResult,
  ] = await Promise.allSettled([
    adminFetchJson("/api/admin/analytics"),
    adminFetchJson("/api/admin/creators/overview"),
    adminFetchJson("/api/admin/books/flagged"),
    adminFetchJson("/api/admin/review-reports"),
    adminFetchJson("/api/payments/pending"),
    adminFetchJson("/api/admin/withdrawals"),
    adminFetchJson("/api/ai/admin/overview"),
  ]);

  const analyticsData = analyticsResult.status === "fulfilled" ? analyticsResult.value : {};
  const creatorsData = creatorsResult.status === "fulfilled" ? creatorsResult.value : {};
  const flaggedData = flaggedResult.status === "fulfilled" ? flaggedResult.value : {};
  const reportsData = reportsResult.status === "fulfilled" ? reportsResult.value : {};
  const paymentsData = paymentsResult.status === "fulfilled" ? paymentsResult.value : {};
  const withdrawalsData = withdrawalsResult.status === "fulfilled" ? withdrawalsResult.value : {};
  const aiData = aiResult.status === "fulfilled" ? aiResult.value : {};

  const commandCenter = {
    analytics: analyticsData.analytics || {},
    launchReadiness: analyticsData.launchReadiness || {},
    topProducts: analyticsData.topProducts || [],
    campaignAnalytics: analyticsData.campaignAnalytics || {},
    lifecycleStrategies: analyticsData.lifecycleStrategies || [],
    lifecycleSnapshots: analyticsData.lifecycleSnapshots || [],
    creatorsSummary: creatorsData.summary || {},
    verificationRequests: creatorsData.verificationRequests || [],
    topReferrers: creatorsData.topReferrers || [],
    flaggedBooks: flaggedData.books || [],
    reviewReports: reportsData.reports || [],
    pendingPayments: paymentsData.payments || [],
    paymentGroups: groupPendingPayments(paymentsData.payments || []),
    withdrawals: withdrawalsData.withdrawals || [],
    withdrawalSummary: withdrawalsData.summary || {},
    aiSummary: aiData.summary || {},
    aiFlagged: aiData.topFlagged || [],
    fetchErrors: [
      analyticsResult,
      creatorsResult,
      flaggedResult,
      reportsResult,
      paymentsResult,
      withdrawalsResult,
      aiResult,
    ].filter((entry) => entry.status === "rejected").length,
  };

  adminState.flaggedBooksCount = commandCenter.flaggedBooks.length;
  adminState.reviewReportsCount = commandCenter.reviewReports.length;
  adminState.pendingPaymentGroupsCount = commandCenter.paymentGroups.length;
  adminState.actionableWithdrawCount = commandCenter.withdrawals.filter((item) => ["pending", "approved"].includes(String(item.status || "").toLowerCase())).length;
  adminState.pendingVerificationsCount = Number(commandCenter.creatorsSummary.pendingVerifications || 0);
  adminState.aiHighRiskCount = Number(commandCenter.aiSummary.highRisk || 0);
  adminState.aiManualReviewCount = Number(commandCenter.aiSummary.manualReview || 0);
  adminState.reportsHotCount = Array.isArray(commandCenter.campaignAnalytics?.experimentInsights?.winners)
    ? commandCenter.campaignAnalytics.experimentInsights.winners.length
    : 0;

  updateNavCounts();
  updateGlobalHealthStatus(commandCenter.launchReadiness);
  renderCommandCenter(commandCenter);
  markAdminSynced();
}

async function loadPendingBooks() {
  try {
    const data = await adminFetchJson("/api/admin/books/flagged");
    const books = Array.isArray(data.books) ? data.books : [];
    adminCollections.pendingBooks = books;
    adminState.flaggedBooksCount = books.length;
    updateNavCounts();
    applyPendingBookFilters();
    markAdminSynced();
  } catch (err) {
    console.error(err);
    contentList.innerHTML = "<div class='empty-state'><p>Failed to load pending books</p></div>";
  }
}

async function loadApprovedBooks() {
  try {
    const data = await adminFetchJson("/api/admin/books?status=Approved");
    adminCollections.approvedBooks = Array.isArray(data.books) ? data.books : [];
    applyApprovedBookFilters();
    markAdminSynced();
  } catch (err) {
    console.error(err);
    approvedList.innerHTML = "<div class='empty-state'><p>Failed to load approved books</p></div>";
  }
}

async function loadReviewReports() {
  try {
    const data = await adminFetchJson("/api/admin/review-reports");
    const reports = Array.isArray(data.reports) ? data.reports : [];
    adminCollections.reviewReports = reports;
    adminState.reviewReportsCount = reports.length;
    updateNavCounts();
    renderReviewReports(reports);
    markAdminSynced();
  } catch (err) {
    console.error(err);
    reviewReportList.innerHTML = "<div class='empty-state'><p>Failed to load reported reviews</p></div>";
  }
}

async function loadPendingPayments() {
  try {
    const data = await adminFetchJson("/api/payments/pending");
    const payments = Array.isArray(data.payments) ? data.payments : [];
    adminCollections.pendingPayments = payments;
    adminState.pendingPaymentGroupsCount = groupPendingPayments(payments).length;
    updateNavCounts();
    renderPendingPayments(payments);
    markAdminSynced();
  } catch (err) {
    console.error(err);
    paymentReviewList.innerHTML = "<div class='empty-state'><p>Failed to load pending payments</p></div>";
  }
}

async function loadWithdrawRequests() {
  try {
    const data = await adminFetchJson("/api/admin/withdrawals");
    const withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
    adminCollections.withdrawals = withdrawals;
    adminState.actionableWithdrawCount = withdrawals.filter((item) => ["pending", "approved"].includes(String(item.status || "").toLowerCase())).length;
    updateNavCounts();
    renderWithdrawRequests(withdrawals);
    markAdminSynced();
  } catch (err) {
    console.error(err);
    withdrawRequestList.innerHTML = "<div class='empty-state'><p>Failed to load withdrawal requests</p></div>";
  }
}

async function loadCreatorsHub() {
  try {
    const data = await adminFetchJson("/api/admin/creators/overview");
    adminCollections.creatorOverview = data;
    adminState.pendingVerificationsCount = Number(data.summary?.pendingVerifications || 0);
    updateNavCounts();
    renderCreatorOverview(data.summary || {});
    renderVerificationRequests(data.verificationRequests || []);
    renderReferralLeaderboard(data.topReferrers || []);
    markAdminSynced();
  } catch (err) {
    console.error(err);
    creatorOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    verificationRequestList.innerHTML = "<p>Failed to load verification queue</p>";
    referralLeaderboardList.innerHTML = "<p>Failed to load referral leaderboard</p>";
  }
}

async function loadReportsOverview() {
  try {
    await loadLifecycleExperimentConfig();
    const res = await fetch(`${API_BASE}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load reports overview");
    renderReportsOverview(
      data.analytics || {},
      data.launchReadiness || {},
      data.typeBreakdown || [],
      data.deliveryBreakdown || [],
      data.topProducts || [],
      data.campaignAnalytics || {},
      data.lifecycleStrategies || [],
      data.lifecycleSnapshots || []
    );
    adminState.reportsHotCount = Array.isArray(data.campaignAnalytics?.experimentInsights?.winners)
      ? data.campaignAnalytics.experimentInsights.winners.length
      : 0;
    updateNavCounts();
    updateGlobalHealthStatus(data.launchReadiness || {});
    markAdminSynced();
  } catch (err) {
    console.error(err);
    reportsOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    reportsLaunchOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    reportsLaunchChecks.innerHTML = "<p>Failed to load launch readiness</p>";
    reportsTypeBreakdown.innerHTML = "<p>Failed to load product type analytics</p>";
    reportsDeliveryBreakdown.innerHTML = "<p>Failed to load delivery analytics</p>";
    reportsTopProducts.innerHTML = "<p>Failed to load top products</p>";
    reportsCampaignOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    reportsExperimentWinners.innerHTML = "<p>Failed to load experiment winners</p>";
    reportsExperimentRecommendations.innerHTML = "<p>Failed to load experiment intelligence</p>";
    reportsLifecycleStrategies.innerHTML = "<p>Failed to load lifecycle strategies</p>";
    reportsLifecycleSnapshots.innerHTML = "<p>Failed to load lifecycle snapshots</p>";
    reportsCampaignBreakdown.innerHTML = "<p>Failed to load campaign breakdown</p>";
    reportsCampaignVariants.innerHTML = "<p>Failed to load campaign variants</p>";
    reportsCampaignHistory.innerHTML = "<p>Failed to load campaign delivery history</p>";
  }
}

async function loadSettingsOverview() {
  if (settingsOverviewStats) {
    settingsOverviewStats.innerHTML = Array.from({ length: 4 }, () => `
      <article class="stat-card">
        <h3>Loading</h3>
        <p>...</p>
      </article>
    `).join("");
  }
  if (settingsRuntimeList) {
    settingsRuntimeList.innerHTML = `<div class="empty-state"><p>Loading runtime checks...</p></div>`;
  }
  if (settingsOpsList) {
    settingsOpsList.innerHTML = `<div class="empty-state"><p>Loading founder actions...</p></div>`;
  }

  const [healthResult, aiResult] = await Promise.allSettled([
    fetch(`${API_BASE}/api/health`).then((response) => response.json()),
    fetch(`${API_BASE}/api/ai/status`).then((response) => response.json()),
  ]);

  adminCollections.settingsHealth = healthResult.status === "fulfilled" ? healthResult.value : null;
  adminCollections.settingsAi = aiResult.status === "fulfilled" ? aiResult.value : null;
  renderSettingsOverview(adminCollections.settingsHealth, adminCollections.settingsAi);
  markAdminSynced();
}

function applyPendingBookFilters() {
  const searchTerm = String(contentSearchInput?.value || "").trim().toLowerCase();
  const typeFilter = getSelectedText(contentTypeFilter, "All Types");
  const aiFilter = getSelectedText(contentAiFilter, "AI Score");
  const sortFilter = getSelectedText(contentSortFilter, "Sort By");

  let books = [...adminCollections.pendingBooks];

  if (searchTerm) {
    books = books.filter((book) => {
      const haystack = [
        book.title,
        book.category,
        book.type,
        book.author?.name,
        book.authorName,
      ].join(" ").toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  if (typeFilter !== "All Types") {
    const normalizedType = typeFilter.replace(/s$/i, "").toLowerCase();
    books = books.filter((book) => {
      const typeValue = String(book.type || "Book").trim().toLowerCase();
      const categoryValue = String(book.category || "").trim().toLowerCase();
      return typeValue.includes(normalizedType) || categoryValue.includes(normalizedType);
    });
  }

  if (aiFilter === "Above 90%") {
    books = books.filter((book) => Number(book.aiScore || 0) >= 90);
  } else if (aiFilter === "70-90%") {
    books = books.filter((book) => {
      const aiScore = Number(book.aiScore || 0);
      return aiScore >= 70 && aiScore < 90;
    });
  } else if (aiFilter === "Below 70%") {
    books = books.filter((book) => Number(book.aiScore || 0) < 70);
  }

  if (sortFilter === "Highest Revenue") {
    books.sort((left, right) => Number(right.earnings || 0) - Number(left.earnings || 0));
  } else if (sortFilter === "High Risk") {
    books.sort((left, right) => Number(right.plagiarismScore || 0) - Number(left.plagiarismScore || 0));
  } else {
    books.sort(sortByCreatedAtDesc);
  }

  renderPending(books);
}

function applyApprovedBookFilters() {
  const searchTerm = String(approvedSearchInput?.value || "").trim().toLowerCase();
  const sortFilter = getSelectedText(approvedSortFilter, "Newest");
  let books = [...adminCollections.approvedBooks];

  if (searchTerm) {
    books = books.filter((book) => {
      const haystack = [
        book.title,
        book.category,
        book.type,
        book.author?.name,
        book.authorName,
      ].join(" ").toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  if (sortFilter === "Highest Revenue") {
    books.sort((left, right) => {
      const rightRevenue = Number(right.platformRevenue || 0) + Number(right.earnings || 0);
      const leftRevenue = Number(left.platformRevenue || 0) + Number(left.earnings || 0);
      return rightRevenue - leftRevenue;
    });
  } else if (sortFilter === "Top Sales") {
    books.sort((left, right) => Number(right.salesCount || 0) - Number(left.salesCount || 0));
  } else if (sortFilter === "A-Z") {
    books.sort((left, right) => String(left.title || "").localeCompare(String(right.title || ""), "en"));
  } else {
    books.sort(sortByCreatedAtDesc);
  }

  renderApproved(books);
}

function syncApprovedBookRecord(nextBook) {
  const safeId = String(nextBook?._id || nextBook?.id || "").trim();
  if (!safeId) {
    return;
  }

  adminCollections.approvedBooks = adminCollections.approvedBooks.map((book) => (
    String(book?._id || "") === safeId
      ? { ...book, ...nextBook }
      : book
  ));
}

async function loadLifecycleExperimentConfig() {
  if (lifecycleLabConfig) {
    return lifecycleLabConfig;
  }

  const res = await fetch(`${API_BASE}/api/lifecycle/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load lifecycle lab config");
  }

  lifecycleLabConfig = data;
  renderLifecycleLabConfig(data);
  return lifecycleLabConfig;
}

function renderCommandCenter(commandCenter) {
  renderOverviewStats(commandCenter);
  renderOverviewPriorityBoard(commandCenter);
  renderOverviewLaunchBoard(commandCenter);
  renderOverviewActivityFeed(commandCenter);
}

function renderOverviewStats(commandCenter) {
  if (!overviewStats) {
    return;
  }

  const analytics = commandCenter.analytics || {};
  const launchReadiness = commandCenter.launchReadiness || {};
  const crmSummary = commandCenter.campaignAnalytics?.summary || {};
  const actionQueues = adminState.flaggedBooksCount
    + adminState.reviewReportsCount
    + adminState.pendingPaymentGroupsCount
    + adminState.actionableWithdrawCount
    + adminState.pendingVerificationsCount;

  overviewStats.innerHTML = [
    { label: "Platform GMV", value: formatCurrency(analytics.totalGmv || 0) },
    { label: "Platform Revenue", value: formatCurrency(analytics.totalRevenue || 0) },
    { label: "Active Creators", value: Number(analytics.activeCreators || 0).toLocaleString("en-IN") },
    { label: "Approved Catalog", value: Number(analytics.approvedBooks || 0).toLocaleString("en-IN") },
    { label: "Action Queues", value: Number(actionQueues || 0).toLocaleString("en-IN") },
    {
      label: "Launch Health",
      value: launchReadiness.overallStatus
        ? formatReadinessStatus(launchReadiness.overallStatus)
        : `${Number(crmSummary.conversionRate || 0).toFixed(1)}% CRM CVR`,
    },
  ].map((card) => `
    <article class="stat-card">
      <h3>${escapeHTML(card.label)}</h3>
      <p>${escapeHTML(card.value)}</p>
    </article>
  `).join("");
}

function resolvePriorityTone(value, warningThreshold, criticalThreshold) {
  const numericValue = Number(value || 0);
  if (numericValue >= criticalThreshold) {
    return "critical";
  }
  if (numericValue >= warningThreshold) {
    return "attention";
  }
  return "healthy";
}

function renderOverviewPriorityBoard(commandCenter) {
  if (!overviewOpsBoard) {
    return;
  }

  const launchReadiness = commandCenter.launchReadiness || {};
  const crmSummary = commandCenter.campaignAnalytics?.summary || {};
  const priorityCards = [
    {
      title: "Moderation Queue",
      value: adminState.flaggedBooksCount + adminState.reviewReportsCount,
      tone: resolvePriorityTone(adminState.flaggedBooksCount + adminState.reviewReportsCount, 1, 6),
      description: `${adminState.flaggedBooksCount} AI-flagged products and ${adminState.reviewReportsCount} reported reviews waiting for action.`,
      actionLabel: "Open review",
      target: "review",
    },
    {
      title: "Payout Ops",
      value: adminState.pendingPaymentGroupsCount + adminState.actionableWithdrawCount,
      tone: resolvePriorityTone(adminState.pendingPaymentGroupsCount + adminState.actionableWithdrawCount, 1, 5),
      description: `${adminState.pendingPaymentGroupsCount} buyer proofs and ${adminState.actionableWithdrawCount} creator treasury actions are still open.`,
      actionLabel: "Resolve payouts",
      target: "payouts",
    },
    {
      title: "Creator Trust",
      value: adminState.pendingVerificationsCount,
      tone: resolvePriorityTone(adminState.pendingVerificationsCount, 1, 4),
      description: `${adminState.pendingVerificationsCount} creators are waiting for verification review or follow-up.`,
      actionLabel: "Review creators",
      target: "creators",
    },
    {
      title: "AI Risk",
      value: adminState.aiHighRiskCount + adminState.aiManualReviewCount,
      tone: resolvePriorityTone(adminState.aiHighRiskCount + adminState.aiManualReviewCount, 1, 6),
      description: `${adminState.aiHighRiskCount} high-risk products and ${adminState.aiManualReviewCount} manual-review cases need monitoring.`,
      actionLabel: "Inspect AI",
      target: "ai",
    },
    {
      title: "Growth Engine",
      value: formatCurrency(crmSummary.recoveredGmv || 0),
      tone: Number(crmSummary.conversionRate || 0) >= 4 ? "healthy" : "attention",
      description: `CRM lifecycle loops are converting at ${Number(crmSummary.conversionRate || 0).toFixed(1)}% and recovering ${formatCurrency(crmSummary.recoveredGmv || 0)} in GMV.`,
      actionLabel: "Open reports",
      target: "reports",
    },
    {
      title: "Launch Readiness",
      value: Number(launchReadiness.readyCount || 0).toLocaleString("en-IN"),
      tone: Number(launchReadiness.blockerCount || 0) > 0 ? "critical" : Number(launchReadiness.warningCount || 0) > 0 ? "attention" : "healthy",
      description: `${Number(launchReadiness.warningCount || 0)} warnings and ${Number(launchReadiness.blockerCount || 0)} blockers across global payments, AI, storage, and deployment.`,
      actionLabel: "Inspect readiness",
      target: "reports",
    },
  ];

  overviewOpsBoard.innerHTML = priorityCards.map((card) => `
    <article class="priority-card">
      <div class="priority-meta">
        <span class="priority-value">${escapeHTML(String(card.value))}</span>
        <span class="priority-tone ${escapeAttribute(card.tone)}">${escapeHTML(card.tone)}</span>
      </div>
      <h3>${escapeHTML(card.title)}</h3>
      <p>${escapeHTML(card.description)}</p>
      <button class="priority-action" type="button" data-jump-target="${escapeAttribute(card.target)}">${escapeHTML(card.actionLabel)}</button>
    </article>
  `).join("");

  overviewOpsBoard.querySelectorAll("[data-jump-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-jump-target");
      if (target) {
        switchSection(target);
      }
    });
  });
}

function renderOverviewLaunchBoard(commandCenter) {
  if (!overviewLaunchBoard) {
    return;
  }

  const launchReadiness = commandCenter.launchReadiness || {};
  const checks = Array.isArray(launchReadiness.checks) ? launchReadiness.checks : [];
  const supportedMarkets = Array.isArray(launchReadiness.supportedMarkets) ? launchReadiness.supportedMarkets : [];

  if (!checks.length) {
    overviewLaunchBoard.innerHTML = `
      <div class="empty-state">
        <p>Launch readiness data has not loaded yet. Open reports to inspect the full deployment board.</p>
      </div>
    `;
    return;
  }

  overviewLaunchBoard.innerHTML = [
    ...checks.slice(0, 4).map((check) => `
      <article class="content-card compact-card readiness-card">
        <div class="content-info readiness-meta">
          <div>
            <h3>${escapeHTML(check.label || "Launch check")}</h3>
            <p>${escapeHTML(check.summary || "No launch summary available yet.")}</p>
          </div>
          <span class="readiness-pill ${escapeAttribute(String(check.status || "warning").toLowerCase())}">${escapeHTML(formatReadinessStatus(check.status || "warning"))}</span>
        </div>
      </article>
    `),
    `
      <article class="content-card compact-card">
        <div class="content-info">
          <div>
            <h3>Markets wired</h3>
            <p>${supportedMarkets.length
              ? escapeHTML(formatSupportedMarkets(supportedMarkets))
              : "No regional market configuration detected yet."}</p>
          </div>
        </div>
      </article>
    `,
  ].join("");
}

function buildOverviewActivityItems(commandCenter) {
  const items = [];
  const topProduct = Array.isArray(commandCenter.topProducts) ? commandCenter.topProducts[0] : null;
  const topVerification = Array.isArray(commandCenter.verificationRequests) ? commandCenter.verificationRequests[0] : null;
  const topPaymentGroup = Array.isArray(commandCenter.paymentGroups) ? commandCenter.paymentGroups[0] : null;
  const topReviewReport = Array.isArray(commandCenter.reviewReports) ? commandCenter.reviewReports[0] : null;
  const topAiFlag = Array.isArray(commandCenter.aiFlagged) ? commandCenter.aiFlagged[0] : null;
  const topWinner = Array.isArray(commandCenter.campaignAnalytics?.experimentInsights?.winners)
    ? commandCenter.campaignAnalytics.experimentInsights.winners[0]
    : null;

  if (topPaymentGroup) {
    items.push({
      title: "Buyer payment awaiting approval",
      description: `${topPaymentGroup.buyerName} submitted ${topPaymentGroup.isBatch ? `${topPaymentGroup.items.length} products` : "a manual payment"} for ${formatCurrency(topPaymentGroup.totalAmount || 0)}.`,
      meta: `Reference ${topPaymentGroup.paymentReference || "pending"} - ${Number(topPaymentGroup.submissionCount || 1)} submission(s)`,
      target: "payouts",
    });
  }

  if (topVerification) {
    items.push({
      title: "Creator verification waiting",
      description: `${topVerification.name || topVerification.username || "Creator"} is waiting on trust review.`,
      meta: `Role ${String(topVerification.role || "creator").toUpperCase()} - Submitted ${formatDate(topVerification.creatorVerification?.submittedAt || topVerification.createdAt)}`,
      target: "creators",
    });
  }

  if (topReviewReport) {
    items.push({
      title: "Community review report filed",
      description: `${topReviewReport.book?.title || "A product"} has a reported review pending moderation.`,
      meta: `Reporter ${topReviewReport.reporter?.name || topReviewReport.reporter?.email || "Member"} - ${formatDate(topReviewReport.createdAt)}`,
      target: "review",
    });
  }

  if (topAiFlag) {
    items.push({
      title: "AI moderation pressure",
      description: `${topAiFlag.title || "Product"} is still carrying elevated risk and may need manual inspection.`,
      meta: `Risk ${Number(topAiFlag.plagiarismScore || 0)}% - Status ${topAiFlag.aiStatus || "pending"}`,
      target: "ai",
    });
  }

  if (topWinner) {
    items.push({
      title: "Lifecycle winner detected",
      description: `${topWinner.label || "Campaign"} is favoring ${topWinner.winningVariantLabel || formatVariantLabel(topWinner.winningVariant || "default")}.`,
      meta: `Conversion ${Number(topWinner.conversionRate || 0).toFixed(1)}% - Sent ${Number(topWinner.sent || 0).toLocaleString("en-IN")}`,
      target: "reports",
    });
  }

  if (topProduct) {
    items.push({
      title: "Top product momentum",
      description: `${topProduct.title || "Product"} is leading the approved catalog.`,
      meta: `${topProduct.type || "Product"} - ${Number(topProduct.sales || 0).toLocaleString("en-IN")} sales - Creator ${formatCurrency(topProduct.creatorRevenue || 0)}`,
      target: "approved",
    });
  }

  return items.slice(0, 5);
}

function renderOverviewActivityFeed(commandCenter) {
  if (!overviewActivityFeed) {
    return;
  }

  const items = buildOverviewActivityItems(commandCenter);
  if (!items.length) {
    overviewActivityFeed.innerHTML = `
      <div class="empty-state">
        <p>The marketplace is calm right now. Fresh operational activity will appear here as queues, campaigns, and creator actions come in.</p>
      </div>
    `;
    return;
  }

  overviewActivityFeed.innerHTML = items.map((item) => `
    <article class="content-card compact-card">
      <div class="content-info">
        <div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}<br/>${escapeHTML(item.meta)}</p>
        </div>
      </div>
      <div class="actions">
        <button class="changes" type="button" data-jump-target="${escapeAttribute(item.target)}">Open</button>
      </div>
    </article>
  `).join("");

  overviewActivityFeed.querySelectorAll("[data-jump-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-jump-target");
      if (target) {
        switchSection(target);
      }
    });
  });
}

function renderCreatorOverview(summary) {
  creatorOverview.innerHTML = [
    { label: "Pending verifications", value: summary.pendingVerifications || 0 },
    { label: "Verified creators", value: summary.verifiedCreators || 0 },
    { label: "Referral signups", value: summary.totalReferralSignups || 0 },
    { label: "Referred creators", value: summary.totalReferredCreators || 0 },
  ].map((card) => `
    <article class="stat-card">
      <h3>${escapeHTML(card.label)}</h3>
      <p>${Number(card.value || 0).toLocaleString("en-IN")}</p>
    </article>
  `).join("");
}

function renderSettingsOverview(health = null, aiStatus = null) {
  const runtimeUser = parseStoredUser() || {};
  const uploadStorage = health?.uploadStorage || {};
  const aiQueue = health?.aiQueue || {};
  const publicFolders = Array.isArray(uploadStorage.publiclyServedFolders)
    ? uploadStorage.publiclyServedFolders.join(", ")
    : "None";
  const protectedFolders = Array.isArray(uploadStorage.protectedFolders)
    ? uploadStorage.protectedFolders.join(", ")
    : "None";
  const queueDepth = Number(aiQueue.totalQueued || aiQueue.queueLength || aiQueue.queued || 0);
  const processingCount = Number(aiQueue.active || aiQueue.processing || 0);
  const healthEnv = health?.env || "production";
  const aiMode = aiStatus?.mode || "fallback";

  if (settingsOverviewStats) {
    settingsOverviewStats.innerHTML = [
      { label: "Session role", value: String(runtimeUser.role || "admin").toUpperCase() },
      { label: "API environment", value: String(healthEnv).toUpperCase() },
      { label: "AI runtime", value: String(aiMode).replace(/_/g, " ").toUpperCase() },
      { label: "Queue pressure", value: `${queueDepth + processingCount}` },
      { label: "Asset storage", value: String(uploadStorage.provider || "local").toUpperCase() },
      { label: "Private assets", value: uploadStorage.privateProductAssetsEnabled ? "ENABLED" : "LIMITED" },
    ].map((card) => `
      <article class="stat-card">
        <h3>${escapeHTML(card.label)}</h3>
        <p>${escapeHTML(card.value)}</p>
      </article>
    `).join("");
  }

  if (settingsRuntimeList) {
    settingsRuntimeList.innerHTML = [
      {
        title: "API + Session",
        body: `Admin session: ${runtimeUser.email || runtimeUser.username || "Signed in"}.\nAPI base: ${API_BASE || "same-origin proxy"}.\nLast sync: ${adminState.lastSyncedAt ? formatDateTime(adminState.lastSyncedAt) : "Waiting for sync"}.`,
      },
      {
        title: "Storage + Delivery",
        body: `Provider: ${uploadStorage.provider || "local"}.\nPublic folders: ${publicFolders}.\nProtected folders: ${protectedFolders}.`,
      },
      {
        title: "AI Runtime",
        body: `Provider: ${aiStatus?.provider || "local"}.\nMode: ${aiMode}.\nHosted models: ${aiStatus?.hosted ? "configured" : "fallback only"}.`,
      },
      {
        title: "Queue Health",
        body: `Queued jobs: ${queueDepth}.\nProcessing: ${processingCount}.\nEmbeddings ready: ${aiStatus?.embeddingsReady ? "yes" : "no"}.`,
      },
    ].map((entry) => `
      <article class="content-card compact-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(entry.title)}</h3>
            <p>${escapeHTML(entry.body).replace(/\n/g, "<br/>")}</p>
          </div>
        </div>
      </article>
    `).join("");
  }

  if (settingsOpsList) {
    settingsOpsList.innerHTML = [
      {
        title: "Moderation control",
        body: "Jump straight into the pending content queue and reported reviews when trust issues spike.",
        target: "review",
        label: "Open review ops",
      },
      {
        title: "Treasury control",
        body: "Resolve manual payment proofs and creator withdrawal approvals from one payouts queue.",
        target: "payouts",
        label: "Open payout ops",
      },
      {
        title: "Growth intelligence",
        body: "Inspect lifecycle winners, launch blockers, and the founder revenue board without leaving admin.",
        target: "reports",
        label: "Open growth reports",
      },
      {
        title: "Refresh system health",
        body: "Pull a fresh health, storage, and AI runtime snapshot for the command center.",
        action: "refresh-settings",
        label: "Refresh health",
      },
    ].map((entry) => `
      <article class="content-card compact-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(entry.title)}</h3>
            <p>${escapeHTML(entry.body)}</p>
          </div>
        </div>
        <div class="actions">
          ${entry.target
            ? `<button class="changes" type="button" data-jump-target="${escapeAttribute(entry.target)}">${escapeHTML(entry.label)}</button>`
            : `<button class="approve" type="button" data-settings-action="${escapeAttribute(entry.action || "")}">${escapeHTML(entry.label)}</button>`}
        </div>
      </article>
    `).join("");

    settingsOpsList.querySelectorAll("[data-jump-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-jump-target");
        if (target) {
          void switchSection(target);
        }
      });
    });

    settingsOpsList.querySelector('[data-settings-action="refresh-settings"]')?.addEventListener("click", () => {
      void loadSettingsOverview();
    });
  }
}

function renderReportsOverview(summary, launchReadiness, typeBreakdown, deliveryBreakdown, topProducts, campaignAnalytics, lifecycleStrategies, lifecycleSnapshots) {
  reportsOverview.innerHTML = [
    { label: "Platform GMV", value: formatCurrency(summary.totalGmv || 0) },
    { label: "Creator payouts", value: formatCurrency(summary.creatorPayouts || 0) },
    { label: "Platform revenue", value: formatCurrency(summary.totalRevenue || 0) },
    { label: "Approved orders", value: Number(summary.totalSales || 0).toLocaleString("en-IN") },
    { label: "Active creators", value: Number(summary.activeCreators || 0).toLocaleString("en-IN") },
    { label: "Approved products", value: Number(summary.approvedBooks || 0).toLocaleString("en-IN") },
  ].map((card) => `
    <article class="stat-card">
      <h3>${escapeHTML(card.label)}</h3>
      <p>${escapeHTML(card.value)}</p>
    </article>
  `).join("");

  renderLaunchReadiness(launchReadiness || {});

  reportsTypeBreakdown.innerHTML = typeBreakdown.length
    ? typeBreakdown.map((entry) => `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(entry.type || "Product")}</h3>
            <p>
              Products: ${Number(entry.products || 0).toLocaleString("en-IN")} - Sales: ${Number(entry.sales || 0).toLocaleString("en-IN")}<br/>
              GMV: ${escapeHTML(formatCurrency(entry.gmv || 0))} - Creator: ${escapeHTML(formatCurrency(entry.creatorRevenue || 0))} - Platform: ${escapeHTML(formatCurrency(entry.platformRevenue || 0))}
            </p>
          </div>
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>No product type analytics yet</p>";

  reportsDeliveryBreakdown.innerHTML = deliveryBreakdown.length
    ? deliveryBreakdown.map((entry) => `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(String(entry.mode || "file").toUpperCase())}</h3>
            <p>Products: ${Number(entry.products || 0).toLocaleString("en-IN")} - Sales influenced: ${Number(entry.sales || 0).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>No delivery analytics yet</p>";

  reportsTopProducts.innerHTML = topProducts.length
    ? topProducts.map((product) => `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(product.title || "Product")}</h3>
            <p>
              ${escapeHTML(product.type || "Product")} - ${escapeHTML(product.category || "Other")} - ${escapeHTML(String(product.deliveryMode || "file").toUpperCase())}<br/>
              Sales: ${Number(product.sales || 0).toLocaleString("en-IN")} - Creator: ${escapeHTML(formatCurrency(product.creatorRevenue || 0))} - Platform: ${escapeHTML(formatCurrency(product.platformRevenue || 0))}
            </p>
          </div>
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>No top products yet</p>";

  renderCampaignAnalytics(campaignAnalytics || {});
  renderLifecycleStrategies(lifecycleStrategies || []);
  renderLifecycleSnapshots(lifecycleSnapshots || []);
}

function renderLaunchReadiness(launchReadiness = {}) {
  const checks = Array.isArray(launchReadiness.checks) ? launchReadiness.checks : [];
  const supportedMarkets = Array.isArray(launchReadiness.supportedMarkets) ? launchReadiness.supportedMarkets : [];

  if (reportsLaunchOverview) {
    reportsLaunchOverview.innerHTML = [
      { label: "Overall", value: formatReadinessStatus(launchReadiness.overallStatus || "warning") },
      { label: "Ready checks", value: Number(launchReadiness.readyCount || 0).toLocaleString("en-IN") },
      { label: "Warnings", value: Number(launchReadiness.warningCount || 0).toLocaleString("en-IN") },
      { label: "Blockers", value: Number(launchReadiness.blockerCount || 0).toLocaleString("en-IN") },
      { label: "Markets wired", value: Number(supportedMarkets.length || 0).toLocaleString("en-IN") },
      { label: "Generated", value: launchReadiness.generatedAt ? formatDateTime(launchReadiness.generatedAt) : "Now" },
    ].map((card) => `
      <article class="stat-card">
        <h3>${escapeHTML(card.label)}</h3>
        <p>${escapeHTML(card.value)}</p>
      </article>
    `).join("");
  }

  if (!reportsLaunchChecks) {
    return;
  }

  reportsLaunchChecks.innerHTML = checks.length
    ? checks.map((check) => `
      <article class="content-card readiness-card">
        <div class="content-info readiness-meta">
          <div>
            <h3>${escapeHTML(check.label || "Launch check")}</h3>
            <p>${escapeHTML(check.summary || "No summary yet")}</p>
          </div>
          <span class="readiness-pill ${escapeAttribute(String(check.status || "warning").toLowerCase())}">${escapeHTML(formatReadinessStatus(check.status || "warning"))}</span>
          <div class="readiness-detail-list">
            ${(Array.isArray(check.details) ? check.details : []).map((detail) => `<p>${escapeHTML(detail)}</p>`).join("")}
          </div>
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>Launch readiness will appear here after analytics loads.</p>";
}

function renderCampaignAnalytics(campaignAnalytics) {
  const summary = campaignAnalytics.summary || {};
  const breakdown = Array.isArray(campaignAnalytics.breakdown) ? campaignAnalytics.breakdown : [];
  const variantBreakdown = Array.isArray(campaignAnalytics.variantBreakdown) ? campaignAnalytics.variantBreakdown : [];
  const experimentInsights = campaignAnalytics.experimentInsights || {};
  const recentDeliveries = Array.isArray(campaignAnalytics.recentDeliveries) ? campaignAnalytics.recentDeliveries : [];

  reportsCampaignOverview.innerHTML = [
    { label: "CRM sends", value: Number(summary.totalSent || 0).toLocaleString("en-IN") },
    { label: "Converted journeys", value: Number(summary.converted || 0).toLocaleString("en-IN") },
    { label: "Recovered GMV", value: formatCurrency(summary.recoveredGmv || 0) },
    { label: "Creator earnings influenced", value: formatCurrency(summary.creatorRevenueInfluenced || 0) },
    { label: "Email delivered", value: Number(summary.emailDelivered || 0).toLocaleString("en-IN") },
    { label: "Conversion rate", value: `${Number(summary.conversionRate || 0).toFixed(1)}%` },
  ].map((card) => `
    <article class="stat-card">
      <h3>${escapeHTML(card.label)}</h3>
      <p>${escapeHTML(card.value)}</p>
    </article>
  `).join("");

  reportsCampaignBreakdown.innerHTML = breakdown.length
    ? breakdown.map((entry) => `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(entry.label || "Campaign")}</h3>
            <p>
              Sent: ${Number(entry.sent || 0).toLocaleString("en-IN")} | Converted: ${Number(entry.converted || 0).toLocaleString("en-IN")} | Email delivered: ${Number(entry.emailDelivered || 0).toLocaleString("en-IN")}<br/>
              Conversion rate: ${Number(entry.conversionRate || 0).toFixed(1)}% | ${escapeHTML(entry.metricLabel || "Value")}: ${escapeHTML(formatCampaignMetric(entry))}<br/>
              Creator earnings: ${escapeHTML(formatCurrency(entry.creatorRevenueInfluenced || 0))} | Platform revenue: ${escapeHTML(formatCurrency(entry.platformRevenueInfluenced || 0))}
            </p>
          </div>
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>No lifecycle CRM deliveries in the last 90 days</p>";

  reportsCampaignVariants.innerHTML = variantBreakdown.length
    ? variantBreakdown.map((entry) => `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(entry.label || "Campaign")} | ${escapeHTML(formatVariantLabel(entry.variant || "default"))}</h3>
            <p>
              Sent: ${Number(entry.sent || 0).toLocaleString("en-IN")} | Converted: ${Number(entry.converted || 0).toLocaleString("en-IN")} | Email delivered: ${Number(entry.emailDelivered || 0).toLocaleString("en-IN")}<br/>
              Conversion rate: ${Number(entry.conversionRate || 0).toFixed(1)}% | Primary outcome: ${escapeHTML(formatVariantMetric(entry))}
            </p>
          </div>
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>No A/B variant performance yet</p>";

  renderExperimentInsights(experimentInsights);

  reportsCampaignHistory.innerHTML = recentDeliveries.length
    ? recentDeliveries.map((delivery) => `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(delivery.label || "Campaign")} | ${escapeHTML(delivery.recipient?.name || delivery.recipient?.email || "Member")}</h3>
            <p>
              ${escapeHTML(delivery.title || "Lifecycle delivery")}<br/>
              Sent: ${escapeHTML(formatDate(delivery.sentAt))} | Variant: ${escapeHTML(delivery.variantLabel || formatVariantLabel(delivery.variant || "default"))} | Channel: ${escapeHTML(buildCampaignChannel(delivery.channel || {}))}<br/>
              Status: ${escapeHTML(delivery.historyHeadline || "Awaiting conversion")}${delivery.filtersSnapshot ? ` | Cohort: ${escapeHTML(formatCohortSummary(delivery.filtersSnapshot))}` : ""}
            </p>
          </div>
        </div>
        <div class="actions">
          ${delivery.link ? `<a class="changes" href="../${escapeAttribute(delivery.link)}">Open destination</a>` : ""}
        </div>
      </article>
    `).join("")
    : "<p style='opacity:.7'>No campaign delivery history yet</p>";
}

function renderExperimentInsights(experimentInsights = {}) {
  const winners = Array.isArray(experimentInsights.winners) ? experimentInsights.winners : [];
  const recommendations = Array.isArray(experimentInsights.recommendations) ? experimentInsights.recommendations : [];

  if (reportsExperimentWinners) {
    reportsExperimentWinners.innerHTML = winners.length
      ? winners.map((entry) => `
        <article class="content-card">
          <div class="content-info">
            <div>
              <h3>${escapeHTML(entry.label || "Campaign")} | ${escapeHTML(entry.winningVariantLabel || formatVariantLabel(entry.winningVariant || "default"))}</h3>
              <p>
                Ready for auto-promotion. Sent: ${Number(entry.sent || 0).toLocaleString("en-IN")} | Converted: ${Number(entry.converted || 0).toLocaleString("en-IN")}<br/>
                Conversion rate: ${Number(entry.conversionRate || 0).toFixed(1)}% | Lead over runner-up: ${Number(entry.leadRate || 0).toFixed(1)}%<br/>
                ${escapeHTML(entry.rationale || "This variant is outperforming the field.")}
              </p>
            </div>
          </div>
        </article>
      `).join("")
      : "<p style='opacity:.7'>No variant has cleared the auto-promotion threshold yet.</p>";
  }

  if (reportsExperimentRecommendations) {
    reportsExperimentRecommendations.innerHTML = recommendations.length
      ? recommendations.map((entry) => `
        <article class="content-card">
          <div class="content-info">
            <div>
              <h3>${escapeHTML(entry.label || "Campaign")} | ${escapeHTML(entry.winningVariantLabel || formatVariantLabel(entry.winningVariant || "default"))}</h3>
              <p>
                ${escapeHTML(formatExperimentAction(entry.action, entry.confidence))}<br/>
                Sent: ${Number(entry.sent || 0).toLocaleString("en-IN")} | Converted: ${Number(entry.converted || 0).toLocaleString("en-IN")} | Primary outcome: ${escapeHTML(formatVariantMetric(entry))}<br/>
                ${escapeHTML(entry.rationale || "Keep gathering lifecycle data.")}
              </p>
            </div>
          </div>
          <div class="actions">
            <span class="experiment-pill ${escapeAttribute(String(entry.action || "observe"))}">${escapeHTML(formatExperimentAction(entry.action, entry.confidence))}</span>
          </div>
        </article>
      `).join("")
      : "<p style='opacity:.7'>Experiment intelligence will appear here once variants start collecting data.</p>";
  }
}

function renderLifecycleStrategies(strategies) {
  if (!reportsLifecycleStrategies) {
    return;
  }

  if (!Array.isArray(strategies) || !strategies.length) {
    reportsLifecycleStrategies.innerHTML = "<p style='opacity:.7'>No lifecycle strategy controls yet.</p>";
    return;
  }

  reportsLifecycleStrategies.innerHTML = strategies.map((strategy) => `
    <article class="content-card strategy-card" data-strategy-key="${escapeAttribute(strategy.campaignKey || "")}">
      <div class="content-info">
        <div>
          <h3>${escapeHTML(strategy.label || "Campaign")} | ${escapeHTML(strategy.activeVariantLabel || formatVariantLabel(strategy.activeVariant || "default"))}</h3>
          <p>
            ${escapeHTML(strategy.description || "Lifecycle strategy")}<br/>
            Resolution: ${escapeHTML(formatStrategyMode(strategy.resolutionMode || "auto"))} | Active source: ${escapeHTML(formatVariantSource(strategy.activeSource || "manual"))}<br/>
            ${strategy.suggestedWinner
              ? `Suggested winner: ${escapeHTML(strategy.suggestedWinner.variantLabel || formatVariantLabel(strategy.suggestedWinner.variant || "default"))} | Rate ${Number(strategy.suggestedWinner.conversionRate || 0).toFixed(1)}%`
              : "Suggested winner: still collecting enough signal"}<br/>
            Sent: ${Number(strategy.stats?.sent || 0).toLocaleString("en-IN")} | Converted: ${Number(strategy.stats?.converted || 0).toLocaleString("en-IN")} | Primary outcome: ${escapeHTML(formatStrategyMetric(strategy.stats || {}))}
          </p>
          ${buildStrategyHistoryMarkup(strategy.history || [])}
        </div>
      </div>
      <div class="strategy-controls">
        <label class="crm-lab-field">
          <span>Resolution Mode</span>
          <select data-strategy-field="resolutionMode">
            <option value="auto"${String(strategy.resolutionMode || "auto") === "auto" ? " selected" : ""}>Auto</option>
            <option value="manual"${String(strategy.resolutionMode || "auto") === "manual" ? " selected" : ""}>Manual</option>
          </select>
        </label>
        <label class="crm-lab-field">
          <span>Manual Variant</span>
          <select data-strategy-field="manualVariant">
            ${buildStrategyVariantOptions(strategy.supportedVariants || [], strategy.manualVariant || "default")}
          </select>
        </label>
        <label class="crm-lab-field">
          <span>Fallback Variant</span>
          <select data-strategy-field="fallbackVariant">
            ${buildStrategyVariantOptions(strategy.supportedVariants || [], strategy.fallbackVariant || "default")}
          </select>
        </label>
        <label class="crm-lab-field strategy-notes">
          <span>Operator Notes</span>
          <textarea data-strategy-field="notes" rows="3" placeholder="Optional note about why this strategy is pinned or falling back.">${escapeHTML(strategy.notes || "")}</textarea>
        </label>
        <div class="strategy-actions">
          <button class="approve" type="button" data-save-strategy="${escapeAttribute(strategy.campaignKey || "")}">Save Strategy</button>
          <button class="changes" type="button" data-auto-strategy="${escapeAttribute(strategy.campaignKey || "")}">Return to Auto</button>
          <button class="feature" type="button" data-pin-winner="${escapeAttribute(strategy.campaignKey || "")}"${strategy.suggestedWinner?.variant ? "" : " disabled"}>Pin Winner</button>
          <button class="changes" type="button" data-preview-strategy="${escapeAttribute(strategy.campaignKey || "")}">Preview Active Copy</button>
        </div>
        <div class="strategy-preview" data-strategy-preview>
          <p class="crm-lab-empty">Preview the current strategy to inspect the exact email and inbox copy before a send.</p>
        </div>
      </div>
    </article>
  `).join("");

  reportsLifecycleStrategies.querySelectorAll("[data-save-strategy]").forEach((button) => {
    button.addEventListener("click", () => {
      const campaignKey = button.getAttribute("data-save-strategy");
      const card = button.closest("[data-strategy-key]");
      if (!campaignKey || !card) {
        return;
      }

      updateLifecycleStrategy(campaignKey, {
        resolutionMode: card.querySelector('[data-strategy-field="resolutionMode"]')?.value || "auto",
        manualVariant: card.querySelector('[data-strategy-field="manualVariant"]')?.value || "default",
        fallbackVariant: card.querySelector('[data-strategy-field="fallbackVariant"]')?.value || "default",
        notes: card.querySelector('[data-strategy-field="notes"]')?.value || "",
        reason: "Updated lifecycle strategy from admin dashboard.",
      });
    });
  });

  reportsLifecycleStrategies.querySelectorAll("[data-auto-strategy]").forEach((button) => {
    button.addEventListener("click", () => {
      const campaignKey = button.getAttribute("data-auto-strategy");
      const card = button.closest("[data-strategy-key]");
      if (!campaignKey || !card) {
        return;
      }

      updateLifecycleStrategy(campaignKey, {
        resolutionMode: "auto",
        manualVariant: card.querySelector('[data-strategy-field="manualVariant"]')?.value || "default",
        fallbackVariant: card.querySelector('[data-strategy-field="fallbackVariant"]')?.value || "default",
        notes: card.querySelector('[data-strategy-field="notes"]')?.value || "",
        reason: "Returned campaign to auto resolution.",
      });
    });
  });

  reportsLifecycleStrategies.querySelectorAll("[data-pin-winner]").forEach((button) => {
    button.addEventListener("click", () => {
      const campaignKey = button.getAttribute("data-pin-winner");
      const card = button.closest("[data-strategy-key]");
      if (!campaignKey || !card) {
        return;
      }

      const strategy = strategies.find((entry) => String(entry.campaignKey || "") === String(campaignKey || ""));
      const winningVariant = strategy?.suggestedWinner?.variant;
      if (!winningVariant) {
        alert("This campaign does not have a winner ready to pin yet.");
        return;
      }

      updateLifecycleStrategy(campaignKey, {
        resolutionMode: "manual",
        manualVariant: winningVariant,
        fallbackVariant: card.querySelector('[data-strategy-field="fallbackVariant"]')?.value || "default",
        notes: card.querySelector('[data-strategy-field="notes"]')?.value || `Pinned ${winningVariant} after admin review.`,
        reason: `Pinned ${winningVariant} as the current winner.`,
      }, `Pinned ${formatVariantLabel(winningVariant)} for ${strategy?.label || campaignKey}.`);
    });
  });

  reportsLifecycleStrategies.querySelectorAll("[data-preview-strategy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const campaignKey = button.getAttribute("data-preview-strategy");
      const card = button.closest("[data-strategy-key]");
      if (!campaignKey || !card) {
        return;
      }

      const previewContainer = card.querySelector("[data-strategy-preview]");
      if (previewContainer) {
        previewContainer.innerHTML = `<p class="crm-lab-empty">Loading active strategy preview...</p>`;
      }

      try {
        const payload = {
          mode: mapCampaignKeyToLifecycleMode(campaignKey),
          variant: "auto",
          limit: 1,
          force: false,
          filters: {
            cohortRole: "all",
            marketplaceLanguage: "all",
          },
        };
        const res = await fetch(`${API_BASE}/api/lifecycle/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Unable to preview lifecycle copy");
        }

        if (previewContainer) {
          previewContainer.innerHTML = renderInlineCopyPreview(data.copyPreview, data.variantSource || "manual");
        }
      } catch (error) {
        console.error(error);
        if (previewContainer) {
          previewContainer.innerHTML = `<p class="crm-lab-empty">${escapeHTML(error.message || "Unable to preview lifecycle copy")}</p>`;
        }
      }
    });
  });
}

function renderLifecycleSnapshots(snapshots) {
  if (!reportsLifecycleSnapshots) {
    return;
  }

  if (!Array.isArray(snapshots) || !snapshots.length) {
    reportsLifecycleSnapshots.innerHTML = "<p style='opacity:.7'>No winner snapshots captured yet.</p>";
    return;
  }

  reportsLifecycleSnapshots.innerHTML = snapshots.map((snapshot) => {
    const promotedKeys = Object.keys(snapshot.promotedVariants || {});
    return `
      <article class="content-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(formatDateTime(snapshot.capturedAt))} | ${escapeHTML(formatSnapshotTrigger(snapshot))}</h3>
            <p>
              Window: ${Number(snapshot.windowDays || 90).toLocaleString("en-IN")} days | Sends: ${Number(snapshot.summary?.totalSent || 0).toLocaleString("en-IN")} | Converted: ${Number(snapshot.summary?.converted || 0).toLocaleString("en-IN")}<br/>
              Conversion rate: ${Number(snapshot.summary?.conversionRate || 0).toFixed(1)}% | Promoted winners: ${promotedKeys.length ? escapeHTML(promotedKeys.join(", ")) : "None yet"}<br/>
              ${escapeHTML(snapshot.note || "No snapshot note added.")}
            </p>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderVerificationRequests(requests) {
  verificationRequestList.innerHTML = "";
  if (!requests.length) {
    verificationRequestList.innerHTML = "<p style='opacity:.7'>No creator verification requests are waiting right now</p>";
    return;
  }

  requests.forEach((creator) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const request = creator.creatorVerification || {};
    const status = String(request.status || "unverified").toUpperCase();

    card.innerHTML = `
      <div class="content-info">
        <div>
          <h3>${escapeHTML(creator.name || "Creator")} - @${escapeHTML(creator.username || "creator")}</h3>
          <p>
            ${escapeHTML(String(creator.role || "creator").toUpperCase())} - ${escapeHTML(creator.email || "No email")}<br/>
            Status: <strong>${status}</strong> - Submitted: ${escapeHTML(formatDate(request.submittedAt || creator.createdAt))}<br/>
            Followers: ${Number(creator.creatorStats?.followersCount || 0).toLocaleString("en-IN")} - Sales: ${Number(creator.creatorStats?.totalSales || 0).toLocaleString("en-IN")}<br/>
            ${request.portfolioUrl ? `Portfolio: ${escapeHTML(request.portfolioUrl)}<br/>` : ""}
            ${request.proofUrl ? `Proof: ${escapeHTML(request.proofUrl)}<br/>` : ""}
            ${request.note ? `Note: ${escapeHTML(request.note)}` : "No verification note added yet."}
          </p>
          ${request.adminNote ? `<p>${escapeHTML(request.adminNote)}</p>` : ""}
        </div>
      </div>
      <div class="actions">
        ${request.portfolioUrl ? `<a class="changes" href="${escapeAttribute(request.portfolioUrl)}" target="_blank" rel="noreferrer">Open Portfolio</a>` : ""}
        ${request.proofUrl ? `<a class="changes" href="${escapeAttribute(request.proofUrl)}" target="_blank" rel="noreferrer">Open Proof</a>` : ""}
        <button class="approve" data-verify-approve="${creator._id}">Approve</button>
        <button class="reject" data-verify-reject="${creator._id}">Reject</button>
      </div>
    `;

    card.querySelector("[data-verify-approve]")?.addEventListener("click", () => updateCreatorVerification(creator._id, "approved"));
    card.querySelector("[data-verify-reject]")?.addEventListener("click", () => updateCreatorVerification(creator._id, "rejected"));
    verificationRequestList.appendChild(card);
  });
}

function renderReferralLeaderboard(referrers) {
  referralLeaderboardList.innerHTML = "";
  if (!referrers.length) {
    referralLeaderboardList.innerHTML = "<p style='opacity:.7'>Referral momentum will appear here once creators start sharing invite links</p>";
    return;
  }

  referrers.forEach((user) => {
    const card = document.createElement("div");
    card.className = "content-card";
    card.innerHTML = `
      <div class="content-info">
        <div>
          <h3>${escapeHTML(user.name || "Member")} - @${escapeHTML(user.username || "member")}</h3>
          <p>
            Code: <strong>${escapeHTML(user.referralCode || "Pending")}</strong><br/>
            Signups: ${Number(user.referralStats?.signupsCount || 0).toLocaleString("en-IN")} - Activated creators: ${Number(user.referralStats?.creatorsCount || 0).toLocaleString("en-IN")}<br/>
            Rewarded purchases: ${Number(user.referralStats?.rewardedPurchasesCount || 0).toLocaleString("en-IN")} - Rewards: ₹${Number(user.referralStats?.totalRewardAmount || 0).toLocaleString("en-IN")}<br/>
            Role: ${escapeHTML(String(user.role || "reader").toUpperCase())}${user.verified ? " - Verified" : ""}
          </p>
          <div class="signals">
            ${featuredTone}
            <span class="signal revenue">${escapeHTML(book.type || "Product")}</span>
            <span class="signal ai">${escapeHTML(book.status || "Approved")}</span>
          </div>
        </div>
      </div>
    `;
    referralLeaderboardList.appendChild(card);
  });
}

function formatReadinessStatus(status = "warning") {
  const normalized = String(status || "warning").trim().toLowerCase();
  if (normalized === "ready") {
    return "Ready";
  }
  if (normalized === "blocked") {
    return "Blocked";
  }
  return "Warning";
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildCampaignChannel(channel = {}) {
  if (channel.emailDelivered) {
    return "Email + inbox";
  }

  if (channel.inAppDelivered) {
    return "Inbox only";
  }

  return "CRM";
}

function formatCampaignMetric(entry = {}) {
  if (entry.primaryMetricType === "count") {
    return Number(entry.primaryMetricValue || 0).toLocaleString("en-IN");
  }

  return formatCurrency(entry.primaryMetricValue || 0);
}

function formatVariantMetric(entry = {}) {
  if (entry.primaryMetricType === "count") {
    return Number(entry.primaryMetricValue || 0).toLocaleString("en-IN");
  }

  return formatCurrency(entry.primaryMetricValue || 0);
}

function formatStrategyMetric(entry = {}) {
  if (entry.primaryMetricType === "count") {
    return Number(entry.primaryMetricValue || 0).toLocaleString("en-IN");
  }

  return formatCurrency(entry.primaryMetricValue || 0);
}

function formatVariantLabel(variant = "default") {
  const normalized = String(variant || "default").trim().toLowerCase();
  if (normalized === "social_proof") {
    return "Social Proof";
  }

  if (normalized === "auto") {
    return "Auto";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatExperimentAction(action = "observe", confidence = "collecting") {
  if (action === "promote") {
    return "Auto-promote winner";
  }

  if (confidence === "testing") {
    return "Keep testing";
  }

  return "Collecting signal";
}

function formatStrategyMode(mode = "auto") {
  return String(mode || "auto").toLowerCase() === "manual" ? "Manual pin" : "Auto winner";
}

function formatSnapshotTrigger(snapshot = {}) {
  const trigger = String(snapshot.triggerType || "admin").toLowerCase();
  const actor = snapshot.triggeredBy?.name || snapshot.triggeredBy?.username || "";
  if (trigger === "cron") {
    return "Cron snapshot";
  }

  return actor ? `Admin snapshot by ${actor}` : "Admin snapshot";
}

function formatCohortSummary(filters = {}) {
  const role = String(filters.cohortRole || "all").trim().toLowerCase();
  const language = String(filters.marketplaceLanguage || "all").trim().toLowerCase();
  const pieces = [];

  if (role === "creator") {
    pieces.push("Creators");
  } else if (role === "reader") {
    pieces.push("Readers");
  } else {
    pieces.push("All roles");
  }

  if (language === "hindi") {
    pieces.push("Hindi");
  } else if (language === "english") {
    pieces.push("English");
  } else {
    pieces.push("All languages");
  }

  return pieces.join(" | ");
}

function renderLifecycleLabConfig(config = {}) {
  const supportedVariants = Array.isArray(config.supportedVariants) ? config.supportedVariants : [];
  if (supportedVariants.length && crmLabVariant) {
    crmLabVariant.innerHTML = supportedVariants.map((variant) => `
      <option value="${escapeAttribute(variant)}">${escapeHTML(formatVariantLabel(variant))}</option>
    `).join("");
  }

  const roleOptions = Array.isArray(config.supportedFilters?.cohortRole) ? config.supportedFilters.cohortRole : [];
  if (roleOptions.length && crmLabRole) {
    crmLabRole.innerHTML = roleOptions.map((role) => `
      <option value="${escapeAttribute(role)}">${escapeHTML(role === "all" ? "All" : role === "reader" ? "Readers" : "Creators")}</option>
    `).join("");
  }

  const languageOptions = Array.isArray(config.supportedFilters?.marketplaceLanguage) ? config.supportedFilters.marketplaceLanguage : [];
  if (languageOptions.length && crmLabLanguage) {
    crmLabLanguage.innerHTML = languageOptions.map((language) => `
      <option value="${escapeAttribute(language)}">${escapeHTML(language === "all" ? "All" : language.charAt(0).toUpperCase() + language.slice(1))}</option>
    `).join("");
  }

  if (crmLabStatus) {
    crmLabStatus.textContent = config.emailConfigured
      ? "Lifecycle lab is connected and email delivery is enabled."
      : "Lifecycle lab is ready, but outbound email is not configured yet.";
  }
}

function collectLifecycleLabPayload() {
  return {
    mode: crmLabMode?.value || "cart",
    variant: crmLabVariant?.value || "default",
    limit: Math.min(Math.max(Number(crmLabLimit?.value || 20), 1), 100),
    force: Boolean(crmLabForce?.checked),
    filters: {
      cohortRole: crmLabRole?.value || "all",
      marketplaceLanguage: crmLabLanguage?.value || "all",
    },
  };
}

function renderLifecyclePreview(data = {}) {
  if (!crmLabPreview) {
    return;
  }

  if (data.crm) {
    const groups = [
      data.crm.cartRecovery,
      data.crm.upsells,
      data.crm.creatorLaunch,
      data.crm.referralPrompts,
    ].filter(Boolean);

    crmLabPreview.innerHTML = groups.map((group) => `
      <article class="content-card compact-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(String(group.mode || "crm").toUpperCase())}</h3>
            <p>
              Candidates: ${Number(group.candidates || 0).toLocaleString("en-IN")} | Variant: ${escapeHTML(formatVariantLabel(group.variantApplied || "default"))}<br/>
              Cohort: ${escapeHTML(formatCohortSummary(group.filtersApplied || {}))} | Strategy: ${escapeHTML(formatVariantSource(group.variantSource || "manual"))}
            </p>
            ${group.copyPreview ? renderEmbeddedCopyPreview(group.copyPreview) : ""}
          </div>
        </div>
      </article>
    `).join("");
    return;
  }

  const samples = Array.isArray(data.samples) ? data.samples : [];
  crmLabPreview.innerHTML = `
    <article class="content-card compact-card">
      <div class="content-info">
        <div>
          <h3>${escapeHTML(String(data.mode || "campaign").toUpperCase())} | ${escapeHTML(formatVariantLabel(data.variantApplied || "default"))}</h3>
          <p>
            Estimated candidates: ${Number(data.candidates || 0).toLocaleString("en-IN")}<br/>
            Cohort: ${escapeHTML(formatCohortSummary(data.filtersApplied || {}))} | Strategy: ${escapeHTML(formatVariantSource(data.variantSource || "manual"))}
          </p>
          ${data.copyPreview ? renderEmbeddedCopyPreview(data.copyPreview) : ""}
        </div>
      </div>
    </article>
    ${samples.length
      ? samples.map((sample) => `
        <article class="content-card compact-card">
          <div class="content-info">
            <div>
              <h3>${escapeHTML(sample.name || "Member")} | ${escapeHTML(String(sample.role || "reader").toUpperCase())}</h3>
              <p>
                ${escapeHTML(sample.email || "No email")} | ${escapeHTML(String(sample.language || "english").toUpperCase())}<br/>
                ${escapeHTML(sample.headline || "Candidate")} | ${escapeHTML(sample.detail || "")}
              </p>
            </div>
          </div>
        </article>
      `).join("")
      : `<p class="crm-lab-empty">No eligible recipients matched this cohort preview.</p>`
    }
  `;
}

function renderLifecycleRunResult(data = {}) {
  if (!crmLabRunResult) {
    return;
  }

  const crm = data.crm || {};
  const groups = [
    crm.cartRecovery,
    crm.upsells,
    crm.creatorLaunch,
    crm.referralPrompts,
  ].filter(Boolean);

  if (groups.length) {
    crmLabRunResult.innerHTML = groups.map((group) => `
      <article class="content-card compact-card">
        <div class="content-info">
          <div>
            <h3>${escapeHTML(String(group.mode || "crm").toUpperCase())}</h3>
            <p>
              Sent: ${Number(group.sent || 0).toLocaleString("en-IN")} of ${Number(group.candidates || 0).toLocaleString("en-IN")} candidates<br/>
              Variant: ${escapeHTML(formatVariantLabel(group.variantApplied || data.variantApplied || "default"))} | Cohort: ${escapeHTML(formatCohortSummary(group.filtersApplied || data.filtersApplied || {}))}<br/>
              Strategy: ${escapeHTML(formatVariantSource(group.variantSource || data.variantSource || "manual"))}
            </p>
          </div>
        </div>
      </article>
    `).join("");
    return;
  }

  crmLabRunResult.innerHTML = `
    <article class="content-card compact-card">
      <div class="content-info">
        <div>
          <h3>${escapeHTML(String(data.mode || "campaign").toUpperCase())} experiment sent</h3>
          <p>
            Sent: ${Number(data.sent || 0).toLocaleString("en-IN")} of ${Number(data.candidates || 0).toLocaleString("en-IN")} candidates<br/>
            Variant: ${escapeHTML(formatVariantLabel(data.variantApplied || "default"))} | Cohort: ${escapeHTML(formatCohortSummary(data.filtersApplied || {}))}<br/>
            Strategy: ${escapeHTML(formatVariantSource(data.variantSource || "manual"))}
          </p>
        </div>
      </div>
    </article>
  `;
}

async function previewLifecycleExperiment() {
  try {
    if (crmLabStatus) {
      crmLabStatus.textContent = "Building cohort preview...";
    }

    const payload = collectLifecycleLabPayload();
    const res = await fetch(`${API_BASE}/api/lifecycle/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lifecycle preview failed");
    }

    renderLifecyclePreview(data);
    if (crmLabStatus) {
      crmLabStatus.textContent = `Preview ready for ${String(payload.mode).toUpperCase()} with ${formatVariantLabel(payload.variant)} strategy.`;
    }
  } catch (error) {
    console.error(error);
    if (crmLabPreview) {
      crmLabPreview.innerHTML = `<p class="crm-lab-empty">${escapeHTML(error.message || "Lifecycle preview failed")}</p>`;
    }
    if (crmLabStatus) {
      crmLabStatus.textContent = "Preview failed.";
    }
  }
}

async function runLifecycleExperiment() {
  const payload = collectLifecycleLabPayload();
  const confirmed = window.confirm(`Run the ${String(payload.mode).toUpperCase()} experiment with the ${formatVariantLabel(payload.variant)} variant for ${formatCohortSummary(payload.filters)}?`);
  if (!confirmed) {
    return;
  }

  try {
    if (crmLabStatus) {
      crmLabStatus.textContent = "Running lifecycle experiment...";
    }

    const res = await fetch(`${API_BASE}/api/lifecycle/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lifecycle experiment failed");
    }

    renderLifecycleRunResult(data);
    if (crmLabStatus) {
      crmLabStatus.textContent = "Lifecycle experiment sent successfully.";
    }
    lifecycleLabConfig = null;
    await loadReportsOverview();
  } catch (error) {
    console.error(error);
    if (crmLabRunResult) {
      crmLabRunResult.innerHTML = `<p class="crm-lab-empty">${escapeHTML(error.message || "Lifecycle experiment failed")}</p>`;
    }
    if (crmLabStatus) {
      crmLabStatus.textContent = "Lifecycle experiment failed.";
    }
  }
}

async function updateLifecycleStrategy(campaignKey, payload, successMessage = "Lifecycle strategy updated.") {
  try {
    const res = await fetch(`${API_BASE}/api/admin/lifecycle-strategies/${encodeURIComponent(campaignKey)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Lifecycle strategy update failed");
    }

    alert(successMessage || data.message || "Lifecycle strategy updated.");
    await loadReportsOverview();
  } catch (error) {
    console.error(error);
    alert(error.message || "Lifecycle strategy update failed");
  }
}

async function captureLifecycleSnapshot() {
  try {
    const note = window.prompt("Optional note for this winner snapshot", "") ?? "";
    const res = await fetch(`${API_BASE}/api/admin/lifecycle-snapshots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Unable to capture lifecycle snapshot");
    }

    alert(data.message || "Lifecycle snapshot captured.");
    await loadReportsOverview();
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to capture lifecycle snapshot");
  }
}

function buildDeliverySummary(delivery = {}) {
  const mode = String(delivery?.mode || "file");
  const includedItems = Array.isArray(delivery?.includedItems) ? delivery.includedItems : [];
  const pieces = [
    `Delivery: ${mode}`,
  ];

  if (includedItems.length) {
    pieces.push(`Includes ${includedItems.slice(0, 3).join(", ")}`);
  }

  if (delivery?.hasExternalUrl) {
    pieces.push("External unlock link");
  } else if (delivery?.hasText && !delivery?.hasFile) {
    pieces.push("Instant text unlock");
  } else if (delivery?.hasText && delivery?.hasFile) {
    pieces.push("Text + file unlock");
  } else if (delivery?.hasFile) {
    pieces.push("Downloadable asset");
  }

  return pieces.join(" - ");
}

function enhanceBookModerationCard(card, book, options = {}) {
  if (!card || !book) {
    return;
  }

  const infoBlock = card.querySelector(".content-info div");
  if (infoBlock) {
    const detail = document.createElement("p");
    detail.textContent = `${String(book.type || "Product").toUpperCase()} - ${buildDeliverySummary(book.delivery || {})}`;
    infoBlock.appendChild(detail);

    if (book.delivery?.previewText) {
      const preview = document.createElement("p");
      preview.textContent = book.delivery.previewText;
      infoBlock.appendChild(preview);
    }

    if (book.delivery?.instructions) {
      const instructions = document.createElement("p");
      instructions.textContent = `Buyer instructions: ${book.delivery.instructions}`;
      infoBlock.appendChild(instructions);
    }
  }

  if (options.pending) {
    const actions = card.querySelector(".actions");
    if (actions && !actions.querySelector("[data-request-changes-id]")) {
      const requestChangesBtn = document.createElement("button");
      requestChangesBtn.className = "changes";
      requestChangesBtn.textContent = "Request Changes";
      requestChangesBtn.dataset.requestChangesId = String(book._id || "");
      requestChangesBtn.addEventListener("click", () => requestChanges(book._id));
      actions.insertBefore(requestChangesBtn, actions.querySelector(".approve") || null);
    }
  }
}

function renderPending(books) {
  contentList.innerHTML = "";
  if (!books.length) {
    const hasFilters = Boolean(
      String(contentSearchInput?.value || "").trim()
      || getSelectedText(contentTypeFilter, "All Types") !== "All Types"
      || getSelectedText(contentAiFilter, "AI Score") !== "AI Score"
    );
    contentList.innerHTML = hasFilters
      ? "<div class='empty-state'><p>No pending products match the current filters.</p></div>"
      : "<p style='opacity:.7'>No pending content</p>";
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const cover = resolveAssetUrl(book.coverImage, "../assets/covers/Ebook_AI.png");
    card.innerHTML = `
      <div class="content-info">
        <img src="${cover}" style="width:80px;height:100px;object-fit:cover;border-radius:4px;" />
        <div>
          <h3>${escapeHTML(book.title)}</h3>
          <p>
            ${book.category} • ₹${book.price}<br/>
            Creator: <strong>${book.author?.name || "Unknown"}</strong><br/>
            AI Score: ${book.aiScore || 0}% • Plagiarism: ${book.plagiarismScore || 0}% • Quality: ${book.qualityScore || 0}%
          </p>
          <div class="signals">
            <span class="signal ai">AI ${book.aiStatus || "pending"}</span>
            <span class="signal originality">${Number(book.qualityScore || 0)}% quality</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="changes" data-report-id="${book._id}">View Report</button>
        <button class="approve" data-id="${book._id}">Approve</button>
        <button class="reject" data-id="${book._id}">Reject</button>
      </div>
    `;

    card.querySelector(".changes").onclick = () => openAiReport(book._id);
    card.querySelector(".approve").onclick = () => approveBook(book._id);
    card.querySelector(".reject").onclick = () => rejectBook(book._id);
    enhanceBookModerationCard(card, book, { pending: true });

    contentList.appendChild(card);
  });
}

function renderApproved(books) {
  approvedList.innerHTML = "";
  if (!books.length) {
    const hasFilters = Boolean(String(approvedSearchInput?.value || "").trim());
    approvedList.innerHTML = hasFilters
      ? "<div class='empty-state'><p>No approved products match the current search.</p></div>"
      : "<p style='opacity:.7'>No approved content yet</p>";
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const cover = resolveAssetUrl(book.coverImage, "../assets/covers/Ebook_AI.png");
    const featuredTone = book.isFeatured
      ? `<span class="signal featured">Featured Live</span>`
      : `<span class="signal standard">Standard Placement</span>`;
    const featuredButtonLabel = book.isFeatured ? "Remove from Featured" : "Mark Featured";
    const featuredButtonClass = book.isFeatured ? "reject" : "feature";
    card.innerHTML = `
      <div class="content-info">
        <img src="${cover}" style="width:80px;height:100px;object-fit:cover;border-radius:4px;" />
        <div>
          <h3>${escapeHTML(book.title)}</h3>
          <p>
            ${book.category} • ₹${book.price}<br/>
            Creator: <strong>${book.author?.name || "Unknown"}</strong><br/>
            Sales: ${book.salesCount || 0} • Downloads: ${book.downloads || 0}
          </p>
          <div class="signals">
            ${featuredTone}
            <span class="signal revenue">${escapeHTML(book.type || "Product")}</span>
            <span class="signal ai">${escapeHTML(book.status || "Approved")}</span>
          </div>
        </div>
      </div>
    `;
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.innerHTML = `
      <button class="${featuredButtonClass}" type="button" data-featured-book="${escapeAttribute(String(book._id || ""))}" data-featured-state="${book.isFeatured ? "0" : "1"}">${escapeHTML(featuredButtonLabel)}</button>
    `;
    card.appendChild(actions);
    enhanceBookModerationCard(card, book);
    card.querySelector("[data-featured-book]")?.addEventListener("click", () => {
      const nextState = card.querySelector("[data-featured-book]")?.getAttribute("data-featured-state") === "1";
      void updateApprovedBookFeaturedState(book, nextState);
    });
    approvedList.appendChild(card);
  });
}

function formatVariantSource(source = "manual") {
  if (source === "admin_manual") {
    return "Admin pin";
  }

  if (source === "auto_promoted") {
    return "Auto winner";
  }

  if (source === "default_fallback") {
    return "Auto fallback";
  }

  if (source === "strategy_fallback") {
    return "Configured fallback";
  }

  if (source === "per_campaign_auto") {
    return "Per-campaign auto";
  }

  if (source === "not_applicable") {
    return "Not applicable";
  }

  return "Manual";
}

function buildStrategyVariantOptions(variants = [], selectedVariant = "default") {
  const safeVariants = Array.isArray(variants) && variants.length
    ? variants
    : ["default", "urgency", "social_proof", "value"];

  return safeVariants.map((variant) => `
    <option value="${escapeAttribute(variant)}"${variant === selectedVariant ? " selected" : ""}>${escapeHTML(formatVariantLabel(variant))}</option>
  `).join("");
}

function buildStrategyHistoryMarkup(history = []) {
  if (!Array.isArray(history) || !history.length) {
    return `<div class="strategy-history"><p class="crm-lab-empty">No strategy changes recorded yet.</p></div>`;
  }

  return `
    <div class="strategy-history">
      <strong>Recent changes</strong>
      ${history.slice(0, 3).map((entry) => `
        <p>
          ${escapeHTML(formatDateTime(entry.updatedAt))} | ${escapeHTML(entry.updatedBy?.name || entry.updatedBy?.username || "Admin")}<br/>
          ${escapeHTML(formatStrategyMode(entry.resolutionMode || "auto"))} - Manual ${escapeHTML(entry.manualVariantLabel || formatVariantLabel(entry.manualVariant || "default"))} - Fallback ${escapeHTML(entry.fallbackVariantLabel || formatVariantLabel(entry.fallbackVariant || "default"))}<br/>
          ${escapeHTML(entry.reason || entry.notes || "Strategy updated.")}
        </p>
      `).join("")}
    </div>
  `;
}

function renderEmbeddedCopyPreview(copyPreview = {}) {
  return `
    <div class="strategy-history strategy-preview-card">
      <strong>Copy preview</strong>
      <p>
        Recipient: ${escapeHTML(copyPreview.recipient?.name || copyPreview.recipient?.email || "Matched member")}<br/>
        Subject: ${escapeHTML(copyPreview.subject || copyPreview.title || "Lifecycle message")}<br/>
        CTA: ${escapeHTML(copyPreview.actionLabel || "Open workflow")} -> ${escapeHTML(copyPreview.actionLink || "")}
      </p>
      <p>${escapeHTML(copyPreview.message || "")}</p>
    </div>
  `;
}

function renderInlineCopyPreview(copyPreview = {}, variantSource = "manual") {
  if (!copyPreview || !copyPreview.title) {
    return `<p class="crm-lab-empty">No eligible recipient matched this strategy preview.</p>`;
  }

  return `
    <div class="strategy-history strategy-preview-card">
      <strong>${escapeHTML(copyPreview.title || "Lifecycle preview")}</strong>
      <p>
        Strategy: ${escapeHTML(formatVariantSource(variantSource))} | Recipient: ${escapeHTML(copyPreview.recipient?.name || copyPreview.recipient?.email || "Matched member")}<br/>
        Subject: ${escapeHTML(copyPreview.subject || copyPreview.title || "")}<br/>
        CTA: ${escapeHTML(copyPreview.actionLabel || "Open workflow")} -> ${escapeHTML(copyPreview.actionLink || "")}
      </p>
      <p>${escapeHTML(copyPreview.message || "")}</p>
    </div>
  `;
}

function mapCampaignKeyToLifecycleMode(campaignKey = "") {
  const normalized = String(campaignKey || "").trim().toLowerCase();
  if (normalized === "abandoned_cart") {
    return "cart";
  }

  if (normalized === "post_purchase_upsell") {
    return "upsell";
  }

  if (normalized === "creator_launch_sequence") {
    return "creator";
  }

  if (normalized === "referral_prompt") {
    return "referral";
  }

  return "cart";
}

function renderReviewReports(reports) {
  if (!reviewReportList) {
    return;
  }

  reviewReportList.innerHTML = "";
  if (!reports.length) {
    reviewReportList.innerHTML = "<p style='opacity:.7'>No pending review reports</p>";
    return;
  }

  reports.forEach((report) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const review = report.review || {};
    const reviewOwner = report.reviewOwner || review.reviewer || {};
    const reporter = report.reporter || {};

    card.innerHTML = `
      <div class="content-info">
        <div>
          <h3>${escapeHTML(report.book?.title || "Book review")} - ${escapeHTML(String(report.reason || "other").toUpperCase())}</h3>
          <p>
            Review by: <strong>${escapeHTML(reviewOwner.username ? `@${reviewOwner.username}` : reviewOwner.name || "Reviewer")}</strong><br/>
            Reported by: <strong>${escapeHTML(reporter.username ? `@${reporter.username}` : reporter.name || "Member")}</strong><br/>
            Rating: ${Number(review.rating || 0)}/5 - Submitted: ${escapeHTML(formatDate(report.createdAt))}<br/>
            ${review.comment ? `Review: ${escapeHTML(review.comment)}<br/>` : ""}
            ${report.details ? `Report note: ${escapeHTML(report.details)}` : "No extra report note added."}
          </p>
        </div>
      </div>
      <div class="actions">
        <button class="changes" data-review-keep="${report._id}">Keep Review</button>
        <button class="reject" data-review-remove="${report._id}">Remove Review</button>
      </div>
    `;

    card.querySelector("[data-review-keep]")?.addEventListener("click", () => updateReviewReport(report._id, "dismissed", "keep_review"));
    card.querySelector("[data-review-remove]")?.addEventListener("click", () => updateReviewReport(report._id, "resolved", "remove_review"));
    reviewReportList.appendChild(card);
  });
}

function renderPendingPayments(payments) {
  paymentReviewList.innerHTML = "";
  if (!payments.length) {
    paymentReviewList.innerHTML = "<p style='opacity:.7'>No pending manual payments</p>";
    return;
  }

  payments.forEach((payment) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const proofUrl = buildPaymentProofUrl(payment._id, false);
    card.innerHTML = `
      <div class="content-info">
        ${proofUrl ? `<img src="${escapeAttribute(proofUrl)}" style="width:80px;height:100px;object-fit:cover;border-radius:4px;" alt="Payment screenshot" />` : ""}
        <div>
          <h3>${escapeHTML(payment.book?.title || "Book")}</h3>
          <p>
            ${escapeHTML(payment.book?.category || "Book")} • ₹${Number(payment.amount || payment.book?.price || 0).toLocaleString("en-IN")}<br/>
            Buyer: <strong>${escapeHTML(payment.user?.name || payment.user?.email || "Buyer")}</strong><br/>
            Creator: <strong>${escapeHTML(payment.creator?.name || payment.creator?.email || "Creator")}</strong><br/>
            Method: ${escapeHTML(payment.paymentMethod || "Other")} • Txn: ${escapeHTML(payment.transactionId || "Pending")}<br/>
            Submission: ${Number(payment.submissionCount || 1)}
          </p>
        </div>
      </div>
      <div class="actions">
        ${proofUrl ? `<a class="changes" href="${escapeAttribute(proofUrl)}" target="_blank" rel="noreferrer">Open Proof</a>` : ""}
        <button class="approve" data-payment-approve="${payment._id}">Approve</button>
        <button class="reject" data-payment-reject="${payment._id}">Reject</button>
      </div>
    `;

    card.querySelector("[data-payment-approve]")?.addEventListener("click", () => approvePayment(payment._id));
    card.querySelector("[data-payment-reject]")?.addEventListener("click", () => rejectPayment(payment._id));
    paymentReviewList.appendChild(card);
  });
}

function renderWithdrawRequests(withdrawals) {
  withdrawRequestList.innerHTML = "";
  if (!withdrawals.length) {
    withdrawRequestList.innerHTML = "<p style='opacity:.7'>No creator payouts waiting right now</p>";
    return;
  }

  withdrawals.forEach((withdrawal) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const payoutLabel = buildPayoutLabel(withdrawal.user?.payout || {});
    const statusChip = escapeHTML(String(withdrawal.status || "pending").toUpperCase());

    card.innerHTML = `
      <div class="content-info">
        <div>
          <h3>${escapeHTML(withdrawal.user?.name || withdrawal.user?.email || "Creator payout")}</h3>
          <p>
            Amount: <strong>₹${Number(withdrawal.amount || 0).toLocaleString("en-IN")}</strong><br/>
            Method: ${escapeHTML(withdrawal.method || "bank")}<br/>
            Destination: ${escapeHTML(payoutLabel)}<br/>
            Requested: ${escapeHTML(formatDate(withdrawal.requestedAt))}<br/>
            Status: <strong>${statusChip}</strong>
          </p>
          ${withdrawal.adminNote ? `<p>${escapeHTML(withdrawal.adminNote)}</p>` : ""}
        </div>
      </div>
      <div class="actions">
        ${withdrawal.status === "pending" ? `<button class="changes" data-withdraw-approve="${withdrawal._id}">Approve</button>` : ""}
        ${(withdrawal.status === "pending" || withdrawal.status === "approved") ? `<button class="approve" data-withdraw-paid="${withdrawal._id}">Mark Paid</button>` : ""}
        ${(withdrawal.status === "pending" || withdrawal.status === "approved") ? `<button class="reject" data-withdraw-reject="${withdrawal._id}">Reject</button>` : ""}
      </div>
    `;

    card.querySelector("[data-withdraw-approve]")?.addEventListener("click", () => updateWithdrawalStatus(withdrawal._id, "approved"));
    card.querySelector("[data-withdraw-paid]")?.addEventListener("click", () => updateWithdrawalStatus(withdrawal._id, "paid"));
    card.querySelector("[data-withdraw-reject]")?.addEventListener("click", () => updateWithdrawalStatus(withdrawal._id, "rejected"));
    withdrawRequestList.appendChild(card);
  });
}

async function updateApprovedBookFeaturedState(book, nextState) {
  const safeBookId = String(book?._id || "").trim();
  if (!safeBookId) {
    return;
  }

  if (!nextState && !window.confirm(`Remove "${book.title || "this book"}" from featured placement?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${encodeURIComponent(safeBookId)}/featured`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isFeatured: nextState }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Unable to update featured placement");
    }

    syncApprovedBookRecord(data.book || { ...book, isFeatured: nextState });
    applyApprovedBookFilters();
    markAdminSynced();
    alert(data.message || (nextState ? "Book marked as featured" : "Book removed from featured"));
  } catch (err) {
    alert(err.message || "Unable to update featured placement");
  }
}

async function approveBook(bookId) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${bookId}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    alert("Book approved!");
    loadPendingBooks();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectBook(bookId) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${bookId}/reject`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    alert("Book rejected!");
    loadPendingBooks();
  } catch (err) {
    alert(err.message);
  }
}

async function requestChanges(bookId) {
  const adminNotes = window.prompt("Explain what the creator should change before approval", "") ?? "";
  if (!adminNotes.trim()) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}/request-changes`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ adminNotes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request changes failed");
    alert(data.message || "Changes requested");
    loadPendingBooks();
  } catch (err) {
    alert(err.message);
  }
}

async function approvePayment(paymentId) {
  const adminNote = window.prompt("Add an optional approval note for this payment", "") ?? "";

  try {
    const res = await fetch(`${API_BASE}/api/payments/${paymentId}/approve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Payment approval failed");
    alert("Payment approved!");
    loadPendingPayments();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectPayment(paymentId) {
  const adminNote = window.prompt("Add a rejection reason for this payment proof", "") ?? "";

  try {
    const res = await fetch(`${API_BASE}/api/payments/${paymentId}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Payment rejection failed");
    alert("Payment rejected!");
    loadPendingPayments();
  } catch (err) {
    alert(err.message);
  }
}

async function updateWithdrawalStatus(withdrawalId, status) {
  const notePrompt = status === "rejected"
    ? "Add a rejection reason for the creator payout"
    : `Add an optional note for this ${status} action`;
  const adminNote = window.prompt(notePrompt, "") ?? "";

  try {
    const res = await fetch(`${API_BASE}/api/admin/withdrawals/${withdrawalId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status, adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Withdrawal update failed");
    alert(data.message || "Withdrawal updated");
    loadWithdrawRequests();
  } catch (err) {
    alert(err.message);
  }
}

async function updateCreatorVerification(userId, status) {
  const notePrompt = status === "rejected"
    ? "Add a rejection note for this creator verification request"
    : "Add an optional approval note for this creator";
  const adminNote = window.prompt(notePrompt, "") ?? "";

  try {
    const res = await fetch(`${API_BASE}/api/admin/creators/${encodeURIComponent(userId)}/verification`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status, adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Creator verification update failed");
    alert(data.message || "Creator verification updated");
    loadCreatorsHub();
  } catch (err) {
    alert(err.message);
  }
}

async function updateReviewReport(reportId, status, action) {
  const notePrompt = action === "remove_review"
    ? "Add an optional moderation note for removing this review"
    : "Add an optional note explaining why this review is being kept";
  const adminNote = window.prompt(notePrompt, "") ?? "";

  try {
    const res = await fetch(`${API_BASE}/api/admin/review-reports/${encodeURIComponent(reportId)}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status, action, adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Review report update failed");
    alert(data.message || "Review report updated");
    loadReviewReports();
  } catch (err) {
    alert(err.message);
  }
}

async function loadAIOverview() {
  try {
    const res = await fetch(`${API_BASE}/api/ai/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to load AI overview");
    }

    adminState.aiHighRiskCount = Number(data.summary?.highRisk || 0);
    adminState.aiManualReviewCount = Number(data.summary?.manualReview || 0);
    updateNavCounts();
    renderAiOverview(data.summary || {}, data.topFlagged || []);
    markAdminSynced();
  } catch (err) {
    console.error(err);
    aiOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    aiFlaggedList.innerHTML = "<p>Failed to load AI overview</p>";
  }
}

function renderAiOverview(summary, flagged) {
  const statusMap = summary.statuses || {};
  const processingMap = summary.processing || {};

  aiOverview.innerHTML = [
    { label: "Manual review", value: summary.manualReview || 0 },
    { label: "High risk", value: summary.highRisk || 0 },
    { label: "Auto approved", value: summary.autoApproved || 0 },
    { label: "Queued", value: processingMap.queued || 0 },
  ].map((card) => `
    <article class="stat-card">
      <h3>${escapeHTML(card.label)}</h3>
      <p>${Number(card.value || 0).toLocaleString("en-IN")}</p>
    </article>
  `).join("");

  if (!flagged.length) {
    aiFlaggedList.innerHTML = `
      <div class="empty-state">
        <p>No risky AI cases right now. Status snapshot: ${escapeHTML(buildCompactMap(statusMap))}</p>
      </div>
    `;
    return;
  }

  aiFlaggedList.innerHTML = flagged.map((book) => `
    <article class="content-card">
      <div class="content-info">
        <div>
          <h3>${escapeHTML(book.title)}</h3>
          <p>${escapeHTML(book.moderationReason || "AI moderation details available in the report view.")}</p>
          <div class="signals">
            <span class="signal ai">${escapeHTML(book.aiStatus || "pending")}</span>
            <span class="signal originality">Risk ${Number(book.plagiarismScore || 0)}%</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="changes" onclick="window.location.href='../ai/ai-review.html?id=${encodeURIComponent(book._id)}'">Open Report</button>
      </div>
    </article>
  `).join("");
}

function openAiReport(bookId) {
  window.location.href = `../ai/ai-review.html?id=${encodeURIComponent(bookId)}`;
}

function logoutUser() {
  fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true
  }).catch(() => null);
  localStorage.clear();
  window.location.href = "../login.html";
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return {
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m];
  });
}

function escapeAttribute(value) {
  return escapeHTML(String(value || "")).replace(/"/g, "&quot;");
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveAssetUrl(value, fallback = "") {
  const source = String(value || "").trim();
  if (!source) {
    return fallback;
  }

  const repaired = source.replace(
    /^(https?:\/\/[^/]+)(assets\/|uploads\/)/i,
    "$1/$2"
  );

  if (/^(https?:|data:|\.\.\/|\.\/|\/assets\/)/i.test(repaired)) {
    return repaired;
  }

  if (/^assets\//i.test(repaired)) {
    return `/${repaired}`;
  }

  if (repaired.startsWith("/uploads")) {
    return `${API_BASE}${repaired}`;
  }

  if (/^uploads\//i.test(repaired)) {
    return `${API_BASE}/${repaired}`;
  }

  return repaired;
}

function buildCompactMap(map) {
  return Object.entries(map || {})
    .map(([label, value]) => `${label}: ${value}`)
    .join(" • ");
}

function buildPayoutLabel(payout) {
  if (payout?.upiId) {
    return `UPI - ${payout.upiId}`;
  }

  if (payout?.bankAccount) {
    return `Bank - ${payout.bankAccount}${payout.ifscCode ? ` (${payout.ifscCode})` : ""}`;
  }

  return "No payout details saved";
}

function formatDate(value) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function buildPaymentProofUrl(referenceId, isBatch = false) {
  const normalizedReference = String(referenceId || "").trim();
  if (!normalizedReference || !token) {
    return "";
  }

  const path = isBatch
    ? `/api/payments/groups/${encodeURIComponent(normalizedReference)}/proof`
    : `/api/payments/${encodeURIComponent(normalizedReference)}/proof`;
  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE}${path}${separator}token=${encodeURIComponent(token)}`;
}

function groupPendingPayments(payments) {
  const groups = new Map();

  payments.forEach((payment) => {
    const key = payment.paymentGroupId || payment._id;
    if (!groups.has(key)) {
      groups.set(key, {
        groupId: payment.paymentGroupId || "",
        items: [],
        screenshot: payment.screenshot || "",
        buyerName: payment.user?.name || payment.user?.email || "Buyer",
        paymentMethod: payment.paymentMethod || "Other",
        paymentReference: payment.paymentReference || payment.transactionId || "",
        submissionCount: Number(payment.submissionCount || 1),
        totalAmount: 0,
      });
    }

    const group = groups.get(key);
    group.items.push(payment);
    group.totalAmount += Number(payment.amount || payment.book?.price || 0);
    group.submissionCount = Math.max(group.submissionCount, Number(payment.submissionCount || 1));
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    isBatch: group.items.length > 1 && Boolean(group.groupId),
  }));
}

function renderPendingPayments(payments) {
  paymentReviewList.innerHTML = "";
  if (!payments.length) {
    paymentReviewList.innerHTML = "<p style='opacity:.7'>No pending manual payments</p>";
    return;
  }

  const paymentGroups = groupPendingPayments(payments);

  paymentGroups.forEach((group) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const titles = group.items
      .map((payment) => escapeHTML(payment.book?.title || "Book"))
      .join(" • ");
    const creators = [...new Set(
      group.items.map((payment) => payment.creator?.name || payment.creator?.email || "Creator")
    )].map((value) => escapeHTML(value)).join(", ");
    const actionId = group.isBatch ? group.groupId : group.items[0]?._id;
    const paymentReference = group.paymentReference || group.items[0]?.transactionId || "Pending";
    const proofUrl = buildPaymentProofUrl(actionId, group.isBatch);

    card.innerHTML = `
      <div class="content-info">
        ${proofUrl ? `<img src="${escapeAttribute(proofUrl)}" style="width:80px;height:100px;object-fit:cover;border-radius:4px;" alt="Payment screenshot" />` : ""}
        <div>
          <h3>${group.isBatch ? `${group.items.length} products in one payment` : titles}</h3>
          <p>
            ${group.isBatch ? titles : escapeHTML(group.items[0]?.book?.category || "Book")}<br/>
            Buyer: <strong>${escapeHTML(group.buyerName)}</strong><br/>
            Creator${group.items.length > 1 ? "s" : ""}: <strong>${creators}</strong><br/>
            Method: ${escapeHTML(group.paymentMethod || "Other")} • Ref: ${escapeHTML(paymentReference)}<br/>
            Total: ₹${Number(group.totalAmount || 0).toLocaleString("en-IN")} • Submission: ${Number(group.submissionCount || 1)}
          </p>
        </div>
      </div>
      <div class="actions">
        ${proofUrl ? `<a class="changes" href="${escapeAttribute(proofUrl)}" target="_blank" rel="noreferrer">Open Proof</a>` : ""}
        <button class="approve" data-payment-approve="${escapeAttribute(String(actionId || ""))}" data-payment-batch="${group.isBatch ? "true" : "false"}">Approve</button>
        <button class="reject" data-payment-reject="${escapeAttribute(String(actionId || ""))}" data-payment-batch="${group.isBatch ? "true" : "false"}">Reject</button>
      </div>
    `;

    card.querySelector("[data-payment-approve]")?.addEventListener("click", (event) => {
      const isBatch = event.currentTarget?.dataset.paymentBatch === "true";
      approvePayment(actionId, isBatch);
    });
    card.querySelector("[data-payment-reject]")?.addEventListener("click", (event) => {
      const isBatch = event.currentTarget?.dataset.paymentBatch === "true";
      rejectPayment(actionId, isBatch);
    });
    paymentReviewList.appendChild(card);
  });
}

async function approvePayment(paymentId, isBatch = false) {
  const adminNote = window.prompt("Add an optional approval note for this payment", "") ?? "";

  try {
    const targetUrl = isBatch
      ? `${API_BASE}/api/payments/groups/${encodeURIComponent(paymentId)}/approve`
      : `${API_BASE}/api/payments/${encodeURIComponent(paymentId)}/approve`;
    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Payment approval failed");
    alert(data.message || "Payment approved!");
    loadPendingPayments();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectPayment(paymentId, isBatch = false) {
  const adminNote = window.prompt("Add a rejection reason for this payment proof", "") ?? "";

  try {
    const targetUrl = isBatch
      ? `${API_BASE}/api/payments/groups/${encodeURIComponent(paymentId)}/reject`
      : `${API_BASE}/api/payments/${encodeURIComponent(paymentId)}/reject`;
    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ adminNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Payment rejection failed");
    alert(data.message || "Payment rejected!");
    loadPendingPayments();
  } catch (err) {
    alert(err.message);
  }
}

async function bootstrapAdmin() {
  try {
    if (typeof window.protectPage === "function") {
      const allowed = await window.protectPage(["admin"]);
      if (!allowed) {
        return;
      }
    }

    syncAdminIdentity();
    setHeaderStatus("Booting Ops", "warning");
    await switchSection(resolveInitialSection());
  } catch (error) {
    console.error("Admin dashboard bootstrap failed:", error);
    setHeaderStatus("Ops Error", "blocked");
    if (headerSyncTime) {
      headerSyncTime.textContent = "Dashboard failed to initialize";
    }
    if (overviewOpsBoard) {
      overviewOpsBoard.innerHTML = `
        <article class="priority-card">
          <div class="priority-meta">
            <span class="priority-value">!</span>
            <span class="priority-tone critical">Error</span>
          </div>
          <h3>Admin dashboard failed to initialize</h3>
          <p>${escapeHTML(error?.message || "Unexpected admin startup failure.")}</p>
          <button class="priority-action" type="button" id="adminRetryBootBtn">Retry boot</button>
        </article>
      `;
      document.getElementById("adminRetryBootBtn")?.addEventListener("click", () => {
        bootstrapAdmin();
      });
    }
  }
}

window.logoutUser = logoutUser;
void bootstrapAdmin();
})();
