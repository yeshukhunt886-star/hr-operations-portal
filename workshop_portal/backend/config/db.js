import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

console.log("========== DB CONFIG ==========");
console.log({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
console.log("===============================");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Database Connected Successfully");
        connection.release();
    } catch (err) {
        console.error("Database Connection Failed");
        console.error(err);
    }
})();

export default pool;