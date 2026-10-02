import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

import socketAuth from "./middleware/socketAuth.js";
import socketHandler from "./socket/socketHandler.js";

dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/messages",
    messageRoutes
);

io.use(socketAuth);

io.on(
    "connection",
    (socket) => {
        socketHandler(
            io,
            socket
        );
    }
);

const PORT =
    process.env.PORT || 5050;

server.listen(
    PORT,
    () => {
        console.log(
            `Server running on http://localhost:${PORT}`
        );
    }
);