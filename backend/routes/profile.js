const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/user");

/* =====================
   GET USER PROFILE
   GET /api/profile/me
===================== */

router.get("/me", protect, async (req, res) => {
  try {
    // 🔥 Always fetch fresh user from DB
    const user = await User.findById(req.user._id || req.user.id).select("-password");

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

module.exports = router;