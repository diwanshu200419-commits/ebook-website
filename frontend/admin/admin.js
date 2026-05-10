const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login.html";
}

const navLinks = document.querySelectorAll(".sidebar-nav a");
const sections = document.querySelectorAll(".admin-section");
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const contentList = document.getElementById("contentList");
const approvedList = document.getElementById("approvedList");
const aiOverview = document.getElementById("aiOverview");
const aiFlaggedList = document.getElementById("aiFlaggedList");

const HEADERS = {
  review: {
    title: "Pending Content Review",
    sub: "Review quality, originality & monetization potential",
  },
  approved: {
    title: "Approved Library",
    sub: "Live & published content",
  },
  creators: {
    title: "Creators",
    sub: "Creator profiles & uploads",
  },
  payouts: {
    title: "Payouts",
    sub: "Pending, processed & failed payouts",
  },
  ai: {
    title: "AI Signals",
    sub: "Demand, risk & AI insights",
  },
  reports: {
    title: "Reports",
    sub: "Revenue & platform analytics",
  },
  settings: {
    title: "Settings",
    sub: "Rules & admin configuration",
  },
};

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.target;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    sections.forEach((s) => s.classList.remove("active"));
    const targetSection = document.getElementById(target);
    if (targetSection) targetSection.classList.add("active");

    pageTitle.textContent = HEADERS[target]?.title || "Admin";
    pageSub.textContent = HEADERS[target]?.sub || "";

    if (target === "review") loadPendingBooks();
    if (target === "approved") loadApprovedBooks();
    if (target === "ai") loadAIOverview();
  });
});

async function loadPendingBooks() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/books/flagged`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    renderPending(data.books || []);
  } catch (err) {
    console.error(err);
    contentList.innerHTML = "<p>Failed to load pending books</p>";
  }
}

async function loadApprovedBooks() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/books?status=Approved`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    renderApproved(data.books || []);
  } catch (err) {
    console.error(err);
    approvedList.innerHTML = "<p>Failed to load approved books</p>";
  }
}

function renderPending(books) {
  contentList.innerHTML = "";
  if (!books.length) {
    contentList.innerHTML = "<p style='opacity:.7'>No pending content</p>";
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const cover = book.coverImage ? `${API_BASE}${book.coverImage}` : "../assets/covers/Ebook_AI.png";
    card.innerHTML = `
      <div class="content-info">
        <img src="${cover}" style="width:80px;height:100px;object-fit:cover;border-radius:4px;" />
        <div>
          <h3>${escapeHTML(book.title)}</h3>
          <p>
            ${book.category} • ₹${book.price}<br/>
            Creator: <strong>${book.author?.name || "Unknown"}</strong><br/>
            AI Score: ${book.aiScore || 0}% • Plagiarism: ${book.plagiarismScore || 0}% • Quality: ${book.qualityScore || 0}%
          </p>
          <div class="signals">
            <span class="signal ai">AI ${book.aiStatus || "pending"}</span>
            <span class="signal originality">${Number(book.qualityScore || 0)}% quality</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="changes" data-report-id="${book._id}">View Report</button>
        <button class="approve" data-id="${book._id}">Approve</button>
        <button class="reject" data-id="${book._id}">Reject</button>
      </div>
    `;

    card.querySelector(".changes").onclick = () => openAiReport(book._id);
    card.querySelector(".approve").onclick = () => approveBook(book._id);
    card.querySelector(".reject").onclick = () => rejectBook(book._id);

    contentList.appendChild(card);
  });
}

function renderApproved(books) {
  approvedList.innerHTML = "";
  if (!books.length) {
    approvedList.innerHTML = "<p style='opacity:.7'>No approved content yet</p>";
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "content-card";
    const cover = book.coverImage ? `${API_BASE}${book.coverImage}` : "../assets/covers/Ebook_AI.png";
    card.innerHTML = `
      <div class="content-info">
        <img src="${cover}" style="width:80px;height:100px;object-fit:cover;border-radius:4px;" />
        <div>
          <h3>${escapeHTML(book.title)}</h3>
          <p>
            ${book.category} • ₹${book.price}<br/>
            Creator: <strong>${book.author?.name || "Unknown"}</strong><br/>
            Sales: ${book.salesCount || 0} • Downloads: ${book.downloads || 0}
          </p>
        </div>
      </div>
    `;
    approvedList.appendChild(card);
  });
}

async function approveBook(bookId) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${bookId}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    alert("Book approved!");
    loadPendingBooks();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectBook(bookId) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${bookId}/reject`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    alert("Book rejected!");
    loadPendingBooks();
  } catch (err) {
    alert(err.message);
  }
}

async function loadAIOverview() {
  try {
    const res = await fetch(`${API_BASE}/api/ai/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to load AI overview");
    }

    renderAiOverview(data.summary || {}, data.topFlagged || []);
  } catch (err) {
    console.error(err);
    aiOverview.innerHTML = "<article class='stat-card'><h3>Status</h3><p>Offline</p></article>";
    aiFlaggedList.innerHTML = "<p>Failed to load AI overview</p>";
  }
}

function renderAiOverview(summary, flagged) {
  const statusMap = summary.statuses || {};
  const processingMap = summary.processing || {};

  aiOverview.innerHTML = [
    { label: "Manual review", value: summary.manualReview || 0 },
    { label: "High risk", value: summary.highRisk || 0 },
    { label: "Auto approved", value: summary.autoApproved || 0 },
    { label: "Queued", value: processingMap.queued || 0 },
  ].map((card) => `
    <article class="stat-card">
      <h3>${escapeHTML(card.label)}</h3>
      <p>${Number(card.value || 0).toLocaleString("en-IN")}</p>
    </article>
  `).join("");

  if (!flagged.length) {
    aiFlaggedList.innerHTML = `
      <div class="empty-state">
        <p>No risky AI cases right now. Status snapshot: ${escapeHTML(buildCompactMap(statusMap))}</p>
      </div>
    `;
    return;
  }

  aiFlaggedList.innerHTML = flagged.map((book) => `
    <article class="content-card">
      <div class="content-info">
        <div>
          <h3>${escapeHTML(book.title)}</h3>
          <p>${escapeHTML(book.moderationReason || "AI moderation details available in the report view.")}</p>
          <div class="signals">
            <span class="signal ai">${escapeHTML(book.aiStatus || "pending")}</span>
            <span class="signal originality">Risk ${Number(book.plagiarismScore || 0)}%</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="changes" onclick="window.location.href='../ai/ai-review.html?id=${encodeURIComponent(book._id)}'">Open Report</button>
      </div>
    </article>
  `).join("");
}

function openAiReport(bookId) {
  window.location.href = `../ai/ai-review.html?id=${encodeURIComponent(bookId)}`;
}

function logoutUser() {
  fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true
  }).catch(() => null);
  localStorage.clear();
  window.location.href = "../login.html";
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return {
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m];
  });
}

function buildCompactMap(map) {
  return Object.entries(map || {})
    .map(([label, value]) => `${label}: ${value}`)
    .join(" • ");
}

loadPendingBooks();
