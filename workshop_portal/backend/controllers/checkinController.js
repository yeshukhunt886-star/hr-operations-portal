import pool from "../config/db.js";

/* =====================================================
   GET ALL PARTICIPANTS FOR CHECK-IN
   GET /api/checkin
===================================================== */

export const getCheckInParticipants = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                p.id,
                p.workshop_id,
                p.full_name,
                p.email,
                p.phone,
                p.organization,
                p.designation,
                p.attendance_status,
                p.check_in_time,
                p.check_out_time,
                w.title AS workshop_title
            FROM participants p
            LEFT JOIN workshops w
                ON p.workshop_id = w.id
            ORDER BY p.id DESC
        `);

        return res.status(200).json({
            success: true,
            participants: rows
        });

    } catch (error) {

        console.error(
            "GET CHECK-IN PARTICIPANTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load participants"
        });
    }
};


/* =====================================================
   CHECK IN
   POST /api/checkin/check-in
===================================================== */

export const checkInParticipant = async (req, res) => {
    try {

        const {
            participant_id
        } = req.body;


        if (!participant_id) {
            return res.status(400).json({
                success: false,
                message: "Participant ID is required"
            });
        }


        const [rows] = await pool.query(
            `
            SELECT
                id,
                attendance_status
            FROM participants
            WHERE id = ?
            `,
            [participant_id]
        );


        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Participant not found"
            });
        }


        if (
            rows[0].attendance_status ===
            "checked_in"
        ) {
            return res.status(400).json({
                success: false,
                message: "Participant already checked in"
            });
        }


        if (
            rows[0].attendance_status ===
            "checked_out"
        ) {
            return res.status(400).json({
                success: false,
                message: "Participant already checked out"
            });
        }


        await pool.query(
            `
            UPDATE participants
            SET
                attendance_status = 'checked_in',
                check_in_time = NOW()
            WHERE id = ?
            `,
            [participant_id]
        );


        return res.status(200).json({
            success: true,
            message: "Check-in Successful"
        });

    } catch (error) {

        console.error(
            "CHECK-IN ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Check-in Failed"
        });
    }
};


/* =====================================================
   CHECK OUT
   POST /api/checkin/check-out
===================================================== */

export const checkOutParticipant = async (req, res) => {
    try {

        const {
            participant_id
        } = req.body;


        if (!participant_id) {
            return res.status(400).json({
                success: false,
                message: "Participant ID is required"
            });
        }


        const [rows] = await pool.query(
            `
            SELECT
                id,
                attendance_status
            FROM participants
            WHERE id = ?
            `,
            [participant_id]
        );


        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Participant not found"
            });
        }


        if (
            rows[0].attendance_status !==
            "checked_in"
        ) {
            return res.status(400).json({
                success: false,
                message: "Participant is not checked in"
            });
        }


        await pool.query(
            `
            UPDATE participants
            SET
                attendance_status = 'checked_out',
                check_out_time = NOW()
            WHERE id = ?
            `,
            [participant_id]
        );


        return res.status(200).json({
            success: true,
            message: "Check-out Successful"
        });

    } catch (error) {

        console.error(
            "CHECK-OUT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Check-out Failed"
        });
    }
};