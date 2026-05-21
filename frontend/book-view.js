const API_BASE = window.API_BASE || "";
const bookViewState = {
  bookId: "",
  book: null,
  access: {},
  preferences: {
    interfaceLanguage: localStorage.getItem("marketplace-interface-language") || "English",
    marketplaceLanguage: localStorage.getItem("marketplace-market-language") || "All",
  },
};

const COPY = {
  English: {
    documentTitle: "Product | E-Book Market",
    recently: "Recently",
    requestFailed: "Request failed",
    recommendationTitle: "Recommended for you",
    reviewsTitle: "Learner reviews",
    reviewRatingLabel: "Rating",
    reviewHeadlineLabel: "Headline",
    reviewCommentLabel: "Your review",
    reviewTitlePlaceholder: "What stood out most?",
    reviewCommentPlaceholder: "Share what you learned, how useful the product was, and who should buy it.",
    reviewPublish: "Publish Review",
    reviewUpdate: "Update Review",
    reviewSelectExcellent: "5 - Excellent",
    reviewSelectStrong: "4 - Strong value",
    reviewSelectGood: "3 - Good enough",
    reviewSelectNeedsWork: "2 - Needs work",
    reviewSelectPoor: "1 - Poor fit",
    previewUnavailable: "Preview unavailable",
    bookCover: "Book cover",
    previewUnavailableNow: "The preview is not available right now.",
    bookPreview: "Book preview",
    showingCoverInstead: "Showing the book cover instead.",
    instantPreview: "Instant preview",
    previewCouldNotLoad: "Preview could not be loaded, so the book thumbnail is shown instead.",
    ratingsPlaceholder: "Ratings and written reviews will appear here once the live product loads.",
    reviewSignalWarming: "Review signal warming up",
    reviewGateLocked: "Sign in after purchase to unlock verified reviews for paid products.",
    reviewListPlaceholder: "No reviews yet. Be the first learner to share feedback once you unlock a live product.",
    reviewUpdateAnytime: "You can update your review anytime.",
    reviewVerifiedPurchase: "Your review will be marked as a verified purchase.",
    reviewFreeSignedIn: "Signed-in readers can review free products too.",
    reviewAverageSummary: "{average} average from {count} learner reviews.",
    reviewTrustSummary: "No reviews yet. The first buyer review will establish trust for this product.",
    reviewScoreEmpty: "No reviews yet",
    reviewGateVerified: "Verified buyers can rate the product and update their feedback anytime.",
    reviewGateFree: "You can review this free product after signing in.",
    reviewGateFallback: "Sign in after purchase to unlock reviews.",
    reviewEmpty: "No learner reviews yet. Be the first to share what this product helped you achieve.",
    marketplaceReader: "Marketplace reader",
    reader: "Reader",
    verifiedPurchaseChip: "Verified purchase",
    noWrittenFeedback: "No written feedback provided.",
    reportReview: "Report review",
    productUnavailable: "Product unavailable",
    marketplaceProduct: "Marketplace product",
    unavailable: "Unavailable",
    bookNotFound: "Book not found",
    reviewsUnavailable: "Reviews unavailable",
    reviewsUnavailableBecauseLoad: "Reviews are unavailable because this product could not be loaded.",
    demoMeta: "Official demo - Free preview",
    demoDescription: "This demo title stays available as the storefront preview while the live marketplace loads books from the backend.",
    demoReviewSummary: "Review features are available on live marketplace products.",
    demoMode: "Demo mode",
    demoReviewGate: "Open a live catalog product to see learner reviews and publish your own feedback.",
    demoReviewList: "This demo title does not use the live reviews API.",
    officialPreviewLoaded: "Official preview loaded.",
    download: "Download",
    explore: "Explore",
    addingToCart: "Adding this book to your cart...",
    addedToCart: "Added to cart. Redirecting you to checkout options...",
    unableToAddToCart: "Unable to add to cart",
    deliverySuffix: "Delivery",
    digitalDelivery: "Digital delivery",
    buyersUnlockLink: "Buyers unlock the delivery link after purchase approval.",
    free: "FREE",
    untitled: "Untitled",
    unknown: "Unknown",
    by: "by",
    unlockedContent: "Unlocked content",
    previewExcerpt: "Preview excerpt",
    instantAccessUnlocked: "Instant-access delivery is unlocked for this product.",
    buyToUnlockFullContent: "This product includes instant text delivery. Buy to unlock the full content.",
    paymentRequired: "Payment required",
    signInToPurchase: "Sign in to purchase",
    paidTitleMessage: "Use Buy Now or Add to Cart to unlock this paid title. The full download opens after payment approval.",
    paidBookSignInMessage: "This is a paid book. Sign in first, then continue to checkout or add it to your cart.",
    lockedUntilPurchase: "Paid books stay locked until purchase. Showing the cover thumbnail instead of a broken preview.",
    previewFallbackDownload: "Your download is still available below. The inline preview is not available right now.",
    previewFallbackCover: "The inline preview is not available right now, so the book cover is shown instead.",
    previewReadyDownload: "Preview ready. You can also download the full book.",
    previewReady: "Preview ready.",
    missingPreviewDownload: "Download is available below even though the inline preview is missing.",
    previewUnavailableCover: "The inline preview is not available right now. Showing the cover thumbnail instead.",
    previewUnavailableNote: "Preview unavailable. Showing the cover thumbnail instead.",
    openProduct: "Open Product",
    unlockText: "Unlock Text",
    signInToBuy: "Sign In to Buy",
    buyNow: "Buy Now",
    startingDirectCheckout: "Preparing secure checkout...",
    directCheckoutUnavailable: "Secure checkout is not available right now.",
    openFreeProduct: "Open Free Product",
    unlockFreeContent: "Unlock Free Content",
    downloadFree: "Download Free",
    signInToDownload: "Sign In to Download",
    addToCart: "Add to Cart",
    signInToAdd: "Sign In to Add to Cart",
    dashboard: "Dashboard",
    signIn: "Sign In",
    publishingReview: "Publishing your review...",
    reviewPublished: "Review published successfully.",
    reviewPublishFailed: "Unable to publish review right now.",
    reportReasonPrompt: "Report reason: spam, abuse, fake, offensive, or other",
    reportReasonDefault: "fake",
    reportReasonInvalid: "Use one of these reasons: spam, abuse, fake, offensive, or other.",
    reportDetailsPrompt: "Optional note for the moderation team",
    reportSubmitted: "Review report submitted. The moderation team will review it.",
    reportFailed: "Unable to report this review right now.",
    reviewsUnavailableNow: "Reviews are unavailable right now.",
    tryAgainSoon: "Try again in a moment.",
    noRelatedBooks: "No related books yet",
    noRelatedMessage: "Recommendations will appear here as more approved books are processed by the marketplace AI layer.",
    browseMarketplace: "Browse marketplace",
    viewRecommendation: "View recommendation",
    errorLoadingBook: "Error loading book",
  },
  Hindi: {
    documentTitle: "Product | E-Book Market",
    recently: "Abhi haal hi me",
    requestFailed: "Request failed",
    recommendationTitle: "Aapke liye recommendations",
    reviewsTitle: "Learner reviews",
    reviewRatingLabel: "Rating",
    reviewHeadlineLabel: "Headline",
    reviewCommentLabel: "Aapki review",
    reviewTitlePlaceholder: "Sabse zyada kya standout kiya?",
    reviewCommentPlaceholder: "Kya seekha, product kitna useful tha, aur kis buyer ko yeh lena chahiye, yeh share kijiye.",
    reviewPublish: "Review publish karein",
    reviewUpdate: "Review update karein",
    reviewSelectExcellent: "5 - Excellent",
    reviewSelectStrong: "4 - Strong value",
    reviewSelectGood: "3 - Good enough",
    reviewSelectNeedsWork: "2 - Needs work",
    reviewSelectPoor: "1 - Poor fit",
    previewUnavailable: "Preview unavailable",
    bookCover: "Book cover",
    previewUnavailableNow: "Preview abhi available nahin hai.",
    bookPreview: "Book preview",
    showingCoverInstead: "Filhaal book cover dikhaya ja raha hai.",
    instantPreview: "Instant preview",
    previewCouldNotLoad: "Preview load nahin hua, isliye book thumbnail dikhaya ja raha hai.",
    ratingsPlaceholder: "Live product load hone ke baad ratings aur written reviews yahan dikhengi.",
    reviewSignalWarming: "Review signal warming up",
    reviewGateLocked: "Paid products ke verified reviews dekhne ke liye purchase ke baad sign in kijiye.",
    reviewListPlaceholder: "Abhi reviews nahin hain. Product unlock karne ke baad pehli learner feedback aap de sakte hain.",
    reviewUpdateAnytime: "Aap apni review kabhi bhi update kar sakte hain.",
    reviewVerifiedPurchase: "Aapki review verified purchase ke roop me mark hogi.",
    reviewFreeSignedIn: "Signed-in readers free products ko bhi review kar sakte hain.",
    reviewAverageSummary: "{average} average from {count} learner reviews.",
    reviewTrustSummary: "Abhi reviews nahin hain. Pehli buyer review is product ke liye trust banayegi.",
    reviewScoreEmpty: "Abhi reviews nahin hain",
    reviewGateVerified: "Verified buyers product ko rate kar sakte hain aur apni feedback kabhi bhi update kar sakte hain.",
    reviewGateFree: "Sign in karne ke baad aap is free product ko review kar sakte hain.",
    reviewGateFallback: "Reviews unlock karne ke liye purchase ke baad sign in kijiye.",
    reviewEmpty: "Abhi learner reviews nahin hain. Sabse pehle batayein ki is product ne aapko kya achieve karne me help ki.",
    marketplaceReader: "Marketplace reader",
    reader: "Reader",
    verifiedPurchaseChip: "Verified purchase",
    noWrittenFeedback: "Koi written feedback nahin diya gaya.",
    reportReview: "Review report karein",
    productUnavailable: "Product unavailable",
    marketplaceProduct: "Marketplace product",
    unavailable: "Unavailable",
    bookNotFound: "Book not found",
    reviewsUnavailable: "Reviews unavailable",
    reviewsUnavailableBecauseLoad: "Product load na hone ki wajah se reviews unavailable hain.",
    demoMeta: "Official demo - Free preview",
    demoDescription: "Backend se live books load hote waqt yeh demo title storefront preview ke roop me available rehta hai.",
    demoReviewSummary: "Review features live marketplace products par available hain.",
    demoMode: "Demo mode",
    demoReviewGate: "Learner reviews dekhne aur apni feedback publish karne ke liye koi live catalog product kholiye.",
    demoReviewList: "Yeh demo title live reviews API use nahin karta.",
    officialPreviewLoaded: "Official preview load ho gaya.",
    download: "Download",
    explore: "Explore",
    addingToCart: "Yeh book aapke cart me add ho rahi hai...",
    addedToCart: "Cart me add ho gayi. Checkout options par redirect kiya ja raha hai...",
    unableToAddToCart: "Cart me add nahin ho paaya",
    deliverySuffix: "Delivery",
    digitalDelivery: "Digital delivery",
    buyersUnlockLink: "Buyers purchase approval ke baad delivery link unlock karte hain.",
    free: "FREE",
    untitled: "Untitled",
    unknown: "Unknown",
    by: "by",
    unlockedContent: "Unlocked content",
    previewExcerpt: "Preview excerpt",
    instantAccessUnlocked: "Is product ke liye instant-access delivery unlock ho chuki hai.",
    buyToUnlockFullContent: "Is product me instant text delivery hai. Full content unlock karne ke liye buy kijiye.",
    paymentRequired: "Payment required",
    signInToPurchase: "Purchase ke liye sign in kijiye",
    paidTitleMessage: "Is paid title ko unlock karne ke liye Buy Now ya Add to Cart use kijiye. Full download payment approval ke baad khulega.",
    paidBookSignInMessage: "Yeh paid book hai. Pehle sign in kijiye, phir checkout continue kijiye ya cart me add kijiye.",
    lockedUntilPurchase: "Paid books purchase tak locked rehti hain. Broken preview ki jagah cover thumbnail dikhaya ja raha hai.",
    previewFallbackDownload: "Aapka download neeche available hai. Inline preview abhi available nahin hai.",
    previewFallbackCover: "Inline preview abhi available nahin hai, isliye book cover dikhaya ja raha hai.",
    previewReadyDownload: "Preview ready hai. Aap full book bhi download kar sakte hain.",
    previewReady: "Preview ready hai.",
    missingPreviewDownload: "Inline preview missing hone par bhi download neeche available hai.",
    previewUnavailableCover: "Inline preview abhi available nahin hai. Book cover dikhaya ja raha hai.",
    previewUnavailableNote: "Preview unavailable hai. Book cover dikhaya ja raha hai.",
    openProduct: "Product kholiye",
    unlockText: "Text unlock kijiye",
    signInToBuy: "Buy karne ke liye sign in kijiye",
    buyNow: "Buy now",
    startingDirectCheckout: "Secure checkout prepare ho raha hai...",
    directCheckoutUnavailable: "Secure checkout abhi available nahin hai.",
    openFreeProduct: "Free product kholiye",
    unlockFreeContent: "Free content unlock kijiye",
    downloadFree: "Free download",
    signInToDownload: "Download ke liye sign in kijiye",
    addToCart: "Cart me add kijiye",
    signInToAdd: "Cart me add karne ke liye sign in kijiye",
    dashboard: "Dashboard",
    signIn: "Sign in",
    publishingReview: "Aapki review publish ho rahi hai...",
    reviewPublished: "Review safalta se publish ho gayi.",
    reviewPublishFailed: "Review abhi publish nahin ho pa rahi hai.",
    reportReasonPrompt: "Report reason: spam, abuse, fake, offensive, ya other",
    reportReasonDefault: "fake",
    reportReasonInvalid: "In me se ek reason use kijiye: spam, abuse, fake, offensive, ya other.",
    reportDetailsPrompt: "Moderation team ke liye optional note",
    reportSubmitted: "Review report submit ho gaya. Moderation team ise review karegi.",
    reportFailed: "Is review ko abhi report nahin kiya ja sakta.",
    reviewsUnavailableNow: "Reviews abhi unavailable hain.",
    tryAgainSoon: "Thodi der me dobara koshish kijiye.",
    noRelatedBooks: "Abhi related books nahin hain",
    noRelatedMessage: "Jab aur approved books marketplace AI layer se process hongi tab recommendations yahan dikhenge.",
    browseMarketplace: "Marketplace browse karein",
    viewRecommendation: "Recommendation dekhein",
    errorLoadingBook: "Book load nahin ho paayi",
  },
};

document.addEventListener("DOMContentLoaded", initBookView);

async function initBookView() {
  setupPreviewGuard();
  setupReviewForm();
  await loadViewerPreferences();
  applyInterfaceLanguage(bookViewState.preferences.interfaceLanguage);
  loadBookView();
}

function getToken() {
  return localStorage.getItem("token");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

async function loadViewerPreferences() {
  const token = getToken();
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile/preferences`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load preferences");
    }

    bookViewState.preferences.interfaceLanguage = data.preferences?.interfaceLanguage || bookViewState.preferences.interfaceLanguage;
    bookViewState.preferences.marketplaceLanguage = data.preferences?.marketplaceLanguage || bookViewState.preferences.marketplaceLanguage;
    persistViewerPreferences();
  } catch (error) {
    console.error("Book view preference load failed:", error);
  }
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function redirectForRole(user) {
  if (user?.role === "admin") {
    window.location.href = "admin/admin.html";
    return;
  }

  window.location.href = "dashboard/dashboard.html";
}

function getStoredBuyerMarket() {
  return {
    country: String(localStorage.getItem("marketplace-market-country") || "IN").trim().toUpperCase(),
    currency: String(localStorage.getItem("marketplace-market-currency") || "INR").trim().toUpperCase(),
  };
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatReviewDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return t("recently");
  }

  return date.toLocaleDateString(
    bookViewState.preferences.interfaceLanguage === "Hindi" ? "hi-IN" : "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

async function apiFetchJson(path, options = {}) {
  const token = getToken();
  const mergedHeaders = {
    ...(options.headers || {}),
  };

  if (token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || t("requestFailed"));
  }
  return json;
}

function persistViewerPreferences() {
  localStorage.setItem("marketplace-interface-language", bookViewState.preferences.interfaceLanguage || "English");
  localStorage.setItem("marketplace-market-language", bookViewState.preferences.marketplaceLanguage || "All");
}

function applyInterfaceLanguage(language) {
  bookViewState.preferences.interfaceLanguage = language === "Hindi" ? "Hindi" : "English";
  persistViewerPreferences();
  document.title = t("documentTitle");

  setText("recommendationTitle", t("recommendationTitle"));
  setText("reviewsTitle", t("reviewsTitle"));
  setText("reviewRatingLabel", t("reviewRatingLabel"));
  setText("reviewHeadlineLabel", t("reviewHeadlineLabel"));
  setText("reviewCommentLabel", t("reviewCommentLabel"));

  const reviewTitle = document.getElementById("reviewTitle");
  const reviewComment = document.getElementById("reviewComment");
  if (reviewTitle) {
    reviewTitle.placeholder = t("reviewTitlePlaceholder");
  }
  if (reviewComment) {
    reviewComment.placeholder = t("reviewCommentPlaceholder");
  }

  const ratingLabels = {
    5: t("reviewSelectExcellent"),
    4: t("reviewSelectStrong"),
    3: t("reviewSelectGood"),
    2: t("reviewSelectNeedsWork"),
    1: t("reviewSelectPoor"),
  };
  document.querySelectorAll("#reviewRating option").forEach((option) => {
    option.textContent = ratingLabels[option.value] || option.textContent;
  });
}

function setBookNote(message, tone = "info") {
  const note = document.getElementById("bookNote");
  if (!note) {
    return;
  }

  note.textContent = message;
  note.className = `note ${tone}`;
}

function setActionStatus(message = "", tone = "info") {
  const box = document.getElementById("actionStatus");
  if (!box) {
    return;
  }

  box.textContent = message;
  box.className = `action-status ${tone}`;
  box.style.display = message ? "block" : "none";
}

function setReviewFormNote(message, tone = "info") {
  const note = document.getElementById("reviewFormNote");
  if (!note) {
    return;
  }

  note.textContent = message;
  note.className = tone === "error" ? "review-form-note error" : "review-form-note";
}

function setReviewReportMessage(message = "", tone = "success") {
  const element = document.getElementById("reviewReportMessage");
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = message
    ? `review-report-message ${tone === "error" ? "error" : "success"}`
    : "review-report-message";
}

function renderViewerFallback({
  cover = "assets/covers/Ebook_AI.png",
  kicker = t("previewUnavailable"),
  title = t("bookCover"),
  message = t("previewUnavailableNow"),
}) {
  const frame = document.getElementById("viewerFrame");
  const textViewer = document.getElementById("textPreviewShell");
  const fallback = document.getElementById("viewerFallback");
  const preview = document.getElementById("bookPreview");
  const coverImage = document.getElementById("previewCover");
  const kickerEl = document.getElementById("viewerKicker");
  const titleEl = document.getElementById("viewerTitle");
  const messageEl = document.getElementById("viewerMessage");

  if (preview) {
    preview.src = "about:blank";
    delete preview.dataset.cover;
    delete preview.dataset.title;
    delete preview.dataset.fallbackKicker;
    delete preview.dataset.fallbackMessage;
  }

  if (frame) {
    frame.classList.add("hidden");
  }

  if (textViewer) {
    textViewer.classList.add("hidden");
  }

  if (fallback) {
    fallback.classList.remove("hidden");
  }

  if (coverImage) {
    coverImage.src = resolveAssetUrl(cover);
    coverImage.alt = title;
  }

  if (kickerEl) {
    kickerEl.textContent = kicker;
  }

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (messageEl) {
    messageEl.textContent = message;
  }
}

function renderViewerPdf({
  src = "",
  cover = "assets/covers/Ebook_AI.png",
  title = t("bookPreview"),
  fallbackKicker = t("previewUnavailable"),
  fallbackMessage = t("showingCoverInstead"),
}) {
  const frame = document.getElementById("viewerFrame");
  const textViewer = document.getElementById("textPreviewShell");
  const fallback = document.getElementById("viewerFallback");
  const preview = document.getElementById("bookPreview");

  if (!preview) {
    return;
  }

  if (fallback) {
    fallback.classList.add("hidden");
  }

  if (textViewer) {
    textViewer.classList.add("hidden");
  }

  if (frame) {
    frame.classList.remove("hidden");
  }

  preview.dataset.cover = resolveAssetUrl(cover);
  preview.dataset.title = title;
  preview.dataset.fallbackKicker = fallbackKicker;
  preview.dataset.fallbackMessage = fallbackMessage;
  preview.src = src || "about:blank";
}

function renderViewerText({
  kicker = t("instantPreview"),
  content = "",
}) {
  const frame = document.getElementById("viewerFrame");
  const fallback = document.getElementById("viewerFallback");
  const shell = document.getElementById("textPreviewShell");
  const kickerEl = document.getElementById("textPreviewKicker");
  const contentEl = document.getElementById("textPreviewContent");

  if (frame) {
    frame.classList.add("hidden");
  }
  if (fallback) {
    fallback.classList.add("hidden");
  }
  if (shell) {
    shell.classList.remove("hidden");
  }
  if (kickerEl) {
    kickerEl.textContent = kicker;
  }
  if (contentEl) {
    contentEl.textContent = content;
  }
}

function setupPreviewGuard() {
  const preview = document.getElementById("bookPreview");
  if (!preview) {
    return;
  }

  preview.addEventListener("error", () => {
      renderViewerFallback({
        cover: preview.dataset.cover || "assets/covers/Ebook_AI.png",
        title: preview.dataset.title || t("bookCover"),
        kicker: preview.dataset.fallbackKicker || t("previewUnavailable"),
        message: preview.dataset.fallbackMessage || t("showingCoverInstead"),
      });
    setBookNote(t("previewCouldNotLoad"), "warning");
  });

  preview.addEventListener("load", () => {
    try {
      const bodyText = preview.contentDocument?.body?.textContent?.trim() || "";
      if (!bodyText.startsWith("{")) {
        return;
      }

      const payload = JSON.parse(bodyText);
      if (!payload || payload.status !== "error") {
        return;
      }

      renderViewerFallback({
        cover: preview.dataset.cover || "assets/covers/Ebook_AI.png",
        title: preview.dataset.title || t("bookCover"),
        kicker: preview.dataset.fallbackKicker || t("previewUnavailable"),
        message: preview.dataset.fallbackMessage || t("showingCoverInstead"),
      });
      setBookNote(payload.message || t("previewUnavailableNow"), "warning");
    } catch {
      // Real PDF previews can trigger load events with non-HTML content.
    }
  });
}

function setupReviewForm() {
  document.getElementById("reviewForm")?.addEventListener("submit", submitReview);
}

function renderReviewPlaceholder({
  summaryText = t("ratingsPlaceholder"),
  scoreText = t("reviewSignalWarming"),
  gateMessage = t("reviewGateLocked"),
  listMessage = t("reviewListPlaceholder"),
  showForm = false,
}) {
  const summary = document.getElementById("reviewSummaryText");
  const score = document.getElementById("reviewScoreBadge");
  const gate = document.getElementById("reviewGate");
  const form = document.getElementById("reviewForm");
  const list = document.getElementById("reviewList");

  if (summary) {
    summary.textContent = summaryText;
  }
  if (score) {
    score.textContent = scoreText;
  }
  if (gate) {
    gate.textContent = gateMessage;
    gate.style.display = gateMessage ? "block" : "none";
  }
  if (form) {
    form.classList.toggle("hidden", !showForm);
  }
  if (list) {
    list.innerHTML = `<div class="review-empty">${escapeHTML(listMessage)}</div>`;
  }
}

function resetReviewForm(viewerReview = null, verifiedPurchase = false) {
  const rating = document.getElementById("reviewRating");
  const title = document.getElementById("reviewTitle");
  const comment = document.getElementById("reviewComment");
  const submit = document.getElementById("reviewSubmitBtn");

  if (rating) {
    rating.value = String(viewerReview?.rating || 5);
  }
  if (title) {
    title.value = viewerReview?.title || "";
  }
  if (comment) {
    comment.value = viewerReview?.comment || "";
  }
  if (submit) {
    submit.textContent = viewerReview ? t("reviewUpdate") : t("reviewPublish");
    submit.disabled = false;
  }

  setReviewFormNote(
    viewerReview
      ? t("reviewUpdateAnytime")
      : verifiedPurchase
        ? t("reviewVerifiedPurchase")
        : t("reviewFreeSignedIn"),
    "info"
  );
}

function buildStarMarkup(rating) {
  const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
  return Array.from({ length: 5 }, (_, index) => (
    `<span class="${index < safeRating ? "filled" : ""}">&#9733;</span>`
  )).join("");
}

function renderReviews(payload = {}) {
  const summary = payload.summary || {};
  const reviewAccess = payload.reviewAccess || {};
  const viewerReview = payload.viewerReview || null;
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  const summaryText = document.getElementById("reviewSummaryText");
  const scoreBadge = document.getElementById("reviewScoreBadge");
  const gate = document.getElementById("reviewGate");
  const form = document.getElementById("reviewForm");
  const list = document.getElementById("reviewList");
  const currentUser = getCurrentUser();
  const token = getToken();
  setReviewReportMessage("");

  const ratingCount = Number(summary.ratingCount || 0);
  const ratingAverage = Number(summary.ratingAverage || 0);

  if (summaryText) {
    summaryText.textContent = ratingCount > 0
      ? fillTemplate(t("reviewAverageSummary"), {
        average: ratingAverage.toFixed(1),
        count: ratingCount.toLocaleString("en-IN"),
      })
      : t("reviewTrustSummary");
  }

  if (scoreBadge) {
    scoreBadge.textContent = ratingCount > 0
      ? `${ratingAverage.toFixed(1)} / 5\n${ratingCount.toLocaleString("en-IN")} reviews`
      : t("reviewScoreEmpty");
  }

  if (gate) {
    gate.textContent = reviewAccess.canReview
      ? reviewAccess.verifiedPurchase
        ? t("reviewGateVerified")
        : t("reviewGateFree")
      : reviewAccess.gateMessage || t("reviewGateFallback");
    gate.style.display = reviewAccess.canReview ? "none" : "block";
  }

  if (form) {
    form.classList.toggle("hidden", !reviewAccess.canReview);
  }

  resetReviewForm(viewerReview, Boolean(reviewAccess.verifiedPurchase));

  if (!list) {
    return;
  }

  if (!reviews.length) {
    list.innerHTML = `
      <div class="review-empty">
        ${escapeHTML(t("reviewEmpty"))}
      </div>
    `;
    return;
  }

  list.innerHTML = reviews.map((review) => {
    const reviewer = review.reviewer || {};
    const reviewTitle = String(review.title || "").trim();

    return `
      <article class="review-card">
        <div class="review-topline">
          <div class="review-author">
            <img src="${escapeAttribute(resolveAssetUrl(reviewer.avatarUrl || reviewer.avatar || "assets/default-avatar.png"))}" alt="${escapeAttribute(reviewer.name || t("reader"))}">
            <div>
              <strong>${escapeHTML(reviewer.name || t("marketplaceReader"))}</strong>
              <span>@${escapeHTML(reviewer.username || "reader")}</span>
            </div>
          </div>
          <div class="review-byline">
            <div class="review-stars">${buildStarMarkup(review.rating)}</div>
            ${review.verifiedPurchase ? `<span class="review-chip">${escapeHTML(t("verifiedPurchaseChip"))}</span>` : ""}
            <span class="review-date">${escapeHTML(formatReviewDate(review.updatedAt || review.createdAt))}</span>
          </div>
        </div>
        <div class="review-copy">
          ${reviewTitle ? `<h3>${escapeHTML(reviewTitle)}</h3>` : ""}
          <p>${escapeHTML(review.comment || t("noWrittenFeedback"))}</p>
        </div>
        ${(token && String(reviewer.id || "") !== String(currentUser?.id || currentUser?._id || ""))
          ? `<div class="review-actions"><button class="review-report-btn" type="button" data-report-review="${escapeAttribute(review._id || review.id || "")}">${escapeHTML(t("reportReview"))}</button></div>`
          : ""}
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-report-review]").forEach((button) => {
    button.addEventListener("click", () => reportReview(button.dataset.reportReview || ""));
  });
}

function renderFallback(message) {
  document.title = t("documentTitle");
  document.getElementById("bookTitle").textContent = t("productUnavailable");
  document.getElementById("bookMeta").textContent = t("marketplaceProduct");
  document.getElementById("bookPrice").textContent = "";
  document.getElementById("bookDescription").textContent = message;
  const deliveryPanel = document.getElementById("deliveryPanel");
  if (deliveryPanel) {
    deliveryPanel.innerHTML = "";
    deliveryPanel.classList.add("hidden");
  }
  renderViewerFallback({
    cover: "assets/covers/Ebook_AI.png",
    kicker: t("unavailable"),
    title: t("bookNotFound"),
    message,
  });
  renderReviewPlaceholder({
    summaryText: message,
    scoreText: t("reviewsUnavailable"),
    gateMessage: "",
    listMessage: t("reviewsUnavailableBecauseLoad"),
  });
  setBookNote(message, "error");
  setActionStatus("", "info");
}

function renderManualBook() {
  const pdfPath = "assets/books/I-Tried-8-Different-AI-Side-Hustles-for-Students-Heres-Which-Ones-Actually-Pay.pdf";
  document.title = `Side Hustles for Students | E-Book Market`;
  document.getElementById("bookTitle").textContent = "Side Hustles for Students";
  document.getElementById("bookMeta").textContent = t("demoMeta");
  document.getElementById("bookPrice").textContent = t("free");
  document.getElementById("bookDescription").textContent =
    t("demoDescription");
  renderViewerPdf({
    src: pdfPath,
    cover: "assets/covers/Ebook_AI.png",
    title: "Side Hustles for Students",
    fallbackKicker: t("previewUnavailable"),
    fallbackMessage: t("previewUnavailableNow"),
  });
  renderReviewPlaceholder({
    summaryText: t("demoReviewSummary"),
    scoreText: t("demoMode"),
    gateMessage: t("demoReviewGate"),
    listMessage: t("demoReviewList"),
  });
  setBookNote(t("officialPreviewLoaded"), "info");
  document.getElementById("downloadBtn").textContent = t("download");
  document.getElementById("downloadBtn").onclick = () => window.open(pdfPath, "_blank");
  document.getElementById("cartBtn").style.display = "none";
  document.getElementById("secondaryBtn").textContent = t("explore");
  document.getElementById("secondaryBtn").onclick = () => {
    window.location.href = "explore.html";
  };
  setActionStatus("", "info");
  renderRecommendations([]);
}

async function addToCart(bookId) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  setActionStatus(t("addingToCart"), "info");

  try {
    const response = await fetch(`${API_BASE}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || t("unableToAddToCart"));
    }

    setActionStatus(t("addedToCart"), "success");
    window.setTimeout(() => {
      window.location.href = "cart.html";
    }, 500);
  } catch (error) {
    setActionStatus(error.message || t("unableToAddToCart"), "error");
  }
}

async function startDirectStripeCheckout(bookId) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  const market = getStoredBuyerMarket();
  setActionStatus(t("startingDirectCheckout"), "info");

  try {
    const response = await fetch(`${API_BASE}/api/payments/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bookId,
        country: market.country,
        currency: market.currency,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || t("directCheckoutUnavailable"));
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    setActionStatus(data.message || t("directCheckoutUnavailable"), "warning");
  } catch (error) {
    setActionStatus(error.message || t("directCheckoutUnavailable"), "error");
  }
}

function buildProtectedUrl(relativeUrl) {
  const token = getToken();
  if (!relativeUrl) {
    return "";
  }

  const separator = relativeUrl.includes("?") ? "&" : "?";
  return `${API_BASE}${relativeUrl}${token ? `${separator}token=${encodeURIComponent(token)}` : ""}`;
}

function resolveApiUrl(relativeUrl) {
  const source = String(relativeUrl || "").trim();
  if (!source) {
    return "";
  }

  if (/^(https?:|data:)/i.test(source)) {
    return source;
  }

  if (source.startsWith("/")) {
    return `${API_BASE}${source}`;
  }

  return source;
}

function buildCreatorLink(username) {
  const safeUsername = String(username || "").trim();
  if (!safeUsername) {
    return "";
  }

  return `creator/creator.html?username=${encodeURIComponent(safeUsername)}`;
}

function renderDeliveryPanel(book, access) {
  const panel = document.getElementById("deliveryPanel");
  if (!panel) {
    return;
  }

  const delivery = book.delivery || {};
  const includedItems = Array.isArray(delivery.includedItems) ? delivery.includedItems : [];
  const lines = [];

  lines.push(`<h3>${escapeHTML(book.type || "Digital Product")} ${escapeHTML(t("deliverySuffix"))}</h3>`);
  lines.push(`<p>${escapeHTML(delivery.label || t("digitalDelivery"))}</p>`);

  if (includedItems.length) {
    lines.push(`<ul>${includedItems.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`);
  }

  if (delivery.instructions) {
    lines.push(`<p>${escapeHTML(delivery.instructions)}</p>`);
  }

  if (delivery.hasExternalUrl && !access?.canDownload) {
    lines.push(`<p>${escapeHTML(t("buyersUnlockLink"))}</p>`);
  }

  panel.innerHTML = lines.join("");
  panel.classList.remove("hidden");
}

function renderBook(book, access) {
  const title = document.getElementById("bookTitle");
  const meta = document.getElementById("bookMeta");
  const price = document.getElementById("bookPrice");
  const description = document.getElementById("bookDescription");
  const downloadBtn = document.getElementById("downloadBtn");
  const secondaryBtn = document.getElementById("secondaryBtn");
  const cartBtn = document.getElementById("cartBtn");

  const token = getToken();
  const user = getCurrentUser();
  const isPaid = Number(book.price || 0) > 0;
  const canDownload = Boolean(access?.canDownload);
  const canPreview = Boolean(access?.canPreview);
  const creatorLink = buildCreatorLink(book.authorUsername);
  const cover = resolveAssetUrl(book.coverUrl || book.coverImage || "assets/covers/Ebook_AI.png");
  const previewUrl = canPreview
    ? (resolveApiUrl(book.previewAccessUrl) || buildProtectedUrl(book.previewPath))
    : "";
  const downloadUrl = resolveApiUrl(book.downloadAccessUrl) || buildProtectedUrl(book.downloadUrl || `/api/books/${book._id}/download`);
  const delivery = book.delivery || {};
  const textPreview = canDownload
    ? (delivery.unlockedText || delivery.previewText || "")
    : (delivery.previewText || "");
  const isTextPreviewable = Boolean(textPreview && delivery.hasText);

  title.textContent = book.title || t("untitled");
  meta.innerHTML = creatorLink
    ? `${escapeHTML(book.type || "Book")} &middot; ${escapeHTML(book.category || "Book")} &middot; ${escapeHTML(t("by"))} <a href="${creatorLink}" style="color:#93c5fd;text-decoration:none;">${escapeHTML(book.authorName || t("unknown"))}</a>`
    : `${escapeHTML(book.type || "Book")} &middot; ${escapeHTML(book.category || "Book")} &middot; ${escapeHTML(t("by"))} ${escapeHTML(book.authorName || t("unknown"))}`;
  price.textContent = isPaid ? formatCurrency(book.price) : t("free");
  description.textContent = book.description || "";
  renderDeliveryPanel(book, access);

  if (isTextPreviewable) {
    renderViewerText({
      kicker: canDownload ? t("unlockedContent") : t("previewExcerpt"),
      content: textPreview,
    });
    setBookNote(
      canDownload
        ? t("instantAccessUnlocked")
        : t("buyToUnlockFullContent"),
      "info"
    );
  } else if (isPaid && !canDownload) {
    renderViewerFallback({
      cover,
      kicker: token ? t("paymentRequired") : t("signInToPurchase"),
      title: book.title || t("bookCover"),
      message: token
        ? t("paidTitleMessage")
        : t("paidBookSignInMessage"),
    });
    setBookNote(t("lockedUntilPurchase"), "info");
  } else if (previewUrl) {
    renderViewerPdf({
      src: previewUrl,
      cover,
      title: book.title || t("bookPreview"),
      fallbackKicker: t("previewUnavailable"),
      fallbackMessage: canDownload
        ? t("previewFallbackDownload")
        : t("previewFallbackCover"),
    });
    setBookNote(
      canDownload
        ? t("previewReadyDownload")
        : t("previewReady"),
      "info"
    );
  } else {
    renderViewerFallback({
      cover,
      kicker: t("previewUnavailable"),
      title: book.title || t("bookCover"),
      message: canDownload
        ? t("missingPreviewDownload")
        : t("previewUnavailableCover"),
    });
    setBookNote(t("previewUnavailableNote"), "warning");
  }

  if (canDownload) {
    downloadBtn.textContent = delivery.hasExternalUrl ? t("openProduct") : delivery.hasText && !delivery.hasFile ? t("unlockText") : t("download");
    downloadBtn.onclick = () => {
      window.location.href = downloadUrl;
    };
  } else if (isPaid && !token) {
    downloadBtn.textContent = t("signInToBuy");
    downloadBtn.onclick = redirectToLogin;
  } else if (isPaid) {
    downloadBtn.textContent = t("buyNow");
    downloadBtn.onclick = () => {
      startDirectStripeCheckout(book._id);
    };
  } else {
    downloadBtn.textContent = token
      ? (delivery.hasExternalUrl ? t("openFreeProduct") : delivery.hasText && !delivery.hasFile ? t("unlockFreeContent") : t("downloadFree"))
      : t("signInToDownload");
    downloadBtn.onclick = () => {
      if (!token) {
        redirectToLogin();
        return;
      }
      window.location.href = downloadUrl;
    };
  }

  if (cartBtn) {
    if (isPaid && !canDownload) {
      cartBtn.style.display = "block";
      cartBtn.textContent = token ? t("addToCart") : t("signInToAdd");
      cartBtn.onclick = token ? () => addToCart(book._id) : redirectToLogin;
    } else {
      cartBtn.style.display = "none";
    }
  }

  if (user) {
    secondaryBtn.textContent = t("dashboard");
    secondaryBtn.onclick = () => redirectForRole(user);
  } else {
    secondaryBtn.textContent = t("signIn");
    secondaryBtn.onclick = redirectToLogin;
  }

  setActionStatus("", "info");
}

async function submitReview(event) {
  event.preventDefault();

  if (!bookViewState.bookId) {
    return;
  }

  const rating = document.getElementById("reviewRating");
  const title = document.getElementById("reviewTitle");
  const comment = document.getElementById("reviewComment");
  const submit = document.getElementById("reviewSubmitBtn");

  if (!rating || !comment || !submit) {
    return;
  }

  submit.disabled = true;
  setReviewFormNote(t("publishingReview"), "info");

  try {
    await apiFetchJson(`/api/books/${bookViewState.bookId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: Number(rating.value || 5),
        title: String(title?.value || "").trim(),
        comment: String(comment.value || "").trim(),
      }),
    });

    setReviewFormNote(t("reviewPublished"), "info");
    await loadReviews(bookViewState.bookId);
  } catch (error) {
    setReviewFormNote(error.message || t("reviewPublishFailed"), "error");
    submit.disabled = false;
  }
}

async function reportReview(reviewId) {
  if (!bookViewState.bookId || !reviewId) {
    return;
  }

  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  const reasonInput = window.prompt(
    t("reportReasonPrompt"),
    t("reportReasonDefault")
  );
  if (reasonInput === null) {
    return;
  }

  const normalizedReason = String(reasonInput || "").trim().toLowerCase();
  const allowedReasons = new Set(["spam", "abuse", "fake", "offensive", "other"]);
  if (!allowedReasons.has(normalizedReason)) {
    setReviewReportMessage(t("reportReasonInvalid"), "error");
    return;
  }

  const details = window.prompt(
    t("reportDetailsPrompt"),
    ""
  );

  try {
    await apiFetchJson(`/api/books/${bookViewState.bookId}/reviews/${reviewId}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: normalizedReason,
        details: String(details || "").trim(),
      }),
    });

    setReviewReportMessage(t("reportSubmitted"), "success");
  } catch (error) {
    setReviewReportMessage(error.message || t("reportFailed"), "error");
  }
}

async function loadReviews(bookId) {
  try {
    const data = await apiFetchJson(`/api/books/${encodeURIComponent(bookId)}/reviews`);
    renderReviews(data);
  } catch (error) {
    console.error(error);
    renderReviewPlaceholder({
      summaryText: error.message || t("reviewsUnavailableNow"),
      scoreText: t("reviewsUnavailable"),
      gateMessage: "",
      listMessage: error.message || t("tryAgainSoon"),
    });
  }
}

async function loadRecommendations(bookId) {
  try {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${API_BASE}/api/ai/recommendations?bookId=${encodeURIComponent(bookId)}&limit=4`, {
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to load recommendations");
    }

    renderRecommendations(data.books || []);
  } catch (error) {
    console.error(error);
    renderRecommendations([]);
  }
}

function renderRecommendations(books) {
  const grid = document.getElementById("recommendationGrid");
  if (!grid) {
    return;
  }

  if (!books.length) {
    grid.innerHTML = `
      <article class="recommendation-card">
        <div class="copy">
          <h3>${escapeHTML(t("noRelatedBooks"))}</h3>
          <p>${escapeHTML(t("noRelatedMessage"))}</p>
          <a href="explore.html">${escapeHTML(t("browseMarketplace"))}</a>
        </div>
      </article>
    `;
    return;
  }

  grid.innerHTML = books.map((book) => {
    const cover = resolveAssetUrl(book.coverUrl || book.coverImage || "assets/covers/Ebook_AI.png");
    const creatorLink = buildCreatorLink(book.authorUsername);
    const authorMarkup = creatorLink
      ? `<a href="${creatorLink}" style="color:#93c5fd;text-decoration:none;">${escapeHTML(book.authorName || "Creator")}</a>`
      : escapeHTML(book.authorName || "Creator");

    return `
      <article class="recommendation-card">
        <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}">
        <div class="copy">
          <h3>${escapeHTML(book.title)}</h3>
          <p>${escapeHTML(book.category || "Book")} &middot; ${authorMarkup}</p>
          ${book.recommendationReason ? `<p>${escapeHTML(book.recommendationReason)}</p>` : ""}
          <a href="book_view.html?id=${encodeURIComponent(book._id)}">${escapeHTML(t("viewRecommendation"))}</a>
        </div>
      </article>
    `;
  }).join("");
}

async function loadBookView() {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");

  if (!bookId) {
    renderManualBook();
    return;
  }

  bookViewState.bookId = bookId;

  try {
    const data = await apiFetchJson(`/api/books/${bookId}?track=1`);
    if (!data?.book) {
      renderFallback(t("bookNotFound"));
      return;
    }

    bookViewState.book = data.book;
    bookViewState.access = data.access || {};
    document.title = data.book.title
      ? `${data.book.title} | E-Book Market`
      : t("documentTitle");

    renderBook(data.book, data.access || {});
    await Promise.allSettled([
      loadReviews(bookId),
      loadRecommendations(bookId),
    ]);
  } catch (error) {
    console.error(error);
    renderFallback(error.message || t("errorLoadingBook"));
    renderRecommendations([]);
  }
}

function resolveAssetUrl(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "assets/covers/Ebook_AI.png";
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

function fillTemplate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  ));
}

function t(key) {
  const language = bookViewState.preferences.interfaceLanguage === "Hindi" ? "Hindi" : "English";
  return COPY[language]?.[key] || COPY.English[key] || key;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
}
