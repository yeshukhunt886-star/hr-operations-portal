import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    // Allow more login attempts during Jest tests
    max: process.env.NODE_ENV === "test" ? 1000 : 5,

    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    },

    standardHeaders: true,
    legacyHeaders: false
});

export default loginLimiter;