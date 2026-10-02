import express from "express";
import cors from "cors";


import locationRoutes from "./routes/locationRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import graphRoutes from "./routes/graphRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import deliveryTaskRoutes from "./routes/deliveryTaskRoutes.js";
import bulkImportRoutes from "./routes/bulkImportRoutes.js";

const app = express();

app.use(cors());

app.use(express.json({
    limit: "2mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "2mb"
}));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Smart Logistics API is running"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "smart-logistics-backend",
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});


app.use("/api/locations", locationRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/graph",graphRoutes);
app.use("/api/routes",routeRoutes);
app.use("/api/delivery-tasks", deliveryTaskRoutes);
app.use("/api/bulk-imports", bulkImportRoutes);

export default app;