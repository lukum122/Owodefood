import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const { Pool } = pg;

export const createPool = () => {
  if (process.env.DATABASE_URL) {
    const isRemote = process.env.DATABASE_URL.includes("supabase") || 
                     process.env.DATABASE_URL.includes("neon") || 
                     process.env.DATABASE_URL.includes(".com") ||
                     process.env.DATABASE_URL.includes(".tech");
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 15000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});

export const db = drizzle(pool, { schema });
