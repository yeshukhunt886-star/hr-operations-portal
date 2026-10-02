
import rateLimit from "express-rate-limit";



const isTest = process.env.NODE_ENV === "test";
const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === undefined;

// REGISTER RATE LIMITER

const registerRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: isTest
        ? 10000
        : isDevelopment
            ? 50
            : 10,

    message: {
        success: false,
        message:
            "Too many registration attempts. Please try again later.",
    },

    standardHeaders: true,
    legacyHeaders: false,
});


// LOGIN RATE LIMITER
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: isTest
        ? 10000
        : isDevelopment
            ? 50
            : 5,

    message: {
        success: false,
        message:
            "Too many login attempts. Please try again after 15 minutes.",
    },

    standardHeaders: true,
    legacyHeaders: false,
});



// REFRESH TOKEN RATE LIMITER
const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: isTest
        ? 10000
        : isDevelopment
            ? 100
            : 20,

    message: {
        success: false,
        message:
            "Too many refresh token requests. Please try again later.",
    },

    standardHeaders: true,
    legacyHeaders: false,
});



// GENERAL API RATE LIMITER
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: isTest
        ? 10000
        : isDevelopment
            ? 1000
            : 100,

    message: {
        success: false,
        message:
            "Too many requests. Please try again later.",
    },

    standardHeaders: true,
    legacyHeaders: false,
});


// | MESSAGE RATE LIMITER
const messageRateLimiter = rateLimit({
    windowMs: 60 * 1000,

    max: isTest
        ? 10000
        : isDevelopment
            ? 300
            : 60,

    message: {
        success: false,
        message:
            "Too many messages. Please slow down.",
    },

    standardHeaders: true,
    legacyHeaders: false,
});


//  UPLOAD RATE LIMITER
const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,

    max: isTest
        ? 10000
        : isDevelopment
            ? 500
            : 100,

    message: {
        success: false,
        message:
            "Too many uploads. Please try again later.",
    },

    standardHeaders: true,
    legacyHeaders: false,
});

// EXPORTS
export {
    registerRateLimiter,
    loginRateLimiter,
    refreshRateLimiter,
    apiRateLimiter,
    messageRateLimiter,
    uploadRateLimiter,
};

