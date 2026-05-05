/* =====================================
   CONFIG
===================================== */

const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login.html";
}

/* =====================================
   DOM ELEMENTS
===================================== */

const bookTable = document.getElementById("bookTable");
const emptyState = document.getElementById("emptyState");

const totalBooksEl = document.getElementById("totalBooks");
const totalSalesEl = document.getElementById("totalSales");
const totalRevenueEl = document.getElementById("totalRevenue");
const publishedCountEl = document.getElementById("publishedCount");

const uploadModal = document.getElementById("uploadModal");
const openUploadBtn = document.getElementById("openUploadBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const saveBookBtn = document.getElementById("saveBookBtn");

/* =====================================
   INIT
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
});

/* =====================================
   LOAD BOOKS
===================================== */

async function loadBooks() {
  try {
    const res = await fetch(`${API_BASE}/api/books/my-books`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to load books");

    const data = await res.json();
    const books = data.books || [];

    renderBooks(books);
    updateStats(books);

  } catch (err) {
    console.error(err);
  }
}

/* =====================================
   RENDER BOOKS
===================================== */

function renderBooks(books) {
  bookTable.innerHTML = "";

  if (books.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  books.forEach(book => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <img src="${book.coverImage || '../assets/default-cover.png'}"
             class="table-cover">
      </td>

      <td>${book.title}</td>

      <td>₹${book.price}</td>

      <td>
        <span class="status-badge ${book.status}">
          ${book.status}
        </span>
      </td>

      <td>${book.sales || 0}</td>

      <td>
        <button onclick="deleteBook('${book._id}')">
          Delete
        </button>
      </td>
    `;

    bookTable.appendChild(row);
  });
}

/* =====================================
   UPDATE STATS
===================================== */

function updateStats(books) {

  const totalBooks = books.length;
  const totalSales = books.reduce((sum, b) => sum + (b.sales || 0), 0);
  const totalRevenue = books.reduce((sum, b) => sum + ((b.sales || 0) * (b.price || 0)), 0);
  const publishedCount = books.filter(b => b.status === "published").length;

  totalBooksEl.textContent = totalBooks;
  totalSalesEl.textContent = totalSales;
  totalRevenueEl.textContent = `₹${totalRevenue}`;
  publishedCountEl.textContent = publishedCount;
}

/* =====================================
   MODAL CONTROL
===================================== */

openUploadBtn.addEventListener("click", () => {
  uploadModal.style.display = "flex";
});

closeModalBtn.addEventListener("click", () => {
  uploadModal.style.display = "none";
});

/* =====================================
   UPLOAD BOOK
===================================== */

saveBookBtn.addEventListener("click", uploadBook);

async function uploadBook() {

  const title = document.getElementById("bookTitle").value.trim();
  const description = document.getElementById("bookDescription").value.trim();
  const price = document.getElementById("bookPrice").value;
  const status = document.getElementById("bookStatus").value;
  const file = document.getElementById("bookFile").files[0];

  if (!title || !price || !file) {
    return alert("Please fill required fields");
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("price", price);
  formData.append("status", status);
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/api/books`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) throw new Error("Upload failed");

    uploadModal.style.display = "none";
    clearForm();
    loadBooks();

  } catch (err) {
    alert("Failed to upload book");
  }
}

/* =====================================
   DELETE BOOK
===================================== */

async function deleteBook(bookId) {

  const confirmDelete = confirm("Are you sure you want to delete this book?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/api/books/${bookId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Delete failed");

    loadBooks();

  } catch (err) {
    alert("Failed to delete book");
  }
}

/* =====================================
   CLEAR FORM
===================================== */

function clearForm() {
  document.getElementById("bookTitle").value = "";
  document.getElementById("bookDescription").value = "";
  document.getElementById("bookPrice").value = "";
  document.getElementById("bookFile").value = "";
}