const API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:5000"
    : window.location.origin;

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function initNavbar() {
  const nav = document.getElementById("mainNav");
  if (!nav) {
    return;
  }

  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) {
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="#features">How It Works</a>
      <a href="#featured">Marketplace</a>
      <a href="ai/ai-review.html">AI Tools</a>
      <a class="btn-outline" href="login.html">Sign In</a>
      <a class="btn" href="register.html">Register</a>
    `;
    return;
  }

  const dashboardLink =
    user.role === "admin" ? "admin/admin.html" : "dashboard/dashboard.html";

  nav.innerHTML = `
    <a href="index.html">Home</a>
    <a href="#features">How It Works</a>
    <a href="#featured">Marketplace</a>
    <a href="ai/ai-review.html">AI Tools</a>
    <a class="btn-outline" href="${dashboardLink}">Dashboard</a>
    <a class="btn" href="#" id="logoutBtn">Logout</a>
  `;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
    });
  }
}

async function loadFeaturedBooks() {
  const container = document.getElementById("featuredApprovedList");
  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading featured books...</p>";

  try {
    const response = await fetch(`${API_BASE}/api/books/featured`);
    const payload = await response.json();
    const books = payload.books || [];

    if (!response.ok) {
      throw new Error(payload.message || "Unable to load featured books");
    }

    if (books.length === 0) {
      container.innerHTML = `
        <div class="market-card">
          <h3>No featured books yet</h3>
          <p>The first approved creator uploads will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = books
      .map((book) => {
        return `
          <article class="featured-card">
            <a href="book_view.html?id=${book._id}">
              <img src="${book.coverImage}" alt="${book.title}">
              <h3>${escapeHtml(book.title)}</h3>
              <p>${escapeHtml(book.category)}</p>
              <span class="price">Rs.${Number(book.price || 0).toLocaleString("en-IN")}</span>
            </a>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `
      <div class="market-card">
        <h3>Featured books unavailable</h3>
        <p>Start the backend to load approved marketplace content.</p>
      </div>
    `;
  }
}

function animateCounters() {
  const counters = document.querySelectorAll("[data-count]");
  counters.forEach((counter) => {
    const target = Number(counter.getAttribute("data-count") || 0);
    const prefix = counter.textContent.trim().startsWith("Rs.") ? "Rs." : "";
    let current = 0;
    const increment = Math.max(1, Math.floor(target / 120));

    const tick = () => {
      current += increment;
      if (current >= target) {
        counter.textContent = `${prefix}${target.toLocaleString("en-IN")}+`;
        return;
      }

      counter.textContent = `${prefix}${current.toLocaleString("en-IN")}+`;
      requestAnimationFrame(tick);
    };

    tick();
  });
}

function initCounterObserver() {
  const statsSection = document.querySelector(".stats");
  if (!statsSection) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });
  });

  observer.observe(statsSection);
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function initCardMotion() {
  document.querySelectorAll(".book-card, .market-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-8px)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function initScrollNav() {
  const nav = document.querySelector(".nav");
  if (!nav) {
    return;
  }

  window.addEventListener("scroll", () => {
    nav.classList.toggle("nav-scrolled", window.scrollY > 60);
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initCounterObserver();
  initSmoothScroll();
  initCardMotion();
  initScrollNav();
  loadFeaturedBooks();
});
