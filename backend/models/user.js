// models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function buildReferralCodeBase(user) {
  const seed = String(user?.username || user?.name || "creator")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return (seed || "CREATOR").slice(0, 8);
}

const UserSchema = new mongoose.Schema(
{
  /* =====================
     BASIC INFO
  ===================== */

  name: {
    type: String,
    trim: true,
    default: "User"
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  /* =====================
     USERNAME (PUBLIC PROFILE)
  ===================== */

  username: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true
  },

  bio: {
    type: String,
    default: ""
  },

  about: {
    type: String,
    default: ""
  },

  profileImage: {
    type: String,
    default: ""
  },

  bannerImage: {
    type: String,
    default: ""
  },

  website: {
    type: String,
    default: ""
  },

  socialLinks: {
    twitter: { type: String, default: "" },
    instagram: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    youtube: { type: String, default: "" }
  },

  creatorCategories: {
    type: [String],
    default: []
  },

  specialties: {
    type: [String],
    default: []
  },

  /* =====================
     AUTH SYSTEM
  ===================== */

  password: {
    type: String,
    required: function () {
      return this.provider === "local";
    },
    select: false
  },

  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local"
  },

  googleId: {
    type: String,
    sparse: true
  },

  /* =====================
     ROLE & STATUS
  ===================== */

  role: {
    type: String,
    enum: ["reader", "creator", "author", "admin"],
    default: "reader"
  },

  status: {
    type: String,
    enum: ["active", "blocked", "pending"],
    default: "active"
  },

  verified: {
    type: Boolean,
    default: false
  },

  referralCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    sparse: true
  },

  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  referralStats: {
    signupsCount: { type: Number, default: 0 },
    creatorsCount: { type: Number, default: 0 },
    rewardedPurchasesCount: { type: Number, default: 0 },
    totalRewardAmount: { type: Number, default: 0 },
    lastRewardAt: { type: Date, default: null },
    lastSignupAt: { type: Date, default: null }
  },

  creatorVerification: {
    status: {
      type: String,
      enum: ["unverified", "pending", "approved", "rejected"],
      default: "unverified"
    },
    note: {
      type: String,
      default: ""
    },
    portfolioUrl: {
      type: String,
      default: ""
    },
    proofUrl: {
      type: String,
      default: ""
    },
    submittedAt: {
      type: Date,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    adminNote: {
      type: String,
      default: ""
    }
  },

  /* =====================
     WALLET SYSTEM
  ===================== */

  wallet: {
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    withdrawnTotal: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 }
  },

  /* =====================
     PAYOUT INFO
  ===================== */

  payout: {
    upiId: String,
    bankAccount: String,
    ifscCode: String
  },

  /* =====================
     NOTIFICATIONS
  ===================== */

  notifications: {
    email: { type: Boolean, default: true },
    sales: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    releases: { type: Boolean, default: true }
  },

  preferences: {
    interfaceLanguage: {
      type: String,
      enum: ["English", "Hindi"],
      default: "English"
    },
    marketplaceLanguage: {
      type: String,
      enum: ["All", "English", "Hindi"],
      default: "All"
    }
  },

  engagement: {
    streakCount: { type: Number, default: 0 },
    bestStreakCount: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
    lifetimeRewardPoints: { type: Number, default: 0 },
    lastRewardMilestone: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: null },
    lastStreakNotificationAt: { type: Date, default: null },
    lastReaderNudgeAt: { type: Date, default: null },
    lastCreatorNudgeAt: { type: Date, default: null },
    lastDigestEmailAt: { type: Date, default: null },
    lastComebackEmailAt: { type: Date, default: null },
    lastCartRecoveryAt: { type: Date, default: null },
    lastUpsellEmailAt: { type: Date, default: null },
    lastCreatorLaunchEmailAt: { type: Date, default: null },
    lastReferralPromptAt: { type: Date, default: null }
  },

  /* =====================
     CREATOR METRICS
  ===================== */

  metrics: {
    totalBooks: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    rankScore: { type: Number, default: 0 }
  },

  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  creatorStats: {
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    totalBooks: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: null }
  },

  /* =====================
     SYSTEM TRACKING
  ===================== */

  lastLogin: {
    type: Date
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

},
{
  timestamps: true
}
);

/* =========================
   AUTO USERNAME GENERATION
========================= */

UserSchema.pre("save", async function (next) {

  if (this.username) return next();

  if (!this.name) return next();

  try {

    let base = this.name.toLowerCase().replace(/\s+/g,"");

    let username = base;
    let count = 1;

    const User = mongoose.model("User");

    while (await User.findOne({ username })) {

      username = base + count;
      count++;

    }

    this.username = username;

    next();

  } catch (err) {
    next(err);
  }

});

/* =========================
   AUTO REFERRAL CODE
========================= */

UserSchema.pre("save", async function (next) {
  if (this.referralCode) return next();

  try {
    const User = mongoose.model("User");
    const base = buildReferralCodeBase(this);
    let attempt = 0;
    let referralCode = "";

    do {
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      referralCode = `${base}${suffix}`.slice(0, 12);
      const existing = await User.findOne({ referralCode });
      if (!existing || String(existing._id) === String(this._id)) {
        this.referralCode = referralCode;
        return next();
      }
      attempt += 1;
    } while (attempt < 20);

    return next(new Error("Unable to generate a unique referral code."));
  } catch (err) {
    return next(err);
  }
});

/* =========================
   HASH PASSWORD (LOCAL ONLY)
========================= */

UserSchema.pre("save", async function (next) {

  if (this.provider !== "local") return next();
  if (!this.isModified("password")) return next();

  try {

    this.password = await bcrypt.hash(this.password, 10);
    next();

  } catch (err) {

    next(err);

  }

});

/* =========================
   PASSWORD COMPARE
========================= */

UserSchema.methods.matchPassword = async function (enteredPassword) {

  if (!this.password) return false;

  return await bcrypt.compare(enteredPassword, this.password);

};

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);
