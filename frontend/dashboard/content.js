const API_BASE = window.API_BASE || "";
const token = localStorage.getItem("token");

let booksCache = [];

document.addEventListener("DOMContentLoaded", initContentStudio);

async function initContentStudio() {
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  bindModalControls();
  await loadBooks();
}

async function loadBooks() {
  try {
    const response = await fetch(`${API_BASE}/api/books/my/books`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "../login.html";
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to load books");
    }

    booksCache = data.books || [];
    renderStats(booksCache, data.summary || {});
    renderTable(booksCache);
  } catch (error) {
    console.error("Content load failed:", error);
    showMessage(error.message || "Unable to load your content", "error");
  }
}

function renderStats(books, summary) {
  const totalBooks = summary.totalBooks ?? books.length;
  const publishedCount = summary.publishedBooks ?? books.filter((book) => book.rawStatus === "Approved" && !book.isArchived).length;
  const totalSales = books.reduce((sum, book) => sum + Number(book.salesCount || 0), 0);
  const totalRevenue = books.reduce((sum, book) => sum + Number(book.earnings || 0), 0);

  document.getElementById("totalBooks").textContent = numberText(totalBooks);
  document.getElementById("publishedCount").textContent = numberText(publishedCount);
  document.getElementById("totalSales").textContent = numberText(totalSales);
  document.getElementById("totalRevenue").textContent = formatCurrency(totalRevenue);
}

function renderTable(books) {
  const table = document.getElementById("bookTable");
  const emptyState = document.getElementById("emptyState");

  if (!books.length) {
    table.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  table.innerHTML = books.map((book) => `
    <tr>
      <td>
        <div class="book-cell">
            <img src="${escapeAttribute(resolveAssetUrl(book.coverUrl || book.coverImage || "../assets/covers/Ebook_AI.png"))}" alt="${escapeAttribute(book.title)}">
          <div>
            <strong>${escapeHTML(book.title)}</strong>
            <span>${escapeHTML(book.category || "Book")} · ${book.isPaid ? formatCurrency(book.price || 0) : "Free"}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="status-pill ${statusClass(book.status)}">${escapeHTML(book.status)}</span>
      </td>
      <td>
        <strong>${escapeHTML(formatAiState(book))}</strong>
        <span>${escapeHTML(buildAiSummary(book))}</span>
      </td>
      <td>
        <strong>${numberText(book.salesCount || 0)}</strong>
        <span>${numberText(book.downloads || 0)} downloads</span>
      </td>
      <td>
        <strong>${formatCurrency(book.earnings || 0)}</strong>
        <span>${numberText(book.views || 0)} views</span>
      </td>
      <td>
        <div class="actions">
          <button type="button" class="secondary-btn" data-ai-id="${book._id}">View AI</button>
          <button type="button" class="secondary-btn" data-refresh-ai-id="${book._id}">Re-run AI</button>
          <button type="button" class="secondary-btn" data-edit-id="${book._id}">Edit</button>
          <button type="button" class="secondary-btn danger" data-delete-id="${book._id}">${book.isArchived ? "Delete" : "Archive/Delete"}</button>
        </div>
      </td>
    </tr>
  `).join("");

  table.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => openEditModal(button.dataset.editId));
  });

  table.querySelectorAll("[data-ai-id]").forEach((button) => {
    button.addEventListener("click", () => openAiReport(button.dataset.aiId));
  });

  table.querySelectorAll("[data-refresh-ai-id]").forEach((button) => {
    button.addEventListener("click", () => reprocessAi(button.dataset.refreshAiId));
  });

  table.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => handleDelete(button.dataset.deleteId));
  });
}

function bindModalControls() {
  document.getElementById("closeModalBtn").addEventListener("click", closeEditModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeEditModal);
  document.getElementById("editForm").addEventListener("submit", submitEdit);
}

function openEditModal(bookId) {
  const book = booksCache.find((item) => item._id === bookId);
  if (!book) {
    return;
  }

  document.getElementById("editBookId").value = book._id;
  document.getElementById("editTitle").value = book.title || "";
  document.getElementById("editCategory").value = book.category || "Book";
  document.getElementById("editType").value = book.type || "Book";
  document.getElementById("editSubcategory").value = book.subcategory || "";
  document.getElementById("editLanguage").value = book.language || "English";
  document.getElementById("editPrice").value = Number(book.price || 0);
  document.getElementById("editOriginalPrice").value = Number(book.originalPrice || book.price || 0);
  document.getElementById("editPreviewPages").value = Number(book.previewPages || 5);
  document.getElementById("editBookAuthor").value = book.bookAuthor || "";
  document.getElementById("editTags").value = (book.tags || []).join(", ");
  document.getElementById("editIsPremium").checked = Boolean(book.isPremium);
  document.getElementById("editIsFeatured").checked = Boolean(book.isFeatured);
  document.getElementById("editDescription").value = book.description || "";

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

async function submitEdit(event) {
  event.preventDefault();

  const bookId = document.getElementById("editBookId").value;
  const payload = {
    title: document.getElementById("editTitle").value.trim(),
    category: document.getElementById("editCategory").value,
    type: document.getElementById("editType").value,
    subcategory: document.getElementById("editSubcategory").value.trim(),
    language: document.getElementById("editLanguage").value.trim() || "English",
    price: Number(document.getElementById("editPrice").value || 0),
    originalPrice: Number(document.getElementById("editOriginalPrice").value || 0),
    previewPages: Number(document.getElementById("editPreviewPages").value || 5),
    bookAuthor: document.getElementById("editBookAuthor").value.trim(),
    isPremium: document.getElementById("editIsPremium").checked,
    isFeatured: document.getElementById("editIsFeatured").checked,
    tags: document.getElementById("editTags").value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    description: document.getElementById("editDescription").value.trim()
  };

  try {
    const response = await fetch(`${API_BASE}/api/books/${bookId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to update book");
    }

    closeEditModal();
    showMessage("Book updated successfully", "success");
    await loadBooks();
  } catch (error) {
    showMessage(error.message || "Unable to update book", "error");
  }
}

async function handleDelete(bookId) {
  const book = booksCache.find((item) => item._id === bookId);
  if (!book) {
    return;
  }

  const confirmed = window.confirm(
    book.isArchived
      ? "Delete this archived book permanently? This should only be used when it has no order history."
      : "Delete this book? If it already has order history, it will be archived instead to protect buyers."
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/books/${bookId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to remove book");
    }

    showMessage(data.message || "Book updated", "success");
    await loadBooks();
  } catch (error) {
    showMessage(error.message || "Unable to remove book", "error");
  }
}

function openAiReport(bookId) {
  window.location.href = `../ai/ai-review.html?id=${encodeURIComponent(bookId)}`;
}

async function reprocessAi(bookId) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/books/${bookId}/reprocess`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to queue AI review");
    }

    showMessage(data.message || "AI review queued", "success");
    await loadBooks();
  } catch (error) {
    showMessage(error.message || "Unable to queue AI review", "error");
  }
}

function showMessage(message, type) {
  const box = document.getElementById("messageBox");
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");

  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => {
    box.classList.add("hidden");
  }, 3200);
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("approved")) {
    return "success";
  }
  if (normalized.includes("pending") || normalized.includes("review")) {
    return "pending";
  }
  if (normalized.includes("reject") || normalized.includes("archive")) {
    return "danger";
  }
  return "neutral";
}

function formatAiState(book) {
  const processing = String(book.aiProcessingState || "").toLowerCase();
  if (processing === "queued") {
    return "Queued";
  }
  if (processing === "processing") {
    return "Scanning";
  }
  if (processing === "failed") {
    return "Failed";
  }

  const aiStatus = String(book.aiStatus || "").toLowerCase();
  if (aiStatus === "approved") {
    return "Approved";
  }
  if (aiStatus === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

function buildAiSummary(book) {
  const parts = [];
  if (Number.isFinite(Number(book.qualityScore))) {
    parts.push(`Quality ${Number(book.qualityScore || 0)}%`);
  }
  if (Number.isFinite(Number(book.plagiarismScore))) {
    parts.push(`Plagiarism ${Number(book.plagiarismScore || 0)}%`);
  }
  if (book.aiSuggestion) {
    parts.push(String(book.aiSuggestion));
  }

  return parts.join(" • ") || "AI review data will appear here after processing.";
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function resolveAssetUrl(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "../assets/covers/Ebook_AI.png";
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

function numberText(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
}
