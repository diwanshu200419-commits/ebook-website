const API_BASE = window.API_BASE || "";

let dashboardChart = null;

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  const token = getToken();
  if (!token) {
    return logoutAndRedirect();
  }

  setupLogout();
  setupUnlockModal();

  try {
    const response = await fetch(`${API_BASE}/api/dashboard/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      return logoutAndRedirect();
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load dashboard");
    }

    renderDashboard(data, token);
  } catch (error) {
    console.error("Dashboard load failed:", error);
    renderFatalState(error.message || "Unable to load dashboard");
  }
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
    name: data.profile?.name,
    username: data.profile?.username,
    email: data.profile?.email,
    role: data.role
  }));

  const viewer = data.viewer === "creator" ? "creator" : "reader";

  renderNavigation(viewer, data);
  renderHero(viewer, data);
  renderSummary(viewer, data);
  renderChart(viewer, data);

  if (viewer === "creator") {
    renderCreatorBooks(data, token);
    renderCreatorTopBooks(data);
    renderCreatorActivity(data);
    return;
  }

  renderReaderPurchases(data, token);
  renderReaderOrders(data);
  renderReaderProfile(data);
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
    return;
  }

  setText("heroEyebrow", "Reader Dashboard");
  setText("dashboardTitle", `${profile.name || "Reader"}, your unlocks are live.`);
  setText(
    "dashboardSubtitle",
    "See what you purchased, what unlocks instantly, and every payment status tied to your account."
  );
}

function renderSummary(viewer, data) {
  const summaryGrid = document.getElementById("summaryGrid");
  const cards = viewer === "creator"
    ? [
        {
          label: "Total earnings",
          value: formatCurrency(data.creatorStats?.totalEarnings || 0),
          note: `${numberText(data.creatorStats?.totalSales || 0)} confirmed sales`
        },
        {
          label: "This month",
          value: formatCurrency(data.creatorStats?.monthlyEarnings || 0),
          note: "Current month revenue"
        },
        {
          label: "Marketplace reach",
          value: numberText(data.creatorStats?.totalViews || 0),
          note: `${numberText(data.creatorStats?.totalDownloads || 0)} downloads recorded`
        },
        {
          label: "Creator score",
          value: `${data.creatorStats?.creatorScore || 0}/100`,
          note: `${numberText(data.creatorStats?.totalBooks || 0)} active products`
        }
      ]
    : [
        {
          label: "Purchased products",
          value: numberText(data.readerStats?.totalPurchased || 0),
          note: `${numberText(data.readerStats?.downloadsUnlocked || 0)} ready to access`
        },
        {
          label: "Total spent",
          value: formatCurrency(data.readerStats?.totalSpent || 0),
          note: "Approved purchases only"
        },
        {
          label: "Pending payments",
          value: numberText(data.readerStats?.pendingOrders || 0),
          note: "Waiting for review or confirmation"
        },
        {
          label: "Rejected payments",
          value: numberText(data.readerStats?.rejectedOrders || 0),
          note: "Payments that need attention"
        }
      ];

  summaryGrid.innerHTML = cards.map((card) => `
    <article class="summary-card">
      <p>${escapeHTML(card.label)}</p>
      <h3>${escapeHTML(card.value)}</h3>
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
            ? "rgba(99, 102, 241, 0.2)"
            : ["#8b5cf6", "#0ea5e9", "#fb7185"],
          fill: viewer === "creator",
          tension: 0.38,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
