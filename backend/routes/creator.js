const express = require("express");
const User = require("../models/user");
const Book = require("../models/book");
const { protect } = require("../middleware/auth");
const { serializeBook } = require("../services/bookData");

const router = express.Router();

router.get("/trending/list", async (req, res) => {
  try {
    const creators = await User.find({
      role: { $in: ["creator", "author"] },
      isDeleted: { $ne: true },
    }).select("name username bio profileImage verified followers");

    const books = await Book.find({ status: "Approved" }).select(
      "author downloads earnings"
    );

    const creatorSummaries = creators.map((creator) => {
      const creatorBooks = books.filter(
        (book) => String(book.author) === String(creator._id)
      );

      return {
        id: creator._id,
        name: creator.name,
        username: creator.username,
        bio: creator.bio || "",
        avatar: creator.profileImage || "/assets/default-avatar.png",
        verified: creator.verified,
        followers: creator.followers?.length || 0,
        booksCount: creatorBooks.length,
        earnings: creatorBooks.reduce(
          (sum, book) => sum + Number(book.earnings || 0),
          0
        ),
        downloads: creatorBooks.reduce(
          (sum, book) => sum + Number(book.downloads || 0),
          0
        ),
      };
    });

    creatorSummaries.sort((left, right) => {
      return (
        right.earnings - left.earnings ||
        right.downloads - left.downloads ||
        right.booksCount - left.booksCount
      );
    });

    return res.json({
      success: true,
      creators: creatorSummaries.slice(0, 6),
    });
  } catch (error) {
    console.error("Trending creators error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load trending creators",
    });
  }
});

router.post("/:username/follow", protect, async (req, res) => {
  try {
    const creator = await User.findOne({
      username: req.params.username,
      isDeleted: { $ne: true },
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    if (String(creator._id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow your own profile",
      });
    }

    const followers = creator.followers || [];
    const alreadyFollowing = followers.some(
      (followerId) => String(followerId) === String(req.user.id)
    );

    creator.followers = alreadyFollowing
      ? followers.filter((followerId) => String(followerId) !== String(req.user.id))
      : [...followers, req.user.id];

    await creator.save();

    return res.json({
      success: true,
      following: !alreadyFollowing,
      followers: creator.followers.length,
    });
  } catch (error) {
    console.error("Follow creator error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update follow state",
    });
  }
});

router.get("/:username/follow-state", protect, async (req, res) => {
  try {
    const creator = await User.findOne({
      username: req.params.username,
      isDeleted: { $ne: true },
    }).select("followers");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const following = (creator.followers || []).some(
      (followerId) => String(followerId) === String(req.user.id)
    );

    return res.json({
      success: true,
      following,
      followers: creator.followers.length,
    });
  } catch (error) {
    console.error("Follow state error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load follow state",
    });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const creator = await User.findOne({
      username: req.params.username,
      isDeleted: { $ne: true },
    }).select(
      "name username bio profileImage website verified followers role"
    );

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const books = await Book.find({
      author: creator._id,
      status: "Approved",
    })
      .sort({ createdAt: -1 })
      .populate("author", "name username");

    const normalizedBooks = books.map(serializeBook);

    const stats = {
      books: normalizedBooks.length,
      sales: normalizedBooks.reduce(
        (sum, book) => sum + Number(book.salesCount || 0),
        0
      ),
      views: normalizedBooks.reduce(
        (sum, book) => sum + Number(book.downloads || 0),
        0
      ),
      earnings: normalizedBooks.reduce(
        (sum, book) => sum + Number(book.earnings || 0),
        0
      ),
    };

    return res.json({
      success: true,
      creator: {
        id: creator._id,
        name: creator.name,
        username: creator.username,
        bio: creator.bio || "Digital creator on E-Book Market",
        avatar: creator.profileImage || "/assets/default-avatar.png",
        website: creator.website || "",
        verified: Boolean(creator.verified),
        followers: creator.followers?.length || 0,
        stats,
      },
      books: normalizedBooks,
    });
  } catch (error) {
    console.error("Creator profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
