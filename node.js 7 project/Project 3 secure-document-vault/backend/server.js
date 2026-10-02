import dotenv from "dotenv";
import https from "https";
import fs from "fs";

import app from "./src/app.js";
import { initializeStorage } from "./src/services/storageService.js";

// LOAD ENVIRONMENT VARIABLES
dotenv.config();

// PORT
const PORT = process.env.PORT || 5000;

// HTTPS CERTIFICATE
const sslOptions = {
  pfx: fs.readFileSync("./certs/server.pfx"),
  passphrase:
    process.env.SSL_PASSPHRASE ||
    "SecureVault123!",
};

// CREATE HTTPS SERVER
const server = https.createServer(
  sslOptions,
  app
);

// START SERVER
async function startServer() {
  try {
    // Initialize secure storage
    await initializeStorage();

    server.listen(PORT, () => {
      
      console.log(
        " Secure Document Vault Backend"
      );

      console.log(
        ` HTTPS: https://localhost:${PORT}`
      );

      console.log(
        ` Health: https://localhost:${PORT}/api/health`
      );

      console.log(
        ` DB Health: https://localhost:${PORT}/api/health/db`
      );

      console.log(
        " Storage: initialized"
      );

    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();


// SERVER ERROR
server.on("error", (error) => {
  console.error(
    "HTTPS server error:",
    error
  );
});

// GRACEFUL SHUTDOWN
function shutdown(signal) {
  console.log(
    `\n${signal} received. Shutting down HTTPS server...`
  );

  server.close(() => {
    console.log(
      "HTTPS server stopped."
    );

    process.exit(0);
  });
}

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);