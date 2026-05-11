const Book = require("../../models/book");
const BookAI = require("../../models/BookAI");
const { resolvePublicUploadPath } = require("../../utils/uploads");

const {
  getConfiguredAiProvider,
  getEmbeddingDimensions,
  getEmbeddingModel,
  getModerationModel,
  getOpenAIClient,
  hasOpenAI,
  hasOllama,
  hasOllamaEmbeddings,
} = require("./client");
const {
  createOllamaEmbedding,
  runStructuredOllamaChat,
} = require("./ollama");
const { extractPdfAnalysis } = require("./pdf");
const {
  buildHash,
  buildKeywordList,
  buildLocalDescription,
  clamp,
  computeReadability,
  cosineSimilarity,
  lexicalSimilarity,
  limitText,
  normalizeAnalysisText,
  normalizeWhitespace,
  splitIntoChunks,
  tokenizeText,
} = require("./text");

const CATEGORY_KEYWORDS = {
  Education: ["education", "student", "exam", "class", "lecture", "syllabus", "course"],
  Technology: ["technology", "software", "computer", "digital", "engineering", "system"],
  Programming: ["programming", "code", "coding", "javascript", "python", "java", "developer", "algorithm"],
  Business: ["business", "marketing", "startup", "sales", "strategy", "finance", "management"],
  Design: ["design", "ui", "ux", "figma", "branding", "creative", "illustration"],
  Finance: ["finance", "investment", "stock", "trading", "accounting", "tax", "money"],
  "Self Help": ["self help", "habit", "mindset", "motivation", "productivity", "discipline"],
  Fiction: ["fiction", "novel", "story", "character", "plot", "fantasy", "romance"],
  Competitive: ["competitive", "ssc", "upsc", "neet", "jee", "banking", "government"],
  Handwritten: ["handwritten", "notes", "notebook", "revision", "class notes"],
  AI: ["ai", "artificial intelligence", "machine learning", "llm", "prompt", "automation"],
  Notes: ["notes", "summary", "revision", "handwritten", "class notes"],
  Study: ["study", "guide", "worksheet", "practice", "tutorial"],
  Comics: ["comic", "manga", "graphic", "illustrated", "panel"],
  Book: ["book", "chapter", "guide", "manual"],
};

const MODERATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "qualityScore",
    "plagiarismScore",
    "aiStatus",
    "moderationReason",
    "suggestedCategory",
    "generatedTags",
    "generatedDescription",
    "improvementSuggestions",
  ],
  properties: {
    qualityScore: { type: "integer", minimum: 0, maximum: 100 },
    plagiarismScore: { type: "integer", minimum: 0, maximum: 100 },
    aiStatus: { type: "string", enum: ["approved", "pending", "rejected"] },
    moderationReason: { type: "string", minLength: 6, maxLength: 500 },
    suggestedCategory: { type: "string", minLength: 2, maxLength: 60 },
    generatedTags: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 2, maxLength: 32 },
    },
    generatedDescription: { type: "string", minLength: 30, maxLength: 600 },
    improvementSuggestions: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 4, maxLength: 240 },
    },
  },
};

const DESCRIPTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["description", "suggestedCategory", "generatedTags"],
  properties: {
    description: { type: "string", minLength: 40, maxLength: 600 },
    suggestedCategory: { type: "string", minLength: 2, maxLength: 60 },
    generatedTags: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 2, maxLength: 32 },
    },
  },
};

function mapAiStatusToBookStatus(aiStatus) {
  if (aiStatus === "approved") {
    return "Approved";
  }

  if (aiStatus === "rejected") {
    return "Rejected";
  }

  return "Admin_Review";
}

function buildScoreFromSignals(qualityScore, plagiarismScore) {
  return clamp(
    Math.round((Number(qualityScore || 0) * 0.65) + ((100 - Number(plagiarismScore || 0)) * 0.35)),
    0,
    100
  );
}

function buildAnalysisSource(book, extractedText) {
  return normalizeWhitespace([
    book.title,
    book.authorName,
    book.type,
    book.category,
    Array.isArray(book.tags) ? book.tags.join(", ") : "",
    book.description,
    extractedText,
  ].filter(Boolean).join("\n\n"));
}

function normalizeTagList(tags, fallbackText = "") {
  const source = Array.isArray(tags) ? tags : [];
  const cleaned = source
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  if (cleaned.length) {
    return [...new Set(cleaned)];
  }

  return buildKeywordList(fallbackText, 6);
}

function deriveCategory(book, analysisText) {
  const searchable = normalizeAnalysisText(analysisText).toLowerCase();
  const requestedCategory = String(book.category || "").trim();
  const scores = new Map();

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    let score = requestedCategory === category ? 2 : 0;
    keywords.forEach((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = searchable.match(new RegExp(escaped, "g")) || [];
      score += matches.length;
    });
    scores.set(category, score);
  });

  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]);
  if (!ranked.length || ranked[0][1] <= 0) {
    return requestedCategory || "Book";
  }

  return ranked[0][0];
}

function buildQualitySignals(analysisText) {
  const cleanText = normalizeAnalysisText(analysisText);
  const readability = computeReadability(cleanText);
  const rawTokens = cleanText.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokenizeText(cleanText);
  const uniqueRatio = normalizedTokens.length
    ? new Set(normalizedTokens).size / normalizedTokens.length
    : 0;
  const uppercaseCount = rawTokens.filter((token) => token.length > 3 && token === token.toUpperCase()).length;
  const urlCount = (cleanText.match(/https?:\/\//g) || []).length;
  const punctuationDensity = cleanText.length
    ? ((cleanText.match(/[.!?,;:]/g) || []).length / cleanText.length)
    : 0;
  const paragraphCount = cleanText
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  const repetitionPenalty = clamp(Math.round((1 - uniqueRatio) * 100), 0, 100);
  const spamScore = clamp(
    repetitionPenalty
      + (uppercaseCount > 15 ? 12 : 0)
      + (urlCount > 2 ? 18 : 0)
      + (readability.wordCount < 120 ? 16 : 0),
    0,
    100
  );
  const grammarScore = clamp(
    Math.round(
      48
      + (readability.readabilityScore * 0.22)
      + (punctuationDensity > 0.01 ? 12 : 0)
      + (readability.sentenceCount > 6 ? 10 : 0)
      - (uppercaseCount > 10 ? 8 : 0)
    ),
    0,
    100
  );
  const structureScore = clamp(
    Math.round(
      42
      + Math.min(paragraphCount, 8) * 6
      + (readability.avgSentenceLength >= 8 && readability.avgSentenceLength <= 26 ? 10 : 0)
      + (readability.wordCount >= 250 ? 8 : 0)
    ),
    0,
    100
  );

  return {
    readabilityScore: readability.readabilityScore,
    grammarScore,
    spamScore,
    repetitionScore: clamp(100 - repetitionPenalty, 0, 100),
    structureScore,
    wordCount: readability.wordCount,
    sentenceCount: readability.sentenceCount,
    avgSentenceLength: readability.avgSentenceLength,
  };
}

function buildImprovementSuggestions(signals, extractionNotice = "") {
  const suggestions = [];

  if (signals.wordCount < 150) {
    suggestions.push("Add more original explanatory content so the PDF feels complete and searchable.");
  }
  if (signals.readabilityScore < 45) {
    suggestions.push("Use shorter sentences and clearer headings to improve readability.");
  }
  if (signals.grammarScore < 55) {
    suggestions.push("Review grammar, punctuation, and formatting before resubmitting.");
  }
  if (signals.spamScore > 55) {
    suggestions.push("Reduce repetitive phrasing and promotional filler content.");
  }
  if (signals.structureScore < 55) {
    suggestions.push("Break the material into better-organized sections with clearer topic flow.");
  }
  if (extractionNotice) {
    suggestions.push(extractionNotice);
  }

  return suggestions.slice(0, 5);
}

function buildLocalModeration({ book, analysisText, suggestedCategory, generatedTags, matches, extractionNotice = "" }) {
  const signals = buildQualitySignals(analysisText);
  const topMatch = matches[0];
  const similarityRisk = clamp(Math.round((Number(topMatch?.score || 0)) * 100), 0, 100);
  const plagiarismScore = clamp(
    similarityRisk
      + (signals.spamScore > 60 ? 8 : 0)
      + (signals.wordCount < 120 ? 10 : 0),
    0,
    100
  );
  const qualityScore = clamp(
    Math.round(
      (signals.readabilityScore * 0.22)
      + (signals.grammarScore * 0.28)
      + (signals.structureScore * 0.22)
      + ((100 - signals.spamScore) * 0.14)
      + (signals.repetitionScore * 0.14)
    ),
    0,
    100
  );

  let aiStatus = "pending";
  if (plagiarismScore >= 82 || qualityScore < 32) {
    aiStatus = "rejected";
  } else if (plagiarismScore <= 25 && qualityScore >= 76 && !extractionNotice) {
    aiStatus = "approved";
  }

  const improvementSuggestions = buildImprovementSuggestions(signals, extractionNotice);
  const moderationReason =
    aiStatus === "approved"
      ? "AI scan found strong structure, acceptable originality signals, and low moderation risk."
      : aiStatus === "rejected"
        ? "AI scan flagged the submission for likely duplication, weak structure, or unusually low-quality content."
        : "AI scan finished, but this upload should be reviewed manually before publishing.";

  const generatedDescription = buildLocalDescription({
    title: book.title,
    category: suggestedCategory,
    tags: generatedTags,
    description: book.description,
    text: analysisText,
  });

  return {
    aiStatus,
    aiScore: buildScoreFromSignals(qualityScore, plagiarismScore),
    qualityScore,
    plagiarismScore,
    aiSuggestion: improvementSuggestions[0] || moderationReason,
    moderationReason,
    suggestedCategory,
    generatedTags,
    generatedDescription,
    improvementSuggestions,
    qualitySignals: signals,
  };
}

async function generateEmbedding(text) {
  const input = limitText(text, 8000);
  if (!input) {
    return [];
  }

  if (hasOpenAI()) {
    const client = getOpenAIClient();
    if (!client) {
      return [];
    }

    try {
      const response = await client.embeddings.create({
        model: getEmbeddingModel(),
        input,
        dimensions: getEmbeddingDimensions(),
      });

      return Array.isArray(response.data?.[0]?.embedding) ? response.data[0].embedding : [];
    } catch (error) {
      console.error("Embedding generation error:", error.message);
      return [];
    }
  }

  if (hasOllamaEmbeddings()) {
    try {
      return await createOllamaEmbedding(input, getEmbeddingDimensions());
    } catch (error) {
      console.error("Ollama embedding generation error:", error.message);
      return [];
    }
  }

  return [];
}

async function runStructuredModeration({ book, analysisText, previewText, matches, localResult, extractionNotice }) {
  const instructions = [
    "You moderate educational ebook uploads for a production marketplace.",
    "Return JSON only and be conservative with plagiarism or spam concerns.",
    "Choose approved only when quality is strong and originality risk is low.",
  ].join(" ");
  const prompt = [
    `Title: ${book.title}`,
    `Author: ${book.authorName}`,
    `Type: ${book.type}`,
    `Creator selected category: ${book.category}`,
    `Price: ${book.price || 0}`,
    `Existing description: ${book.description || ""}`,
    `Existing tags: ${(book.tags || []).join(", ")}`,
    `PDF extraction notice: ${extractionNotice || "none"}`,
    `Local provisional quality score: ${localResult.qualityScore}`,
    `Local provisional plagiarism score: ${localResult.plagiarismScore}`,
    `Suggested category from heuristics: ${localResult.suggestedCategory}`,
    `Similarity matches: ${JSON.stringify(matches.slice(0, 3))}`,
    `PDF preview text:\n${previewText || analysisText.slice(0, 6000)}`,
  ].join("\n\n");

  try {
    let parsed = null;

    if (hasOpenAI()) {
      const client = getOpenAIClient();
      if (!client) {
        return null;
      }

      const response = await client.responses.create({
        model: getModerationModel(),
        instructions,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "ebook_moderation_report",
            strict: true,
            schema: MODERATION_SCHEMA,
          },
        },
      });

      parsed = JSON.parse(response.output_text || "{}");
    } else if (hasOllama()) {
      parsed = await runStructuredOllamaChat({
        instructions,
        prompt,
        schema: MODERATION_SCHEMA,
      });
    } else {
      return null;
    }

    return {
      qualityScore: clamp(Number(parsed.qualityScore || 0), 0, 100),
      plagiarismScore: clamp(Number(parsed.plagiarismScore || 0), 0, 100),
      aiStatus: ["approved", "pending", "rejected"].includes(parsed.aiStatus) ? parsed.aiStatus : "pending",
      moderationReason: normalizeWhitespace(parsed.moderationReason || ""),
      suggestedCategory: normalizeWhitespace(parsed.suggestedCategory || ""),
      generatedTags: normalizeTagList(parsed.generatedTags, analysisText),
      generatedDescription: normalizeWhitespace(parsed.generatedDescription || ""),
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
        ? parsed.improvementSuggestions.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 6)
        : [],
    };
  } catch (error) {
    console.error("Structured moderation error:", error.message);
    return null;
  }
}

function mergeModerationResults(localResult, modelResult) {
  if (!modelResult) {
    return localResult;
  }

  const qualityScore = clamp(
    Math.round((localResult.qualityScore * 0.35) + (modelResult.qualityScore * 0.65)),
    0,
    100
  );
  const plagiarismScore = clamp(
    Math.round((localResult.plagiarismScore * 0.45) + (modelResult.plagiarismScore * 0.55)),
    0,
    100
  );
  const aiStatus = modelResult.aiStatus || localResult.aiStatus;
  const improvementSuggestions = [
    ...(modelResult.improvementSuggestions || []),
    ...(localResult.improvementSuggestions || []),
  ].filter(Boolean).slice(0, 6);

  return {
    ...localResult,
    ...modelResult,
    qualityScore,
    plagiarismScore,
    aiStatus,
    aiScore: buildScoreFromSignals(qualityScore, plagiarismScore),
    aiSuggestion: improvementSuggestions[0] || modelResult.moderationReason || localResult.aiSuggestion,
    moderationReason: modelResult.moderationReason || localResult.moderationReason,
    suggestedCategory: modelResult.suggestedCategory || localResult.suggestedCategory,
    generatedTags: normalizeTagList(modelResult.generatedTags || localResult.generatedTags, localResult.generatedDescription),
    generatedDescription: modelResult.generatedDescription || localResult.generatedDescription,
    improvementSuggestions,
  };
}

async function findSimilarityMatches({ bookId, analysisText, textHash, embedding }) {
  const candidates = await BookAI.find({
    book: { $ne: bookId },
    processingState: "completed",
  })
    .select("+embedding textHash extractedTextPreview generatedTags suggestedCategory")
    .populate("book", "title authorName description category tags isArchived")
    .lean();

  const matches = candidates
    .map((candidate) => {
      if (!candidate?.book || candidate.book.isArchived) {
        return null;
      }

      const candidateText = normalizeWhitespace([
        candidate.book.title,
        candidate.book.authorName,
        candidate.book.description,
        candidate.suggestedCategory,
        Array.isArray(candidate.generatedTags) ? candidate.generatedTags.join(", ") : "",
        candidate.extractedTextPreview,
      ].filter(Boolean).join("\n\n"));

      const lexical = textHash && candidate.textHash && textHash === candidate.textHash
        ? 1
        : lexicalSimilarity(analysisText, candidateText);
      const semantic = embedding.length && Array.isArray(candidate.embedding) && candidate.embedding.length
        ? clamp((cosineSimilarity(embedding, candidate.embedding) + 1) / 2, 0, 1)
        : 0;
      const score = clamp((lexical * 0.7) + (semantic * 0.3), 0, 1);

      return {
        book: candidate.book._id,
        title: candidate.book.title || "Untitled",
        authorName: candidate.book.authorName || "Unknown",
        lexicalScore: Number(lexical.toFixed(3)),
        semanticScore: Number(semantic.toFixed(3)),
        score: Number(score.toFixed(3)),
      };
    })
    .filter(Boolean)
    .filter((entry) => entry.score >= 0.18)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return matches;
}

function shouldApplyDecision(book, options) {
  if (options.allowStatusChange === false) {
    return false;
  }

  return ["AI_Review", "Admin_Review"].includes(String(book.status || ""));
}

async function updateBookAiFailure(bookId, error) {
  const message = normalizeWhitespace(error?.message || "AI processing failed");
  await Promise.all([
    Book.findByIdAndUpdate(bookId, {
      aiProcessingState: "failed",
      aiStatus: "pending",
      moderationReason: message,
      aiSuggestion: "AI processing failed. Please retry or review manually.",
    }),
    BookAI.findOneAndUpdate(
      { book: bookId },
      {
        $set: {
          processingState: "failed",
          lastError: message,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ),
  ]);
}

async function processBookAI(bookId, options = {}) {
  const book = await Book.findById(bookId);
  if (!book) {
    return null;
  }

  await Promise.all([
    Book.findByIdAndUpdate(bookId, { aiProcessingState: "processing" }),
    BookAI.findOneAndUpdate(
      { book: bookId },
      {
        $set: {
          processingState: "processing",
          lastError: "",
        },
        $inc: { processingAttempts: 1 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ),
  ]);

  try {
    const filePath = resolvePublicUploadPath(book.filePath);
    const extraction = await extractPdfAnalysis(filePath);
    const sourceText = buildAnalysisSource(book, extraction.text);
    const previewText = extraction.previewText || limitText(sourceText, 7000);
    const chunkCount = splitIntoChunks(sourceText, 3200, 12).length;
    const textHash = buildHash(extraction.text || `${book.title}\n${book.description}`);
    const suggestedCategory = deriveCategory(book, sourceText);
    const generatedTags = normalizeTagList([...(book.tags || []), ...buildKeywordList(sourceText, 8)], sourceText);
    const generatedDescription = buildLocalDescription({
      title: book.title,
      category: suggestedCategory,
      tags: generatedTags,
      description: book.description,
      text: sourceText,
    });
    const embedding = await generateEmbedding(sourceText);
    const matches = await findSimilarityMatches({
      bookId: book._id,
      analysisText: sourceText,
      textHash,
      embedding,
    });
    const localResult = buildLocalModeration({
      book,
      analysisText: sourceText,
      suggestedCategory,
      generatedTags,
      matches,
      extractionNotice: extraction.notice,
    });
    const modelResult = await runStructuredModeration({
      book,
      analysisText: sourceText,
      previewText,
      matches,
      localResult,
      extractionNotice: extraction.notice,
    });
    const finalResult = mergeModerationResults(localResult, modelResult);
    const finalStatus = mapAiStatusToBookStatus(finalResult.aiStatus);
    const now = new Date();

    await BookAI.findOneAndUpdate(
      { book: book._id },
      {
        $set: {
          extractedText: extraction.text,
          extractedTextPreview: previewText,
          textHash,
          chunkCount,
          pageCount: extraction.pageCount || 0,
          fingerprintTerms: buildKeywordList(sourceText, 12),
          generatedDescription: finalResult.generatedDescription || generatedDescription,
          suggestedCategory: finalResult.suggestedCategory || suggestedCategory,
          generatedTags: finalResult.generatedTags || generatedTags,
          moderationReason: finalResult.moderationReason,
          improvementSuggestions: finalResult.improvementSuggestions || [],
          qualitySignals: finalResult.qualitySignals || localResult.qualitySignals,
          plagiarismMatches: matches,
          embedding,
          embeddingModel: embedding.length ? getEmbeddingModel() : "",
          embeddingDimensions: embedding.length ? embedding.length : 0,
          aiProvider: getConfiguredAiProvider(),
          aiModel: getModerationModel(),
          processingState: "completed",
          lastProcessedAt: now,
          lastError: extraction.error ? extraction.notice : "",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const bookUpdate = {
      aiProcessingState: "completed",
      aiStatus: finalResult.aiStatus,
      aiScore: finalResult.aiScore,
      plagiarismScore: finalResult.plagiarismScore,
      qualityScore: finalResult.qualityScore,
      aiSuggestion: finalResult.aiSuggestion,
      moderationReason: finalResult.moderationReason,
      aiCategory: finalResult.suggestedCategory || suggestedCategory,
      aiTags: finalResult.generatedTags || generatedTags,
      aiReviewedAt: now,
    };

    if (shouldApplyDecision(book, options)) {
      bookUpdate.status = finalStatus;
      if (finalStatus === "Approved" && !book.publishedAt) {
        bookUpdate.publishedAt = now;
      }
    }

    await Book.findByIdAndUpdate(book._id, bookUpdate);

    return {
      ...finalResult,
      processingState: "completed",
      status: shouldApplyDecision(book, options) ? finalStatus : book.status,
      extractedTextPreview: previewText,
      pageCount: extraction.pageCount || 0,
      chunkCount,
      plagiarismMatches: matches,
    };
  } catch (error) {
    await updateBookAiFailure(book._id, error);
    throw error;
  }
}

async function generateDescriptionWithAI(input) {
  const title = normalizeWhitespace(input.title);
  const category = normalizeWhitespace(input.category || "");
  const tags = normalizeTagList(input.tags || [], input.notes || "");
  const notes = normalizeWhitespace(input.notes || "");
  const excerpt = limitText(input.excerpt || "", 4000);
  const localDescription = buildLocalDescription({
    title,
    category,
    tags,
    description: notes,
    text: `${notes}\n\n${excerpt}`,
  });
  const fallbackResponse = {
    description: localDescription,
    suggestedCategory: category || deriveCategory({ category }, `${title}\n${notes}\n${excerpt}`),
    generatedTags: normalizeTagList(tags, `${title}\n${notes}\n${excerpt}`),
    provider: "local",
    model: "local-heuristic",
  };
  const instructions = [
    "You create concise, creator-friendly ebook descriptions for a marketplace.",
    "Keep the output factual, SEO-friendly, and relevant to the uploaded topic.",
  ].join(" ");
  const prompt = `Title: ${title}\nCategory: ${category}\nTags: ${tags.join(", ")}\nCreator notes: ${notes}\nExcerpt: ${excerpt}`;

  if (!hasOpenAI() && !hasOllama()) {
    return fallbackResponse;
  }

  try {
    let parsed = null;

    if (hasOpenAI()) {
      const client = getOpenAIClient();
      const response = await client.responses.create({
        model: getModerationModel(),
        instructions,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "ebook_description_suggestion",
            strict: true,
            schema: DESCRIPTION_SCHEMA,
          },
        },
      });

      parsed = JSON.parse(response.output_text || "{}");
    } else {
      parsed = await runStructuredOllamaChat({
        instructions,
        prompt,
        schema: DESCRIPTION_SCHEMA,
      });
    }

    return {
      description: normalizeWhitespace(parsed.description || localDescription),
      suggestedCategory: normalizeWhitespace(parsed.suggestedCategory || category || "Book"),
      generatedTags: normalizeTagList(parsed.generatedTags || tags, `${title}\n${notes}\n${excerpt}`),
      provider: getConfiguredAiProvider(),
      model: getModerationModel(),
    };
  } catch (error) {
    console.error("AI description generation error:", error.message);
    return fallbackResponse;
  }
}

async function getBookAiReport(bookId) {
  const [book, report] = await Promise.all([
    Book.findById(bookId).populate("author", "name email username role"),
    BookAI.findOne({ book: bookId }).select("+embedding").lean(),
  ]);

  if (!book) {
    return null;
  }

  return {
    book,
    report: {
      processingState: report?.processingState || book.aiProcessingState || "idle",
      moderationReason: report?.moderationReason || book.moderationReason || "",
      generatedDescription: report?.generatedDescription || "",
      suggestedCategory: report?.suggestedCategory || book.aiCategory || "",
      generatedTags: report?.generatedTags || book.aiTags || [],
      improvementSuggestions: report?.improvementSuggestions || [],
      qualitySignals: report?.qualitySignals || null,
      plagiarismMatches: report?.plagiarismMatches || [],
      extractedTextPreview: report?.extractedTextPreview || "",
      pageCount: Number(report?.pageCount || 0),
      chunkCount: Number(report?.chunkCount || 0),
      fingerprintTerms: report?.fingerprintTerms || [],
      aiProvider: report?.aiProvider || "local",
      aiModel: report?.aiModel || "local-heuristic",
      lastProcessedAt: report?.lastProcessedAt || book.aiReviewedAt || null,
      lastError: report?.lastError || "",
      embeddingReady: Boolean(Array.isArray(report?.embedding) && report.embedding.length),
    },
  };
}

module.exports = {
  buildLocalModeration,
  buildScoreFromSignals,
  generateDescriptionWithAI,
  getBookAiReport,
  mapAiStatusToBookStatus,
  processBookAI,
};
