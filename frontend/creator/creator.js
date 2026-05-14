const API_BASE = window.API_BASE || "";
const FALLBACK_AVATAR = "../assets/default-avatar.png";

const state = {
  token: localStorage.getItem("token") || "",
  currentUser: getStoredUser(),
  username: "",
  profile: null,
  collections: {
    all: [],
    trending: [],
    free: [],
    paid: [],
  },
  activeCollection: "all",
};

const elements = {
  topbarActions: document.getElementById("topbarActions"),
  stateShell: document.getElementById("creatorState"),
  stateTitle: document.getElementById("stateTitle"),
  stateMessage: document.getElementById("stateMessage"),
  pageContent: document.getElementById("pageContent"),
  creatorBanner: document.getElementById("creatorBanner"),
  creatorAvatar: document.getElementById("creatorAvatar"),
  creatorBadgeChip: document.getElementById("creatorBadgeChip"),
  creatorBadgeLabel: document.getElementById("creatorBadgeLabel"),
  creatorName: document.getElementById("creatorName"),
  creatorRoleBadge: document.getElementById("creatorRoleBadge"),
  verifiedBadge: document.getElementById("verifiedBadge"),
  creatorUsername: document.getElementById("creatorUsername"),
  joinDate: document.getElementById("joinDate"),
  creatorBio: document.getElementById("creatorBio"),
  creatorCategories: document.getElementById("creatorCategories"),
  followBtn: document.getElementById("followBtn"),
  editProfileBtn: document.getElementById("editProfileBtn"),
  creatorWebsite: document.getElementById("creatorWebsite"),
  publicWebsiteLink: document.getElementById("publicWebsiteLink"),
  creatorAbout: document.getElementById("creatorAbout"),
  specialtyList: document.getElementById("specialtyList"),
  socialLinks: document.getElementById("socialLinks"),
  followersCount: document.getElementById("followersCount"),
  followingCount: document.getElementById("followingCount"),
  booksCount: document.getElementById("booksCount"),
  salesCount: document.getElementById("salesCount"),
  downloadsCount: document.getElementById("downloadsCount"),
  viewsCount: document.getElementById("viewsCount"),
  ratingsCount: document.getElementById("ratingsCount"),
  earningsCount: document.getElementById("earningsCount"),
  creatorScoreChip: document.getElementById("creatorScoreChip"),
  monthlyRevenueHeadline: document.getElementById("monthlyRevenueHeadline"),
  monthlySalesHeadline: document.getElementById("monthlySalesHeadline"),
  revenueTimeline: document.getElementById("revenueTimeline"),
  popularCategories: document.getElementById("popularCategories"),
  collectionTabs: document.getElementById("collectionTabs"),
  booksGrid: document.getElementById("booksGrid"),
  followersList: document.getElementById("followersList"),
  followingList: document.getElementById("followingList"),
  followersBadge: document.getElementById("followersBadge"),
  followingBadge: document.getElementById("followingBadge"),
  trendingCreators: document.getElementById("trendingCreators"),
};

document.addEventListener("DOMContentLoaded", initCreatorPage);

async function initCreatorPage() {
  renderTopbarActions();
  bindEvents();

  const queryUsername = new URLSearchParams(window.location.search).get("username");
  state.username = (queryUsername || state.currentUser?.username || "").trim().toLowerCase();

  if (!state.username) {
    await loadTrendingCreators();
    if (elements.trendingCreators.children.length) {
      showState("Choose a creator", "Open any trending creator card below to explore a real profile with live books and analytics.");
    } else {
      showState("No creator profiles yet", "Creator profiles will appear here automatically as real creators publish approved books.");
    }
    return;
  }

  await Promise.all([
    loadCreatorProfile(state.username),
    loadTrendingCreators(),
  ]);
}

function bindEvents() {
  elements.followBtn?.addEventListener("click", toggleFollowCreator);

  elements.collectionTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collection]");
    if (!button) {
      return;
    }

    state.activeCollection = button.dataset.collection || "all";
    document.querySelectorAll(".tab-btn").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });
    renderBookCollection();
  });
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function renderTopbarActions() {
  if (!elements.topbarActions) {
    return;
  }

  if (!state.token) {
    elements.topbarActions.innerHTML = `
      <a class="ghost-link" href="../login.html">Sign in</a>
      <a class="primary-link" href="../register.html">Create account</a>
    `;
    return;
  }

  const dashboardLink = state.currentUser?.role === "admin"
    ? "../admin/admin.html"
    : "../dashboard/dashboard.html";

  elements.topbarActions.innerHTML = `
    <a class="ghost-link" href="${dashboardLink}">Workspace</a>
    <button class="ghost-link" id="logoutBtn" type="button">Logout</button>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
      });
    } catch {
      // ignore logout network errors
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "../index.html";
  });
}

async function loadCreatorProfile(username) {
  showState("Loading creator profile...", "Fetching the creator identity, live books, and social metrics.");

  try {
    const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
    const response = await fetch(`${API_BASE}/api/creator/${encodeURIComponent(username)}`, { headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load creator profile");
    }

    state.profile = data;
    state.collections = data.books || state.collections;
    renderProfile(data);
    hideState();
  } catch (error) {
    console.error("Creator profile load failed:", error);
    showState("Creator profile unavailable", error.message || "We could not load this creator right now.");
  }
}

async function loadTrendingCreators() {
  try {
    const response = await fetch(`${API_BASE}/api/creator/trending?limit=6`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load trending creators");
    }

    renderTrendingCreators(data.creators || []);
  } catch (error) {
    console.error("Trending creators load failed:", error);
    renderTrendingCreators([]);
  }
}

function renderProfile(payload) {
  const creator = payload.creator || {};
  const analytics = payload.analytics || creator.stats || {};
  const relationship = payload.relationship || {};

  elements.creatorName.textContent = creator.name || "Creator";
  elements.creatorUsername.textContent = creator.username ? `@${creator.username}` : "@creator";
  elements.creatorBio.textContent = creator.bio || "This creator is growing a premium digital storefront on E-Book Market.";
  elements.creatorAbout.textContent = creator.about || creator.bio || "This creator has not added a longer story yet.";
  elements.creatorAvatar.src = resolveAssetUrl(creator.avatarUrl || creator.avatar || FALLBACK_AVATAR, FALLBACK_AVATAR);
  elements.creatorAvatar.alt = creator.name ? `${creator.name} avatar` : "Creator avatar";

  const banner = resolveAssetUrl(creator.bannerUrl || creator.bannerImage || "", "");
  elements.creatorBanner.style.backgroundImage = banner
    ? `linear-gradient(125deg, rgba(14, 22, 52, 0.86), rgba(18, 14, 43, 0.55)), url("${escapeAttribute(banner)}")`
    : "";

  elements.creatorBadgeChip.textContent = creator.badge || "Creator";
  elements.creatorBadgeLabel.textContent = creator.badge ? `${creator.badge} profile` : "Creator profile";
  elements.creatorRoleBadge.textContent = String(creator.role || "creator").toUpperCase();
  elements.verifiedBadge.classList.toggle("hidden", !creator.verified);
  elements.joinDate.textContent = creator.joinedAt
    ? `Joined ${formatDate(creator.joinedAt)}`
    : "Joined recently";

  renderChipList(elements.creatorCategories, creator.creatorCategories, "tag-chip");
  renderChipList(elements.specialtyList, creator.specialties, "specialty-chip");
  renderSocialLinks(creator.socialLinks || {});
  renderStats(analytics);
  renderAnalytics(analytics);
  renderPeopleList(elements.followersList, payload.followers || [], "No followers yet");
  renderPeopleList(elements.followingList, payload.following || [], "Not following anyone yet");
  renderProfileActions(creator, relationship);
  renderBookCollection();

  elements.followersBadge.textContent = formatCompactNumber(analytics.followersCount || 0);
  elements.followingBadge.textContent = formatCompactNumber(analytics.followingCount || 0);
}

function renderProfileActions(creator, relationship) {
  const isSelf = Boolean(relationship.isSelf);
  const isFollowing = Boolean(relationship.isFollowing);

  updateFollowButton(isFollowing, relationship.canFollow);
  elements.followBtn.classList.toggle("hidden", isSelf);

  if (isSelf) {
    elements.editProfileBtn.classList.remove("hidden");
  } else {
    elements.editProfileBtn.classList.add("hidden");
  }

  const website = creator.website || "";
  if (website) {
    elements.creatorWebsite.href = website;
    elements.creatorWebsite.classList.remove("hidden");
    elements.publicWebsiteLink.href = website;
    elements.publicWebsiteLink.classList.remove("hidden");
  } else {
    elements.creatorWebsite.classList.add("hidden");
    elements.publicWebsiteLink.classList.add("hidden");
  }
}

function renderStats(stats) {
  animateNumber(elements.followersCount, stats.followersCount || 0);
  animateNumber(elements.followingCount, stats.followingCount || 0);
  animateNumber(elements.booksCount, stats.totalBooks || 0);
  animateNumber(elements.salesCount, stats.totalSales || 0);
  animateNumber(elements.downloadsCount, stats.totalDownloads || 0);
  animateNumber(elements.viewsCount, stats.totalViews || 0);
  elements.ratingsCount.textContent = Number(stats.ratingCount || 0) > 0
    ? `${Number(stats.ratingAverage || 0).toFixed(1)} (${stats.ratingCount})`
    : "New";
  animateCurrency(elements.earningsCount, stats.totalEarnings || 0);
}

function renderAnalytics(stats) {
  const monthlyRevenue = stats.monthlyRevenue?.values || [];
  const monthlySales = stats.monthlySales?.values || [];
  const revenueLabels = stats.monthlyRevenue?.labels || [];
  const latestRevenue = monthlyRevenue.length ? monthlyRevenue[monthlyRevenue.length - 1] : 0;
  const latestSales = monthlySales.length ? monthlySales[monthlySales.length - 1] : 0;

  elements.creatorScoreChip.textContent = `Score ${stats.creatorScore || 0}`;
  elements.monthlyRevenueHeadline.textContent = formatCurrency(latestRevenue);
  elements.monthlySalesHeadline.textContent = formatCompactNumber(latestSales);

  renderRevenueTimeline(revenueLabels, monthlyRevenue);
  renderPopularCategories(stats.popularCategories || []);
}

function renderRevenueTimeline(labels, values) {
  if (!elements.revenueTimeline) {
    return;
  }

  if (!values.length) {
    elements.revenueTimeline.innerHTML = `<div class="empty-card">Monthly revenue will appear here after approved purchases start landing.</div>`;
    return;
  }

  const max = Math.max(...values, 1);
  elements.revenueTimeline.innerHTML = labels.map((label, index) => {
    const value = Number(values[index] || 0);
    const height = Math.max(8, Math.round((value / max) * 138));
    return `
      <div class="mini-bar">
        <div class="mini-bar-fill" style="height:${height}px"></div>
        <strong>${escapeHTML(formatCurrency(value, true))}</strong>
        <span>${escapeHTML(label)}</span>
      </div>
    `;
  }).join("");
}

function renderPopularCategories(categories) {
  if (!elements.popularCategories) {
    return;
  }

  if (!categories.length) {
    elements.popularCategories.innerHTML = `<div class="empty-card">Category insights will grow as this creator publishes more approved books.</div>`;
    return;
  }

  elements.popularCategories.innerHTML = categories.map((category) => `
    <div class="category-row">
      <strong>${escapeHTML(category.name || "Other")}</strong>
      <span>${formatCompactNumber(category.count || 0)} books</span>
      <span>${formatCompactNumber(category.count || 0)}x</span>
    </div>
  `).join("");
}

function renderBookCollection() {
  const books = Array.isArray(state.collections[state.activeCollection])
    ? state.collections[state.activeCollection]
    : [];

  if (!elements.booksGrid) {
    return;
  }

  if (!books.length) {
    elements.booksGrid.innerHTML = `
      <article class="empty-card">
        No books are available in this collection yet. As the creator uploads and gets books approved, they will appear here automatically.
      </article>
    `;
    return;
  }

  elements.booksGrid.innerHTML = books.map((book) => {
    const cover = resolveAssetUrl(book.coverUrl || book.coverImage || "", "../assets/covers/Ebook_AI.png");
    const isPaid = Number(book.price || 0) > 0;
    return `
      <article class="book-card">
        <img class="book-cover" src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title || "Book cover")}">
        <div class="book-content">
          <div class="book-label-row">
            <span class="pill ${isPaid ? "paid" : "free"}">${isPaid ? "Paid" : "Free"}</span>
            <span class="pill ${String(book.status || "").toLowerCase() === "approved" ? "success" : ""}">${escapeHTML(book.category || "Book")}</span>
          </div>
          <div>
            <h3>${escapeHTML(book.title || "Untitled book")}</h3>
            <p>${escapeHTML(book.description || "No description available yet.")}</p>
          </div>
          <div class="book-micro">
            <span>${formatCompactNumber(book.salesCount || 0)} sales</span>
            <span>${formatCompactNumber(book.downloads || 0)} downloads</span>
            <span>${formatCompactNumber(book.views || 0)} views</span>
          </div>
          <div class="book-micro">
            <strong>${escapeHTML(isPaid ? formatCurrency(book.price || 0) : "FREE")}</strong>
            <span>${escapeHTML(formatCurrency(book.earnings || 0, true))} earned</span>
          </div>
          <a class="book-link" href="../book_view.html?id=${encodeURIComponent(book._id || book.id || "")}">Open book</a>
        </div>
      </article>
    `;
  }).join("");
}

function renderPeopleList(container, people, emptyMessage) {
  if (!container) {
    return;
  }

  if (!people.length) {
    container.innerHTML = `<article class="empty-card">${escapeHTML(emptyMessage)}</article>`;
    return;
  }

  container.innerHTML = people.slice(0, 8).map((person) => `
    <article class="person-card">
      <img class="person-avatar" src="${escapeAttribute(resolveAssetUrl(person.avatarUrl || person.avatar || "", FALLBACK_AVATAR))}" alt="${escapeAttribute(person.name || "User")}">
      <div>
        <h3>${escapeHTML(person.name || "Member")}</h3>
        <p>${escapeHTML(person.bio || "Member on E-Book Market")}</p>
        <div class="person-meta">
          <span>@${escapeHTML(person.username || "member")}</span>
          <strong>${escapeHTML(String(person.role || "reader"))}</strong>
        </div>
      </div>
      <a class="person-link" href="creator.html?username=${encodeURIComponent(person.username || "")}">View</a>
    </article>
  `).join("");
}

function renderTrendingCreators(creators) {
  if (!elements.trendingCreators) {
    return;
  }

  if (!creators.length) {
    elements.trendingCreators.innerHTML = `<article class="empty-card">Trending creators will appear here once approved catalogs are live.</article>`;
    return;
  }

  elements.trendingCreators.innerHTML = creators.map((creator) => `
    <article class="trending-card">
      <img class="trending-avatar" src="${escapeAttribute(resolveAssetUrl(creator.avatarUrl || creator.avatar || "", FALLBACK_AVATAR))}" alt="${escapeAttribute(creator.name || "Creator")}">
      <div class="trending-meta">
        <h3>${escapeHTML(creator.name || "Creator")}</h3>
        <p>@${escapeHTML(creator.username || "creator")}</p>
        <strong>${formatCompactNumber(creator.stats?.followersCount || 0)} followers · ${formatCompactNumber(creator.stats?.totalBooks || 0)} books</strong>
      </div>
      <a class="trending-link" href="creator.html?username=${encodeURIComponent(creator.username || "")}">Open</a>
    </article>
  `).join("");
}

function renderChipList(container, items, className) {
  if (!container) {
    return;
  }

  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) {
    container.innerHTML = `<span class="${className}">Creator catalog</span>`;
    return;
  }

  container.innerHTML = safeItems.map((item) => `
    <span class="${className}">${escapeHTML(item)}</span>
  `).join("");
}

function renderSocialLinks(socialLinks) {
  if (!elements.socialLinks) {
    return;
  }

  const entries = [
    ["Website", state.profile?.creator?.website || ""],
    ["Twitter", socialLinks.twitter || ""],
    ["Instagram", socialLinks.instagram || ""],
    ["LinkedIn", socialLinks.linkedin || ""],
    ["YouTube", socialLinks.youtube || ""],
  ].filter((entry) => entry[1]);

  if (!entries.length) {
    elements.socialLinks.innerHTML = `<div class="empty-card">No social links added yet.</div>`;
    return;
  }

  elements.socialLinks.innerHTML = entries.map(([label, href]) => `
    <a class="ghost-btn" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeHTML(label)}</a>
  `).join("");
}

async function toggleFollowCreator() {
  if (!state.profile?.creator?.username) {
    return;
  }

  if (!state.token) {
    window.location.href = "../login.html";
    return;
  }

  elements.followBtn.disabled = true;
  const originalText = elements.followBtn.textContent;
  elements.followBtn.textContent = "Updating...";

  try {
    const response = await fetch(
      `${API_BASE}/api/creator/${encodeURIComponent(state.profile.creator.username)}/follow`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to update follow state");
    }

    state.profile.relationship = {
      ...(state.profile.relationship || {}),
      isFollowing: Boolean(data.following),
      canFollow: true,
    };

    state.profile.creator = state.profile.creator || {};
    state.profile.creator.stats = state.profile.creator.stats || {};
    state.profile.analytics = state.profile.analytics || {};
    state.profile.creator.stats.followersCount = Number(data.followersCount || 0);
    state.profile.analytics.followersCount = Number(data.followersCount || 0);
    updateFollowButton(Boolean(data.following), true);
    animateNumber(elements.followersCount, data.followersCount || 0);
    elements.followersBadge.textContent = formatCompactNumber(data.followersCount || 0);
  } catch (error) {
    console.error("Follow creator failed:", error);
    alert(error.message || "Unable to update follow state");
    elements.followBtn.textContent = originalText;
  } finally {
    elements.followBtn.disabled = false;
  }
}

function updateFollowButton(isFollowing, canFollow) {
  if (!elements.followBtn) {
    return;
  }

  if (!canFollow) {
    elements.followBtn.textContent = "Creator page";
    elements.followBtn.classList.remove("following");
    elements.followBtn.disabled = true;
    return;
  }

  elements.followBtn.disabled = false;
  elements.followBtn.classList.toggle("following", isFollowing);
  elements.followBtn.textContent = isFollowing ? "Following" : "Follow creator";
}

function showState(title, message) {
  elements.stateTitle.textContent = title;
  elements.stateMessage.textContent = message;
  elements.stateShell.classList.remove("hidden");
  elements.pageContent.classList.add("hidden");
}

function hideState() {
  elements.stateShell.classList.add("hidden");
  elements.pageContent.classList.remove("hidden");
}

function animateNumber(element, endValue) {
  if (!element) {
    return;
  }

  const finalValue = Number(endValue || 0);
  const startValue = Number(String(element.textContent || "0").replace(/[^\d.-]/g, "")) || 0;
  const duration = 500;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.round(startValue + (finalValue - startValue) * easeOut(progress));
    element.textContent = formatCompactNumber(value);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function animateCurrency(element, endValue) {
  if (!element) {
    return;
  }

  const finalValue = Number(endValue || 0);
  const startValue = Number(String(element.textContent || "0").replace(/[^\d.-]/g, "")) || 0;
  const duration = 560;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = startValue + (finalValue - startValue) * easeOut(progress);
    element.textContent = formatCurrency(value);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function easeOut(value) {
  return 1 - Math.pow(1 - value, 3);
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

function formatCompactNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatCurrency(value, compact = false) {
  const amount = Number(value || 0);
  if (compact) {
    return `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: amount % 1 ? 2 : 0 })}`;
  }

  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
