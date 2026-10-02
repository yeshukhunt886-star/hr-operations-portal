import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12;

export async function hashPassword(
  password
) {
  return bcrypt.hash(
    password,
    SALT_ROUNDS
  );
}

export async function comparePassword(
  password,
  passwordHash
) {
  return bcrypt.compare(
    password,
    passwordHash
  );
}

export function generateAccessToken(
  user
) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "1h",
    }
  );
}

export function verifyAccessToken(
  token
) {
  return jwt.verify(
    token,
    process.env.JWT_SECRET
  );
}