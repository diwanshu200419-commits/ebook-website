(function bootstrapAuthHelpers() {
  const isFileProtocol = window.location.protocol === "file:";
  const API_BASE = isFileProtocol
    ? "http://localhost:5000"
    : window.location.origin;

  function toRootPath(target) {
    const path = window.location.pathname.replace(/\\/g, "/");
    const isNested = /\/(dashboard|admin|creator|ai)\//.test(path);
    return isNested ? `../${target}` : target;
  }

  function getToken() {
    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      return null;
    }

    return token;
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) {
      localStorage.setItem("token", token);
    }

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  function redirectToLogin() {
    window.location.href = toRootPath("login.html");
  }

  function redirectToHome() {
    window.location.href = toRootPath("index.html");
  }

  function redirectForRole(user) {
    if (!user) {
      redirectToLogin();
      return;
    }

    if (user.role === "admin") {
      window.location.href = toRootPath("admin/admin.html");
      return;
    }

    window.location.href = toRootPath("dashboard/dashboard.html");
  }

  function logoutUser() {
    clearSession();
    redirectToLogin();
  }

  function consumeTokenFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      return null;
    }

    localStorage.setItem("token", token);
    params.delete("token");

    const nextUrl =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "") +
      window.location.hash;

    window.history.replaceState({}, document.title, nextUrl);
    return token;
  }

  async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    if (hasBody && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  }

  async function apiFetchJson(path, options = {}) {
    const response = await apiFetch(path, options);
    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      const message =
        data.message ||
        data.msg ||
        `Request failed with status ${response.status}`;

      const failure = new Error(message);
      failure.status = response.status;
      failure.data = data;
      throw failure;
    }

    return data;
  }

  async function protectPage(roles = []) {
    consumeTokenFromQuery();

    const token = getToken();
    if (!token) {
      redirectToLogin();
      return null;
    }

    try {
      const data = await apiFetchJson("/api/user/profile");
      const user = data.user || null;

      if (!user) {
        throw new Error("User profile is unavailable");
      }

      localStorage.setItem("user", JSON.stringify(user));

      if (roles.length > 0 && !roles.includes(user.role)) {
        redirectForRole(user);
        return null;
      }

      return user;
    } catch (error) {
      clearSession();
      redirectToLogin();
      return null;
    }
  }

  function formatCurrency(value) {
    return `Rs.${Number(value || 0).toLocaleString("en-IN")}`;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  window.API_BASE = API_BASE;
  window.apiFetch = apiFetch;
  window.apiFetchJson = apiFetchJson;
  window.getToken = getToken;
  window.getCurrentUser = getCurrentUser;
  window.setSession = setSession;
  window.clearSession = clearSession;
  window.redirectToLogin = redirectToLogin;
  window.redirectToHome = redirectToHome;
  window.redirectForRole = redirectForRole;
  window.logoutUser = logoutUser;
  window.consumeTokenFromQuery = consumeTokenFromQuery;
  window.protectPage = protectPage;
  window.formatCurrency = formatCurrency;
  window.escapeHtml = escapeHtml;
  window.toRootPath = toRootPath;

  consumeTokenFromQuery();
})();
