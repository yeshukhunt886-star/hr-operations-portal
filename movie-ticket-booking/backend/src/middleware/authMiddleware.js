const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token required",
      });
    }

    const parts = authHeader.trim().split(/\s+/);
    if ( parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token,process.env.JWT_SECRET );

    if (!decoded.userId) {
      return res.status(401).json({
        message: "Invalid token: user ID missing",
      });
    }

    req.user = {
      id: Number(decoded.userId),
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("JWT error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;