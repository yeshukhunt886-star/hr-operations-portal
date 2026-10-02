import jwt from "jsonwebtoken";


const socketAuth = (socket, next) => {

    try {

        const token =
            socket.handshake.auth.token;


        if (!token) {

            return next(
                new Error(
                    "Authentication token required"
                )
            );

        }


        const decoded = jwt.verify(

            token,

            process.env.JWT_ACCESS_SECRET

        );


        socket.user = decoded;


        next();


    } catch (error) {

        console.error(
            "Socket Auth Error:",
            error
        );


        next(
            new Error(
                "Invalid or expired token"
            )
        );

    }

};


export default socketAuth;