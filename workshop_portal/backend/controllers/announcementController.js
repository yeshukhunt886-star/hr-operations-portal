import pool from "../config/db.js";

/*
=====================================================
GET ALL ANNOUNCEMENTS
GET /api/announcements
=====================================================
*/

export const getAnnouncements = async (req, res) => {
    try {

        const [rows] = await pool.query(`
            SELECT
                id,
                title,
                message,
                created_at
            FROM announcements
            ORDER BY created_at DESC, id DESC
        `);

        return res.status(200).json({
            success: true,
            announcements: rows
        });

    } catch (error) {

        console.error(
            "GET ANNOUNCEMENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load announcements"
        });
    }
};


/*
=====================================================
CREATE ANNOUNCEMENT
POST /api/announcements
=====================================================
*/

export const createAnnouncement = async (req, res) => {

    try {

        const {
            title,
            message
        } = req.body;


        /*
        ---------------------------------------------
        VALIDATION
        ---------------------------------------------
        */

        if (!title || !title.trim()) {

            return res.status(400).json({
                success: false,
                message: "Announcement title is required"
            });

        }


        if (!message || !message.trim()) {

            return res.status(400).json({
                success: false,
                message: "Announcement message is required"
            });

        }


        /*
        ---------------------------------------------
        INSERT DATABASE
        ---------------------------------------------
        */

        const [result] = await pool.query(
            `
            INSERT INTO announcements
            (
                title,
                message
            )
            VALUES (?, ?)
            `,
            [
                title.trim(),
                message.trim()
            ]
        );


        /*
        ---------------------------------------------
        GET CREATED ANNOUNCEMENT
        ---------------------------------------------
        */

        const [rows] = await pool.query(
            `
            SELECT
                id,
                title,
                message,
                created_at
            FROM announcements
            WHERE id = ?
            `,
            [result.insertId]
        );


        const announcement = rows[0];


        /*
        ---------------------------------------------
        SOCKET.IO LIVE UPDATE
        ---------------------------------------------
        */

        if (req.app.locals.io) {

            req.app.locals.io.emit(
                "newAnnouncement",
                announcement
            );

        }


        /*
        ---------------------------------------------
        RESPONSE
        ---------------------------------------------
        */

        return res.status(201).json({

            success: true,

            message:
                "Announcement created successfully",

            announcement

        });

    } catch (error) {

        console.error(
            "CREATE ANNOUNCEMENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create announcement"
        });

    }
};


/*
=====================================================
DELETE ANNOUNCEMENT
DELETE /api/announcements/:id
=====================================================
*/

export const deleteAnnouncement = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const [result] = await pool.query(
            `
            DELETE FROM announcements
            WHERE id = ?
            `,
            [id]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        }


        /*
        ---------------------------------------------
        SOCKET.IO DELETE EVENT
        ---------------------------------------------
        */

        if (req.app.locals.io) {

            req.app.locals.io.emit(
                "announcementDeleted",
                {
                    id: Number(id)
                }
            );

        }


        return res.status(200).json({

            success: true,

            message:
                "Announcement deleted successfully"

        });

    } catch (error) {

        console.error(
            "DELETE ANNOUNCEMENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to delete announcement"
        });

    }

};