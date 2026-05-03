const express = require("express");
const Book = require("../models/book");
const { protect } = require("../middleware/auth");
const {
  serializeBook,
  buildLastMonthsSeries,
  buildCountrySales,
} = require("../services/bookData");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ success: true, message: "Analytics working" });
});

router.get("/creator", protect, async (req, res) => {
  try {
    const books = await Book.find({ author: req.user.id })
      .sort({ createdAt: 1 })
      .populate("author", "name username");

    const normalizedBooks = books.map(serializeBook);

    const totalBooks = normalizedBooks.length;
    const totalSales = normalizedBooks.reduce(
      (sum, book) => sum + Number(book.salesCount || 0),
      0
    );
    const totalRevenue = normalizedBooks.reduce(
      (sum, book) => sum + Number(book.earnings || 0),
      0
    );
    const totalViews = normalizedBooks.reduce(
      (sum, book) => sum + Number(book.downloads || 0),
      0
    );

    const revenueSeries = buildLastMonthsSeries(
      normalizedBooks,
      (book) => book.earnings || 0
    );
    const salesSeries = buildLastMonthsSeries(
      normalizedBooks,
      (book) => book.salesCount || 0
    );

    const topBooks = [...normalizedBooks]
      .sort((left, right) => {
        return (
          Number(right.earnings || 0) - Number(left.earnings || 0) ||
          Number(right.salesCount || 0) - Number(left.salesCount || 0)
        );
      })
      .slice(0, 5)
      .map((book) => ({
        title: book.title,
        sales: book.salesCount,
        revenue: book.earnings,
      }));

    const latestRevenue = revenueSeries.values.at(-1) || 0;
    const forecastRevenue = [
      Math.round(latestRevenue * 1.08),
      Math.round(latestRevenue * 1.14),
      Math.round(latestRevenue * 1.2),
    ];

    const creatorScore = Math.min(
      100,
      Math.round(totalSales * 4 + totalBooks * 6 + totalRevenue / 200)
    );

    return res.status(200).json({
      success: true,
      totalBooks,
      totalSales,
      totalRevenue,
      totalViews,
      monthlyRevenue: revenueSeries.values,
      monthlySales: salesSeries.values,
      forecastRevenue,
      countrySales: buildCountrySales(normalizedBooks),
      topBooks,
      creatorScore,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Analytics error",
    });
  }
});

module.exports = router;
