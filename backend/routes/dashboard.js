const express = require("express");
const Book = require("../models/book");
const { protect } = require("../middleware/auth");
const {
  serializeBook,
  buildLastMonthsSeries,
  buildCountrySales,
} = require("../services/bookData");

const router = express.Router();

function buildDownloadHeatmap(books) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = labels.reduce((accumulator, label) => {
    accumulator[label] = 0;
    return accumulator;
  }, {});

  books.forEach((book) => {
    const date = new Date(book.createdAt || Date.now());
    const label = labels[(date.getDay() + 6) % 7];
    counts[label] += Number(book.downloads || 0);
  });

  return counts;
}

router.get("/user", protect, async (req, res) => {
  try {
    const userBooks = await Book.find({ author: req.user.id })
      .sort({ createdAt: -1 })
      .populate("author", "name username");

    const approvedBooks = await Book.find({ status: "Approved" })
      .sort({ downloads: -1, salesCount: -1, createdAt: -1 })
      .limit(20)
      .populate("author", "name username");

    const books = userBooks.map(serializeBook);
    const publicBooks = approvedBooks.map(serializeBook);

    const totalBooks = books.length;
    const totalDownloads = books.reduce(
      (sum, book) => sum + Number(book.downloads || 0),
      0
    );
    const totalEarnings = books.reduce(
      (sum, book) => sum + Number(book.earnings || 0),
      0
    );
    const chart = buildLastMonthsSeries(books, (book) => book.earnings || 0);
    const monthlyEarnings = chart.values.at(-1) || 0;
    const previousMonth = chart.values.at(-2) || 0;
    const growthPercent =
      previousMonth > 0
        ? Math.round(((monthlyEarnings - previousMonth) / previousMonth) * 100)
        : monthlyEarnings > 0
          ? 100
          : 0;

    const topBooks = [...books]
      .sort((left, right) => {
        return (
          Number(right.downloads || 0) - Number(left.downloads || 0) ||
          Number(right.earnings || 0) - Number(left.earnings || 0)
        );
      })
      .slice(0, 5)
      .map((book) => ({
        id: book._id,
        title: book.title,
        downloads: book.downloads,
        earnings: book.earnings,
        salesCount: book.salesCount,
        status: book.status,
      }));

    const recentSales = [...books]
      .filter((book) => book.salesCount > 0 || book.downloads > 0)
      .slice(0, 5)
      .map((book) => ({
        book: book.title,
        amount: book.earnings || book.price,
        date: book.updatedAt || book.createdAt,
      }));

    const authorSummary = {};

    publicBooks.forEach((book) => {
      const key = String(book.authorId || "unknown");
      if (!authorSummary[key]) {
        authorSummary[key] = {
          id: book.authorId,
          name: book.authorName,
          username: book.authorUsername,
          earnings: 0,
          books: 0,
          downloads: 0,
        };
      }

      authorSummary[key].earnings += Number(book.earnings || 0);
      authorSummary[key].books += 1;
      authorSummary[key].downloads += Number(book.downloads || 0);
    });

    const sortedAuthors = Object.values(authorSummary).sort((left, right) => {
      return (
        right.earnings - left.earnings ||
        right.downloads - left.downloads ||
        right.books - left.books
      );
    });

    const leaderboard = sortedAuthors.slice(0, 5);
    const rankIndex = sortedAuthors.findIndex(
      (author) => String(author.id) === String(req.user.id)
    );

    const recommendedBooks = publicBooks
      .filter((book) => String(book.authorId) !== String(req.user.id))
      .slice(0, 4)
      .map((book) => ({
        id: book._id,
        title: book.title,
        category: book.category,
        coverImage: book.coverImage,
        price: book.price,
      }));

    return res.status(200).json({
      success: true,
      totalEarnings,
      monthlyEarnings,
      growthPercent,
      totalDownloads,
      totalBooks,
      walletBalance: totalEarnings,
      globalRank: rankIndex >= 0 ? rankIndex + 1 : null,
      chart,
      topBooks,
      recentSales,
      countrySales: buildCountrySales(books),
      downloadHeatmap: buildDownloadHeatmap(books),
      leaderboard,
      trendingAuthors: leaderboard.slice(0, 3).map((author) => ({
        name: author.name,
        books: author.books,
      })),
      recommendedBooks,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
