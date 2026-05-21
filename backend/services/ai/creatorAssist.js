const { generateDescriptionWithAI } = require("./pipeline");
const {
  buildKeywordList,
  clamp,
  computeReadability,
  normalizeWhitespace,
} = require("./text");

const PRICE_BANDS = {
  AI: { min: 199, max: 699, positioning: "Premium digital asset" },
  Notes: { min: 49, max: 149, positioning: "Fast-moving student resource" },
  Comics: { min: 79, max: 249, positioning: "Visual story or concept pack" },
  Book: { min: 99, max: 299, positioning: "Depth-focused digital guide" },
  default: { min: 79, max: 249, positioning: "General digital product" },
};

function toTitleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dedupeList(values, limit = 3) {
  const unique = [];
  values.forEach((value) => {
    const clean = normalizeWhitespace(value);
    if (!clean) {
      return;
    }

    const key = clean.toLowerCase();
    if (unique.some((entry) => entry.toLowerCase() === key)) {
      return;
    }

    unique.push(clean);
  });

  return unique.slice(0, limit);
}

function buildAudienceLabel(category, language) {
  const normalizedCategory = String(category || "").toLowerCase();
  const normalizedLanguage = String(language || "").toLowerCase();

  if (normalizedCategory.includes("competitive")) {
    return "exam-focused students";
  }

  if (normalizedCategory.includes("program")) {
    return "job-ready learners";
  }

  if (normalizedCategory.includes("business") || normalizedCategory.includes("finance")) {
    return "side-hustle creators";
  }

  if (normalizedLanguage === "hindi" || normalizedLanguage === "hinglish") {
    return "Indian student audiences";
  }

  return "digital-first learners";
}

function buildTitleSuggestions({ title, type, category, language, generatedTags, notes }) {
  const cleanTitle = normalizeWhitespace(title);
  const keywords = buildKeywordList(
    `${cleanTitle}\n${notes}\n${generatedTags.join(" ")}`,
    5
  ).map((keyword) => toTitleCase(keyword));
  const primaryKeyword = keywords[0] || toTitleCase(category || type || "Guide");
  const secondaryKeyword = keywords[1] || toTitleCase(type || "Playbook");
  const audience = buildAudienceLabel(category, language);

  return dedupeList([
    cleanTitle,
    `${cleanTitle}: ${primaryKeyword} Blueprint`,
    `${toTitleCase(primaryKeyword)} ${toTitleCase(type || "Guide")} for ${audience}`,
    `${cleanTitle} with ${secondaryKeyword} Templates`,
  ]);
}

function buildThumbnailIdeas({ title, category, type, generatedTags }) {
  const cleanTitle = normalizeWhitespace(title);
  const topic = toTitleCase(generatedTags[0] || category || type || "Learning");
  const accent = toTitleCase(generatedTags[1] || generatedTags[0] || "Creator");

  return [
    {
      name: "Bold Marketplace Cover",
      prompt: `Use a dark SaaS background, one large title line for "${cleanTitle}", and a bright accent badge for ${topic}.`,
    },
    {
      name: "Student Conversion Cover",
      prompt: `Lead with ${topic}, add a quick value strip for ${accent}, and keep the layout readable on mobile storefront cards.`,
    },
    {
      name: "Premium Creator Pack",
      prompt: `Blend neon gradients, clean typography, and 2 short trust cues around ${toTitleCase(category || type || "digital product")}.`,
    },
  ];
}

function buildPricingInsight({ type, price }) {
  const band = PRICE_BANDS[type] || PRICE_BANDS.default;
  const normalizedPrice = Number(price || 0);

  let message = `Most ${String(type || "digital product").toLowerCase()} listings convert well between Rs. ${band.min} and Rs. ${band.max}.`;
  if (normalizedPrice <= 0) {
    message = "This will launch as a free lead magnet. Charge only if you want direct revenue from each purchase.";
  } else if (normalizedPrice < band.min) {
    message = `Your price is below the usual monetization band. Consider testing Rs. ${band.min}+ if the product has real depth.`;
  } else if (normalizedPrice > band.max) {
    message = `Your price is premium for this format. Keep it only if the product includes strong outcomes, templates, or bundled value.`;
  }

  return {
    suggestedMin: band.min,
    suggestedMax: band.max,
    positioning: band.positioning,
    currentPrice: normalizedPrice,
    message,
  };
}

function buildReadiness({ title, category, description, tags, price }) {
  const warnings = [];
  const strengths = [];
  let score = 0;

  if (normalizeWhitespace(title).length >= 12) {
    score += 20;
    strengths.push("Title is clear enough for marketplace scanning.");
  } else {
    warnings.push("Make the title more specific so buyers understand the outcome quickly.");
  }

  if (normalizeWhitespace(category)) {
    score += 15;
    strengths.push("Category is set, which improves discoverability.");
  } else {
    warnings.push("Choose a category before publishing so AI search and storefront filters can place it correctly.");
  }

  const cleanDescription = normalizeWhitespace(description);
  if (cleanDescription.length >= 140) {
    score += 20;
    strengths.push("Description has enough depth for trust and SEO.");
  } else {
    warnings.push("Add more detail to the description so buyers can understand outcomes and value.");
  }

  if (Array.isArray(tags) && tags.length >= 3) {
    score += 15;
    strengths.push("Tag coverage is strong enough for search discovery.");
  } else {
    warnings.push("Add at least 3 tags so the product is easier to discover.");
  }

  if (Number(price || 0) > 0) {
    score += 15;
    strengths.push("Monetization is turned on for direct revenue.");
  } else {
    warnings.push("This listing is currently free, so it will grow audience but not produce direct sales revenue.");
  }

  const readability = computeReadability(cleanDescription);
  if (Number(readability.readabilityScore || 0) >= 45) {
    score += 15;
    strengths.push("Description readability looks buyer-friendly.");
  } else if (cleanDescription) {
    warnings.push("Simplify some description lines so the sales copy is easier to scan on mobile.");
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  const status = finalScore >= 80
    ? "Launch ready"
    : finalScore >= 60
      ? "Needs a polish pass"
      : "Improve before publishing";

  return {
    score: finalScore,
    status,
    strengths: strengths.slice(0, 4),
    warnings: warnings.slice(0, 4),
  };
}

async function buildCreatorAssist(input = {}) {
  const title = normalizeWhitespace(input.title);
  const category = normalizeWhitespace(input.category || "");
  const type = normalizeWhitespace(input.type || "Book");
  const language = normalizeWhitespace(input.language || "English");
  const notes = normalizeWhitespace(input.notes || "");
  const excerpt = normalizeWhitespace(input.excerpt || notes);
  const price = Number(input.price || 0);

  const aiResult = await generateDescriptionWithAI({
    title,
    category,
    tags: input.tags || [],
    notes,
    excerpt,
  });

  const generatedTags = Array.isArray(aiResult.generatedTags)
    ? aiResult.generatedTags.slice(0, 6)
    : [];
  const resolvedCategory = aiResult.suggestedCategory || category || "Book";
  const description = aiResult.description || notes;

  return {
    description,
    suggestedCategory: resolvedCategory,
    generatedTags,
    titleSuggestions: buildTitleSuggestions({
      title,
      type,
      category: resolvedCategory,
      language,
      generatedTags,
      notes: description,
    }),
    thumbnailIdeas: buildThumbnailIdeas({
      title: title || "Digital Product",
      category: resolvedCategory,
      type,
      generatedTags,
    }),
    pricing: buildPricingInsight({
      type,
      price,
    }),
    readiness: buildReadiness({
      title,
      category: resolvedCategory,
      description,
      tags: generatedTags,
      price,
    }),
    provider: aiResult.provider || "local",
    model: aiResult.model || "local-heuristic",
  };
}

module.exports = {
  buildCreatorAssist,
};
