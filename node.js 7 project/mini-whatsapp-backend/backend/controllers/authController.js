import bcrypt from "bcrypt";
import pool from "../config/db.js";

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} from "../utils/token.js";


// REGISTER
// POST /api/auth/register

export const register = async (req, res) => {
    try {
        const {
            username,
            email,
            password
        } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required"
            });
        }

        // Check password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Check existing user
        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        // Insert user
        const [result] = await pool.query(
            `
            INSERT INTO users
            (username, email, password)
            VALUES (?, ?, ?)
            `,
            [
                username,
                email,
                hashedPassword
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: result.insertId,
                username,
                email
            }
        });

    } catch (error) {

        console.error(
            "Register Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

// LOGIN
// POST /api/auth/login

export const login = async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;


        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }


        // Find user
        const [users] = await pool.query(
            `
            SELECT
                id,
                username,
                email,
                password
            FROM users
            WHERE email = ?
            `,
            [email]
        );


        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }


        const user = users[0];


        // Compare password
        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }


        // Generate Access Token
        const accessToken =
            generateAccessToken(user);


        // Generate Refresh Token
        const refreshToken =
            generateRefreshToken(user);


        // Calculate refresh token expiry
        const expiresAt =
            new Date(
                Date.now() +
                7 * 24 * 60 * 60 * 1000
            );


        // Save Refresh Token
        await pool.query(
            `
            INSERT INTO refresh_tokens
            (
                user_id,
                token,
                expires_at
            )
            VALUES (?, ?, ?)
            `,
            [
                user.id,
                refreshToken,
                expiresAt
            ]
        );


        return res.status(200).json({

            success: true,

            message: "Login successful",

            accessToken,

            refreshToken,

            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }

        });

    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};

// REFRESH ACCESS TOKEN
// POST /api/auth/refresh
export const refreshAccessToken = async (
    req,
    res
) => {

    try {

        const {
            refreshToken
        } = req.body;


        // Check refresh token
        if (!refreshToken) {

            return res.status(401).json({
                success: false,
                message: "Refresh token is required"
            });

        }


        // Verify JWT refresh token
        let decoded;

        try {

            decoded =
                verifyRefreshToken(
                    refreshToken
                );

        } catch (error) {

            return res.status(403).json({
                success: false,
                message: "Invalid or expired refresh token"
            });

        }


        // Check database
        const [tokens] =
            await pool.query(
                `
                SELECT *
                FROM refresh_tokens
                WHERE token = ?
                AND revoked = FALSE
                AND expires_at > NOW()
                `,
                [
                    refreshToken
                ]
            );


        if (tokens.length === 0) {

            return res.status(403).json({
                success: false,
                message:
                    "Refresh token is invalid, revoked or expired"
            });

        }


        // Find user
        const [users] =
            await pool.query(
                `
                SELECT
                    id,
                    username,
                    email
                FROM users
                WHERE id = ?
                `,
                [
                    decoded.id
                ]
            );


        if (users.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }


        const user = users[0];


        // Generate new access token
        const newAccessToken =
            generateAccessToken(user);


        return res.status(200).json({

            success: true,

            message:
                "Access token refreshed successfully",

            accessToken:
                newAccessToken

        });


    } catch (error) {

        console.error(
            "Refresh Token Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error while refreshing token"

        });

    }
};

// LOGOUT
// POST /api/auth/logout
export const logout = async (
    req,
    res
) => {

    try {

        const {
            refreshToken
        } = req.body;


        if (!refreshToken) {

            return res.status(400).json({
                success: false,
                message:
                    "Refresh token is required"
            });

        }


        // Revoke token
        await pool.query(
            `
            UPDATE refresh_tokens
            SET revoked = TRUE
            WHERE token = ?
            `,
            [
                refreshToken
            ]
        );


        return res.status(200).json({

            success: true,

            message:
                "Logout successful"

        });


    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error during logout"

        });

    }
};

// GET CURRENT USER
// GET /api/auth/me
// Protected API
export const getMe = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;


        const [users] =
            await pool.query(
                `
                SELECT
                    id,
                    username,
                    email,
                    status,
                    created_at
                FROM users
                WHERE id = ?
                `,
                [
                    userId
                ]
            );


        if (users.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found"

            });

        }


        return res.status(200).json({

            success: true,

            user: users[0]

        });


    } catch (error) {

        console.error(
            "Get Me Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error"

        });

    }
};