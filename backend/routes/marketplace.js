const express = require("express");
const Book = require("../models/book");
const { serializeBook } = require("../services/bookData");

const router = express.Router();

router.get("/trending", async (req, res) => {
  try {
    const books = await Book.find({ status: "Approved" })
      .sort({ isFeatured: -1, salesCount: -1, downloads: -1, createdAt: -1 })
      .limit(12)
      .populate("author", "name username");

    return res.status(200).json({
      success: true,
      count: books.length,
      books: books.map(serializeBook),
    });
  } catch (error) {
    console.error("Marketplace trending error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load trending books",
    });
  }
});

module.exports = router;
