import pool from "../config/db.js";


// Dashboard Summary Report
export const getSummaryReport = async (req, res) => {

    try {

        const [workshops] = await pool.query(
            `
            SELECT COUNT(*) AS totalWorkshops
            FROM workshops
            `
        );


        const [participants] = await pool.query(
            `
            SELECT COUNT(*) AS totalParticipants
            FROM participants
            `
        );


        const [registrations] = await pool.query(
            `
            SELECT COUNT(*) AS totalRegistrations
            FROM registrations
            `
        );


        const [attendance] = await pool.query(
            `
            SELECT COUNT(*) AS totalAttendance
            FROM attendance
            WHERE status='Present'
            `
        );


        res.json({

            success:true,

            data:{
                totalWorkshops:
                workshops[0].totalWorkshops,

                totalParticipants:
                participants[0].totalParticipants,

                totalRegistrations:
                registrations[0].totalRegistrations,

                totalAttendance:
                attendance[0].totalAttendance
            }

        });


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            success:false,
            message:"Report generation failed"
        });

    }

};





// Workshop Wise Report
export const getWorkshopReport = async(req,res)=>{

    try{


        const [data] = await pool.query(
            `
            SELECT

            w.id,
            w.title,

            COUNT(r.id) 
            AS registrations,

            SUM(
                CASE 
                WHEN a.status='Present'
                THEN 1 
                ELSE 0 
                END
            )
            AS attendance


            FROM workshops w


            LEFT JOIN registrations r
            ON w.id=r.workshop_id


            LEFT JOIN attendance a
            ON r.id=a.registration_id


            GROUP BY w.id

            `
        );


        res.json({

            success:true,
            data

        });


    }
    catch(error){

        console.log(error);


        res.status(500).json({

            success:false,
            message:"Workshop report error"

        });

    }

};





// Participant Report

export const getParticipantReport = async(req,res)=>{


    try{


        const [data] = await pool.query(

            `
            SELECT

            p.name,
            p.email,


            COUNT(r.id)
            AS totalWorkshops


            FROM participants p


            LEFT JOIN registrations r

            ON p.id=r.participant_id


            GROUP BY p.id

            `

        );



        res.json({

            success:true,
            data

        });



    }
    catch(error){

        console.log(error);


        res.status(500).json({

            success:false,
            message:"Participant report error"

        });


    }


};