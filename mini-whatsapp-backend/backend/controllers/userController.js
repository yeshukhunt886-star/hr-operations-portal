import db from "../config/db.js";

export const getAllUsers = async (req, res) => {
    try {

        const [users] = await db.query(`
            SELECT
                id,
                username,
                email,
                status
            FROM users
            ORDER BY id ASC
        `);

        console.log(
            "USERS FROM DATABASE:",
            users
        );

        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {

        console.error(
            "Get All Users Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });

    }
};