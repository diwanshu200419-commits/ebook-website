const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { protect } = require("../middleware/auth");
const Cart = require("../models/Cart");
const Book = require("../models/book");
const Payment = require("../models/Payment");

function isPaidProduct(book) {
  return Boolean(book?.isPaid || Number(book?.price || 0) > 0);
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

async function buildCartItems(cart) {
  const rawItems = Array.isArray(cart?.items)
    ? cart.items.map((item) => ({
        bookId: String(item?.book || "").trim(),
        priceAtAdd: Number(item?.priceAtAdd || 0),
        addedAt: item?.addedAt || null,
      }))
    : [];

  const validBookIds = rawItems
    .map((item) => item.bookId)
    .filter((bookId) => mongoose.Types.ObjectId.isValid(bookId));

  if (!validBookIds.length) {
    return [];
  }

  const books = await Book.find({ _id: { $in: validBookIds } })
    .select("title type language price coverImage cover status category authorName bookAuthor isPaid isArchived");

  const booksById = new Map(
    books.map((book) => [String(book._id), book])
  );

  return rawItems
    .map((item) => {
      const book = booksById.get(item.bookId);
      if (!book || book.isArchived || (book.status || "") !== "Approved") {
        return null;
      }

      return {
        book,
        priceAtAdd: item.priceAtAdd || Number(book.price || 0),
        addedAt: item.addedAt,
      };
    })
    .filter(Boolean);
}

router.get("/", protect, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const items = await buildCartItems(cart);
    const total = items.reduce((sum, item) => sum + (item.priceAtAdd || 0), 0);
    res.json({ success: true, items, total });
  } catch (err) {
    console.error("Get Cart Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load cart" });
  }
});

router.post("/add", protect, async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid bookId" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    if (book.isArchived) {
      return res.status(400).json({ success: false, message: "Book is no longer available" });
    }
    if ((book.status || "") !== "Approved") {
      return res.status(400).json({ success: false, message: "Book is not available for purchase" });
    }
    if (!isPaidProduct(book) || Number(book.price || 0) <= 0) {
      return res.status(400).json({ success: false, message: "Free books do not require cart checkout" });
    }

    const existingPayment = await Payment.findOne({
      user: req.user.id,
      book: book._id,
      status: "approved"
    }).select("_id");
    if (existingPayment) {
      return res.status(400).json({ success: false, message: "You already purchased this book" });
    }

    const cart = await getOrCreateCart(req.user.id);
    const alreadyAdded = cart.items.some((item) => String(item.book) === String(book._id));
    if (!alreadyAdded) {
      cart.items.push({
        book: book._id,
        priceAtAdd: Number(book.price || 0),
        addedAt: new Date(),
      });
      await cart.save();
    }

    res.status(201).json({ success: true, message: "Book added to cart" });
  } catch (err) {
    console.error("Add Cart Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to add item to cart" });
  }
});

router.delete("/:bookId", protect, async (req, res) => {
  try {
    const { bookId } = req.params;
    const cart = await getOrCreateCart(req.user.id);
    const before = cart.items.length;
    cart.items = cart.items.filter((item) => String(item.book) !== String(bookId));
    if (cart.items.length !== before) {
      await cart.save();
    }
    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    console.error("Remove Cart Item Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to remove cart item" });
  }
});

router.delete("/", protect, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    console.error("Clear Cart Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
});

module.exports = router;
