import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


export const generateToken = (user) => {

    console.log("Generating Token...");
    console.log("JWT_SECRET:", process.env.JWT_SECRET);


    const token = jwt.sign(

        {
            id: user.id,
            email: user.email,
            role: user.role
        },

        process.env.JWT_SECRET,

        {
            expiresIn: "1d"
        }

    );


    console.log("Generated Token:", token);


    return token;

};



export const verifyToken = (token) => {

    return jwt.verify(
        token,
        process.env.JWT_SECRET
    );

};