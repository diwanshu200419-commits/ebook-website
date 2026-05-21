(function () {
  const API_BASE = window.API_BASE || "";
  const token = localStorage.getItem("token");
  let user = {};
  let notificationState = {
    loaded: false,
    open: false,
    loading: false,
    unreadCount: 0,
    notifications: [],
    engagement: null,
  };

  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    user = {};
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
    return escapeHTML(String(value || "")).replace(/"/g, "&quot;");
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

  function getAuthHeaders(extra = {}) {
    if (!token) {
      return extra;
    }

    return {
      ...extra,
      Authorization: `Bearer ${token}`,
    };
  }

  function logout() {
    fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
    }).catch(() => null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }

  function getDashboardHref() {
    if (!token) {
      return "register.html";
    }

    if (user.role === "admin") {
      return "admin/admin.html";
    }

    return "dashboard/dashboard.html";
  }

  function getDashboardLabel() {
    if (!token) {
      return "Start Selling";
    }

    if (user.role === "admin") {
      return "Admin";
    }

    if (user.role === "creator" || user.role === "author") {
      return "Creator Hub";
    }

    return "My Dashboard";
  }

  function formatRelativeTime(value) {
    if (!value) {
      return "Just now";
    }

    const diffMs = Date.now() - new Date(value).getTime();
    const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);

    if (diffMinutes < 1) {
      return "Just now";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  function formatNotificationCategory(value) {
    const key = String(value || "general").trim().toLowerCase();
    const labels = {
      general: "Update",
      sale: "Sale",
      follow: "Follow",
      release: "Release",
      streak: "Streak",
      nudge: "Momentum",
      purchase: "Unlock",
      cart: "Cart",
      referral: "Referral",
    };

    return labels[key] || "Update";
  }

  function getNotificationShellElements() {
    return {
      wrapper: document.querySelector("[data-shell-notification-wrap]"),
      toggle: document.querySelector("[data-shell-notification-toggle]"),
      badge: document.querySelector("[data-shell-notification-count]"),
      panel: document.querySelector("[data-shell-notification-panel]"),
      list: document.querySelector("[data-shell-notification-list]"),
      meta: document.querySelector("[data-shell-notification-meta]"),
      markAll: document.querySelector("[data-shell-mark-all]"),
    };
  }

  function renderNotifications() {
    const elements = getNotificationShellElements();
    if (!elements.wrapper || !elements.badge || !elements.list || !elements.meta) {
      return;
    }

    elements.badge.textContent = String(notificationState.unreadCount || 0);
    elements.badge.classList.toggle("has-unread", Number(notificationState.unreadCount || 0) > 0);
    elements.meta.textContent = notificationState.unreadCount
      ? `${notificationState.unreadCount} unread signal${notificationState.unreadCount === 1 ? "" : "s"}`
      : "Inbox clear";

    if (notificationState.loading) {
      elements.list.innerHTML = `
        <article class="notification-card">
          <h4>Loading notifications</h4>
          <p>Syncing creator, release, and account signals...</p>
        </article>
      `;
      return;
    }

    if (!notificationState.notifications.length) {
      elements.list.innerHTML = `
        ${renderEngagementCard(notificationState.engagement)}
        <article class="notification-card">
          <h4>No notifications yet</h4>
          <p>Follow creators and publish new products to start building retention signals here.</p>
        </article>
      `;
      return;
    }

    elements.list.innerHTML = `
      ${renderEngagementCard(notificationState.engagement)}
      ${notificationState.notifications.map((item) => `
      <article class="notification-card ${item.read ? "" : "unread"}" data-notification-id="${escapeAttribute(item._id)}">
        <div class="notification-card-header">
          <div>
            <h4>${escapeHTML(item.title)}</h4>
            <small>${escapeHTML(formatRelativeTime(item.createdAt))}</small>
          </div>
          <div class="notification-card-tags">
            <span class="notification-category notification-category-${escapeAttribute(item.category || "general")}">${escapeHTML(formatNotificationCategory(item.category))}</span>
            ${item.read ? "" : `<span class="marketplace-chip subtle">New</span>`}
          </div>
        </div>
        <p>${escapeHTML(item.message)}</p>
        <div class="notification-card-actions">
          ${item.link
            ? `<button class="notification-link-btn" type="button" data-notification-open="${escapeAttribute(item._id)}">Open</button>`
            : ""
          }
          ${item.read
            ? ""
            : `<button class="notification-text-btn" type="button" data-notification-read="${escapeAttribute(item._id)}">Mark as read</button>`
          }
        </div>
      </article>
    `).join("")}
    `;

    elements.list.querySelectorAll("[data-notification-read]").forEach((button) => {
      button.addEventListener("click", async () => {
        await markNotificationRead(button.dataset.notificationRead);
      });
    });

    elements.list.querySelectorAll("[data-notification-open]").forEach((button) => {
      button.addEventListener("click", async () => {
        const item = notificationState.notifications.find(
          (notification) => String(notification._id) === String(button.dataset.notificationOpen)
        );
        if (!item) {
          return;
        }

        if (!item.read) {
          await markNotificationRead(item._id, false);
        }

        if (item.link) {
          window.location.href = item.link;
        }
      });
    });
  }

  async function refreshNotifications() {
    const elements = getNotificationShellElements();
    if (!token || !elements.wrapper) {
      return;
    }

    notificationState.loading = true;
    renderNotifications();

    try {
      const response = await fetch(`${API_BASE}/api/notifications?limit=12`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load notifications");
      }

      notificationState = {
        ...notificationState,
        loaded: true,
        loading: false,
        unreadCount: Number(data.unreadCount || 0),
        notifications: Array.isArray(data.notifications) ? data.notifications : [],
        engagement: data.engagement || null,
      };
    } catch (error) {
      notificationState = {
        ...notificationState,
        loaded: true,
        loading: false,
        notifications: [],
        unreadCount: 0,
        engagement: null,
      };
    }

    renderNotifications();
  }

  function renderEngagementCard(engagement) {
    if (!engagement?.headline) {
      return "";
    }

    const streakCount = Number(engagement.streakCount || 0);
    const rewardPoints = Number(engagement.rewardPoints || 0);
    const streakLabel = streakCount > 0
      ? `${streakCount}-day streak`
      : "Marketplace momentum";
    const rewardLabel = rewardPoints > 0
      ? `${rewardPoints} reward points`
      : "Reward system warming up";

    return `
      <article class="notification-card notification-engagement-card">
        <div class="notification-card-header">
          <div>
            <h4>${escapeHTML(engagement.headline)}</h4>
            <small>${escapeHTML(`${streakLabel} - ${rewardLabel}`)}</small>
          </div>
          <span class="notification-category notification-category-streak">Momentum</span>
        </div>
        <p>${escapeHTML(engagement.body || "Stay active to strengthen your marketplace signals.")}</p>
        ${engagement.actionLink
          ? `<div class="notification-card-actions"><a class="notification-link-btn" href="${escapeAttribute(engagement.actionLink)}">${escapeHTML(engagement.actionLabel || "Open")}</a></div>`
          : ""
        }
      </article>
    `;
  }

  async function markNotificationRead(notificationId, rerender = true) {
    if (!notificationId || !token) {
      return;
    }

    try {
      await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      notificationState.notifications = notificationState.notifications.map((item) => (
        String(item._id) === String(notificationId)
          ? { ...item, read: true }
          : item
      ));
      notificationState.unreadCount = Math.max(Number(notificationState.unreadCount || 0) - 1, 0);
      if (rerender) {
        renderNotifications();
      }
    } catch (error) {
      console.error("Notification read failed:", error);
    }
  }

  async function markAllNotificationsRead() {
    if (!token) {
      return;
    }

    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      notificationState.notifications = notificationState.notifications.map((item) => ({
        ...item,
        read: true,
      }));
      notificationState.unreadCount = 0;
      renderNotifications();
    } catch (error) {
      console.error("Notification mark-all failed:", error);
    }
  }

  function buildNotificationShell(actions) {
    if (!token || !actions || document.querySelector("[data-shell-notification-wrap]")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "marketplace-notification-shell";
    wrapper.setAttribute("data-shell-notification-wrap", "true");
    wrapper.innerHTML = `
      <button class="marketplace-chip subtle marketplace-notification-toggle" type="button" data-shell-notification-toggle>
        Signals <strong data-shell-notification-count>0</strong>
      </button>
      <div class="marketplace-notification-panel" data-shell-notification-panel>
        <div class="notification-panel-header">
          <div>
            <h3>Notifications</h3>
            <p data-shell-notification-meta>Inbox clear</p>
          </div>
          <button class="notification-text-btn" type="button" data-shell-mark-all>Mark all read</button>
        </div>
        <div class="notification-list" data-shell-notification-list></div>
      </div>
    `;

    actions.insertBefore(wrapper, actions.firstChild || null);

    const elements = getNotificationShellElements();
    elements.toggle?.addEventListener("click", async () => {
      notificationState.open = !notificationState.open;
      elements.panel?.classList.toggle("open", notificationState.open);
      if (notificationState.open && !notificationState.loaded) {
        await refreshNotifications();
      }
    });

    elements.markAll?.addEventListener("click", markAllNotificationsRead);

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) {
        notificationState.open = false;
        elements.panel?.classList.remove("open");
      }
    });

    renderNotifications();
  }

  function decorateShell() {
    const nav = document.querySelector("[data-shell-nav]");
    const toggle = document.querySelector("[data-shell-toggle]");
    const authLink = document.querySelector("[data-shell-auth]");
    const dashboardLink = document.querySelector("[data-shell-dashboard]");
    const userPill = document.querySelector("[data-shell-user]");
    const actions = document.querySelector(".marketplace-actions");

    toggle?.addEventListener("click", () => {
      nav?.classList.toggle("open");
      toggle.classList.toggle("active");
    });

    dashboardLink?.setAttribute("href", getDashboardHref());
    if (dashboardLink) {
      dashboardLink.textContent = getDashboardLabel();
    }

    if (userPill) {
      userPill.textContent = token
        ? `${user.name || user.username || "Member"}`
        : "Guest Mode";
    }

    if (authLink) {
      if (token) {
        authLink.textContent = "Logout";
        authLink.setAttribute("href", "#");
        authLink.addEventListener("click", (event) => {
          event.preventDefault();
          logout();
        });
      } else {
        authLink.textContent = "Sign In";
        authLink.setAttribute("href", "login.html");
      }
    }

    buildNotificationShell(actions);
  }

  async function refreshCartCount() {
    const countNodes = document.querySelectorAll("[data-cart-count]");
    if (!countNodes.length) {
      return;
    }

    if (!token) {
      countNodes.forEach((node) => {
        node.textContent = "0";
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/cart`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      const count = Array.isArray(data.items) ? data.items.length : 0;
      countNodes.forEach((node) => {
        node.textContent = String(count);
      });
    } catch (error) {
      countNodes.forEach((node) => {
        node.textContent = "0";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    decorateShell();
    refreshCartCount();
    refreshNotifications();
  });

  window.StorefrontShell = {
    API_BASE,
    token,
    user,
    escapeHTML,
    escapeAttribute,
    resolveAssetUrl,
    refreshCartCount,
    refreshNotifications,
    logout,
  };
})();
