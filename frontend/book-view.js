const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";

document.addEventListener("DOMContentLoaded", loadBookView);

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
  if (user?.role === "admin") {
    window.location.href = "admin/admin.html";
    return;
  }

  window.location.href = "dashboard/dashboard.html";
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

async function apiFetchJson(path) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE}${path}`, { headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Request failed");
  }
  return json;
}

function renderFallback(message) {
  const note = document.getElementById("bookNote");
  if (note) {
    note.textContent = message;
  }
}

function renderManualBook() {
  const pdfPath = "assets/books/I-Tried-8-Different-AI-Side-Hustles-for-Students-Heres-Which-Ones-Actually-Pay.pdf";
  document.getElementById("bookTitle").textContent = "Side Hustles for Students";
  document.getElementById("bookMeta").textContent = "Free preview · Official demo";
  document.getElementById("bookPrice").textContent = "FREE";
  document.getElementById("bookDescription").textContent =
    "This demo book stays available as the platform preview title while real marketplace uploads come from MongoDB.";
  document.getElementById("bookPreview").src = pdfPath;
  document.getElementById("bookNote").textContent = "Official preview loaded.";
  document.getElementById("downloadBtn").onclick = () => window.open(pdfPath, "_blank");
}

async function addToCart(bookId) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bookId })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to add to cart");
    }
    alert("Added to cart");
    window.location.href = "cart.html";
  } catch (error) {
    alert(error.message || "Unable to add to cart");
  }
}

function buildProtectedUrl(relativeUrl) {
  const token = getToken();
  if (!relativeUrl) {
    return "";
  }

  const separator = relativeUrl.includes("?") ? "&" : "?";
  return `${API_BASE}${relativeUrl}${token ? `${separator}token=${encodeURIComponent(token)}` : ""}`;
}

function renderBook(book, access) {
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
  const canDownload = Boolean(access?.canDownload);
  const canPreview = Boolean(access?.canPreview);

  title.textContent = book.title || "Untitled";
  meta.textContent = `${book.category || "Book"} · by ${book.authorName || "Unknown"}`;
  price.textContent = isPaid ? formatCurrency(book.price) : "FREE";
  description.textContent = book.description || "";
  preview.src = canPreview && book.previewPath ? buildProtectedUrl(book.previewPath) : "";
  note.textContent = canPreview
    ? "Preview ready."
    : isPaid
      ? "This book is locked until purchase."
      : "Sign in to download this free title.";

  if (canDownload) {
    downloadBtn.textContent = "Download";
    downloadBtn.onclick = () => {
      window.location.href = buildProtectedUrl(book.downloadUrl || `/api/books/${book._id}/download`);
    };
  } else if (isPaid) {
    downloadBtn.textContent = "Buy Now";
    downloadBtn.onclick = () => {
      if (!token) {
        redirectToLogin();
        return;
      }
      window.location.href = `checkout.html?bookId=${encodeURIComponent(book._id)}`;
    };
  } else {
    downloadBtn.textContent = token ? "Download Free" : "Sign In to Download";
    downloadBtn.onclick = () => {
      if (!token) {
        redirectToLogin();
        return;
      }
      window.location.href = buildProtectedUrl(book.downloadUrl || `/api/books/${book._id}/download`);
    };
  }

  if (cartBtn) {
    if (isPaid && !canDownload) {
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
    const data = await apiFetchJson(`/api/books/${bookId}?track=1`);
    if (!data?.book) {
      renderFallback("Book not found");
      return;
    }

    renderBook(data.book, data.access || {});
  } catch (error) {
    console.error(error);
    renderFallback(error.message || "Error loading book");
  }
}
