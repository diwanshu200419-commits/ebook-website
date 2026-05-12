const API_BASE = window.API_BASE || "";
const booksGrid = document.getElementById("booksGrid");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const applyBtn = document.getElementById("applyBtn");

document.addEventListener("DOMContentLoaded", () => {
  applyBtn?.addEventListener("click", loadBooks);
  loadBooks();
});

async function loadBooks() {
  try {
    const search = searchInput.value.trim();
    const category = categorySelect.value.trim();
    const sort = sortSelect.value || "trending";

    const params = new URLSearchParams({
      limit: "60",
      sort,
    });

    if (search) {
      params.set("search", search);
    }

    if (category) {
      params.set("category", category);
    }

    const response = await fetch(`${API_BASE}/api/books?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch books");
    }

    renderCategoryOptions(data.filters?.categories || []);
    renderBooks(data.books || []);
  } catch (error) {
    booksGrid.innerHTML = `<p>${escapeHTML(error.message || "Unable to load books")}</p>`;
  }
}

function renderCategoryOptions(categories) {
  const active = categorySelect.value;
  const options = [
    `<option value="">All Categories</option>`,
    ...categories.map((category) => `<option value="${escapeAttribute(category.name)}">${escapeHTML(category.name)} (${Number(category.count || 0).toLocaleString("en-IN")})</option>`),
  ];

  categorySelect.innerHTML = options.join("");
  categorySelect.value = active;
}

function renderBooks(books) {
  booksGrid.innerHTML = "";

  if (!books.length) {
    booksGrid.innerHTML = "<p>No approved books match these filters yet.</p>";
    return;
  }

  books.forEach((book) => {
    const cover = resolveAssetUrl(book.coverUrl || book.cover || "assets/covers/Ebook_AI.png");
    const price = Number(book.price || 0) > 0
      ? `Rs. ${Number(book.price || 0).toLocaleString("en-IN")}`
      : "FREE";
    const creatorLink = buildCreatorLink(book.authorUsername);
    const authorMarkup = creatorLink
      ? `<a href="${creatorLink}" style="color:#bfdbfe;text-decoration:none;">${escapeHTML(book.authorName || "Creator")}</a>`
      : escapeHTML(book.authorName || "Creator");

    const card = document.createElement("article");
    card.style.cssText = "background:#111827;border:1px solid #1f2937;border-radius:18px;padding:14px;display:grid;gap:10px;";
    card.innerHTML = `
      <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}" style="width:100%;height:220px;object-fit:cover;border-radius:12px;background:#0f172a;" />
      <div>
        <h3 style="margin:0 0 6px 0;font-size:17px;">${escapeHTML(book.title)}</h3>
        <p style="margin:0;color:#9ca3af;font-size:13px;">${escapeHTML(book.category || "Book")} · ${authorMarkup}</p>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <strong style="font-size:15px;">${escapeHTML(price)}</strong>
        <a href="book_view.html?id=${encodeURIComponent(book._id)}" style="color:#93c5fd;">View details</a>
      </div>
    `;
    booksGrid.appendChild(card);
  });
}

function buildCreatorLink(username) {
  const safeUsername = String(username || "").trim();
  if (!safeUsername) {
    return "";
  }

  return `creator/creator.html?username=${encodeURIComponent(safeUsername)}`;
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
