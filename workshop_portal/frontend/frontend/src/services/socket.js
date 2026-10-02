
import { io } from "socket.io-client";

const socket = io(
    "http://localhost:3001",
    {
        autoConnect: false,
        transports: ["websocket", "polling"]
    }
);

socket.on("connect", () => {

    console.log(
        "Socket Connected:",
        socket.id
    );

});

socket.on("connect_error", (error) => {

    console.error(
        "Socket Connection Error:",
        error.message
    );

});

socket.on("disconnect", (reason) => {

    console.log(
        "Socket Disconnected:",
        reason
    );

});

export default socket;
