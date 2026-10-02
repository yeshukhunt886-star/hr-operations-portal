const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
dotenv.config();
const prisma = require("./prisma");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const messageReadRoutes = require("./routes/messageReadRoutes");

const initializeSocket = require("./socket");
const app = express();
const server = http.createServer(app);

// SOCKET.IO
const io = new Server(server, {
  cors: {
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

initializeSocket(io);
// MIDDLEWARE
app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BASIC ROUTES
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Chat Application API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Chat Application Backend is healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Database connection error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/message-reads", messageReadRoutes);

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// SERVER
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Chat Application API running on http://localhost:${PORT}`
  );
});