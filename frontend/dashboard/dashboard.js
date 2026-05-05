/*===================================
🚀 DASHBOARD JS – ULTRA SaaS VERSION
===================================*/

const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";

let earningsChartInstance = null;
let globalSalesChartInstance = null;
let heatmapChart = null;

let liveEarningsTimer = null;

/*===================================
INIT
===================================*/

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {

const token = getToken();
if(!token) return logoutAndRedirect();

let user = getStoredUser();

try{

if(!user){

const res = await fetch(`${API_BASE}/api/user/profile`,{
headers:{Authorization:`Bearer ${token}`}
});

if(!res.ok) throw new Error();

const data = await res.json();
user = data.user;

localStorage.setItem("user",JSON.stringify(user));

}

renderUser(user);
setupLogout();

await loadDashboardData(token);
liveSalesPopup();

/* AUTO REFRESH DASHBOARD */
setInterval(()=>{
loadDashboardData(token);
},30000);

/* SIMULATE LIVE SALES */
simulateLiveSales();

}catch(err){

console.error("Init Failed:",err);
logoutAndRedirect();

}

}

/*===================================
AUTH HELPERS
===================================*/

function getToken(){

const token = localStorage.getItem("token");

if(!token || token==="null" || token==="undefined") return null;

return token;

}

function getStoredUser(){

try{
const stored = localStorage.getItem("user");
return stored ? JSON.parse(stored) : null;
}catch{
return null;
}

}

function logoutAndRedirect(){

localStorage.clear();
window.location.href="../login.html";

}

/*===================================
USER RENDER
===================================*/

function renderUser(user){

setText("userName",user.name || "Creator");
setText("roleBadge",(user.role || "creator").toUpperCase());

}

/*===================================
LOGOUT
===================================*/

function setupLogout(){

const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){
logoutBtn.addEventListener("click",logoutAndRedirect);
}

}

/*===================================
LOAD DATA
===================================*/

async function loadDashboardData(token){

try{

const res = await fetch(`${API_BASE}/api/dashboard/user`,{
headers:{Authorization:`Bearer ${token}`}
});

if(res.status===401) return logoutAndRedirect();

const data = await res.json();

updateStats(data);

renderChart(data.chart);

// creator radar
renderCreatorRadar(data);

renderGlobalSales(data.countrySales || {});
renderTopBooks(data.topBooks || []);
renderRecentSales(data.recentSales || []);

updateLiveEarnings(data);

renderDownloadHeatmap(data.downloadHeatmap || {});
renderLeaderboard(data.leaderboard || []);
renderTrendingAuthors(data.trendingAuthors || []);
renderRecommendations(data.recommendedBooks || []);

calculateCreatorScore(data);
calculateForecast(data);

}catch(err){

console.error("Dashboard Load Failed:",err);

}

}

/*===================================
LIVE EARNINGS COUNTER
===================================*/

function updateLiveEarnings(data){

let earnings = data.totalEarnings || 0;

if(liveEarningsTimer) clearInterval(liveEarningsTimer);

liveEarningsTimer = setInterval(()=>{

earnings += Math.floor(Math.random()*20);

setText("totalEarnings",formatCurrency(earnings));

},4000);

}

/*===================================
UPDATE STATS
===================================*/

function updateStats(data){

animateValue("totalEarnings",0,data.totalEarnings,1200);
setText("monthlyEarnings",formatCurrency(data.monthlyEarnings));
setText("walletBalance",formatCurrency(data.walletBalance));

setText("totalDownloads",data.totalDownloads || 0);
setText("totalBooks",data.totalBooks || 0);

}

/*===================================
EARNINGS CHART
===================================*/

function renderChart(chartData){

if(!chartData?.labels) return;

const canvas = document.getElementById("earningsChart");
if(!canvas) return;

if(earningsChartInstance) earningsChartInstance.destroy();

earningsChartInstance = new Chart(canvas,{

type:"line",

data:{
labels:chartData.labels,
datasets:[{
label:"Earnings",
data:chartData.values,
borderColor:"#8b5cf6",
backgroundColor:"rgba(139,92,246,0.2)",
fill:true,
tension:0.4
}]
},

options:{
responsive:true,
plugins:{
legend:{labels:{color:"#fff"}}
}
}

});

}
/* creator radar chart */
function renderCreatorRadar(data){

const canvas=document.getElementById("creatorRadar");
if(!canvas) return;

new Chart(canvas,{
type:"radar",
data:{
labels:["Downloads","Books","Revenue","Growth","Engagement"],
datasets:[{
label:"Creator Score",
data:[
data.totalDownloads/10,
data.totalBooks*10,
data.totalEarnings/100,
Math.random()*100,
Math.random()*100
],
backgroundColor:"rgba(139,92,246,0.3)",
borderColor:"#8b5cf6"
}]
}
});

}

/*===================================
GLOBAL SALES
===================================*/

function renderGlobalSales(countrySales){

const canvas=document.getElementById("globalSalesChart");
if(!canvas) return;

if(globalSalesChartInstance) globalSalesChartInstance.destroy();

globalSalesChartInstance=new Chart(canvas,{

type:"doughnut",

data:{
labels:Object.keys(countrySales),
datasets:[{

data:Object.values(countrySales),

backgroundColor:[
"#8b5cf6",
"#22c55e",
"#3b82f6",
"#f59e0b",
"#ef4444"
]

}]
}

});

}

/*===================================
DOWNLOAD HEATMAP
===================================*/

function renderDownloadHeatmap(data){

const canvas=document.getElementById("downloadHeatmap");
if(!canvas) return;

if(heatmapChart) heatmapChart.destroy();

heatmapChart=new Chart(canvas,{

type:"bar",

data:{
labels:Object.keys(data),
datasets:[{
label:"Downloads",
data:Object.values(data),
backgroundColor:"#22c55e"
}]
}

});

}

/*===================================
TOP BOOKS
===================================*/

function renderTopBooks(books){

const container=document.getElementById("topBooksContainer");
if(!container) return;

container.innerHTML="";

books.forEach(book=>{

const div=document.createElement("div");
div.className="book-card";

div.innerHTML=`

<h4>${escapeHTML(book.title)}</h4>
<p>Downloads: ${book.downloads || 0}</p>
<p>Earnings: ${formatCurrency(book.earnings)}</p>

`;

container.appendChild(div);

});

}

/*===================================
RECENT SALES
===================================*/

function renderRecentSales(sales){

const container=document.getElementById("salesFeed");
if(!container) return;

container.innerHTML="";

sales.forEach(sale=>{

const div=document.createElement("div");

div.className="sale-item";

div.innerHTML=`
<strong>${escapeHTML(sale.book)}</strong>
<span>${formatCurrency(sale.amount)}</span>
`;

container.appendChild(div);

});

}

/*===================================
LEADERBOARD
===================================*/

function renderLeaderboard(list){

const container=document.getElementById("leaderboardContainer");
if(!container) return;

container.innerHTML="";

list.forEach((user,index)=>{

const div=document.createElement("div");

div.innerHTML=`
#${index+1} ${escapeHTML(user.name)} — ${formatCurrency(user.earnings)}
`;

container.appendChild(div);

});

}

/*===================================
TRENDING AUTHORS
===================================*/

function renderTrendingAuthors(authors){

const container=document.getElementById("trendingAuthors");
if(!container) return;

container.innerHTML="";

authors.forEach(author=>{

const div=document.createElement("div");

div.innerHTML=`
<strong>${escapeHTML(author.name)}</strong>
<p>${author.books} books</p>
`;

container.appendChild(div);

});

}

/*===================================
RECOMMENDED BOOKS
===================================*/

function renderRecommendations(books){

const container=document.getElementById("recommendedBooks");
if(!container) return;

container.innerHTML="";

books.forEach(book=>{

const div=document.createElement("div");

div.className="book-card";

div.innerHTML=`
<h4>${escapeHTML(book.title)}</h4>
<p>${book.category}</p>
`;

container.appendChild(div);

});

}

/*===================================
CREATOR SCORE
===================================*/

function calculateCreatorScore(data){

const score =
(data.totalDownloads||0)*0.1 +
(data.totalBooks||0)*5 +
(data.totalEarnings||0)/500;

setText("creatorScore",Math.min(100,Math.floor(score)));

}

/*===================================
AI FORECAST
===================================*/

function calculateForecast(data){

const revenue = (data.monthlyEarnings||0)*1.15;

const growth = Math.floor(Math.random()*20)+5;

setText("forecastRevenue",formatCurrency(revenue));
setText("forecastGrowth",growth+"%");
setText("salesMomentum",growth>15?"High":"Moderate");

}

/*===================================
SIMULATE LIVE SALES
===================================*/

function simulateLiveSales(){

const container = document.getElementById("salesFeed");
if(!container) return;

const books=[
"JavaScript Guide",
"Python Basics",
"Data Structures",
"AI Fundamentals",
"Web Development"
];

setInterval(()=>{

const book = books[Math.floor(Math.random()*books.length)];
const amount = Math.floor(Math.random()*400)+100;

const div=document.createElement("div");

div.className="sale-item";

div.innerHTML=`
<strong>${book}</strong>
<span>₹${amount}</span>
`;

container.prepend(div);

if(container.children.length>5){
container.removeChild(container.lastChild);
}

},5000);

}

/*===================================
LIVE SALES POPUP
===================================*/

function liveSalesPopup(){

const books=[
"AI Fundamentals",
"JavaScript Guide",
"Python Basics",
"Data Structures",
"Web Development"
];

setInterval(()=>{

const book=books[Math.floor(Math.random()*books.length)];
const amount=Math.floor(Math.random()*400)+100;

const popup=document.createElement("div");

popup.className="sale-popup";

popup.innerHTML=`
📚 ${book} sold
<span>₹${amount}</span>
`;

document.body.appendChild(popup);

setTimeout(()=>popup.remove(),4000);

},8000);

}

/*===================================
UTILS
===================================*/


function setText(id,value){

const el=document.getElementById(id);
if(el) el.innerText=value;

}

function formatCurrency(value){

return "₹"+Number(value||0).toLocaleString("en-IN");

}

function escapeHTML(str){

if(!str) return "";

return str.replace(/[&<>"']/g,function(m){
return{
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#039;"
}[m];
});

}

// animated counter

function animateValue(id, start, end, duration){

const el = document.getElementById(id);
if(!el) return;

let startTimestamp = null;

function step(timestamp){

if(!startTimestamp) startTimestamp = timestamp;

const progress = Math.min((timestamp - startTimestamp) / duration, 1);

const value = Math.floor(progress * (end - start) + start);

el.innerText = "₹" + value.toLocaleString("en-IN");

if(progress < 1){
window.requestAnimationFrame(step);
}

}

window.requestAnimationFrame(step);

}