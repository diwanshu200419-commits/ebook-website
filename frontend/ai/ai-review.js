let reviewBookId = null;

function buildInsights(book) {
  const insights = [];
  const score = Number(book.aiScore || 0);

  if (score >= 85) {
    insights.push("Content quality looks strong and ready for publication.");
  } else if (score >= 70) {
    insights.push("Content quality is promising but could use minor improvements.");
  } else {
    insights.push("Content needs substantial improvement before publishing.");
  }

  if (book.description && book.description.length >= 100) {
    insights.push("Description is detailed enough to help marketplace conversion.");
  } else {
    insights.push("Add a stronger description to improve trust and discoverability.");
  }

  if (Number(book.price || 0) === 0) {
    insights.push("Free content can help the creator gain reach quickly.");
  } else {
    insights.push("Paid pricing should be matched with a polished preview and metadata.");
  }

  insights.push(
    "Admin notes will be visible to the creator after this review decision."
  );

  return insights;
}

function renderReview(book) {
  reviewBookId = book._id;

  document.getElementById("contentTitle").textContent = book.title;
  document.getElementById("contentMeta").innerHTML = `
    Category: <strong>${escapeHtml(book.category)}</strong> •
    Type: <strong>${escapeHtml(book.type)}</strong> •
    Price: <strong>${formatCurrency(book.price)}</strong>
  `;
  document.getElementById("creatorMeta").innerHTML = `
    Uploaded by: <strong>${escapeHtml(book.authorName)}</strong>
  `;

  const score = Number(book.aiScore || 0);
  const originality = Math.min(99, Math.max(55, score + 4));
  const readability = Math.min(99, Math.max(50, score - 3));
  const relevance = Math.min(99, Math.max(52, score + 1));

  document.getElementById("overallScore").textContent = `${score}%`;
  document.getElementById("metricOriginality").textContent = `${originality}%`;
  document.getElementById("metricReadability").textContent = `${readability}%`;
  document.getElementById("metricRelevance").textContent = `${relevance}%`;
  document.getElementById("metricCopyright").textContent =
    score >= 75 ? "Low" : "Medium";
  document.getElementById("metricSpam").textContent =
    score >= 80 ? "Low" : "Moderate";
  document.getElementById("metricRevenue").textContent =
    Number(book.price || 0) > 0 ? "High" : "Discovery";

  const recommendationBox = document.getElementById("recommendationBox");
  const recommendationText = document.getElementById("recommendationText");
  const scoreStatus = document.getElementById("scoreStatus");

  recommendationBox.classList.remove("approve", "review", "reject");

  if (score >= 85) {
    recommendationBox.classList.add("approve");
    recommendationText.textContent = "Recommended for publishing";
    scoreStatus.textContent = "High quality content";
  } else if (score >= 70) {
    recommendationBox.classList.add("review");
    recommendationText.textContent = "Request creator revisions before approval";
    scoreStatus.textContent = "Needs light improvements";
  } else {
    recommendationBox.classList.add("reject");
    recommendationText.textContent = "Not ready for publishing";
    scoreStatus.textContent = "Significant quality issues detected";
  }

  const insightList = document.getElementById("insightList");
  insightList.innerHTML = buildInsights(book)
    .map((insight) => `<li>${escapeHtml(insight)}</li>`)
    .join("");
}

async function loadReviewPage() {
  const user = await protectPage(["admin"]);
  if (!user) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");

  if (!bookId) {
    document.getElementById("contentTitle").textContent = "No content selected";
    return;
  }

  try {
    const data = await apiFetchJson(`/api/books/admin/${bookId}`);
    renderReview(data.book);
  } catch (error) {
    document.getElementById("contentTitle").textContent =
      error.message || "Unable to load review";
  }
}

async function updateReviewStatus(status, adminNotes = "") {
  if (!reviewBookId) {
    return;
  }

  try {
    await apiFetchJson(`/api/books/admin/status/${reviewBookId}`, {
      method: "PUT",
      body: JSON.stringify({ status, adminNotes }),
    });
    window.location.href = "../admin/admin.html";
  } catch (error) {
    alert(error.message || "Unable to update review.");
  }
}

function approveContent() {
  updateReviewStatus("Approved");
}

function requestChanges() {
  const note = prompt("What should the creator update?");
  if (!note) {
    return;
  }

  updateReviewStatus("Changes_Requested", note);
}

function rejectContent() {
  const note = prompt("Reason for rejection:");
  if (!note) {
    return;
  }

  updateReviewStatus("Rejected", note);
}

document.addEventListener("DOMContentLoaded", loadReviewPage);
