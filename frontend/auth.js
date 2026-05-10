/* =========================
GLOBAL AUTH SYSTEM
E-BOOK MARKET STARTUP
========================= */

const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";

function notifyServerLogout() {
  return fetch(`${API_BASE}/api/auth/logout`, {
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
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/user/profile`, {
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
        window.location.href = "index.html";
        return;
      }
    }

  } catch (err) {
    console.log("Auth error:", err);

    /* Logout if token invalid */
    logoutUser();
  }
}


/* =========================
REDIRECT LOGIN
========================= */

function redirectToLogin() {
  /* detect correct path */
  if (window.location.pathname.includes("/dashboard/") || window.location.pathname.includes("/admin/")) {
    window.location.href = "../login.html";
  } else {
    window.location.href = "login.html";
  }
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
