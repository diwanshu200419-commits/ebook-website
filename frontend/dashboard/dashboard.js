let earningsChartInstance = null;
let radarChartInstance = null;
let salesChartInstance = null;
let heatmapChartInstance = null;

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function buildEmptyState(message) {
  return `<p>${escapeHtml(message)}</p>`;
}

async function loadDashboardData() {
  try {
    const data = await apiFetchJson("/api/dashboard/user");
    renderDashboard(data);
  } catch (error) {
    document.getElementById("topBooksContainer").innerHTML = buildEmptyState(
      error.message || "Unable to load dashboard data."
    );
  }
}

function renderDashboard(data) {
  setText("monthlyEarnings", formatCurrency(data.monthlyEarnings || 0));
  setText("walletBalance", formatCurrency(data.walletBalance || 0));
  setText("totalEarnings", formatCurrency(data.totalEarnings || 0));
  setText("totalDownloads", Number(data.totalDownloads || 0).toLocaleString("en-IN"));
  setText("totalBooks", Number(data.totalBooks || 0).toLocaleString("en-IN"));
  setText("globalRank", data.globalRank ? `#${data.globalRank}` : "--");
  setText("creatorScore", calculateCreatorScore(data));

  const growthIndicator = document.getElementById("growthIndicator");
  if (growthIndicator) {
    const growth = Number(data.growthPercent || 0);
    growthIndicator.textContent = `${growth >= 0 ? "+" : ""}${growth}%`;
    growthIndicator.classList.toggle("positive", growth >= 0);
    growthIndicator.classList.toggle("negative", growth < 0);
  }

  renderLineChart(data.chart || { labels: [], values: [] });
  renderCreatorRadar(data);
  renderSalesChart(data.countrySales || {});
  renderDownloadHeatmap(data.downloadHeatmap || {});
  renderTopBooks(data.topBooks || []);
  renderRecentSales(data.recentSales || []);
  renderLeaderboard(data.leaderboard || []);
  renderTrendingAuthors(data.trendingAuthors || []);
  renderRecommendations(data.recommendedBooks || []);
  renderForecast(data);
}

function renderLineChart(chart) {
  const canvas = document.getElementById("earningsChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (earningsChartInstance) {
    earningsChartInstance.destroy();
  }

  earningsChartInstance = new Chart(canvas, {
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
}

function renderCreatorRadar(data) {
  const canvas = document.getElementById("creatorRadar");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  radarChartInstance = new Chart(canvas, {
    type: "radar",
    data: {
      labels: ["Downloads", "Books", "Earnings", "Growth", "Consistency"],
      datasets: [
        {
          label: "Creator Score",
          data: [
            Math.min(100, Number(data.totalDownloads || 0)),
            Math.min(100, Number(data.totalBooks || 0) * 12),
            Math.min(100, Number(data.totalEarnings || 0) / 10),
            Math.min(100, Math.abs(Number(data.growthPercent || 0)) * 2),
            Math.min(100, (data.topBooks || []).length * 18),
          ],
          backgroundColor: "rgba(139,92,246,0.3)",
          borderColor: "#8b5cf6",
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
        r: {
          angleLines: { color: "rgba(255,255,255,0.1)" },
          grid: { color: "rgba(255,255,255,0.1)" },
          pointLabels: { color: "#e2e8f0" },
          ticks: { display: false },
        },
      },
    },
  });
}

function renderSalesChart(countrySales) {
  const canvas = document.getElementById("globalSalesChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(countrySales),
      datasets: [
        {
          data: Object.values(countrySales),
          backgroundColor: ["#8b5cf6", "#22c55e", "#3b82f6", "#f59e0b"],
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

function renderDownloadHeatmap(downloads) {
  const canvas = document.getElementById("downloadHeatmap");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (heatmapChartInstance) {
    heatmapChartInstance.destroy();
  }

  heatmapChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: Object.keys(downloads),
      datasets: [
        {
          label: "Downloads",
          data: Object.values(downloads),
          backgroundColor: "#22c55e",
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
}

function renderTopBooks(books) {
  const container = document.getElementById("topBooksContainer");
  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = buildEmptyState("Your top books will appear here.");
    return;
  }

  container.innerHTML = books
    .map((book) => {
      return `
        <article class="book-card">
          <h4>${escapeHtml(book.title)}</h4>
          <p>Downloads: ${Number(book.downloads || 0).toLocaleString("en-IN")}</p>
          <p>Earnings: ${formatCurrency(book.earnings || 0)}</p>
        </article>
      `;
    })
    .join("");
}

function renderRecentSales(sales) {
  const container = document.getElementById("salesFeed");
  if (!container) {
    return;
  }

  if (!sales.length) {
    container.innerHTML = buildEmptyState("No recent sales yet.");
    return;
  }

  container.innerHTML = sales
    .map((sale) => {
      return `
        <div class="sale-item">
          <strong>${escapeHtml(sale.book)}</strong>
          <span>${formatCurrency(sale.amount || 0)}</span>
        </div>
      `;
    })
    .join("");
}

function renderLeaderboard(list) {
  const container = document.getElementById("leaderboardContainer");
  if (!container) {
    return;
  }

  if (!list.length) {
    container.innerHTML = buildEmptyState("Leaderboard data appears after approvals and downloads.");
    return;
  }

  container.innerHTML = list
    .map((user, index) => {
      return `<div>#${index + 1} ${escapeHtml(user.name)} - ${formatCurrency(user.earnings || 0)}</div>`;
    })
    .join("");
}

function renderTrendingAuthors(authors) {
  const container = document.getElementById("trendingAuthors");
  if (!container) {
    return;
  }

  if (!authors.length) {
    container.innerHTML = buildEmptyState("Trending authors will appear here.");
    return;
  }

  container.innerHTML = authors
    .map((author) => {
      return `
        <div>
          <strong>${escapeHtml(author.name)}</strong>
          <p>${Number(author.books || 0)} approved books</p>
        </div>
      `;
    })
    .join("");
}

function renderRecommendations(books) {
  const container = document.getElementById("recommendedBooks");
  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = buildEmptyState("Recommended books will appear after the marketplace fills up.");
    return;
  }

  container.innerHTML = books
    .map((book) => {
      return `
        <article class="book-card">
          <h4>${escapeHtml(book.title)}</h4>
          <p>${escapeHtml(book.category)}</p>
          <p>${formatCurrency(book.price || 0)}</p>
        </article>
      `;
    })
    .join("");
}

function calculateCreatorScore(data) {
  return Math.min(
    100,
    Math.round(
      Number(data.totalBooks || 0) * 8 +
        Number(data.totalDownloads || 0) * 0.15 +
        Number(data.totalEarnings || 0) / 150
    )
  );
}

function renderForecast(data) {
  const forecastRevenue = Number(data.monthlyEarnings || 0) * 1.1;
  const growth = Number(data.growthPercent || 0);

  setText("forecastRevenue", formatCurrency(forecastRevenue));
  setText("forecastGrowth", `${growth >= 0 ? "+" : ""}${growth}%`);
  setText(
    "salesMomentum",
    growth > 15 ? "High" : growth > 5 ? "Medium" : "Building"
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["reader", "creator", "author", "admin"]);
  if (!user) {
    return;
  }

  setText("userName", user.name || "Creator");
  setText("roleBadge", String(user.role || "reader").toUpperCase());

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  loadDashboardData();
});
