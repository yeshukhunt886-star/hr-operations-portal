import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_EXPIRES_IN =
    process.env.ACCESS_TOKEN_EXPIRES_IN || "30m";

const REFRESH_TOKEN_EXPIRES_IN =
    process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

const ACCESS_TOKEN_SECRET =
    process.env.JWT_ACCESS_SECRET;

const REFRESH_TOKEN_SECRET =
    process.env.JWT_REFRESH_SECRET;


// Generate Access Token
export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email
        },
        ACCESS_TOKEN_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        }
    );
};


// Generate Refresh Token
export const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id
        },
        REFRESH_TOKEN_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN
        }
    );
};


// Verify Access Token
export const verifyAccessToken = (token) => {
    return jwt.verify(
        token,
        ACCESS_TOKEN_SECRET
    );
};


// Verify Refresh Token
export const verifyRefreshToken = (token) => {
    return jwt.verify(
        token,
        REFRESH_TOKEN_SECRET
    );
};


// Generate random token ID if required
export const generateRandomToken = () => {
    return crypto.randomBytes(64).toString("hex");
};