import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";


// =====================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================

dotenv.config();


// =====================================================
// APP SETUP
// =====================================================

const app = express();

const server = http.createServer(app);


// =====================================================
// __dirname FOR ES MODULES
// =====================================================

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);


// =====================================================
// CORS
// =====================================================

app.use(
    cors({

        origin: "http://localhost:5173",

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]

    })
);


// =====================================================
// BODY PARSER
// =====================================================

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// STATIC UPLOAD FILES
// =====================================================

// Main uploads folder
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


// Workshop images specifically
app.use(
    "/uploads/workshops",
    express.static(
        path.join(
            __dirname,
            "uploads",
            "workshops"
        )
    )
);


import pool from "./config/db.js";


// ROUTES
import authRoutes from "./routes/authRoutes.js";

import workshopRoutes from "./routes/workshopRoutes.js";

import participantRoutes from "./routes/participantRoutes.js";

import checkinRoutes from "./routes/checkinRoutes.js";

import announcementRoutes from "./routes/announcementRoutes.js";

import dashboardRoutes from "./routes/dashboardRoutes.js";

import reportRoutes from "./routes/reportRoutes.js";


// API ROUTES
app.use(
    "/api/auth",
    authRoutes
);


app.use(
    "/api/workshops",
    workshopRoutes
);


app.use(
    "/api/participants",
    participantRoutes
);


app.use(
    "/api/checkin",
    checkinRoutes
);


app.use(
    "/api/announcements",
    announcementRoutes
);


app.use(
    "/api/dashboard",
    dashboardRoutes
);


app.use(
    "/api/reports",
    reportRoutes
);

// HEALTH CHECK
app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Workshop Portal Backend API is running"

        });

    }
);


// UPLOAD TEST
app.get(
    "/api/test-upload",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Upload folder is available",

            imageBaseUrl:
                "http://localhost:3001/uploads/workshops/"

        });

    }
);


// 404 HANDLER
app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message: "API route not found",

            path: req.originalUrl

        });

    }
);

// GLOBAL ERROR HANDLER
app.use(
    (error, req, res, next) => {

        console.error(
            "GLOBAL ERROR:",
            error
        );


        res.status(
            error.status || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Internal server error"

        });

    }
);


// SERVER START
const PORT =
    process.env.PORT || 3001;


server.listen(
    PORT,
    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            `Workshop images: http://localhost:${PORT}/uploads/workshops/`
        );

    }
);