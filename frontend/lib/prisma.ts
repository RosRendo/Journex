import { PrismaClient } from "@prisma/client";

// Ensure DATABASE_URL is defined before Prisma initialization to prevent Turbopack crash
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.DIRECT_URL ||
    "postgresql://postgres:zipmu3-cEcsak-jifqyf@localhost:5432/trading_journal?schema=public";
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
