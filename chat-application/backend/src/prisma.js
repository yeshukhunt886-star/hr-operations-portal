const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const adapter = new PrismaMariaDb({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  database: "chat_application",
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;