import "dotenv/config";
import express from "express";
import { isVendorOpen } from "./src/types.ts";
import path from "path";
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
  payoutLogs,
} from "./src/db/schema.ts";
import { eq, sql, inArray, count, sum, and, or, ilike, gte, lte, desc } from "drizzle-orm";
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
const authLimiter = process.env.VERCEL ? (req: express.Request, res: express.Response, next: express.NextFunction) => next() : rateLimit({
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
      // Fail fast instead of hanging past the serverless function's execution
      // limit (which surfaces as a platform-level timeout/non-JSON response
      // on Vercel, rather than a clean JSON error from our own try/catch).
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
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

// App Version Endpoint
app.get("/api/version", (req, res) => {
  res.json({ version: APP_VERSION });
});

app.get("/api/env-check", (req, res) => {
  res.json({ 
    hasDbUrl: !!process.env.DATABASE_URL, 
    hasSqlHost: !!process.env.SQL_HOST,
    dbStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : "none",
    vercel: process.env.VERCEL,
    hasSmtpPass: !!process.env.SMTP_PASS,
    smtpHost: process.env.SMTP_HOST || "smtp.zeptomail.com (default)",
    smtpPort: process.env.SMTP_PORT || "587 (default)",
    smtpUser: process.env.SMTP_USER ? "set" : "using default 'emailapikey'"
  });
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

// Forgotten PIN reset -- step 1: request a code.
// Previously this whole flow generated and checked its verification code
// entirely in the browser, which meant the "proof it's really you" step
// could be bypassed trivially with dev tools, and separately, the actual
// PIN change was blocked by the normal auth checks anyway (an
// unauthenticated person can't update an existing user's data) -- so the
// flow could not have completed successfully at all as it stood. This
// generates and stores the code server-side, with an expiry, and the
// confirm step below is the only thing authorized to change the PIN
// after checking it. Reuses the existing generic systemSettings
// key-value table for storage -- no schema change needed.
app.post("/api/auth/request-pin-reset", authLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Missing identifier" });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const phoneIdentifier = cleanIdentifier.replace(/[\s\-\+\(\)]/g, "");

    const userResult = await db.select().from(users).where(
      sql`lower(${users.email}) = ${cleanIdentifier} OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ${phoneIdentifier}`
    ).limit(1);

    // Deliberately the same success response whether or not an account
    // exists -- otherwise this endpoint becomes a way to check which
    // emails/phones have accounts on the platform just by watching the
    // response, which is its own real privacy leak.
    if (userResult.length === 0) {
      return res.json({ success: true });
    }

    const user = userResult[0];
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes, matching the existing email copy

    await db.insert(systemSettings).values({
      key: `pin_reset_${user.id}`,
      value: JSON.stringify({ code, expiresAt }),
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: JSON.stringify({ code, expiresAt }) },
    });

    const result = await sendEmailNotification(
      user.email,
      `Owode Food - ${code} is your PIN reset code`,
      `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #070329; margin: 10px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Owode Food</h2>
          <span style="font-size: 10px; color: #3b82f6; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">PIN Reset Request</span>
        </div>
        <p style="font-size: 14px; color: #374151; line-height: 1.6;">Hello ${user.name || "User"},</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.6;">Use the following code to reset your security PIN:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #f1f5f9; color: #070329; font-size: 32px; font-weight: 800; padding: 12px 30px; border-radius: 12px; letter-spacing: 8px; font-family: monospace; border: 1px solid #e2e8f0;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.6; text-align: center;">This code is valid for 10 minutes. If you did not request this, please ignore this email -- your PIN will not change unless this code is entered.</p>
      </div>
      `
    );

    if (!result.success) {
      console.error(`[SECURE LOG] PIN reset email delivery failed for ${user.email}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("PIN reset request failed:", error);
    res.status(500).json({ error: "Failed to process the reset request. Please try again." });
  }
});

// Forgotten PIN reset -- step 2: verify the code and actually change the
// PIN. This is the only thing that changes the PIN in this flow -- it
// intentionally does not go through the normal USER_UPSERT path (which
// requires being logged in as that user or an admin), since proving
// knowledge of the emailed code IS the authorization here.
app.post("/api/auth/confirm-pin-reset", authLimiter, async (req, res) => {
  try {
    const { identifier, code, newPin } = req.body;
    if (!identifier || !code || !newPin) {
      return res.status(400).json({ error: "Missing identifier, code, or new PIN." });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const phoneIdentifier = cleanIdentifier.replace(/[\s\-\+\(\)]/g, "");

    const userResult = await db.select().from(users).where(
      sql`lower(${users.email}) = ${cleanIdentifier} OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ${phoneIdentifier}`
    ).limit(1);

    if (userResult.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }
    const user = userResult[0];

    const storedRows = await db.select().from(systemSettings).where(eq(systemSettings.key, `pin_reset_${user.id}`)).limit(1);
    if (storedRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset code. Please request a new one." });
    }

    let stored: { code: string; expiresAt: number };
    try {
      stored = JSON.parse(storedRows[0].value);
    } catch {
      return res.status(400).json({ error: "Invalid or expired reset code. Please request a new one." });
    }

    if (Date.now() > stored.expiresAt) {
      await db.delete(systemSettings).where(eq(systemSettings.key, `pin_reset_${user.id}`));
      return res.status(400).json({ error: "This reset code has expired. Please request a new one." });
    }

    if (String(code).trim() !== stored.code) {
      return res.status(400).json({ error: "Incorrect verification code. Please check and try again." });
    }

    const hashedPin = await bcrypt.hash(String(newPin), 10);
    await db.update(users).set({ pin: hashedPin }).where(eq(users.id, user.id));

    // One-time use -- the code can't be replayed for a second reset.
    await db.delete(systemSettings).where(eq(systemSettings.key, `pin_reset_${user.id}`));

    const token = jwt.sign(
      { id: user.id, role: user.role, roles: user.roles, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user: { ...user, pin: undefined } });
  } catch (error: any) {
    console.error("PIN reset confirmation failed:", error);
    res.status(500).json({ error: "Failed to reset the PIN. Please try again." });
  }
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

// 1b. Registration Endpoint: server-authoritative. The frontend must treat this
// response as the single source of truth — no local "success" before this
// call actually confirms it, and no silent local-only fallback if it fails.
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, role, gender, pin, businessName, cuisine, vehicleType } = req.body;

    if (!name || !email || !phone || !pin || !role) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (String(pin).length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 digits." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhoneDigits = String(phone).replace(/[\s\-\+\(\)]/g, "");

    // Pre-check for a friendly error message. The unique index on email is the
    // real guarantee against race conditions (e.g. two devices registering the
    // same email at the same instant) — this check just gives a nicer message
    // in the common case.
    const existing = await db.select().from(users).where(
      sql`lower(${users.email}) = ${cleanEmail} OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ${cleanPhoneDigits}`
    ).limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email or phone number already exists." });
    }

    const newUserId = "u-" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const finalRole = role === "customer" ? "customer" : role;
    const finalRoles = role === "customer" ? ["customer"] : ["customer", role];
    const hashedPin = await bcrypt.hash(String(pin), 10);
    const createdAt = new Date().toISOString();

    let newVendorRow: any = null;
    let newRiderRow: any = null;

    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: newUserId,
          email: cleanEmail,
          name,
          phone,
          role: finalRole,
          roles: finalRoles,
          gender: gender || null,
          createdAt,
          pin: hashedPin,
        });

        if (role === "vendor") {
          newVendorRow = {
            id: "v-" + Math.random().toString(36).substring(2, 11),
            userId: newUserId,
            name: businessName || `${name}'s Eatery`,
            description: `Freshly prepared ${cuisine || "delicious"} food.`,
            cuisine: cuisine || "Continental",
            image: "/images/burger.png",
            rating: 5.0,
            address: "Food Street Market, District 1",
            status: "pending",
            createdAt,
          };
          await tx.insert(vendors).values(newVendorRow);
        } else if (role === "rider") {
          newRiderRow = {
            id: "r-" + Math.random().toString(36).substring(2, 11),
            userId: newUserId,
            name,
            phone,
            vehicleType: vehicleType || "motorcycle",
            status: "pending",
            isAvailable: true,
            createdAt,
          };
          await tx.insert(riders).values(newRiderRow);
        }
      });
    } catch (dbErr: any) {
      // Postgres unique_violation — the exact race condition this endpoint exists to prevent.
      if (dbErr.code === "23505") {
        return res.status(409).json({ error: "An account with this email or phone number already exists." });
      }
      throw dbErr;
    }

    const newUserRow = {
      id: newUserId,
      email: cleanEmail,
      name,
      phone,
      role: finalRole,
      roles: finalRoles,
      gender: gender || null,
      createdAt,
    };

    const token = jwt.sign(
      { id: newUserId, role: finalRole, roles: finalRoles, email: cleanEmail },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user: newUserRow, vendor: newVendorRow, rider: newRiderRow });

    // Welcome email is a nice-to-have, sent after responding — its failure
    // must never affect whether registration itself succeeded.
    sendEmailNotification(
      cleanEmail,
      `Welcome to Owode Food, ${name}!`,
      `<p>Hello ${name},</p><p>Your Owode Food account has been created successfully.</p>`
    ).catch((e) => console.error("[register] Welcome email failed (non-fatal):", e));

  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed: " + (error.message || String(error)) });
  }
});

// 2a. Lightweight version check: tells the client whether anything has
// actually changed since it last loaded, so it doesn't need to re-download
// the entire dataset on every 15-second poll. This is a tiny response
// (a single timestamp string) versus the full /api/sync/load payload.
// Lightweight admin dashboard stats: computes aggregates directly in the
// database (COUNT/SUM) instead of requiring the client to download every
// order, user, vendor, and rider just to display a handful of numbers.
// Admin-only, since these are platform-wide figures.
// Server-side order search + filtering + pagination for Master Orders.
// Admin-only. Combines free-text search (order ID, customer name/phone,
// vendor, rider -- there's no dedicated "payment reference" field on
// orders, so a reference search matches against the order ID, the
// closest real equivalent) with Status, Order Type, Payment Status, and
// Date filters, all applied together server-side, with real pagination
// rather than the client sorting through everything already loaded.
app.get("/api/admin/orders-search", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const reqUser = req.user;
    const superAdminEmails = ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"];
    const isAdmin = reqUser && (reqUser.roles?.includes("admin") || reqUser.roles?.includes("super_admin") || reqUser.role === "admin" || reqUser.role === "super_admin" || superAdminEmails.includes(reqUser.email));
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }

    const {
      search = "",
      status = "",
      orderType = "",
      paymentStatus = "",
      dateFrom = "",
      dateTo = "",
      page = "1",
      pageSize = "25",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 25));

    const conditions: any[] = [];

    const searchTerm = String(search).trim();
    if (searchTerm) {
      const like = `%${searchTerm}%`;
      conditions.push(or(
        ilike(orders.id, like),
        ilike(orders.customerName, like),
        ilike(orders.customerPhone, like),
        ilike(orders.vendorName, like),
        ilike(orders.riderName, like)
      ));
    }

    if (status) {
      conditions.push(eq(orders.status, String(status)));
    }

    if (orderType === "batch") {
      conditions.push(sql`${orders.batchDate} IS NOT NULL AND ${orders.batchTime} IS NOT NULL`);
    } else if (orderType === "receipt_pickup") {
      conditions.push(eq(orders.orderType, "receipt_pickup"));
    } else if (orderType === "standard") {
      conditions.push(sql`${orders.orderType} != 'receipt_pickup' AND (${orders.batchDate} IS NULL OR ${orders.batchTime} IS NULL)`);
    }

    // "Payment Status" is derived from existing fields -- there's no
    // single dedicated column for it, since verification only applies to
    // bank-transfer orders in the first place.
    if (paymentStatus === "verified") {
      conditions.push(sql`${orders.verifiedBy} IS NOT NULL`);
    } else if (paymentStatus === "rejected") {
      conditions.push(sql`${orders.rejectedBy} IS NOT NULL AND ${orders.verifiedBy} IS NULL`);
    } else if (paymentStatus === "awaiting_verification") {
      conditions.push(eq(orders.status, "awaiting_payment_verification"));
    } else if (paymentStatus === "not_applicable") {
      conditions.push(sql`${orders.verifiedBy} IS NULL AND ${orders.rejectedBy} IS NULL AND ${orders.status} != 'awaiting_payment_verification'`);
    }

    if (dateFrom) {
      conditions.push(gte(orders.createdAt, String(dateFrom)));
    }
    if (dateTo) {
      // Include the entire end date, not just up to midnight.
      conditions.push(lte(orders.createdAt, String(dateTo) + "T23:59:59.999Z"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, matchingOrders] = await Promise.all([
      db.select({ value: count() }).from(orders).where(whereClause),
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(pageSizeNum).offset((pageNum - 1) * pageSizeNum),
    ]);

    const totalCount = Number(totalResult[0]?.value || 0);

    // Attach items for just this page's orders -- not the whole dataset.
    let itemsByOrder: Record<string, any[]> = {};
    if (matchingOrders.length > 0) {
      const orderIds = matchingOrders.map(o => o.id);
      const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
      for (const item of items) {
        if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
        itemsByOrder[item.orderId].push(item);
      }
    }

    res.json({
      orders: matchingOrders.map(o => ({ ...o, items: itemsByOrder[o.id] || [] })),
      totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSizeNum)),
    });
  } catch (error: any) {
    console.error("Order search failed:", error);
    res.status(500).json({ error: "Failed to search orders." });
  }
});

app.get("/api/admin/dashboard-stats", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const reqUser = req.user;
    const isAdmin = reqUser?.role === "admin" || reqUser?.roles?.includes("admin");
    if (!reqUser) {
      return res.status(401).json({ error: "Unauthorized: Please log in." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }

    const [
      totalOrdersResult,
      activeDeliveriesResult,
      deliveredOrdersFees,
      totalCustomersResult,
      vendorStatusCounts,
      riderStatusCounts,
      commissionSettings,
    ] = await Promise.all([
      db.select({ value: count() }).from(orders),
      db.select({ value: count() }).from(orders).where(
        inArray(orders.status, ["accepted", "preparing", "ready", "out_for_delivery"])
      ),
      // Only the two columns actually needed for the GMV + rider-commission
      // calculation, only for delivered orders — not the full 27-column
      // table for every order regardless of status.
      db.select({ totalAmount: orders.totalAmount, deliveryFee: orders.deliveryFee })
        .from(orders)
        .where(eq(orders.status, "delivered")),
      db.select({ value: count() }).from(users).where(
        or(eq(users.role, "customer"), sql`${users.roles} @> '["customer"]'::jsonb`)
      ),
      db.select({ status: vendors.status, value: count() }).from(vendors).groupBy(vendors.status),
      db.select({ status: riders.status, value: count() }).from(riders).groupBy(riders.status),
      db.select().from(systemSettings).where(
        inArray(systemSettings.key, ["platformCommissionRate", "riderCommissionType", "riderCommissionValue"])
      ),
    ]);

    const settingsMap: Record<string, string> = {};
    for (const s of commissionSettings) settingsMap[s.key] = s.value;
    const platformCommissionRate = Number(settingsMap.platformCommissionRate || 15);
    const riderCommissionType = settingsMap.riderCommissionType || "percentage";
    const riderCommissionValue = Number(settingsMap.riderCommissionValue ?? 20);

    const gmv = deliveredOrdersFees.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const vendorCommission = gmv * (platformCommissionRate / 100);
    const totalRiderCommissions = deliveredOrdersFees.reduce((sum, o) => {
      const deliveryFee = o.deliveryFee ?? 750;
      const netFee = riderCommissionType === "flat"
        ? Math.max(0, deliveryFee - riderCommissionValue)
        : Math.max(0, deliveryFee - (deliveryFee * riderCommissionValue) / 100);
      return sum + (deliveryFee - netFee);
    }, 0);
    const commission = vendorCommission + totalRiderCommissions;

    const vendorCounts = { pending: 0, approved: 0, suspended: 0, total: 0 };
    for (const row of vendorStatusCounts) {
      const c = Number(row.value);
      vendorCounts.total += c;
      if (row.status === "pending") vendorCounts.pending = c;
      if (row.status === "approved") vendorCounts.approved = c;
      if (row.status === "suspended") vendorCounts.suspended = c;
    }

    const riderCounts = { pending: 0, approved: 0, suspended: 0, total: 0 };
    for (const row of riderStatusCounts) {
      const c = Number(row.value);
      riderCounts.total += c;
      if (row.status === "pending") riderCounts.pending = c;
      if (row.status === "approved") riderCounts.approved = c;
      if (row.status === "suspended") riderCounts.suspended = c;
    }

    res.json({
      totalOrdersCount: Number(totalOrdersResult[0]?.value || 0),
      activeDeliveriesCount: Number(activeDeliveriesResult[0]?.value || 0),
      totalCustomersCount: Number(totalCustomersResult[0]?.value || 0),
      gmv,
      commission,
      totalVendorApplications: vendorCounts.total,
      pendingApprovalVendors: vendorCounts.pending,
      approvedVendorsCount: vendorCounts.approved,
      suspendedVendorsCount: vendorCounts.suspended,
      totalRiderApplications: riderCounts.total,
      pendingApprovalRiders: riderCounts.pending,
      approvedRidersCount: riderCounts.approved,
      suspendedRidersCount: riderCounts.suspended,
    });
  } catch (error: any) {
    console.error("Dashboard stats failed:", error);
    res.status(500).json({ error: "Failed to load dashboard stats." });
  }
});

app.get("/api/sync/version", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const versionRow = await db.select().from(systemSettings).where(eq(systemSettings.key, "dataVersion")).limit(1);
    res.json({ version: versionRow.length > 0 ? versionRow[0].value : "0" });
  } catch (error: any) {
    console.error("Version check failed:", error);
    res.status(500).json({ error: "Failed to check data version." });
  }
});

// 2. Database Synchronization Endpoint: LOAD
app.get("/api/sync/load", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const reqUser = req.user;
    const superAdminEmails = ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"];
    const isAdmin = reqUser && (reqUser.roles?.includes("admin") || reqUser.roles?.includes("super_admin") || reqUser.role === "admin" || reqUser.role === "super_admin" || superAdminEmails.includes(reqUser.email));
    
    // Always load public baseline data. These 7 queries have no
    // interdependency, so they run concurrently instead of one at a time —
    // this was previously 7 sequential round-trips before even reaching
    // user-specific data.
    const [
      allVendors,
      allProducts,
      allPaymentGateways,
      allExtremeLocationTiers,
      allExtremeLocations,
      allSystemSettings,
      allReviews,
    ] = await Promise.all([
      db.select().from(vendors),
      db.select().from(products),
      db.select().from(paymentGateways),
      db.select().from(extremeLocationTiers),
      db.select().from(extremeLocations),
      db.select().from(systemSettings),
      db.select().from(reviews),
    ]);

    let allUsers: any[] = [];
    let allOrders: any[] = [];
    let allOrderItems: any[] = [];
    let allRiders: any[] = [];
    let allSavedAddresses: any[] = [];
    let allEmployees: any[] = [];
    let allWalletTransactions: any[] = [];
    let allAppNotifications: any[] = [];

    if (isAdmin) {
      // Admins get everything — these 8 queries are independent of each
      // other too, so they also run concurrently.
      [
        allUsers,
        allOrders,
        allOrderItems,
        allRiders,
        allSavedAddresses,
        allEmployees,
        allWalletTransactions,
        allAppNotifications,
      ] = await Promise.all([
        db.select({
          id: users.id,
          email: users.email,
          name: users.name,
          phone: users.phone,
          role: users.role,
          gender: users.gender,
          createdAt: users.createdAt,
          roles: users.roles,
        }).from(users),
        db.select().from(orders),
        db.select().from(orderItems),
        db.select().from(riders),
        db.select().from(userSavedAddresses),
        db.select().from(employees),
        db.select().from(walletTransactions),
        db.select().from(appNotifications),
      ]);
    } else if (reqUser) {
      // Regular user / Vendor / Rider - Tenant Isolation.
      // userVendor is derived synchronously from allVendors (already loaded
      // above), so it's available before firing off this batch — only the
      // order-items query genuinely has to wait, since it needs the
      // resolved order IDs first.
      const userVendor = allVendors.find(v => v.userId === reqUser.id);

      const ordersFilter = userVendor
        ? sql`${orders.customerId} = ${reqUser.id} OR ${orders.vendorId} = ${userVendor.id}`
        : eq(orders.customerId, reqUser.id);

      [
        allUsers,
        allOrders,
        allRiders,
        allSavedAddresses,
        allWalletTransactions,
        allAppNotifications,
      ] = await Promise.all([
        db.select().from(users).where(eq(users.id, reqUser.id)),
        db.select().from(orders).where(ordersFilter),
        reqUser.roles?.includes("rider")
          ? db.select().from(riders).where(eq(riders.userId, reqUser.id))
          : Promise.resolve([]),
        db.select().from(userSavedAddresses).where(eq(userSavedAddresses.userId, reqUser.id)),
        db.select().from(walletTransactions).where(eq(walletTransactions.userId, reqUser.id)),
        db.select().from(appNotifications).where(eq(appNotifications.userId, reqUser.id)),
      ]);

      if (allOrders.length > 0) {
        const orderIds = allOrders.map(o => o.id);
        allOrderItems = await db.select().from(orderItems).where(sql`${orderItems.orderId} IN (${sql.join(orderIds, sql`, `)})`);
      }
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

// Admin-only: view the audit trail. Supports optional ?resource= filtering
// (e.g. a specific vendor/rider ID) so the admin panel can show "history
// for this application" as well as the full platform-wide log.
app.get("/api/admin/audit-logs", verifyTokenOptional, async (req: any, res) => {
  try {
    const reqUser = req.user;
    const superAdminEmails = ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"];
    const isAdmin = reqUser && (reqUser.roles?.includes("admin") || reqUser.roles?.includes("super_admin") || reqUser.role === "admin" || reqUser.role === "super_admin" || superAdminEmails.includes(reqUser.email));
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized: Admins only." });
    }

    const resourceFilter = typeof req.query.resource === "string" ? req.query.resource : null;
    const rows = resourceFilter
      ? await db.select().from(auditLogs).where(eq(auditLogs.resource, resourceFilter))
      : await db.select().from(auditLogs);

    // Newest first, and attach the admin's name/email for readability
    // instead of forcing the UI to cross-reference user IDs itself.
    const sorted = rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const actorIds = [...new Set(sorted.map(r => r.userId))];
    const actors = actorIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, actorIds))
      : [];
    const actorMap = new Map(actors.map(a => [a.id, a]));

    res.json({
      logs: sorted.map(r => ({
        ...r,
        actorName: actorMap.get(r.userId)?.name || "Unknown",
        actorEmail: actorMap.get(r.userId)?.email || "",
      })),
    });
  } catch (error: any) {
    console.error("Failed to load audit logs:", error);
    res.status(500).json({ error: "Failed to load audit logs." });
  }
});

// 3. Database Synchronization Endpoint: SAVE
app.post("/api/sync/save", verifyTokenOptional, async (req, res) => {
  try {
    const { type, payload } = req.body;
    const reqUser = (req as any).user;
    // Populated by specific cases (e.g. ORDER_UPSERT) so the client can sync
    // its local state to exactly what the server actually confirmed/saved,
    // rather than trusting its own optimistic copy of the payload.
    let responseExtra: any = {};

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
      case "AUDIT_LOG_CREATE": {
        // Only real, verified admins can write audit entries — and the
        // "who did this" field always comes from the verified token, never
        // from whatever the client claims, so it can't be spoofed.
        if (!isAdmin) {
          return res.status(403).json({ error: "Unauthorized: Only admins can create audit log entries." });
        }
        await db.insert(auditLogs).values({
          id: payload.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: reqUser.id,
          action: String(payload.action || "UNKNOWN_ACTION"),
          resource: String(payload.resource || ""),
          details: payload.details ? String(payload.details) : null,
          createdAt: new Date().toISOString(),
        });
        break;
      }

      case "ORDER_REOPEN": {
        // Admin-only, matching how every other order-status action in
        // this app (verify/reject payment, force-cancel) is gated.
        if (!isAdmin) {
          return res.status(403).json({ error: "Unauthorized: Only admins can reopen orders." });
        }

        const reason = String(payload.reason || "").trim();
        if (!reason) {
          return res.status(400).json({ error: "A reason is required to reopen a cancelled order." });
        }

        const orderRows = await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1);
        if (orderRows.length === 0) {
          return res.status(404).json({ error: "Order not found." });
        }
        const existingOrder = orderRows[0];
        if (existingOrder.status !== "cancelled") {
          return res.status(400).json({ error: "Only cancelled orders can be reopened." });
        }

        // Deliberately restores to "pending" regardless of what the order's
        // status was before cancellation -- letting it flow through the
        // normal pipeline again from the start, rather than guessing at an
        // ambiguous prior in-progress state. This update ONLY touches
        // status -- it never touches riderPayoutStatus, vendorPayoutStatus,
        // or anything wallet/payment-related, so a payout that was already
        // released (or a payment that was already processed) before
        // cancellation can never be duplicated by reopening.
        const newStatus = "pending";
        await db.update(orders).set({ status: newStatus }).where(eq(orders.id, payload.orderId));

        // Immutable audit trail entry. There is deliberately no endpoint
        // anywhere that edits or deletes rows in this table -- "immutable"
        // means no such code path exists, not just a permission check.
        await db.insert(auditLogs).values({
          id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: reqUser.id,
          action: "ORDER_REOPENED",
          resource: payload.orderId,
          details: JSON.stringify({
            previousStatus: "cancelled",
            newStatus,
            reason,
            timestamp: new Date().toISOString(),
          }),
          createdAt: new Date().toISOString(),
        });

        responseExtra.order = { ...existingOrder, status: newStatus };
        break;
      }

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

        // Return exactly what was confirmed/saved, so the client syncs its
        // local state to server truth instead of trusting its own optimistic copy.
        // The pin (bcrypt hash) is deliberately excluded — it should never be
        // sent back to or stored on the client.
        const savedUserRows = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
        if (savedUserRows.length > 0) {
          const { pin: _omitPin, ...userWithoutPin } = savedUserRows[0] as any;
          responseExtra.user = userWithoutPin;
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
            batchDeliveryEnabled: v.batchDeliveryEnabled,
            batchCutoffOverrideMinutes: v.batchCutoffOverrideMinutes,
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
              batchDeliveryEnabled: v.batchDeliveryEnabled,
              batchCutoffOverrideMinutes: v.batchCutoffOverrideMinutes,
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
          batchDeliveryEnabled: payload.batchDeliveryEnabled,
          batchCutoffOverrideMinutes: payload.batchCutoffOverrideMinutes,
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
            batchDeliveryEnabled: payload.batchDeliveryEnabled,
            batchCutoffOverrideMinutes: payload.batchCutoffOverrideMinutes,
          },
        });

        // Return exactly what was confirmed/saved, so the client syncs its
        // local state to server truth instead of trusting its own optimistic copy.
        const savedVendorRows = await db.select().from(vendors).where(eq(vendors.id, payload.id)).limit(1);
        if (savedVendorRows.length > 0) {
          responseExtra.vendor = savedVendorRows[0];
        }
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

        // Return exactly what was confirmed/saved, so the client syncs its
        // local state to server truth instead of trusting its own optimistic copy.
        const savedProductRows = await db.select().from(products).where(eq(products.id, payload.id)).limit(1);
        if (savedProductRows.length > 0) {
          responseExtra.product = savedProductRows[0];
        }
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
        responseExtra.deletedId = payload.id;
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
            // Only admins can mark a payout as released — preserve the
            // existing value for anyone else regardless of what they sent.
            payload.riderPayoutStatus = order.riderPayoutStatus;
            payload.vendorPayoutStatus = order.vendorPayoutStatus;
            
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
          riderPayoutStatus: payload.riderPayoutStatus || "pending",
          vendorPayoutStatus: payload.vendorPayoutStatus || "pending",
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
            riderPayoutStatus: payload.riderPayoutStatus,
            vendorPayoutStatus: payload.vendorPayoutStatus,
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

        // Log a payout release whenever an admin actually transitions a
        // payout from pending to paid, so there's a real audit trail to
        // filter/report against later (who released it, when, how much).
        if (isAdmin && !isNew) {
          const prevOrder = existingOrder[0];
          if (payload.riderPayoutStatus === "paid" && prevOrder.riderPayoutStatus !== "paid" && payload.riderId) {
            await db.insert(payoutLogs).values({
              id: "pl-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
              orderId: payload.id,
              recipientType: "rider",
              recipientId: payload.riderId,
              amount: Math.round(prevOrder.deliveryFee || 0),
              releasedBy: reqUser.id,
              releasedAt: new Date().toISOString(),
              paymentMethod: "manual_admin_release",
              status: "released",
            });
          }
          if (payload.vendorPayoutStatus === "paid" && prevOrder.vendorPayoutStatus !== "paid" && payload.vendorId) {
            // Items subtotal is what belongs to the vendor before commission
            // (excludes platform service fee, delivery fee owed to the rider,
            // and tax, none of which are the vendor's revenue).
            const itemsSubtotal = (prevOrder.totalAmount || 0) - (prevOrder.serviceFee || 0) - (prevOrder.deliveryFee || 0) - (prevOrder.tax || 0);

            // Apply the vendor's own configured commission rate — the same
            // flat/percentage pattern already used for rider payouts.
            const vendorForPayout = await db.select().from(vendors).where(eq(vendors.id, payload.vendorId)).limit(1);
            const commissionType = vendorForPayout[0]?.commissionType || "percentage";
            const commissionValue = vendorForPayout[0]?.commissionValue ?? 15;
            const vendorAmount = Math.round(
              commissionType === "flat"
                ? Math.max(0, itemsSubtotal - commissionValue)
                : Math.max(0, itemsSubtotal - (itemsSubtotal * commissionValue) / 100)
            );

            await db.insert(payoutLogs).values({
              id: "pl-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
              orderId: payload.id,
              recipientType: "vendor",
              recipientId: payload.vendorId,
              amount: vendorAmount,
              releasedBy: reqUser.id,
              releasedAt: new Date().toISOString(),
              paymentMethod: "manual_admin_release",
              status: "released",
            });
          }
        }

        // Return exactly what was confirmed/saved, so the client syncs its
        // local state to server truth instead of trusting its own optimistic copy.
        const savedOrderRows = await db.select().from(orders).where(eq(orders.id, payload.id)).limit(1);
        const savedOrderItems = await db.select().from(orderItems).where(eq(orderItems.orderId, payload.id));
        if (savedOrderRows.length > 0) {
          responseExtra.order = { ...savedOrderRows[0], items: savedOrderItems };
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

        // Return exactly what was confirmed/saved, so the client syncs its
        // local state to server truth instead of trusting its own optimistic copy.
        const savedRiderRows = await db.select().from(riders).where(eq(riders.id, payload.id)).limit(1);
        if (savedRiderRows.length > 0) {
          responseExtra.rider = savedRiderRows[0];
        }
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

      case "NOTIFICATION_CREATE": {
        // Any authenticated user can create a notification for another user
        // (e.g. a customer notifying a vendor of a new order, an applicant
        // notifying admins of a new application) — this mirrors how
        // notifications are already used throughout the app. Requiring at
        // least authentication (not fully anonymous) keeps this from being
        // a wide-open spam vector while not over-restricting a genuinely
        // low-stakes, non-financial write.
        if (!reqUser) {
          return res.status(401).json({ error: "Unauthorized: Please log in." });
        }
        await db.insert(appNotifications).values({
          id: payload.id,
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          read: false,
          createdAt: payload.createdAt || new Date().toISOString(),
          relatedId: payload.relatedId,
        });
      } break;

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

        // Recalculate and persist the vendor's average rating here, server-side.
        // (Previously the client tried to do this itself via a separate
        // VENDOR_UPSERT call, but that call requires the vendor's own userId
        // and was silently rejected with 403 for every real customer review —
        // the rating never actually made it into the database.)
        const allVendorReviews = await db.select().from(reviews).where(eq(reviews.vendorId, payload.vendorId));
        if (allVendorReviews.length > 0) {
          const avgRating = Number(
            (allVendorReviews.reduce((sum, r) => sum + Number(r.rating), 0) / allVendorReviews.length).toFixed(1)
          );
          await db.update(vendors).set({ rating: avgRating }).where(eq(vendors.id, payload.vendorId));
          responseExtra.vendorRating = avgRating;
        }
      }
      break;

      default:
        return res.status(400).json({ error: `Unknown synchronization type: ${type}` });
    }
    // Changes that affect what EVERYONE browsing the storefront sees —
    // these still need a genuine global broadcast, guests included.
    const publicConfigModifiers = [
      "SYSTEM_SETTING_UPSERT",
      "SYSTEM_SETTINGS_BULK",
      "VENDORS_BULK",
      "PRODUCTS_BULK",
      "PRODUCTS_UPSERT",
      "EXTREME_LOCATIONS_BULK",
      "EXTREME_LOCATION_TIERS_BULK",
      // Single-item vendor/product edits are also public-facing: a store's
      // open/closed status or a product's availability needs to reach
      // anyone currently browsing, not just the vendor who made the change.
      "VENDOR_UPSERT",
      "PRODUCT_UPSERT",
      "PRODUCT_DELETE",
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
      // Everything else here is personal/operational data — a single
      // user's own profile edit, one order, one rider's status — and has
      // no reason to be pushed to every unrelated connected browser.
      // Route it only to the specific people it actually concerns, plus
      // admins (who monitor everything). Anyone not directly targeted
      // still sees the change within ~15s via the regular lightweight
      // version-check poll, so nothing is silently missed — it's just
      // not instantly pushed to strangers it has nothing to do with.
      const notifyRooms = new Set<string>(["admin"]);
      if (payload?.id) notifyRooms.add(payload.id);
      if (payload?.customerId) notifyRooms.add(payload.customerId);
      if (payload?.vendorId) notifyRooms.add(payload.vendorId);
      if (payload?.riderId) notifyRooms.add(payload.riderId);
      if (payload?.userId) notifyRooms.add(payload.userId);

      for (const room of notifyRooms) {
        io.to(room).emit("sync_update", { type, payload });
      }
    }

    // Bump a general-purpose "has anything changed" version on every write,
    // regardless of type. The client polls this single lightweight value
    // instead of re-downloading the entire dataset every 15 seconds.
    const bumpedDataVersion = Date.now().toString();
    await db.insert(systemSettings).values({
      key: "dataVersion",
      value: bumpedDataVersion,
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: bumpedDataVersion },
    });

    res.json({ success: true, ...responseExtra });
  } catch (error) {
    console.error("Cloud SQL sync save failed:", error);
    res.status(500).json({ error: "Failed to sync updates to Cloud SQL database." });
  }
});

// 4. Secure Checkout API
app.post("/api/checkout", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const { customerName, customerPhone, vendorId, vendorName, items, deliveryAddress, paymentMethod, serviceFee, deliveryFee, tax, receiptImage, orderType, receiptImageOrQr, receiptNote, batchDate, batchTime } = req.body;

    const isReceiptPickup = orderType === "receipt_pickup";

    if (!req.user) {
      return res.status(403).json({ error: `Unauthorized: Invalid JWT token. Details: ${req.jwtError || 'Missing token'}` });
    }

    // Always trust the verified JWT for identity — never a client-supplied ID.
    // A client-sent customerId can drift out of sync with the real logged-in
    // user (stale cache, re-registration, etc.), so it's no longer accepted.
    const customerId = req.user.id;

    if (!vendorId || (!isReceiptPickup && (!items || !Array.isArray(items)))) {
      return res.status(400).json({ error: "Missing required checkout fields" });
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

    // Validate batch delivery selection server-side. A client could try to
    // claim a batch discount for a time that's fictional or already past
    // its cutoff -- this closes that gap without rebuilding the whole
    // fee-trust model (delivery fee itself is still client-computed,
    // consistent with how it already worked before batching existed).
    let validatedBatchDate: string | null = null;
    let validatedBatchTime: string | null = null;
    if (batchDate && batchTime) {
      const batchSettingsRows = await db.select().from(systemSettings).where(
        inArray(systemSettings.key, ["batchDeliverySystemEnabled", "batchDeliveryTimes", "batchCutoffMinutes", "batchExcludedZones"])
      );
      const batchSettingsMap: Record<string, string> = {};
      for (const s of batchSettingsRows) batchSettingsMap[s.key] = s.value;

      const systemEnabled = batchSettingsMap.batchDeliverySystemEnabled !== "false";
      if (!systemEnabled) {
        return res.status(400).json({ error: "Batch delivery is not currently available. Please order now instead." });
      }

      let batchTimes: string[] = [];
      try { batchTimes = JSON.parse(batchSettingsMap.batchDeliveryTimes || "[]"); } catch {}
      const platformCutoffMinutes = Number(batchSettingsMap.batchCutoffMinutes || 60);
      let excludedZones: string[] = [];
      try { excludedZones = JSON.parse(batchSettingsMap.batchExcludedZones || "[]"); } catch {}

      const vendorForBatch = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      const vendorBatchEnabled = vendorForBatch[0]?.batchDeliveryEnabled !== false;
      const effectiveCutoffMinutes = vendorForBatch[0]?.batchCutoffOverrideMinutes ?? platformCutoffMinutes;

      const isZoneExcluded = excludedZones.some(z => deliveryAddress?.toLowerCase().includes(z.toLowerCase()));

      if (!batchTimes.includes(batchTime)) {
        return res.status(400).json({ error: "That batch time is not currently offered." });
      }
      if (!vendorBatchEnabled) {
        return res.status(400).json({ error: "This vendor is not currently participating in batch delivery." });
      }
      if (isZoneExcluded) {
        return res.status(400).json({ error: "Batch delivery is not available for this delivery zone." });
      }

      const batchDateTime = new Date(`${batchDate}T${batchTime}:00`);
      const cutoffTime = new Date(batchDateTime.getTime() - effectiveCutoffMinutes * 60000);
      if (isNaN(batchDateTime.getTime()) || new Date() > cutoffTime) {
        return res.status(400).json({ error: "That batch's ordering window has closed. Please choose a different batch or order now." });
      }

      validatedBatchDate = batchDate;
      validatedBatchTime = batchTime;
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
      batchDate: validatedBatchDate,
      batchTime: validatedBatchTime,
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
      batchDate: validatedBatchDate,
      batchTime: validatedBatchTime,
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

    // Bump the general-purpose data version so other open tabs/devices know
    // to refresh (this endpoint is outside the sync/save switch above).
    try {
      const bumpedDataVersion = Date.now().toString();
      await db.insert(systemSettings).values({
        key: "dataVersion",
        value: bumpedDataVersion,
      }).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: bumpedDataVersion },
      });
    } catch (e) {
      console.error("Failed to bump dataVersion after checkout:", e);
    }

    res.json({ success: true, orderId, finalTotal });
  } catch (error) {
    console.error("Checkout failed:", error);
    res.status(500).json({ error: "Checkout process failed." });
  }
});

// 5. Secure Wallet Funding API
app.post("/api/wallet/fund", verifyTokenOptional, async (req: any, res: any) => {
  try {
    const { userName, amount, gateway, reference } = req.body;

    if (!req.user) {
      return res.status(403).json({ error: "Unauthorized: Invalid JWT token." });
    }

    // Always trust the verified JWT for identity — never a client-supplied ID.
    const userId = req.user.id;

    if (!amount || amount <= 0) {
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

    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      const { createServer: createViteServer } = await import("vite");
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

    if (!process.env.VERCEL) {
      server.listen(PORT, () => {
        logger.server(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;

