// services/aiReview.js
const OpenAI = require('openai');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Fallback heuristic AI review if OpenAI is not available
function heuristicReview(book) {
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

// Real AI review using OpenAI
async function openAIReview(book) {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicReview(book);
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const title = (book.title || "").trim();
    const description = (book.description || "").trim();
    const category = book.category || "Book";

    const prompt = `
You are an AI content moderator for an educational ebook marketplace. Analyze this book submission and provide:

1. qualityScore (0-100): How good is the content quality?
2. plagiarismScore (0-100): How likely is this to be plagiarized or low-quality spam?
3. aiStatus: "approved", "pending", or "rejected"
4. aiSuggestion: Short helpful feedback for the creator

Book Details:
- Title: ${title}
- Description: ${description}
- Category: ${category}
- Price: ₹${book.price || 0}

Respond with JSON only in this exact format:
{
  "qualityScore": 85,
  "plagiarismScore": 10,
  "aiStatus": "approved",
  "aiSuggestion": "Great content!"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const aiScore = clamp(Math.round((result.qualityScore * 0.65) + ((100 - result.plagiarismScore) * 0.35)), 0, 100);
      return {
        aiStatus: result.aiStatus || "pending",
        plagiarismScore: clamp(result.plagiarismScore || 0, 0, 100),
        qualityScore: clamp(result.qualityScore || 0, 0, 100),
        aiSuggestion: result.aiSuggestion || "Needs admin review before publishing.",
        aiScore
      };
    }
  } catch (error) {
    console.error("OpenAI review error:", error.message);
  }

  return heuristicReview(book);
}

async function buildAIReview(book) {
  if (process.env.OPENAI_API_KEY) {
    return await openAIReview(book);
  }
  return heuristicReview(book);
}

module.exports = {
  buildAIReview
};
