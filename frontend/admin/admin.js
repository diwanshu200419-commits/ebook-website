/* ================================
   ADMIN DASHBOARD – REAL WORKING
================================ */

/* ========= AUTH ========= */
if (typeof protectPage === "function") {
  protectPage(["admin"]);
}

/* ========= DOM ========= */
const navLinks = document.querySelectorAll(".sidebar-nav a");
const sections = document.querySelectorAll(".admin-section");

const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");

const reviewList = document.getElementById("contentList");
const approvedList = document.getElementById("approvedList");

/* ========= HEADER TEXT ========= */
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

/* ========= SIDEBAR NAV ========= */
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.target;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    sections.forEach((s) => s.classList.remove("active"));
    document.getElementById(target).classList.add("active");

    pageTitle.textContent = HEADERS[target].title;
    pageSub.textContent = HEADERS[target].sub;
  });
});

/* ========= DATA ========= */
let pendingContent = [
  {
    id: 1,
    title: "Advanced Java Handwritten Notes",
    creator: "Yash Parmar",
    type: "Notes",
    price: 99,
    aiScore: 91,
  },
  {
    id: 2,
    title: "AI for Beginners",
    creator: "Nishant Chopra",
    type: "E-Book",
    price: 199,
    aiScore: 88,
  },
];

let approvedContent = [];

/* ========= RENDER PENDING ========= */
function renderPending() {
  reviewList.innerHTML = "";

  if (pendingContent.length === 0) {
    reviewList.innerHTML = "<p style='opacity:.7'>No pending content</p>";
    return;
  }

  pendingContent.forEach((item) => {
    const card = document.createElement("div");
    card.className = "content-card";

    card.innerHTML = `
      <div class="content-info">
        <h3>${item.title}</h3>
        <p>
          ${item.type} • ₹${item.price}<br/>
          Creator: <strong>${item.creator}</strong>
        </p>
        <div class="signals">
          <span class="signal ai">AI ${item.aiScore}%</span>
        </div>
      </div>

      <div class="actions">
        <button class="approve">Approve</button>
        <button class="reject">Reject</button>
      </div>
    `;

    card.querySelector(".approve").onclick = () =>
      approveContent(item.id);
    card.querySelector(".reject").onclick = () =>
      rejectContent(item.id);

    reviewList.appendChild(card);
  });
}

/* ========= RENDER APPROVED ========= */
function renderApproved() {
  approvedList.innerHTML = "";

  if (approvedContent.length === 0) {
    approvedList.innerHTML =
      "<p style='opacity:.7'>No approved content yet</p>";
    return;
  }

  approvedContent.forEach((item) => {
    const card = document.createElement("div");
    card.className = "content-card";

    card.innerHTML = `
      <div class="content-info">
        <h3>${item.title}</h3>
        <p>
          ${item.type} • ₹${item.price}<br/>
          Creator: <strong>${item.creator}</strong><br/>
          Approved on: ${item.approvedAt}
        </p>
      </div>
    `;

    approvedList.appendChild(card);
  });
}

/* ========= ACTIONS ========= */
function approveContent(id) {
  const item = pendingContent.find((i) => i.id === id);
  if (!item) return;

  approvedContent.push({
    ...item,
    approvedAt: new Date().toLocaleDateString(),
  });

  pendingContent = pendingContent.filter((i) => i.id !== id);

  renderPending();
  renderApproved();
}

function rejectContent(id) {
  const reason = prompt("Reason for rejection?");
  if (!reason) return;

  pendingContent = pendingContent.filter((i) => i.id !== id);
  renderPending();
}

/* ========= LOGOUT ========= */
function logoutUser() {
  localStorage.clear();
  window.location.href = "../login.html";
}

/* ========= INIT ========= */
renderPending();
renderApproved();
