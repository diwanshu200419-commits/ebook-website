const mongoose = require("mongoose");

const PlagiarismMatchSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
    },
    title: {
      type: String,
      default: "",
    },
    authorName: {
      type: String,
      default: "",
    },
    similarityScore: {
      type: Number,
      default: 0,
    },
    lexicalScore: {
      type: Number,
      default: 0,
    },
    semanticScore: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const BookAISchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      unique: true,
      index: true,
    },
    extractedText: {
      type: String,
      default: "",
      select: false,
    },
    extractedTextPreview: {
      type: String,
      default: "",
    },
    textHash: {
      type: String,
      default: "",
      index: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    fingerprintTerms: {
      type: [String],
      default: [],
    },
    generatedDescription: {
      type: String,
      default: "",
    },
    suggestedCategory: {
      type: String,
      default: "",
    },
    generatedTags: {
      type: [String],
      default: [],
    },
    moderationReason: {
      type: String,
      default: "",
    },
    improvementSuggestions: {
      type: [String],
      default: [],
    },
    qualitySignals: {
      readabilityScore: { type: Number, default: 0 },
      grammarScore: { type: Number, default: 0 },
      spamScore: { type: Number, default: 0 },
      repetitionScore: { type: Number, default: 0 },
      structureScore: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      sentenceCount: { type: Number, default: 0 },
      avgSentenceLength: { type: Number, default: 0 },
    },
    plagiarismMatches: {
      type: [PlagiarismMatchSchema],
      default: [],
    },
    embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },
    embeddingModel: {
      type: String,
      default: "",
    },
    embeddingDimensions: {
      type: Number,
      default: 0,
    },
    aiProvider: {
      type: String,
      default: "local",
    },
    aiModel: {
      type: String,
      default: "",
    },
    processingState: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.BookAI || mongoose.model("BookAI", BookAISchema);
