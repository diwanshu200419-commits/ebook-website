const API_BASE = "http://localhost:5000";

/* ===============================
INIT
=============================== */

document.addEventListener("DOMContentLoaded", initAnalytics);

async function initAnalytics(){

  const token = localStorage.getItem("token");

  if(!token){
    window.location.href = "../login.html";
    return;
  }

  try{

    const res = await fetch(`${API_BASE}/api/analytics/creator`,{
      headers:{
        Authorization:`Bearer ${token}`
      }
    });

    if(!res.ok) throw new Error("Unauthorized");

    const data = await res.json();

    loadKPI(data);
    loadCreatorScore(data);
    loadCharts(data);
    loadForecastChart(data.forecastRevenue || []);
    loadCountryChart(data.countrySales || {});
    loadTopBooks(data.topBooks || []);

    startLiveIndicator();

  }catch(err){

    console.error(err);
    localStorage.clear();
    window.location.href="../login.html";

  }

}


/* ===============================
KPI CARDS
=============================== */

function loadKPI(data){

  animateCounter("totalBooks", data.totalBooks);
  animateCounter("totalSales", data.totalSales);
  animateCounter("totalRevenue", data.totalRevenue, true);

  const conversion =
    data.totalViews > 0
    ? ((data.totalSales / data.totalViews) * 100).toFixed(1)
    : 0;

  document.getElementById("conversionRate").innerText =
    conversion + "%";


  /* Revenue Growth */

  if(data.monthlyRevenue?.length >= 2){

    const last = data.monthlyRevenue.at(-1);
    const prev = data.monthlyRevenue.at(-2);

    const growth = ((last-prev)/prev*100).toFixed(1);

    const el = document.getElementById("revenueGrowth");

    el.innerText = (growth > 0 ? "+" : "") + growth + "%";

    el.classList.remove("up","down");
    el.classList.add(growth >= 0 ? "up" : "down");

  }

}


/* ===============================
CREATOR PERFORMANCE SCORE
=============================== */

function loadCreatorScore(data){

  let score = data.creatorScore;

  if(!score){

    const salesFactor = data.totalSales || 0;
    const revenueFactor = data.totalRevenue || 0;

    score = Math.min(100,
      Math.floor((salesFactor*2 + revenueFactor/100) % 100)
    );

  }

  document.getElementById("creatorScore").innerText = score;

}


/* ===============================
COUNTER ANIMATION
=============================== */

function animateCounter(id,value,currency=false){

  const el = document.getElementById(id);

  let start = 0;

  const duration = 1000;
  const step = value / (duration/16);

  const timer = setInterval(()=>{

    start += step;

    if(start >= value){
      start = value;
      clearInterval(timer);
    }

    el.innerText =
      currency
      ? "₹" + Math.floor(start)
      : Math.floor(start);

  },16);

}


/* ===============================
CHARTS
=============================== */

function loadCharts(data){

  createRevenueChart(data.monthlyRevenue || []);
  createSalesChart(data.monthlySales || []);

}


/* Revenue Chart */

function createRevenueChart(monthlyRevenue){

  const ctx = document.getElementById("revenueChart");

  new Chart(ctx,{
    type:"line",
    data:{
      labels:["Jan","Feb","Mar","Apr","May","Jun"],
      datasets:[{
        label:"Revenue",
        data:monthlyRevenue,
        borderColor:"#6366f1",
        backgroundColor:"rgba(99,102,241,0.2)",
        fill:true,
        tension:.4
      }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{display:false} }
    }
  });

}


/* Sales Chart */

function createSalesChart(monthlySales){

  const ctx = document.getElementById("salesChart");

  new Chart(ctx,{
    type:"bar",
    data:{
      labels:["Jan","Feb","Mar","Apr","May","Jun"],
      datasets:[{
        label:"Sales",
        data:monthlySales,
        backgroundColor:"#22c55e"
      }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{display:false} }
    }
  });

}


/* ===============================
FORECAST CHART
=============================== */

function loadForecastChart(forecast){

  const ctx = document.getElementById("forecastChart");

  if(!ctx || !forecast.length) return;

  new Chart(ctx,{
    type:"line",
    data:{
      labels:["Next 1","Next 2","Next 3"],
      datasets:[{
        label:"Revenue Forecast",
        data:forecast,
        borderColor:"#f59e0b",
        backgroundColor:"rgba(245,158,11,0.2)",
        fill:true,
        tension:.4
      }]
    }
  });

}


/* ===============================
COUNTRY SALES CHART
=============================== */

function loadCountryChart(countrySales){

  const ctx = document.getElementById("countryChart");

  if(!ctx) return;

  const labels = Object.keys(countrySales);
  const values = Object.values(countrySales);

  new Chart(ctx,{
    type:"pie",
    data:{
      labels:labels,
      datasets:[{
        data:values,
        backgroundColor:[
          "#6366f1",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
          "#3b82f6"
        ]
      }]
    }
  });

}


/* ===============================
TOP BOOKS TABLE
=============================== */

function loadTopBooks(books){

  const tbody = document.getElementById("topBooksTable");

  if(!books.length){

    tbody.innerHTML =
      "<tr><td colspan='3'>No sales data</td></tr>";

    return;
  }

  tbody.innerHTML = "";

  books.forEach(book=>{

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${book.title}</td>
      <td>${book.sales}</td>
      <td>₹${book.revenue}</td>
    `;

    tbody.appendChild(row);

  });

}


/* ===============================
LIVE SALES INDICATOR
=============================== */

function startLiveIndicator(){

  setInterval(()=>{

    const dot = document.querySelector(".live-dot");

    if(!dot) return;

    dot.classList.toggle("active");

  },1000);

}