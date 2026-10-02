import db from "../config/db.js";

// ========================================
// GET ALL GROUPS
// GET /api/groups
// ========================================

export const getMyGroups = async (req, res) => {
try {


    const [groups] = await db.query(`
        SELECT
            id,
            group_name,
            group_image,
            created_by,
            created_at
        FROM groups
        ORDER BY created_at DESC
    `);

    console.log(
        "ALL GROUPS FROM DATABASE:",
        groups
    );

    return res.status(200).json({
        success: true,
        groups: groups
    });

} catch (error) {

    console.error(
        "Get All Groups Error:",
        error
    );

    return res.status(500).json({
        success: false,
        message: "Failed to fetch groups",
        error: error.message
    });

}


};


// CREATE GROUP
export const createGroup = async (req, res) => {
    try {
        const {
            groupName,
            groupImage
        } = req.body;

        // Logged-in user ID
        const userId =
            Number(req.user.id);

        // VALIDATION
        if (
            !groupName ||
            !groupName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Group name is required"
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid user"
            });
        }


        // CREATE GROUP
        const [result] =
            await db.query(
                `
                INSERT INTO groups
                (
                    group_name,
                    group_image,
                    created_by
                )
                VALUES (?, ?, ?)
                `,
                [
                    groupName.trim(),
                    groupImage || null,
                    userId
                ]
            );

        // IMPORTANT:
        // This is the newly created group's ID
        const groupId =
            result.insertId;

        // ADD CREATOR AS ADMIN
        await db.query(
            `
            INSERT INTO group_members
            (
                group_id,
                user_id,
                role
            )
            VALUES (?, ?, ?)
            `,
            [
                groupId,
                userId,
                "admin"
            ]
        );

        console.log(
            "GROUP CREATOR ADDED:",
            {
                groupId,
                userId,
                role: "admin"
            }
        );

        // GET CREATED GROUP
        const [groups] =
            await db.query(
                `
                SELECT
                    id,
                    group_name,
                    group_image,
                    created_by,
                    created_at
                FROM groups
                WHERE id = ?
                `,
                [
                    groupId
                ]
            );

        // RESPONSE
        return res.status(201).json({
            success: true,
            message:
                "Group created successfully",
            group:
                groups[0]
        });

    } catch (error) {
        console.error(
            "Create Group Error:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to create group",
            error:
                error.message
        });
    }
};

