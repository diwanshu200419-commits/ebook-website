// ==============================
// LOAD BOOK VIEW
// ==============================

async function loadBookView() {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");

  // 👉 IF NO ID → SHOW MANUAL BOOK
  if (!bookId) {
    renderManualBook();
    return;
  }

  // 👉 DATABASE BOOK
  try {
    const data = await apiFetchJson(`/api/books/${bookId}`);

    if (!data || !data.book) {
      renderFallback("Book not found");
      return;
    }

    renderBook(data.book);
  } catch (error) {
    console.error(error);
    renderFallback("Error loading book");
  }
}


// ==============================
// MANUAL BOOK (FIXED)
// ==============================

function renderManualBook() {

  const pdfPath = "./assets/books/book.pdf"; // ✅ CORRECT PATH

  document.getElementById("bookTitle").textContent = "AI Side Hustles Book";
  document.getElementById("bookMeta").textContent = "Free Preview";
  document.getElementById("bookPrice").textContent = "FREE";
  document.getElementById("bookDescription").textContent =
    "This is a free preview book available without login.";

  document.getElementById("bookPreview").src = pdfPath;

  document.getElementById("bookNote").textContent =
    "Free preview loaded manually.";

  document.getElementById("downloadBtn").onclick = () => {
    window.open(pdfPath, "_blank");
  };

  document.getElementById("secondaryBtn").onclick = () => {
    redirectToLogin();
  };
}


// ==============================
// DATABASE BOOK
// ==============================

function renderBook(book) {

  const title = document.getElementById("bookTitle");
  const meta = document.getElementById("bookMeta");
  const price = document.getElementById("bookPrice");
  const description = document.getElementById("bookDescription");
  const preview = document.getElementById("bookPreview");
  const note = document.getElementById("bookNote");
  const downloadBtn = document.getElementById("downloadBtn");
  const secondaryBtn = document.getElementById("secondaryBtn");
  const paymentBox = document.getElementById("paymentBox");

  const token = getToken();
  const user = getCurrentUser();

  title.textContent = book.title;
  meta.textContent = `${book.type} • ${book.category} • by ${book.authorName}`;

  const isPaid = Number(book.price || 0) > 0;

  price.textContent = isPaid ? formatCurrency(book.price) : "FREE";

  description.textContent = book.description || "";

  if (book.previewPath) {
    preview.src = `${API_BASE}/${book.previewPath}`;
  } else {
    preview.src = "";
  }

  note.textContent = isPaid
    ? "Preview only. Purchase required."
    : "Free book";

  downloadBtn.onclick = () => {

    if (!token) {
      redirectToLogin();
      return;
    }

    if (!isPaid) {
      window.location.href =
        `${API_BASE}/api/books/${book._id}/download?token=${token}`;
      return;
    }

    paymentBox.style.display = "block";
    localStorage.setItem("bookId", book._id);
  };

  if (user) {
    secondaryBtn.textContent = "Dashboard";
    secondaryBtn.onclick = () => redirectForRole(user);
  } else {
    secondaryBtn.textContent = "Sign In";
    secondaryBtn.onclick = redirectToLogin;
  }
}


// ==============================
// INIT
// ==============================

document.addEventListener("DOMContentLoaded", loadBookView);