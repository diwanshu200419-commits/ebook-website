/* ======================================
   AUTH & ROLE CHECK
====================================== */
protectPage(["admin"]);

const admin = JSON.parse(localStorage.getItem("user"));

/* ======================================
   DEMO AI REPORT (BACKEND WILL REPLACE)
====================================== */
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

/* ======================================
   DOM ELEMENTS
====================================== */
const titleEl = document.getElementById("contentTitle");
const overallScoreEl = document.getElementById("overallScore");

/* ======================================
   RENDER BASIC INFO
====================================== */
titleEl.innerText = aiReport.title;
overallScoreEl.innerText = aiReport.scores.overall + "%";

/* ======================================
   AI DECISION LOGIC
====================================== */
function getRecommendation(score, risk) {
  if (score >= 85 && risk === "Low") return "approve";
  if (score >= 70) return "review";
  return "reject";
}

const recommendation = getRecommendation(
  aiReport.scores.overall,
  aiReport.scores.copyrightRisk
);

/* ======================================
   UPDATE UI BASED ON DECISION
====================================== */
const recommendationBox = document.querySelector(".ai-recommendation");
const recommendationText = recommendationBox.querySelector("p");

if (recommendation === "approve") {
  recommendationBox.classList.add("approve");
  recommendationText.innerText = "Recommended for publishing";
} else if (recommendation === "review") {
  recommendationBox.classList.add("review");
  recommendationText.innerText = "Needs minor improvements before approval";
} else {
  recommendationBox.classList.add("reject");
  recommendationText.innerText = "Not recommended for publishing";
}

/* ======================================
   ADMIN ACTIONS
====================================== */
function approveContent() {
  logAdminAction("approved");
  alert("✅ Content approved & published globally");
  goBack();
}

function requestChanges() {
  const reason = prompt("Enter changes required for creator:");
  if (!reason) return;

  logAdminAction("changes_requested", reason);
  alert("✏️ Changes requested from creator");
  goBack();
}

function rejectContent() {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  logAdminAction("rejected", reason);
  alert("❌ Content rejected and creator notified");
  goBack();
}

/* ======================================
   ADMIN LOG (BACKEND READY)
====================================== */
function logAdminAction(status, note = "") {
  const payload = {
    contentId: aiReport.contentId,
    status,
    note,
    reviewedBy: admin.id,
    reviewedAt: new Date().toISOString(),
    aiScore: aiReport.scores.overall
  };

  console.log("ADMIN REVIEW PAYLOAD →", payload);

  // FUTURE:
  // fetch("/api/admin/review", { method: "POST", body: JSON.stringify(payload) })
}

/* ======================================
   NAVIGATION
====================================== */
function goBack() {
  setTimeout(() => {
    window.location.href = "../admin/admin.html";
  }, 800);
}
