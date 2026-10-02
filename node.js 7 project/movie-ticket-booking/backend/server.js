
const express = require("express");
const cors = require("cors");
const prisma = require("./src/config/prisma");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const movieRoutes = require("./src/routes/movieRoutes");
const theatreRoutes = require("./src/routes/theatreRoutes");
const screenRoutes = require("./src/routes/screenRoutes");
const showRoutes = require("./src/routes/showRoutes");
const seatRoutes = require("./src/routes/seatRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");

const app = express();

const PORT = 5000;

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ===============================
// Body Parser
// ===============================
app.use(express.json());

// ===============================
// Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/bookings", bookingRoutes);

// ===============================
// Home
// ===============================
app.get("/", (req, res) => {
  res.json({
    message: "Movie Ticket Booking API is running",
  });
});

// ===============================
// Health Check
// ===============================
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "OK",
      database: "Connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
    });
  }
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
