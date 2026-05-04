// ==============================
// LOAD BOOK VIEW
// ==============================

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


// ==============================
// RENDER BOOK
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

  const user = getCurrentUser();
  const token = getToken();

  // ==================
  // SET DATA
  // ==================

  title.textContent = book.title;
  meta.textContent = `${book.type} • ${book.category} • by ${book.authorName}`;

  const isPaid = Number(book.price || 0) > 0;

  price.textContent = isPaid
    ? formatCurrency(book.price)
    : "FREE";

  description.textContent =
    book.description || "No description available.";

  preview.src = `${API_BASE}${book.previewPdf}`;

  note.textContent =
    isPaid
      ? "Preview only. Purchase required to download."
      : "Free book. You can download after login.";

  // ==================
  // DOWNLOAD BUTTON LOGIC
  // ==================

  downloadBtn.onclick = () => {

    // 🔐 NOT LOGGED IN
    if (!token) {
      redirectToLogin();
      return;
    }

    // 🟢 FREE BOOK
    if (!isPaid) {
      window.location.href =
        `${API_BASE}/api/books/${book._id}/download?token=${token}`;
      return;
    }

    // 💰 PAID BOOK → SHOW PAYMENT
    if (paymentBox) {
      paymentBox.style.display = "block";
      localStorage.setItem("bookId", book._id);
    }

  };

  // ==================
  // SECOND BUTTON
  // ==================

  if (user) {
    secondaryBtn.textContent =
      user.role === "admin" ? "Admin Panel" : "Dashboard";

    secondaryBtn.onclick = () => {
      redirectForRole(user);
    };
  } else {
    secondaryBtn.textContent = "Sign In";

    secondaryBtn.onclick = () => {
      redirectToLogin();
    };
  }
}


// ==============================
// PAYMENT SUBMIT (IMPORTANT)
// ==============================

async function submitPayment() {

  const fileInput = document.getElementById("screenshot");

  if (!fileInput || !fileInput.files.length) {
    alert("Upload payment screenshot");
    return;
  }

  const bookId = localStorage.getItem("bookId");
  const token = getToken();

  if (!bookId || !token) {
    alert("Session expired. Please login again.");
    return;
  }

  const formData = new FormData();
  formData.append("screenshot", fileInput.files[0]);
  formData.append("bookId", bookId);

  try {

    const res = await fetch(`${API_BASE}/api/payment/submit`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Payment submitted! Wait for approval.");
      document.getElementById("paymentBox").style.display = "none";
    } else {
      alert(data.message || "Payment failed");
    }

  } catch (err) {
    alert("Server error");
  }
}


// ==============================
// FALLBACK
// ==============================

function renderFallback(message = "Book preview not available.") {
  document.getElementById("bookTitle").textContent = "Book unavailable";
  document.getElementById("bookMeta").textContent = "";
  document.getElementById("bookPrice").textContent = "";
  document.getElementById("bookDescription").textContent = message;

  document.getElementById("downloadBtn").onclick = () => {
    redirectToLogin();
  };

  document.getElementById("secondaryBtn").onclick = () => {
    redirectToHome();
  };
}


// ==============================
// INIT
// ==============================

document.addEventListener("DOMContentLoaded", loadBookView);