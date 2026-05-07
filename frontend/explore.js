const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const booksGrid = document.getElementById("booksGrid");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const applyBtn = document.getElementById("applyBtn");

async function loadBooks() {
  const search = searchInput.value.trim();
  const category = categorySelect.value.trim();
  const sort = sortSelect.value;
  const params = new URLSearchParams();
  params.set("limit", "60");
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const res = await fetch(`${API_BASE}/api/books?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch books");
  let books = data.books || [];

  if (sort === "newest") books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === "price-low") books.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sort === "price-high") books.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sort === "trending") books.sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0));

  booksGrid.innerHTML = "";
  if (!books.length) {
    booksGrid.innerHTML = "<p>No books found.</p>";
    return;
  }

  books.forEach((book) => {
    const cover = book.coverUrl || (book.cover ? `${API_BASE}${book.cover}` : "assets/covers/Ebook_AI.png");
    const card = document.createElement("article");
    card.style.cssText = "background:#111827;border:1px solid #1f2937;border-radius:12px;padding:12px;";
    card.innerHTML = `
      <img src="${cover}" alt="${book.title}" style="width:100%;height:220px;object-fit:cover;border-radius:8px;" />
      <h3 style="margin:10px 0 6px 0;font-size:16px;">${book.title}</h3>
      <p style="margin:0;color:#9ca3af;font-size:13px;">${book.category || "Book"}</p>
      <p style="margin:6px 0 12px 0;font-weight:700;">₹${Number(book.price || 0).toLocaleString("en-IN")}</p>
      <a href="book_view.html?id=${book._id}" style="color:#93c5fd;">View Details</a>
    `;
    booksGrid.appendChild(card);
  });
}

applyBtn?.addEventListener("click", loadBooks);
loadBooks();
