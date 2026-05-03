let earningsChart = null;
let countryChart = null;

async function loadWallet() {
  try {
    const data = await apiFetchJson("/api/earnings/user");
    renderWallet(data);
  } catch (error) {
    document.getElementById("transactionList").innerHTML = `
      <tr><td colspan="4">${escapeHtml(error.message || "Unable to load earnings.")}</td></tr>
    `;
  }
}

function renderWallet(data) {
  document.getElementById("pendingAmount").textContent = Number(
    data.pending || 0
  ).toLocaleString("en-IN");
  document.getElementById("availableAmount").textContent = Number(
    data.available || 0
  ).toLocaleString("en-IN");
  document.getElementById("withdrawnAmount").textContent = Number(
    data.withdrawn || 0
  ).toLocaleString("en-IN");
  document.getElementById("lifetimeAmount").textContent = Number(
    data.lifetime || 0
  ).toLocaleString("en-IN");
  document.getElementById("creatorScore").textContent = Math.min(
    100,
    Math.round(
      Number(data.totalSales || 0) * 3 +
        Number(data.totalBooks || 0) * 5 +
        Number(data.lifetime || 0) / 200
    )
  );

  renderPayout(data.payout);
  renderTopBooks(data.topBooks || []);
  renderTransactions(data.transactions || []);
  renderCharts(data.chart || { labels: [], values: [] }, data.countrySales || {});
  renderForecast(data.chart || { values: [] });
}

function renderPayout(payout) {
  const paymentMethod = document.getElementById("paymentMethod");
  if (!payout || (!payout.upiId && !payout.bankAccount)) {
    paymentMethod.textContent = "No payout method configured";
    return;
  }

  if (payout.upiId) {
    paymentMethod.textContent = `UPI • ${payout.upiId}`;
    return;
  }

  paymentMethod.textContent = `Bank • ${payout.bankAccount}`;
}

function renderTopBooks(books) {
  const tbody = document.getElementById("topEarningBooks");
  if (!books.length) {
    tbody.innerHTML = "<tr><td colspan='3'>No earnings yet.</td></tr>";
    return;
  }

  tbody.innerHTML = books
    .map((book) => {
      return `
        <tr>
          <td>${escapeHtml(book.title)}</td>
          <td>${Number(book.sales || 0).toLocaleString("en-IN")}</td>
          <td>${formatCurrency(book.earnings || 0)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTransactions(transactions) {
  const tbody = document.getElementById("transactionList");
  if (!transactions.length) {
    tbody.innerHTML = "<tr><td colspan='4'>No transactions yet.</td></tr>";
    return;
  }

  tbody.innerHTML = transactions
    .map((transaction) => {
      return `
        <tr>
          <td>${new Date(transaction.date).toLocaleDateString("en-IN")}</td>
          <td>${escapeHtml(transaction.title)}</td>
          <td>${formatCurrency(transaction.amount || 0)}</td>
          <td class="status ${escapeHtml(transaction.status)}">${escapeHtml(transaction.status)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderCharts(chart, countrySales) {
  if (typeof Chart === "undefined") {
    return;
  }

  if (earningsChart) {
    earningsChart.destroy();
  }
  if (countryChart) {
    countryChart.destroy();
  }

  earningsChart = new Chart(document.getElementById("earningChart"), {
    type: "line",
    data: {
      labels: chart.labels || [],
      datasets: [
        {
          label: "Earnings",
          data: chart.values || [],
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139,92,246,0.2)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
      },
      scales: {
        x: { ticks: { color: "#94a3b8" } },
        y: { ticks: { color: "#94a3b8" } },
      },
    },
  });

  countryChart = new Chart(document.getElementById("globalSalesChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(countrySales),
      datasets: [
        {
          data: Object.values(countrySales),
          backgroundColor: ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
      },
    },
  });
}

function renderForecast(chart) {
  const values = chart.values || [];
  const lastMonth = Number(values.at(-1) || 0);
  const previousMonth = Number(values.at(-2) || 0);
  const growth =
    previousMonth > 0
      ? ((lastMonth - previousMonth) / previousMonth) * 100
      : 0;
  const projected = Math.round(lastMonth * (1 + growth / 100));

  document.getElementById("forecastRevenue").textContent = formatCurrency(projected);
  document.getElementById("forecastGrowth").textContent = `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`;
  document.getElementById("salesMomentum").textContent =
    growth > 15 ? "High" : growth > 5 ? "Medium" : "Building";
}

async function requestWithdrawal() {
  try {
    const data = await apiFetchJson("/api/earnings/withdraw", {
      method: "POST",
    });
    alert(data.message || "Withdrawal requested.");
    loadWallet();
  } catch (error) {
    alert(error.message || "Unable to request withdrawal.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["creator", "author", "admin", "reader"]);
  if (!user) {
    return;
  }

  const withdrawBtn = document.getElementById("withdrawBtn");
  if (withdrawBtn) {
    withdrawBtn.addEventListener("click", requestWithdrawal);
  }

  loadWallet();
});
