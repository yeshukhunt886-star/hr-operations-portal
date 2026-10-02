import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function enableWal() {
  await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
}
