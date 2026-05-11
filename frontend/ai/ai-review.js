const API_BASE = window.API_BASE || "";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");

const titleEl = document.getElementById("contentTitle");
const categoryEl = document.getElementById("contentCategory");
const typeEl = document.getElementById("contentType");
const creatorEl = document.getElementById("contentCreator");
const priceMeta = document.getElementById("priceMeta");
const overallScoreEl = document.getElementById("overallScore");
const scoreStatusEl = document.getElementById("scoreStatus");
const insightsList = document.querySelector(".ai-insights ul");
const recommendationBox = document.getElementById("recommendationBox");
const recommendationText = document.getElementById("recommendationText");
const metricsGrid = document.querySelector(".metrics-grid");
const adminActions = document.getElementById("adminActions");
const backLink = document.getElementById("backLink");
const viewerBadge = document.getElementById("viewerBadge");
const providerPanel = document.getElementById("providerPanel");
const providerBadge = document.getElementById("providerBadge");
const providerMeta = document.getElementById("providerMeta");

let reviewData = null;

document.addEventListener("DOMContentLoaded", initializeReviewPage);

function initializeReviewPage() {
  configureViewerShell();

  if (!token) {
    redirectToLogin();
    return;
  }

  if (!bookId) {
    renderErrorState("No book selected. Open this page from the dashboard or admin review queue.");
    return;
  }

  loadReviewReport();
}

function configureViewerShell() {
  const user = readCurrentUser();
  const role = user?.role || "";
  const isAdmin = role === "admin";

  viewerBadge.textContent = isAdmin ? "ADMIN" : role ? "CREATOR VIEW" : "REVIEW";
  backLink.href = isAdmin ? "../admin/admin.html" : "../dashboard/content.html";
  backLink.textContent = isAdmin ? "← Back to Admin Dashboard" : "← Back to Content Studio";

  if (role && !isAdmin) {
    adminActions.classList.add("hidden");
  }
}

async function loadReviewReport() {
  try {
    const response = await fetch(`${API_BASE}/api/ai/books/${encodeURIComponent(bookId)}/report`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to load AI report");
    }

    reviewData = data;
    renderReport(data);
  } catch (error) {
    console.error(error);
    renderErrorState(error.message || "Unable to load AI review report");
  }
}

function renderReport(data) {
  const book = data.book || {};
  const report = data.report || {};
  const qualitySignals = report.qualitySignals || {};
  const originalityScore = Math.max(0, 100 - Number(book.plagiarismScore || 0));
  const readabilityScore = Number(qualitySignals.readabilityScore || 0);
  const spamRisk = Number(qualitySignals.spamScore || 0);
  const recommendation = buildRecommendation(book, report);

  titleEl.textContent = book.title || "Untitled book";
  categoryEl.textContent = book.aiCategory || book.category || "Book";
  typeEl.textContent = book.type || "Book";
  creatorEl.textContent = book.authorName || "Unknown creator";
  priceMeta.innerHTML = `Price: <strong>${escapeHTML(formatPrice(book.price || 0))}</strong>`;

  scoreStatusEl.textContent = recommendation.statusText;
  scoreStatusEl.className = `score-status ${recommendation.className}`;
  renderProvider(report.aiProvider, report.aiModel);

  renderMetrics([
    { label: "Originality", value: `${originalityScore}%`, className: originalityScore >= 75 ? "good" : originalityScore >= 50 ? "warn" : "bad" },
    { label: "Readability", value: `${readabilityScore}%`, className: readabilityScore >= 65 ? "good" : readabilityScore >= 45 ? "warn" : "bad" },
    { label: "Quality", value: `${Number(book.qualityScore || 0)}%`, className: Number(book.qualityScore || 0) >= 70 ? "good" : Number(book.qualityScore || 0) >= 45 ? "warn" : "bad" },
    { label: "Similarity Risk", value: `${Number(book.plagiarismScore || 0)}%`, className: Number(book.plagiarismScore || 0) <= 25 ? "safe" : Number(book.plagiarismScore || 0) <= 55 ? "warn" : "bad" },
    { label: "Queue State", value: String(report.processingState || book.aiProcessingState || "idle").replace(/_/g, " "), className: report.processingState === "failed" ? "bad" : report.processingState === "completed" ? "good" : "warn" },
    { label: "Detected Category", value: book.aiCategory || report.suggestedCategory || book.category || "Book", className: "good" }
  ]);

  renderInsights(buildInsights(book, report));

  recommendationBox.className = `ai-recommendation ${recommendation.className}`;
  recommendationText.textContent = recommendation.message;
  animateScore(Number(book.aiScore || 0));
}

function renderProvider(provider, model) {
  const normalized = String(provider || "local").toLowerCase();
  const descriptor = describeProvider(normalized, model);

  providerPanel.dataset.provider = normalized;
  providerBadge.textContent = descriptor.label;
  providerMeta.textContent = descriptor.meta;
}

function renderMetrics(metrics) {
  metricsGrid.innerHTML = "";

  metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "metric";
    card.innerHTML = `
      <h4>${escapeHTML(metric.label)}</h4>
      <span class="${escapeHTML(metric.className)}">${escapeHTML(metric.value)}</span>
    `;
    metricsGrid.appendChild(card);
  });
}

function buildInsights(book, report) {
  const insights = [];

  if (book.moderationReason) {
    insights.push(book.moderationReason);
  }
  if (book.aiSuggestion && book.aiSuggestion !== book.moderationReason) {
    insights.push(book.aiSuggestion);
  }

  (report.improvementSuggestions || []).forEach((item) => {
    if (item && !insights.includes(item)) {
      insights.push(item);
    }
  });

  if (Array.isArray(report.generatedTags) && report.generatedTags.length) {
    insights.push(`Suggested search tags: ${report.generatedTags.join(", ")}`);
  }

  if (report.pageCount) {
    insights.push(`AI processed ${report.pageCount} page(s) across ${report.chunkCount || 0} text chunk(s).`);
  }

  if (Array.isArray(report.plagiarismMatches) && report.plagiarismMatches.length) {
    const top = report.plagiarismMatches[0];
    insights.push(`Closest similarity match: ${top.title} by ${top.authorName} (${Math.round(Number(top.score || 0) * 100)}% similarity).`);
  } else {
    insights.push("No significant similarity matches were detected against processed marketplace books.");
  }

  if (report.lastError) {
    insights.push(`Processing note: ${report.lastError}`);
  }

  return insights.slice(0, 6);
}

function renderInsights(insights) {
  insightsList.innerHTML = "";
  insights.forEach((insight) => {
    const li = document.createElement("li");
    li.textContent = `• ${insight}`;
    insightsList.appendChild(li);
  });
}

function buildRecommendation(book, report) {
  const processingState = String(report.processingState || book.aiProcessingState || "").toLowerCase();
  const aiStatus = String(book.aiStatus || "").toLowerCase();

  if (processingState === "queued" || processingState === "processing") {
    return {
      className: "review",
      statusText: "AI review in progress",
      message: "The upload is still being scanned. Marketplace visibility will update after the full moderation pass finishes."
    };
  }

  if (aiStatus === "approved") {
    return {
      className: "approve",
      statusText: "Low moderation risk",
      message: "Recommended for publishing"
    };
  }

  if (aiStatus === "rejected") {
    return {
      className: "reject",
      statusText: "High moderation risk",
      message: "Not recommended for publishing without revision"
    };
  }

  return {
    className: "review",
    statusText: "Needs manual review",
    message: "Manual admin review is recommended before this upload goes live"
  };
}

function animateScore(target) {
  let current = 0;
  const safeTarget = Math.max(0, Math.min(100, Number(target || 0)));
  const interval = setInterval(() => {
    current += 1;
    overallScoreEl.textContent = `${current}%`;

    if (current >= safeTarget) {
      clearInterval(interval);
      overallScoreEl.textContent = `${safeTarget}%`;
    }
  }, 15);
}

async function approveContent() {
  await handleReviewAction({
    url: `${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}/approve`,
    method: "PUT",
    body: {},
    successMessage: "Content approved and published"
  });
}

async function requestChanges() {
  const reason = prompt("Enter required changes:");
  if (!reason) {
    return;
  }

  await handleReviewAction({
    url: `${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}/request-changes`,
    method: "PUT",
    body: { adminNotes: reason },
    successMessage: "Changes requested from creator"
  });
}

async function rejectContent() {
  const reason = prompt("Enter rejection reason:");
  if (!reason) {
    return;
  }

  await handleReviewAction({
    url: `${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}/reject`,
    method: "PUT",
    body: { adminNotes: reason },
    successMessage: "Content rejected and creator notified"
  });
}

async function handleReviewAction({ url, method, body, successMessage }) {
  if (readCurrentUser()?.role !== "admin") {
    return;
  }

  try {
    disableButtons();

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body || {})
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Review action failed");
    }

    showToast(successMessage);
    await loadReviewReport();

    setTimeout(() => {
      goBack();
    }, 1200);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Something went wrong");
    enableButtons();
  }
}

function disableButtons() {
  document.querySelectorAll(".btn").forEach((button) => {
    button.disabled = true;
    button.style.opacity = ".6";
    button.style.cursor = "not-allowed";
  });
}

function enableButtons() {
  document.querySelectorAll(".btn").forEach((button) => {
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
  });
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

function goBack() {
  window.location.href = backLink.href;
}

function renderErrorState(message) {
  titleEl.textContent = "AI report unavailable";
  categoryEl.textContent = "Unavailable";
  typeEl.textContent = "Unavailable";
  creatorEl.textContent = "Unavailable";
  priceMeta.innerHTML = `Price: <strong>Unavailable</strong>`;
  scoreStatusEl.textContent = "Could not load report";
  scoreStatusEl.className = "score-status bad";
  recommendationBox.className = "ai-recommendation reject";
  recommendationText.textContent = message;
  overallScoreEl.textContent = "--";
  metricsGrid.innerHTML = "";
  renderProvider("loading", "Unavailable");
  renderInsights([message]);
}

function describeProvider(provider, model) {
  if (provider === "openai") {
    return {
      label: "OpenAI",
      meta: model ? `Model: ${model}` : "Live hosted model"
    };
  }

  if (provider === "ollama") {
    return {
      label: "Local AI via Ollama",
      meta: model ? `Model: ${model}` : "Running on this machine"
    };
  }

  if (provider === "loading") {
    return {
      label: "Loading...",
      meta: model || "Checking active model..."
    };
  }

  return {
    label: "Local Rules Engine",
    meta: model && model !== "local-heuristic" ? `Mode: ${model}` : "Fallback mode with no live model server"
  };
}

function formatPrice(value) {
  return Number(value || 0) > 0
    ? `Rs. ${Number(value || 0).toLocaleString("en-IN")}`
    : "Free";
}

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function redirectToLogin() {
  window.location.href = "../login.html";
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

window.approveContent = approveContent;
window.requestChanges = requestChanges;
window.rejectContent = rejectContent;
window.goBack = goBack;
