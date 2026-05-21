const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/user");

const INTERFACE_LANGUAGES = new Set(["English", "Hindi"]);
const MARKETPLACE_LANGUAGES = new Set(["All", "English", "Hindi"]);

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

/* =====================
   GET USER PROFILE
   GET /api/profile/me
===================== */

router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
      .select("-password")
      .populate("referredBy", "name username referralCode");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Profile Fetch Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    // 🔥 Always fetch fresh user from DB
    const user = await User.findById(req.user._id || req.user.id)
      .select("-password")
      .populate("referredBy", "name username referralCode");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.status(200).json({
      status: "success",
      user
    });

  } catch (error) {
    console.error("Profile Fetch Error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
});

router.get("/preferences", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
      .select("preferences notifications");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      preferences: {
        interfaceLanguage: user.preferences?.interfaceLanguage || "English",
        marketplaceLanguage: user.preferences?.marketplaceLanguage || "All",
      },
      notifications: {
        email: user.notifications?.email !== false,
        sales: user.notifications?.sales !== false,
        follows: user.notifications?.follows !== false,
        releases: user.notifications?.releases !== false,
      },
    });
  } catch (error) {
    console.error("Profile Preferences Fetch Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/preferences", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
      .select("preferences notifications");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const nextInterfaceLanguage = String(
      req.body?.interfaceLanguage || user.preferences?.interfaceLanguage || "English"
    ).trim();
    const nextMarketplaceLanguage = String(
      req.body?.marketplaceLanguage || user.preferences?.marketplaceLanguage || "All"
    ).trim();

    if (!INTERFACE_LANGUAGES.has(nextInterfaceLanguage)) {
      return res.status(400).json({ success: false, message: "Invalid interface language" });
    }

    if (!MARKETPLACE_LANGUAGES.has(nextMarketplaceLanguage)) {
      return res.status(400).json({ success: false, message: "Invalid marketplace language" });
    }

    user.preferences = {
      interfaceLanguage: nextInterfaceLanguage,
      marketplaceLanguage: nextMarketplaceLanguage,
    };
    user.notifications = {
      email: normalizeBoolean(req.body?.notifications?.email, user.notifications?.email !== false),
      sales: normalizeBoolean(req.body?.notifications?.sales, user.notifications?.sales !== false),
      follows: normalizeBoolean(req.body?.notifications?.follows, user.notifications?.follows !== false),
      releases: normalizeBoolean(req.body?.notifications?.releases, user.notifications?.releases !== false),
    };

    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: "Preferences updated",
      preferences: user.preferences,
      notifications: user.notifications,
    });
  } catch (error) {
    console.error("Profile Preferences Update Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
