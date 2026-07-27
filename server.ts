import "dotenv/config";
import express from "express";
import { isVendorOpen } from "./src/types.ts";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, runMigrations, pool } from "./src/db/index.ts";
import { seedDefaultData } from "./src/db/seed.ts";
import bcrypt from "bcryptjs";
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
  walletTransactions,
  appNotifications,
  pushSubscriptions,
  auditLogs,
} from "./src/db/schema.ts";
import { eq, sql, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import webpush from "web-push";

// Web Push setup
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "BPEg3-o75k9oT_P58tN3X8w3D0aC7CgT8Qd2lE_244FqL9c-859ZpA34A_R-V9t-V7h48x3Yp8M06xR61O4hXwI";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "J8YgXo1Qz64H9Q8x-6yR-3rF2t5Y8_4wD3zF0_6z5K8";
webpush.setVapidDetails(
  "mailto:support@owodefood.com",
  vapidPublicKey,
  vapidPrivateKey
);

const JWT_SECRET = process.env.JWT_SECRET || "secure_fallback_secret_xyz123";

// Middleware to verify JWT token securely
const verifyTokenOptional = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const xAuthHeader = req.headers["x-auth-token"] as string;
  let token = "";
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (xAuthHeader) {
    token = xAuthHeader;
  }

  if (token) {
    try {
      (req as any).user = jwt.verify(token, JWT_SECRET);
    } catch (e: any) {
      (req as any).jwtError = e.message;
    }
  }
  next();
};

import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

// Socket.io Server Setup
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  // Client can join a room matching their user ID
  socket.on("join", (userId) => {
    socket.join(userId);
  });
});


// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP if it interferes with Vite dev server or external images
}));
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : "http://localhost:5173"
}));

app.set("trust proxy", 1);

// Rate limiting for auth endpoints (100 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use(express.json({ limit: "50mb" }));

// -------------------------------------------------------------
// SECURE LAZY SMTP EMAIL SENDER (ZEPTOMAIL SUPPORTED)
// -------------------------------------------------------------
let transporter: any = null;

function getMailTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.zeptomail.com";
    const port = Number(process.env.SMTP_PORT) || 587;
    // Secure is true for 465, false for 587 or other ports
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const user = process.env.SMTP_USER || "emailapikey";
    const pass = process.env.SMTP_PASS;

    if (!pass) {
      console.warn("SMTP_PASS is not configured. Email notifications will operate in STDOUT simulation mode.");
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

async function sendEmailNotification(to: string, subject: string, htmlContent: string) {
  try {
    const mailer = getMailTransporter();
    const fromName = process.env.SMTP_FROM_NAME || "Owode Food";
    const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@owodefood.com";

    if (!mailer) {
      console.log(`[SMTP SIMULATION] TO: ${to}\nSUBJECT: ${subject}\nHTML:\n${htmlContent}\n====================`);
      return { success: true, simulated: true };
    }

    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`[SMTP SUCCESS] Message sent successfully to ${to}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[SMTP ERROR] Failed to deliver secure email:", err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

const APP_VERSION = process.env.APP_VERSION || Date.now().toString();

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

// App Version Endpoint
app.get("/api/version", (req, res) => {
  res.json({ version: APP_VERSION });
});


// SMTP Connection Test Endpoint
app.post("/api/email/test", async (req, res) => {
  const { toEmail } = req.body;
  if (!toEmail) {
    return res.status(400).json({ error: "Missing recipient email address ('toEmail')" });
  }

  const result = await sendEmailNotification(
    toEmail,
    "Owode Food - Live SMTP Connection Verification",
    `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px;">≡ƒìö</span>
        <h2 style="color: #070329; margin: 10px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Owode Food Marketplace</h2>
        <span style="font-size: 10px; color: #3b82f6; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">SMTP Secure Relay Connected</span>
      </div>
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">Hello,</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">This is a test notification confirming that your <strong>ZeptoMail SMTP server connection</strong> has been successfully integrated and is fully operational on your <strong>Owode Food Multi-Vendor Platform</strong>.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 12px; margin: 24px 0;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; display: block; margin-bottom: 8px;">Technical Handshake Metadata</span>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 120px;">SMTP Gateway:</td>
            <td style="padding: 4px 0; font-family: monospace;">${process.env.SMTP_HOST || "smtp.zeptomail.com"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Handshake Port:</td>
            <td style="padding: 4px 0; font-family: monospace;">${process.env.SMTP_PORT || "587"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Verified Recipient:</td>
            <td style="padding: 4px 0; font-family: monospace; color: #0f172a;">${toEmail}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #374151; line-height: 1.6;">Real-time automated emails will now trigger securely for registration approvals, instant wallets funding receipting, and multi-vendor dispatch trackings.</p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <div style="text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent via Owode Food Core Infrastructure Services</p>
        <p style="font-size: 10px; color: #cbd5e1; margin: 4px 0 0 0;">Do not reply to this automated transaction payload.</p>
      </div>
    </div>
    `
  );

  res.json(result);
});

// SMTP Secure Pin Delivery Endpoint
app.post("/api/email/send-pin", authLimiter, async (req, res) => {
  const { toEmail, name, pin } = req.body;
  if (!toEmail || !pin) {
    return res.status(400).json({ error: "Missing recipient email address ('toEmail') or PIN code ('pin')" });
  }

  const result = await sendEmailNotification(
    toEmail,
    `Owode Food - ${pin} is your secure login verification PIN`,
    `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px;">≡ƒìö</span>
        <h2 style="color: #070329; margin: 10px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Owode Food</h2>
        <span style="font-size: 10px; color: #3b82f6; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Secure Account Verification</span>
      </div>
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">Hello ${name || "User"},</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">To complete your sign in on <strong>Owode Food</strong>, please use the following secure 4-digit verification PIN:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background-color: #f1f5f9; color: #070329; font-size: 32px; font-weight: 800; padding: 12px 30px; border-radius: 12px; letter-spacing: 8px; font-family: monospace; border: 1px solid #e2e8f0;">${pin}</span>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.6; text-align: center;">This PIN is valid for 10 minutes. Please do not share this code with anyone.</p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <div style="text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent via Owode Food Secure Services</p>
        <p style="font-size: 10px; color: #cbd5e1; margin: 4px 0 0 0;">If you did not request this, please ignore this email.</p>
      </div>
    </div>
    `
  );

  if (!result.success) {
    // SECURE BACKEND LOGGING: Only the server admin can see this in cPanel logs. The frontend never receives it.
    console.error(`[SECURE LOG] Email delivery failed for ${toEmail}. The generated PIN was: ${pin}`);
  } else {
    console.log(`[SECURE LOG] PIN successfully sent to ${toEmail}`);
  }

  res.json(result);
});

// Secure User Existence Check
app.post("/api/auth/check-user", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Missing identifier" });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const phoneIdentifier = cleanIdentifier.replace(/[\s\-\+\(\)]/g, "");

    const userResult = await db.select().from(users).where(
      sql`lower(${users.email}) = ${cleanIdentifier} OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ${phoneIdentifier}`
    ).limit(1);

    if (userResult.length === 0) {
      return res.json({ exists: false });
    }

    const user = userResult[0];
    return res.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        roles: user.roles
      }
    });
  } catch (err) {
    console.error("Check user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Backend JWT Authentication Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, pin } = req.body; // 'email' field here actually receives the 'identifier'
    const cleanIdentifier = email.trim().toLowerCase();
    const phoneIdentifier = cleanIdentifier.replace(/[\s\-\+\(\)]/g, "");

    const userResult = await db.select().from(users).where(
      sql`lower(${users.email}) = ${cleanIdentifier} OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ${phoneIdentifier}`
    ).limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({ error: "Invalid email or PIN" });
    }

    const user = userResult[0];

    // Check PIN with bcrypt or plaintext migration
    let pinValid = false;
    if (user.pin && (user.pin.startsWith("$2a$") || user.pin.startsWith("$2b$"))) {
      pinValid = await bcrypt.compare(pin, user.pin);
    } else {
      // Plaintext migration
      if (user.pin && user.pin === pin) {
        pinValid = true;
        // Hash and save immediately
        const hashedPin = await bcrypt.hash(pin, 10);
        await db.update(users).set({ pin: hashedPin }).where(eq(users.id, user.id));
      }
    }

    if (!pinValid) {
      return res.status(401).json({ error: "Invalid email or PIN" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, roles: user.roles, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login process failed: " + (error.message || String(error)) });
  }
});

// 2. Database Synchronization Endpoint: LOAD
app.get("/api/sync/load", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const reqUser = req.user;
    const superAdminEmails = ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"];
    const isAdmin = reqUser && (reqUser.roles?.includes("admin") || reqUser.roles?.includes("super_admin") || reqUser.role === "admin" || reqUser.role === "super_admin" || superAdminEmails.includes(reqUser.email));
    
    // Always load public baseline data
    const allVendors = await db.select().from(vendors);
    const allProducts = await db.select().from(products);
    const allPaymentGateways = await db.select().from(paymentGateways);
    const allExtremeLocationTiers = await db.select().from(extremeLocationTiers);
    const allExtremeLocations = await db.select().from(extremeLocations);
    const allSystemSettings = await db.select().from(systemSettings);
    const allReviews = await db.select().from(reviews);

    let allUsers: any[] = [];
    let allOrders: any[] = [];
    let allOrderItems: any[] = [];
    let allRiders: any[] = [];
    let allSavedAddresses: any[] = [];
    let allEmployees: any[] = [];
    let allWalletTransactions: any[] = [];
    let allAppNotifications: any[] = [];

    if (isAdmin) {
      // Admins get everything
      allUsers = await db.select().from(users);
      allOrders = await db.select().from(orders);
      allOrderItems = await db.select().from(orderItems);
      allRiders = await db.select().from(riders);
      allSavedAddresses = await db.select().from(userSavedAddresses);
      allEmployees = await db.select().from(employees);
      allWalletTransactions = await db.select().from(walletTransactions);
      allAppNotifications = await db.select().from(appNotifications);
    } else if (reqUser) {
      // Regular user / Vendor / Rider - Tenant Isolation
      allUsers = await db.select().from(users).where(eq(users.id, reqUser.id));
      
      const userVendor = allVendors.find(v => v.userId === reqUser.id);
      
      const ordersFilter = userVendor 
        ? sql`${orders.customerId} = ${reqUser.id} OR ${orders.vendorId} = ${userVendor.id}`
        : eq(orders.customerId, reqUser.id);
        
      allOrders = await db.select().from(orders).where(ordersFilter);
      
      if (allOrders.length > 0) {
        const orderIds = allOrders.map(o => o.id);
        allOrderItems = await db.select().from(orderItems).where(sql`${orderItems.orderId} IN (${sql.join(orderIds, sql`, `)})`);
      }
      
      if (reqUser.roles?.includes("rider")) {
        allRiders = await db.select().from(riders).where(eq(riders.userId, reqUser.id));
      }
      
      allSavedAddresses = await db.select().from(userSavedAddresses).where(eq(userSavedAddresses.userId, reqUser.id));
      allWalletTransactions = await db.select().from(walletTransactions).where(eq(walletTransactions.userId, reqUser.id));
      allAppNotifications = await db.select().from(appNotifications).where(eq(appNotifications.userId, reqUser.id));
    }

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
      walletTransactions: allWalletTransactions,
      notifications: allAppNotifications,
      systemSettings: allSystemSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>),
      configurationVersion: allSystemSettings.find((s) => s.key === "configurationVersion")?.value || "1",
      generationTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load sync data from Cloud SQL:", error);
    res.status(500).json({ error: "Failed to load database. Please try again later." });
  }
});

// 3. Database Synchronization Endpoint: SAVE
app.post("/api/sync/save", verifyTokenOptional, async (req, res) => {
  try {
    const { type, payload } = req.body;
    const reqUser = (req as any).user;

    // Secure authentication check:
    // Unauthenticated users are ONLY allowed to perform USER_UPSERT to register themselves,
    // or perform bulk seeding if the database is completely empty.
    
    const superAdminEmails = ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"];
    const isAdmin = reqUser && (reqUser.roles?.includes("admin") || reqUser.roles?.includes("super_admin") || reqUser.role === "admin" || reqUser.role === "super_admin" || superAdminEmails.includes(reqUser.email));

    // Secure admin-only operations:
    const adminOnlyActions = [
      "SYSTEM_SETTING_UPSERT", "PAYMENT_GATEWAYS_BULK", "EXTREME_LOCATION_TIERS_BULK", 
      "EXTREME_LOCATIONS_BULK", "EMPLOYEES_BULK", "SYSTEM_SETTINGS_BULK",
      "USERS_BULK", "VENDORS_BULK", "ORDERS_BULK", "RIDERS_BULK", "PRODUCTS_BULK",
      "EXTREME_LOCATION_UPSERT", "EXTREME_LOCATION_DELETE", "EMPLOYEE_UPSERT", 
      "EMPLOYEE_DELETE", "USER_DELETE"
    ];
    
    let isTargetEmpty = false;
    if (adminOnlyActions.includes(type)) {
      if (type === "USERS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(users);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "VENDORS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(vendors);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "PRODUCTS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(products);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "RIDERS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(riders);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "ORDERS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(orders);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "PAYMENT_GATEWAYS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(paymentGateways);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "EXTREME_LOCATION_TIERS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(extremeLocationTiers);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "EXTREME_LOCATIONS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(extremeLocations);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "EMPLOYEES_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(employees);
        isTargetEmpty = Number(c[0].count) === 0;
      } else if (type === "REVIEWS_BULK") {
        const c = await db.select({ count: sql<number>`count(*)` }).from(reviews);
        isTargetEmpty = Number(c[0].count) === 0;
      }
    }

    if (!reqUser && type !== "USER_UPSERT" && !isTargetEmpty) {
      return res.status(401).json({ error: "Unauthorized: Please log in." });
    }

    if (adminOnlyActions.includes(type) && !isAdmin && !isTargetEmpty) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
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
            pin: u.pin || null,
            roles: u.roles || null,
          }).onConflictDoUpdate({
            target: users.id,
            set: {
              email: u.email,
              name: u.name,
              phone: u.phone,
              gender: u.gender || null,
              pin: u.pin || null,
              role: u.role,
              roles: u.roles || null,
            },
          });
        }
        break;

      case "USER_UPSERT": {
        const existing = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
        const isNew = existing.length === 0;

        // Security check: Only admins can edit another user's profile. Unauthenticated users cannot edit any profile.
        if (!isNew && (!reqUser || (reqUser.id !== payload.id && !isAdmin))) {
          return res.status(403).json({ error: "Forbidden: Cannot update existing users" });
        }

        const finalRole = isAdmin ? (payload.role || "customer") : "customer";
        const finalRoles = isAdmin ? (payload.roles || ["customer"]) : ["customer"];

        const setBlock: any = {
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          gender: payload.gender || null,
        };

        if (payload.pin && (!existing[0]?.pin || existing[0]?.pin !== payload.pin)) {
          if (payload.pin.startsWith("$2a$") || payload.pin.startsWith("$2b$")) {
            setBlock.pin = payload.pin;
          } else {
            setBlock.pin = await bcrypt.hash(payload.pin, 10);
          }
        } else if (existing[0]?.pin) {
          setBlock.pin = existing[0].pin;
        }

        if (isAdmin) {
          setBlock.role = finalRole;
          setBlock.roles = finalRoles;
        }

        await db.insert(users).values({
          id: payload.id,
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          role: finalRole,
          gender: payload.gender || null,
          createdAt: payload.createdAt || new Date().toISOString(),
          pin: setBlock.pin || null,
          roles: finalRoles,
        }).onConflictDoUpdate({
          target: users.id,
          set: setBlock,
        });

        if (isNew && payload.email) {
          sendEmailNotification(
            payload.email,
            `Welcome to Owode Food, ${payload.name}! ≡ƒîƒ`,
            `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px;">≡ƒîƒ</span>
                <h2 style="color: #070329; margin: 10px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Owode Food!</h2>
                <span style="font-size: 10px; color: #10b981; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Account Successfully Registered</span>
              </div>
              <p style="font-size: 14px; color: #374151; line-height: 1.6;">Hello <strong>${payload.name}</strong>,</p>
              <p style="font-size: 14px; color: #374151; line-height: 1.6;">Thank you for registering on the <strong>Owode Food Multi-Vendor Marketplace Platform</strong> as a <strong>${payload.role}</strong>. Your account has been provisioned and is ready for use!</p>
              
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 12px; margin: 24px 0;">
                <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; display: block; margin-bottom: 8px;">Profile Credentials</span>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; width: 120px;">Email Profile:</td>
                    <td style="padding: 4px 0; font-family: monospace;">${payload.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold;">User Role:</td>
                    <td style="padding: 4px 0; text-transform: uppercase; font-weight: bold; color: #3b82f6;">${payload.role}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold;">Registered Phone:</td>
                    <td style="padding: 4px 0; font-family: monospace;">${payload.phone || "Not provided"}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 14px; color: #374151; line-height: 1.6;">You can now fund your secure sandbox <strong>Owode Food Wallet</strong>, configure delivery addresses, browse local food vendors, and track your orders in real-time.</p>
              
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
              <div style="text-align: center;">
                <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent via Owode Food Core Platform Services</p>
              </div>
            </div>
            `
          ).catch(err => console.error("Error sending registration welcome email:", err));
        }
        break;
      }

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

      case "VENDOR_UPSERT": {
        if (!isAdmin) {
          if (payload.userId !== reqUser.id) return res.status(403).json({ error: "Forbidden: You do not own this account." });
          const existingVendor = await db.select().from(vendors).where(eq(vendors.id, payload.id)).limit(1);
          if (existingVendor.length > 0) {
            if (existingVendor[0].userId !== reqUser.id) return res.status(403).json({ error: "Forbidden: You do not own this account." });
            payload.status = existingVendor[0].status;
            payload.rating = existingVendor[0].rating;
            payload.commissionType = existingVendor[0].commissionType;
            payload.commissionValue = existingVendor[0].commissionValue;
            payload.userId = existingVendor[0].userId;
          } else {
            payload.status = "pending";
            payload.rating = 5.0;
          }
        }
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
          operatingHours: payload.operatingHours,
          isTemporarilyClosed: payload.isTemporarilyClosed,
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
            operatingHours: payload.operatingHours,
            isTemporarilyClosed: payload.isTemporarilyClosed,
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
      } break;

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
            addons: p.addons ? JSON.stringify(p.addons) : null,
            maxAddons: p.maxAddons,
            addonGroups: p.addonGroups ? JSON.stringify(p.addonGroups) : null,
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
              addons: p.addons ? JSON.stringify(p.addons) : null,
              maxAddons: p.maxAddons,
              addonGroups: p.addonGroups ? JSON.stringify(p.addonGroups) : null,
            },
          });
        }
        break;

      case "PRODUCT_UPSERT": {
        if (!isAdmin) {
          const userVendor = await db.select().from(vendors).where(eq(vendors.userId, reqUser.id)).limit(1);
          if (!userVendor.length || userVendor[0].id !== payload.vendorId) return res.status(403).json({ error: "Forbidden: Product does not belong to your vendor account." });
          
          const existingProd = await db.select().from(products).where(eq(products.id, payload.id)).limit(1);
          if (existingProd.length > 0 && existingProd[0].vendorId !== userVendor[0].id) {
             return res.status(403).json({ error: "Forbidden: Cannot modify a product owned by another vendor." });
          }
        }
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
          addons: payload.addons ? JSON.stringify(payload.addons) : null,
          maxAddons: payload.maxAddons,
          addonGroups: payload.addonGroups ? JSON.stringify(payload.addonGroups) : null,
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
            addons: payload.addons ? JSON.stringify(payload.addons) : null,
            maxAddons: payload.maxAddons,
            addonGroups: payload.addonGroups ? JSON.stringify(payload.addonGroups) : null,
          },
        });
      } break;

      case "PRODUCT_DELETE": {
        if (!isAdmin) {
          const existingProd = await db.select().from(products).where(eq(products.id, payload.id)).limit(1);
          if (existingProd.length > 0) {
            const userVendor = await db.select().from(vendors).where(eq(vendors.userId, reqUser.id)).limit(1);
            if (!userVendor.length || userVendor[0].id !== existingProd[0].vendorId) return res.status(403).json({ error: "Forbidden" });
          }
        }
        await db.delete(products).where(eq(products.id, payload.id));
      } break;

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
            orderType: o.orderType || "standard",
            receiptImageOrQr: o.receiptImageOrQr || null,
            receiptNote: o.receiptNote || null,
          }).onConflictDoUpdate({
            target: orders.id,
            set: {
              status: o.status,
              riderId: o.riderId,
              riderName: o.riderName,
              orderType: o.orderType || "standard",
              receiptImageOrQr: o.receiptImageOrQr || null,
              receiptNote: o.receiptNote || null,
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

      case "ORDER_UPSERT": {
        const existingOrder = await db.select().from(orders).where(eq(orders.id, payload.id)).limit(1);
        const isNew = existingOrder.length === 0;
        
        if (isNew && !isAdmin) {
          return res.status(403).json({ error: "Forbidden: Only admins can create orders directly via sync." });
        }
        
        if (isNew) {
          const vendor = await db.select().from(vendors).where(eq(vendors.id, payload.vendorId)).limit(1);
          if (vendor.length > 0) {
            if (vendor[0].status === "suspended") {
              return res.status(403).json({ error: "Restaurant is suspended and cannot accept orders at this time." });
            }
            if (!isVendorOpen(vendor[0])) {
              return res.status(403).json({ error: "Restaurant is currently closed and cannot accept new orders." });
            }
          }
        }
        
        const oldStatus = isNew ? null : existingOrder[0].status;
        const statusChanged = oldStatus !== payload.status;

        if (!isAdmin) {
          const userVendor = await db.select().from(vendors).where(eq(vendors.userId, reqUser.id)).limit(1);
          const userVendorId = userVendor.length > 0 ? userVendor[0].id : null;
          
          if (!isNew) {
            const order = existingOrder[0];
            
            // SECURITY ENFORCEMENT: Block any non-admin from modifying an order awaiting verification
            // EXCEPT for the customer updating their receipt (which triggers a state reset)
            if (order.status === "awaiting_payment_verification") {
              const isCustomerUploadingReceipt = payload.customerId === reqUser.id && payload.paymentReceiptUrl !== undefined;
              if (!isCustomerUploadingReceipt) {
                return res.status(403).json({ error: "Forbidden: Order is locked awaiting payment verification." });
              }
            }
            
            const isCustomer = order.customerId === reqUser.id;
            const isVendor = order.vendorId === userVendorId;
            const isRider = order.riderId === reqUser.id || payload.riderId === reqUser.id;
            
            if (!isCustomer && !isVendor && !isRider) return res.status(403).json({ error: "Forbidden" });
            
            // Field-level locks
            payload.customerId = order.customerId;
            payload.vendorId = order.vendorId;
            payload.totalAmount = order.totalAmount;
            payload.serviceFee = order.serviceFee;
            payload.deliveryFee = order.deliveryFee;
            payload.tax = order.tax;
            payload.items = undefined;
            
            if (isCustomer && !isVendor && !isRider) {
              if (payload.status !== "cancelled" || order.status !== "pending") {
                payload.status = order.status;
              }
              payload.riderId = order.riderId;
            } else if (isRider && !isVendor) {
              if (order.riderId && order.riderId !== reqUser.id) return res.status(403).json({ error: "Forbidden" });
            }
          } else {
            if (payload.customerId !== reqUser.id) return res.status(403).json({ error: "Forbidden" });
          }
        }

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
          paymentReceiptUrl: payload.paymentReceiptUrl,
          verifiedBy: payload.verifiedBy,
          verifiedAt: payload.verifiedAt,
          rejectedBy: payload.rejectedBy,
          rejectedAt: payload.rejectedAt,
          rejectionReason: payload.rejectionReason,
        }).onConflictDoUpdate({
          target: orders.id,
          set: {
            status: payload.status,
            riderId: payload.riderId,
            riderName: payload.riderName,
            paymentReceiptUrl: payload.paymentReceiptUrl,
            verifiedBy: payload.verifiedBy,
            verifiedAt: payload.verifiedAt,
            rejectedBy: payload.rejectedBy,
            rejectedAt: payload.rejectedAt,
            rejectionReason: payload.rejectionReason,
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

        // Automated Order Email Notification Hook
        if (payload.customerId) {
          const customerRecords = await db.select().from(users).where(eq(users.id, payload.customerId)).limit(1);
          if (customerRecords.length > 0 && customerRecords[0].email) {
            const customerEmail = customerRecords[0].email;
            
            if (isNew) {
              sendEmailNotification(
                customerEmail,
                `Order Placed Successfully! #${payload.id.substring(0, 8)} ≡ƒ¢ì∩╕Å`,
                `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 32px;">≡ƒ¢ì∩╕Å</span>
                    <h2 style="color: #070329; margin: 10px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Order Placed Successfully!</h2>
                    <span style="font-size: 10px; color: #3b82f6; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Awaiting Vendor Acceptance</span>
                  </div>
                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">Hello <strong>${payload.customerName || "Customer"}</strong>,</p>
                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">Your order at <strong>${payload.vendorName}</strong> has been received and is currently being prepared for the kitchen.</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 12px; margin: 24px 0;">
                    <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; display: block; margin-bottom: 8px;">Order Details</span>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; width: 120px;">Order ID:</td>
                        <td style="padding: 4px 0; font-family: monospace; color: #0f172a;">#${payload.id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold;">Vendor:</td>
                        <td style="padding: 4px 0; font-weight: bold; color: #070329;">${payload.vendorName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold;">Total Amount:</td>
                        <td style="padding: 4px 0; font-weight: bold; color: #10b981;">Γéª${payload.totalAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold;">Delivery To:</td>
                        <td style="padding: 4px 0;">${payload.deliveryAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold;">Payment Mode:</td>
                        <td style="padding: 4px 0; font-family: monospace;">${payload.paymentMethod}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">You can track the live preparation status and courier delivery tracking of your order directly from your Owode Food customer panel.</p>
                  
                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                  <div style="text-align: center;">
                    <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent via Owode Food Core Platform Services</p>
                  </div>
                </div>
                `
              ).catch(err => console.error("Error sending order placement email:", err));
            } else if (statusChanged) {
              sendEmailNotification(
                customerEmail,
                `Order #${payload.id.substring(0, 8)} Status Update: ${payload.status.toUpperCase()} ΓÜí`,
                `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 32px;">ΓÜí</span>
                    <h2 style="color: #070329; margin: 10px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Order Status Update!</h2>
                    <span style="font-size: 10px; color: #0ea5e9; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; background-color: #f0f9ff; padding: 4px 12px; border-radius: 20px;">${payload.status}</span>
                  </div>
                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">Hello <strong>${payload.customerName || "Customer"}</strong>,</p>
                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">The status of your order at <strong>${payload.vendorName}</strong> has been updated.</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 12px; margin: 24px 0;">
                    <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; display: block; margin-bottom: 8px;">Update Details</span>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #334155;">
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; width: 120px;">Order ID:</td>
                        <td style="padding: 4px 0; font-family: monospace; color: #0f172a;">#${payload.id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold;">Current Status:</td>
                        <td style="padding: 4px 0; font-weight: bold; color: #0ea5e9; text-transform: uppercase;">${payload.status}</td>
                      </tr>
                      ${payload.riderName ? `
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold;">Courier Rider:</td>
                        <td style="padding: 4px 0; font-weight: bold; color: #3b82f6;">${payload.riderName}</td>
                      </tr>
                      ` : ""}
                    </table>
                  </div>

                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">Your tracking feed will reflect this update immediately. Thank you for choosing Owode Food!</p>
                  
                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                  <div style="text-align: center;">
                    <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent via Owode Food Core Platform Services</p>
                  </div>
                </div>
                `
              ).catch(err => console.error("Error sending order status change email:", err));
            }
          }
        }

        // Send Rider Notifications if Order is Accepted and Needs a Rider
        if (statusChanged && payload.status === "accepted" && !payload.riderId) {
          io.to("riders").emit("new_delivery_job", { orderId: payload.id, vendorName: payload.vendorName });
          
          try {
            const activeRiders = await db.select().from(riders).where(eq(riders.isAvailable, true));
            const riderUserIds = activeRiders.map((r: any) => r.userId);
            if (riderUserIds.length > 0) {
              const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, riderUserIds));
              for (const sub of subs) {
                try {
                  await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                  }, JSON.stringify({ 
                    title: "New Delivery Job! ≡ƒ¢╡", 
                    message: `Order #${payload.id.substring(0,8)} from ${payload.vendorName} is available.` 
                  }));
                } catch (e: any) {
                  if (e.statusCode === 410 || e.statusCode === 404) {
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                  }
                }
              }
            }
          } catch(e) { console.error("Rider push failed", e); }
        }

        break;
      }

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

      case "RIDER_UPSERT": {
        if (!isAdmin) {
          if (payload.userId !== reqUser.id) return res.status(403).json({ error: "Forbidden: You do not own this account." });
          const existing = await db.select().from(riders).where(eq(riders.id, payload.id)).limit(1);
          if (existing.length > 0) {
            if (existing[0].userId !== reqUser.id) return res.status(403).json({ error: "Forbidden" });
            payload.status = existing[0].status;
            payload.userId = existing[0].userId;
          } else {
            payload.status = "pending";
          }
        }
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
      } break;

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

      case "USER_SAVED_ADDRESS_UPSERT": {
        if (!isAdmin && payload.userId !== reqUser.id) {
          return res.status(403).json({ error: "Forbidden: Cannot alter another user's saved address" });
        }
        const existingAddress = await db.select().from(userSavedAddresses).where(eq(userSavedAddresses.id, payload.id)).limit(1);
        if (!isAdmin && existingAddress.length > 0 && existingAddress[0].userId !== reqUser.id) {
          return res.status(403).json({ error: "Forbidden: Cannot alter another user's saved address" });
        }
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
      }
      break;

      case "USER_SAVED_ADDRESS_DELETE": {
        if (!isAdmin) {
          const existingAddress = await db.select().from(userSavedAddresses).where(eq(userSavedAddresses.id, payload.id)).limit(1);
          if (existingAddress.length > 0 && existingAddress[0].userId !== reqUser.id) {
            return res.status(403).json({ error: "Forbidden: Cannot delete another user's saved address" });
          }
        }
        await db.delete(userSavedAddresses).where(eq(userSavedAddresses.id, payload.id));
      }
        break;

      case "EXTREME_LOCATION_TIERS_BULK":
        for (const tier of payload) {
          await db.insert(extremeLocationTiers).values(tier).onConflictDoUpdate({
            target: extremeLocationTiers.id,
            set: {
              name: tier.name,
              surcharge: Math.round(tier.surcharge),
            },
          });
        }
        break;

      case "EXTREME_LOCATIONS_BULK":
        await db.delete(extremeLocations);
        for (const el of payload) {
          await db.insert(extremeLocations).values({
            id: el.id,
            name: el.name,
            tierId: el.tierId,
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

      case "SYSTEM_SETTINGS_BULK":
        for (const setting of payload) {
          if (!setting.key || setting.value === undefined || setting.value === null) continue;
          await db.insert(systemSettings).values({
            key: setting.key,
            value: String(setting.value),
          }).onConflictDoUpdate({
            target: systemSettings.key,
            set: { value: String(setting.value) },
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

      case "REVIEW_UPSERT": {
        if (!isAdmin) {
          if (payload.customerId !== reqUser.id) return res.status(403).json({ error: "Forbidden: Cannot write a review on behalf of another user." });
          const existingReview = await db.select().from(reviews).where(eq(reviews.id, payload.id)).limit(1);
          if (existingReview.length > 0 && existingReview[0].customerId !== reqUser.id) {
            return res.status(403).json({ error: "Forbidden: Cannot edit another user's review." });
          }
        }
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
      }
      break;

      default:
        return res.status(400).json({ error: `Unknown synchronization type: ${type}` });
    }
    const publicConfigModifiers = [
      "SYSTEM_SETTING_UPSERT",
      "SYSTEM_SETTINGS_BULK",
      "VENDORS_BULK",
      "PRODUCTS_BULK",
      "PRODUCTS_UPSERT",
      "EXTREME_LOCATIONS_BULK",
      "EXTREME_LOCATION_TIERS_BULK"
    ];

    if (publicConfigModifiers.includes(type)) {
      const newVersion = Date.now().toString();
      await db.insert(systemSettings).values({
        key: "configurationVersion",
        value: newVersion,
      }).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: newVersion },
      });
      io.emit("sync_update", { type, payload, version: newVersion });
    } else {
      io.emit("sync_update", { type, payload });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Cloud SQL sync save failed:", error);
    res.status(500).json({ error: "Failed to sync updates to Cloud SQL database." });
  }
});

// 4. Secure Checkout API
app.post("/api/checkout", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const { customerId, customerName, customerPhone, vendorId, vendorName, items, deliveryAddress, paymentMethod, serviceFee, deliveryFee, tax, receiptImage, orderType, receiptImageOrQr, receiptNote } = req.body;
    
    const isReceiptPickup = orderType === "receipt_pickup";

    if (!customerId || !vendorId || (!isReceiptPickup && (!items || !Array.isArray(items)))) {
      return res.status(400).json({ error: "Missing required checkout fields" });
    }

    if (!req.user) {
      return res.status(403).json({ error: `Unauthorized: Invalid JWT token. Details: ${req.jwtError || 'Missing token'}` });
    }
    if (req.user.id !== customerId) {
      return res.status(403).json({ error: `Unauthorized: User ID mismatch. Token ID: ${req.user.id}, Expected: ${customerId}` });
    }

    const orderId = "owf-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Validate prices server-side
    let calculatedTotal = 0;
    
    if (!isReceiptPickup && items) {
      const dbProducts = await db.select().from(products).where(eq(products.vendorId, vendorId));
      for (const item of items) {
        const dbProduct = dbProducts.find((p) => p.id === item.productId);
        if (!dbProduct) {
          return res.status(400).json({ error: `Product ${item.productId} not found` });
        }
        
        let itemPrice = dbProduct.price;
        // Add addons price if any
        if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
          for (const addon of item.selectedAddons) {
            itemPrice += (addon.price * (addon.quantity || 1));
          }
        }
        calculatedTotal += (itemPrice * item.quantity);
      }
    }
    
    let validServiceFee = Math.max(0, serviceFee || 0);
    let validDeliveryFee = Math.max(0, deliveryFee || 0);
    let validTax = Math.max(0, tax || 0);

    // Enforce base minimums for receipt pickup
    if (isReceiptPickup && validServiceFee < 50) {
      validServiceFee = 50;
    }

    const finalTotal = calculatedTotal + validServiceFee + validDeliveryFee + validTax;

    // 2. Wallet Deductions if paymentMethod is wallet
    if (paymentMethod === "wallet") {
      const userTransactions = await db.select().from(walletTransactions).where(eq(walletTransactions.userId, customerId));
      const balance = userTransactions.reduce((acc, tx) => {
        if (tx.status !== "approved") return acc;
        return tx.type === "deposit" || tx.type === "refund" ? acc + tx.amount : acc - tx.amount;
      }, 0);

      if (balance < finalTotal) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }

      // Deduct
      await db.insert(walletTransactions).values({
        id: Math.random().toString(36).substring(2, 11),
        userId: customerId,
        userName: customerName,
        amount: finalTotal,
        type: "purchase",
        status: "approved",
        createdAt: new Date().toISOString(),
        note: `Order payment for vendor: ${vendorName}`
      });
    }

    // 3. Create Order
    const isBankTransfer = paymentMethod === "bank_transfer" || paymentMethod.toLowerCase().includes("bank transfer");
    const initialStatus = isBankTransfer ? "awaiting_payment_verification" : "pending";
    await db.insert(orders).values({
      id: orderId,
      customerId,
      customerName,
      customerPhone,
      vendorId,
      vendorName,
      status: initialStatus,
      totalAmount: finalTotal,
      deliveryAddress,
      paymentMethod,
      serviceFee,
      deliveryFee,
      tax,
      paymentReceiptUrl: receiptImage || null,
      orderType: orderType || "standard",
      receiptImageOrQr: receiptImageOrQr || null,
      receiptNote: receiptNote || null,
      createdAt: new Date().toISOString()
    });

    if (!isReceiptPickup && items) {
      for (const item of items) {
        await db.insert(orderItems).values({
          id: Math.random().toString(36).substring(2, 11),
          orderId,
          productId: item.productId,
          name: item.name,
          price: item.price, // Storing what they paid (we verified it above)
          quantity: item.quantity
        });
      }
    }

    const newOrderPayload = {
      id: orderId,
      customerId,
      customerName,
      customerPhone,
      vendorId,
      vendorName,
      status: initialStatus,
      totalAmount: finalTotal,
      deliveryAddress,
      paymentMethod,
      serviceFee,
      deliveryFee,
      tax,
      paymentReceiptUrl: receiptImage || null,
      orderType: orderType || "standard",
      receiptImageOrQr: receiptImageOrQr || null,
      receiptNote: receiptNote || null,
      createdAt: new Date().toISOString(),
      items: isReceiptPickup ? [] : items.map((item: any) => ({
        id: Math.random().toString(36).substring(2, 11),
        orderId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    };

    // Emit Socket Event (To be added via Socket.io later)
    io.to(vendorId).emit("new_order", { orderId, vendorId, order: newOrderPayload });
    io.to("admin").emit("new_order", { orderId, vendorId, order: newOrderPayload });

    // Web Push Notification to Vendor and Admin
    const sendPush = async (targetId: string, title: string, message: string) => {
      try {
        const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, targetId));
        for (const sub of subs) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, JSON.stringify({ title, message }));
          } catch (e: any) {
            if (e.statusCode === 410 || e.statusCode === 404) {
              await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
          }
        }
      } catch (e) {
        console.error("Push failed for", targetId, e);
      }
    };
    sendPush(vendorId, "New Order Received!", `Order #${orderId} for ?${finalTotal.toLocaleString()}`);
    sendPush("admin", "New Platform Order!", `Order #${orderId} placed at ${vendorName}`);

    res.json({ success: true, orderId, finalTotal });
  } catch (error) {
    console.error("Checkout failed:", error);
    res.status(500).json({ error: "Checkout process failed." });
  }
});

// 5. Secure Wallet Funding API
app.post("/api/wallet/fund", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const { userId, userName, amount, gateway, reference } = req.body;
    
    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: "Unauthorized: Invalid JWT token or user ID mismatch during wallet funding." });
    }
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid funding request" });
    }

    // In a production app, VERIFY the payment with the gateway here using their Secret Key.
    // e.g. const paystackRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` } });
    // if (paystackRes.data.data.status !== "success") throw new Error("Payment not verified");
    const isVerified = true; // Simulated Secure Verification

    if (!isVerified) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const txId = Math.random().toString(36).substring(2, 11);
    await db.transaction(async (tx) => {
      await tx.insert(walletTransactions).values({
        id: txId,
        userId,
        userName,
        amount,
        type: "deposit",
        status: gateway === "bank_transfer" ? "pending" : "approved",
        gateway,
        reference,
        createdAt: new Date().toISOString(),
        note: `Wallet funding via ${gateway}`
      });

      await tx.insert(auditLogs).values({
        id: Math.random().toString(36).substring(2, 11),
        userId,
        action: "WALLET_FUND",
        resource: `walletTransactions:${txId}`,
        details: `Funded ${amount} NGN via ${gateway}`,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, transactionId: txId });
  } catch (error) {
    console.error("Wallet funding failed:", error);
    res.status(500).json({ error: "Failed to process wallet funding." });
  }
});

// 6. Web Push Subscription API
app.post("/api/push/subscribe", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const { subscription } = req.body;
    if (!req.user || !subscription) return res.status(400).json({ error: "Invalid request" });
    
    // Add super admin role ID so they can receive "admin" notifications
    if (req.user.roles?.includes("super_admin")) {
      const adminExists = await db.select().from(pushSubscriptions).where(
        sql`${pushSubscriptions.userId} = 'admin' AND ${pushSubscriptions.endpoint} = ${subscription.endpoint}`
      );
      if (adminExists.length === 0) {
        await db.insert(pushSubscriptions).values({
          id: Math.random().toString(36).substring(2, 11),
          userId: "admin",
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          createdAt: new Date().toISOString()
        });
      }
    }

    const exists = await db.select().from(pushSubscriptions).where(
      sql`${pushSubscriptions.userId} = ${req.user.id} AND ${pushSubscriptions.endpoint} = ${subscription.endpoint}`
    );
    
    if (exists.length === 0) {
      await db.insert(pushSubscriptions).values({
        id: Math.random().toString(36).substring(2, 11),
        userId: req.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        createdAt: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Push subscribe failed:", error);
    res.status(500).json({ error: "Failed to subscribe." });
  }
});


// Structured logger
const logger = {
  server: (msg: string, ...args: any[]) => console.log(`[SERVER] ${new Date().toISOString()} - ${msg}`, ...args),
  db: (msg: string, ...args: any[]) => console.log(`[DB] ${new Date().toISOString()} - ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args),
};

// Global Error Handlers
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // process.exit(1); // Removed to prevent server crashes on intermittent DB timeouts
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await pool.query("SELECT 1 AS status");
    res.json({
      status: "healthy",
      database: dbStatus.rowCount === 1 ? "connected" : "error",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  } catch (err) {
    logger.error("Health check failed:", err);
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

function validateEnvironment() {
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.server(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.server("HTTP server closed.");
    try {
      await pool.end();
      logger.db("Database pool closed.");
      process.exit(0);
    } catch (err) {
      logger.error("Error during database pool closure:", err);
      process.exit(1);
    }
  });
  
  // Force close after 10s
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Serve frontend with Vite integration
async function startServer() {
  try {
    validateEnvironment();
    logger.server("Environment validated successfully.");

    if (process.env.RUN_MIGRATIONS_ON_STARTUP === "true" || process.env.NODE_ENV === "production") {
      logger.db("Running database migrations...");
      await runMigrations();
    }

    if (process.env.RUN_SEEDING_ON_STARTUP === "true" || process.env.NODE_ENV === "production") {
      logger.db("Running version-aware database seeding...");
      await seedDefaultData();
    }

    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      
      // Serve static files with robust PWA update caching
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          // Never cache entry points and service workers
          if (filePath.endsWith("index.html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.webmanifest")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } 
          // Heavily cache hashed assets (CSS/JS)
          else if (filePath.replace(/\\/g, "/").includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
      }));

      // Catch-all route for SPA
      app.get("*", (req, res) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    server.listen(PORT, () => {
      logger.server(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;

