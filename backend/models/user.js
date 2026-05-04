// models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

  profileImage: {
    type: String,
    default: ""
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

  /* =====================
     WALLET SYSTEM
  ===================== */

  wallet: {
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    withdrawnTotal: { type: Number, default: 0 }
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
    sales: { type: Boolean, default: true }
  },

  /* =====================
     CREATOR METRICS
  ===================== */

  metrics: {
    totalBooks: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    rankScore: { type: Number, default: 0 }
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