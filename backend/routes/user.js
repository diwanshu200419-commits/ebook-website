const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/user");

/* =====================================
   GET PROFILE
   GET /api/user/profile
===================================== */
router.get("/profile", protect, async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .select("-password");

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({ user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* =====================================
   UPDATE PROFILE
   PUT /api/user/profile
===================================== */
router.put("/profile", protect, async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.bio = req.body.bio ?? user.bio;
    user.website = req.body.website ?? user.website;

    if (typeof req.body.profileImage === "string") {
      user.profileImage = req.body.profileImage;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* =====================================
   CHANGE PASSWORD
   PUT /api/user/password
===================================== */
router.put("/password", protect, async (req, res) => {
  try {

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id)
      .select("+password");

    if (!user)
      return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* =====================================
   SAVE PAYOUT
   PUT /api/user/payout
===================================== */
router.put("/payout", protect, async (req, res) => {
  try {

    const { upiId, bankAccount, ifscCode } = req.body;

    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.payout = { upiId, bankAccount, ifscCode };

    await user.save();

    res.json({
      message: "Payout info saved successfully",
      payout: user.payout
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* =====================================
   DELETE ACCOUNT (Soft Delete)
   DELETE /api/user
===================================== */
router.delete("/", protect, async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.isDeleted = true;
    user.status = "blocked";

    await user.save();

    res.json({ message: "Account deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
