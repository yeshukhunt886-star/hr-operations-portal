import { io } from "socket.io-client";

const token =
localStorage.getItem(
"accessToken"
);

const socket = io(
"http://localhost:5050",
{
auth: {
token: token,
},

    transports: [
        "websocket",
        "polling",
    ],

    autoConnect: true,
}
);

export default socket;
