const express = require("express");
const router = express.Router();

const Book = require("../models/book");
const { serializeBook } = require("../services/bookData");

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

router.get("/trending", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 24);

    const books = await Book.find({
      status: "Approved",
      isArchived: { $ne: true },
    })
      .sort({
        salesCount: -1,
        views: -1,
        downloads: -1,
        aiScore: -1,
        createdAt: -1,
      })
      .limit(limit)
      .populate("author", "name username");

    const payload = books.map((book) =>
      serializeBook(book, {
        backendBaseUrl,
        includeFilePath: false,
        previewUrl: !book.isPaid ? `/api/books/${book._id}/preview` : "",
      })
    );

    res.status(200).json({
      success: true,
      count: payload.length,
      books: payload,
    });
  } catch (error) {
    console.error("Marketplace trending error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load trending books",
    });
  }
});

module.exports = router;
