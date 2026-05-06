const jwt = require("jsonwebtoken");
const User = require("../models/user");

/* =====================================
   🔐 PROTECT ROUTE (JWT VERIFY)
===================================== */
const protect = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;
    let token = null;

    // Primary auth path: Authorization header
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Backward-compatible fallback for legacy frontend links
    if (!token && req.query && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authorized, token missing",
      });
    }

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Fetch fresh user from DB
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // 5️⃣ Check blocked / deleted
    if (user.status === "blocked" || user.isDeleted) {
      return res.status(403).json({
        message: "Account blocked",
      });
    }

    // 6️⃣ Attach user
    req.user = user;

    next();

  } catch (error) {

    console.error("JWT Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired, please login again",
      });
    }

    return res.status(401).json({
      message: "Not authorized, token invalid",
    });
  }
};

/* =====================================
   👑 ROLE BASED ACCESS CONTROL
===================================== */
const authorize = (...roles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize
};