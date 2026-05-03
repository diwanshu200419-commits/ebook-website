async function loadBookView() {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");

  if (!bookId) {
    renderFallback();
    return;
  }

  try {
    const data = await apiFetchJson(`/api/books/${bookId}`);
    renderBook(data.book);
  } catch (error) {
    renderFallback(error.message || "Unable to load this book.");
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
  const user = getCurrentUser();

  title.textContent = book.title;
  meta.textContent = `${book.type} • ${book.category} • by ${book.authorName}`;
  price.textContent =
    Number(book.price || 0) > 0 ? formatCurrency(book.price) : "FREE";
  description.textContent =
    book.description || "No description has been added for this book yet.";
  preview.src = `${API_BASE}${book.previewPdf}`;
  note.textContent =
    "Preview is available publicly. Signed-in users can download approved books.";

  downloadBtn.onclick = () => {
    if (!getToken()) {
      redirectToLogin();
      return;
    }

    window.location.href = `${API_BASE}/api/books/${book._id}/download`;
  };

  if (user) {
    secondaryBtn.textContent = user.role === "admin" ? "Open Admin" : "Dashboard";
    secondaryBtn.onclick = () => {
      redirectForRole(user);
    };
    return;
  }

  secondaryBtn.textContent = "Sign In";
  secondaryBtn.onclick = () => {
    redirectToLogin();
  };
}

function renderFallback(message = "Book preview not available.") {
  document.getElementById("bookTitle").textContent = "Book preview unavailable";
  document.getElementById("bookMeta").textContent = "Approved books appear here";
  document.getElementById("bookPrice").textContent = "Preview unavailable";
  document.getElementById("bookDescription").textContent = message;
  document.getElementById("downloadBtn").onclick = () => {
    redirectToLogin();
  };
  document.getElementById("secondaryBtn").onclick = () => {
    redirectToHome();
  };
}

document.addEventListener("DOMContentLoaded", loadBookView);
