import express from "express";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import joinRoutes from "./routes/joinRoutes.js";



dotenv.config();

// IMPORTANT: load relationships
import "./models/index.js";

const app = express();
app.use(express.json());
app.use("/api", joinRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("DB Connected");

    await sequelize.sync({ alter: true });

   app.listen(5000, () => {
      console.log("Server running on http://localhost:5000");
    });
  } catch (err) {
    console.log(err);
  }
}

start();