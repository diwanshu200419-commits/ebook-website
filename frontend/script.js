const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";

/* =========================
   3D BOOK CARD EFFECT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".book-card");

  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = -(y - centerY) / 15;
      const rotateY = (x - centerX) / 15;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = `rotateX(0) rotateY(0)`;
    });
  });

  /* =========================
     STATS COUNTER ANIMATION
  ========================= */

  const counters = document.querySelectorAll("[data-count]");

  const animateCounters = () => {
    counters.forEach(counter => {
      const target = +counter.getAttribute("data-count");
      let count = 0;
      const speed = target / 120;
      const update = () => {
        count += speed;
        if (count < target) {
          counter.innerText = Math.floor(count).toLocaleString();
          requestAnimationFrame(update);
        } else {
          counter.innerText = target.toLocaleString();
        }
      };
      update();
    });
  };

  const statsSection = document.querySelector(".stats");
  if (statsSection) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      });
    });
    observer.observe(statsSection);
  }

  /* =========================
     SMOOTH SCROLL NAVIGATION
  ========================= */

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });

  /* =========================
     STARTUP SCROLL EFFECT
  ========================= */

  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".nav");
    if (window.scrollY > 60) {
      nav.classList.add("nav-scrolled");
    } else {
      nav.classList.remove("nav-scrolled");
    }
  });

  /* =========================
     MARKETPLACE CARD ANIMATION
  ========================= */

  const marketCards = document.querySelectorAll(".market-card");
  marketCards.forEach(card => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-10px)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0px)";
    });
  });
});

/* =========================
   GLOBAL NAVBAR AUTH SYSTEM
========================= */

function initNavbar() {
  const nav = document.getElementById("mainNav");
  if (!nav) return;

  const token = localStorage.getItem("token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (e) {
    console.error("Error parsing user from localStorage:", e);
  }

  /* -------------------------
  NOT LOGGED IN
  ------------------------- */
  if (!token) {
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="#marketplace">Marketplace</a>
      <a href="ai/ai-review.html">AI Tools</a>
      <a href="explore.html">My Library</a>
      <a class="btn-outline" href="login.html">Sign In</a>
      <a class="btn" href="register.html">Register</a>
    `;
    return;
  }

  /* -------------------------
  LOGGED IN NAVBAR
  ------------------------- */
  let dashboardLink = "dashboard/dashboard.html";
  if (user?.role === "admin") {
    dashboardLink = "admin/admin.html";
  }

  nav.innerHTML = `
    <a href="index.html">Home</a>
    <a href="#marketplace">Marketplace</a>
    <a href="ai/ai-review.html">AI Tools</a>
    <a href="explore.html">My Library</a>
    <a href="${dashboardLink}" class="btn-outline">Dashboard</a>
    <a href="#" id="logoutBtn" class="btn">Logout</a>
  `;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
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
}

initNavbar();

/* =========================
   FEATURED BOOKS LOADER
========================= */

async function loadFeaturedBooks() {
  const container = document.getElementById("featuredApprovedList");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/books`);
    const result = await res.json();
    const books = result.books || [];

    container.innerHTML = "";

    books.forEach(book => {
      const coverSrc = book.coverUrl || (book.cover ? `${API_BASE}${book.cover}` : "assets/covers/Ebook_AI.png");
      const card = document.createElement("div");
      card.className = "featured-card";
      card.innerHTML = `
        <a href="book_view.html?id=${book._id}">
          <img src="${coverSrc}" alt="${book.title}">
          <h3>${book.title}</h3>
          <p>${book.category}</p>
          <span class="price">${book.isFree ? "FREE" : "₹" + book.price}</span>
        </a>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading featured books:", err);
  }
}

loadFeaturedBooks();
