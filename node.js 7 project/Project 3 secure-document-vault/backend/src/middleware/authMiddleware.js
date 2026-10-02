import jwt from "jsonwebtoken";
import db from "../config/db.js";

export async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const parts = authorization.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== "bearer"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication format.",
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      console.error(
        "JWT verification failed:",
        error.message
      );

      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const [users] = await db.execute(
      `
      SELECT
        id,
        name,
        email,
        role,
        is_active
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive.",
      });
    }

    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Authentication check failed.",
    });
  }
}


export const authMiddleware = authenticate;