import { db } from "./index.ts";
import { systemSettings, categories, paymentGateways } from "./schema.ts";

export const seedDefaultData = async () => {
  console.log("[Database] Starting version-aware seeding...");

  // 1. Seed System Settings
  const defaultSettings = [
    { key: "app_name", value: "Owode Food" },
    { key: "support_email", value: "support@owodefood.com" },
    { key: "currency", value: "NGN" },
    { key: "delivery_fee_base", value: "500" },
    { key: "service_fee_base", value: "100" }
  ];

  for (const setting of defaultSettings) {
    try {
      await db.insert(systemSettings)
        .values(setting)
        .onConflictDoNothing({ target: systemSettings.key });
    } catch (e) {
      console.error(`[Database] Failed to seed setting ${setting.key}:`, e);
    }
  }

  // 2. Seed Default Categories (if missing)
  const defaultCategories = [
    { id: "cat-1", name: "Fast Food", icon: "burger" },
    { id: "cat-2", name: "Local Dishes", icon: "pot" },
    { id: "cat-3", name: "Drinks", icon: "cup" },
    { id: "cat-4", name: "Snacks", icon: "cookie" }
  ];

  for (const cat of defaultCategories) {
    try {
      await db.insert(categories)
        .values(cat)
        .onConflictDoNothing({ target: categories.id });
    } catch (e) {
      console.error(`[Database] Failed to seed category ${cat.id}:`, e);
    }
  }

  // 3. Seed Payment Gateways
  const gateways = [
    { id: "paystack", name: "Paystack", desc: "Pay with your card or bank account via Paystack", isEnabled: true, isActive: true },
    { id: "monnify", name: "Monnify", desc: "Pay with Monnify virtual accounts", isEnabled: true, isActive: false },
    { id: "wallet", name: "Owode Wallet", desc: "Pay instantly from your funded wallet", isEnabled: true, isActive: true }
  ];

  for (const gateway of gateways) {
    try {
      await db.insert(paymentGateways)
        .values(gateway)
        .onConflictDoNothing({ target: paymentGateways.id });
    } catch (e) {
      console.error(`[Database] Failed to seed gateway ${gateway.id}:`, e);
    }
  }

  console.log("[Database] Version-aware seeding completed successfully.");
};
