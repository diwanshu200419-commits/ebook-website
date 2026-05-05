/* =========================
GLOBAL AUTH SYSTEM
E-BOOK MARKET STARTUP
========================= */

const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";


/* =========================
PROTECT PAGE
========================= */

async function protectPage(){

const token = localStorage.getItem("token");

/* If no token → login */
if(!token){

redirectLogin();
return;

}

try{

const res = await fetch(`${API_BASE}/api/user/profile`,{
headers:{
Authorization:`Bearer ${token}`
}
});

/* Invalid token */
if(!res.ok){
throw new Error("Token invalid");
}

const data = await res.json();

/* Save fresh user data */
localStorage.setItem("user",JSON.stringify(data.user));

}catch(err){

console.log("Auth error:",err);

/* Logout if token invalid */
logoutUser();

}

}


/* =========================
REDIRECT LOGIN
========================= */

function redirectLogin(){

/* detect correct path */
if(window.location.pathname.includes("/dashboard/")){
window.location.href="../login.html";
}else{
window.location.href="login.html";
}

}


/* =========================
LOGOUT SYSTEM
========================= */

function logoutUser(){

localStorage.removeItem("token");
localStorage.removeItem("user");

/* redirect safely */
redirectLogin();

}


/* =========================
GET CURRENT USER
========================= */

function getCurrentUser(){

const user = JSON.parse(localStorage.getItem("user") || "{}");

return user;

}


/* =========================
CHECK ROLE
========================= */

function isAdmin(){

const user = getCurrentUser();

return user && user.role === "admin";

}


function isCreator(){

const user = getCurrentUser();

return user && user.role === "creator";

}


/* =========================
CHECK LOGIN STATE
========================= */

function isLoggedIn(){

return !!localStorage.getItem("token");

}


/* =========================
AUTO RUN AUTH GUARD
========================= */

protectPage();