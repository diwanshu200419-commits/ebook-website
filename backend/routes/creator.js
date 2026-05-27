const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const { protect } = require("../middleware/auth");
const User = require("../models/user");
const Book = require("../models/book");
const {
  ensureUploadDir,
  buildPublicUploadPath,
  safeDeletePublicFile,
} = require("../utils/uploads");
const {
  buildCreatorCollections,
  buildCreatorIdentity,
  buildFollowPreview,
  buildPublicCreatorProfile,
  buildTrendingCreators,
  followCreator,
  isCreatorRole,
  normalizeTextList,
  normalizeUrlValue,
  refreshCreatorStats,
} = require("../services/creatorData");
const { applyReferralCreatorActivation } = require("../services/referrals");

const router = express.Router();

const backendBaseUrl = (
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).replace(/\/$/, "");

const creatorUploadPath = ensureUploadDir("creators");

function safeFilename(originalname, prefix = "asset") {
  const extension = path.extname(String(originalname || "")).toLowerCase();
  const baseName = path
    .basename(String(originalname || ""), extension)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);

  return `${prefix}-${Date.now()}-${baseName || "file"}${extension}`;
}

function isImageFile(file) {
  const extension = path.extname(String(file?.originalname || "")).toLowerCase();
  return Boolean(file?.mimetype?.startsWith("image/")) ||
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension);
}

const assetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, creatorUploadPath),
    filename: (req, file, cb) => {
      const prefix = file.fieldname === "bannerImage" ? "banner" : "avatar";
      cb(null, safeFilename(file.originalname, prefix));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isImageFile(file)) {
      return cb(new Error("Only image files are allowed for creator profile assets"));
    }

    return cb(null, true);
  },
});

function runAssetUpload(req, res) {
  return new Promise((resolve, reject) => {
    assetUpload.fields([
      { name: "profileImage", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
    ])(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function cleanupUploadedAssets(req) {
  const files = Object.values(req.files || {}).flat();
  files.forEach((file) => {
    if (!file?.filename) {
      return;
    }

    safeDeletePublicFile(buildPublicUploadPath("creators", file.filename));
  });
}

async function getOptionalViewer(req) {
  const authHeader = req.headers.authorization || "";
  let token = "";

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (typeof req.query?.token === "string") {
    token = req.query.token.trim();
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.isDeleted || user.status === "blocked") {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

function applyTextUpdate(target, source, key, maxLength) {
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return;
  }

  const value = String(source[key] || "").trim().slice(0, maxLength);
  target[key] = value;
}

router.get("/me/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
      .select("-password")
      .populate("referredBy", "name username referralCode")
      .populate("followers", "name username role verified bio profileImage")
      .populate("following", "name username role verified bio profileImage");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [stats, approvedBooks] = await Promise.all([
      refreshCreatorStats(user),
      Book.find({
        author: user._id,
        status: "Approved",
        isArchived: { $ne: true },
      })
        .populate("author", "name username")
        .sort({ publishedAt: -1, createdAt: -1 }),
    ]);
    const collections = buildCreatorCollections(approvedBooks, backendBaseUrl, {
      canPreview: true,
      canDownload: true,
      isOwner: true,
      isAdmin: req.user.role === "admin",
      isPurchased: false,
    });
    const featuredShowcase = (
      collections.trending.length
        ? collections.trending
        : collections.all
    ).slice(0, 8);

    return res.json({
      success: true,
      creator: {
        ...buildCreatorIdentity(user, backendBaseUrl, stats),
        stats,
        isCreator: isCreatorRole(user.role),
      },
      community: {
        followers: (Array.isArray(user.followers) ? user.followers : [])
          .slice(0, 12)
          .map((member) => buildFollowPreview(member, backendBaseUrl)),
        following: (Array.isArray(user.following) ? user.following : [])
          .slice(0, 12)
          .map((member) => buildFollowPreview(member, backendBaseUrl)),
      },
      showcase: {
        featured: featuredShowcase,
        allCount: collections.all.length,
        freeCount: collections.free.length,
        paidCount: collections.paid.length,
      },
      verification: user.creatorVerification || { status: user.verified ? "approved" : "unverified" },
      growth: {
        referralCode: user.referralCode || "",
        referredBy: user.referredBy
          ? {
              id: user.referredBy._id,
              name: user.referredBy.name || "Member",
              username: user.referredBy.username || "",
              referralCode: user.referredBy.referralCode || "",
            }
          : null,
        referralStats: user.referralStats || {},
      },
      payout: user.payout || {},
      notifications: user.notifications || {},
    });
  } catch (error) {
    console.error("Creator me profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load creator profile",
    });
  }
});

router.put("/me/profile", protect, async (req, res) => {
  try {
    await runAssetUpload(req, res);

    const user = await User.findById(req.user._id || req.user.id).select("-password");
    if (!user) {
      cleanupUploadedAssets(req);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    applyTextUpdate(user, req.body, "name", 80);
    applyTextUpdate(user, req.body, "bio", 220);
    applyTextUpdate(user, req.body, "about", 900);

    if (Object.prototype.hasOwnProperty.call(req.body, "website")) {
      user.website = normalizeUrlValue(req.body.website);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "twitter")) {
      user.socialLinks.twitter = normalizeUrlValue(req.body.twitter);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "instagram")) {
      user.socialLinks.instagram = normalizeUrlValue(req.body.instagram);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "linkedin")) {
      user.socialLinks.linkedin = normalizeUrlValue(req.body.linkedin);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "youtube")) {
      user.socialLinks.youtube = normalizeUrlValue(req.body.youtube);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "specialties")) {
      user.specialties = normalizeTextList(req.body.specialties, 8);
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "creatorCategories") ||
      Object.prototype.hasOwnProperty.call(req.body, "categories")
    ) {
      user.creatorCategories = normalizeTextList(
        req.body.creatorCategories || req.body.categories,
        8
      );
    }

    const profileImageFile = req.files?.profileImage?.[0];
    const bannerImageFile = req.files?.bannerImage?.[0];

    if (profileImageFile) {
      const nextProfileImage = buildPublicUploadPath("creators", profileImageFile.filename);
      if (user.profileImage && user.profileImage.startsWith("/uploads/creators/")) {
        safeDeletePublicFile(user.profileImage);
      }
      user.profileImage = nextProfileImage;
    }

    if (bannerImageFile) {
      const nextBannerImage = buildPublicUploadPath("creators", bannerImageFile.filename);
      if (user.bannerImage && user.bannerImage.startsWith("/uploads/creators/")) {
        safeDeletePublicFile(user.bannerImage);
      }
      user.bannerImage = nextBannerImage;
    }

    await user.save();
    const stats = await refreshCreatorStats(user);

    return res.json({
      success: true,
      message: "Creator profile updated successfully",
      creator: {
        ...buildCreatorIdentity(user, backendBaseUrl, stats),
        stats,
        isCreator: isCreatorRole(user.role),
      },
    });
  } catch (error) {
    cleanupUploadedAssets(req);

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Creator images can be up to 5MB."
          : error.message,
      });
    }

    console.error("Creator profile update error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update creator profile",
    });
  }
});

router.post("/activate", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const wasCreator = isCreatorRole(user.role);

    if (!wasCreator) {
      user.role = "creator";
      await user.save({ validateBeforeSave: false });
      await applyReferralCreatorActivation(user);
    }

    return res.json({
      success: true,
      message: "Creator mode is now active",
      role: user.role,
    });
  } catch (error) {
    console.error("Creator activate error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to activate creator mode",
    });
  }
});

router.post("/me/verification", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!isCreatorRole(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Activate creator mode before requesting verification",
      });
    }

    if (user.verified && user.creatorVerification?.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Creator verification is already approved",
      });
    }

    const note = String(req.body?.note || "").trim().slice(0, 600);
    const portfolioUrl = normalizeUrlValue(req.body?.portfolioUrl);
    const proofUrl = normalizeUrlValue(req.body?.proofUrl);

    if (!note && !portfolioUrl && !proofUrl) {
      return res.status(400).json({
        success: false,
        message: "Add a note, portfolio link, or proof link before submitting verification",
      });
    }

    user.creatorVerification = {
      ...(user.creatorVerification || {}),
      status: "pending",
      note,
      portfolioUrl,
      proofUrl,
      submittedAt: new Date(),
      reviewedAt: null,
      adminNote: "",
    };

    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: "Verification request submitted for admin review",
      verification: user.creatorVerification,
    });
  } catch (error) {
    console.error("Creator verification request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to submit verification request",
    });
  }
});

router.get("/trending", async (req, res) => {
  try {
    const creators = await buildTrendingCreators(
      backendBaseUrl,
      req.query.limit
    );

    return res.json({
      success: true,
      creators,
    });
  } catch (error) {
    console.error("Trending creators error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load trending creators",
    });
  }
});

router.post("/:username/follow", protect, async (req, res) => {
  try {
    const creator = await User.findOne({
      username: String(req.params.username || "").trim().toLowerCase(),
      isDeleted: { $ne: true },
    }).select("_id username");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const result = await followCreator({
      viewerId: String(req.user._id || req.user.id),
      creatorId: String(creator._id),
    });

    return res.json({
      success: true,
      following: result.following,
      followersCount: result.followersCount,
      followingCount: result.followingCount,
    });
  } catch (error) {
    console.error("Follow creator error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to update follow state",
    });
  }
});

router.get("/:username/follow-state", protect, async (req, res) => {
  try {
    const creator = await User.findOne({
      username: String(req.params.username || "").trim().toLowerCase(),
      isDeleted: { $ne: true },
    }).select("_id username");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const viewer = await User.findById(req.user._id || req.user.id).select("following");
    const following = Array.isArray(viewer?.following)
      ? viewer.following.some((id) => String(id) === String(creator._id))
      : false;

    return res.json({
      success: true,
      following,
    });
  } catch (error) {
    console.error("Follow state error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load follow state",
    });
  }
});

router.get("/:username/followers", async (req, res) => {
  try {
    const creator = await User.findOne({
      username: String(req.params.username || "").trim().toLowerCase(),
      isDeleted: { $ne: true },
    }).populate("followers", "name username role verified bio profileImage");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    return res.json({
      success: true,
      followers: (Array.isArray(creator.followers) ? creator.followers : []).map((user) =>
        buildFollowPreview(user, backendBaseUrl)
      ),
      count: Array.isArray(creator.followers) ? creator.followers.length : 0,
    });
  } catch (error) {
    console.error("Followers list error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load followers",
    });
  }
});

router.get("/:username/following", async (req, res) => {
  try {
    const creator = await User.findOne({
      username: String(req.params.username || "").trim().toLowerCase(),
      isDeleted: { $ne: true },
    }).populate("following", "name username role verified bio profileImage");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    return res.json({
      success: true,
      following: (Array.isArray(creator.following) ? creator.following : []).map((user) =>
        buildFollowPreview(user, backendBaseUrl)
      ),
      count: Array.isArray(creator.following) ? creator.following.length : 0,
    });
  } catch (error) {
    console.error("Following list error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load following",
    });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const viewer = await getOptionalViewer(req);
    const payload = await buildPublicCreatorProfile({
      username: req.params.username,
      viewerId: String(viewer?._id || ""),
      backendBaseUrl,
    });

    if (!payload) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    return res.json({
      success: true,
      ...payload,
    });
  } catch (error) {
    console.error("Creator public profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load creator profile",
    });
  }
});

module.exports = router;
