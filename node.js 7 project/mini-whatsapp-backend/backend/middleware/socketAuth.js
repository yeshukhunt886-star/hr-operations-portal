const socketAuth = (
    socket,
    next
) => {
    try {
        const token =
            socket.handshake.auth?.token;

        if (!token) {
            return next(
                new Error("Token Missing")
            );
        }

        const decoded =
            verifyAccessToken(token);

        socket.user = decoded;

        console.log(
            "SOCKET AUTHENTICATED:",
            decoded
        );

        next();

    } catch (error) {
        console.error(
            "SOCKET AUTH ERROR:",
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