/* =========================
   3D BOOK CARD EFFECT
========================= */

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

    card.style.transform =
      `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;

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
STARTUP NAVBAR SYSTEM
========================= */

function initNavbar(){

const nav = document.getElementById("mainNav");

if(!nav) return;

const token = localStorage.getItem("token");

if(!token) return;

let user = null;

try{
user = JSON.parse(localStorage.getItem("user"));
}catch{}

let dashboardLink = "dashboard/dashboard.html";

if(user?.role === "admin"){
dashboardLink = "admin/admin-dashboard.html";
}

if(user?.role === "creator"){
dashboardLink = "dashboard/dashboard.html";
}

nav.innerHTML = `

<a href="index.html">Home</a>
<a href="#features">How It Works</a>
<a href="#marketplace">Marketplace</a>
<a href="ai/ai-review.html">AI Tools</a>

<a href="${dashboardLink}" class="btn-outline">
Dashboard
</a>

<a href="#" id="logoutBtn" class="btn">
Logout
</a>

`;

const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){

logoutBtn.addEventListener("click", ()=>{

localStorage.removeItem("token");
localStorage.removeItem("user");

window.location.reload();

});

}

}

initNavbar();



/* =========================
   FEATURED BOOKS LOADER
========================= */

async function loadFeaturedBooks(){

  const container = document.getElementById("featuredApprovedList");

  if(!container) return;

  try{

    const res = await fetch("http://localhost:5000/api/books/featured");

    const books = await res.json();

    container.innerHTML = "";

    books.forEach(book => {

      const card = document.createElement("div");

      card.className = "featured-card";

      card.innerHTML = `
      
      <a href="book_view.html?id=${book._id}">
        <img src="${book.cover}" alt="${book.title}">
        <h3>${book.title}</h3>
        <p>${book.category}</p>
        <span class="price">₹${book.price}</span>
      </a>

      `;

      container.appendChild(card);

    });

  }

  catch(err){

    console.log("Featured books API not connected yet");

  }

}

loadFeaturedBooks();



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



/* =========================
   STARTUP SCROLL EFFECT
========================= */

window.addEventListener("scroll", () => {

  const nav = document.querySelector(".nav");

  if(window.scrollY > 60){

    nav.classList.add("nav-scrolled");

  }else{

    nav.classList.remove("nav-scrolled");

  }

});
/* =========================
GLOBAL NAVBAR AUTH SYSTEM
========================= */

function initNavbar(){

const nav = document.getElementById("mainNav");

if(!nav) return;

const token = localStorage.getItem("token");

let user = null;

try{
user = JSON.parse(localStorage.getItem("user"));
}catch{}

/* -------------------------
NOT LOGGED IN
------------------------- */

if(!token){

nav.innerHTML = `

<a href="index.html">Home</a>
<a href="#features">Features</a>
<a href="ai/ai-review.html">AI Tools</a>

<a class="btn-outline" href="login.html">
Sign In
</a>

<a class="btn" href="register.html">
Register
</a>

`;

return;

}

/* -------------------------
LOGGED IN
------------------------- */

let dashboardLink = "dashboard/dashboard.html";

if(user?.role === "admin"){
dashboardLink = "admin/admin.html";
}

nav.innerHTML = `

<a href="index.html">Home</a>
<a href="#features">How It Works</a>
<a href="#featured">Marketplace</a>
<a href="ai/ai-review.html">AI Tools</a>

<a href="${dashboardLink}" class="btn-outline">
Dashboard
</a>

<a href="#" id="logoutBtn" class="btn">
Logout
</a>

`;

/* -------------------------
LOGOUT
------------------------- */

const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){

logoutBtn.addEventListener("click",()=>{

localStorage.removeItem("token");
localStorage.removeItem("user");

window.location.href="index.html";

});

}

}

initNavbar();
/* =========================
ADVANCED STARTUP NAVBAR
========================= */

function initNavbar(){

const nav = document.getElementById("mainNav");

if(!nav) return;

const token = localStorage.getItem("token");

let user = null;

try{
user = JSON.parse(localStorage.getItem("user"));
}catch{}

/* -------------------------
NOT LOGGED IN
------------------------- */

if(!token){

nav.innerHTML = `

<a href="index.html">Home</a>
<a href="#features">Features</a>
<a href="ai/ai-review.html">AI Tools</a>

<a class="btn-outline" href="login.html">
Sign In
</a>

<a class="btn" href="register.html">
Register
</a>

`;

return;

}

/* -------------------------
LOGGED IN NAVBAR
------------------------- */

const username = user?.name || "Creator";

nav.innerHTML = `

<a href="index.html">Home</a>
<a href="#featured">Marketplace</a>
<a href="ai/ai-review.html">AI Tools</a>

<div class="profile-menu">

<button class="profile-btn">

<img src="assets/avatar.png" class="avatar">

<span>${username}</span>

<i class="fa fa-chevron-down"></i>

</button>

<div class="dropdown">

<a href="dashboard/dashboard.html">
Dashboard
</a>

<a href="dashboard/earning.html">
Earnings
</a>

<a href="dashboard/upload.html">
Upload Book
</a>

<a href="dashboard/setting.html">
Settings
</a>

<a href="#" id="logoutBtn">
Logout
</a>

</div>

</div>

`;

const profileBtn = document.querySelector(".profile-btn");
const dropdown = document.querySelector(".dropdown");

if(profileBtn){

profileBtn.addEventListener("click",()=>{

dropdown.classList.toggle("show");

});

}

/* -------------------------
LOGOUT
------------------------- */

const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){

logoutBtn.addEventListener("click",()=>{

localStorage.removeItem("token");
localStorage.removeItem("user");

window.location.href="index.html";

});

}

}

initNavbar();
async function loadTrendingBooks(){

const container = document.getElementById("featuredApprovedList");

if(!container) return;

try{

const res = await fetch("http://localhost:5000/api/marketplace/trending");

const books = await res.json();
const data = data.books;

container.innerHTML = "";

books.forEach(book=>{

container.innerHTML += `

<div class="book-card">

<img src="/uploads/${book.cover}">

<h3>${book.title}</h3>

<p>₹${book.price}</p>

<a href="book_view.html?id=${book._id}">
View Book
</a>

</div>

`;

});

}catch(err){

console.log(err);

}

}

loadTrendingBooks();