import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authMiddleware = (req, res, next) => {
  try {
    console.log("==================================");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);

    const authHeader = req.headers.authorization;

    console.log("HEADER:", authHeader);
    console.log("JWT SECRET:", process.env.JWT_SECRET);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization Header Missing",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid Authorization Format",
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("TOKEN:", token);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("USER:", decoded);

    req.user = decoded;

    next();

  } catch (error) {
    console.log("JWT VERIFY ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid Token",
    });
  }
};

export default authMiddleware;