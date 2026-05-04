// ===============================
// 🚀 E-BOOK MARKETPLACE BACKEND
// ===============================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const path = require("path"); 
const marketplaceRoutes = require("./routes/marketplace");

require("dotenv").config();

const app = express();
const creatorRoutes = require("./routes/creator");

/* ===================================
   ✅ ENVIRONMENT CHECK
=================================== */

const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV Variable: ${key}`);
    process.exit(1);
  }
});

/* ===================================
   ✅ PASSPORT CONFIG
=================================== */

require("./config/passport");

/* ===================================
   ✅ GLOBAL MIDDLEWARE
=================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "http://localhost:3000"
    ],
    credentials: true
  })
);

app.use(passport.initialize());

/* ===================================
   ✅ STATIC FILES (🔥 FINAL FIX)
=================================== */

app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

/* ===================================
   ✅ DATABASE CONNECTION
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
    time: new Date()
  });
});

/* ===================================
   ❌ 404 HANDLER (FIXED)
=================================== */

app.use((req, res, next) => {

  // ✅ allow static files
  if (req.path.startsWith("/uploads")) {
    return next();
  }

  res.status(404).json({
    status: "error",
    message: "API route not found"
  });
});

/* ===================================
   🔥 GLOBAL ERROR HANDLER
=================================== */

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  res.status(500).json({
    status: "error",
    message: "Internal Server Error"
  });
});

/* ===================================
   🚀 SERVER START
=================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});