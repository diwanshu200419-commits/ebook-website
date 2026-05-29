const API_BASE = window.API_BASE || "";
const DASHBOARD_NOTICE_KEY = "ebook-market-dashboard-notice";

let dashboardChart = null;
const dashboardState = {
  token: "",
  notice: "",
  noticeType: "success",
  activatingCreator: false,
  revealObserver: null,
};

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  const token = getToken();
  if (!token) {
    return logoutAndRedirect();
  }

  dashboardState.token = token;
  hydrateStoredDashboardNotice();
  setupLogout();
  setupUnlockModal();

  try {
    const data = await fetchDashboardData(token);
    renderDashboard(data, token);
  } catch (error) {
    console.error("Dashboard load failed:", error);
    renderFatalState(error.message || "Unable to load dashboard");
  }
}

async function fetchDashboardData(token) {
  const response = await fetch(`${API_BASE}/api/dashboard/user`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    logoutAndRedirect();
    throw new Error("Session expired");
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load dashboard");
  }

  return data;
}

function getToken() {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") {
    return "";
  }

  return token;
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", logoutAndRedirect);
}

function setupUnlockModal() {
  const modal = document.getElementById("unlockModal");
  const closeBtn = document.getElementById("unlockCloseBtn");

  closeBtn?.addEventListener("click", closeUnlockModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeUnlockModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeUnlockModal();
    }
  });
}

function logoutAndRedirect() {
  fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true
  }).catch(() => null);

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../login.html";
}

function renderDashboard(data, token) {
  closeUnlockModal();

  localStorage.setItem("user", JSON.stringify({
    id: data.profile?.id,
    name: data.profile?.name,
    username: data.profile?.username,
    email: data.profile?.email,
    role: data.profile?.role || data.role,
    profileImage: data.profile?.avatar || ""
  }));

  const viewer = data.viewer === "creator" ? "creator" : "reader";

  renderNavigation(viewer, data);
  renderHero(viewer, data);
  renderSpotlight(viewer, data);
  renderJourney(viewer, data);
  renderFocus(viewer, data);
  renderSummary(viewer, data);
  renderChart(viewer, data);

  if (viewer === "creator") {
    renderCreatorBooks(data, token);
    renderCreatorTopBooks(data);
    renderCreatorActivity(data);
  } else {
    renderReaderPurchases(data, token);
    renderReaderOrders(data);
    renderReaderProfile(data);
  }

  finalizeDashboardRender();
}

function hydrateStoredDashboardNotice() {
  try {
    const raw = localStorage.getItem(DASHBOARD_NOTICE_KEY);
    if (!raw) {
      return;
    }

    localStorage.removeItem(DASHBOARD_NOTICE_KEY);
    const payload = JSON.parse(raw);
    const createdAt = Number(payload?.createdAt || 0);
    if (createdAt && Date.now() - createdAt > 1000 * 60 * 60 * 24) {
      return;
    }

    const message = String(payload?.message || "").trim();
    if (!message) {
      return;
    }

    dashboardState.notice = message;
    dashboardState.noticeType = String(payload?.type || "success").trim() || "success";
  } catch {
    localStorage.removeItem(DASHBOARD_NOTICE_KEY);
  }
}

function renderNavigation(viewer, data) {
  const creatorLinks = document.querySelectorAll("[data-creator-link]");
  creatorLinks.forEach((link) => {
    link.style.display = viewer === "creator" ? "" : "none";
  });

  setText("sidebarRole", viewer === "creator" ? "Creator Workspace" : "Reader Workspace");
  setText(
    "sidebarCalloutLabel",
    viewer === "creator" ? "Available balance" : "Unlocked products"
  );
  setText(
    "sidebarCalloutValue",
    viewer === "creator"
      ? formatCurrency(data.creatorStats?.walletBalance || 0)
      : `${data.readerStats?.downloadsUnlocked || 0} unlocked products`
  );
}

function renderHero(viewer, data) {
  const profile = data.profile || {};
  const joined = profile.joinedAt ? formatDate(profile.joinedAt) : "Recently";

  document.getElementById("profileAvatar").src = resolveAssetUrl(
    profile.avatar || "../assets/default-avatar.png"
  );
  setText("profileName", profile.name || "Member");
  setText("profileMeta", `${profile.username || "member"} | Joined ${joined}`);
  setText("profileRole", String(profile.role || viewer).toUpperCase());

  if (viewer === "creator") {
    setText("heroEyebrow", "Creator Dashboard");
    setText("dashboardTitle", `${profile.name || "Creator"}, your catalog is connected.`);
    setText(
      "dashboardSubtitle",
      "Track real earnings, product approvals, AI signals, and marketplace momentum from one place."
    );
    renderHeroActions(viewer);
    renderDashboardNotice();
    return;
  }

  setText("heroEyebrow", "Reader Dashboard");
  setText("dashboardTitle", `${profile.name || "Reader"}, your unlocks are live.`);
  setText(
    "dashboardSubtitle",
    "See what you purchased, what unlocks instantly, and switch on creator mode whenever you are ready to sell your own books, notes, and digital products."
  );
  renderHeroActions(viewer);
  renderDashboardNotice();
}

function renderSpotlight(viewer, data) {
  const spotlightGrid = document.getElementById("spotlightGrid");
  if (!spotlightGrid) {
    return;
  }

  const cards = viewer === "creator"
    ? [
        {
          label: "Wallet ready",
          value: data.creatorStats?.walletBalance || 0,
          format: "currency",
          note: `${numberText(data.creatorStats?.totalSales || 0)} sales processed`,
          accent: "violet",
        },
        {
          label: "Catalog live",
          value: data.creatorStats?.totalBooks || 0,
          format: "number",
          note: `${numberText(getStatusCount(data.statusBreakdown, "approved"))} approved products`,
          accent: "cyan",
        },
        {
          label: "Audience reach",
          value: data.creatorStats?.totalViews || 0,
          format: "number",
          note: `${numberText(data.creatorStats?.totalDownloads || 0)} downloads recorded`,
          accent: "emerald",
        },
      ]
    : [
        {
          label: "Unlock vault",
          value: data.readerStats?.downloadsUnlocked || 0,
          format: "number",
          note: `${numberText(data.readerStats?.totalPurchased || 0)} approved purchases`,
          accent: "violet",
        },
        {
          label: "Learning spend",
          value: data.readerStats?.totalSpent || 0,
          format: "currency",
          note: "Only approved transactions are counted",
          accent: "cyan",
        },
        {
          label: "Payments in motion",
          value: data.readerStats?.pendingOrders || 0,
          format: "number",
          note: `${numberText(data.readerStats?.rejectedOrders || 0)} need attention`,
          accent: "amber",
        },
      ];

  spotlightGrid.innerHTML = cards.map((card) => `
    <article class="spotlight-card accent-${escapeAttribute(card.accent)}" data-reveal>
      <div class="spotlight-glow"></div>
      <p>${escapeHTML(card.label)}</p>
      ${buildMetricMarkup(card.value, card.format, "spotlight-value")}
      <span>${escapeHTML(card.note)}</span>
    </article>
  `).join("");
}

function renderJourney(viewer, data) {
  setText("journeyKicker", viewer === "creator" ? "Creator runway" : "Member runway");
  setText(
    "journeyTitle",
    viewer === "creator" ? "Turn uploads into repeat revenue" : "Move from learner to seller"
  );
  setText("journeyBadge", viewer === "creator" ? "Revenue milestones" : "Growth milestones");

  const journeyBody = document.getElementById("journeyBody");
  if (!journeyBody) {
    return;
  }

  const items = viewer === "creator"
    ? buildCreatorJourney(data)
    : buildReaderJourney(data);

  journeyBody.innerHTML = items.map((item, index) => `
    <article class="journey-item status-${escapeAttribute(item.status)}">
      <div class="journey-marker">
        <span>${index + 1}</span>
      </div>
      <div class="journey-copy">
        <div class="journey-topline">
          <h3>${escapeHTML(item.title)}</h3>
          <span class="journey-state">${escapeHTML(item.state)}</span>
        </div>
        <p>${escapeHTML(item.description)}</p>
      </div>
    </article>
  `).join("");
}

function renderFocus(viewer, data) {
  setText("focusKicker", viewer === "creator" ? "Daily ops" : "Launchpad");
  setText("focusTitle", viewer === "creator" ? "Highest-impact creator moves" : "Your best next moves");
  setText("focusBadge", viewer === "creator" ? "Operator mode" : "Reader mode");

  const focusBody = document.getElementById("focusBody");
  if (!focusBody) {
    return;
  }

  const actions = viewer === "creator"
    ? [
        {
          title: "Publish next product",
          description: "Launch another asset, prompt pack, or study product to keep catalog momentum up.",
          href: "upload.html",
          label: "Upload now",
          variant: "solid",
        },
        {
          title: "Tune your storefront",
          description: "Update creator profile, banner, and social proof so more viewers convert into followers.",
          href: "setting.html",
          label: "Open settings",
          variant: "ghost",
        },
        {
          title: "Track revenue quality",
          description: "Review earnings, conversions, and which products are doing the heavy lifting.",
          href: "earning.html",
          label: "View earnings",
          variant: "ghost",
        },
      ]
    : [
        {
          title: "Find your next unlock",
          description: "Browse products, prompt packs, and notes that are already tailored for student creators.",
          href: "../explore.html",
          label: "Open marketplace",
          variant: "solid",
        },
        {
          title: "Switch on creator mode",
          description: "Enable creator tools once, then you can upload notes, books, prompts, and templates.",
          action: "activate-creator",
          label: dashboardState.activatingCreator ? "Enabling..." : "Become creator",
          variant: "ghost",
          disabled: dashboardState.activatingCreator,
        },
        {
          title: "Polish your public identity",
          description: "Add a profile photo, bio, and creator details before you start selling globally.",
          href: "setting.html",
          label: "Edit profile",
          variant: "ghost",
        },
      ];

  const signals = viewer === "creator"
    ? [
        `Top category: ${getTopKey(data.categoryCounts) || "Build your first niche"}`,
        `Approval mix: ${buildCompactStatus(data.statusBreakdown || {})}`,
        `Current month: ${formatCurrency(data.creatorStats?.monthlyEarnings || 0)}`,
      ]
    : [
        `Recent spend: ${formatCurrency(data.readerStats?.totalSpent || 0)}`,
        `Last login: ${formatRelativeDate(data.profile?.lastLogin)}`,
        data.readerStats?.pendingOrders
          ? `${numberText(data.readerStats.pendingOrders)} payment records are still being reviewed`
          : "No payment approvals are waiting right now",
      ];

  focusBody.innerHTML = `
    <div class="focus-actions">
      ${actions.map((action) => `
        <article class="action-card">
          <h3>${escapeHTML(action.title)}</h3>
          <p>${escapeHTML(action.description)}</p>
          ${action.href
            ? `<a class="${escapeAttribute(action.variant === "solid" ? "solid-btn" : "ghost-link")} focus-btn" href="${escapeAttribute(action.href)}">${escapeHTML(action.label)}</a>`
            : `<button class="${escapeAttribute(action.variant === "solid" ? "solid-btn" : "ghost-btn")} focus-btn" type="button" data-dashboard-action="${escapeAttribute(action.action || "")}" ${action.disabled ? "disabled" : ""}>${escapeHTML(action.label)}</button>`
          }
        </article>
      `).join("")}
    </div>
    <div class="signal-cluster">
      ${signals.map((signal) => `<div class="signal-pill">${escapeHTML(signal)}</div>`).join("")}
    </div>
  `;

  focusBody.querySelectorAll("[data-dashboard-action='activate-creator']").forEach((button) => {
    button.addEventListener("click", activateCreatorModeFromDashboard);
  });
}

function renderHeroActions(viewer) {
  const heroActions = document.getElementById("heroActions");
  if (!heroActions) {
    return;
  }

  if (viewer === "creator") {
    heroActions.innerHTML = `
      <a class="solid-btn hero-action-btn" href="upload.html">Upload a product</a>
      <a class="ghost-link hero-action-btn" href="analytics.html">Open analytics</a>
    `;
    return;
  }

  heroActions.innerHTML = `
    <button class="solid-btn hero-action-btn" id="activateCreatorDashboardBtn" type="button">
      ${dashboardState.activatingCreator ? "Enabling creator mode..." : "Become creator"}
    </button>
    <a class="ghost-link hero-action-btn" href="setting.html">Creator settings</a>
  `;

  const activateBtn = document.getElementById("activateCreatorDashboardBtn");
  if (activateBtn) {
    activateBtn.disabled = dashboardState.activatingCreator;
    activateBtn.addEventListener("click", activateCreatorModeFromDashboard);
  }
}

function renderDashboardNotice() {
  const notice = document.getElementById("dashboardNotice");
  if (!notice) {
    return;
  }

  if (!dashboardState.notice) {
    notice.className = "dashboard-notice hidden";
    notice.textContent = "";
    return;
  }

  notice.className = `dashboard-notice ${dashboardState.noticeType || "success"}`;
  notice.textContent = dashboardState.notice;
}

async function activateCreatorModeFromDashboard() {
  if (dashboardState.activatingCreator || !dashboardState.token) {
    return;
  }

  dashboardState.activatingCreator = true;
  dashboardState.notice = "";
  renderHeroActions("reader");
  renderDashboardNotice();

  try {
    const response = await fetch(`${API_BASE}/api/creator/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dashboardState.token}`
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Unable to activate creator mode");
    }

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({
      ...currentUser,
      role: payload.role || "creator"
    }));

    dashboardState.notice = "Creator mode is active. Your dashboard has been upgraded and you can now upload products.";
    dashboardState.noticeType = "success";
    const refreshed = await fetchDashboardData(dashboardState.token);
    renderDashboard(refreshed, dashboardState.token);
  } catch (error) {
    dashboardState.notice = error.message || "Unable to activate creator mode right now.";
    dashboardState.noticeType = "error";
    renderDashboardNotice();
  } finally {
    dashboardState.activatingCreator = false;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    renderHeroActions(
      String(user.role || "").toLowerCase() === "creator" || String(user.role || "").toLowerCase() === "author"
        ? "creator"
        : "reader"
    );
    renderDashboardNotice();
  }
}

function renderSummary(viewer, data) {
  const summaryGrid = document.getElementById("summaryGrid");
  const cards = viewer === "creator"
    ? [
        {
          label: "Total earnings",
          value: data.creatorStats?.totalEarnings || 0,
          format: "currency",
          note: `${numberText(data.creatorStats?.totalSales || 0)} confirmed sales`,
          chip: "Cash flow",
          meter: getProgressMeter(data.creatorStats?.totalSales || 0, 25),
          tone: "violet",
        },
        {
          label: "This month",
          value: data.creatorStats?.monthlyEarnings || 0,
          format: "currency",
          note: "Current month revenue",
          chip: "Velocity",
          meter: getProgressMeter(data.creatorStats?.monthlyEarnings || 0, 10000),
          tone: "cyan",
        },
        {
          label: "Marketplace reach",
          value: data.creatorStats?.totalViews || 0,
          format: "number",
          note: `${numberText(data.creatorStats?.totalDownloads || 0)} downloads recorded`,
          chip: "Audience",
          meter: getProgressMeter(data.creatorStats?.totalViews || 0, 5000),
          tone: "emerald",
        },
        {
          label: "Creator score",
          value: data.creatorStats?.creatorScore || 0,
          format: "number",
          suffix: "/100",
          note: `${numberText(data.creatorStats?.totalBooks || 0)} active products`,
          chip: "Trust",
          meter: Number(data.creatorStats?.creatorScore || 0),
          tone: "amber",
        }
      ]
    : [
        {
          label: "Purchased products",
          value: data.readerStats?.totalPurchased || 0,
          format: "number",
          note: `${numberText(data.readerStats?.downloadsUnlocked || 0)} ready to access`,
          chip: "Library",
          meter: getProgressMeter(data.readerStats?.downloadsUnlocked || 0, 12),
          tone: "violet",
        },
        {
          label: "Total spent",
          value: data.readerStats?.totalSpent || 0,
          format: "currency",
          note: "Approved purchases only",
          chip: "Investment",
          meter: getProgressMeter(data.readerStats?.totalSpent || 0, 12000),
          tone: "cyan",
        },
        {
          label: "Pending payments",
          value: data.readerStats?.pendingOrders || 0,
          format: "number",
          note: "Waiting for review or confirmation",
          chip: "Ops",
          meter: getInverseProgressMeter(data.readerStats?.pendingOrders || 0, 6),
          tone: "amber",
        },
        {
          label: "Creator readiness",
          value: getCreatorReadinessScore(data),
          format: "number",
          suffix: "/100",
          note: "Profile and buyer journey readiness",
          chip: "Launch",
          meter: getCreatorReadinessScore(data),
          tone: "emerald",
        }
      ];

  summaryGrid.innerHTML = cards.map((card) => `
    <article class="summary-card tone-${escapeAttribute(card.tone)}" data-reveal>
      <div class="summary-topline">
        <p>${escapeHTML(card.label)}</p>
        <span class="summary-chip">${escapeHTML(card.chip)}</span>
      </div>
      ${buildMetricMarkup(card.value, card.format, "metric-value", card.suffix || "")}
      <div class="summary-meter"><span style="width: ${Math.max(10, Math.min(100, card.meter || 0))}%"></span></div>
      <span>${escapeHTML(card.note)}</span>
    </article>
  `).join("");
}

function renderChart(viewer, data) {
  const empty = document.getElementById("chartEmpty");
  const canvas = document.getElementById("dashboardChart");
  const context = canvas.getContext("2d");

  const chartData = viewer === "creator"
    ? {
        labels: data.chart?.labels || [],
        values: data.chart?.values || [],
        title: "Monthly creator earnings",
        kicker: "Revenue",
        badge: "MongoDB-backed",
        type: "line"
      }
    : {
        labels: ["Approved", "Pending", "Rejected"],
        values: [
          data.readerStats?.totalPurchased || 0,
          data.readerStats?.pendingOrders || 0,
          data.readerStats?.rejectedOrders || 0
        ],
        title: "Payment status overview",
        kicker: "Payments",
        badge: "Live unlock records",
        type: "doughnut"
      };

  setText("chartTitle", chartData.title);
  setText("chartKicker", chartData.kicker);
  setText("chartBadge", chartData.badge);

  const hasSignal = chartData.values.some((value) => Number(value || 0) > 0);
  empty.classList.toggle("hidden", hasSignal);
  canvas.classList.toggle("hidden", !hasSignal);

  if (dashboardChart) {
    dashboardChart.destroy();
    dashboardChart = null;
  }

  if (!hasSignal) {
    return;
  }

  const creatorGradient = context.createLinearGradient(0, 0, 0, 320);
  creatorGradient.addColorStop(0, "rgba(139, 92, 246, 0.38)");
  creatorGradient.addColorStop(1, "rgba(34, 211, 238, 0.04)");

  dashboardChart = new Chart(context, {
    type: chartData.type,
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: viewer === "creator" ? "Revenue" : "Orders",
          data: chartData.values,
          borderColor: "#8b5cf6",
          backgroundColor: viewer === "creator"
            ? creatorGradient
            : ["#8b5cf6", "#0ea5e9", "#fb7185"],
          fill: viewer === "creator",
          pointBackgroundColor: "#22d3ee",
          pointBorderColor: "#e2e8f0",
          pointRadius: viewer === "creator" ? 4 : 0,
          pointHoverRadius: viewer === "creator" ? 6 : 0,
          tension: 0.38,
          borderWidth: 2.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: viewer === "creator" ? 0 : "68%",
      animation: {
        duration: 950,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          labels: {
            color: "#cbd5e1"
          }
        }
      },
      scales: viewer === "creator"
        ? {
            x: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.12)" }
            },
            y: {
              ticks: {
                color: "#94a3b8",
                callback: (value) => `Rs. ${value}`
              },
              grid: { color: "rgba(148, 163, 184, 0.12)" }
            }
          }
        : {}
    }
  });
}

function renderReaderPurchases(data, token) {
  setText("primaryKicker", "Library");
  setText("primaryTitle", "Purchased products");

  const action = document.getElementById("primaryAction");
  action.href = "../explore.html";
  action.textContent = "Explore marketplace";

  const grid = document.getElementById("primaryGrid");
  const empty = document.getElementById("primaryEmpty");
  const purchases = data.purchases || [];

  if (!purchases.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    empty.textContent = "No approved purchases yet. When you buy a product, it will appear here with the right unlock flow automatically.";
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = purchases.map((purchase, index) => {
    const delivery = normalizeDelivery(purchase.delivery);
    const useUnlockModal = shouldUseUnlockModal(purchase);
    const productType = formatProductType(purchase.type || purchase.category || "Product");
    const creatorLine = [productType, purchase.authorName || "Creator"].join(" | ");

    return `
      <article class="book-card">
        <img src="${escapeAttribute(resolveAssetUrl(purchase.coverUrl || purchase.coverImage || "../assets/covers/Ebook_AI.png"))}" alt="${escapeAttribute(purchase.title)}">
        <div class="book-card-body">
          <span class="status-pill success">${escapeHTML(purchase.status)}</span>
          <span class="type-pill">${escapeHTML(productType)}</span>
          <h3>${escapeHTML(purchase.title)}</h3>
          <p>${escapeHTML(creatorLine)}</p>
          <div class="delivery-note">
            <strong>${escapeHTML(delivery.label || "Digital delivery")}</strong>
            <span>${escapeHTML(buildDeliveryNote(delivery))}</span>
          </div>
          <div class="book-meta">
            <span>${formatCurrency(purchase.amount || 0)}</span>
            <span>${formatDate(purchase.purchaseDate)}</span>
          </div>
          <div class="card-actions">
            ${useUnlockModal
              ? `<button class="solid-btn" type="button" data-unlock-index="${index}">${escapeHTML(getUnlockActionLabel(purchase))}</button>`
              : `<a class="solid-btn" href="${escapeAttribute(buildDownloadHref(purchase.downloadAccessUrl, purchase.downloadUrl, token))}">${escapeHTML(getUnlockActionLabel(purchase))}</a>`
            }
            <a class="ghost-link" href="../book_view.html?id=${encodeURIComponent(purchase.bookId)}">Open details</a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-unlock-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const purchase = purchases[Number(button.dataset.unlockIndex)];
      if (purchase) {
        openUnlockModal(purchase, token);
      }
    });
  });
}

function renderReaderOrders(data) {
  setText("secondaryKicker", "Payments");
  setText("secondaryTitle", "Order history");

  const body = document.getElementById("secondaryBody");
  const orders = data.orderHistory || [];

  if (!orders.length) {
    body.innerHTML = "<div class=\"empty-copy\">No payment history yet. Stripe and manual checkout records will appear here automatically.</div>";
    return;
  }

  body.innerHTML = `
    <div class="data-list">
      ${orders.map((order) => `
        <article class="data-row">
          <div>
            <h3>${escapeHTML(order.title)}</h3>
            <p>${escapeHTML(`${formatProductType(order.type || "Product")} | ${order.transactionId || "Transaction pending"}`)}</p>
          </div>
          <div class="data-row-meta">
            <span class="status-pill ${statusClass(order.status)}">${escapeHTML(order.status)}</span>
            <strong>${formatCurrency(order.amount || 0)}</strong>
            <small>${formatDate(order.purchaseDate)}</small>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderReaderProfile(data) {
  setText("activityKicker", "Account");
  setText("activityTitle", "Profile snapshot");

  const profile = data.profile || {};
  const body = document.getElementById("activityBody");

  body.innerHTML = `
    <div class="profile-grid">
      <article class="mini-card">
        <span>Username</span>
        <strong>${escapeHTML(profile.username || "member")}</strong>
      </article>
      <article class="mini-card">
        <span>Role</span>
        <strong>${escapeHTML(profile.role || "reader")}</strong>
      </article>
      <article class="mini-card">
        <span>Joined</span>
        <strong>${escapeHTML(formatDate(profile.joinedAt))}</strong>
      </article>
      <article class="mini-card">
        <span>Email</span>
        <strong>${escapeHTML(profile.email || "Not available")}</strong>
      </article>
    </div>
  `;
}

function renderCreatorBooks(data, token) {
  setText("primaryKicker", "Catalog");
  setText("primaryTitle", "Uploaded products");

  const action = document.getElementById("primaryAction");
  action.href = "upload.html";
  action.textContent = "Upload a new product";

  const grid = document.getElementById("primaryGrid");
  const empty = document.getElementById("primaryEmpty");
  const books = data.uploadedBooks || [];

  if (!books.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    empty.textContent = "No uploads yet. Your first approved product will immediately become available for marketplace discovery.";
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = books.map((book) => `
    <article class="book-card">
      <img src="${escapeAttribute(resolveAssetUrl(book.coverUrl || book.coverImage || "../assets/covers/Ebook_AI.png"))}" alt="${escapeAttribute(book.title)}">
      <div class="book-card-body">
        <span class="status-pill ${statusClass(book.status)}">${escapeHTML(book.status)}</span>
        <span class="type-pill">${escapeHTML(formatProductType(book.type || "Product"))}</span>
        <h3>${escapeHTML(book.title)}</h3>
        <p>${escapeHTML(`${book.category || "General"} | ${book.isPaid ? formatCurrency(book.price || 0) : "Free"}`)}</p>
        <div class="book-meta">
          <span>${numberText(book.salesCount || 0)} sales</span>
          <span>${formatCurrency(book.earnings || 0)}</span>
        </div>
        <div class="book-meta">
          <span>AI: ${escapeHTML(book.aiProcessingState || book.aiStatus || "idle")}</span>
          <span>${escapeHTML(book.aiSuggestion || "AI review details will appear here.")}</span>
        </div>
        <div class="card-actions">
          <a class="solid-btn" href="content.html">Manage</a>
          <a class="ghost-link" href="${escapeAttribute(buildDownloadHref(book.downloadAccessUrl, book.downloadUrl, token))}">Download</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderCreatorTopBooks(data) {
  setText("secondaryKicker", "Performance");
  setText("secondaryTitle", "Top performing products");

  const body = document.getElementById("secondaryBody");
  const topBooks = data.topBooks || [];

  if (!topBooks.length) {
    body.innerHTML = "<div class=\"empty-copy\">No performance data yet. Sales, earnings, and download leaders will appear after your first transactions.</div>";
    return;
  }

  body.innerHTML = `
    <div class="data-list">
      ${topBooks.map((book) => `
        <article class="data-row">
          <div>
            <h3>${escapeHTML(book.title)}</h3>
            <p>${escapeHTML(book.category || "General")}</p>
          </div>
          <div class="data-row-meta">
            <strong>${formatCurrency(book.earnings || 0)}</strong>
            <small>${escapeHTML(`${numberText(book.sales || 0)} sales | ${numberText(book.downloads || 0)} downloads`)}</small>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderCreatorActivity(data) {
  setText("activityKicker", "Sales");
  setText("activityTitle", "Recent creator activity");

  const body = document.getElementById("activityBody");
  const sales = data.recentSales || [];

  if (!sales.length) {
    body.innerHTML = `
      <div class="profile-grid">
        <article class="mini-card">
          <span>Approval statuses</span>
          <strong>${escapeHTML(buildCompactStatus(data.statusBreakdown || {}))}</strong>
        </article>
        <article class="mini-card">
          <span>Category coverage</span>
          <strong>${escapeHTML(buildCompactStatus(data.categoryCounts || {}))}</strong>
        </article>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="data-list">
      ${sales.map((sale) => `
        <article class="data-row">
          <div>
            <h3>${escapeHTML(sale.book)}</h3>
            <p>${escapeHTML(sale.buyer || "Buyer")}</p>
          </div>
          <div class="data-row-meta">
            <span class="status-pill success">${escapeHTML(sale.status)}</span>
            <strong>${formatCurrency(sale.amount || 0)}</strong>
            <small>${formatDate(sale.createdAt)}</small>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function openUnlockModal(purchase, token) {
  const modal = document.getElementById("unlockModal");
  const content = document.getElementById("unlockContent");
  if (!modal || !content || !purchase) {
    return;
  }

  const delivery = normalizeDelivery(purchase.delivery);
  const sections = [];

  if (delivery.includedItems.length) {
    sections.push(`
      <section class="unlock-section">
        <h3>Included in this unlock</h3>
        <div class="unlock-tags">
          ${delivery.includedItems.map((item) => `<span class="unlock-tag">${escapeHTML(item)}</span>`).join("")}
        </div>
      </section>
    `);
  }

  if (delivery.instructions) {
    sections.push(`
      <section class="unlock-section">
        <h3>How to use it</h3>
        <p>${escapeHTML(delivery.instructions)}</p>
      </section>
    `);
  }

  if (delivery.unlockedText) {
    sections.push(`
      <section class="unlock-section">
        <h3>Instant unlock</h3>
        <div class="unlock-copy">${formatMultilineText(delivery.unlockedText)}</div>
      </section>
    `);
  }

  if (!sections.length) {
    sections.push(`
      <section class="unlock-section">
        <h3>Delivery ready</h3>
        <p>${escapeHTML(buildDeliveryNote(delivery))}</p>
      </section>
    `);
  }

  const actions = [
    purchase.canDownload && (purchase.downloadAccessUrl || purchase.downloadUrl)
      ? `<a class="solid-btn" href="${escapeAttribute(buildDownloadHref(purchase.downloadAccessUrl, purchase.downloadUrl, token))}">Download file</a>`
      : "",
    delivery.externalUrl
      ? `<a class="ghost-link" href="${escapeAttribute(delivery.externalUrl)}" target="_blank" rel="noreferrer">Open delivery link</a>`
      : "",
    `<a class="ghost-btn" href="../book_view.html?id=${encodeURIComponent(purchase.bookId)}">Open product page</a>`
  ].filter(Boolean);

  content.innerHTML = `
    <div class="unlock-header">
      <span class="status-pill success">Unlocked</span>
      <h2 id="unlockTitle">${escapeHTML(purchase.title)}</h2>
      <div class="unlock-meta">
        <span>${escapeHTML(formatProductType(purchase.type || "Product"))}</span>
        <span>${escapeHTML(purchase.authorName || "Creator")}</span>
        <span>${escapeHTML(formatDate(purchase.purchaseDate))}</span>
        <span>${escapeHTML(formatCurrency(purchase.amount || 0))}</span>
      </div>
      <p>${escapeHTML(delivery.label || "Digital delivery")}</p>
    </div>
    <div class="unlock-grid">
      ${sections.join("")}
    </div>
    <div class="unlock-actions">
      ${actions.join("")}
    </div>
  `;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeUnlockModal() {
  const modal = document.getElementById("unlockModal");
  const content = document.getElementById("unlockContent");
  if (!modal || modal.classList.contains("hidden")) {
    document.body.style.overflow = "";
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (content) {
    content.innerHTML = "";
  }
}

function shouldUseUnlockModal(purchase) {
  const delivery = normalizeDelivery(purchase?.delivery);
  return Boolean(
    delivery.hasText ||
    delivery.hasExternalUrl ||
    delivery.instructions ||
    delivery.includedItems.length ||
    delivery.mode !== "file"
  );
}

function getUnlockActionLabel(purchase) {
  const delivery = normalizeDelivery(purchase?.delivery);
  if (delivery.hasText && purchase?.canDownload) {
    return "Open unlock";
  }
  if (delivery.hasText) {
    return "View access";
  }
  if (delivery.hasExternalUrl) {
    return "Open access";
  }
  if (purchase?.canDownload) {
    return "Download";
  }
  return "View unlock";
}

function normalizeDelivery(delivery = {}) {
  const includedItems = Array.isArray(delivery.includedItems)
    ? delivery.includedItems.filter((item) => String(item || "").trim())
    : [];
  const externalUrl = String(delivery.externalUrl || "").trim();
  const unlockedText = String(delivery.unlockedText || "").trim();

  return {
    mode: String(delivery.mode || "file").toLowerCase(),
    label: String(delivery.label || "Digital delivery").trim() || "Digital delivery",
    instructions: String(delivery.instructions || "").trim(),
    includedItems,
    externalUrl,
    previewText: String(delivery.previewText || "").trim(),
    unlockedText,
    hasFile: Boolean(delivery.hasFile),
    hasText: Boolean(delivery.hasText || unlockedText),
    hasExternalUrl: Boolean(delivery.hasExternalUrl || externalUrl)
  };
}

function buildDeliveryNote(delivery) {
  const parts = [];

  if (delivery.hasFile) {
    parts.push("Secure download included");
  }
  if (delivery.hasText) {
    parts.push("Instant text unlock");
  }
  if (delivery.hasExternalUrl) {
    parts.push("External access link included");
  }
  if (delivery.includedItems.length) {
    parts.push(`Includes ${delivery.includedItems.slice(0, 3).join(", ")}`);
  }
  if (!parts.length) {
    parts.push("Ready for digital delivery");
  }

  return parts.join(" | ");
}

function formatProductType(value) {
  const source = String(value || "Product")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return source.replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderFatalState(message) {
  closeUnlockModal();
  setText("dashboardTitle", "We could not load your dashboard");
  setText("dashboardSubtitle", message);
  document.getElementById("spotlightGrid").innerHTML = "";
  document.getElementById("journeyBody").innerHTML = `<div class="empty-copy">${escapeHTML(message)}</div>`;
  document.getElementById("focusBody").innerHTML = "<div class=\"empty-copy\">Refresh this page after logging in again.</div>";
  document.getElementById("summaryGrid").innerHTML = `
    <article class="summary-card">
      <p>Status</p>
      <h3>Offline</h3>
      <span>${escapeHTML(message)}</span>
    </article>
  `;
  document.getElementById("primaryGrid").innerHTML = "";
  document.getElementById("secondaryBody").innerHTML = `<div class="empty-copy">${escapeHTML(message)}</div>`;
  document.getElementById("activityBody").innerHTML = "<div class=\"empty-copy\">Try signing out and back in, then refresh this page.</div>";
  document.getElementById("chartEmpty").classList.remove("hidden");
  document.getElementById("dashboardChart").classList.add("hidden");
}

function finalizeDashboardRender() {
  window.requestAnimationFrame(() => {
    animateMetricValues();
    setupRevealAnimations();
  });
}

function setupRevealAnimations() {
  const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!nodes.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  dashboardState.revealObserver?.disconnect();
  dashboardState.revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        dashboardState.revealObserver?.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -40px 0px",
  });

  nodes.forEach((node, index) => {
    node.classList.remove("is-visible");
    node.style.setProperty("--reveal-delay", `${Math.min(index * 70, 420)}ms`);
    dashboardState.revealObserver.observe(node);
  });
}

function animateMetricValues() {
  document.querySelectorAll(".metric-value[data-count]").forEach((element) => {
    const target = Number(element.dataset.count || 0);
    if (!Number.isFinite(target)) {
      return;
    }

    const format = element.dataset.format || "number";
    const prefix = element.dataset.prefix || "";
    const suffix = element.dataset.suffix || "";
    const duration = 820;
    const start = performance.now();

    const tick = (timestamp) => {
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      element.textContent = formatMetricValue(current, format, prefix, suffix, progress < 1);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    window.requestAnimationFrame(tick);
  });
}

function buildMetricMarkup(value, format, className = "metric-value", suffix = "") {
  const numericValue = Number(value || 0);
  const prefix = format === "currency" ? "Rs. " : "";
  const display = formatMetricValue(numericValue, format, prefix, suffix, false);

  return `
    <h3
      class="${escapeAttribute(className)} metric-value"
      data-count="${escapeAttribute(String(numericValue))}"
      data-format="${escapeAttribute(format || "number")}"
      data-prefix="${escapeAttribute(prefix)}"
      data-suffix="${escapeAttribute(suffix)}"
    >${escapeHTML(display)}</h3>
  `;
}

function formatMetricValue(value, format = "number", prefix = "", suffix = "", inFlight = false) {
  const safeValue = Math.max(0, Number(value || 0));
  const numericText = Math.round(inFlight ? safeValue : safeValue).toLocaleString("en-IN");
  if (format === "currency") {
    return `${prefix || "Rs. "}${numericText}${suffix}`;
  }
  return `${prefix}${numericText}${suffix}`;
}

function buildReaderJourney(data) {
  const totalPurchased = Number(data.readerStats?.totalPurchased || 0);
  const pendingOrders = Number(data.readerStats?.pendingOrders || 0);
  const readiness = getCreatorReadinessScore(data);

  return [
    {
      title: "Account ready",
      state: "Live",
      status: "complete",
      description: "Your member account is active and connected to the marketplace.",
    },
    {
      title: "Unlock your first product",
      state: totalPurchased > 0 ? "Completed" : "Next step",
      status: totalPurchased > 0 ? "complete" : "active",
      description: totalPurchased > 0
        ? `${numberText(totalPurchased)} products are already inside your dashboard library.`
        : "Buy one product and your secure unlock flow will appear here instantly.",
    },
    {
      title: "Clear payment queue",
      state: pendingOrders > 0 ? "In review" : "Stable",
      status: pendingOrders > 0 ? "active" : "complete",
      description: pendingOrders > 0
        ? `${numberText(pendingOrders)} manual or delayed payments are still being reviewed.`
        : "There are no pending payment issues blocking your library right now.",
    },
    {
      title: "Launch creator mode",
      state: readiness >= 70 ? "Ready" : "Prepare",
      status: readiness >= 70 ? "active" : "locked",
      description: "Complete your profile and switch on creator mode when you want to start selling.",
    },
  ];
}

function buildCreatorJourney(data) {
  const totalBooks = Number(data.creatorStats?.totalBooks || 0);
  const approvedBooks = getStatusCount(data.statusBreakdown, "approved");
  const totalSales = Number(data.creatorStats?.totalSales || 0);
  const monthlyEarnings = Number(data.creatorStats?.monthlyEarnings || 0);

  return [
    {
      title: "Creator mode enabled",
      state: "Completed",
      status: "complete",
      description: "Your workspace is now running with upload, analytics, and earnings access.",
    },
    {
      title: "Publish your catalog",
      state: totalBooks > 0 ? "Live" : "Start now",
      status: totalBooks > 0 ? "complete" : "active",
      description: totalBooks > 0
        ? `${numberText(totalBooks)} products are already part of your creator catalog.`
        : "Your first upload will unlock moderation, AI review, and storefront discovery.",
    },
    {
      title: "Win approvals",
      state: approvedBooks > 0 ? "Approved" : "Awaiting review",
      status: approvedBooks > 0 ? "complete" : totalBooks > 0 ? "active" : "locked",
      description: approvedBooks > 0
        ? `${numberText(approvedBooks)} products are already approved for the marketplace.`
        : "Push quality and metadata so your first items clear moderation faster.",
    },
    {
      title: "Compound revenue",
      state: totalSales > 0 ? "Revenue live" : "Next milestone",
      status: totalSales > 0 ? "complete" : approvedBooks > 0 ? "active" : "locked",
      description: totalSales > 0
        ? `${numberText(totalSales)} sales processed and ${formatCurrency(monthlyEarnings)} this month.`
        : "Once your products are approved, focus on pricing, covers, and conversion quality.",
    },
  ];
}

function getStatusCount(statusBreakdown, name) {
  const key = Object.keys(statusBreakdown || {}).find(
    (entry) => String(entry || "").toLowerCase() === String(name || "").toLowerCase()
  );
  return Number(key ? statusBreakdown[key] : 0);
}

function getTopKey(map) {
  return Object.entries(map || {}).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))[0]?.[0] || "";
}

function getProgressMeter(value, goal) {
  return Math.round((Math.min(Number(value || 0), goal) / Math.max(goal, 1)) * 100);
}

function getInverseProgressMeter(value, limit) {
  const ratio = Math.min(Number(value || 0), limit) / Math.max(limit, 1);
  return Math.round((1 - ratio) * 100);
}

function getCreatorReadinessScore(data) {
  const profile = data.profile || {};
  let score = 32;

  if (profile.name) {
    score += 18;
  }
  if (profile.username) {
    score += 18;
  }
  if (profile.avatar && !String(profile.avatar).includes("default-avatar")) {
    score += 18;
  }
  if (data.readerStats?.totalPurchased) {
    score += 7;
  }
  if (data.readerStats?.pendingOrders === 0) {
    score += 7;
  }

  return Math.min(100, score);
}

function formatRelativeDate(value) {
  if (!value) {
    return "Not available";
  }

  const source = new Date(value);
  if (Number.isNaN(source.getTime())) {
    return "Not available";
  }

  const diffMs = Date.now() - source.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return formatDate(value);
}

function buildSecureFileUrl(relativeUrl, token) {
  if (!relativeUrl) {
    return "#";
  }

  const separator = relativeUrl.includes("?") ? "&" : "?";
  return `${API_BASE}${relativeUrl}${separator}token=${encodeURIComponent(token)}`;
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

function buildDownloadHref(accessUrl, fallbackUrl, token) {
  return resolveApiUrl(accessUrl) || buildSecureFileUrl(fallbackUrl, token);
}

function buildCompactStatus(map) {
  const entries = Object.entries(map || {});
  if (!entries.length) {
    return "No data yet";
  }

  return entries
    .map(([label, value]) => `${label}: ${value}`)
    .join(" | ");
}

function resolveAssetUrl(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "../assets/covers/Ebook_AI.png";
  }

  const frontendAssetBase = window.location.pathname.includes("/frontend/")
    ? `${window.location.origin}/frontend`
    : "";

  const repaired = source.replace(
    /^(https?:\/\/[^/]+)(assets\/|uploads\/)/i,
    "$1/$2"
  );

  if (/^(https?:|data:|\.\.\/|\.\/)/i.test(repaired)) {
    return repaired;
  }

  if (repaired.startsWith("/assets/")) {
    return frontendAssetBase ? `${frontendAssetBase}${repaired}` : repaired;
  }

  if (/^assets\//i.test(repaired)) {
    return frontendAssetBase ? `${frontendAssetBase}/${repaired}` : `/${repaired}`;
  }

  if (repaired.startsWith("/uploads")) {
    return `${API_BASE}${repaired}`;
  }

  if (/^uploads\//i.test(repaired)) {
    return `${API_BASE}/${repaired}`;
  }

  return repaired;
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("approved") || normalized.includes("success")) {
    return "success";
  }
  if (normalized.includes("pending") || normalized.includes("review")) {
    return "pending";
  }
  if (normalized.includes("reject") || normalized.includes("archived")) {
    return "danger";
  }
  return "neutral";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function numberText(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatMultilineText(value) {
  return escapeHTML(value).replace(/\n/g, "<br>");
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

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
}
