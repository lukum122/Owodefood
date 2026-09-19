import "dotenv/config";
import { db } from "./src/db/index.ts";
import { products } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

// One-time fix: addon groups store a snapshot copy of each addon's
// name/price at the moment it was added to the group, not a live
// reference back to the product's own addon list. Any addon renamed or
// deleted before the code fix went in is still sitting stale inside
// whatever groups already included it. This re-syncs every existing
// product's addon groups against its own current, correct addon list --
// updating any mismatched name/price, and removing any addon that's
// been deleted from the master list but still lingers as a "ghost"
// inside a group.
async function fixAddonGroupSync() {
  console.log("Connecting to database:", process.env.DATABASE_URL ? "URL Found" : "URL MISSING!");

  const allProducts = await db.select().from(products);
  console.log(`Checking ${allProducts.length} products...`);

  let productsFixed = 0;
  let addonsFixed = 0;
  let addonsRemoved = 0;

  for (const product of allProducts) {
    const masterAddons: any[] = Array.isArray(product.addons) ? product.addons : [];
    const groups: any[] = Array.isArray(product.addonGroups) ? product.addonGroups : [];
    if (groups.length === 0) continue;

    let productChanged = false;

    const fixedGroups = groups.map((group) => {
      const groupAddons: any[] = Array.isArray(group.addons) ? group.addons : [];
      const fixedGroupAddons: any[] = [];

      for (const groupAddon of groupAddons) {
        const master = masterAddons.find((a) => a.id === groupAddon.id);
        if (!master) {
          // Addon was deleted from the product's own list entirely --
          // drop the stale ghost copy from the group too.
          addonsRemoved++;
          productChanged = true;
          continue;
        }
        if (master.name !== groupAddon.name || master.price !== groupAddon.price) {
          addonsFixed++;
          productChanged = true;
          fixedGroupAddons.push({ ...groupAddon, name: master.name, price: master.price });
        } else {
          fixedGroupAddons.push(groupAddon);
        }
      }

      return { ...group, addons: fixedGroupAddons };
    });

    if (productChanged) {
      await db.update(products)
        .set({ addonGroups: fixedGroups })
        .where(eq(products.id, product.id));
      productsFixed++;
      console.log(`Fixed: "${product.name}" (${product.id})`);
    }
  }

  console.log("\nDone.");
  console.log(`Products updated: ${productsFixed}`);
  console.log(`Stale addon copies corrected: ${addonsFixed}`);
  console.log(`Ghost addons removed: ${addonsRemoved}`);
  process.exit(0);
}

fixAddonGroupSync().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
