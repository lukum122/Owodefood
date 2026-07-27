import "dotenv/config";
import { db } from "./src/db/index.ts";
import { users } from "./src/db/schema.ts";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  console.log("Connecting to database:", process.env.DATABASE_URL ? "URL Found" : "URL MISSING!");
  try {
    const hashedPin = await bcrypt.hash("9880", 10);
    await db.insert(users).values({
      id: "admin-1",
      email: "azeezlukman122@gmail.com",
      name: "Azeez Lukman",
      phone: "+234 803 123 4567",
      role: "super_admin",
      roles: ["customer", "super_admin"],
      pin: hashedPin,
      createdAt: new Date().toISOString()
    });
    console.log("Admin seeded successfully!");
  } catch (error: any) {
    if (error.code === '23505') {
       console.log("Admin already exists in database!");
    } else {
       console.error("Error seeding:", error);
    }
  }
  process.exit(0);
}

seedAdmin();
