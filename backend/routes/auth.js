// routes/auth.js

const express = require("express");
const router = express.Router();
const Joi = require("joi");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { clearAuthCookie, setAuthCookie } = require("../utils/authCookies");
const { ensureUserUsername, generateUniqueUsername } = require("../services/userIdentity");
const { resolveFrontendRedirectUrl } = require("../utils/urlConfig");
const { buildGoogleAuthState, parseGoogleAuthState } = require("../utils/googleAuthState");
const {
  applyReferralSignup,
  findReferrerByCode,
  isCreatorRoleValue,
} = require("../services/referrals");
const { syncUserEngagement } = require("../services/engagementSignals");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid("reader", "creator", "author").default("reader"),
  referralCode: Joi.string().trim().max(24).allow(""),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(1).required()
});

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

const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  verified: Boolean(user.verified),
  referralCode: user.referralCode || "",
  provider: user.provider || "local",
  profileImage: user.profileImage || "",
});

const buildFailureRedirect = (redirectUrl, code) => {
  const url = new URL(redirectUrl);
  url.searchParams.set("error", code);
  url.hash = "";
  return url.toString();
};

const buildSuccessRedirect = (redirectUrl, token) => {
  const url = new URL(redirectUrl);
  url.searchParams.delete("error");
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
};

const touchLastLogin = async (user) => {
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  try {
    await syncUserEngagement(user);
  } catch (error) {
    console.error("Engagement Sync Error:", error.message);
  }
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if (typeof req.body?.token === "string" && req.body.token.trim()) {
    return req.body.token.trim();
  }

  return "";
};

/* =========================================
   REGISTER (LOCAL)
========================================= */

router.post("/register", async (req, res) => {
  try {
    const { value, error } = registerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let { name, email, password, role, referralCode } = value;

    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const referrer = await findReferrerByCode(referralCode);

    /* =============================
       AUTO USERNAME GENERATION
    ============================== */

    const username = await generateUniqueUsername(name);

    const user = await User.create({
      name: name.trim(),
      username,
      email,
      password,
      role: role || "reader",
      provider: "local",
      referredBy: referrer?._id || null,
    });

    if (referrer?._id) {
      await applyReferralSignup(referrer._id, {
        countCreator: isCreatorRoleValue(role),
      });
    }

    await touchLastLogin(user);

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: buildUserPayload(user),
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
    const { value, error } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let { email, password } = value;

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");

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

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    await ensureUserUsername(user);
    await touchLastLogin(user);

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: buildUserPayload(user),
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
  const requestedReturnTo = req.query.returnTo || req.query.clientOrigin || req.query.frontend;
  const returnTo = resolveFrontendRedirectUrl(requestedReturnTo, "/login.html");
  const state = buildGoogleAuthState(returnTo, req.query.role, req.query.ref || req.query.referralCode);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(buildFailureRedirect(returnTo, "google_not_configured"));
  }

  if (!returnTo) {
    return res.status(500).json({
      success: false,
      message: "Frontend redirect URL is not configured correctly",
    });
  }

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
    const googleState = parseGoogleAuthState(req.query.state);
    const frontendRedirect = resolveFrontendRedirectUrl(googleState.returnTo, "/login.html");
    return passport.authenticate("google", {
      session: false,
      failureRedirect: buildFailureRedirect(frontendRedirect, "google_auth_failed"),
    })(req, res, next);
  },
  async (req, res) => {
    try {
      const googleState = parseGoogleAuthState(req.query.state);
      const frontendRedirect = resolveFrontendRedirectUrl(googleState.returnTo, "/login.html");

      await touchLastLogin(req.user);

      const token = generateToken(req.user);
      setAuthCookie(res, token);

      res.redirect(buildSuccessRedirect(frontendRedirect, token));

    } catch (error) {

      console.error("Google Callback Error:", error);

      const googleState = parseGoogleAuthState(req.query.state);
      const frontendRedirect = resolveFrontendRedirectUrl(googleState.returnTo, "/login.html");
      res.redirect(buildFailureRedirect(frontendRedirect, "google_auth_failed"));

    }
  }
);

router.post("/session", async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.status !== "active" || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "User session is no longer valid",
      });
    }

    await ensureUserUsername(user);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Session refreshed",
      user: buildUserPayload(user),
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid session token",
    });
  }
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: "Logout successful",
  });
});

/* =========================================
   CREATE ADMIN
========================================= */

router.post("/create-admin", async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Admin bootstrap route disabled. Provision admins through secure environment configuration only.",
  });
});

module.exports = router;
