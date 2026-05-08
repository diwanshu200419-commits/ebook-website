/* =========================================
AUTH & ROLE PROTECTION
========================================= */

protectPage(["admin"]);

const admin = JSON.parse(
  localStorage.getItem("user") || "{}"
);

if (!admin || !admin.id) {

  alert("Unauthorized Access");

  window.location.href = "../login.html";

}

/* =========================================
DEMO AI REPORT
(BACKEND WILL REPLACE THIS)
========================================= */

const aiReport = {

  contentId: "c101",

  title: "Advanced Java Handwritten Notes",

  creator: "Yash Parmar",

  category: "Handwritten Notes",

  type: "Notes",

  price: 99,

  scores: {

    overall: 92,

    originality: 94,

    readability: 88,

    relevance: 90,

    spamRisk: "Low",

    copyrightRisk: "Low",

    revenuePotential: "High"

  },

  insights: [

    "Content appears original with no major plagiarism detected",

    "Well-structured for student audience",

    "Minor formatting improvements suggested",

    "Strong demand in Indian & global education market"

  ]

};

/* =========================================
DOM ELEMENTS
========================================= */

const titleEl =
  document.getElementById("contentTitle");

const overallScoreEl =
  document.getElementById("overallScore");

const insightsList =
  document.querySelector(".ai-insights ul");

const recommendationBox =
  document.querySelector(".ai-recommendation");

const recommendationText =
  recommendationBox.querySelector("p");

const metricsGrid =
  document.querySelector(".metrics-grid");

/* =========================================
INITIALIZE PAGE
========================================= */

initializeReviewPage();

/* =========================================
INITIALIZER
========================================= */

function initializeReviewPage() {

  renderBasicInfo();

  renderMetrics();

  renderInsights();

  renderRecommendation();

  animateScore();

}

/* =========================================
RENDER BASIC INFO
========================================= */

function renderBasicInfo() {

  titleEl.textContent =
    aiReport.title;

  overallScoreEl.textContent =
    aiReport.scores.overall + "%";

}

/* =========================================
RENDER METRICS
========================================= */

function renderMetrics() {

  metricsGrid.innerHTML = "";

  const metrics = [

    {
      label: "Originality",
      value: aiReport.scores.originality + "%",
      className: "good"
    },

    {
      label: "Readability",
      value: aiReport.scores.readability + "%",
      className: "good"
    },

    {
      label: "Relevance",
      value: aiReport.scores.relevance + "%",
      className: "good"
    },

    {
      label: "Copyright Risk",
      value: aiReport.scores.copyrightRisk,
      className: "safe"
    },

    {
      label: "Spam Probability",
      value: aiReport.scores.spamRisk,
      className: "safe"
    },

    {
      label: "Revenue Potential",
      value: aiReport.scores.revenuePotential,
      className: "good"
    }

  ];

  metrics.forEach(metric => {

    const card =
      document.createElement("article");

    card.className = "metric";

    card.innerHTML = `

      <h4>${metric.label}</h4>

      <span class="${metric.className}">
        ${metric.value}
      </span>

    `;

    metricsGrid.appendChild(card);

  });

}

/* =========================================
RENDER INSIGHTS
========================================= */

function renderInsights() {

  insightsList.innerHTML = "";

  aiReport.insights.forEach(insight => {

    const li =
      document.createElement("li");

    li.textContent = "✔ " + insight;

    insightsList.appendChild(li);

  });

}

/* =========================================
AI RECOMMENDATION ENGINE
========================================= */

function getRecommendation(score, risk) {

  if (
    score >= 85 &&
    risk === "Low"
  ) {

    return {
      status: "approve",
      message: "Recommended for publishing"
    };

  }

  if (score >= 70) {

    return {
      status: "review",
      message:
        "Needs improvements before approval"
    };

  }

  return {
    status: "reject",
    message:
      "Not recommended for publishing"
  };

}

/* =========================================
RENDER RECOMMENDATION
========================================= */

function renderRecommendation() {

  const recommendation =
    getRecommendation(
      aiReport.scores.overall,
      aiReport.scores.copyrightRisk
    );

  recommendationBox.classList.remove(
    "approve",
    "review",
    "reject"
  );

  recommendationBox.classList.add(
    recommendation.status
  );

  recommendationText.textContent =
    recommendation.message;

}

/* =========================================
ANIMATE SCORE
========================================= */

function animateScore() {

  let current = 0;

  const target =
    aiReport.scores.overall;

  const interval =
    setInterval(() => {

      current++;

      overallScoreEl.textContent =
        current + "%";

      if (current >= target) {

        clearInterval(interval);

      }

    }, 15);

}

/* =========================================
ADMIN ACTIONS
========================================= */

async function approveContent() {

  await handleReviewAction({

    status: "approved",

    successMessage:
      "✅ Content approved & published globally"

  });

}

async function requestChanges() {

  const reason =
    prompt("Enter required changes:");

  if (!reason) return;

  await handleReviewAction({

    status: "changes_requested",

    note: reason,

    successMessage:
      "✏️ Changes requested from creator"

  });

}

async function rejectContent() {

  const reason =
    prompt("Enter rejection reason:");

  if (!reason) return;

  await handleReviewAction({

    status: "rejected",

    note: reason,

    successMessage:
      "❌ Content rejected and creator notified"

  });

}

/* =========================================
HANDLE REVIEW ACTION
========================================= */

async function handleReviewAction({

  status,

  note = "",

  successMessage

}) {

  try {

    disableButtons();

    const payload =
      createReviewPayload(
        status,
        note
      );

    console.log(
      "ADMIN REVIEW PAYLOAD →",
      payload
    );

    // FUTURE BACKEND API

    /*
    await fetch("/api/admin/review", {

      method: "POST",

      headers: {
        "Content-Type":
        "application/json"
      },

      body:
      JSON.stringify(payload)

    });
    */

    showToast(successMessage);

    setTimeout(() => {

      goBack();

    }, 1200);

  }

  catch (error) {

    console.error(error);

    showToast(
      "Something went wrong"
    );

    enableButtons();

  }

}

/* =========================================
CREATE PAYLOAD
========================================= */

function createReviewPayload(
  status,
  note
) {

  return {

    contentId:
      aiReport.contentId,

    status,

    note,

    reviewedBy:
      admin.id,

    reviewedAt:
      new Date().toISOString(),

    aiScore:
      aiReport.scores.overall

  };

}

/* =========================================
BUTTON CONTROL
========================================= */

function disableButtons() {

  document
    .querySelectorAll(".btn")
    .forEach(btn => {

      btn.disabled = true;

      btn.style.opacity = ".6";

      btn.style.cursor =
        "not-allowed";

    });

}

function enableButtons() {

  document
    .querySelectorAll(".btn")
    .forEach(btn => {

      btn.disabled = false;

      btn.style.opacity = "1";

      btn.style.cursor =
        "pointer";

    });

}

/* =========================================
TOAST
========================================= */

function showToast(message) {

  const toast =
    document.createElement("div");

  toast.className = "toast";

  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {

    toast.classList.add("show");

  }, 100);

  setTimeout(() => {

    toast.classList.remove("show");

    setTimeout(() => {

      toast.remove();

    }, 300);

  }, 2500);

}

/* =========================================
NAVIGATION
========================================= */

function goBack() {

  window.location.href =
    "../admin/admin.html";

}