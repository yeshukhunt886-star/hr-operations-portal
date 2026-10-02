import { config } from "./config.js";
import { logger } from "./logger.js";
import { enableWal, prisma } from "./prisma.js";
import { createApp } from "./app.js";
import { startJobQueue, stopJobQueue } from "./services/jobQueue.js";

const app = createApp();

async function main() {
  await enableWal();
  startJobQueue();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "Warehouse API listening");
  });

  const shutdown = async () => {
    stopJobQueue();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err: err.message }, "Failed to start");
  process.exit(1);
});
