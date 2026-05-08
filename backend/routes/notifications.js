const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Notification = require("../models/Notification");

/* =====================================
   📬 GET USER'S NOTIFICATIONS
===================================== */
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, notifications });
  } catch (err) {
    console.error("Get Notifications Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   📬 MARK AS READ
===================================== */
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (String(notification.user) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, message: "Marked as read", notification });
  } catch (err) {
    console.error("Mark Read Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   🗑️ DELETE NOTIFICATION
===================================== */
router.delete("/:id", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (String(notification.user) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Delete Notification Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =====================================
   📬 MARK ALL AS READ
===================================== */
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark All Read Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
