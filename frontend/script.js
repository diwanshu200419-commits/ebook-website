const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initVisualMotion();
  decorateHeroCards();
  loadHomepageData();
});

function initVisualMotion() {
  document.querySelectorAll(".book-card, .featured-card, .category-card, .testimonial-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      card.style.transform = `translateY(-6px) rotateX(${(-offsetY / 28).toFixed(2)}deg) rotateY(${(offsetX / 28).toFixed(2)}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".nav");
    if (!nav) {
      return;
    }

    nav.classList.toggle("nav-scrolled", window.scrollY > 40);
  });
}

function initNavbar() {
  const nav = document.getElementById("mainNav");
  if (!nav) {
    return;
  }

  const token = localStorage.getItem("token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!token) {
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="#marketplace">Marketplace</a>
      <a href="ai/ai-review.html">AI Tools</a>
      <a href="explore.html">Explore</a>
      <a class="btn-outline" href="login.html">Sign In</a>
      <a class="btn" href="register.html">Register</a>
    `;
    return;
  }

  const dashboardLink = user?.role === "admin" ? "admin/admin.html" : "dashboard/dashboard.html";
  nav.innerHTML = `
    <a href="index.html">Home</a>
    <a href="#marketplace">Marketplace</a>
    <a href="ai/ai-review.html">AI Tools</a>
    <a href="explore.html">Explore</a>
    <a href="${dashboardLink}" class="btn-outline">Dashboard</a>
    <a href="#" id="logoutBtn" class="btn">Logout</a>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", (event) => {
    event.preventDefault();
    fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true
    }).catch(() => null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  });
}

function decorateHeroCards() {
  const heroStats = document.querySelectorAll(".hero-stat span");
  if (heroStats.length >= 3) {
    heroStats[1].textContent = "Secure downloads";
    heroStats[2].textContent = "Real purchase unlocks";
  }

  const heroFeatures = document.querySelectorAll(".hero-feature span:last-child");
  const featureCopy = [
    "Approved books only",
    "Creator and reader dashboards",
    "Responsive marketplace browsing",
    "Real earnings tracking",
    "Protected downloads",
    "Upload moderation workflow"
  ];
  heroFeatures.forEach((item, index) => {
    if (featureCopy[index]) {
      item.textContent = featureCopy[index];
    }
  });

  const lockedCards = document.querySelectorAll(".card-wrap .book-card.locked");
  if (lockedCards.length < 2) {
    return;
  }

  lockedCards[0].href = "explore.html";
  lockedCards[0].querySelector("img").alt = "Dynamic marketplace";
  lockedCards[0].querySelector(".price").textContent = "REAL LISTINGS";
  lockedCards[0].querySelector("h3").textContent = "Dynamic Marketplace";
  lockedCards[0].querySelector("p").textContent = "Only approved database books appear here.";
  lockedCards[0].querySelector("small").textContent = "Search, sort and filter in real time.";
  lockedCards[0].querySelector(".cta-btn").textContent = "Explore Now ->";

  lockedCards[1].href = "dashboard/upload.html";
  lockedCards[1].querySelector("img").alt = "Creator upload studio";
  lockedCards[1].querySelector(".price").textContent = "UPLOAD FLOW";
  lockedCards[1].querySelector("h3").textContent = "Creator Upload Studio";
  lockedCards[1].querySelector("p").textContent = "Drag, drop, validate and publish with moderation.";
  lockedCards[1].querySelector("small").textContent = "Creator dashboard sync included.";
  lockedCards[1].querySelector(".cta-btn").textContent = "Open Studio ->";
}

async function loadHomepageData() {
  try {
    const response = await fetch(`${API_BASE}/api/books?limit=8&sort=trending`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load marketplace");
    }

    renderCategories(data.filters?.categories || []);
    renderFeaturedBooks(data.books || []);
  } catch (error) {
    console.error("Homepage data failed:", error);
    renderCategories([]);
    renderFeaturedBooks([]);
  }
}

function renderCategories(categories) {
  const container = document.querySelector(".categories-grid");
  if (!container) {
    return;
  }

  const iconMap = {
    Business: "B",
    Education: "E",
    Technology: "T",
    Programming: "P",
    AI: "AI",
    Notes: "N",
    Comics: "C",
    "Self Help": "S",
    Competitive: "X",
    Other: "O"
  };

  if (!categories.length) {
    container.innerHTML = `
      <div class="category-card">
        <div class="category-icon">DB</div>
        <h3>No approved books yet</h3>
        <p>Categories will update automatically after uploads are approved.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = categories.slice(0, 8).map((category) => `
    <div class="category-card">
      <div class="category-icon">${escapeHTML(iconMap[category.name] || category.name.slice(0, 2).toUpperCase())}</div>
      <h3>${escapeHTML(category.name)}</h3>
      <p>${Number(category.count || 0).toLocaleString("en-IN")} live books</p>
    </div>
  `).join("");
}

function renderFeaturedBooks(books) {
  const container = document.getElementById("featuredApprovedList");
  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
      <div class="featured-card">
        <div style="padding:24px;">
          <h3>No approved books yet</h3>
          <p style="color:#94a3b8; line-height:1.6;">The marketplace will fill with real uploads once creators submit books and they pass review.</p>
          <a href="dashboard/upload.html" class="btn" style="display:inline-block; margin-top:12px;">Open Upload Studio</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = books.map((book) => {
    const coverSrc = resolveAssetUrl(book.coverUrl || book.cover || "assets/covers/Ebook_AI.png");
    const price = Number(book.price || 0) > 0 ? `Rs. ${Number(book.price || 0).toLocaleString("en-IN")}` : "FREE";
    return `
      <div class="featured-card">
        <a href="book_view.html?id=${encodeURIComponent(book._id)}">
          <img src="${escapeAttribute(coverSrc)}" alt="${escapeAttribute(book.title)}">
          <h3>${escapeHTML(book.title)}</h3>
          <p>${escapeHTML(book.category || "Book")} · ${escapeHTML(book.authorName || "Creator")}</p>
          <span class="price">${escapeHTML(price)}</span>
        </a>
      </div>
    `;
  }).join("");
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

function resolveAssetUrl(value) {
  const source = String(value || "");
  if (!source) {
    return "assets/covers/Ebook_AI.png";
  }

  if (/^(https?:|data:|assets\/|\.\.\/|\.\/)/i.test(source)) {
    return source;
  }

  if (source.startsWith("/uploads")) {
    return `${API_BASE}${source}`;
  }

  return source;
}
