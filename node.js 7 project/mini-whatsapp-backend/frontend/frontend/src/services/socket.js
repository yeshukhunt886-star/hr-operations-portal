import { io } from "socket.io-client";

const socket = io(
    "http://localhost:3001",
    {
        autoConnect: false,

        transports: [
            "websocket",
            "polling",
        ],
    }
);

// =====================================================
// CONNECT SOCKET WITH CURRENT JWT TOKEN
// =====================================================

export const connectSocket = () => {
    const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    console.log(
        "SOCKET TOKEN EXISTS:",
        !!token
    );

    if (!token) {
        console.error(
            "SOCKET: Access token not found"
        );

        return;
    }

    // IMPORTANT:
    // Always update auth BEFORE socket.connect()
    socket.auth = {
        token: token,
    };

    console.log(
        "SOCKET AUTH SET:",
        socket.auth
    );

    // If socket is already connected,
    // disconnect first so new auth is used.
    if (socket.connected) {
        socket.disconnect();
    }

    socket.connect();
};

// =====================================================
// DISCONNECT SOCKET
// =====================================================

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};

// =====================================================
// CONNECTED
// =====================================================

socket.on("connect", () => {
    console.log(
        "SOCKET CONNECTED:",
        socket.id
    );
});

// =====================================================
// SOCKET ERROR
// =====================================================

socket.on(
    "connect_error",
    (error) => {
        console.error(
            "SOCKET ERROR:",
            error.message
        );
    }
);

export default socket;