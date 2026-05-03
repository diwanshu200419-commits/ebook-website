// services/aiReview.js

function generateAIScore(book) {

  let score = 50; // base score

  // 1️⃣ Description Quality
  if (book.description && book.description.length > 100) {
    score += 15;
  }

  // 2️⃣ Price Logic
  if (book.price > 0 && book.price <= 999) {
    score += 10;
  }

  // 3️⃣ Category Boost
  if (["Book", "Notes", "AI"].includes(book.category)) {
    score += 10;
  }

  // 4️⃣ Random originality simulation
  const originality = Math.floor(Math.random() * 20);
  score += originality;

  // Cap at 100
  if (score > 100) score = 100;

  return score;
}

function decideStatus(score) {

  if (score >= 80) return "Admin_Review";

  if (score < 40) return "Rejected";

  return "Admin_Review";
}

module.exports = {
  generateAIScore,
  decideStatus
};
