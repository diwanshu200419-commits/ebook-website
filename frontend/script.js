const API_BASE = window.API_BASE || "";

const HOMEPAGE_STATE = {
  trendingBooks: [],
  newestBooks: [],
};

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initVisualMotion();
  loadHomepageData();
});

function initNavbar() {
  const nav = document.getElementById("mainNav");
  if (!nav) {
    return;
  }

  const token = localStorage.getItem("token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!token) {
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="#marketplace">Marketplace</a>
      <a href="ai/ai-review.html">AI Tools</a>
      <a href="explore.html">Explore</a>
      <a class="btn-outline" href="login.html">Sign In</a>
      <a class="btn" href="register.html">Register</a>
    `;
    return;
  }

  const dashboardLink = user?.role === "admin" ? "admin/admin.html" : "dashboard/dashboard.html";
  nav.innerHTML = `
    <a href="index.html">Home</a>
    <a href="#marketplace">Marketplace</a>
    <a href="ai/ai-review.html">AI Tools</a>
    <a href="explore.html">Explore</a>
    <a href="${dashboardLink}" class="btn-outline">Dashboard</a>
    <a href="#" id="logoutBtn" class="btn">Logout</a>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", (event) => {
    event.preventDefault();
    fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
    }).catch(() => null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  });
}

function initVisualMotion() {
  refreshInteractiveCards();

  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".nav");
    if (!nav) {
      return;
    }
    nav.classList.toggle("nav-scrolled", window.scrollY > 40);
  });
}

function refreshInteractiveCards(scope = document) {
  scope.querySelectorAll(".book-card, .featured-card, .category-card, .testimonial-card, .launch-card").forEach((card) => {
    if (card.dataset.motionBound === "true") {
      return;
    }

    card.dataset.motionBound = "true";
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      card.style.transform = `translateY(-8px) rotateX(${(-offsetY / 30).toFixed(2)}deg) rotateY(${(offsetX / 30).toFixed(2)}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

async function loadHomepageData() {
  try {
    const [trendingResponse, newestResponse] = await Promise.all([
      fetchJson("/api/books?limit=8&sort=trending"),
      fetchJson("/api/books?limit=8"),
    ]);

    const trendingBooks = filterOfficialPreviewBooks(trendingResponse.books || []);
    const newestBooks = filterOfficialPreviewBooks(newestResponse.books || []);

    HOMEPAGE_STATE.trendingBooks = trendingBooks;
    HOMEPAGE_STATE.newestBooks = newestBooks;

    renderCategories(trendingResponse.filters?.categories || []);
    renderFeaturedBooks(buildFeaturedSelection(trendingBooks, newestBooks));
    renderFreshLaunches(buildFreshSelection(newestBooks, trendingBooks));
    hydrateHeroCards(trendingBooks, newestBooks);
    await renderReviewProof(buildFeedbackCandidates(trendingBooks, newestBooks));
  } catch (error) {
    console.error("Homepage data failed:", error);
    renderCategories([]);
    renderFeaturedBooks([]);
    renderFreshLaunches([]);
    hydrateHeroCards([], []);
    renderReviewFallback();
  }
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Unable to load marketplace");
  }
  return json;
}

function filterOfficialPreviewBooks(books = []) {
  return books.filter((book) => !isOfficialPreviewBook(book));
}

function isOfficialPreviewBook(book = {}) {
  const catalogKey = String(book.catalogKey || "").trim().toLowerCase();
  if (catalogKey.startsWith("official-preview-")) {
    return true;
  }

  const title = String(book.title || "").trim().toLowerCase();
  const subcategory = String(book.subcategory || "").trim().toLowerCase();
  const cover = String(book.coverUrl || book.cover || book.coverImage || "").trim().toLowerCase();

  return title === "side hustles for students"
    && subcategory === "free preview"
    && cover.includes("ebook_ai.png");
}

function buildFeaturedSelection(trendingBooks = [], newestBooks = []) {
  const merged = dedupeBooks([
    ...trendingBooks,
    ...newestBooks,
  ]);

  return merged
    .sort((left, right) => {
      const leftScore = (left.isFeatured ? 10000 : 0)
        + Number(left.ratingCount || 0) * 20
        + Number(left.ratingAverage || 0) * 40
        + Number(left.salesCount || 0) * 8
        + Number(left.views || 0);
      const rightScore = (right.isFeatured ? 10000 : 0)
        + Number(right.ratingCount || 0) * 20
        + Number(right.ratingAverage || 0) * 40
        + Number(right.salesCount || 0) * 8
        + Number(right.views || 0);
      return rightScore - leftScore;
    })
    .slice(0, 6);
}

function buildFreshSelection(newestBooks = [], trendingBooks = []) {
  const trendingIds = new Set(buildFeaturedSelection(trendingBooks, newestBooks).map((book) => String(book._id || "")));
  return newestBooks
    .filter((book) => !trendingIds.has(String(book._id || "")))
    .slice(0, 4);
}

function buildFeedbackCandidates(trendingBooks = [], newestBooks = []) {
  return dedupeBooks([
    ...trendingBooks,
    ...newestBooks,
  ])
    .sort((left, right) => {
      const leftScore = Number(left.ratingCount || 0) * 30 + Number(left.ratingAverage || 0) * 50 + Number(left.views || 0);
      const rightScore = Number(right.ratingCount || 0) * 30 + Number(right.ratingAverage || 0) * 50 + Number(right.views || 0);
      return rightScore - leftScore;
    })
    .slice(0, 6);
}

function dedupeBooks(books = []) {
  const seen = new Set();
  const output = [];

  books.forEach((book) => {
    const safeId = String(book?._id || "");
    if (!safeId || seen.has(safeId)) {
      return;
    }
    seen.add(safeId);
    output.push(book);
  });

  return output;
}

function renderCategories(categories = []) {
  const container = document.querySelector(".categories-grid");
  if (!container) {
    return;
  }

  const iconMap = {
    Business: "B",
    Education: "E",
    Technology: "T",
    Programming: "P",
    Horror: "H",
    Literature: "L",
    "Language Learning": "LL",
    AI: "AI",
    Notes: "N",
    Comics: "C",
    "Self Help": "S",
    Competitive: "X",
    Other: "O",
  };

  if (!categories.length) {
    container.innerHTML = `
      <div class="category-card">
        <div class="category-icon">DB</div>
        <h3>No approved books yet</h3>
        <p>Categories will update automatically after uploads are approved.</p>
      </div>
    `;
    refreshInteractiveCards(container);
    return;
  }

  container.innerHTML = categories.slice(0, 8).map((category) => `
    <div class="category-card">
      <div class="category-icon">${escapeHTML(iconMap[category.name] || String(category.name || "OT").slice(0, 2).toUpperCase())}</div>
      <h3>${escapeHTML(category.name)}</h3>
      <p>${Number(category.count || 0).toLocaleString("en-IN")} live books</p>
    </div>
  `).join("");

  refreshInteractiveCards(container);
}

function renderFeaturedBooks(books = []) {
  const container = document.getElementById("featuredApprovedList");
  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
      <article class="featured-card">
        <div style="padding:24px;">
          <h3>No approved books yet</h3>
          <p style="color:#94a3b8; line-height:1.6;">The marketplace will fill with real uploads once creators submit books and they pass review.</p>
          <a href="dashboard/upload.html" class="btn" style="display:inline-block; margin-top:12px;">Open Upload Studio</a>
        </div>
      </article>
    `;
    refreshInteractiveCards(container);
    return;
  }

  container.innerHTML = books.map((book) => {
    const coverSrc = resolveAssetUrl(book.coverUrl || book.cover || book.coverImage || "assets/covers/Ebook_AI.png");
    const creatorLink = buildCreatorLink(book.authorUsername);
    const authorMarkup = creatorLink
      ? `<a href="${creatorLink}">${escapeHTML(book.authorName || "Creator")}</a>`
      : escapeHTML(book.authorName || "Creator");

    return `
      <article class="featured-card">
        <img src="${escapeAttribute(coverSrc)}" alt="${escapeAttribute(book.title)}">
        <div class="featured-card-body">
          <div class="featured-card-copy">
            <span class="card-kicker">${escapeHTML(book.isFeatured ? "Featured live" : "Marketplace live")}</span>
            <h3>${escapeHTML(book.title)}</h3>
            <p>${escapeHTML(book.category || "Book")} • ${authorMarkup}</p>
            <div class="card-signal-row">
              <span class="rating-pill">${buildStarRow(book.ratingAverage)} ${escapeHTML(formatRatingLabel(book))}</span>
              <span class="mini-signal">${escapeHTML(formatCurrencyOrFree(book.price))}</span>
            </div>
          </div>
          <div class="featured-card-actions">
            <span class="featured-price">${escapeHTML(formatCompactNumber(book.views || 0))} views</span>
            <a href="book_view.html?id=${encodeURIComponent(book._id)}">Open book</a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  refreshInteractiveCards(container);
}

function renderFreshLaunches(books = []) {
  const container = document.getElementById("newFeaturedList");
  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
      <article class="launch-card">
        <div class="launch-copy">
          <span class="card-kicker">Fresh drops</span>
          <h3>New launches will appear here</h3>
          <p>As creators publish and admins approve new products, the latest live drops will show up in this rail.</p>
          <a href="dashboard/upload.html">Open creator upload</a>
        </div>
      </article>
    `;
    refreshInteractiveCards(container);
    return;
  }

  container.innerHTML = books.map((book, index) => `
    <article class="launch-card">
      <img src="${escapeAttribute(resolveAssetUrl(book.coverUrl || book.cover || book.coverImage || "assets/covers/Ebook_AI.png"))}" alt="${escapeAttribute(book.title)}">
      <div class="launch-copy">
        <span class="card-kicker">${index === 0 ? "Just approved" : "New live drop"}</span>
        <h3>${escapeHTML(book.title)}</h3>
        <p>${escapeHTML(book.description || "Fresh creator product ready for discovery.").slice(0, 150)}</p>
        <div class="launch-meta">
          <span>${escapeHTML(book.language || "English")}</span>
          <span>${escapeHTML(formatCurrencyOrFree(book.price))}</span>
        </div>
        <a href="book_view.html?id=${encodeURIComponent(book._id)}">View drop</a>
      </div>
    </article>
  `).join("");

  refreshInteractiveCards(container);
}

async function renderReviewProof(books = []) {
  const container = document.getElementById("reviewProofList");
  if (!container) {
    return;
  }

  if (!books.length) {
    renderReviewFallback();
    return;
  }

  const reviewResponses = await Promise.allSettled(
    books.map((book) => fetchJson(`/api/books/${encodeURIComponent(book._id)}/reviews`).then((payload) => ({ book, payload })))
  );

  const proofCards = [];
  reviewResponses.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }

    const { book, payload } = result.value;
    const firstReview = Array.isArray(payload.reviews) ? payload.reviews[0] : null;
    if (!firstReview) {
      return;
    }

    proofCards.push({
      book,
      review: firstReview,
      summary: payload.summary || {},
    });
  });

  if (!proofCards.length) {
    renderReviewFallback(books);
    return;
  }

  container.innerHTML = proofCards.slice(0, 3).map(({ book, review, summary }) => `
    <article class="testimonial-card review-proof-card">
      <div class="review-proof-top">
        <span class="rating-pill">${buildStarRow(review.rating)} ${escapeHTML(Number(review.rating || 0).toFixed(1))}</span>
        <span class="mini-signal">${escapeHTML(Number(summary.ratingCount || 0).toLocaleString("en-IN"))} reviews</span>
      </div>
      <p>${escapeHTML(review.comment || "Learner feedback will appear here once reviews are published.")}</p>
      <div class="testimonial-author">
        <img src="${escapeAttribute(resolveAssetUrl(review.reviewer?.avatarUrl || review.reviewer?.avatar || "assets/default-avatar.png"))}" alt="${escapeAttribute(review.reviewer?.name || "Reader")}" class="testimonial-avatar">
        <div>
          <strong>${escapeHTML(review.reviewer?.name || "Marketplace reader")}</strong>
          <p>${escapeHTML(book.title || "Marketplace product")}</p>
          <p>${escapeHTML(book.category || "Digital product")} • ${escapeHTML(formatCurrencyOrFree(book.price))}</p>
        </div>
      </div>
    </article>
  `).join("");

  refreshInteractiveCards(container);
}

function renderReviewFallback(books = []) {
  const container = document.getElementById("reviewProofList");
  if (!container) {
    return;
  }

  const fallbackBooks = books.slice(0, 3);
  if (!fallbackBooks.length) {
    container.innerHTML = `
      <article class="testimonial-card review-proof-card">
        <p>Real learner feedback will start appearing here as purchases are completed and reviews are published from the live marketplace.</p>
        <div class="testimonial-author">
          <img src="assets/default-avatar.png" alt="Marketplace" class="testimonial-avatar">
          <div>
            <strong>Marketplace trust layer</strong>
            <p>Review flow live</p>
            <p>Protected purchases only</p>
          </div>
        </div>
      </article>
    `;
    return;
  }

  container.innerHTML = fallbackBooks.map((book) => `
    <article class="testimonial-card review-proof-card">
      <div class="review-proof-top">
        <span class="rating-pill">${buildStarRow(book.ratingAverage)} ${escapeHTML(formatRatingLabel(book))}</span>
        <span class="mini-signal">${escapeHTML(Number(book.ratingCount || 0).toLocaleString("en-IN"))} ratings</span>
      </div>
      <p>${escapeHTML(book.description || "Real review proof will appear here as more learner reviews are published.").slice(0, 180)}</p>
      <div class="testimonial-author">
        <img src="${escapeAttribute(resolveAssetUrl(book.coverUrl || book.cover || book.coverImage || "assets/covers/Ebook_AI.png"))}" alt="${escapeAttribute(book.title)}" class="testimonial-avatar">
        <div>
          <strong>${escapeHTML(book.title)}</strong>
          <p>${escapeHTML(book.authorName || "Marketplace creator")}</p>
          <p>${escapeHTML(formatCurrencyOrFree(book.price))}</p>
        </div>
      </div>
    </article>
  `).join("");

  refreshInteractiveCards(container);
}

function hydrateHeroCards(trendingBooks = [], newestBooks = []) {
  const secondary = document.getElementById("heroSecondaryCard");
  const tertiary = document.getElementById("heroTertiaryCard");
  const candidates = dedupeBooks([
    ...newestBooks,
    ...trendingBooks,
  ]).slice(0, 2);

  if (secondary && candidates[0]) {
    applyHeroProductCard(secondary, candidates[0], {
      badge: "NEW DROP",
      action: "Explore Now ->",
      fallbackMeta: "Live creator product",
    });
  }

  if (tertiary && candidates[1]) {
    applyHeroProductCard(tertiary, candidates[1], {
      badge: candidates[1].isFeatured ? "FEATURED" : "LIVE PRODUCT",
      action: "Open Book ->",
      fallbackMeta: "Marketplace approved",
    });
  }
}

function applyHeroProductCard(card, book, options = {}) {
  if (!card || !book?._id) {
    return;
  }

  const image = card.querySelector("img");
  const price = card.querySelector(".price");
  const title = card.querySelector("h3");
  const copy = card.querySelector("p");
  const small = card.querySelector("small");
  const button = card.querySelector(".cta-btn");

  card.href = `book_view.html?id=${encodeURIComponent(book._id)}`;
  image.src = resolveAssetUrl(book.coverUrl || book.cover || book.coverImage || "assets/covers/Ebook_AI.png");
  image.alt = book.title || "Marketplace product";
  price.textContent = options.badge || formatCurrencyOrFree(book.price);
  title.textContent = book.title || "Marketplace product";
  copy.textContent = `${book.category || "Book"} • ${book.language || "English"}`;
  if (small) {
    small.textContent = options.fallbackMeta || `${formatCompactNumber(book.views || 0)} views`;
  }
  if (button) {
    button.textContent = options.action || "Open Book ->";
  }
}

function buildCreatorLink(username) {
  const safeUsername = String(username || "").trim();
  if (!safeUsername) {
    return "";
  }
  return `creator/creator.html?username=${encodeURIComponent(safeUsername)}`;
}

function formatCurrencyOrFree(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `Rs. ${amount.toLocaleString("en-IN")}` : "FREE";
}

function formatCompactNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatRatingLabel(book = {}) {
  const average = Number(book.ratingAverage || 0);
  const count = Number(book.ratingCount || 0);
  if (count > 0 && average > 0) {
    return `${average.toFixed(1)} • ${count.toLocaleString("en-IN")} ratings`;
  }
  return "Review signal warming";
}

function buildStarRow(rating = 0) {
  const safe = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
  return Array.from({ length: 5 }, (_, index) => (index < safe ? "★" : "☆")).join("");
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
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
