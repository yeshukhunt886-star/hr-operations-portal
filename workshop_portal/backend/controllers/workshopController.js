
import pool from "../config/db.js";


/* =====================================================
   CREATE WORKSHOP
===================================================== */

export const createWorkshop = async (req, res) => {

    try {

        const {
            title,
            description,
            workshop_date,
            venue,
            capacity
        } = req.body;


        /* =============================================
           VALIDATION
        ============================================= */

        if (!title || !title.trim()) {

            return res.status(400).json({
                success: false,
                message: "Workshop title is required"
            });

        }


        if (!description || !description.trim()) {

            return res.status(400).json({
                success: false,
                message: "Workshop description is required"
            });

        }


        if (!workshop_date) {

            return res.status(400).json({
                success: false,
                message: "Workshop date is required"
            });

        }


        if (!venue || !venue.trim()) {

            return res.status(400).json({
                success: false,
                message: "Workshop venue is required"
            });

        }


        if (
            capacity === undefined ||
            capacity === null ||
            capacity === "" ||
            Number(capacity) < 1
        ) {

            return res.status(400).json({
                success: false,
                message: "Valid workshop capacity is required"
            });

        }


        /* =============================================
           BANNER
        ============================================= */

        let banner = null;

        if (req.file) {

            banner =
                `/uploads/workshops/${req.file.filename}`;

        }


        /* =============================================
           INSERT
        ============================================= */

        const [result] = await pool.query(
            `
            INSERT INTO workshops
            (
                title,
                description,
                workshop_date,
                venue,
                capacity,
                banner
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                title.trim(),
                description.trim(),
                workshop_date,
                venue.trim(),
                Number(capacity),
                banner
            ]
        );


        return res.status(201).json({

            success: true,

            message:
                "Workshop Created Successfully",

            workshop: {
                id: result.insertId,
                title: title.trim(),
                description: description.trim(),
                workshop_date,
                venue: venue.trim(),
                capacity: Number(capacity),
                banner
            }

        });


    } catch (error) {

        console.error(
            "CREATE WORKSHOP ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to create workshop",

            error:
                error.message

        });

    }

};


/* =====================================================
   GET ALL WORKSHOPS
===================================================== */

export const getWorkshops = async (req, res) => {

    try {

        const [rows] = await pool.query(
            `
            SELECT
                w.*,
                COUNT(p.id) AS registered_count
            FROM workshops w
            LEFT JOIN participants p
                ON p.workshop_id = w.id
            GROUP BY w.id
            ORDER BY
                w.workshop_date DESC,
                w.id DESC
            `
        );


        return res.status(200).json({

            success: true,

            count: rows.length,

            workshops: rows

        });


    } catch (error) {

        console.error(
            "GET WORKSHOPS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load workshops",

            error:
                error.message

        });

    }

};


/* =====================================================
   GET SINGLE WORKSHOP
===================================================== */

export const getWorkshopById = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const [rows] = await pool.query(
            `
            SELECT *
            FROM workshops
            WHERE id = ?
            `,
            [id]
        );


        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Workshop not found"

            });

        }


        return res.status(200).json({

            success: true,

            workshop: rows[0]

        });


    } catch (error) {

        console.error(
            "GET WORKSHOP ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to get workshop"

        });

    }

};


/* =====================================================
   UPDATE WORKSHOP
===================================================== */

export const updateWorkshop = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const {
            title,
            description,
            workshop_date,
            venue,
            capacity
        } = req.body;


        /* =============================================
           CHECK WORKSHOP
        ============================================= */

        const [existing] = await pool.query(
            `
            SELECT *
            FROM workshops
            WHERE id = ?
            `,
            [id]
        );


        if (existing.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Workshop not found"

            });

        }


        /* =============================================
           VALIDATION
        ============================================= */

        if (!title || !title.trim()) {

            return res.status(400).json({

                success: false,

                message:
                    "Workshop title is required"

            });

        }


        if (!description || !description.trim()) {

            return res.status(400).json({

                success: false,

                message:
                    "Workshop description is required"

            });

        }


        if (!workshop_date) {

            return res.status(400).json({

                success: false,

                message:
                    "Workshop date is required"

            });

        }


        if (!venue || !venue.trim()) {

            return res.status(400).json({

                success: false,

                message:
                    "Workshop venue is required"

            });

        }


        if (
            capacity === undefined ||
            capacity === null ||
            capacity === "" ||
            Number(capacity) < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Valid workshop capacity is required"

            });

        }


        /* =============================================
           BANNER
        ============================================= */

        let banner =
            existing[0].banner || null;


        if (req.file) {

            banner =
                `/uploads/workshops/${req.file.filename}`;

        }


        /* =============================================
           UPDATE
        ============================================= */

        await pool.query(
            `
            UPDATE workshops
            SET
                title = ?,
                description = ?,
                workshop_date = ?,
                venue = ?,
                capacity = ?,
                banner = ?
            WHERE id = ?
            `,
            [
                title.trim(),
                description.trim(),
                workshop_date,
                venue.trim(),
                Number(capacity),
                banner,
                id
            ]
        );


        return res.status(200).json({

            success: true,

            message:
                "Workshop Updated Successfully"

        });


    } catch (error) {

        console.error(
            "UPDATE WORKSHOP ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update workshop",

            error:
                error.message

        });

    }

};


/* =====================================================
   DELETE WORKSHOP
===================================================== */

export const deleteWorkshop = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const [existing] = await pool.query(
            `
            SELECT id
            FROM workshops
            WHERE id = ?
            `,
            [id]
        );


        if (existing.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Workshop not found"

            });

        }


        await pool.query(
            `
            DELETE FROM workshops
            WHERE id = ?
            `,
            [id]
        );


        return res.status(200).json({

            success: true,

            message:
                "Workshop Deleted Successfully"

        });


    } catch (error) {

        console.error(
            "DELETE WORKSHOP ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to delete workshop",

            error:
                error.message

        });

    }

};
