const jwt = require("jsonwebtoken");
const User = require("../models/user");

/* =====================================
   🔐 PROTECT ROUTE (JWT VERIFY)
===================================== */
const protect = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    // 1️⃣ Check Authorization header properly
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized, token missing",
      });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Not authorized, invalid token format",
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