const express = require("express");
const router = express.Router();

const Book = require("../models/book");
const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

/*
=================================
🔥 TRENDING BOOKS API (PRO VERSION)
GET /api/marketplace/trending
=================================
*/

router.get("/trending", async (req, res) => {
  try {
    // optional limit (future scalability)
    const limit = parseInt(req.query.limit) || 12;

    // fetch approved books only
    const books = await Book.find({
      status: "Approved"
    })
      .sort({
        sales: -1,
        views: -1,
        rating: -1,
        createdAt: -1
      })
      .limit(limit)
      .select("title price coverImage authorName downloads salesCount aiScore createdAt");

    // format response (🔥 important for frontend)
    const formattedBooks = books.map((book) => ({
      id: book._id,
      title: book.title,
      price: book.price,
      cover: book.coverImage
        ? (backendBaseUrl ? `${backendBaseUrl}${book.coverImage}` : book.coverImage)
        : null,
      creator: book.authorName,
      views: book.downloads || 0,
      sales: book.salesCount || 0,
      rating: book.aiScore || 0,
      createdAt: book.createdAt
    }));

    res.status(200).json({
      status: "success",
      count: formattedBooks.length,
      books: formattedBooks
    });

  } catch (err) {
    console.error("🔥 Marketplace trending error:", err.message);

    res.status(500).json({
      status: "error",
      message: "Failed to load trending books"
    });
  }
});

module.exports = router;