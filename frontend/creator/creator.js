/* =========================
CREATOR MARKETPLACE SYSTEM
E-BOOK MARKET STARTUP
========================= */

const API_BASE = "https://ebook-website-v2mj.onrender.com";

/* =========================
GET USER TOKEN
========================= */

const token = localStorage.getItem("token");

let currentUser = null;

try{
currentUser = JSON.parse(localStorage.getItem("user"));
}catch{}


/* =========================
GET CREATOR USERNAME
========================= */

const params = new URLSearchParams(window.location.search);
const username = params.get("username");


/* =========================
LOAD CREATOR PROFILE
========================= */

async function loadCreatorProfile(){

try{

const res = await fetch(`${API_BASE}/api/creator/${username}`);

const data = await res.json();

const creator = data.creator;


/* PROFILE INFO */

document.getElementById("creatorName").innerText = creator.name;

document.getElementById("creatorBio").innerText =
creator.bio || "Creator on E-Book Market";

document.getElementById("creatorAbout").innerText =
creator.about || "Sharing knowledge through digital books.";

document.getElementById("creatorAvatar").src =
creator.avatar || "../assets/avatar.png";


/* VERIFIED BADGE */

if(!creator.verified){

document.getElementById("verifiedBadge").style.display = "none";

}


/* STATS */

document.getElementById("booksCount").innerText =
creator.booksCount || 0;

document.getElementById("followersCount").innerText =
creator.followers || 0;

document.getElementById("salesCount").innerText =
creator.sales || 0;

document.getElementById("earnings").innerText =
"₹" + (creator.earnings || 0);


/* WEBSITE */

if(creator.website){

document.getElementById("creatorWebsite").href =
creator.website;

}else{

document.getElementById("creatorWebsite").style.display="none";

}


/* BOOKS */

renderBooks(data.books);


/* FOLLOW STATE */

checkFollowState(creator._id);


}catch(err){

console.error("Creator load error:",err);

}

}



/* =========================
RENDER CREATOR BOOKS
========================= */

function renderBooks(books){

const grid = document.getElementById("booksGrid");

grid.innerHTML = "";

if(!books.length){

grid.innerHTML = "<p>No books published yet.</p>";
return;

}

books.forEach(book=>{

grid.innerHTML += `

<div class="book-card">

<img src="/uploads/${book.cover}" class="book-cover">

<div class="book-info">

<h3>${book.title}</h3>

<p class="price">₹${book.price}</p>

<a href="../book_view.html?id=${book._id}" class="btn-outline">

View Book

</a>

</div>

</div>

`;

});

}



/* =========================
FOLLOW SYSTEM
========================= */

async function followCreator(){

if(!token){

window.location.href="../login.html";
return;

}

try{

const res = await fetch(`${API_BASE}/api/follow/${username}`,{

method:"POST",

headers:{
Authorization:`Bearer ${token}`
}

});

const data = await res.json();

updateFollowButton(data.following);

}catch(err){

console.error("Follow error",err);

}

}



function updateFollowButton(following){

const btn = document.getElementById("followBtn");

if(following){

btn.innerText="Following";
btn.classList.add("following");

}else{

btn.innerText="Follow Creator";
btn.classList.remove("following");

}

}



async function checkFollowState(creatorId){

if(!token) return;

try{

const res = await fetch(`${API_BASE}/api/follow/state/${creatorId}`,{

headers:{
Authorization:`Bearer ${token}`
}

});

const data = await res.json();

updateFollowButton(data.following);

}catch(err){

console.log(err);

}

}



/* =========================
TRENDING CREATORS
========================= */

async function loadTrendingCreators(){

try{

const res = await fetch(`${API_BASE}/api/creator/trending`);

const creators = await res.json();

const container = document.getElementById("trendingCreators");

if(!container) return;

container.innerHTML="";

creators.forEach(c=>{

container.innerHTML += `

<div class="creator-card">

<img src="${c.avatar || "../assets/avatar.png"}">

<h4>${c.name}</h4>

<p>${c.booksCount} books</p>

<a href="creator.html?username=${c.username}">
View Profile
</a>

</div>

`;

});

}catch(err){

console.log("Trending creators error",err);

}

}



/* =========================
FOLLOW BUTTON EVENT
========================= */

const followBtn = document.getElementById("followBtn");

if(followBtn){

followBtn.addEventListener("click",followCreator);

}



/* =========================
INIT PAGE
========================= */

loadCreatorProfile();

loadTrendingCreators();