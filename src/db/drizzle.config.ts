import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

const getCredentials = () => {
  if (databaseUrl) {
    const isRemote = databaseUrl.includes("supabase") || 
                     databaseUrl.includes("neon") || 
                     databaseUrl.includes(".com");
    return {
      url: databaseUrl,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    };
  }

  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error("Either DATABASE_URL or SQL_* environment variables must be configured.");
  }

  return {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  };
};

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: getCredentials(),
  verbose: true,
});
