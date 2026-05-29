const API_BASE = window.API_BASE || "";

const HOMEPAGE_STATE = {
  trendingBooks: [],
  newestBooks: [],
  creators: [],
  paymentConfig: null,
  summary: {
    totalProducts: 0,
    totalPaidProducts: 0,
    totalCategories: 0,
  },
};

const CREATOR_SHARE_RATE = 0.8;
const PLATFORM_SHARE_RATE = 0.2;
const UPLOAD_DRAFT_KEY = "ebook-market-upload-draft";
const PLANNER_CURRENCIES = {
  INR: { code: "INR", locale: "en-IN" },
  USD: { code: "USD", locale: "en-US" },
  EUR: { code: "EUR", locale: "en-IE" },
  GBP: { code: "GBP", locale: "en-GB" },
};
const LAUNCH_TRACKS = [
  {
    key: "student-notes",
    badge: "Student path",
    title: "Sell handwritten notes and study packs",
    description: "Perfect for semester toppers, exam notes, revision packs, and subject summaries that students buy before tests.",
    type: "Notes",
    category: "Education",
    subcategory: "Exam Notes",
    language: "English",
    price: "199",
    tags: ["notes", "exam", "study pack", "students"],
    titleTemplate: "Topper Exam Notes Pack",
    descriptionTemplate: "High-conversion study notes with concise explanations, chapter breakdowns, and revision-ready summaries for students.",
    deliveryInstructions: "Add subject coverage, exam target, and what makes these notes better than classroom notes.",
  },
  {
    key: "teacher-ebook",
    badge: "Teacher path",
    title: "Launch an ebook or teaching handbook",
    description: "Designed for teachers, trainers, and educators publishing premium ebooks, workbooks, and practical learning guides.",
    type: "Book",
    category: "Education",
    subcategory: "Teaching Guide",
    language: "English",
    price: "499",
    tags: ["ebook", "teacher", "guide", "learning"],
    titleTemplate: "Teaching Guide for Practical Learning",
    descriptionTemplate: "A polished ebook that packages your teaching knowledge into a downloadable product learners can buy worldwide.",
    deliveryInstructions: "Show the target learner, learning outcome, and why this book is worth paying for.",
  },
  {
    key: "ai-prompts",
    badge: "AI creator",
    title: "Package AI prompts into a paid digital asset",
    description: "For prompt engineers, AI creators, and side hustlers selling ready-to-use prompt packs, workflows, and launch systems.",
    type: "Prompt",
    category: "AI",
    subcategory: "Prompt Pack",
    language: "English",
    price: "299",
    tags: ["ai prompts", "chatgpt", "automation", "creator tools"],
    titleTemplate: "AI Prompt Pack for Creators",
    descriptionTemplate: "A curated prompt pack that helps buyers create faster, automate repetitive work, and launch outputs with less guesswork.",
    promptText: "Prompt 1:\nPrompt 2:\nPrompt 3:\n",
    deliveryInstructions: "List the exact outcomes buyers will get from the prompt pack and include usage instructions.",
  },
  {
    key: "freelancer-template",
    badge: "Freelancer path",
    title: "Monetize templates, kits, and client resources",
    description: "Best for freelancers selling proposal templates, code starter kits, branding systems, and ready-to-use digital packs.",
    type: "Template",
    category: "Business",
    subcategory: "Client Template",
    language: "English",
    price: "799",
    tags: ["template", "freelancer", "client work", "digital kit"],
    titleTemplate: "Freelancer Client Template Kit",
    descriptionTemplate: "A reusable digital template kit that saves buyers time and helps them deliver professional work faster.",
    deliveryIncludes: "Proposal template, onboarding checklist, workflow file, editable assets",
    deliveryInstructions: "Explain what files are included, who should buy this kit, and how fast it can save them time.",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initPrimaryCtas();
  initEarningsPlanner();
  renderLaunchTracks();
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

function getStoredSession() {
  const token = localStorage.getItem("token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  return { token, user };
}

function initPrimaryCtas() {
  const { token, user } = getStoredSession();
  const exploreBtn = document.getElementById("heroExploreBtn");
  const creatorBtn = document.getElementById("heroCreatorBtn");
  const creatorCtaBtn = document.getElementById("creatorCtaBtn");

  if (exploreBtn) {
    exploreBtn.href = token ? "explore.html" : "#featured";
    exploreBtn.textContent = token ? "Open Marketplace" : "Explore Books";
  }

  if (creatorBtn) {
    if (!token) {
      creatorBtn.href = "register.html";
      creatorBtn.textContent = "Become a Creator";
    } else if (user?.role === "admin") {
      creatorBtn.href = "admin/admin.html";
      creatorBtn.textContent = "Open Admin";
    } else {
      creatorBtn.href = "dashboard/dashboard.html";
      creatorBtn.textContent = "Open Dashboard";
    }
  }

  if (creatorCtaBtn) {
    if (!token) {
      creatorCtaBtn.href = "register.html";
      creatorCtaBtn.textContent = "Start Creating Now";
    } else if (user?.role === "admin") {
      creatorCtaBtn.href = "admin/admin.html";
      creatorCtaBtn.textContent = "Open Admin Command Center";
    } else {
      creatorCtaBtn.href = "dashboard/upload.html";
      creatorCtaBtn.textContent = "Launch Creator Studio";
    }
  }
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
    const [trendingResponse, newestResponse, creatorResponse, paymentConfig] = await Promise.all([
      fetchJson("/api/books?limit=8&sort=trending"),
      fetchJson("/api/books?limit=8"),
      fetchJson("/api/creator/trending?limit=4").catch(() => ({ creators: [] })),
      fetchJson("/api/payments/config?country=IN&currency=INR").catch(() => null),
    ]);

    const trendingBooks = filterOfficialPreviewBooks(trendingResponse.books || []);
    const newestBooks = filterOfficialPreviewBooks(newestResponse.books || []);
    const creators = Array.isArray(creatorResponse?.creators) ? creatorResponse.creators : [];

    HOMEPAGE_STATE.trendingBooks = trendingBooks;
    HOMEPAGE_STATE.newestBooks = newestBooks;
    HOMEPAGE_STATE.creators = creators;
    HOMEPAGE_STATE.paymentConfig = paymentConfig;
    HOMEPAGE_STATE.summary = buildHomepageSummary(trendingResponse, trendingBooks, newestBooks);

    renderCategories(trendingResponse.filters?.categories || []);
    renderHeroMetrics(HOMEPAGE_STATE.summary);
    renderEarningsPlanner();
    renderCreatorProof(creators);
    renderFeaturedBooks(buildFeaturedSelection(trendingBooks, newestBooks));
    renderFreshLaunches(buildFreshSelection(newestBooks, trendingBooks));
    hydrateHeroCards(trendingBooks, newestBooks);
    await renderReviewProof(buildFeedbackCandidates(trendingBooks, newestBooks));
    setHeroStatus("Live marketplace rails are active and synced to approved catalog data.", "success");
  } catch (error) {
    console.error("Homepage data failed:", error);
    renderCategories([]);
    renderHeroMetrics();
    renderEarningsPlanner();
    renderCreatorProof([]);
    renderFeaturedBooks([]);
    renderFreshLaunches([]);
    hydrateHeroCards([], []);
    renderReviewFallback();
    setHeroStatus("Marketplace data is taking longer to sync. You can still explore the live catalog.", "warning");
  }
}

function initEarningsPlanner() {
  const plannerCurrency = document.getElementById("plannerCurrency");
  const plannerPrice = document.getElementById("plannerPrice");
  const plannerSales = document.getElementById("plannerSales");
  const plannerSalesRange = document.getElementById("plannerSalesRange");
  const plannerLaunchBtn = document.getElementById("plannerLaunchBtn");

  if (!plannerCurrency || !plannerPrice || !plannerSales || !plannerSalesRange) {
    return;
  }

  const syncSales = (value) => {
    const safeValue = Math.max(1, Number(value || 1));
    plannerSales.value = safeValue;
    plannerSalesRange.value = safeValue;
    renderEarningsPlanner();
  };

  plannerCurrency.addEventListener("change", () => renderEarningsPlanner());
  plannerPrice.addEventListener("input", () => renderEarningsPlanner());
  plannerSales.addEventListener("input", () => syncSales(plannerSales.value));
  plannerSalesRange.addEventListener("input", () => syncSales(plannerSalesRange.value));

  const { token, user } = getStoredSession();
  if (plannerLaunchBtn) {
    if (!token) {
      plannerLaunchBtn.href = "register.html";
      plannerLaunchBtn.textContent = "Start creator account";
    } else if (user?.role === "admin") {
      plannerLaunchBtn.href = "admin/admin.html";
      plannerLaunchBtn.textContent = "Open admin command center";
    } else {
      plannerLaunchBtn.href = "dashboard/upload.html";
      plannerLaunchBtn.textContent = "Launch creator studio";
    }
  }

  renderEarningsPlanner();
}

function renderEarningsPlanner() {
  const plannerCurrency = document.getElementById("plannerCurrency");
  const plannerPrice = document.getElementById("plannerPrice");
  const plannerSales = document.getElementById("plannerSales");

  if (!plannerCurrency || !plannerPrice || !plannerSales) {
    return;
  }

  const currency = plannerCurrency.value in PLANNER_CURRENCIES ? plannerCurrency.value : "INR";
  const price = Math.max(0, Number(plannerPrice.value || 0));
  const monthlySales = Math.max(1, Number(plannerSales.value || 1));
  const creatorPerSale = price * CREATOR_SHARE_RATE;
  const platformPerSale = price * PLATFORM_SHARE_RATE;
  const monthlyCreatorPayout = creatorPerSale * monthlySales;
  const annualCreatorPayout = monthlyCreatorPayout * 12;

  setText("plannerCreatorPerSale", formatPlannerCurrency(creatorPerSale, currency));
  setText("plannerPlatformPerSale", formatPlannerCurrency(platformPerSale, currency));
  setText("plannerMonthlyPayout", formatPlannerCurrency(monthlyCreatorPayout, currency));
  setText("plannerAnnualPayout", formatPlannerCurrency(annualCreatorPayout, currency));
  setText("plannerBuyerPrice", `Buyers pay ${formatPlannerCurrency(price, currency)} for this product.`);

  const paidListings = HOMEPAGE_STATE.summary.totalPaidProducts || 0;
  const liveProducts = HOMEPAGE_STATE.summary.totalProducts || 0;
  const categories = HOMEPAGE_STATE.summary.totalCategories || 0;

  const insight = price <= 0
    ? "Free products are great for audience growth, but paid products are what turn your creator profile into a real earnings machine."
    : `At ${monthlySales.toLocaleString("en-IN")} sales per month, you keep ${formatPlannerCurrency(monthlyCreatorPayout, currency)} monthly and ${formatPlannerCurrency(annualCreatorPayout, currency)} yearly on the marketplace.`;
  setText("plannerInsight", insight);

  setText(
    "plannerLiveCatalog",
    `${liveProducts.toLocaleString("en-IN")} live products - ${paidListings.toLocaleString("en-IN")} paid listings - ${categories.toLocaleString("en-IN")} active categories`
  );

  const paymentConfig = HOMEPAGE_STATE.paymentConfig;
  const rails = Array.isArray(paymentConfig?.availableMethods) ? paymentConfig.availableMethods.join(", ") : "";
  const railText = rails
    ? `${rails} active now${paymentConfig?.upiId ? ` - ${paymentConfig.upiId}` : ""}`
    : "Marketplace rails sync after payment settings load";
  setText("plannerLiveRail", railText);
}

function renderCreatorProof(creators = []) {
  const container = document.getElementById("creatorProofList");
  if (!container) {
    return;
  }

  if (!creators.length) {
    container.innerHTML = `
      <article class="creator-proof-card">
        <div class="creator-proof-copy">
          <span class="card-kicker">Creator network</span>
          <h3>Creator proof will appear as more live profiles grow</h3>
          <p>Once approved creators publish products and start building followers, their public earning signals will appear here automatically.</p>
          <a class="proof-link" href="dashboard/upload.html">Launch creator studio</a>
        </div>
      </article>
    `;
    refreshInteractiveCards(container);
    return;
  }

  container.innerHTML = creators.map((creator, index) => {
    const stats = creator.stats || {};
    const avatar = resolveAssetUrl(creator.avatarUrl || creator.avatar || creator.profileImage || "assets/default-avatar.png");
    const profileLink = buildCreatorLink(creator.username);
    const trustReason = creator.trustReason || creator.badge || "Live creator profile";
    const bio = String(creator.bio || "This creator is building a real digital storefront with live products and audience signals.").slice(0, 170);

    return `
      <article class="creator-proof-card">
        <div class="creator-proof-head">
          <div class="creator-proof-identity">
            <img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(creator.name || "Creator")}" class="creator-proof-avatar">
            <div>
              <span class="card-kicker">${escapeHTML(index === 0 ? "Top creator" : "Creator spotlight")}</span>
              <h3>${escapeHTML(creator.name || "Creator")}</h3>
              <p>${escapeHTML(creator.username ? `@${creator.username}` : "Marketplace creator")} - ${escapeHTML(trustReason)}</p>
            </div>
          </div>
          <span class="mini-signal">${escapeHTML(creator.badge || "Live")}</span>
        </div>

        <p class="creator-proof-bio">${escapeHTML(bio)}</p>

        <div class="creator-proof-stats">
          <div class="creator-proof-stat">
            <small>Followers</small>
            <strong>${escapeHTML(formatCompactNumber(stats.followersCount || 0))}</strong>
          </div>
          <div class="creator-proof-stat">
            <small>Live products</small>
            <strong>${escapeHTML(formatCompactNumber(stats.totalBooks || 0))}</strong>
          </div>
          <div class="creator-proof-stat">
            <small>Total earned</small>
            <strong>${escapeHTML(formatPlannerCurrency(stats.totalEarnings || 0, "INR"))}</strong>
          </div>
        </div>

        <div class="card-signal-row">
          <span class="rating-pill">${buildStarRow(stats.ratingAverage || 0)} ${escapeHTML(formatRatingSummary(stats.ratingAverage || 0, stats.ratingCount || 0))}</span>
          <span class="mini-signal">${escapeHTML(formatCompactNumber(stats.totalSales || 0))} sales</span>
          <span class="mini-signal">${escapeHTML(formatCompactNumber(stats.totalViews || 0))} views</span>
        </div>

        <div class="inline-actions">
          <a href="${escapeAttribute(profileLink || "creator/creator.html")}">Open creator profile</a>
          <a class="ghost-link" href="${escapeAttribute(profileLink || "creator/creator.html")}">View live catalog</a>
        </div>
      </article>
    `;
  }).join("");

  refreshInteractiveCards(container);
}

function renderLaunchTracks() {
  const container = document.getElementById("launchTrackList");
  if (!container) {
    return;
  }

  container.innerHTML = LAUNCH_TRACKS.map((track) => `
    <article class="launch-track-card">
      <div class="launch-track-copy">
        <span class="card-kicker">${escapeHTML(track.badge)}</span>
        <h3>${escapeHTML(track.title)}</h3>
        <p>${escapeHTML(track.description)}</p>
      </div>

      <div class="card-signal-row">
        <span class="mini-signal">${escapeHTML(track.type)}</span>
        <span class="mini-signal">${escapeHTML(track.category)}</span>
        <span class="mini-signal">${escapeHTML(formatCurrencyOrFree(track.price))}</span>
      </div>

      <div class="launch-track-meta">
        <small>Suggested title</small>
        <strong>${escapeHTML(track.titleTemplate)}</strong>
      </div>

      <div class="inline-actions">
        <button type="button" class="btn-outline launch-track-btn" data-launch-track="${escapeAttribute(track.key)}" data-launch-mode="upload">Prepare Draft</button>
        <button type="button" class="ghost-action-btn launch-track-btn" data-launch-track="${escapeAttribute(track.key)}" data-launch-mode="review">Review With AI</button>
      </div>
    </article>
  `).join("");

  bindLaunchTrackActions(container);
  refreshInteractiveCards(container);
}

function bindLaunchTrackActions(root = document) {
  root.querySelectorAll("[data-launch-track]").forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }

    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const trackKey = button.getAttribute("data-launch-track");
      const mode = button.getAttribute("data-launch-mode") || "upload";
      const track = LAUNCH_TRACKS.find((entry) => entry.key === trackKey);
      if (!track) {
        return;
      }

      const { token, user } = getStoredSession();
      const draft = {
        title: track.titleTemplate,
        type: track.type,
        category: track.category,
        subcategory: track.subcategory || "",
        language: track.language || "English",
        price: track.price || "",
        originalPrice: track.price || "",
        previewPages: "3",
        bookAuthor: user?.name || "",
        promptText: track.promptText || "",
        deliveryIncludes: track.deliveryIncludes || "",
        externalUrl: "",
        deliveryInstructions: track.deliveryInstructions || "",
        isPremium: Number(track.price || 0) > 0,
        isFeatured: false,
        description: track.descriptionTemplate,
        copyright: true,
        tags: Array.isArray(track.tags) ? track.tags : [],
      };

      localStorage.setItem(UPLOAD_DRAFT_KEY, JSON.stringify(draft));

      if (mode === "review") {
        window.location.href = "ai/ai-review.html";
        return;
      }

      if (!token) {
        window.location.href = "register.html";
        return;
      }

      if (user?.role === "admin" || user?.role === "creator" || user?.role === "author") {
        window.location.href = "dashboard/upload.html";
        return;
      }

      window.location.href = "dashboard/dashboard.html";
    });
  });
}

function buildHomepageSummary(response = {}, trendingBooks = [], newestBooks = []) {
  const merged = dedupeBooks([...trendingBooks, ...newestBooks]);
  const categories = Array.isArray(response.filters?.categories) ? response.filters.categories : [];

  return {
    totalProducts: Number(response.summary?.totalBooks || merged.length || 0),
    totalPaidProducts: merged.filter((book) => Number(book.price || 0) > 0).length,
    totalCategories: Number(response.summary?.totalCategories || categories.length || 0),
  };
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
    <a class="category-card" href="explore.html?category=${encodeURIComponent(category.name || "")}">
      <div class="category-icon">${escapeHTML(iconMap[category.name] || String(category.name || "OT").slice(0, 2).toUpperCase())}</div>
      <h3>${escapeHTML(category.name)}</h3>
      <p>${Number(category.count || 0).toLocaleString("en-IN")} live books</p>
    </a>
  `).join("");

  refreshInteractiveCards(container);
}

function renderHeroMetrics(summary = HOMEPAGE_STATE.summary) {
  setMetric("heroMetricProducts", summary.totalProducts);
  setMetric("heroMetricPaid", summary.totalPaidProducts);
  setMetric("heroMetricCategories", summary.totalCategories);
}

function setMetric(id, value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = Number(value || 0).toLocaleString("en-IN");
}

function setHeroStatus(message, tone = "info") {
  const element = document.getElementById("heroStatus");
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `hero-status tone-${tone}`;
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
            <p>${escapeHTML(book.category || "Book")} - ${authorMarkup}</p>
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
  upgradeFeaturedCards(container);
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
  upgradeFreshLaunchCards(container);
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
          <p>${escapeHTML(book.category || "Digital product")} - ${escapeHTML(formatCurrencyOrFree(book.price))}</p>
        </div>
      </div>
    </article>
  `).join("");

  refreshInteractiveCards(container);
  upgradeReviewProofCards(container);
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
  upgradeReviewProofCards(container);
}

function extractBookIdFromHref(href = "") {
  try {
    const target = new URL(href, window.location.origin);
    return target.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function bindHomepageProductActions(root = document) {
  root.querySelectorAll("[data-home-cart-button]").forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }

    button.dataset.bound = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const bookId = button.getAttribute("data-home-cart-button");
      if (!bookId) {
        return;
      }

      const mode = (button.dataset.mode || "cart").toLowerCase();
      if (mode === "open") {
        window.location.href = `book_view.html?id=${encodeURIComponent(bookId)}`;
        return;
      }
      if (mode === "cart-ready") {
        window.location.href = "cart.html";
        return;
      }

      await addHomepageCart(bookId, button);
    });
  });
}

function upgradeFeaturedCards(root = document) {
  root.querySelectorAll(".featured-card").forEach((card) => {
    const copyText = card.querySelector(".featured-card-copy p");
    const footer = card.querySelector(".featured-card-actions");
    const link = footer?.querySelector('a[href*="book_view.html?id="]');
    if (copyText) {
      copyText.innerHTML = copyText.innerHTML.replace(/â€¢|•/g, "-");
    }
    if (!footer || !link || footer.querySelector(".inline-actions")) {
      return;
    }

    const bookId = extractBookIdFromHref(link.href);
    const priceBadge = card.querySelector(".mini-signal");
    const isPaid = !/free/i.test(priceBadge?.textContent || "");
    const actions = document.createElement("div");
    actions.className = "inline-actions";
    link.parentNode?.insertBefore(actions, link);
    actions.appendChild(link);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-action-btn";
    button.setAttribute("data-home-cart-button", bookId);
    button.dataset.mode = isPaid ? "cart" : "open";
    button.textContent = isPaid ? "Add To Cart" : "Open Free";
    actions.appendChild(button);
  });

  bindHomepageProductActions(root);
}

function upgradeFreshLaunchCards(root = document) {
  root.querySelectorAll(".launch-card").forEach((card) => {
    const link = card.querySelector('.launch-copy a[href*="book_view.html?id="]');
    if (!link || link.parentElement?.querySelector(".inline-actions")) {
      return;
    }

    const bookId = extractBookIdFromHref(link.href);
    const metaPrice = Array.from(card.querySelectorAll(".launch-meta span")).find((node) => /rs\.|free/i.test(node.textContent || ""));
    const isPaid = !/free/i.test(metaPrice?.textContent || "");
    const actions = document.createElement("div");
    actions.className = "inline-actions";
    link.parentNode?.insertBefore(actions, link);
    actions.appendChild(link);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-action-btn";
    button.setAttribute("data-home-cart-button", bookId);
    button.dataset.mode = isPaid ? "cart" : "open";
    button.textContent = isPaid ? "Add To Cart" : "Open Free";
    actions.appendChild(button);
  });

  bindHomepageProductActions(root);
}

function upgradeReviewProofCards(root = document) {
  root.querySelectorAll(".review-proof-card").forEach((card) => {
    card.querySelectorAll("p").forEach((paragraph) => {
      paragraph.innerHTML = paragraph.innerHTML.replace(/â€¢|•/g, "-");
    });

    if (card.querySelector(".proof-link")) {
      return;
    }

    const title = card.querySelector(".testimonial-author strong")?.textContent?.trim();
    if (!title) {
      return;
    }

    const match = [...HOMEPAGE_STATE.trendingBooks, ...HOMEPAGE_STATE.newestBooks].find((book) => String(book.title || "").trim() === title);
    if (!match?._id) {
      return;
    }

    const link = document.createElement("a");
    link.className = "proof-link";
    link.href = `book_view.html?id=${encodeURIComponent(match._id)}`;
    link.textContent = "Open reviewed product";
    card.appendChild(link);
  });
}

async function addHomepageCart(bookId, button) {
  const { token } = getStoredSession();
  if (!token) {
    setHeroStatus("Sign in to save paid products and continue to checkout.", "warning");
    window.location.href = "login.html";
    return;
  }

  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Adding...";

  try {
    const response = await fetch(`${API_BASE}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "Unable to add this product to cart");
    }

    const alreadyInCart = Boolean(payload.alreadyInCart);
    button.textContent = alreadyInCart ? "Already In Cart" : "Go To Cart";
    button.dataset.mode = "cart-ready";
    setHeroStatus(
      alreadyInCart
        ? "This product is already in your cart and ready for checkout."
        : "Product added to cart. Your checkout flow is ready now.",
      "success"
    );
  } catch (error) {
    button.textContent = previousText;
    setHeroStatus(error.message || "Unable to update your cart right now.", "warning");
  } finally {
    button.disabled = false;
  }
}

function hydrateHeroCards(trendingBooks = [], newestBooks = []) {
  const primary = document.getElementById("heroPrimaryCard");
  const secondary = document.getElementById("heroSecondaryCard");
  const tertiary = document.getElementById("heroTertiaryCard");
  const candidates = dedupeBooks([
    ...newestBooks,
    ...trendingBooks,
  ]);

  if (primary && candidates[0]) {
    applyHeroProductCard(primary, candidates[0], {
      badge: candidates[0].isFeatured ? "FEATURED LIVE" : formatCurrencyOrFree(candidates[0].price),
      action: "Open Book",
      fallbackMeta: "Marketplace verified",
    });
  }

  if (secondary && candidates[1]) {
    applyHeroProductCard(secondary, candidates[1], {
      badge: "NEW DROP",
      action: "Explore Now",
      fallbackMeta: "Live creator product",
    });
  }

  if (tertiary && candidates[2]) {
    applyHeroProductCard(tertiary, candidates[2], {
      badge: candidates[2].isFeatured ? "FEATURED" : "LIVE PRODUCT",
      action: "Open Book",
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
  copy.textContent = `${book.category || "Book"} - ${book.language || "English"}`;
  if (small) {
    small.textContent = options.fallbackMeta || `${formatCompactNumber(book.views || 0)} views`;
  }
  if (button) {
    button.textContent = options.action || "Open Book";
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

function formatPlannerCurrency(value, currency = "INR") {
  const meta = PLANNER_CURRENCIES[currency] || PLANNER_CURRENCIES.INR;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: meta.code === "INR" ? 0 : 2,
  }).format(Number(value || 0));
}

function formatCompactNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = value;
}

function formatRatingLabel(book = {}) {
  const average = Number(book.ratingAverage || 0);
  const count = Number(book.ratingCount || 0);
  if (count > 0 && average > 0) {
    return `${average.toFixed(1)} - ${count.toLocaleString("en-IN")} ratings`;
  }
  return "Review signal warming";
}

function formatRatingSummary(average = 0, count = 0) {
  const safeAverage = Number(average || 0);
  const safeCount = Number(count || 0);
  if (safeCount > 0 && safeAverage > 0) {
    return `${safeAverage.toFixed(1)} - ${safeCount.toLocaleString("en-IN")} ratings`;
  }
  return "rating signal";
}

function buildStarRow(rating = 0) {
  const safe = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
  return Array.from({ length: 5 }, (_, index) => (index < safe ? "&#9733;" : "&#9734;")).join("");
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
