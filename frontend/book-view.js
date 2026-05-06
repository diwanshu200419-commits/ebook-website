const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function redirectForRole(user) {
  if (user && user.role === "admin") {
    window.location.href = "admin/admin.html";
    return;
  }
  window.location.href = "dashboard/dashboard.html";
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

async function apiFetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || "Request failed");
  }
  return json;
}

function renderFallback(message) {
  const note = document.getElementById("bookNote");
  if (note) note.textContent = message;
}

function renderManualBook() {
  const pdfPath = "assets/books/I-Tried-8-Different-AI-Side-Hustles-for-Students-Heres-Which-Ones-Actually-Pay.pdf";
  document.getElementById("bookTitle").textContent = "Side Hustles for Students";
  document.getElementById("bookMeta").textContent = "Free Preview";
  document.getElementById("bookPrice").textContent = "FREE";
  document.getElementById("bookDescription").textContent =
    "This is a free preview book available without login.";
  document.getElementById("bookPreview").src = pdfPath;
  document.getElementById("bookNote").textContent = "Free preview loaded.";
  document.getElementById("downloadBtn").onclick = () => window.open(pdfPath, "_blank");
}

async function addToCart(bookId) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bookId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unable to add to cart");
    alert("Added to cart");
    window.location.href = "cart.html";
  } catch (err) {
    alert(err.message || "Unable to add to cart");
  }
}

function renderBook(book) {
  const title = document.getElementById("bookTitle");
  const meta = document.getElementById("bookMeta");
  const price = document.getElementById("bookPrice");
  const description = document.getElementById("bookDescription");
  const preview = document.getElementById("bookPreview");
  const note = document.getElementById("bookNote");
  const downloadBtn = document.getElementById("downloadBtn");
  const secondaryBtn = document.getElementById("secondaryBtn");
  const cartBtn = document.getElementById("cartBtn");

  const token = getToken();
  const user = getCurrentUser();
  const isPaid = Number(book.price || 0) > 0;

  title.textContent = book.title || "Untitled";
  meta.textContent = `${book.category || "Book"} • by ${book.authorName || "Unknown"}`;
  price.textContent = isPaid ? formatCurrency(book.price) : "FREE";
  description.textContent = book.description || "";
  preview.src = book.previewPath ? `${API_BASE}${book.previewPath}` : "";
  note.textContent = isPaid ? "Preview only. Purchase required." : "Free book";

  downloadBtn.textContent = isPaid ? "Buy / Download" : "Download Free";
  downloadBtn.onclick = () => {
    if (!token) return redirectToLogin();
    window.location.href = `${API_BASE}/api/books/${book._id}/download?token=${token}`;
  };

  if (cartBtn) {
    if (isPaid) {
      cartBtn.style.display = "block";
      cartBtn.onclick = () => addToCart(book._id);
    } else {
      cartBtn.style.display = "none";
    }
  }

  if (user) {
    secondaryBtn.textContent = "Dashboard";
    secondaryBtn.onclick = () => redirectForRole(user);
  } else {
    secondaryBtn.textContent = "Sign In";
    secondaryBtn.onclick = redirectToLogin;
  }
}

async function loadBookView() {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");
  if (!bookId) {
    renderManualBook();
    return;
  }
  try {
    const data = await apiFetchJson(`/api/books/${bookId}`);
    if (!data || !data.book) return renderFallback("Book not found");
    renderBook(data.book);
  } catch (error) {
    console.error(error);
    renderFallback("Error loading book");
  }
}

document.addEventListener("DOMContentLoaded", loadBookView);