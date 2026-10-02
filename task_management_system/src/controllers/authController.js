import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  const hashPassword = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (name, email, password) VALUES (?,?,?)",
    [name, email, hashPassword]
  );

  res.json({ message: "User registered successfully" });
};

// LOGIN

export const login = async (req, res) => {
  const { email, password } = req.body;

  const [users] = await pool.query(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (users.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const user = users[0];

  //  compare password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
};


export const profile = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    user: req.user,
  });
};