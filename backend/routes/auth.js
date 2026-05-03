const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/user");

const router = express.Router();

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

function getFrontendBase(req) {
  return `${req.protocol}://${req.get("host")}`;
}

async function generateUsername(name) {
  const base = String(name || "user")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  let username = base || "user";
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${base || "user"}${counter}`;
    counter += 1;
  }

  return username;
}

function generateToken(user) {
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
}

router.post("/register", async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedRole = ["reader", "creator", "author"].includes(role)
      ? role
      : "reader";

    const username = await generateUsername(name);

    const user = await User.create({
      name: name.trim(),
      username,
      email,
      password,
      role: normalizedRole,
      provider: "local",
      verified: true,
    });

    const token = generateToken(user);

    return res.status(201).json({
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
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
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

    if (user.status !== "active" || user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    return res.json({
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
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get(
  "/google",
  (req, res, next) => {
    if (!googleEnabled) {
      return res.status(503).json({
        success: false,
        message: "Google login is not configured",
      });
    }

    return next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!googleEnabled) {
      return res.redirect("/login.html");
    }

    return next();
  },
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login.html",
  }),
  async (req, res) => {
    try {
      const token = generateToken(req.user);
      const frontendBase = getFrontendBase(req);

      return res.redirect(`${frontendBase}/login.html?token=${token}`);
    } catch (error) {
      console.error("Google callback error:", error);
      const frontendBase = getFrontendBase(req);

      return res.redirect(`${frontendBase}/login.html`);
    }
  }
);

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

    await User.create({
      name: "Admin",
      username: "admin",
      email: "admin@ebook.com",
      password: "admin123",
      role: "admin",
      provider: "local",
      verified: true,
    });

    return res.json({
      success: true,
      message: "Admin created successfully",
    });
  } catch (error) {
    console.error("Admin create error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
