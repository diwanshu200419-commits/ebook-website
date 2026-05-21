const API_BASE = window.API_BASE || "";
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
    renderWithdrawRequests(data.withdrawRequests || []);
    renderReferralSummary(data.referralSummary || {});
    renderReferralRewards(data.referralRewards || []);
    renderCampaignOverview(data.campaignOverview || {});
    renderCampaignBreakdown(data.campaignBreakdown || []);
    renderCampaignInsights(data.campaignInsights || {});
    renderCampaignRecommendations(data.campaignRecommendations || []);
    renderCampaignHistory(data.campaignHistory || []);
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

function renderWithdrawRequests(withdrawRequests) {
  const tbody = document.getElementById("withdrawRequestList");
  if (!tbody) {
    return;
  }

  if (!withdrawRequests.length) {
    tbody.innerHTML = `<tr><td colspan="4">No withdrawal requests yet</td></tr>`;
    return;
  }

  tbody.innerHTML = withdrawRequests.map((request) => `
    <tr>
      <td>${formatDate(request.requestedAt)}</td>
      <td>Rs. ${Number(request.amount || 0).toLocaleString("en-IN")}</td>
      <td>${escapeHTML(String(request.method || "bank").toUpperCase())}</td>
      <td class="status ${String(request.status || "").toLowerCase()}" title="${escapeHTML(request.adminNote || "")}">
        ${escapeHTML(request.status)}
      </td>
    </tr>
  `).join("");
}

function renderReferralSummary(summary) {
  setText("referralRewardTotal", `₹${Number(summary.totalRewardAmount || 0).toLocaleString("en-IN")}`);
  setText("referralRewardCount", Number(summary.rewardedPurchasesCount || 0).toLocaleString("en-IN"));
  setText("referralSignupTotal", Number(summary.signupsCount || 0).toLocaleString("en-IN"));
}

function renderReferralRewards(rewards) {
  const tbody = document.getElementById("referralRewardList");
  if (!tbody) {
    return;
  }

  if (!rewards.length) {
    tbody.innerHTML = `<tr><td colspan="4">No referral rewards yet</td></tr>`;
    return;
  }

  tbody.innerHTML = rewards.map((reward) => `
    <tr>
      <td>${formatDate(reward.createdAt)}</td>
      <td>${escapeHTML(reward.referredUser?.username ? `@${reward.referredUser.username}` : reward.referredUser?.name || "Referred buyer")}</td>
      <td>${escapeHTML(formatRewardTrigger(reward.triggerType))}</td>
      <td>₹${Number(reward.amount || 0).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");
}

function renderCampaignOverview(summary) {
  setText("campaignTotalSent", Number(summary.totalSent || 0).toLocaleString("en-IN"));
  setText("campaignConverted", Number(summary.converted || 0).toLocaleString("en-IN"));
  setText("campaignRevenueInfluenced", formatCurrency(summary.creatorRevenueInfluenced || 0));
  setText("campaignEmailRate", `${Number(summary.totalSent ? ((Number(summary.emailDelivered || 0) / Number(summary.totalSent || 1)) * 100) : 0).toFixed(1)}%`);
}

function renderCampaignBreakdown(entries) {
  const container = document.getElementById("campaignBreakdownList");
  if (!container) {
    return;
  }

  if (!entries.length) {
    container.innerHTML = `<div class="crm-empty">No lifecycle CRM activity yet. Once recovery and upsell campaigns start firing, performance will appear here.</div>`;
    return;
  }

  container.innerHTML = entries.map((entry) => `
    <article class="crm-card">
      <div>
        <h3>${escapeHTML(entry.label || "Campaign")}</h3>
        <p>${escapeHTML(entry.description || "Lifecycle campaign performance")}</p>
      </div>
      <div class="crm-metrics">
        <span>Sent: <strong>${Number(entry.sent || 0).toLocaleString("en-IN")}</strong></span>
        <span>Converted: <strong>${Number(entry.converted || 0).toLocaleString("en-IN")}</strong></span>
        <span>Rate: <strong>${Number(entry.conversionRate || 0).toFixed(1)}%</strong></span>
        <span>${escapeHTML(entry.metricLabel || "Value")}: <strong>${escapeHTML(formatCampaignMetric(entry))}</strong></span>
      </div>
    </article>
  `).join("");
}

function renderCampaignInsights(insights) {
  const container = document.getElementById("campaignInsightList");
  if (!container) {
    return;
  }

  const recommendations = Array.isArray(insights.recommendations) ? insights.recommendations : [];
  if (!recommendations.length) {
    container.innerHTML = `<div class="crm-empty">Variant learning will appear here once your lifecycle campaigns gather enough sends.</div>`;
    return;
  }

  container.innerHTML = recommendations.slice(0, 4).map((entry) => `
    <article class="crm-card">
      <div>
        <h3>${escapeHTML(entry.label || "Campaign")} · ${escapeHTML(entry.winningVariantLabel || formatVariantLabel(entry.winningVariant || "default"))}</h3>
        <p>${escapeHTML(entry.rationale || "Experiment data is still learning.")}</p>
      </div>
      <div class="crm-metrics">
        <span>Status: <strong>${escapeHTML(formatExperimentStatus(entry.action, entry.confidence))}</strong></span>
        <span>Sent: <strong>${Number(entry.sent || 0).toLocaleString("en-IN")}</strong></span>
        <span>Converted: <strong>${Number(entry.converted || 0).toLocaleString("en-IN")}</strong></span>
        <span>Rate: <strong>${Number(entry.conversionRate || 0).toFixed(1)}%</strong></span>
        <span>Lead: <strong>${Number(entry.leadRate || 0).toFixed(1)}%</strong></span>
      </div>
    </article>
  `).join("");
}

function renderCampaignRecommendations(recommendations) {
  const container = document.getElementById("campaignRecommendationList");
  if (!container) {
    return;
  }

  if (!recommendations.length) {
    container.innerHTML = `<div class="crm-empty">We need a bit more catalog and CRM data before recommending your next lifecycle loop.</div>`;
    return;
  }

  container.innerHTML = recommendations.map((entry) => `
    <article class="crm-card">
      <div>
        <h3>${escapeHTML(entry.label || "Campaign")} · ${escapeHTML(entry.recommendedVariantLabel || formatVariantLabel(entry.recommendedVariant || "default"))}</h3>
        <p>${escapeHTML(entry.reason || "This lifecycle loop has strong monetization potential for your catalog.")}</p>
        <p>${escapeHTML(entry.nextStep || "")}</p>
      </div>
      <div class="crm-metrics">
        <span>Priority: <strong>${Number(entry.priority || 0)}/100</strong></span>
        <span>Status: <strong>${escapeHTML(formatRecommendationStatus(entry.status || "new_test"))}</strong></span>
        <span>Sent: <strong>${Number(entry.metrics?.sent || 0).toLocaleString("en-IN")}</strong></span>
        <span>Rate: <strong>${Number(entry.metrics?.conversionRate || 0).toFixed(1)}%</strong></span>
        <span>Earnings: <strong>${escapeHTML(formatCurrency(entry.metrics?.creatorRevenueInfluenced || 0))}</strong></span>
      </div>
      <div class="crm-actions-row">
        <span class="crm-chip">${escapeHTML(formatVariantSource(entry.variantSource || "default"))}</span>
        <a class="crm-action" href="${escapeAttribute(entry.actionLink || "dashboard.html")}">${escapeHTML(entry.actionLabel || "Open workflow")}</a>
      </div>
    </article>
  `).join("");
}

function renderCampaignHistory(entries) {
  const container = document.getElementById("campaignHistoryList");
  if (!container) {
    return;
  }

  if (!entries.length) {
    container.innerHTML = `<div class="crm-empty">No CRM sends logged yet.</div>`;
    return;
  }

  container.innerHTML = entries.map((entry) => `
    <article class="crm-history-card">
      <div>
        <h3>${escapeHTML(entry.label || "Campaign")}</h3>
        <p>${escapeHTML(entry.title || "Lifecycle message")}</p>
      </div>
      <div class="crm-history-meta">
        <span>${escapeHTML(formatDate(entry.sentAt))}</span>
        <span>${escapeHTML(buildCampaignChannel(entry.channel || {}))}</span>
        <span>${escapeHTML(entry.historyHeadline || "Awaiting conversion")}</span>
      </div>
    </article>
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

function buildCampaignChannel(channel = {}) {
  if (channel.emailDelivered) {
    return "Email + inbox";
  }

  if (channel.inAppDelivered) {
    return "Inbox only";
  }

  return "CRM";
}

function formatCampaignMetric(entry = {}) {
  if (entry.primaryMetricType === "count") {
    return Number(entry.primaryMetricValue || 0).toLocaleString("en-IN");
  }

  return formatCurrency(entry.creatorRevenueInfluenced > 0 ? entry.creatorRevenueInfluenced : entry.primaryMetricValue || 0);
}

function formatVariantLabel(variant = "default") {
  const normalized = String(variant || "default").trim().toLowerCase();
  if (normalized === "social_proof") {
    return "Social Proof";
  }

  if (normalized === "auto") {
    return "Auto";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatExperimentStatus(action = "observe", confidence = "collecting") {
  if (action === "promote") {
    return "Winner ready";
  }

  if (confidence === "testing") {
    return "Keep testing";
  }

  return "Collecting data";
}

function formatRecommendationStatus(status = "new_test") {
  if (status === "winner_ready") {
    return "Winner ready";
  }

  if (status === "learning") {
    return "Learning";
  }

  return "New test";
}

function formatVariantSource(source = "default") {
  if (source === "auto_promoted") {
    return "Auto winner";
  }

  if (source === "top_variant") {
    return "Best current variant";
  }

  return "Default copy";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
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

function formatRewardTrigger(triggerType) {
  return String(triggerType || "").toLowerCase() === "first_purchase"
    ? "First purchase"
    : "Referral reward";
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

function escapeAttribute(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
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
