// middleware/adminAuth.js

module.exports = function (req, res, next) {
    // protect middleware should ALWAYS set req.user
    if (!req.user) {
        return res.status(401).json({ msg: "Not authenticated. Please log in again." });
    }

    // Check admin role
    if (req.user.role !== "admin") {
        return res.status(403).json({ msg: "Access denied. Admins only." });
    }

    // User is admin
    next();
};
