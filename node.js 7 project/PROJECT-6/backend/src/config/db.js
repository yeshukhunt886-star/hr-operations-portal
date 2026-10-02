import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const testDatabaseConnection = async () => {
    let connection;

    try {
        connection = await pool.getConnection();

        await connection.query("SELECT 1");

        console.log(" MySQL connected successfully");
    } catch (error) {
        console.error(" MySQL connection failed:");
        console.error(error.message);

        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

export default pool;