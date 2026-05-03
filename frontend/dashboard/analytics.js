let revenueChart = null;
let salesChart = null;
let forecastChart = null;
let countryChart = null;

async function loadAnalytics() {
  try {
    const data = await apiFetchJson("/api/analytics/creator");
    renderAnalytics(data);
  } catch (error) {
    document.getElementById("topBooksTable").innerHTML = `
      <tr><td colspan="3">${escapeHtml(error.message || "Unable to load analytics.")}</td></tr>
    `;
  }
}

function renderAnalytics(data) {
  document.getElementById("totalBooks").textContent = Number(
    data.totalBooks || 0
  ).toLocaleString("en-IN");
  document.getElementById("totalSales").textContent = Number(
    data.totalSales || 0
  ).toLocaleString("en-IN");
  document.getElementById("totalRevenue").textContent = formatCurrency(
    data.totalRevenue || 0
  );

  const conversionRate =
    Number(data.totalViews || 0) > 0
      ? ((Number(data.totalSales || 0) / Number(data.totalViews || 0)) * 100).toFixed(1)
      : "0.0";
  document.getElementById("conversionRate").textContent = `${conversionRate}%`;

  const growthEl = document.getElementById("revenueGrowth");
  const monthlyRevenue = data.monthlyRevenue || [];
  if (monthlyRevenue.length >= 2) {
    const current = Number(monthlyRevenue.at(-1) || 0);
    const previous = Number(monthlyRevenue.at(-2) || 0);
    const growth =
      previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : "0.0";

    growthEl.textContent = `${Number(growth) >= 0 ? "+" : ""}${growth}%`;
    growthEl.classList.toggle("up", Number(growth) >= 0);
    growthEl.classList.toggle("down", Number(growth) < 0);
  } else {
    growthEl.textContent = "+0.0%";
  }

  document.getElementById("creatorScore").textContent = Number(
    data.creatorScore || 0
  );

  renderAnalyticsCharts(data);
  renderTopBooks(data.topBooks || []);
}

function renderAnalyticsCharts(data) {
  if (typeof Chart === "undefined") {
    return;
  }

  revenueChart = createOrReplaceChart(revenueChart, "revenueChart", "line", {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: data.monthlyRevenue || [],
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.2)",
        fill: true,
        tension: 0.35,
      },
    ],
  });

  salesChart = createOrReplaceChart(salesChart, "salesChart", "bar", {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Sales",
        data: data.monthlySales || [],
        backgroundColor: "#22c55e",
      },
    ],
  });

  forecastChart = createOrReplaceChart(forecastChart, "forecastChart", "line", {
    labels: ["Next 1", "Next 2", "Next 3"],
    datasets: [
      {
        label: "Forecast",
        data: data.forecastRevenue || [],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        fill: true,
        tension: 0.35,
      },
    ],
  });

  countryChart = createOrReplaceChart(countryChart, "countryChart", "pie", {
    labels: Object.keys(data.countrySales || {}),
    datasets: [
      {
        data: Object.values(data.countrySales || {}),
        backgroundColor: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"],
      },
    ],
  });
}

function createOrReplaceChart(existingChart, canvasId, type, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return existingChart;
  }

  if (existingChart) {
    existingChart.destroy();
  }

  return new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
      },
      scales:
        type === "pie"
          ? {}
          : {
              x: { ticks: { color: "#94a3b8" } },
              y: { ticks: { color: "#94a3b8" } },
            },
    },
  });
}

function renderTopBooks(books) {
  const tbody = document.getElementById("topBooksTable");
  if (!books.length) {
    tbody.innerHTML = "<tr><td colspan='3'>No sales data yet.</td></tr>";
    return;
  }

  tbody.innerHTML = books
    .map((book) => {
      return `
        <tr>
          <td>${escapeHtml(book.title)}</td>
          <td>${Number(book.sales || 0).toLocaleString("en-IN")}</td>
          <td>${formatCurrency(book.revenue || 0)}</td>
        </tr>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["creator", "author", "admin", "reader"]);
  if (!user) {
    return;
  }

  loadAnalytics();
});
