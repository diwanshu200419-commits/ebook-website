// routes/auth.js

const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const getFrontendBaseUrl = () => {
  const raw = process.env.CLIENT_URL || process.env.FRONTEND_URL || "";
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) {
    return process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";
  }
  if (process.env.NODE_ENV === "production" && !/^https:\/\//i.test(trimmed)) {
    return "";
  }
  return trimmed;
};

const getSafeFrontendFromState = (state) => {
  if (!state) return getFrontendBaseUrl();
  try {
    const decoded = decodeURIComponent(state);
    const normalized = decoded.trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(normalized)) return getFrontendBaseUrl();
    if (process.env.NODE_ENV === "production" && !/^https:\/\//i.test(normalized)) {
      return getFrontendBaseUrl();
    }
    return normalized;
  } catch {
    return getFrontendBaseUrl();
  }
};

/* =========================================
   USERNAME GENERATOR (AUTO)
========================================= */

const generateUsername = async (name) => {

  let base = name.toLowerCase().replace(/\s+/g,"");

  let username = base;
  let count = 1;

  while(await User.findOne({ username })){
    username = base + count;
    count++;
  }

  return username;

};

/* =========================================
   JWT GENERATOR
========================================= */

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};

/* =========================================
   REGISTER (LOCAL)
========================================= */

router.post("/register", async (req, res) => {
  try {

    let { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    /* =============================
       AUTO USERNAME GENERATION
    ============================== */

    const username = await generateUsername(name);

    const user = await User.create({
      name: name.trim(),
      username,
      email,
      password,
      role: role || "reader",
      provider: "local",
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {

    console.error("Register Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }
});

/* =========================================
   LOGIN (LOCAL)
========================================= */

router.post("/login", async (req, res) => {
  try {

    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & password required",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({
      email,
      provider: "local",
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account not active",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {

    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }
});

/* =========================================
   GOOGLE LOGIN START
========================================= */

router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Google login is not configured on the server",
    });
  }
  const frontendFromClient = req.query.clientOrigin || req.query.frontend;
  const state = encodeURIComponent(
    (typeof frontendFromClient === "string" && frontendFromClient.trim()) || getFrontendBaseUrl()
  );
  return passport.authenticate("google", {
    scope: ["profile", "email"],
    state
  })(req, res, next);
});

/* =========================================
   GOOGLE CALLBACK
========================================= */

router.get(
  "/google/callback",
  (req, res, next) => {
    const frontendBase = getSafeFrontendFromState(req.query.state);
    return passport.authenticate("google", {
      session: false,
      failureRedirect: `${frontendBase}/login.html`,
    })(req, res, next);
  },
  async (req, res) => {
    try {
      const frontendBase = getSafeFrontendFromState(req.query.state);

      const token = generateToken(req.user);

      // Use URL fragment instead of querystring to reduce token leakage via referrers/logs
      res.redirect(
        `${frontendBase}/login.html#token=${token}`
      );

    } catch (error) {

      console.error("Google Callback Error:", error);

      const frontendBase = getSafeFrontendFromState(req.query.state);
      res.redirect(`${frontendBase}/login.html`);

    }
  }
);

/* =========================================
   CREATE ADMIN
========================================= */

router.post("/create-admin", async (req, res) => {
  try {

    const { secret } = req.body;

    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const exists = await User.findOne({ email: "admin@ebook.com" });

    if (exists) {
      return res.json({
        success: true,
        message: "Admin already exists",
      });
    }

    const admin = await User.create({
      name: "Admin",
      username: "admin",
      email: "admin@ebook.com",
      password: "admin123",
      role: "admin",
      provider: "local",
    });

    res.json({
      success: true,
      message: "Admin created successfully",
    });

  } catch (error) {

    console.error("Admin Create Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }
});

module.exports = router;