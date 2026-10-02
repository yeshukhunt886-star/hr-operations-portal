import db from "../config/db.js";

import {
  hashPassword,
  comparePassword,
  generateAccessToken,
} from "../utils/auth.js";

export async function register(
  req,
  res
) {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required.",
      });
    }

    const normalizedName =
      String(name).trim();

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message:
          "Name cannot be empty.",
      });
    }

    if (
      normalizedName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name is too long.",
      });
    }

    if (
      normalizedEmail.length > 255
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email is too long.",
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address.",
      });
    }

    if (
      String(password).length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters.",
      });
    }

    const [
      existingUsers,
    ] = await db.execute(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (
      existingUsers.length > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Unable to create account with these details.",
      });
    }

    const passwordHash =
      await hashPassword(
        password
      );

    const [
      result,
    ] = await db.execute(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES (?, ?, ?, 'user', TRUE)
      `,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",
      user: {
        id: result.insertId,
        name: normalizedName,
        email: normalizedEmail,
        role: "user",
      },
    });
  } catch (error) {
    console.error(
      "Register error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account.",
    });
  }
}

export async function login(
  req,
  res
) {
  try {
    const {
      email,
      password,
    } = req.body;

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const [users] =
      await db.execute(
        `
        SELECT
          id,
          name,
          email,
          password_hash,
          role,
          is_active
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [normalizedEmail]
      );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const user =
      users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message:
          "Account is inactive.",
      });
    }

    const passwordValid =
      await comparePassword(
        password,
        user.password_hash
      );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const token =
      generateAccessToken(
        user
      );

    return res.status(200).json({
      success: true,
      message:
        "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to login.",
    });
  }
}

export async function me(
  req,
  res
) {
  try {
    const [users] =
      await db.execute(
        `
        SELECT
          id,
          name,
          email,
          role,
          is_active,
          created_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [req.user.userId]
      );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch user.",
    });
  }
}

export async function logout(
  req,
  res
) {
  return res.status(200).json({
    success: true,
    message:
      "Logout successful.",
  });
}