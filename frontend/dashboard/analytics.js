const API_BASE = window.API_BASE || "";

let revenueChart = null;
let salesChart = null;
let forecastChart = null;
let categoryChart = null;

document.addEventListener("DOMContentLoaded", initAnalytics);

async function initAnalytics() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/analytics/creator`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "../login.html";
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load analytics");
    }

    renderKpis(data);
    renderCharts(data);
    renderTopBooks(data.topBooks || []);
    startLiveIndicator();
  } catch (error) {
    console.error("Analytics load failed:", error);
    document.getElementById("topBooksTable").innerHTML =
      `<tr><td colspan="3">${escapeHTML(error.message || "Unable to load analytics")}</td></tr>`;
  }
}

function renderKpis(data) {
  animateCounter("totalBooks", data.totalBooks || 0);
  animateCounter("totalSales", data.totalSales || 0);
  animateCounter("totalRevenue", data.totalRevenue || 0, true);

  const conversion = data.totalViews > 0
    ? ((Number(data.totalSales || 0) / Number(data.totalViews || 0)) * 100).toFixed(1)
    : "0.0";
  document.getElementById("conversionRate").textContent = `${conversion}%`;
  document.getElementById("creatorScore").textContent = data.creatorScore || 0;

  const growthElement = document.getElementById("revenueGrowth");
  const monthlyRevenue = data.monthlyRevenue || [];
  const latest = monthlyRevenue.at(-1) || 0;
  const previous = monthlyRevenue.at(-2) || 0;
  const growth = previous > 0 ? (((latest - previous) / previous) * 100) : 0;

  growthElement.textContent = `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`;
  growthElement.classList.remove("up", "down");
  growthElement.classList.add(growth >= 0 ? "up" : "down");
}

function renderCharts(data) {
  const labels = data.chart?.labels || [];
  const revenueValues = data.monthlyRevenue || [];
  const salesValues = data.monthlySales || [];

  createLineChart("revenueChart", labels, revenueValues, "Revenue", "#8b5cf6", "rgba(139,92,246,0.22)", (chart) => {
    if (revenueChart) {
      revenueChart.destroy();
    }
    revenueChart = chart;
  });

  createBarChart("salesChart", labels, salesValues, "Sales", "#22c55e", (chart) => {
    if (salesChart) {
      salesChart.destroy();
    }
    salesChart = chart;
  });

  const forecast = buildForecastSeries(revenueValues);
  createLineChart("forecastChart", labels, forecast, "Forecast", "#f59e0b", "rgba(245,158,11,0.18)", (chart) => {
    if (forecastChart) {
      forecastChart.destroy();
    }
    forecastChart = chart;
  });

  const categoryRevenue = data.categoryRevenue || {};
  createDoughnutChart("countryChart", Object.keys(categoryRevenue), Object.values(categoryRevenue), (chart) => {
    if (categoryChart) {
      categoryChart.destroy();
    }
    categoryChart = chart;
  });
}

function createLineChart(canvasId, labels, values, label, borderColor, fillColor, onReady) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.38
        }
      ]
    },
    options: chartOptions(true)
  });

  onReady(chart);
}

function createBarChart(canvasId, labels, values, label, color, onReady) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: color,
          borderRadius: 12
        }
      ]
    },
    options: chartOptions(true)
  });

  onReady(chart);
}

function createDoughnutChart(canvasId, labels, values, onReady) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }

  const hasData = values.some((value) => Number(value || 0) > 0);
  const chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: hasData ? labels : ["No data yet"],
      datasets: [
        {
          data: hasData ? values : [1],
          backgroundColor: hasData
            ? ["#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#fb7185", "#60a5fa", "#c084fc"]
            : ["rgba(148,163,184,0.25)"],
          borderWidth: 0
        }
      ]
    },
    options: chartOptions(false)
  });

  onReady(chart);
}

function chartOptions(showScales) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e2e8f0"
        }
      }
    },
    scales: showScales
      ? {
          x: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148,163,184,0.1)" }
          },
          y: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148,163,184,0.1)" }
          }
        }
      : {}
  };
}

function buildForecastSeries(values) {
  if (!values.length) {
    return [];
  }

  return values.map((value, index) => {
    if (index === 0) {
      return value;
    }

    const previous = values[index - 1] || 0;
    const growth = previous > 0 ? (value - previous) / previous : 0;
    return Math.max(0, Math.round(value * (1 + growth * 0.5)));
  });
}

function renderTopBooks(books) {
  const tbody = document.getElementById("topBooksTable");

  if (!books.length) {
    tbody.innerHTML = "<tr><td colspan='3'>No approved sales yet</td></tr>";
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

function startLiveIndicator() {
  window.setInterval(() => {
    const dot = document.querySelector(".live-dot");
    if (dot) {
      dot.classList.toggle("active");
    }
  }, 1000);
}

function animateCounter(id, value, isCurrency = false) {
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

    element.textContent = isCurrency
      ? `Rs. ${Math.floor(current).toLocaleString("en-IN")}`
      : Math.floor(current).toLocaleString("en-IN");
  }, 20);
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
