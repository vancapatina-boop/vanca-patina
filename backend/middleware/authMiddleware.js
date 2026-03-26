const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error("Not authorized, no token");
    err.statusCode = 401;
    throw err;
  }

  const token = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    const err = new Error("Not authorized, token failed");
    err.statusCode = 401;
    throw err;
  }
  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    const err = new Error("Not authorized, user not found");
    err.statusCode = 401;
    throw err;
  }

  req.user = user;
  next();
});

const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    const err = new Error("Not authorized");
    err.statusCode = 401;
    return next(err);
  }

  if (req.user.role !== role) {
    const err = new Error(`Forbidden: requires ${role} role`);
    err.statusCode = 403;
    return next(err);
  }

  next();
};

const admin = requireRole("admin");
const user = requireRole("user");

module.exports = { protect, admin, user, requireRole };
