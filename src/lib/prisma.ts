import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

let connectionString = `${process.env.DATABASE_URL}`;
if (!connectionString.includes("connect_timeout=")) {
  const sep = connectionString.includes("?") ? "&" : "?";
  connectionString = `${connectionString}${sep}connect_timeout=30`;
}

const pool = new pg.Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_SIZE || "10", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30s to comfortably tolerate Neon serverless compute cold starts
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  // Idle client errors occur when Neon or PgBouncer suspends/terminates an idle connection.
  // pg-pool automatically discards dead clients and recreates them on the next request.
  console.warn("⚠️ [pg.Pool] Idle connection terminated or reset by pooler:", err?.message || err);
});

const adapter = new PrismaPg(pool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

/**
 * Retries a database operation if it fails due to a transient connection dropout or serverless cold start.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errMsg = `${err?.message || ""} ${err?.cause?.message || ""}`;
      const isConnError =
        errMsg.includes("Connection terminated") ||
        errMsg.includes("connection timeout") ||
        errMsg.includes("Connection closed") ||
        err?.code === "ECONNRESET" ||
        err?.code === "57P01";

      if (attempt <= retries && isConnError) {
        console.warn(`⚠️ [Prisma] Transient connection drop encountered. Retrying in ${delayMs}ms (attempt ${attempt}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
}

export { prisma, pool };