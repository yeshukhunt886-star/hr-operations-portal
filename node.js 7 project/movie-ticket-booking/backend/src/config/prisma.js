require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "root",
  password: process.env.DB_PASSWORD || "",
  database: "movie_ticket_booking",
  connectionLimit: 5,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;