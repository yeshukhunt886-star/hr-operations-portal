import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

import db from "./config/db.js";
import redisClient from "./config/redis.js";
import socketHandler from "./socket/socketHandler.js";

import authRoutes from "./routes/authRoutes.js";
import messagesRoutes from "./routes/messagesRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();

// ========================================
// CORS
// ========================================

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

// ========================================
// HTTP SERVER
// ========================================

const server = http.createServer(app);

// ========================================
// SOCKET.IO
// ========================================

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST"]
    }
});

// ⭐ IMPORTANT ⭐
app.set("io", io);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// ========================================
// ROUTES
// ========================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/notifications", notificationRoutes);

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
    res.json({
        message: "Chat App Backend Running",
        redis: redisClient.isReady ? "Connected" : "Disconnected"
    });
});

server.timeout = 10 * 60 * 1000;

// ========================================
// REDIS PUB/SUB
// ========================================

const pubClient = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
});

const subClient = pubClient.duplicate();

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {

        await db.query("SELECT 1");
        console.log(" MySQL Connected");

        if (!redisClient.isReady) {
            await redisClient.connect();
        }

        console.log(" Redis Main Client Connected");

        await Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]);

        console.log(" Redis Pub/Sub Connected");

        io.adapter(createAdapter(pubClient, subClient));

        console.log("Socket.IO Redis Adapter Enabled");

        socketHandler(io);

        server.listen(PORT, () => {
            console.log(` Server running on http://localhost:${PORT}`);
        });

    } catch (err) {

        console.error(err);
        process.exit(1);

    }
};

startServer();