import "dotenv/config";
import { db } from "./src/db/index.ts";
import { users } from "./src/db/schema.ts";

async function checkUsers() {
  console.log("Using Database URL:", process.env.DATABASE_URL ? "Exists" : "MISSING");
  try {
    const allUsers = await db.select().from(users);
    console.log("Total users in database:", allUsers.length);
    console.log(allUsers.map(u => ({ id: u.id, email: u.email, roles: u.roles })));
  } catch (error) {
    console.error("Error fetching users:", error);
  }
  process.exit(0);
}

checkUsers();
