import express from "express";
// import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

import { swaggerDocs } from "./config/swagger.js";

const app = express();

app.use(express.json());

// // Enable CORS
// app.use(cors({
//     origin: "http://localhost:5173",
//     credentials: true
// }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);

swaggerDocs(app);

app.get("/", (req, res) => {
  res.send("Task Management API Running...");
});

export default app;