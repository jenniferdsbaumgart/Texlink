// Prisma configuration for migrations and schema
// In production, DATABASE_URL is injected by Railway
import { defineConfig } from "prisma/config";

// Only load dotenv in development
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv/config");
  } catch (e) {
    // dotenv not available, skip
  }
}

// DATABASE_URL is only required for migrations, not for generate
const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
