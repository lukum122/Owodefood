// Notifications read/clear, payout requests, live customer carts, and map
// settings (provider + coverage areas).
//
// Money rules:
// - A vendor earns each delivered order's FOOD subtotal (total minus
//   service fee, delivery fee and tax) minus the vendor's commission.
// - A rider earns each delivered order's delivery fee minus the platform
//   rider commission.
// - Only delivered orders whose payout is still "pending" and that are not
//   already part of an open request count towards the available balance.
// - Admin transfers the money by hand, then presses "Paid": that settles
//   every order in the request and writes payout_logs rows.

import crypto from "crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  appNotifications, auditLogs, customerCarts, orders, payoutAccounts, payoutLogs, payoutRequests,
  products, riders, systemSettings, users, vendors,
} from "../db/schema.ts";

interface Deps {
  io: any;
  verifyTokenOptional: any;
  sendPushToUsers: (ids: string[], data: { title: string; body: string; url?: string; tag?: string; urgent?: boolean }) => Promise<void> | void;
  isAdminUser: (u: any) => boolean;
  hasPermission: (u: any, key: string) => Promise<boolean>;
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;
const nowIso = () => new Date().toISOString();
const CART_KEEP_DAYS = 7;

async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}
async function setSetting(key: string, value: string) {
  await db.insert(systemSettings).values({ key, value }).onConflictDoUpdate({ target: systemSettings.key, set: { value } });
}

// ---------------------------------------------------------------------------
// Map settings + coverage areas
// ---------------------------------------------------------------------------
export interface CoverageArea { id: string; name: string; lat: number; lng: number; radiusKm: number }
export interface MapSettings {
  provider: "osm" | "google";
  googleApiKey: string;
  coverageEnabled: boolean;
  areas: CoverageArea[];
  coverageMessage: string;
}

const DEFAULT_MAP_SETTINGS: MapSettings = {
  provider: "osm",
  googleApiKey: "",
  coverageEnabled: false,
  areas: [],
  coverageMessage: "Sorry, we don't deliver to this location yet. Please pick a spot inside our delivery area.",
};

export async function loadMapSettings(): Promise<MapSettings> {
  let s: MapSettings = { ...DEFAULT_MAP_SETTINGS };
  try {
    const raw = await getSetting("mapSettings");
    if (raw) s = { ...s, ...JSON.parse(raw) };
  } catch { /* fall back to defaults */ }
  if (!s.googleApiKey && process.env.GOOGLE_MAPS_API_KEY) s.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  // Google selected but no key: quietly use the free map so maps still work.
  if (s.provider === "google" && !s.googleApiKey) s.provider = "osm";
  if (!Array.isArray(s.areas)) s.areas = [];
  return s;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ok=true when coverage is off, no pin was given, or the pin is inside an area. */
export async function checkCoverage(lat: any, lng: any): Promise<{ ok: boolean; message?: string; areaName?: string }> {
  const s = await loadMapSettings();
  if (!s.coverageEnabled || s.areas.length === 0) return { ok: true };
  if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) return { ok: true };
  const hit = s.areas.find((a) => haversineKm(a.lat, a.lng, lat, lng) <= a.radiusKm);
  return hit ? { ok: true, areaName: hit.name } : { ok: false, message: s.coverageMessage };
}

// ---------------------------------------------------------------------------
// Google map images + address search
// ---------------------------------------------------------------------------
// Google's Map Tiles API needs a session token (valid ~2 weeks). We make it
// on the server and hand the browser a ready tile URL, so the same Leaflet
// map works with either the free OpenStreetMap images or Google's.
let googleSession: { key: string; token: string; expiresAt: number } | null = null;
let googleSessionFailedAt = 0;

async function googleTileSession(key: string): Promise<string | null> {
  const now = Date.now();
  if (googleSession && googleSession.key === key && googleSession.expiresAt - now > 3600_000) return googleSession.token;
  if (now - googleSessionFailedAt < 5 * 60_000) return null; // don't hammer Google after a failure
  try {
    const r = await fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapType: "roadmap", language: "en-US", region: "NG" }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || !j.session) {
      console.error("[maps] Google tile session failed:", r.status, j?.error?.message || "");
      googleSessionFailedAt = now;
      return null;
    }
    googleSession = { key, token: j.session, expiresAt: Number(j.expiry) * 1000 || now + 12 * 86400_000 };
    return j.session;
  } catch (e) {
    console.error("[maps] Google tile session error:", e);
    googleSessionFailedAt = now;
    return null;
  }
}

/** Google tile URL when Google is selected and working; otherwise null (use OpenStreetMap). */
export async function googleTileConfig(): Promise<{ tileUrl: string; attribution: string; maxZoom: number } | null> {
  const s = await loadMapSettings();
  if (s.provider !== "google" || !s.googleApiKey) return null;
  const token = await googleTileSession(s.googleApiKey);
  if (!token) return null;
  return {
    tileUrl: `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${token}&key=${encodeURIComponent(s.googleApiKey)}`,
    attribution: "Map data ©" + new Date().getFullYear() + " Google",
    maxZoom: 21,
  };
}

export interface PlaceResult { name: string; address: string; lat: number; lng: number }
const searchCache = new Map<string, { at: number; data: any }>();
function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.data);
  return fn().then((data) => {
    if (searchCache.size > 2000) searchCache.clear();
    searchCache.set(key, { at: Date.now(), data });
    return data;
  });
}
// Address search is open to everyone (guests check out too), so cap how
// often one connection can call it -- protects the Google bill.
const hits = new Map<string, number[]>();
function tooMany(ip: string, bucket: string, perMinute: number): boolean {
  const key = bucket + ":" + ip;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > perMinute;
}
const NOMINATIM_HEADERS = { "User-Agent": "OwodeFood/1.0 (delivery app)", "Accept-Language": "en" };

async function searchPlaces(q: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const s = await loadMapSettings();
  if (s.googleApiKey) {
    const body: any = { textQuery: q, regionCode: "NG", maxResultCount: 6 };
    if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 30000 } };
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": s.googleApiKey, "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location" },
      body: JSON.stringify(body),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(j.places)) {
      return j.places.filter((p: any) => p.location).map((p: any) => ({
        name: p.displayName?.text || p.formattedAddress || q, address: p.formattedAddress || "",
        lat: p.location.latitude, lng: p.location.longitude,
      }));
    }
    console.error("[maps] Google search failed, using OpenStreetMap:", r.status, j?.error?.message || "");
  }
  const params = new URLSearchParams({ q, format: "jsonv2", limit: "6", countrycodes: "ng", addressdetails: "0" });
  if (near) params.set("viewbox", `${near.lng - 0.4},${near.lat + 0.4},${near.lng + 0.4},${near.lat - 0.4}`);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: NOMINATIM_HEADERS });
  const j: any = await r.json().catch(() => []);
  return (Array.isArray(j) ? j : []).map((p: any) => ({
    name: p.name || String(p.display_name || "").split(",")[0], address: p.display_name || "",
    lat: Number(p.lat), lng: Number(p.lon),
  })).filter((p: PlaceResult) => isFinite(p.lat) && isFinite(p.lng));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const s = await loadMapSettings();
  if (s.googleApiKey) {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(s.googleApiKey)}`);
    const j: any = await r.json().catch(() => ({}));
    if (j.status === "OK" && j.results?.[0]?.formatted_address) return j.results[0].formatted_address;
  }
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, { headers: NOMINATIM_HEADERS });
  const j: any = await r.json().catch(() => ({}));
  return j?.display_name || null;
}

// ---------------------------------------------------------------------------
// Payout maths
// ---------------------------------------------------------------------------
async function riderCommission(): Promise<{ type: string; value: number }> {
  const [t, v] = await Promise.all([getSetting("riderCommissionType"), getSetting("riderCommissionValue")]);
  // Same default (20%) as the existing payout-approval code in server.ts.
  return { type: t || "percentage", value: v != null && v !== "" ? Number(v) || 0 : 20 };
}

export function vendorFoodSubtotal(o: any): number {
  return Math.max(0, (o.totalAmount || 0) - (o.serviceFee || 0) - (o.deliveryFee || 0) - (o.tax || 0));
}
function vendorNet(o: any, vendor: any): number {
  const sub = vendorFoodSubtotal(o);
  const type = vendor?.commissionType || "percentage";
  const val = vendor?.commissionValue ?? 15;
  return Math.round(type === "flat" ? Math.max(0, sub - val) : Math.max(0, sub - (sub * val) / 100));
}
function riderNet(o: any, comm: { type: string; value: number }): number {
  const fee = o.deliveryFee || 0;
  return Math.round(comm.type === "flat" ? Math.max(0, fee - comm.value) : Math.max(0, fee - (fee * comm.value) / 100));
}

async function lockedOrderIds(recipientId: string): Promise<Set<string>> {
  const open = await db.select({ orderIds: payoutRequests.orderIds }).from(payoutRequests)
    .where(and(eq(payoutRequests.recipientId, recipientId), eq(payoutRequests.status, "pending")));
  const s = new Set<string>();
  for (const r of open) for (const id of ((r.orderIds as string[]) || [])) s.add(id);
  return s;
}

async function availableFor(type: "vendor" | "rider", recipientId: string) {
  const locked = await lockedOrderIds(recipientId);
  if (type === "vendor") {
    const vendor = (await db.select().from(vendors).where(eq(vendors.id, recipientId)).limit(1))[0];
    const rows = await db.select().from(orders).where(and(
      eq(orders.vendorId, recipientId), eq(orders.status, "delivered"), eq(orders.vendorPayoutStatus, "pending"),
    ));
    const perOrder = rows.filter((o: any) => !locked.has(o.id)).map((o: any) => ({ id: o.id, amount: vendorNet(o, vendor) }));
    return { orders: perOrder, amount: perOrder.reduce((s, o) => s + o.amount, 0) };
  }
  const comm = await riderCommission();
  const rows = await db.select().from(orders).where(and(
    eq(orders.riderId, recipientId), eq(orders.status, "delivered"), eq(orders.riderPayoutStatus, "pending"),
  ));
  const perOrder = rows.filter((o: any) => !locked.has(o.id)).map((o: any) => ({ id: o.id, amount: riderNet(o, comm) }));
  return { orders: perOrder, amount: perOrder.reduce((s, o) => s + o.amount, 0) };
}

async function myRecipients(userId: string) {
  const [vs, rs] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.userId, userId)),
    db.select().from(riders).where(eq(riders.userId, userId)),
  ]);
  return [
    ...vs.filter((v: any) => v.status === "approved").map((v: any) => ({ type: "vendor" as const, id: v.id, name: v.name })),
    ...rs.filter((r: any) => r.status === "approved").map((r: any) => ({ type: "rider" as const, id: r.id, name: r.name })),
  ];
}

async function adminUserIds(): Promise<string[]> {
  const all = await db.select({ id: users.id, role: users.role, roles: users.roles }).from(users);
  return all.filter((u: any) => {
    const roles: string[] = Array.isArray(u.roles) ? u.roles : [];
    return roles.includes("admin") || roles.includes("super_admin") || u.role === "admin" || u.role === "super_admin";
  }).map((u: any) => u.id);
}

// Saves an in-app notification, pushes it live to the person's open app
// (which beeps), and sends a phone push if they allowed it.
async function notifyUsers(deps: Deps, userIds: string[], title: string, message: string, type: string, relatedId?: string, url?: string) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  for (const userId of ids) {
    const n = { id: newId("notif"), userId, title, message, type, read: false, createdAt: nowIso(), relatedId: relatedId || null };
    try {
      await db.insert(appNotifications).values(n as any);
      deps.io.to(userId).emit("sync_update", { type: "NOTIFICATION_CREATE", payload: n });
    } catch (e) {
      console.error("[notifyUsers] failed:", e);
    }
  }
  try { await deps.sendPushToUsers(ids, { title, body: message, url: url || "/", tag: relatedId }); } catch { /* best effort */ }
}

const maskAccount = (n: string) => (n && n.length > 4 ? "•••• " + n.slice(-4) : n);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export function registerExtraRoutes(app: any, deps: Deps) {
  const { verifyTokenOptional, isAdminUser, hasPermission } = deps;
  const canSeePayouts = async (u: any) => isAdminUser(u)
    || (await hasPermission(u, "view_vendor_payouts")) || (await hasPermission(u, "view_rider_payouts"));

  // ---------------- Notifications ----------------
  const notifWhere = (req: any) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: any) => typeof x === "string").slice(0, 500) : [];
    return ids.length
      ? and(eq(appNotifications.userId, req.user.id), inArray(appNotifications.id, ids))
      : eq(appNotifications.userId, req.user.id);
  };
  app.post("/api/notifications/read", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Please log in." });
      await db.update(appNotifications).set({ read: true }).where(notifWhere(req));
      res.json({ success: true });
    } catch (e) {
      console.error("Mark notifications read failed:", e);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.post("/api/notifications/clear", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Please log in." });
      await db.delete(appNotifications).where(notifWhere(req));
      res.json({ success: true });
    } catch (e) {
      console.error("Clear notifications failed:", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ---------------- Payouts: vendor / rider side ----------------
  app.get("/api/payouts/me", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Please log in." });
      const recips = await myRecipients(req.user.id);
      const minAmount = Number(await getSetting("payoutMinAmount")) || 0;
      const out = [];
      for (const r of recips) {
        const [avail, acct, reqs] = await Promise.all([
          availableFor(r.type, r.id),
          db.select().from(payoutAccounts).where(and(eq(payoutAccounts.recipientType, r.type), eq(payoutAccounts.recipientId, r.id))).limit(1),
          db.select().from(payoutRequests).where(eq(payoutRequests.recipientId, r.id)).orderBy(desc(payoutRequests.requestedAt)).limit(30),
        ]);
        out.push({
          ...r,
          available: avail.amount,
          orderCount: avail.orders.length,
          account: acct[0] ? { bankName: acct[0].bankName, accountNumber: acct[0].bankAccountNumber, accountName: acct[0].bankAccountName } : null,
          requests: reqs.map((x: any) => ({
            id: x.id, amount: x.amount, status: x.status, requestedAt: x.requestedAt, processedAt: x.processedAt,
            reference: x.reference, adminNote: x.adminNote, orderCount: ((x.orderIds as string[]) || []).length,
            bankName: x.bankName, accountNumber: maskAccount(x.bankAccountNumber),
          })),
        });
      }
      res.json({ recipients: out, minAmount });
    } catch (e) {
      console.error("Payouts load failed:", e);
      res.status(500).json({ error: "Couldn't load your earnings." });
    }
  });

  app.post("/api/payouts/account", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Please log in." });
      const { type, recipientId } = req.body || {};
      const bankName = String(req.body?.bankName || "").trim().slice(0, 80);
      const accountNumber = String(req.body?.accountNumber || "").replace(/\s+/g, "");
      const accountName = String(req.body?.accountName || "").trim().slice(0, 120);
      const mine = (await myRecipients(req.user.id)).find((r) => r.type === type && r.id === recipientId);
      if (!mine) return res.status(403).json({ error: "Not your account." });
      if (!bankName || !accountName) return res.status(400).json({ error: "Enter the bank name and account name." });
      if (!/^\d{10}$/.test(accountNumber)) return res.status(400).json({ error: "Account number must be 10 digits." });

      const existing = await db.select().from(payoutAccounts)
        .where(and(eq(payoutAccounts.recipientType, type), eq(payoutAccounts.recipientId, recipientId))).limit(1);
      if (existing[0]) {
        await db.update(payoutAccounts).set({ bankName, bankAccountNumber: accountNumber, bankAccountName: accountName, userId: req.user.id, updatedAt: nowIso() })
          .where(eq(payoutAccounts.id, existing[0].id));
      } else {
        await db.insert(payoutAccounts).values({
          id: newId("pa"), recipientType: type, recipientId, userId: req.user.id,
          bankName, bankAccountNumber: accountNumber, bankAccountName: accountName, updatedAt: nowIso(),
        });
      }
      res.json({ success: true });
    } catch (e) {
      console.error("Save payout account failed:", e);
      res.status(500).json({ error: "Couldn't save your bank details." });
    }
  });

  app.post("/api/payouts/request", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Please log in." });
      const { type, recipientId } = req.body || {};
      const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 300) : null;
      const mine = (await myRecipients(req.user.id)).find((r) => r.type === type && r.id === recipientId);
      if (!mine) return res.status(403).json({ error: "Not your account." });

      const acct = (await db.select().from(payoutAccounts)
        .where(and(eq(payoutAccounts.recipientType, type), eq(payoutAccounts.recipientId, recipientId))).limit(1))[0];
      if (!acct) return res.status(400).json({ error: "Add your bank details first." });

      const pending = await db.select({ id: payoutRequests.id }).from(payoutRequests)
        .where(and(eq(payoutRequests.recipientId, recipientId), eq(payoutRequests.status, "pending"))).limit(1);
      if (pending.length) return res.status(400).json({ error: "You already have a payout request waiting. Please wait for it to be paid." });

      const avail = await availableFor(type, recipientId);
      const minAmount = Number(await getSetting("payoutMinAmount")) || 0;
      if (avail.amount <= 0) return res.status(400).json({ error: "You have no unpaid earnings yet." });
      if (avail.amount < minAmount) return res.status(400).json({ error: `The minimum payout is ₦${minAmount.toLocaleString()}.` });

      const row = {
        id: newId("payreq"), recipientType: type, recipientId, recipientName: mine.name, userId: req.user.id,
        amount: avail.amount, orderIds: avail.orders.map((o) => o.id),
        bankName: acct.bankName, bankAccountNumber: acct.bankAccountNumber, bankAccountName: acct.bankAccountName,
        note, status: "pending", requestedAt: nowIso(),
      };
      await db.insert(payoutRequests).values(row as any);

      const label = type === "vendor" ? "Restaurant" : "Rider";
      await notifyUsers(deps, await adminUserIds(), `💸 Payout request: ₦${row.amount.toLocaleString()}`,
        `${label} ${mine.name} asked to be paid ₦${row.amount.toLocaleString()} for ${row.orderIds.length} order(s). ${acct.bankName} • ${acct.bankAccountName}.`,
        "wallet", row.id, "/admin/payout-requests");
      res.json({ success: true, request: { id: row.id, amount: row.amount, orderCount: row.orderIds.length } });
    } catch (e) {
      console.error("Payout request failed:", e);
      res.status(500).json({ error: "Couldn't send your request. Please try again." });
    }
  });

  // ---------------- Payouts: admin side ----------------
  app.get("/api/admin/payout-requests", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user || !(await canSeePayouts(req.user))) return res.status(403).json({ error: "Forbidden" });
      const status = ["pending", "paid", "rejected"].includes(req.query.status) ? req.query.status : null;
      const rows = status
        ? await db.select().from(payoutRequests).where(eq(payoutRequests.status, status)).orderBy(desc(payoutRequests.requestedAt)).limit(300)
        : await db.select().from(payoutRequests).orderBy(desc(payoutRequests.requestedAt)).limit(300);
      const pendingCount = (await db.select({ id: payoutRequests.id }).from(payoutRequests).where(eq(payoutRequests.status, "pending"))).length;
      res.json({ requests: rows, pendingCount, minAmount: Number(await getSetting("payoutMinAmount")) || 0, canProcess: isAdminUser(req.user) });
    } catch (e) {
      console.error("Admin payout requests failed:", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/admin/payout-settings", verifyTokenOptional, async (req: any, res: any) => {
    if (!req.user || !isAdminUser(req.user)) return res.status(403).json({ error: "Only admins can change this." });
    const n = Number(req.body?.minAmount);
    if (!isFinite(n) || n < 0 || n > 10000000) return res.status(400).json({ error: "Enter a valid amount." });
    await setSetting("payoutMinAmount", String(Math.round(n)));
    res.json({ success: true });
  });

  app.post("/api/admin/payout-requests/:id/paid", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user || !isAdminUser(req.user)) return res.status(403).json({ error: "Only admins can mark payouts as paid." });
      const r: any = (await db.select().from(payoutRequests).where(eq(payoutRequests.id, req.params.id)).limit(1))[0];
      if (!r) return res.status(404).json({ error: "Request not found." });
      if (r.status !== "pending") return res.status(400).json({ error: `This request is already ${r.status}.` });
      const reference = typeof req.body?.reference === "string" ? req.body.reference.trim().slice(0, 120) : null;
      const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim().slice(0, 300) : null;
      const at = nowIso();
      const ids: string[] = (r.orderIds as string[]) || [];

      // Mark the request paid first so a double-click can't settle twice.
      const claimed = await db.update(payoutRequests).set({ status: "paid", processedAt: at, processedBy: req.user.id, reference, adminNote })
        .where(and(eq(payoutRequests.id, r.id), eq(payoutRequests.status, "pending"))).returning({ id: payoutRequests.id });
      if (claimed.length === 0) return res.status(400).json({ error: "This request was already processed." });

      if (ids.length) {
        const rows = await db.select().from(orders).where(inArray(orders.id, ids));
        const vendor = r.recipientType === "vendor" ? (await db.select().from(vendors).where(eq(vendors.id, r.recipientId)).limit(1))[0] : null;
        const comm = r.recipientType === "rider" ? await riderCommission() : null;
        for (const o of rows as any[]) {
          const already = r.recipientType === "vendor" ? o.vendorPayoutStatus === "paid" : o.riderPayoutStatus === "paid";
          if (already) continue;
          await db.update(orders).set(r.recipientType === "vendor" ? { vendorPayoutStatus: "paid" } : { riderPayoutStatus: "paid" })
            .where(eq(orders.id, o.id));
          await db.insert(payoutLogs).values({
            id: newId("pl"), orderId: o.id, recipientType: r.recipientType, recipientId: r.recipientId,
            amount: r.recipientType === "vendor" ? vendorNet(o, vendor) : riderNet(o, comm!),
            releasedBy: req.user.id, releasedAt: at, paymentMethod: "bank_transfer", reference: reference || r.id,
            notes: `Payout request ${r.id}`, status: "released",
          } as any);
        }
      }
      await db.insert(auditLogs).values({
        id: newId("audit"), userId: req.user.id, action: "PAYOUT_REQUEST_PAID", resource: r.id,
        details: JSON.stringify({ amount: r.amount, recipientType: r.recipientType, recipientId: r.recipientId, reference }), createdAt: at,
      } as any);
      await notifyUsers(deps, [r.userId], "✅ Payout sent",
        `₦${Number(r.amount).toLocaleString()} has been paid to your ${r.bankName} account (${maskAccount(r.bankAccountNumber)}).${reference ? ` Ref: ${reference}.` : ""}`,
        "wallet", r.id, r.recipientType === "vendor" ? "/vendor/earnings" : "/rider/earnings");
      res.json({ success: true });
    } catch (e) {
      console.error("Mark payout paid failed:", e);
      res.status(500).json({ error: "Couldn't mark it as paid. Please try again." });
    }
  });

  app.post("/api/admin/payout-requests/:id/reject", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user || !isAdminUser(req.user)) return res.status(403).json({ error: "Only admins can do this." });
      const r: any = (await db.select().from(payoutRequests).where(eq(payoutRequests.id, req.params.id)).limit(1))[0];
      if (!r) return res.status(404).json({ error: "Request not found." });
      if (r.status !== "pending") return res.status(400).json({ error: `This request is already ${r.status}.` });
      const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim().slice(0, 300) : "";
      await db.update(payoutRequests).set({ status: "rejected", processedAt: nowIso(), processedBy: req.user.id, adminNote })
        .where(eq(payoutRequests.id, r.id));
      await notifyUsers(deps, [r.userId], "Payout request declined",
        `Your request for ₦${Number(r.amount).toLocaleString()} was declined.${adminNote ? ` Reason: ${adminNote}` : ""} Your earnings are still available to request again.`,
        "wallet", r.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // ---------------- Customer carts ----------------
  app.put("/api/cart", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user) return res.json({ success: true, skipped: true }); // guests: nothing to save
      const raw: any[] = Array.isArray(req.body?.items) ? req.body.items.slice(0, 60) : [];
      if (raw.length === 0) {
        await db.delete(customerCarts).where(eq(customerCarts.userId, req.user.id));
        return res.json({ success: true });
      }
      // Prices come from the database, not the browser.
      const ids = Array.from(new Set(raw.map((i) => String(i?.productId || "")).filter(Boolean)));
      const prods = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
      const byId = new Map(prods.map((p: any) => [p.id, p]));
      const items = raw.map((i) => {
        const p: any = byId.get(String(i?.productId || ""));
        if (!p) return null;
        const qty = Math.max(1, Math.min(99, Math.floor(Number(i.quantity) || 1)));
        const addons = Array.isArray(i.addons) ? i.addons.slice(0, 20).map((a: any) => ({
          name: String(a?.name || "").slice(0, 80), price: Math.max(0, Number(a?.price) || 0), quantity: Math.max(1, Number(a?.quantity) || 1),
        })) : [];
        const addonTotal = addons.reduce((s: number, a: any) => s + a.price * a.quantity, 0);
        return { productId: p.id, name: p.name, image: p.image || null, price: p.price, quantity: qty, addons, lineTotal: (p.price + addonTotal) * qty };
      }).filter(Boolean) as any[];
      if (items.length === 0) {
        await db.delete(customerCarts).where(eq(customerCarts.userId, req.user.id));
        return res.json({ success: true });
      }
      const vendorId = (byId.get(items[0].productId) as any)?.vendorId || null;
      const vendor = vendorId ? (await db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, vendorId)).limit(1))[0] : null;
      const u = (await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, req.user.id)).limit(1))[0];
      const row = {
        userId: req.user.id, userName: u?.name || null, userPhone: u?.phone || null, vendorId, vendorName: vendor?.name || null,
        items, itemCount: items.reduce((s, i) => s + i.quantity, 0), subtotal: items.reduce((s, i) => s + i.lineTotal, 0), updatedAt: nowIso(),
      };
      await db.insert(customerCarts).values(row as any).onConflictDoUpdate({ target: customerCarts.userId, set: row as any });
      res.json({ success: true });
    } catch (e) {
      console.error("Cart save failed:", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/admin/carts", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user || !(isAdminUser(req.user) || (await hasPermission(req.user, "manage_orders")))) return res.status(403).json({ error: "Forbidden" });
      const cutoff = new Date(Date.now() - CART_KEEP_DAYS * 86400000).toISOString();
      await db.delete(customerCarts).where(lt(customerCarts.updatedAt, cutoff));
      const rows = await db.select().from(customerCarts).orderBy(desc(customerCarts.updatedAt)).limit(300);
      res.json({ carts: rows, keepDays: CART_KEEP_DAYS });
    } catch (e) {
      console.error("Admin carts failed:", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ---------------- Map settings ----------------
  const canEditMap = async (u: any) => isAdminUser(u) || (await hasPermission(u, "view_settings"));
  app.get("/api/admin/map-settings", verifyTokenOptional, async (req: any, res: any) => {
    if (!req.user || !(await canEditMap(req.user))) return res.status(403).json({ error: "Forbidden" });
    const raw = await getSetting("mapSettings");
    let saved: any = {};
    try { saved = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
    res.json({ settings: { ...DEFAULT_MAP_SETTINGS, ...saved }, envKeySet: !!process.env.GOOGLE_MAPS_API_KEY });
  });

  app.post("/api/admin/map-settings/test-google", verifyTokenOptional, async (req: any, res: any) => {
    if (!req.user || !(await canEditMap(req.user))) return res.status(403).json({ error: "Forbidden" });
    const key = String(req.body?.googleApiKey || "").trim();
    if (!key) return res.status(400).json({ error: "Paste your Google key first." });
    const out: Record<string, string> = {};
    try {
      const r = await fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mapType: "roadmap", language: "en-US", region: "NG" }),
      });
      const j: any = await r.json().catch(() => ({}));
      out.mapImages = r.ok && j.session ? "ok" : (j?.error?.message || `Failed (${r.status})`);
    } catch (e: any) { out.mapImages = e?.message || "Failed"; }
    try {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.displayName" },
        body: JSON.stringify({ textQuery: "Ilorin", regionCode: "NG", maxResultCount: 1 }),
      });
      const j: any = await r.json().catch(() => ({}));
      out.search = r.ok ? "ok" : (j?.error?.message || `Failed (${r.status})`);
    } catch (e: any) { out.search = e?.message || "Failed"; }
    try {
      const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=8.4966,4.5421&key=${encodeURIComponent(key)}`);
      const j: any = await r.json().catch(() => ({}));
      out.placeNames = j.status === "OK" ? "ok" : (j.error_message || j.status || `Failed (${r.status})`);
    } catch (e: any) { out.placeNames = e?.message || "Failed"; }
    res.json(out);
  });

  app.post("/api/admin/map-settings", verifyTokenOptional, async (req: any, res: any) => {
    try {
      if (!req.user || !(await canEditMap(req.user))) return res.status(403).json({ error: "Forbidden" });
      const b = req.body || {};
      const areas: CoverageArea[] = (Array.isArray(b.areas) ? b.areas : []).slice(0, 50).map((a: any) => ({
        id: typeof a?.id === "string" && a.id ? a.id.slice(0, 40) : newId("area"),
        name: String(a?.name || "Delivery area").trim().slice(0, 60),
        lat: Number(a?.lat), lng: Number(a?.lng), radiusKm: Number(a?.radiusKm),
      })).filter((a: CoverageArea) => isFinite(a.lat) && isFinite(a.lng) && Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180 && a.radiusKm > 0 && a.radiusKm <= 200);
      const s: MapSettings = {
        provider: b.provider === "google" ? "google" : "osm",
        googleApiKey: typeof b.googleApiKey === "string" ? b.googleApiKey.trim().slice(0, 200) : "",
        coverageEnabled: !!b.coverageEnabled,
        areas,
        coverageMessage: typeof b.coverageMessage === "string" && b.coverageMessage.trim() ? b.coverageMessage.trim().slice(0, 300) : DEFAULT_MAP_SETTINGS.coverageMessage,
      };
      if (s.coverageEnabled && s.areas.length === 0) return res.status(400).json({ error: "Add at least one delivery area before turning coverage on." });
      await setSetting("mapSettings", JSON.stringify(s));
      googleSession = null; googleSessionFailedAt = 0;
      await db.insert(auditLogs).values({
        id: newId("audit"), userId: req.user.id, action: "MAP_SETTINGS_UPDATED", resource: "mapSettings",
        details: JSON.stringify({ provider: s.provider, coverageEnabled: s.coverageEnabled, areas: s.areas.length }), createdAt: nowIso(),
      } as any);
      res.json({ success: true, settings: s });
    } catch (e) {
      console.error("Save map settings failed:", e);
      res.status(500).json({ error: "Failed to save." });
    }
  });

  // Address search box on every map.
  app.get("/api/map/search", async (req: any, res: any) => {
    const q = String(req.query.q || "").trim().slice(0, 120);
    if (q.length < 3) return res.json({ results: [] });
    if (tooMany(req.ip || "?", "search", 30)) return res.json({ results: [], error: "Too many searches. Please wait a moment." });
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    const near = isFinite(lat) && isFinite(lng) && (lat || lng) ? { lat, lng } : null;
    try {
      const key = `s:${q.toLowerCase()}:${near ? near.lat.toFixed(2) + "," + near.lng.toFixed(2) : ""}`;
      res.json({ results: await cached(key, 6 * 3600_000, () => searchPlaces(q, near)) });
    } catch (e) {
      console.error("[maps] search failed:", e);
      res.json({ results: [], error: "Search isn't available right now. Tap the map to place your pin." });
    }
  });

  // The name of the place under the pin.
  app.get("/api/map/reverse", async (req: any, res: any) => {
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    if (!isFinite(lat) || !isFinite(lng)) return res.json({ name: null });
    if (tooMany(req.ip || "?", "reverse", 40)) return res.json({ name: null });
    try {
      const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
      res.json({ name: await cached(key, 24 * 3600_000, () => reverseGeocode(lat, lng)) });
    } catch {
      res.json({ name: null });
    }
  });

  // Anyone can check a pin before checkout.
  app.post("/api/map/check-coverage", async (req: any, res: any) => {
    const { lat, lng } = req.body || {};
    res.json(await checkCoverage(Number(lat), Number(lng)));
  });
}
