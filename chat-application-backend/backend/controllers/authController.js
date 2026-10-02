import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

import {
    generateAccessToken,
    generateRefreshToken
} from "../utils/jwt.js";


// ============================
// REGISTER
// ============================
export const register = async (req, res) => {

    try {

        const { username, email, password } = req.body;

        // Check required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email and password are required"
            });
        }

        // Check existing user
        const [existingUser] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users
            (username, email, password)
            VALUES (?, ?, ?)`,
            [
                username,
                email,
                hashedPassword
            ]
        );

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: result.insertId,
                username,
                email
            }
        });

    } catch (error) {

        console.error("Register Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// ============================
// LOGIN
// ============================
export const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find user
        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        // Compare password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);

        const refreshToken = generateRefreshToken(user);

        res.json({

            message: "Login successful",

            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },

            accessToken,

            refreshToken
        });

    } catch (error) {

        console.error("Login Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// ============================
// REFRESH ACCESS TOKEN
// ============================
export const refreshToken = async (req, res) => {

    try {

        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token required"
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        // Get user
        const [users] = await pool.query(
            "SELECT id, username, email FROM users WHERE id = ?",
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        const user = users[0];

        // Generate new access token
        const newAccessToken =
            generateAccessToken(user);

        res.json({
            accessToken: newAccessToken
        });

    } catch (error) {

        console.error("Refresh Token Error:", error);

        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
};