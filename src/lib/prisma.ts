import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new pg.Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_SIZE || "15", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("⚠️ Unexpected idle PostgreSQL client error:", err);
});

const adapter = new PrismaPg(pool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

export { prisma, pool };