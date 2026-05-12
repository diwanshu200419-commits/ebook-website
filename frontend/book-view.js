const API_BASE = window.API_BASE || "";

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
  renderRecommendations([]);
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookId }),
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

function buildCreatorLink(username) {
  const safeUsername = String(username || "").trim();
  if (!safeUsername) {
    return "";
  }

  return `creator/creator.html?username=${encodeURIComponent(safeUsername)}`;
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
  const creatorLink = buildCreatorLink(book.authorUsername);

  title.textContent = book.title || "Untitled";
  meta.innerHTML = creatorLink
    ? `${escapeHTML(book.category || "Book")} · by <a href="${creatorLink}" style="color:#93c5fd;text-decoration:none;">${escapeHTML(book.authorName || "Unknown")}</a>`
    : `${escapeHTML(book.category || "Book")} · by ${escapeHTML(book.authorName || "Unknown")}`;
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

async function loadRecommendations(bookId) {
  try {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${API_BASE}/api/ai/recommendations?bookId=${encodeURIComponent(bookId)}&limit=4`, {
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to load recommendations");
    }

    renderRecommendations(data.books || []);
  } catch (error) {
    console.error(error);
    renderRecommendations([]);
  }
}

function renderRecommendations(books) {
  const grid = document.getElementById("recommendationGrid");
  if (!grid) {
    return;
  }

  if (!books.length) {
    grid.innerHTML = `
      <article class="recommendation-card">
        <div class="copy">
          <h3>No related books yet</h3>
          <p>Recommendations will appear here as more approved books are processed by the marketplace AI layer.</p>
          <a href="explore.html">Browse marketplace</a>
        </div>
      </article>
    `;
    return;
  }

  grid.innerHTML = books.map((book) => {
    const cover = resolveAssetUrl(book.coverUrl || book.coverImage || "assets/covers/Ebook_AI.png");
    const creatorLink = buildCreatorLink(book.authorUsername);
    const authorMarkup = creatorLink
      ? `<a href="${creatorLink}" style="color:#93c5fd;text-decoration:none;">${escapeHTML(book.authorName || "Creator")}</a>`
      : escapeHTML(book.authorName || "Creator");
    return `
      <article class="recommendation-card">
        <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}">
        <div class="copy">
          <h3>${escapeHTML(book.title)}</h3>
          <p>${escapeHTML(book.category || "Book")} · ${authorMarkup}</p>
          <a href="book_view.html?id=${encodeURIComponent(book._id)}">View recommendation</a>
        </div>
      </article>
    `;
  }).join("");
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
    loadRecommendations(bookId);
  } catch (error) {
    console.error(error);
    renderFallback(error.message || "Error loading book");
    renderRecommendations([]);
  }
}

function resolveAssetUrl(value) {
  const source = String(value || "");
  if (!source) {
    return "assets/covers/Ebook_AI.png";
  }

  if (/^(https?:|data:|assets\/|\.\.\/|\.\/)/i.test(source)) {
    return source;
  }

  if (source.startsWith("/uploads")) {
    return `${API_BASE}${source}`;
  }

  return source;
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
}
