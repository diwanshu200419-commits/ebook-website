// ==============================
// ✅ API BASE (FIXED HTTPS)
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

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
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
// PAYMENT SUBMIT (GLOBAL)
// ==============================

async function submitPayment(){

  const fileInput = document.getElementById("screenshot");

  if(!fileInput || !fileInput.files.length){
    alert("Upload payment screenshot");
    return;
  }

  const token = localStorage.getItem("token");

  if(!token){
    alert("Login required");
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");

  if(!bookId){
    alert("Book not found");
    return;
  }

  const formData = new FormData();
  formData.append("screenshot", fileInput.files[0]);
  formData.append("bookId", bookId);

  try{

    const res = await fetch(`${API_BASE}/api/payment/submit`,{
      method: "POST",
      headers:{
        Authorization: "Bearer " + token
      },
      body: formData
    });

    const data = await res.json();

    if(data.success){
      alert("✅ Payment submitted. Wait for approval.");
      document.getElementById("paymentBox").style.display = "none";
    }else{
      alert(data.message || "Error");
    }

  }catch(err){
    alert("❌ Server error");
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