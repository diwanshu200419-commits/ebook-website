const API_BASE = window.API_BASE || "";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");

const UPLOAD_DRAFT_KEY = "ebook-market-upload-draft";
const REVIEW_HISTORY_KEY = "ebook-market-ai-review-history";
const MAX_REVIEW_HISTORY = 6;

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
const scoreCircle = document.querySelector(".score-circle");

const modeKicker = document.getElementById("modeKicker");
const modeTitle = document.getElementById("modeTitle");
const modeDescription = document.getElementById("modeDescription");
const reviewStudio = document.getElementById("reviewStudio");
const studioStatus = document.getElementById("studioStatus");
const studioTitleInput = document.getElementById("studioTitle");
const studioTypeInput = document.getElementById("studioType");
const studioCategoryInput = document.getElementById("studioCategory");
const studioPriceInput = document.getElementById("studioPrice");
const studioTagsInput = document.getElementById("studioTags");
const studioDescriptionInput = document.getElementById("studioDescription");
const studioExcerptInput = document.getElementById("studioExcerpt");
const runStudioReviewBtn = document.getElementById("runStudioReviewBtn");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const clearStudioBtn = document.getElementById("clearStudioBtn");
const importUploadDraftBtn = document.getElementById("importUploadDraftBtn");
const chooseReviewFileBtn = document.getElementById("chooseReviewFileBtn");
const reviewFileInput = document.getElementById("reviewFileInput");
const reviewFileMeta = document.getElementById("reviewFileMeta");
const reviewToolkit = document.getElementById("reviewToolkit");
const toolkitStatus = document.getElementById("toolkitStatus");
const applyToUploadDraftBtn = document.getElementById("applyToUploadDraftBtn");
const copyReviewTagsBtn = document.getElementById("copyReviewTagsBtn");
const copyReviewDescriptionBtn = document.getElementById("copyReviewDescriptionBtn");
const reviewHistory = document.getElementById("reviewHistory");
const historyList = document.getElementById("historyList");

let reviewData = null;
let selectedReviewFile = null;
let scoreAnimationTimer = null;

document.addEventListener("DOMContentLoaded", initializeReviewPage);

function initializeReviewPage() {
  configureViewerShell();

  if (bookId) {
    enterReportMode();
    return;
  }

  enterStudioMode();
}

function enterReportMode() {
  if (!token) {
    redirectToLogin();
    return;
  }

  setModeCopy({
    kicker: "Book AI report",
    title: "Review a live marketplace upload",
    description: "This mode shows the saved AI moderation report for a real product in your marketplace pipeline.",
  });

  reviewStudio?.classList.add("hidden");
  reviewToolkit?.classList.add("hidden");
  reviewHistory?.classList.add("hidden");
  renderReportPlaceholder("Loading the saved AI report for this product...");
  loadReviewReport();
}

function enterStudioMode() {
  setModeCopy({
    kicker: "Free AI review studio",
    title: "Analyze a draft before you publish",
    description: "Paste your listing details, import your creator draft, or attach a PDF/text file to get a free launch-readiness review.",
  });

  adminActions?.classList.add("hidden");
  reviewStudio?.classList.remove("hidden");
  bindStudioActions();
  renderProvider("local", "local-heuristic", "Free local review mode");
  renderStudioPlaceholder();
  renderHistory();
}

function bindStudioActions() {
  loadSampleBtn?.addEventListener("click", loadSampleReview);
  clearStudioBtn?.addEventListener("click", clearStudioForm);
  runStudioReviewBtn?.addEventListener("click", runStudioReview);
  importUploadDraftBtn?.addEventListener("click", importUploadDraft);
  chooseReviewFileBtn?.addEventListener("click", () => reviewFileInput?.click());
  reviewFileInput?.addEventListener("change", handleReviewFileChange);
  applyToUploadDraftBtn?.addEventListener("click", applyReviewToUploadDraft);
  copyReviewTagsBtn?.addEventListener("click", copyReviewTags);
  copyReviewDescriptionBtn?.addEventListener("click", copyReviewDescription);
  historyList?.addEventListener("click", handleHistoryClick);
}

function configureViewerShell() {
  const user = readCurrentUser();
  const role = user?.role || "";
  const isAdmin = role === "admin";

  if (bookId) {
    viewerBadge.textContent = isAdmin ? "ADMIN" : role ? "CREATOR VIEW" : "REVIEW";
    backLink.href = isAdmin ? "../admin/admin.html" : "../dashboard/content.html";
    backLink.textContent = isAdmin ? "<- Back to Admin Dashboard" : "<- Back to Content Studio";

    if (role && !isAdmin) {
      adminActions?.classList.add("hidden");
    }
    return;
  }

  viewerBadge.textContent = "FREE AI MODE";
  backLink.href = isAdmin ? "../admin/admin.html" : role ? "../dashboard/content.html" : "../index.html";
  backLink.textContent = isAdmin
    ? "<- Back to Admin Dashboard"
    : role
      ? "<- Back to Creator Dashboard"
      : "<- Back to Marketplace";
}

function setModeCopy({ kicker, title, description }) {
  if (modeKicker) modeKicker.textContent = kicker;
  if (modeTitle) modeTitle.textContent = title;
  if (modeDescription) modeDescription.textContent = description;
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

async function runStudioReview() {
  const payload = collectStudioPayload();
  const validationError = validateStudioPayload(payload);
  if (validationError) {
    setStudioStatus(validationError, "error");
    showToast(validationError);
    return;
  }

  const hasFile = Boolean(selectedReviewFile);
  setStudioLoading(true, hasFile
    ? `Running free AI review on ${selectedReviewFile.name}...`
    : "Running free AI review on your draft...");

  try {
    let response;
    if (hasFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });
      formData.append("contentFile", selectedReviewFile);

      response = await fetch(`${API_BASE}/api/ai/review-preview-file`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    } else {
      response = await fetch(`${API_BASE}/api/ai/review-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to run free AI review");
    }

    reviewData = data;
    renderReport(data);
    saveReviewHistory(data);
    renderHistory();
    setStudioStatus("Free AI review completed. You can copy the output or push it straight into your upload draft.", "success");
  } catch (error) {
    console.error(error);
    setStudioStatus(error.message || "Unable to run the free AI review right now.", "error");
    showToast(error.message || "Unable to run the free AI review");
  } finally {
    setStudioLoading(false);
  }
}

function collectStudioPayload() {
  return {
    title: studioTitleInput?.value.trim() || "",
    type: studioTypeInput?.value || "Book",
    category: studioCategoryInput?.value.trim() || "",
    price: Number(studioPriceInput?.value || 0),
    tags: studioTagsInput?.value.trim() || "",
    description: studioDescriptionInput?.value.trim() || "",
    excerpt: studioExcerptInput?.value.trim() || "",
  };
}

function validateStudioPayload(payload) {
  if (!payload.title || payload.title.length < 3) {
    return "Add a title with at least 3 characters.";
  }

  const sourceLength = `${payload.description}\n${payload.excerpt}`.trim().length;
  if (sourceLength < 80 && !selectedReviewFile) {
    return "Add at least 80 characters of description or sample content, or attach a PDF/text file.";
  }

  return null;
}

function loadSampleReview() {
  studioTitleInput.value = "The Beginner's Guide to Spanish Vocabulary";
  studioTypeInput.value = "Book";
  studioCategoryInput.value = "Language Learning";
  studioPriceInput.value = "199";
  studioTagsInput.value = "spanish, beginner, vocabulary, workbook";
  studioDescriptionInput.value = "A structured beginner ebook that helps students build daily Spanish vocabulary with pronunciation notes, memory cues, and practice drills.";
  studioExcerptInput.value = [
    "Unit 1 focuses on greetings, introductions, and classroom vocabulary.",
    "Each section includes a quick explanation, 15 to 20 useful words, example sentences, and a short recap drill.",
    "The book is designed for Indian college students who want practical Spanish for study, travel, and freelance opportunities."
  ].join(" ");
  setStudioStatus("Sample draft loaded. Run the free AI review to see the report.", "loading");
}

function importUploadDraft() {
  try {
    const raw = localStorage.getItem(UPLOAD_DRAFT_KEY);
    if (!raw) {
      setStudioStatus("No saved upload draft was found yet. Save a creator draft first, then import it here.", "error");
      return;
    }

    const draft = JSON.parse(raw);
    studioTitleInput.value = draft.title || "";
    studioTypeInput.value = draft.type || "Book";
    studioCategoryInput.value = draft.category || "";
    studioPriceInput.value = draft.price || "";
    studioTagsInput.value = Array.isArray(draft.tags) ? draft.tags.join(", ") : "";
    studioDescriptionInput.value = draft.description || "";
    studioExcerptInput.value = [
      draft.deliveryInstructions || "",
      draft.promptText || "",
      draft.deliveryIncludes || "",
    ].filter(Boolean).join("\n\n");

    setStudioStatus("Upload draft imported. Add a file if you want, then run the free AI review.", "success");
    showToast("Upload draft imported");
  } catch (error) {
    console.error(error);
    setStudioStatus("The saved upload draft could not be read. Save it again from the upload studio.", "error");
  }
}

function handleReviewFileChange() {
  const file = reviewFileInput?.files?.[0] || null;
  selectedReviewFile = file;

  if (!file) {
    reviewFileMeta.textContent = "Optional: attach a PDF, TXT, MD, JSON, or CSV file for free local AI review.";
    return;
  }

  reviewFileMeta.textContent = `Attached file: ${file.name} (${formatBytes(file.size)})`;
  setStudioStatus(`File attached: ${file.name}. You can review it directly or combine it with your pasted description.`, "loading");
}

function clearStudioForm() {
  if (studioTitleInput) studioTitleInput.value = "";
  if (studioTypeInput) studioTypeInput.value = "Book";
  if (studioCategoryInput) studioCategoryInput.value = "";
  if (studioPriceInput) studioPriceInput.value = "";
  if (studioTagsInput) studioTagsInput.value = "";
  if (studioDescriptionInput) studioDescriptionInput.value = "";
  if (studioExcerptInput) studioExcerptInput.value = "";
  if (reviewFileInput) reviewFileInput.value = "";
  selectedReviewFile = null;
  reviewFileMeta.textContent = "Optional: attach a PDF, TXT, MD, JSON, or CSV file for free local AI review.";

  reviewData = null;
  renderStudioPlaceholder();
  setStudioStatus("Ready for analysis.", "loading");
}

function setStudioLoading(loading, message = "") {
  if (runStudioReviewBtn) {
    runStudioReviewBtn.disabled = loading;
    runStudioReviewBtn.textContent = loading ? "Running..." : "Run Free AI Review";
  }

  if (chooseReviewFileBtn) {
    chooseReviewFileBtn.disabled = loading;
  }
  if (importUploadDraftBtn) {
    importUploadDraftBtn.disabled = loading;
  }

  if (message) {
    setStudioStatus(message, loading ? "loading" : "success");
  }
}

function setStudioStatus(message, type = "loading") {
  if (!studioStatus) {
    return;
  }

  studioStatus.textContent = message;
  studioStatus.className = `studio-status ${type}`;
}

function renderStudioPlaceholder() {
  titleEl.textContent = "Run a free AI draft review";
  categoryEl.textContent = "Draft analysis";
  typeEl.textContent = "Standalone review";
  creatorEl.textContent = readCurrentUser()?.name || "Not linked to a saved product";
  priceMeta.innerHTML = "Price: <strong>Not set</strong>";

  overallScoreEl.textContent = "--";
  updateScoreCircle(0);

  scoreStatusEl.textContent = "Awaiting content";
  scoreStatusEl.className = "score-status warn";

  renderMetrics([
    { label: "Originality", value: "--", className: "warn" },
    { label: "Readability", value: "--", className: "warn" },
    { label: "Quality", value: "--", className: "warn" },
    { label: "Similarity Risk", value: "--", className: "warn" },
    { label: "Review State", value: "Ready", className: "good" },
    { label: "Detected Category", value: "Pending", className: "warn" }
  ]);

  renderInsights([
    "Paste your title, product description, and sample content to generate a real report.",
    "Import your saved creator upload draft to analyze the listing before publishing.",
    "Attach a PDF, TXT, MD, JSON, or CSV file if you want the free local AI engine to read from a real file."
  ]);

  recommendationBox.className = "ai-recommendation review";
  recommendationText.textContent = "Add content and run the free AI review to get launch-readiness guidance.";
  reviewToolkit?.classList.add("hidden");
}

function renderReport(data) {
  const book = data.book || {};
  const report = data.report || {};
  const qualitySignals = report.qualitySignals || {};
  const originalityScore = Math.max(0, 100 - Number(book.plagiarismScore || 0));
  const readabilityScore = Number(qualitySignals.readabilityScore || 0);
  const recommendation = buildRecommendation(book, report);

  titleEl.textContent = book.title || "Untitled product";
  categoryEl.textContent = book.aiCategory || book.category || report.suggestedCategory || "Digital Product";
  typeEl.textContent = book.type || "Digital Product";
  creatorEl.textContent = book.authorName || readCurrentUser()?.name || "Marketplace creator";
  priceMeta.innerHTML = `Price: <strong>${escapeHTML(formatPrice(book.price || 0))}</strong>`;

  scoreStatusEl.textContent = recommendation.statusText;
  scoreStatusEl.className = `score-status ${recommendation.className}`;
  renderProvider(report.aiProvider, report.aiModel, data.mode === "standalone" ? "Free local review mode" : "");

  renderMetrics([
    { label: "Originality", value: `${originalityScore}%`, className: originalityScore >= 75 ? "good" : originalityScore >= 50 ? "warn" : "bad" },
    { label: "Readability", value: `${readabilityScore}%`, className: readabilityScore >= 65 ? "good" : readabilityScore >= 45 ? "warn" : "bad" },
    { label: "Quality", value: `${Number(book.qualityScore || 0)}%`, className: Number(book.qualityScore || 0) >= 70 ? "good" : Number(book.qualityScore || 0) >= 45 ? "warn" : "bad" },
    { label: "Similarity Risk", value: `${Number(book.plagiarismScore || 0)}%`, className: Number(book.plagiarismScore || 0) <= 25 ? "safe" : Number(book.plagiarismScore || 0) <= 55 ? "warn" : "bad" },
    {
      label: data.mode === "standalone" ? "Review State" : "Queue State",
      value: String(report.processingState || book.aiProcessingState || "idle").replace(/_/g, " "),
      className: report.processingState === "failed" ? "bad" : report.processingState === "completed" ? "good" : "warn"
    },
    { label: "Detected Category", value: book.aiCategory || report.suggestedCategory || book.category || "Digital Product", className: "good" }
  ]);

  renderInsights(buildInsights(book, report, data.mode === "standalone"));

  recommendationBox.className = `ai-recommendation ${recommendation.className}`;
  recommendationText.textContent = recommendation.message;
  animateScore(Number(book.aiScore || 0));

  if (data.mode === "standalone") {
    renderToolkit();
  }
}

function renderToolkit() {
  reviewToolkit?.classList.remove("hidden");
  if (!toolkitStatus) {
    return;
  }

  const tags = Array.isArray(reviewData?.report?.generatedTags) ? reviewData.report.generatedTags.length : 0;
  const descriptionReady = Boolean(reviewData?.report?.generatedDescription || reviewData?.book?.description);
  toolkitStatus.textContent = `Ready to use: ${tags} AI tag suggestion${tags === 1 ? "" : "s"} and ${descriptionReady ? "a reusable description" : "your current draft description"}.`;
}

function applyReviewToUploadDraft() {
  if (!reviewData?.book || !reviewData?.report) {
    showToast("Run a free AI review first");
    return;
  }

  try {
    const existing = JSON.parse(localStorage.getItem(UPLOAD_DRAFT_KEY) || "{}");
    const nextDraft = {
      ...existing,
      title: reviewData.book.title || existing.title || "",
      type: reviewData.book.type || existing.type || "Book",
      category: reviewData.book.aiCategory || reviewData.book.category || existing.category || "",
      language: reviewData.book.language || existing.language || "English",
      price: String(reviewData.book.price ?? existing.price ?? ""),
      originalPrice: String(reviewData.book.price ?? existing.originalPrice ?? existing.price ?? ""),
      description: reviewData.report.generatedDescription || reviewData.book.description || existing.description || "",
      tags: Array.isArray(reviewData.report.generatedTags) && reviewData.report.generatedTags.length
        ? reviewData.report.generatedTags
        : Array.isArray(reviewData.book.tags)
          ? reviewData.book.tags
          : existing.tags || [],
      deliveryInstructions: reviewData.report.improvementSuggestions?.join("\n") || existing.deliveryInstructions || "",
    };

    localStorage.setItem(UPLOAD_DRAFT_KEY, JSON.stringify(nextDraft));
    toolkitStatus.textContent = "Applied to your creator upload draft. Open the upload page to continue publishing.";
    showToast("Applied to upload draft");
  } catch (error) {
    console.error(error);
    showToast("Unable to update the upload draft right now");
  }
}

async function copyReviewTags() {
  const tags = Array.isArray(reviewData?.report?.generatedTags)
    ? reviewData.report.generatedTags.join(", ")
    : "";

  if (!tags) {
    showToast("No AI tags available yet");
    return;
  }

  await copyText(tags, "AI tags copied");
}

async function copyReviewDescription() {
  const text = reviewData?.report?.generatedDescription || reviewData?.book?.description || "";
  if (!text) {
    showToast("No AI description available yet");
    return;
  }

  await copyText(text, "AI description copied");
}

function saveReviewHistory(data) {
  if (data?.mode !== "standalone") {
    return;
  }

  const currentHistory = readReviewHistory();
  const entry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: data.book?.title || "Untitled draft",
    type: data.book?.type || "Digital Product",
    category: data.book?.aiCategory || data.book?.category || "Uncategorized",
    score: Number(data.book?.aiScore || 0),
    status: String(data.book?.aiStatus || "pending"),
    recommendation: recommendationText.textContent || "",
    report: data,
  };

  const nextHistory = [entry, ...currentHistory].slice(0, MAX_REVIEW_HISTORY);
  localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(nextHistory));
}

function renderHistory() {
  const history = readReviewHistory();
  if (!reviewHistory || !historyList) {
    return;
  }

  if (!history.length) {
    reviewHistory.classList.add("hidden");
    historyList.innerHTML = "";
    return;
  }

  reviewHistory.classList.remove("hidden");
  historyList.innerHTML = history.map((entry, index) => `
    <article class="history-card">
      <div>
        <h4>${escapeHTML(entry.title)}</h4>
        <p>${escapeHTML(entry.category)} • ${escapeHTML(entry.type)}</p>
        <div class="history-meta">
          <span class="history-chip">${escapeHTML(String(entry.score || 0))}% score</span>
          <span class="history-chip">${escapeHTML(String(entry.status || "pending").replace(/_/g, " "))}</span>
          <span class="history-chip">${escapeHTML(formatHistoryTime(entry.createdAt))}</span>
        </div>
      </div>
      <div class="toolkit-actions">
        <button type="button" class="btn ghost" data-history-restore="${index}">Reuse</button>
      </div>
    </article>
  `).join("");
}

function handleHistoryClick(event) {
  const restoreIndex = event.target.closest("[data-history-restore]")?.getAttribute("data-history-restore");
  if (restoreIndex == null) {
    return;
  }

  const history = readReviewHistory();
  const entry = history[Number(restoreIndex)];
  if (!entry?.report) {
    return;
  }

  reviewData = entry.report;
  renderReport(entry.report);
  setStudioStatus("Loaded a recent free review. You can now apply it to your upload draft or review it again.", "success");
}

function readReviewHistory() {
  try {
    const raw = localStorage.getItem(REVIEW_HISTORY_KEY);
    return Array.isArray(JSON.parse(raw || "[]")) ? JSON.parse(raw || "[]") : [];
  } catch {
    return [];
  }
}

function renderProvider(provider, model, context = "") {
  const normalized = String(provider || "local").toLowerCase();
  const descriptor = describeProvider(normalized, model, context);

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

function buildInsights(book, report, isStudioMode = false) {
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
  } else if (isStudioMode && report.extractedTextPreview) {
    insights.push("Free studio mode analyzed the text you pasted on this page.");
  }

  if (Array.isArray(report.plagiarismMatches) && report.plagiarismMatches.length) {
    const top = report.plagiarismMatches[0];
    insights.push(`Closest similarity match: ${top.title} by ${top.authorName} (${Math.round(Number(top.score || 0) * 100)}% similarity).`);
  } else {
    insights.push("No significant similarity matches were detected against processed marketplace books.");
  }

  if (report.fileName) {
    insights.push(`Source file reviewed: ${report.fileName}`);
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
    li.textContent = insight;
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
    message: "Manual review or more source content is recommended before publishing."
  };
}

function animateScore(target) {
  if (scoreAnimationTimer) {
    clearInterval(scoreAnimationTimer);
  }

  let current = 0;
  const safeTarget = Math.max(0, Math.min(100, Number(target || 0)));
  overallScoreEl.textContent = "0%";
  updateScoreCircle(0);

  scoreAnimationTimer = setInterval(() => {
    current += 1;
    overallScoreEl.textContent = `${current}%`;
    updateScoreCircle(current);

    if (current >= safeTarget) {
      clearInterval(scoreAnimationTimer);
      scoreAnimationTimer = null;
      overallScoreEl.textContent = `${safeTarget}%`;
      updateScoreCircle(safeTarget);
    }
  }, 15);
}

function updateScoreCircle(value) {
  if (!scoreCircle) {
    return;
  }

  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  scoreCircle.style.background = `conic-gradient(#8b5cf6 0%, #8b5cf6 ${safeValue}%, rgba(255,255,255,.08) ${safeValue}%, rgba(255,255,255,.08) 100%)`;
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

function renderReportPlaceholder(message) {
  titleEl.textContent = "Loading AI report...";
  categoryEl.textContent = "Preparing";
  typeEl.textContent = "Preparing";
  creatorEl.textContent = "Checking access";
  priceMeta.innerHTML = "Price: <strong>Loading</strong>";
  overallScoreEl.textContent = "--";
  updateScoreCircle(0);
  scoreStatusEl.textContent = "Loading report";
  scoreStatusEl.className = "score-status warn";
  recommendationBox.className = "ai-recommendation review";
  recommendationText.textContent = message;
  renderProvider("loading", "Checking active model...", "");
  renderMetrics([
    { label: "Originality", value: "--", className: "warn" },
    { label: "Readability", value: "--", className: "warn" },
    { label: "Quality", value: "--", className: "warn" },
    { label: "Similarity Risk", value: "--", className: "warn" },
    { label: "Queue State", value: "Loading", className: "warn" },
    { label: "Detected Category", value: "Loading", className: "warn" }
  ]);
  renderInsights([message]);
}

function renderErrorState(message) {
  titleEl.textContent = "AI report unavailable";
  categoryEl.textContent = "Unavailable";
  typeEl.textContent = "Unavailable";
  creatorEl.textContent = "Unavailable";
  priceMeta.innerHTML = "Price: <strong>Unavailable</strong>";
  scoreStatusEl.textContent = "Could not load report";
  scoreStatusEl.className = "score-status bad";
  recommendationBox.className = "ai-recommendation reject";
  recommendationText.textContent = message;
  overallScoreEl.textContent = "--";
  updateScoreCircle(0);
  metricsGrid.innerHTML = "";
  renderProvider("loading", "Unavailable", "");
  renderInsights([message]);
}

function describeProvider(provider, model, context = "") {
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
    label: "Free Local AI Review",
    meta: context || (model && model !== "local-heuristic"
      ? `Mode: ${model}`
      : "Runs on the free local marketplace review engine")
  };
}

function formatPrice(value) {
  return Number(value || 0) > 0
    ? `Rs. ${Number(value || 0).toLocaleString("en-IN")}`
    : "Free";
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatHistoryTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast("Copy failed on this browser");
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
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

window.approveContent = approveContent;
window.requestChanges = requestChanges;
window.rejectContent = rejectContent;
window.goBack = goBack;
