import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../config/db.js";



// ================= REGISTER =================

export const register = async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        console.log("Register Data:", req.body);



        // Validation

       if (!name || !email || !password) {

    return res.status(400).json({

        success:false,
        message:"Name, email and password are required"

    });

}



const emailRegex =
/^[^\s@]+@[^\s@]+\.[^\s@]+$/;


if(!emailRegex.test(email)){

    return res.status(400).json({

        success:false,
        message:"Invalid email format"

    });

}



if(password.length < 6){

    return res.status(400).json({

        success:false,
        message:"Password must be minimum 6 characters"

    });

}



const allowedRoles = [
    "admin",
    "staff",
    "viewer",
    "checkin_staff"
];


if(role && !allowedRoles.includes(role)){

    return res.status(400).json({

        success:false,
        message:"Invalid role"

    });

}



        // Check user already exists

        const [user] = await db.query(
            "SELECT id FROM users WHERE email=?",
            [email]
        );


        if(user.length > 0){

            return res.status(400).json({

                success:false,
                message:"Email already registered"

            });

        }



        // Hash Password

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );



        // Insert User

        await db.query(

            `
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES(?,?,?,?)
            `,

            [
                name,
                email,
                hashedPassword,
                role || "viewer"
            ]

        );



        res.status(201).json({

            success:true,
            message:"User registered successfully"

        });



    }
    catch(error){

        console.log(
            "Register Error:",
            error
        );


        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};






// ================= LOGIN =================

export const login = async(req,res)=>{

    try{


        const {
            email,
            password
        } = req.body;


if(!email || !password){

    return res.status(400).json({

        success:false,
        message:"Email and password required"

    });

}



const emailRegex =
/^[^\s@]+@[^\s@]+\.[^\s@]+$/;


if(!emailRegex.test(email)){

    return res.status(400).json({

        success:false,
        message:"Invalid email format"

    });

}



        // Find User

        const [rows] = await db.query(

            "SELECT * FROM users WHERE email=?",

            [email]

        );



        if(rows.length === 0){

            return res.status(401).json({

                success:false,
                message:"Invalid email or password"

            });

        }



        const user = rows[0];



        // Compare Password

        const match = await bcrypt.compare(

            password,

            user.password

        );



        if(!match){

            return res.status(401).json({

                success:false,
                message:"Invalid email or password"

            });

        }





        // Create JWT Token

        const token = jwt.sign(

            {
                id:user.id,
                role:user.role,
                email:user.email
            },


            process.env.JWT_SECRET,


            {
                expiresIn:"1d"
            }

        );





        res.json({

            success:true,

            message:"Login successful",


            token,


            user:{

                id:user.id,

                name:user.name,

                email:user.email,

                role:user.role

            }

        });



    }
    catch(error){


        console.log(
            "Login Error:",
            error
        );


        res.status(500).json({

            success:false,
            message:error.message

        });


    }

};