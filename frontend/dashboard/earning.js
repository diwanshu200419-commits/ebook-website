const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const token = localStorage.getItem("token");

let earningsChart = null;
let categoryChart = null;
let refreshTimer = null;

if (!token) {
  redirectToLogin();
}

document.addEventListener("DOMContentLoaded", () => {
  initWallet();
  startAutoRefresh();

  const withdrawBtn = document.getElementById("withdrawBtn");
  withdrawBtn?.addEventListener("click", withdraw);
});

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }

  refreshTimer = window.setInterval(initWallet, 30000);
}

async function initWallet() {
  try {
    showLoading();

    const response = await fetch(`${API_BASE}/api/earnings/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      return redirectToLogin();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load earnings");
    }

    renderBalances(data);
    renderChart(data.chart);
    renderCategoryChart(data.categoryRevenue || data.category || {});
    renderTopBooks(data.topBooks || []);
    renderTransactions(data.transactions || []);
    renderPayout(data.payout || {});
    renderForecast(data.chart);
    renderCreatorScore(data.creatorScore || 0);
  } catch (error) {
    console.error("Wallet load failed:", error);
    showError(error.message || "Unable to load earnings");
  }
}

function renderBalances(data) {
  animateCurrency("pendingAmount", data.pending || 0);
  animateCurrency("availableAmount", data.available || 0);
  animateCurrency("withdrawnAmount", data.withdrawn || 0);
  animateCurrency("lifetimeAmount", data.lifetime || 0);
}

function renderCreatorScore(score) {
  const element = document.getElementById("creatorScore");
  if (element) {
    element.textContent = Math.max(0, Math.min(100, Math.round(score)));
  }
}

function renderTopBooks(books) {
  const tbody = document.getElementById("topEarningBooks");
  if (!tbody) {
    return;
  }

  if (!books.length) {
    tbody.innerHTML = `<tr><td colspan="3">No earnings yet</td></tr>`;
    return;
  }

  tbody.innerHTML = books.map((book) => `
    <tr>
      <td>${escapeHTML(book.title)}</td>
      <td>${Number(book.sales || 0).toLocaleString("en-IN")}</td>
      <td>Rs. ${Number(book.earnings || 0).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");
}

function renderTransactions(transactions) {
  const tbody = document.getElementById("transactionList");
  if (!tbody) {
    return;
  }

  if (!transactions.length) {
    tbody.innerHTML = `<tr><td colspan="4">No transactions yet</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map((transaction) => `
    <tr>
      <td>${formatDate(transaction.date)}</td>
      <td>${escapeHTML(transaction.title)}</td>
      <td>Rs. ${Number(transaction.amount || 0).toLocaleString("en-IN")}</td>
      <td class="status ${String(transaction.status || "").toLowerCase()}">${escapeHTML(transaction.status)}</td>
    </tr>
  `).join("");
}

function renderChart(chart) {
  if (!chart?.labels?.length) {
    if (earningsChart) {
      earningsChart.destroy();
      earningsChart = null;
    }
    return;
  }

  const canvas = document.getElementById("earningChart");
  const context = canvas.getContext("2d");

  if (earningsChart) {
    earningsChart.destroy();
  }

  earningsChart = new Chart(context, {
    type: "line",
    data: {
      labels: chart.labels,
      datasets: [
        {
          label: "Creator earnings",
          data: chart.values,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139,92,246,0.2)",
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: chartOptions()
  });
}

function renderCategoryChart(categoryRevenue) {
  const canvas = document.getElementById("globalSalesChart");
  const context = canvas.getContext("2d");

  if (categoryChart) {
    categoryChart.destroy();
  }

  const labels = Object.keys(categoryRevenue || {});
  const values = Object.values(categoryRevenue || {});
  const hasData = values.some((value) => Number(value || 0) > 0);

  categoryChart = new Chart(context, {
    type: "doughnut",
    data: {
      labels: hasData ? labels : ["No category revenue yet"],
      datasets: [
        {
          data: hasData ? values : [1],
          backgroundColor: hasData
            ? ["#8b5cf6", "#22c55e", "#0ea5e9", "#f59e0b", "#fb7185", "#60a5fa", "#a855f7"]
            : ["rgba(148,163,184,0.25)"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#e6e9f0"
          }
        }
      }
    }
  });
}

function renderForecast(chart) {
  const values = chart?.values || [];
  const lastMonth = values.at(-1) || 0;
  const previousMonth = values.at(-2) || 0;
  const growth = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
  const predicted = Math.max(0, Math.round(lastMonth * (1 + growth / 100)));

  document.getElementById("forecastRevenue").textContent = `Rs. ${predicted.toLocaleString("en-IN")}`;
  document.getElementById("forecastGrowth").textContent = `${growth.toFixed(1)}%`;
  document.getElementById("salesMomentum").textContent =
    growth > 15 ? "High" : growth > 3 ? "Steady" : "Early";
}

async function withdraw() {
  const availableText = document.getElementById("availableAmount")?.textContent || "0";
  const available = Number(availableText.replace(/[^\d.]/g, "")) || 0;

  if (available < 500) {
    toast("Minimum Rs. 500 is required to withdraw", "error");
    return;
  }

  const confirmed = window.confirm(`Withdraw Rs. ${available.toLocaleString("en-IN")} to your saved payout method?`);
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/earnings/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Withdrawal failed");
    }

    toast(data.message || "Withdrawal request sent", "success");
    initWallet();
  } catch (error) {
    toast(error.message || "Withdrawal failed", "error");
  }
}

function renderPayout(payout) {
  const element = document.getElementById("paymentMethod");
  if (!element) {
    return;
  }

  if (payout.upiId) {
    element.textContent = `UPI payout · ${payout.upiId}`;
    return;
  }

  if (payout.bankAccount) {
    element.textContent = `Bank payout · ${payout.bankAccount}`;
    return;
  }

  element.textContent = "No payout method configured yet";
}

function animateCurrency(id, value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const target = Number(value || 0);
  let current = 0;
  const step = Math.max(1, target / 40);

  const timer = window.setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      window.clearInterval(timer);
    }

    element.textContent = current.toLocaleString("en-IN", {
      maximumFractionDigits: 0
    });
  }, 20);
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#fff"
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#94a3b8"
        },
        grid: {
          color: "rgba(148,163,184,0.1)"
        }
      },
      y: {
        ticks: {
          color: "#94a3b8"
        },
        grid: {
          color: "rgba(148,163,184,0.1)"
        }
      }
    }
  };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
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

function showLoading() {
  ["pendingAmount", "availableAmount", "withdrawnAmount", "lifetimeAmount"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = "...";
    }
  });
}

function showError(message) {
  const table = document.getElementById("transactionList");
  if (table) {
    table.innerHTML = `<tr><td colspan="4">${escapeHTML(message)}</td></tr>`;
  }
}

function redirectToLogin() {
  localStorage.clear();
  window.location.href = "../login.html";
}

function toast(message, type = "info") {
  const toastElement = document.createElement("div");
  toastElement.className = `toast ${type}`;
  toastElement.textContent = message;
  document.body.appendChild(toastElement);

  window.setTimeout(() => toastElement.remove(), 3000);
}
