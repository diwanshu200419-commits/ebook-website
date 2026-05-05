const express = require("express");
const router = express.Router();

const Book = require("../models/book");

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
      approved: true
    })
      .sort({
        sales: -1,
        views: -1,
        rating: -1,
        createdAt: -1
      })
      .limit(limit)
      .select("title price cover creator views sales rating createdAt");

    // format response (🔥 important for frontend)
    const formattedBooks = books.map((book) => ({
      id: book._id,
      title: book.title,
      price: book.price,
      cover: book.cover
        ? `${process.env.BASE_URL || ""}/uploads/${book.cover}`
        : null,
      creator: book.creator,
      views: book.views || 0,
      sales: book.sales || 0,
      rating: book.rating || 0,
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