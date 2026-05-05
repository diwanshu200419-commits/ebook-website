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

const app = express();

/* ===================================
   ✅ BASIC SECURITY FIXES
=================================== */

// ❌ hide express info
app.disable("x-powered-by");

// 🔐 security headers
app.use(helmet());

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

/*require("./config/passport");

/* ===================================
   ✅ MIDDLEWARE
=================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================================
   🔥 CORS FIX (IMPORTANT FOR DEPLOY)
=================================== */

const allowedOrigins = [
  "http://localhost:5501",
  "http://127.0.0.1:5501",
  "http://localhost:3000",
  "https://your-frontend-domain.onrender.com" // 👈 CHANGE THIS
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
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

/* ===================================
   📂 STATIC FILES (IMPORTANT)
=================================== */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

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
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/creator", creatorRoutes);

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