const navLinks = document.querySelectorAll(".sidebar-nav a");
const sections = document.querySelectorAll(".admin-section");
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const reviewList = document.getElementById("contentList");
const approvedList = document.getElementById("approvedList");

const HEADERS = {
  review: {
    title: "Pending Content Review",
    sub: "Review quality, originality, and monetization potential",
  },
  approved: {
    title: "Approved Library",
    sub: "Live and published content",
  },
  creators: {
    title: "Creators",
    sub: "Creator profiles and uploads",
  },
  payouts: {
    title: "Payouts",
    sub: "Pending and completed payout requests",
  },
  ai: {
    title: "AI Signals",
    sub: "AI scoring and content moderation signals",
  },
  reports: {
    title: "Reports",
    sub: "Platform growth and content activity",
  },
  settings: {
    title: "Settings",
    sub: "Rules and admin configuration",
  },
};

function initAdminNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.dataset.target;

      navLinks.forEach((item) => item.classList.remove("active"));
      sections.forEach((section) => section.classList.remove("active"));

      link.classList.add("active");
      document.getElementById(target).classList.add("active");

      pageTitle.textContent = HEADERS[target].title;
      pageSub.textContent = HEADERS[target].sub;
    });
  });
}

async function loadReviewQueue() {
  reviewList.innerHTML = "<p>Loading review queue...</p>";

  try {
    const data = await apiFetchJson("/api/books/admin/review");
    renderReviewQueue(data.books || []);
  } catch (error) {
    reviewList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function loadApprovedLibrary() {
  approvedList.innerHTML = "<p>Loading approved library...</p>";

  try {
    const data = await apiFetchJson("/api/books/admin/library?status=Approved");
    renderApprovedLibrary(data.books || []);
  } catch (error) {
    approvedList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function renderReviewQueue(books) {
  if (!books.length) {
    reviewList.innerHTML = "<p style='opacity:.7'>No pending content.</p>";
    return;
  }

  reviewList.innerHTML = books
    .map((book) => {
      return `
        <article class="content-card">
          <div class="content-info">
            <h3>${escapeHtml(book.title)}</h3>
            <p>
              ${escapeHtml(book.type)} • ${formatCurrency(book.price)}<br>
              Creator: <strong>${escapeHtml(book.authorName)}</strong><br>
              Status: ${escapeHtml(book.status)}
            </p>
            <div class="signals">
              <span class="signal ai">AI ${book.aiScore}%</span>
            </div>
          </div>

          <div class="actions">
            <button class="approve" data-action="approve" data-id="${book._id}">Approve</button>
            <button class="reject" data-action="changes" data-id="${book._id}">Request Changes</button>
            <button data-action="review" data-id="${book._id}">Open Review</button>
          </div>
        </article>
      `;
    })
    .join("");

  reviewList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      const bookId = button.dataset.id;

      if (action === "review") {
        window.location.href = `../ai/ai-review.html?id=${bookId}`;
        return;
      }

      if (action === "approve") {
        await updateBookStatus(bookId, "Approved");
        return;
      }

      const adminNotes = prompt("What should the creator change?");
      if (!adminNotes) {
        return;
      }

      await updateBookStatus(bookId, "Changes_Requested", adminNotes);
    });
  });
}

function renderApprovedLibrary(books) {
  if (!books.length) {
    approvedList.innerHTML = "<p style='opacity:.7'>No approved content yet.</p>";
    return;
  }

  approvedList.innerHTML = books
    .map((book) => {
      return `
        <article class="content-card">
          <div class="content-info">
            <h3>${escapeHtml(book.title)}</h3>
            <p>
              ${escapeHtml(book.type)} • ${formatCurrency(book.price)}<br>
              Creator: <strong>${escapeHtml(book.authorName)}</strong><br>
              Approved on: ${book.publishedAt ? new Date(book.publishedAt).toLocaleDateString("en-IN") : "Recently"}
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

async function updateBookStatus(bookId, status, adminNotes = "") {
  try {
    await apiFetchJson(`/api/books/admin/status/${bookId}`, {
      method: "PUT",
      body: JSON.stringify({ status, adminNotes }),
    });

    await Promise.all([loadReviewQueue(), loadApprovedLibrary()]);
  } catch (error) {
    alert(error.message || "Unable to update book status.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["admin"]);
  if (!user) {
    return;
  }

  initAdminNavigation();
  loadReviewQueue();
  loadApprovedLibrary();
});
