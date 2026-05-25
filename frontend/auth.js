/* =========================
GLOBAL AUTH SYSTEM
E-BOOK MARKET STARTUP
========================= */

window.__AUTH_API_BASE__ = window.__AUTH_API_BASE__ || window.API_BASE || "";

function getAuthApiBase() {
  return window.__AUTH_API_BASE__ || window.API_BASE || "";
}

function buildFrontendPath(pathname, fallbackRelative) {
  if (typeof window.getFrontendReturnUrl === "function") {
    return window.getFrontendReturnUrl(pathname);
  }

  return fallbackRelative;
}

function notifyServerLogout() {
  return fetch(`${getAuthApiBase()}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true
  }).catch(() => null);
}


/* =========================
PROTECT PAGE
========================= */

async function protectPage(allowedRoles = []) {
  const token = localStorage.getItem("token");

  /* If no token → login */
  if (!token) {
    redirectToLogin();
    return false;
  }

  try {
    const res = await fetch(`${getAuthApiBase()}/api/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    /* Invalid token */
    if (!res.ok) {
      throw new Error("Token invalid");
    }

    const data = await res.json();

    /* Save fresh user data */
    localStorage.setItem("user", JSON.stringify(data.user));

    /* Check role if allowedRoles specified */
    if (allowedRoles.length > 0) {
      const userRole = data.user?.role || "";
      if (!allowedRoles.includes(userRole)) {
        redirectToHome();
        return false;
      }
    }

    return true;

  } catch (err) {
    console.log("Auth error:", err);

    /* Logout if token invalid */
    logoutUser();
    return false;
  }
}


/* =========================
REDIRECT LOGIN
========================= */

function redirectToLogin() {
  window.location.href = buildFrontendPath("/login.html", "login.html");
}

function redirectToHome() {
  window.location.href = buildFrontendPath("/index.html", "index.html");
}

function redirectLogin() {
  redirectToLogin();
}


/* =========================
LOGOUT SYSTEM
========================= */

function logoutUser() {
  notifyServerLogout();
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  /* redirect safely */
  redirectToLogin();
}


/* =========================
GET CURRENT USER
========================= */

function getCurrentUser() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user;
}


/* =========================
CHECK ROLE
========================= */

function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === "admin";
}


function isCreator() {
  const user = getCurrentUser();
  return user && (user.role === "creator" || user.role === "author");
}


/* =========================
CHECK LOGIN STATE
========================= */

function isLoggedIn() {
  return !!localStorage.getItem("token");
}
