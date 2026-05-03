async function loadBooks() {
  try {
    const data = await apiFetchJson("/api/books/my-books");
    renderBooks(data.books || []);
  } catch (error) {
    document.getElementById("bookTable").innerHTML = `
      <tr><td colspan="6">${escapeHtml(error.message || "Unable to load books.")}</td></tr>
    `;
  }
}

function renderBooks(books) {
  const table = document.getElementById("bookTable");
  const emptyState = document.getElementById("emptyState");

  if (!books.length) {
    table.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  table.innerHTML = books
    .map((book) => {
      return `
        <tr>
          <td><img src="${book.coverImage}" class="table-cover" alt="${escapeHtml(book.title)}"></td>
          <td>${escapeHtml(book.title)}</td>
          <td>${formatCurrency(book.price || 0)}</td>
          <td><span class="status-badge ${escapeHtml(book.status)}">${escapeHtml(book.status)}</span></td>
          <td>${Number(book.salesCount || 0).toLocaleString("en-IN")}</td>
          <td>
            <button data-id="${book._id}" class="delete-book-btn">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  updateStats(books);

  table.querySelectorAll(".delete-book-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete this book permanently?");
      if (!confirmed) {
        return;
      }

      try {
        await apiFetchJson(`/api/books/${button.dataset.id}`, {
          method: "DELETE",
        });
        loadBooks();
      } catch (error) {
        alert(error.message || "Unable to delete this book.");
      }
    });
  });
}

function updateStats(books) {
  document.getElementById("totalBooks").textContent = Number(books.length).toLocaleString("en-IN");
  document.getElementById("totalSales").textContent = Number(
    books.reduce((sum, book) => sum + Number(book.salesCount || 0), 0)
  ).toLocaleString("en-IN");
  document.getElementById("totalRevenue").textContent = formatCurrency(
    books.reduce((sum, book) => sum + Number(book.earnings || 0), 0)
  );
  document.getElementById("publishedCount").textContent = Number(
    books.filter((book) => book.status === "Approved").length
  ).toLocaleString("en-IN");
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["creator", "author", "admin", "reader"]);
  if (!user) {
    return;
  }

  const uploadButton = document.getElementById("openUploadBtn");
  if (uploadButton) {
    uploadButton.addEventListener("click", () => {
      window.location.href = "upload.html";
    });
  }

  loadBooks();
});
