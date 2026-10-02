import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createAdapter } from "@socket.io/redis-adapter";

import redisClient, {
    connectRedis
} from "./config/redis.js";

import socketHandler from "./socket/socketHandler.js";

dotenv.config();

const app = express();

const server =
    http.createServer(app);


// ==========================================
// SOCKET.IO SERVER
// ==========================================

const io = new Server(
    server,
    {
        cors: {
            origin: "*",
            methods: [
                "GET",
                "POST"
            ]
        }
    }
);


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
    express.json()
);

app.use(
    express.static("public")
);


// ==========================================
// SERVER 2 HOME ROUTE
// ==========================================

app.get(
    "/",
    (req, res) => {

        res.json({
            message:
                "Chat App Backend - Server 2",

            server:
                "Node.js Instance 2",

            port:
                3002,

            redis:
                redisClient.isReady
                    ? "Connected"
                    : "Disconnected"
        });

    }
);


// ==========================================
// START SERVER 2
// ==========================================

const PORT = 3002;


const startServer2 =
    async () => {

        try {

            // ======================================
            // CONNECT MAIN REDIS CLIENT
            // ======================================

            await connectRedis();


            console.log(
                "Server 2: Redis Connected"
            );


            // ======================================
            // CREATE PUB CLIENT
            // ======================================

            const pubClient =
                redisClient.duplicate();


            // ======================================
            // CREATE SUB CLIENT
            // ======================================

            const subClient =
                redisClient.duplicate();


            // ======================================
            // CONNECT PUB/SUB
            // ======================================

            await Promise.all([
                pubClient.connect(),
                subClient.connect()
            ]);


            console.log(
                "Server 2: Redis Pub/Sub Connected"
            );


            // ======================================
            // SOCKET.IO REDIS ADAPTER
            // ======================================

            io.adapter(
                createAdapter(
                    pubClient,
                    subClient
                )
            );


            console.log(
                "Server 2: Socket.IO Redis Adapter Enabled"
            );


            // ======================================
            // SOCKET HANDLER
            // ======================================

            socketHandler(io);


            // ======================================
            // START SERVER 2
            // ======================================

            server.listen(
                PORT,
                () => {

                    console.log(
                        "Server 2 running on port 3002"
                    );

                    console.log(
                        "http://localhost:3002"
                    );

                }
            );


        } catch (error) {

            console.error(
                "Server 2 startup failed:",
                error
            );
            process.exit(1);
        }
    };
startServer2();