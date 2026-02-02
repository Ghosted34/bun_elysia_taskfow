import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "../../src/config";
import * as schema from "../db/schema";

const psql = postgres(config.psql.url!, {
  connect_timeout: 10, // Connection timeout in seconds
  prepare: true,
});
export const db = drizzle(psql, {
  schema,
  logger: config.app.env === "development" || config.app.env === "dev",
});

// Type for database instance
export type Database = typeof db;

// Health check function
export async function checkDatabaseConnection() {
  try {
    await psql`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  await psql.end();
}
