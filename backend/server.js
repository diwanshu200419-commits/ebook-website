const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const app = express();
const frontendRoot = path.resolve(__dirname, "../frontend");
const uploadsRoot = path.resolve(__dirname, "uploads");

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

require("./config/passport");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({ origin: true, credentials: true }));
app.use(passport.initialize());

app.use("/uploads", express.static(uploadsRoot));
app.use(express.static(frontendRoot));

app.locals.dbState = {
  connected: false,
  message: "Database connection has not been established yet",
};

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  })
  .then(() => {
    app.locals.dbState = {
      connected: true,
      message: "MongoDB connected",
    };
    console.log("MongoDB connected");
  })
  .catch((error) => {
    app.locals.dbState = {
      connected: false,
      message: error.message,
    };
    console.error("MongoDB connection error:", error.message);
  });

app.use((req, res, next) => {
  if (req.path === "/api/health") {
    return next();
  }

  if (req.path.startsWith("/api/") && !app.locals.dbState.connected) {
    return res.status(503).json({
      success: false,
      message: "Database connection is unavailable. Please try again shortly.",
    });
  }

  return next();
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/user", require("./routes/user"));
app.use("/api/books", require("./routes/books"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/earnings", require("./routes/earnings"));
app.use("/api/marketplace", require("./routes/marketplace"));
app.use("/api/creator", require("./routes/creator"));

app.get("/api/health", (req, res) => {
  const statusCode = app.locals.dbState.connected ? 200 : 503;

  res.status(statusCode).json({
    success: app.locals.dbState.connected,
    service: "ebook-marketplace",
    database: app.locals.dbState,
    uptimeSeconds: Math.floor(process.uptime()),
    time: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendRoot, "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API route not found",
    });
  }

  return res.status(404).sendFile(path.join(frontendRoot, "index.html"));
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
