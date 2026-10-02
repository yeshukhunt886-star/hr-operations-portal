
import pool from "../config/db.js";


/* =====================================================
   CHECK DUPLICATE PARTICIPANT
===================================================== */

const checkDuplicateParticipant = async (
    workshopId,
    email,
    phone
) => {

    const [rows] = await pool.query(
        `
        SELECT id
        FROM participants
        WHERE workshop_id = ?
        AND (
            email = ?
            OR phone = ?
        )
        LIMIT 1
        `,
        [
            workshopId,
            email,
            phone
        ]
    );

    return rows.length > 0;
};


/* =====================================================
   ADD PARTICIPANT
===================================================== */

export const addParticipant = async (req, res) => {

    try {

        const {
            workshop_id,
            full_name,
            email,
            phone,
            organization,
            designation
        } = req.body;


        /* =============================================
           VALIDATION
        ============================================= */

        if (!workshop_id) {

            return res.status(400).json({
                success: false,
                message: "Workshop is required"
            });

        }


        if (!full_name || !full_name.trim()) {

            return res.status(400).json({
                success: false,
                message: "Participant name is required"
            });

        }


        if (!email || !email.trim()) {

            return res.status(400).json({
                success: false,
                message: "Participant email is required"
            });

        }


        if (!phone || !phone.trim()) {

            return res.status(400).json({
                success: false,
                message: "Participant phone is required"
            });

        }


        /* =============================================
           CHECK WORKSHOP
        ============================================= */

        const [workshopRows] = await pool.query(
            `
            SELECT
                id,
                capacity
            FROM workshops
            WHERE id = ?
            `,
            [workshop_id]
        );


        if (workshopRows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Workshop not found"
            });

        }


        /* =============================================
           CHECK CAPACITY
        ============================================= */

        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM participants
            WHERE workshop_id = ?
            `,
            [workshop_id]
        );


        const registered =
            Number(countRows[0].total) || 0;


        const capacity =
            Number(workshopRows[0].capacity);


        if (
            capacity > 0 &&
            registered >= capacity
        ) {

            return res.status(400).json({
                success: false,
                message: "Workshop capacity is full"
            });

        }


        /* =============================================
           DUPLICATE CHECK
        ============================================= */

        const duplicate =
            await checkDuplicateParticipant(
                workshop_id,
                email.trim(),
                phone.trim()
            );


        if (duplicate) {

            return res.status(409).json({
                success: false,
                message:
                    "Participant with this email or phone is already registered for this workshop"
            });

        }


        /* =============================================
           INSERT PARTICIPANT
        ============================================= */

        const [result] = await pool.query(
            `
            INSERT INTO participants
            (
                workshop_id,
                full_name,
                email,
                phone,
                organization,
                designation,
                attendance_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                workshop_id,
                full_name.trim(),
                email.trim(),
                phone.trim(),
                organization?.trim() || null,
                designation?.trim() || null,
                "registered"
            ]
        );


        return res.status(201).json({

            success: true,

            message:
                "Participant Registered Successfully",

            participant: {
                id: result.insertId,
                workshop_id,
                full_name: full_name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                organization:
                    organization?.trim() || null,
                designation:
                    designation?.trim() || null,
                attendance_status:
                    "registered"
            }

        });

    } catch (error) {

        console.error(
            "ADD PARTICIPANT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to register participant",

            error:
                error.message

        });

    }

};


/* =====================================================
   GET ALL PARTICIPANTS
===================================================== */

export const getParticipants = async (req, res) => {

    try {

        const [rows] = await pool.query(
            `
            SELECT
                p.*,
                w.title AS workshop_title,
                w.workshop_date,
                w.venue
            FROM participants p
            LEFT JOIN workshops w
                ON w.id = p.workshop_id
            ORDER BY p.id DESC
            `
        );


        return res.status(200).json({

            success: true,

            count: rows.length,

            participants: rows

        });

    } catch (error) {

        console.error(
            "GET PARTICIPANTS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load participants",

            error:
                error.message

        });

    }

};


/* =====================================================
   GET PARTICIPANTS BY WORKSHOP
===================================================== */

export const getParticipantsByWorkshop = async (
    req,
    res
) => {

    try {

        const {
            workshopId
        } = req.params;


        const [rows] = await pool.query(
            `
            SELECT
                p.*,
                w.title AS workshop_title,
                w.workshop_date,
                w.venue
            FROM participants p
            LEFT JOIN workshops w
                ON w.id = p.workshop_id
            WHERE p.workshop_id = ?
            ORDER BY p.id DESC
            `,
            [workshopId]
        );


        return res.status(200).json({

            success: true,

            count: rows.length,

            participants: rows

        });

    } catch (error) {

        console.error(
            "GET WORKSHOP PARTICIPANTS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load workshop participants",

            error:
                error.message

        });

    }

};


/* =====================================================
   GET SINGLE PARTICIPANT
===================================================== */

export const getParticipantById = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        const [rows] = await pool.query(
            `
            SELECT
                p.*,
                w.title AS workshop_title,
                w.workshop_date,
                w.venue
            FROM participants p
            LEFT JOIN workshops w
                ON w.id = p.workshop_id
            WHERE p.id = ?
            `,
            [id]
        );


        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Participant not found"

            });

        }


        return res.status(200).json({

            success: true,

            participant: rows[0]

        });

    } catch (error) {

        console.error(
            "GET PARTICIPANT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load participant",

            error:
                error.message

        });

    }

};


/* =====================================================
   UPDATE PARTICIPANT
===================================================== */

export const updateParticipant = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        const {
            workshop_id,
            full_name,
            email,
            phone,
            organization,
            designation
        } = req.body;


        /* =============================================
           CHECK PARTICIPANT
        ============================================= */

        const [existingRows] =
            await pool.query(
                `
                SELECT *
                FROM participants
                WHERE id = ?
                `,
                [id]
            );


        if (existingRows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Participant not found"

            });

        }


        const current =
            existingRows[0];


        const finalWorkshopId =
            workshop_id ||
            current.workshop_id;


        const finalName =
            full_name !== undefined
                ? full_name
                : current.full_name;


        const finalEmail =
            email !== undefined
                ? email
                : current.email;


        const finalPhone =
            phone !== undefined
                ? phone
                : current.phone;


        const finalOrganization =
            organization !== undefined
                ? organization
                : current.organization;


        const finalDesignation =
            designation !== undefined
                ? designation
                : current.designation;


        /* =============================================
           VALIDATION
        ============================================= */

        if (
            !finalName ||
            !String(finalName).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Participant name is required"

            });

        }


        if (
            !finalEmail ||
            !String(finalEmail).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Participant email is required"

            });

        }


        if (
            !finalPhone ||
            !String(finalPhone).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Participant phone is required"

            });

        }


        /* =============================================
           CHECK DUPLICATE
        ============================================= */

        const [duplicateRows] =
            await pool.query(
                `
                SELECT id
                FROM participants
                WHERE workshop_id = ?
                AND id != ?
                AND (
                    email = ?
                    OR phone = ?
                )
                LIMIT 1
                `,
                [
                    finalWorkshopId,
                    id,
                    String(finalEmail).trim(),
                    String(finalPhone).trim()
                ]
            );


        if (duplicateRows.length > 0) {

            return res.status(409).json({

                success: false,

                message:
                    "Another participant with this email or phone already exists in this workshop"

            });

        }


        /* =============================================
           UPDATE
        ============================================= */

        await pool.query(
            `
            UPDATE participants
            SET
                workshop_id = ?,
                full_name = ?,
                email = ?,
                phone = ?,
                organization = ?,
                designation = ?
            WHERE id = ?
            `,
            [
                finalWorkshopId,
                String(finalName).trim(),
                String(finalEmail).trim(),
                String(finalPhone).trim(),
                finalOrganization
                    ? String(finalOrganization).trim()
                    : null,
                finalDesignation
                    ? String(finalDesignation).trim()
                    : null,
                id
            ]
        );


        return res.status(200).json({

            success: true,

            message:
                "Participant Updated Successfully"

        });

    } catch (error) {

        console.error(
            "UPDATE PARTICIPANT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update participant",

            error:
                error.message

        });

    }

};


/* =====================================================
   DELETE PARTICIPANT
===================================================== */

export const deleteParticipant = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        const [rows] = await pool.query(
            `
            SELECT id
            FROM participants
            WHERE id = ?
            `,
            [id]
        );


        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Participant not found"

            });

        }


        await pool.query(
            `
            DELETE FROM participants
            WHERE id = ?
            `,
            [id]
        );


        return res.status(200).json({

            success: true,

            message:
                "Participant Deleted Successfully"

        });

    } catch (error) {

        console.error(
            "DELETE PARTICIPANT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to delete participant",

            error:
                error.message

        });

    }

};

/* =====================================================
CSV IMPORT PARTICIPANTS
===================================================== */

import fs from "fs";
import csv from "csv-parser";


export const importParticipants = async(req,res)=>{

try{


if(!req.file){

return res.status(400).json({

success:false,

message:"CSV file required"

});

}



const participants=[];



fs.createReadStream(req.file.path)

.pipe(csv())

.on("data",(row)=>{


participants.push({

workshop_id: row.workshop_id,

full_name: row.full_name,

email: row.email,

phone: row.phone,

organization: row.organization,

designation: row.designation

});


})


.on("end",async()=>{


for(const p of participants){


await pool.query(

`
INSERT INTO participants
(
workshop_id,
full_name,
email,
phone,
organization,
designation,
attendance_status
)

VALUES(?,?,?,?,?,?,?)

`,

[

p.workshop_id,

p.full_name,

p.email,

p.phone,

p.organization || null,

p.designation || null,

"registered"

]


);


}



return res.status(201).json({

success:true,

message:"CSV imported successfully",

count:participants.length

});


});


}
catch(error){


console.error(
"CSV IMPORT ERROR:",
error
);


return res.status(500).json({

success:false,

message:"CSV import failed",

error:error.message

});


}


};





/* =====================================================
SEARCH PARTICIPANTS
===================================================== */


export const searchParticipants = async(req,res)=>{


try{


const {
query
}=req.query;



const [rows]=await pool.query(

`
SELECT

p.*,

w.title AS workshop_title


FROM participants p


LEFT JOIN workshops w

ON w.id=p.workshop_id


WHERE

p.full_name LIKE ?

OR p.email LIKE ?

OR p.phone LIKE ?

ORDER BY p.id DESC

`,

[

`%${query}%`,

`%${query}%`,

`%${query}%`

]


);



res.json({

success:true,

count:rows.length,

participants:rows

});



}
catch(error){


console.error(
"SEARCH ERROR:",
error
);



res.status(500).json({

success:false,

message:"Search failed"

});


}


};







/* =====================================================
FILTER PARTICIPANTS
===================================================== */


export const filterParticipants = async(req,res)=>{


try{


const {
status,
workshop_id
}=req.query;



let sql=`

SELECT

p.*,

w.title AS workshop_title


FROM participants p


LEFT JOIN workshops w

ON w.id=p.workshop_id


WHERE 1=1

`;



let params=[];



if(status){


sql += ` AND p.attendance_status=?`;

params.push(status);


}



if(workshop_id){


sql += ` AND p.workshop_id=?`;

params.push(workshop_id);


}



sql += ` ORDER BY p.id DESC`;



const [rows]=await pool.query(

sql,

params

);



res.json({

success:true,

count:rows.length,

participants:rows

});



}
catch(error){


console.error(
"FILTER ERROR:",
error
);



res.status(500).json({

success:false,

message:"Filter failed"

});


}


};