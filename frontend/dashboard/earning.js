/* =====================================
E-BOOK MARKET – CREATOR WALLET JS
Production Version (Clean + Bug Free)
===================================== */

const API_BASE = "http://localhost:5000";
const token = localStorage.getItem("token");

let earningChart = null;
let globalSalesChart = null;
let refreshTimer = null;

/* =====================================
AUTH CHECK
===================================== */

if (!token) redirectToLogin();

/* =====================================
INIT
===================================== */

document.addEventListener("DOMContentLoaded", () => {

  initWallet();
  startAutoRefresh();

  const withdrawBtn = document.getElementById("withdrawBtn");
  if (withdrawBtn) withdrawBtn.addEventListener("click", withdraw);

});

/* =====================================
AUTO REFRESH
===================================== */

function startAutoRefresh(){

  if(refreshTimer) clearInterval(refreshTimer);

  refreshTimer = setInterval(()=>{
    initWallet();
  },30000);

}

/* =====================================
LOAD WALLET
===================================== */

async function initWallet(){

  try{

    showLoading();

    const res = await fetch(`${API_BASE}/api/earnings/user`,{
      headers:{ Authorization:`Bearer ${token}` }
    });

    if(res.status === 401) return redirectToLogin();

    if(!res.ok) throw new Error("API Error");

    const data = await res.json();

    renderBalances(data);
    renderChart(data.chart);
    renderTopBooks(data.topBooks || []);
    renderTransactions(data.transactions || []);
    renderPayout(data.payout);
    renderGlobalSalesMap(data.countrySales || {});
    calculateCreatorScore(data);
    calculateForecast(data.chart);

  }catch(err){

    console.error("Wallet Error:",err);
    showError();

  }

}

/* =====================================
BALANCE CARDS
===================================== */

function renderBalances(data){

  animateCurrency("pendingAmount", data.pending || 0);
  animateCurrency("availableAmount", data.available || 0);
  animateCurrency("withdrawnAmount", data.withdrawn || 0);
  animateCurrency("lifetimeAmount", data.lifetime || 0);

}

/* =====================================
CREATOR SCORE
===================================== */

function calculateCreatorScore(data){

  const el = document.getElementById("creatorScore");
  if(!el) return;

  const score =
    (data.totalSales || 0) * 2 +
    (data.totalBooks || 0) * 5 +
    (data.lifetime || 0) / 100;

  el.innerText = Math.min(100, Math.floor(score));

}

/* =====================================
TOP BOOKS
===================================== */

function renderTopBooks(books){

  const tbody = document.getElementById("topEarningBooks");
  if(!tbody) return;

  if(!books.length){

    tbody.innerHTML = `<tr><td colspan="3">No earnings yet</td></tr>`;
    return;

  }

  tbody.innerHTML="";

  books.forEach(book=>{

    const row=document.createElement("tr");

    row.innerHTML=`
      <td>${escapeHTML(book.title)}</td>
      <td>${book.sales}</td>
      <td>₹${formatCurrency(book.earnings)}</td>
    `;

    tbody.appendChild(row);

  });

}

/* =====================================
TRANSACTIONS
===================================== */

function renderTransactions(transactions){

  const tbody=document.getElementById("transactionList");
  if(!tbody) return;

  if(!transactions.length){

    tbody.innerHTML=`<tr><td colspan="4">No transactions</td></tr>`;
    return;

  }

  tbody.innerHTML="";

  transactions.forEach(tx=>{

    const row=document.createElement("tr");

    row.innerHTML=`
      <td>${formatDate(tx.date)}</td>
      <td>${escapeHTML(tx.title)}</td>
      <td>₹${formatCurrency(tx.amount)}</td>
      <td class="status ${tx.status}">
        ${tx.status}
      </td>
    `;

    tbody.appendChild(row);

  });

}

/* =====================================
EARNINGS CHART
===================================== */

function renderChart(chart){

  if(!chart || !chart.labels) return;

  const canvas=document.getElementById("earningChart");
  if(!canvas) return;

  const ctx=canvas.getContext("2d");

  if(earningChart) earningChart.destroy();

  const forecast = chart.values.map(v=>v*1.15);

  earningChart=new Chart(ctx,{
    type:"line",

    data:{
      labels:chart.labels,
      datasets:[
      {
        label:"Earnings",
        data:chart.values,
        borderColor:"#8b5cf6",
        backgroundColor:"rgba(139,92,246,0.2)",
        fill:true,
        tension:0.4
      },
      {
        label:"AI Forecast",
        data:forecast,
        borderColor:"#22c55e",
        borderDash:[5,5],
        fill:false
      }
      ]
    },

    options:{
      responsive:true,
      plugins:{
        legend:{ labels:{ color:"#fff" } }
      },
      scales:{
        x:{ ticks:{ color:"#94a3b8" } },
        y:{ ticks:{ color:"#94a3b8" } }
      }
    }

  });

}

/* =====================================
GLOBAL SALES MAP
===================================== */

function renderGlobalSalesMap(countrySales){

  const canvas = document.getElementById("globalSalesChart");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  const countries = Object.keys(countrySales);
  const values = Object.values(countrySales);

  if(globalSalesChart) globalSalesChart.destroy();

  globalSalesChart = new Chart(ctx,{
    type:"doughnut",

    data:{
      labels:countries,
      datasets:[{
        data:values,
        backgroundColor:[
          "#6366f1",
          "#8b5cf6",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
          "#06b6d4",
          "#3b82f6"
        ]
      }]
    },

    options:{
      responsive:true,
      plugins:{
        legend:{
          position:"bottom",
          labels:{ color:"#e6e9f0" }
        }
      }
    }

  });

}

/* =====================================
WITHDRAW
===================================== */

async function withdraw(){

  const availableText=document.getElementById("availableAmount")?.innerText || "0";

  const available=parseInt(
    availableText.replace(/[₹,]/g,"")
  );

  if(available < 500){

    toast("Minimum ₹500 required","error");
    return;

  }

  if(!confirm(`Withdraw ₹${formatCurrency(available)} ?`)) return;

  try{

    const res=await fetch(`${API_BASE}/api/earnings/withdraw`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      }
    });

    if(!res.ok) throw new Error();

    toast("Withdrawal request sent","success");

    initWallet();

  }catch(err){

    toast("Withdrawal failed","error");

  }

}

/* =====================================
PAYOUT METHOD
===================================== */

function renderPayout(payout){

  const el=document.getElementById("paymentMethod");
  if(!el) return;

  if(!payout){
    el.innerText="No payout method configured";
    return;
  }

  if(payout.upi){
    el.innerText=`UPI • ${payout.upi}`;
  }
  else if(payout.bank){
    el.innerText=`Bank • ${payout.bank}`;
  }

}

/* =====================================
ANIMATED CURRENCY
===================================== */

function animateCurrency(id,value){

  const el=document.getElementById(id);
  if(!el) return;

  let start=0;
  const duration=800;
  const step=value/(duration/16);

  const timer=setInterval(()=>{

    start+=step;

    if(start>=value){
      start=value;
      clearInterval(timer);
    }

    el.innerText=formatCurrency(Math.floor(start));

  },16);

}

/* =====================================
UTILS
===================================== */

function formatCurrency(num){
  return num.toLocaleString("en-IN");
}

function formatDate(date){
  return new Date(date).toLocaleDateString("en-IN");
}

function escapeHTML(str){
  return str.replace(/[&<>"']/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}

/* =====================================
UI STATES
===================================== */

function showLoading(){

  ["pendingAmount","availableAmount","withdrawnAmount","lifetimeAmount"]
  .forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.innerText="...";
  });

}

function showError(){

  const table=document.getElementById("transactionList");

  if(table){
    table.innerHTML=`
      <tr>
        <td colspan="4">⚠ Unable to load data</td>
      </tr>
    `;
  }

}

/* =====================================
NAVIGATION
===================================== */

function redirectToLogin(){
  localStorage.clear();
  window.location.href="../login.html";
}

/* =====================================
TOAST
===================================== */

function toast(message,type="info"){

  const div=document.createElement("div");
  div.className=`toast ${type}`;
  div.innerText=message;

  document.body.appendChild(div);

  setTimeout(()=>{
    div.remove();
  },3000);

}
/* =====================================
AI REVENUE FORECAST
===================================== */

function calculateForecast(chart){

  if(!chart || !chart.values) return;

  const values = chart.values;

  const lastMonth = values[values.length - 1] || 0;
  const prevMonth = values[values.length - 2] || 0;

  const growthRate = prevMonth > 0
    ? ((lastMonth - prevMonth) / prevMonth) * 100
    : 0;

  const predicted = Math.round(lastMonth * (1 + growthRate/100));

  const forecastRevenue = document.getElementById("forecastRevenue");
  const forecastGrowth = document.getElementById("forecastGrowth");
  const momentum = document.getElementById("salesMomentum");

  if(forecastRevenue)
    forecastRevenue.innerText = "₹" + predicted.toLocaleString("en-IN");

  if(forecastGrowth)
    forecastGrowth.innerText = growthRate.toFixed(1) + "%";

  if(momentum){

    if(growthRate > 20)
      momentum.innerText = "🔥 High";

    else if(growthRate > 5)
      momentum.innerText = "📈 Medium";

    else
      momentum.innerText = "⚠ Slow";

  }

}