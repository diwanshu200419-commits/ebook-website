// ===============================
// 🚀 E-BOOK MARKETPLACE BACKEND (FINAL PRO VERSION)
// ===============================

const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const User = require("./models/user");
const {
  describeUploadStorage,
  publicUploadFolders,
} = require("./utils/uploads");
const {
  getAllowedFrontendOrigins,
  getFrontendBaseUrl,
  getUrlOrigin,
  isProduction,
  normalizeUrl
} = require("./utils/urlConfig");
const {
  getConfiguredAiProvider,
  getEmbeddingModel,
  getModerationModel,
} = require("./services/ai/client");

// 🔥 SECURITY
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ROUTES
const marketplaceRoutes = require("./routes/marketplace");
const creatorRoutes = require("./routes/creator");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");
const paymentRoutes = require("./routes/payments");
const { getAIQueueStatus, initializeAIQueue } = require("./services/ai/queue");
const { syncProjectCatalogToMarketplace } = require("./services/catalogImport");

const app = express();
const uploadStorage = describeUploadStorage();

/* ===================================
   ✅ BASIC SECURITY FIXES
=================================== */

// ❌ hide express info
app.disable("x-powered-by");

const clientUrl = getFrontendBaseUrl();
const isProd = isProduction();
const normalizedClientUrl = normalizeUrl(clientUrl);
const clientOrigin = getUrlOrigin(clientUrl);

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
      connectSrc: ["'self'", clientOrigin].filter(Boolean)
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

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentRoutes.handleStripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================================
   🔥 CORS FIX (IMPORTANT FOR DEPLOY)
=================================== */

const allowedOrigins = getAllowedFrontendOrigins();

app.use(
  cors({
    origin: function (origin, callback) {
      const normalizedOrigin = getUrlOrigin(origin) || normalizeUrl(origin);
      const allow =
        !origin ||
        allowedOrigins.includes(normalizedOrigin);
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

// Serve only non-sensitive upload assets publicly.
if (uploadStorage.servesLocally) {
  publicUploadFolders.forEach((folder) => {
    app.use(`/uploads/${folder}`, express.static(path.join(uploadStorage.uploadsRoot, folder)));
  });
}

/* ===================================
   ✅ DATABASE
=================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    
    // Seed admin user if missing
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const admin = await User.create({
          name: "Admin",
          username: "admin",
          email: adminEmail,
          password: process.env.ADMIN_PASSWORD,
          role: "admin",
          provider: "local"
        });
        console.log("✅ Admin user created successfully");
      } else {
        console.log("✅ Admin user already exists");
      }
    } else {
      console.log("ℹ️ ADMIN_EMAIL and ADMIN_PASSWORD not set - skipping admin seeding");
    }
    try {
      const syncResult = await syncProjectCatalogToMarketplace({ force: true });
      console.log(
        `Project PDF catalog sync ready: ${syncResult.created || 0} created, ${syncResult.updated || 0} updated, ${syncResult.skipped || 0} skipped`
      );
    } catch (syncError) {
      console.error("Project PDF catalog sync failed:", syncError.message);
    }

    await initializeAIQueue();
    console.log("AI processing queue ready");
    console.log(
      `AI provider configured: ${getConfiguredAiProvider()} | model: ${getModerationModel()} | embeddings: ${getEmbeddingModel() || "disabled"}`
    );
    console.log(
      `Upload storage: ${uploadStorage.provider} | root: ${uploadStorage.uploadsRoot}${uploadStorage.publicBaseUrl ? ` | public base: ${uploadStorage.publicBaseUrl}` : ""}`
    );
    console.log(
      `Public upload folders: ${uploadStorage.publiclyServedFolders.join(", ")} | protected folders: ${uploadStorage.protectedFolders.join(", ")}`
    );
  })
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
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/lifecycle", require("./routes/lifecycle"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

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

app.get("/api/health", (req, res) => {
  const aiQueue = getAIQueueStatus();
  res.json({
    status: "success",
    message: "API healthy",
    env: process.env.NODE_ENV,
    uploadStorage: {
      provider: uploadStorage.provider,
      servesLocally: uploadStorage.servesLocally,
      publicBaseUrl: uploadStorage.publicBaseUrl || "",
      publiclyServedFolders: uploadStorage.publiclyServedFolders,
      protectedFolders: uploadStorage.protectedFolders,
      privateProductAssetsEnabled: uploadStorage.privateProductAssetsEnabled,
    },
    aiQueue,
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
