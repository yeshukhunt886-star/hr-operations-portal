import { verifyAccessToken } from "../utils/token.js";

const authMiddleware = (req, res, next) => {

    console.log("=================================");
    console.log("AUTH MIDDLEWARE CALLED");
    console.log("URL:", req.originalUrl);
    console.log("Method:", req.method);

    const authHeader = req.headers.authorization;

    console.log(
        "Authorization Header:",
        authHeader
    );

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {
        console.log(
            "AUTH ERROR: Token missing"
        );

        return res.status(401).json({
            success: false,
            message: "Access token required"
        });
    }

    const token =
        authHeader.split(" ")[1];

    console.log(
        "Token received:",
        token ? "YES" : "NO"
    );

    try {

        // IMPORTANT:
        // Access token must be verified
        // with JWT_ACCESS_SECRET
        const decoded =
            verifyAccessToken(token);

        console.log(
            "JWT VERIFIED:",
            decoded
        );

        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "JWT VERIFY ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export default authMiddleware;