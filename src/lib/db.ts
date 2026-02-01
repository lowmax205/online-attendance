import { PrismaClient } from "@prisma/client";

/**
 * Get the appropriate database URL based on the environment
 */
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV;

  // If DATABASE_URL is set, use it (for local development and build)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // In production, fall back to Supabase connection
  if (nodeEnv === "production") {
    const productionUrl = process.env.POSTGRES_URL_NON_POOLING;
    if (!productionUrl) {
      throw new Error(
        "POSTGRES_URL_NON_POOLING is required in production when DATABASE_URL is not set",
      );
    }
    return productionUrl;
  }

  throw new Error("DATABASE_URL is required");
} /**
 * Prisma Client Singleton
 * Prevents multiple instances in development due to hot-reloading
 * See: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as any as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Graceful shutdown on process termination
 */
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await db.$disconnect();
  });
}
