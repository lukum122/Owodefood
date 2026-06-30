import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import {
  users,
  vendors,
  products,
  orders,
  orderItems,
  riders,
  paymentGateways,
  userSavedAddresses,
  extremeLocationTiers,
  extremeLocations,
  employees,
  systemSettings,
  reviews,
} from "./src/db/schema.ts";
import { eq, sql } from "drizzle-orm";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

// 2. Database Synchronization Endpoint: LOAD
app.get("/api/sync/load", async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const allVendors = await db.select().from(vendors);
    const allProducts = await db.select().from(products);
    const allOrders = await db.select().from(orders);
    const allOrderItems = await db.select().from(orderItems);
    const allRiders = await db.select().from(riders);
    const allPaymentGateways = await db.select().from(paymentGateways);
    const allSavedAddresses = await db.select().from(userSavedAddresses);
    const allExtremeLocationTiers = await db.select().from(extremeLocationTiers);
    const allExtremeLocations = await db.select().from(extremeLocations);
    const allEmployees = await db.select().from(employees);
    const allSystemSettings = await db.select().from(systemSettings);
    const allReviews = await db.select().from(reviews);

    res.json({
      users: allUsers,
      vendors: allVendors,
      products: allProducts,
      orders: allOrders.map((o) => {
        // Attach items to orders
        const items = allOrderItems.filter((oi) => oi.orderId === o.id);
        return { ...o, items };
      }),
      riders: allRiders,
      paymentGateways: allPaymentGateways,
      savedAddresses: allSavedAddresses,
      extremeLocationTiers: allExtremeLocationTiers,
      extremeLocations: allExtremeLocations,
      employees: allEmployees,
      reviews: allReviews,
      systemSettings: allSystemSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>),
    });
  } catch (error) {
    console.error("Failed to load sync data from Cloud SQL:", error);
    res.status(500).json({ error: "Failed to load database. Please try again later." });
  }
});

// 3. Database Synchronization Endpoint: SAVE
app.post("/api/sync/save", async (req, res) => {
  try {
    const { type, payload } = req.body;
    if (!type || !payload) {
      return res.status(400).json({ error: "Missing type or payload" });
    }

    switch (type) {
      case "USERS_BULK":
        for (const u of payload) {
          await db.insert(users).values({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            role: u.role,
            gender: u.gender || null,
            createdAt: u.createdAt,
          }).onConflictDoUpdate({
            target: users.id,
            set: {
              email: u.email,
              name: u.name,
              phone: u.phone,
              role: u.role,
              gender: u.gender || null,
            },
          });
        }
        break;

      case "USER_UPSERT":
        await db.insert(users).values({
          id: payload.id,
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          role: payload.role,
          gender: payload.gender || null,
          createdAt: payload.createdAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: users.id,
          set: {
            email: payload.email,
            name: payload.name,
            phone: payload.phone,
            role: payload.role,
            gender: payload.gender || null,
          },
        });
        break;

      case "VENDORS_BULK":
        for (const v of payload) {
          await db.insert(vendors).values({
            id: v.id,
            userId: v.userId,
            name: v.name,
            description: v.description,
            cuisine: v.cuisine,
            image: v.image,
            rating: Number(v.rating) || 5.0,
            address: v.address,
            status: v.status,
            createdAt: v.createdAt,
            openingTime: v.openingTime,
            closingTime: v.closingTime,
            openingDays: v.openingDays,
            coverImage: v.coverImage,
            category: v.category,
            prepTime: v.prepTime,
            deliveryFee: v.deliveryFee,
            serviceFee: v.serviceFee,
            serviceFeeType: v.serviceFeeType,
            serviceFeeValue: v.serviceFeeValue,
            commissionType: v.commissionType,
            commissionValue: v.commissionValue,
            freeDelivery: v.freeDelivery,
          }).onConflictDoUpdate({
            target: vendors.id,
            set: {
              userId: v.userId,
              name: v.name,
              description: v.description,
              cuisine: v.cuisine,
              image: v.image,
              rating: Number(v.rating) || 5.0,
              address: v.address,
              status: v.status,
              openingTime: v.openingTime,
              closingTime: v.closingTime,
              openingDays: v.openingDays,
              coverImage: v.coverImage,
              category: v.category,
              prepTime: v.prepTime,
              deliveryFee: v.deliveryFee,
              serviceFee: v.serviceFee,
              serviceFeeType: v.serviceFeeType,
              serviceFeeValue: v.serviceFeeValue,
              commissionType: v.commissionType,
              commissionValue: v.commissionValue,
              freeDelivery: v.freeDelivery,
            },
          });
        }
        break;

      case "VENDOR_UPSERT":
        await db.insert(vendors).values({
          id: payload.id,
          userId: payload.userId,
          name: payload.name,
          description: payload.description,
          cuisine: payload.cuisine,
          image: payload.image,
          rating: Number(payload.rating) || 5.0,
          address: payload.address,
          status: payload.status,
          createdAt: payload.createdAt || new Date().toISOString(),
          openingTime: payload.openingTime,
          closingTime: payload.closingTime,
          openingDays: payload.openingDays,
          coverImage: payload.coverImage,
          category: payload.category,
          prepTime: payload.prepTime,
          deliveryFee: payload.deliveryFee,
          serviceFee: payload.serviceFee,
          serviceFeeType: payload.serviceFeeType,
          serviceFeeValue: payload.serviceFeeValue,
          commissionType: payload.commissionType,
          commissionValue: payload.commissionValue,
          freeDelivery: payload.freeDelivery,
        }).onConflictDoUpdate({
          target: vendors.id,
          set: {
            userId: payload.userId,
            name: payload.name,
            description: payload.description,
            cuisine: payload.cuisine,
            image: payload.image,
            rating: Number(payload.rating) || 5.0,
            address: payload.address,
            status: payload.status,
            openingTime: payload.openingTime,
            closingTime: payload.closingTime,
            openingDays: payload.openingDays,
            coverImage: payload.coverImage,
            category: payload.category,
            prepTime: payload.prepTime,
            deliveryFee: payload.deliveryFee,
            serviceFee: payload.serviceFee,
            serviceFeeType: payload.serviceFeeType,
            serviceFeeValue: payload.serviceFeeValue,
            commissionType: payload.commissionType,
            commissionValue: payload.commissionValue,
            freeDelivery: payload.freeDelivery,
          },
        });
        break;

      case "PRODUCTS_BULK":
        for (const p of payload) {
          await db.insert(products).values({
            id: p.id,
            vendorId: p.vendorId,
            name: p.name,
            description: p.description,
            price: Math.round(p.price),
            image: p.image,
            category: p.category,
            isAvailable: p.isAvailable,
            createdAt: p.createdAt,
            addons: p.addons,
            maxAddons: p.maxAddons,
          }).onConflictDoUpdate({
            target: products.id,
            set: {
              vendorId: p.vendorId,
              name: p.name,
              description: p.description,
              price: Math.round(p.price),
              image: p.image,
              category: p.category,
              isAvailable: p.isAvailable,
              addons: p.addons,
              maxAddons: p.maxAddons,
            },
          });
        }
        break;

      case "PRODUCT_UPSERT":
        await db.insert(products).values({
          id: payload.id,
          vendorId: payload.vendorId,
          name: payload.name,
          description: payload.description,
          price: Math.round(payload.price),
          image: payload.image,
          category: payload.category,
          isAvailable: payload.isAvailable,
          createdAt: payload.createdAt || new Date().toISOString(),
          addons: payload.addons,
          maxAddons: payload.maxAddons,
        }).onConflictDoUpdate({
          target: products.id,
          set: {
            vendorId: payload.vendorId,
            name: payload.name,
            description: payload.description,
            price: Math.round(payload.price),
            image: payload.image,
            category: payload.category,
            isAvailable: payload.isAvailable,
            addons: payload.addons,
            maxAddons: payload.maxAddons,
          },
        });
        break;

      case "PRODUCT_DELETE":
        await db.delete(products).where(eq(products.id, payload.id));
        break;

      case "ORDERS_BULK":
        for (const o of payload) {
          await db.insert(orders).values({
            id: o.id,
            customerId: o.customerId,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            vendorId: o.vendorId,
            vendorName: o.vendorName,
            riderId: o.riderId,
            riderName: o.riderName,
            status: o.status,
            totalAmount: Math.round(o.totalAmount),
            deliveryAddress: o.deliveryAddress,
            paymentMethod: o.paymentMethod,
            createdAt: o.createdAt,
            serviceFee: o.serviceFee,
            deliveryFee: o.deliveryFee,
            tax: o.tax,
          }).onConflictDoUpdate({
            target: orders.id,
            set: {
              status: o.status,
              riderId: o.riderId,
              riderName: o.riderName,
            },
          });

          if (o.items && Array.isArray(o.items)) {
            for (const item of o.items) {
              await db.insert(orderItems).values({
                id: item.id || `${o.id}-${item.productId}`,
                orderId: o.id,
                productId: item.productId,
                name: item.name,
                price: Math.round(item.price),
                quantity: item.quantity,
              }).onConflictDoUpdate({
                target: orderItems.id,
                set: {
                  quantity: item.quantity,
                },
              });
            }
          }
        }
        break;

      case "ORDER_UPSERT":
        await db.insert(orders).values({
          id: payload.id,
          customerId: payload.customerId,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          vendorId: payload.vendorId,
          vendorName: payload.vendorName,
          riderId: payload.riderId,
          riderName: payload.riderName,
          status: payload.status,
          totalAmount: Math.round(payload.totalAmount),
          deliveryAddress: payload.deliveryAddress,
          paymentMethod: payload.paymentMethod,
          createdAt: payload.createdAt || new Date().toISOString(),
          serviceFee: payload.serviceFee,
          deliveryFee: payload.deliveryFee,
          tax: payload.tax,
        }).onConflictDoUpdate({
          target: orders.id,
          set: {
            status: payload.status,
            riderId: payload.riderId,
            riderName: payload.riderName,
          },
        });

        if (payload.items && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            await db.insert(orderItems).values({
              id: item.id || `${payload.id}-${item.productId}`,
              orderId: payload.id,
              productId: item.productId,
              name: item.name,
              price: Math.round(item.price),
              quantity: item.quantity,
            }).onConflictDoUpdate({
              target: orderItems.id,
              set: {
                quantity: item.quantity,
              },
            });
          }
        }
        break;

      case "RIDERS_BULK":
        for (const r of payload) {
          await db.insert(riders).values({
            id: r.id,
            userId: r.userId,
            name: r.name,
            phone: r.phone,
            vehicleType: r.vehicleType,
            status: r.status,
            isAvailable: r.isAvailable,
            createdAt: r.createdAt,
          }).onConflictDoUpdate({
            target: riders.id,
            set: {
              name: r.name,
              phone: r.phone,
              vehicleType: r.vehicleType,
              status: r.status,
              isAvailable: r.isAvailable,
            },
          });
        }
        break;

      case "RIDER_UPSERT":
        await db.insert(riders).values({
          id: payload.id,
          userId: payload.userId,
          name: payload.name,
          phone: payload.phone,
          vehicleType: payload.vehicleType,
          status: payload.status,
          isAvailable: payload.isAvailable,
          createdAt: payload.createdAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: riders.id,
          set: {
            name: payload.name,
            phone: payload.phone,
            vehicleType: payload.vehicleType,
            status: payload.status,
            isAvailable: payload.isAvailable,
          },
        });
        break;

      case "PAYMENT_GATEWAYS_BULK":
        for (const pg of payload) {
          await db.insert(paymentGateways).values({
            id: pg.id,
            name: pg.name,
            desc: pg.desc,
            isEnabled: pg.isEnabled,
            apiKey: pg.apiKey,
            secretKey: pg.secretKey,
            contractCode: pg.contractCode,
            bankName: pg.bankName,
            accountNumber: pg.accountNumber,
            accountName: pg.accountName,
            isActive: pg.isActive,
          }).onConflictDoUpdate({
            target: paymentGateways.id,
            set: {
              name: pg.name,
              desc: pg.desc,
              isEnabled: pg.isEnabled,
              apiKey: pg.apiKey,
              secretKey: pg.secretKey,
              contractCode: pg.contractCode,
              bankName: pg.bankName,
              accountNumber: pg.accountNumber,
              accountName: pg.accountName,
              isActive: pg.isActive,
            },
          });
        }
        break;

      case "USER_SAVED_ADDRESSES_BULK":
        for (const sa of payload) {
          await db.insert(userSavedAddresses).values({
            id: sa.id,
            userId: sa.userId,
            streetAddress: sa.streetAddress,
            district: sa.district,
            landmarkNote: sa.landmarkNote,
          }).onConflictDoUpdate({
            target: userSavedAddresses.id,
            set: {
              streetAddress: sa.streetAddress,
              district: sa.district,
              landmarkNote: sa.landmarkNote,
            },
          });
        }
        break;

      case "USER_SAVED_ADDRESS_UPSERT":
        await db.insert(userSavedAddresses).values({
          id: payload.id,
          userId: payload.userId,
          streetAddress: payload.streetAddress,
          district: payload.district,
          landmarkNote: payload.landmarkNote,
        }).onConflictDoUpdate({
          target: userSavedAddresses.id,
          set: {
            streetAddress: payload.streetAddress,
            district: payload.district,
            landmarkNote: payload.landmarkNote,
          },
        });
        break;

      case "USER_SAVED_ADDRESS_DELETE":
        await db.delete(userSavedAddresses).where(eq(userSavedAddresses.id, payload.id));
        break;

      case "EXTREME_LOCATION_TIERS_BULK":
        for (const elt of payload) {
          await db.insert(extremeLocationTiers).values({
            id: elt.id,
            name: elt.name,
            surcharge: Math.round(elt.surcharge),
          }).onConflictDoUpdate({
            target: extremeLocationTiers.id,
            set: {
              name: elt.name,
              surcharge: Math.round(elt.surcharge),
            },
          });
        }
        break;

      case "EXTREME_LOCATIONS_BULK":
        for (const el of payload) {
          await db.insert(extremeLocations).values({
            id: el.id,
            name: el.name,
            tierId: el.tierId,
          }).onConflictDoUpdate({
            target: extremeLocations.id,
            set: {
              name: el.name,
              tierId: el.tierId,
            },
          });
        }
        break;

      case "EXTREME_LOCATION_UPSERT":
        await db.insert(extremeLocations).values({
          id: payload.id,
          name: payload.name,
          tierId: payload.tierId,
        }).onConflictDoUpdate({
          target: extremeLocations.id,
          set: {
            name: payload.name,
            tierId: payload.tierId,
          },
        });
        break;

      case "EXTREME_LOCATION_DELETE":
        await db.delete(extremeLocations).where(eq(extremeLocations.id, payload.id));
        break;

      case "EMPLOYEES_BULK":
        for (const emp of payload) {
          await db.insert(employees).values({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            phone: emp.phone,
            department: emp.department,
            status: emp.status,
            permissions: emp.permissions,
            createdAt: emp.createdAt,
          }).onConflictDoUpdate({
            target: employees.id,
            set: {
              name: emp.name,
              email: emp.email,
              phone: emp.phone,
              department: emp.department,
              status: emp.status,
              permissions: emp.permissions,
            },
          });
        }
        break;

      case "EMPLOYEE_UPSERT":
        await db.insert(employees).values({
          id: payload.id,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          department: payload.department,
          status: payload.status,
          permissions: payload.permissions,
          createdAt: payload.createdAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: employees.id,
          set: {
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            department: payload.department,
            status: payload.status,
            permissions: payload.permissions,
          },
        });
        break;

      case "EMPLOYEE_DELETE":
        await db.delete(employees).where(eq(employees.id, payload.id));
        break;

      case "USER_DELETE":
        await db.delete(users).where(eq(users.id, payload.id));
        break;

      case "SYSTEM_SETTING_UPSERT":
        await db.insert(systemSettings).values({
          key: payload.key,
          value: String(payload.value),
        }).onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: String(payload.value),
          },
        });
        break;

      case "REVIEWS_BULK":
        for (const r of payload) {
          await db.insert(reviews).values({
            id: r.id,
            vendorId: r.vendorId,
            customerId: r.customerId,
            author: r.author,
            rating: Number(r.rating),
            comment: r.comment,
            createdAt: r.createdAt,
          }).onConflictDoUpdate({
            target: reviews.id,
            set: {
              vendorId: r.vendorId,
              customerId: r.customerId,
              author: r.author,
              rating: Number(r.rating),
              comment: r.comment,
              createdAt: r.createdAt,
            },
          });
        }
        break;

      case "REVIEW_UPSERT":
        await db.insert(reviews).values({
          id: payload.id,
          vendorId: payload.vendorId,
          customerId: payload.customerId,
          author: payload.author,
          rating: Number(payload.rating),
          comment: payload.comment,
          createdAt: payload.createdAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: reviews.id,
          set: {
            vendorId: payload.vendorId,
            customerId: payload.customerId,
            author: payload.author,
            rating: Number(payload.rating),
            comment: payload.comment,
            createdAt: payload.createdAt || new Date().toISOString(),
          },
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown synchronization type: ${type}` });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Cloud SQL sync save failed:", error);
    res.status(500).json({ error: "Failed to sync updates to Cloud SQL database." });
  }
});

// Serve frontend with Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
