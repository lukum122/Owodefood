import "dotenv/config";
import { runMigrations, pool } from "./index.ts";

async function main() {
  try {
    console.log("Starting database migrations...");
    await runMigrations();
    console.log("Migrations completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
