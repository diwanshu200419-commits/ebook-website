// ===============================
// 🚀 E-BOOK MARKETPLACE BACKEND (FINAL PRO VERSION)
// ===============================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const path = require("path");

// 🔥 SECURITY
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ROUTES
const marketplaceRoutes = require("./routes/marketplace");
const creatorRoutes = require("./routes/creator");
const adminRoutes = require("./routes/admin");

const app = express();

/* ===================================
   ✅ BASIC SECURITY FIXES
=================================== */

// ❌ hide express info
app.disable("x-powered-by");

const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
const isProd = process.env.NODE_ENV === "production";
const normalizedClientUrl = (clientUrl || "").replace(/\/$/, "");
if (isProd && normalizedClientUrl && /^http:\/\//i.test(normalizedClientUrl)) {
  throw new Error("CLIENT_URL/FRONTEND_URL must use HTTPS in production.");
}

// 🔐 security headers (adjusted for frontend compatibility)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", clientUrl].filter(Boolean)
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 🔥 rate limit (anti hack)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, try again later"
  })
);

/* ===================================
   ✅ ENV CHECK (SAFE)
=================================== */

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV: ${key}`);
    process.exit(1);
  }
});

/* ===================================
   ✅ PASSPORT
=================================== */

require("./config/passport");

/* ===================================
   ✅ MIDDLEWARE
=================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================================
   🔥 CORS FIX (IMPORTANT FOR DEPLOY)
=================================== */

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || "";
const parsedAllowedOrigins = rawAllowedOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(
    [
      normalizedClientUrl,
      process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : "",
      "https://ebook-website-theta-nine.vercel.app",
      ...parsedAllowedOrigins
    ].filter(Boolean)
  )
);

if (!isProd) {
  allowedOrigins.push("http://localhost:5501", "http://127.0.0.1:5501", "http://localhost:3000");
}

app.use(
  cors({
    origin: function (origin, callback) {
      const allow =
        !origin ||
        allowedOrigins.includes(String(origin).replace(/\/$/, ""));
      if (allow) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked"));
      }
    },
    credentials: true
  })
);

app.use(passport.initialize());

/* ===================================
   🔥 TRUST PROXY (RENDER FIX)
=================================== */

app.set("trust proxy", 1);

// Enforce HTTPS in production deployments (Render/Proxy aware)
app.use((req, res, next) => {
  if (!isProd) return next();
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (req.secure || forwardedProto === "https") return next();
  return res.redirect(`https://${req.headers.host}${req.originalUrl}`);
});

/* ===================================
   📂 STATIC FILES (IMPORTANT)
=================================== */

// Serve non-sensitive upload assets publicly.
app.use("/uploads/covers", express.static(path.join(__dirname, "uploads/covers")));
app.use("/uploads/payments", express.static(path.join(__dirname, "uploads/payments")));

// Prevent direct public PDF access. Book files are served via protected endpoints.
app.use("/uploads/books", (req, res) => {
  return res.status(403).json({ success: false, message: "Direct access blocked" });
});

/* ===================================
   ✅ DATABASE
=================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

/* ===================================
   ✅ ROUTES
=================================== */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/user", require("./routes/user"));
app.use("/api/books", require("./routes/books"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/earnings", require("./routes/earnings"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/admin", adminRoutes);

/* ===================================
   ✅ HEALTH CHECK
=================================== */

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "🚀 Backend Running",
    env: process.env.NODE_ENV,
    time: new Date()
  });
});

/* ===================================
   ❌ 404 HANDLER
=================================== */

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "API route not found"
  });
});

/* ===================================
   🔥 ERROR HANDLER (PRO)
=================================== */

app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack);

  res.status(err.status || 500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message
  });
});

/* ===================================
   🚀 SERVER START
=================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
})