import dotenv from "dotenv";
import app from "./app.js";
import { testDatabaseConnection } from "./config/db.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
    try {
        await testDatabaseConnection();

        app.listen(PORT, () => {
            console.log(" Smart Logistics Backend");
            console.log(` Server: http://localhost:${PORT}`);
            console.log(`  Health: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error(" Server startup failed");
        console.error(error.message);

        process.exit(1);
    }
};

startServer();