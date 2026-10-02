import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "secure_document_vault",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection when server starts
try {
  const connection = await db.getConnection();

  console.log("MySQL database connected successfully");

  connection.release();
} catch (error) {
  console.error(
    "MySQL database connection failed:",
    error.message
  );
}

export default db;