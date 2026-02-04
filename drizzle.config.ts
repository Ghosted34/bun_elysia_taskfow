import { defineConfig } from "drizzle-kit";
export default defineConfig({
  out: "./config/db/migrations",
  schema: "./config/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_URL!,
  },
  verbose: true,
});
