// ==============================
// ✅ FIXED API BASE (IMPORTANT)
// ==============================

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://ebook-website-v2mj.onrender.com";


// ==============================
// USER HELPERS
// ==============================

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}


// ==============================
// NAVBAR
// ==============================

function initNavbar() {
  const nav = document.getElementById("mainNav");
  if (!nav) return;

  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) {
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="#features">How It Works</a>
      <a href="#featured">Marketplace</a>
      <a href="ai/ai-review.html">AI Tools</a>
      <a class="btn-outline" href="login.html">Sign In</a>
      <a class="btn" href="register.html">Register</a>
    `;
    return;
  }

  const dashboardLink =
    user.role === "admin"
      ? "admin/admin.html"
      : "dashboard/dashboard.html";

  nav.innerHTML = `
    <a href="index.html">Home</a>
    <a href="#features">How It Works</a>
    <a href="#featured">Marketplace</a>
    <a href="ai/ai-review.html">AI Tools</a>
    <a class="btn-outline" href="${dashboardLink}">Dashboard</a>
    <a class="btn" href="#" id="logoutBtn">Logout</a>
  `;

  document
    .getElementById("logoutBtn")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "index.html";
    });
}


// ==============================
// FEATURED BOOKS
// ==============================

async function loadFeaturedBooks() {
  const container = document.getElementById("featuredApprovedList");
  if (!container) return;

  container.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/books/featured`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    const books = data.books || [];

    if (!books.length) {
      container.innerHTML = `<p>No books yet</p>`;
      return;
    }

    container.innerHTML = books.map(book => `
      <article class="featured-card">
        <a href="book_view.html?id=${book._id}">
          <img src="${book.coverImage}" />
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(book.category)}</p>
          <span>₹${book.price}</span>
        </a>
      </article>
    `).join("");

  } catch (err) {
    container.innerHTML = `<p>Backend not connected</p>`;
  }
}


// ==============================
// UTIL
// ==============================

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}


// ==============================
// INIT
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  loadFeaturedBooks();
});