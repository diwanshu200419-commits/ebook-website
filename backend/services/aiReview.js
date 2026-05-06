// services/aiReview.js

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildAIReview(book) {
  const title = (book.title || "").trim();
  const description = (book.description || "").trim();
  const text = `${title} ${description}`.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  let qualityScore = 40;
  if (title.length >= 8) qualityScore += 10;
  if (description.length >= 120) qualityScore += 25;
  if (description.length >= 300) qualityScore += 10;
  if ((book.price || 0) >= 0) qualityScore += 5;
  if (["Book", "Notes", "Study", "AI", "Comics"].includes(book.category)) qualityScore += 5;
  qualityScore = clamp(qualityScore, 0, 100);

  const shortOrSpam = words.filter((w) => w.length <= 2).length;
  const uniqueCount = new Set(words).size || 1;
  const repetitionRatio = words.length ? 1 - uniqueCount / words.length : 0;
  let plagiarismScore = 5;
  plagiarismScore += clamp(Math.round(repetitionRatio * 120), 0, 70);
  plagiarismScore += shortOrSpam > 40 ? 10 : 0;
  plagiarismScore += description.length < 80 ? 15 : 0;
  plagiarismScore = clamp(plagiarismScore, 0, 100);

  const aiScore = clamp(Math.round((qualityScore * 0.65) + ((100 - plagiarismScore) * 0.35)), 0, 100);

  let aiStatus = "pending";
  if (plagiarismScore < 30 && qualityScore >= 70) {
    aiStatus = "approved";
  } else if (plagiarismScore >= 70 || qualityScore < 35) {
    aiStatus = "rejected";
  }

  const aiSuggestion =
    aiStatus === "approved"
      ? "Auto-approved by AI quality checks."
      : aiStatus === "rejected"
        ? "High risk content quality/plagiarism. Requires major revision."
        : "Needs admin review before publishing.";

  return { aiStatus, plagiarismScore, qualityScore, aiSuggestion, aiScore };
}

module.exports = {
  buildAIReview
};
