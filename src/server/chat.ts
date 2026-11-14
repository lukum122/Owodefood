// In-app chat: per-order conversations (customer<->vendor, customer<->rider,
// rider<->vendor) and 24/7 support chat with a shared staff inbox.
//
// Security model: who may read or write a thread is ALWAYS recomputed from
// the live order/rider/vendor records on every request -- nothing about
// membership is trusted from the browser. Admins can read every order chat
// (for disputes) but only write in support chats.

import crypto from "crypto";
import { and, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { chatMessages, chatReads, chatThreads, orders, riders, users, vendors } from "../db/schema.ts";
import { uploadPrivateImage } from "./r2.ts";

type Pair = "customer_vendor" | "customer_rider" | "rider_vendor";
type Role = "customer" | "vendor" | "rider" | "support";

interface Deps {
  io: any;
  verifyTokenOptional: any;
  sendPushToUsers: (ids: string[], data: { title: string; body: string; url?: string; tag?: string; urgent?: boolean }) => Promise<void> | void;
  isAdminUser: (u: any) => boolean;
  isActiveEmployee: (u: any) => Promise<boolean>;
}

const PAIRS: Pair[] = ["customer_vendor", "customer_rider", "rider_vendor"];
// After delivery, rider chats stay open 30 min and the restaurant chat 2 h,
// for "you forgot my drink" type issues. Cancelled = read-only at once.
const CLOSE_AFTER_MS: Record<Pair, number> = {
  customer_vendor: 2 * 60 * 60 * 1000,
  customer_rider: 30 * 60 * 1000,
  rider_vendor: 30 * 60 * 1000,
};
const MAX_BODY = 1000;

const newId = (p: string) => `${p}_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;

// --- tiny per-user rate limit (in memory) ---------------------------------
const sendLog = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (sendLog.get(userId) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  sendLog.set(userId, recent);
  return recent.length > 30;
}

async function loadUser(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] as any;
}

async function orderPeople(order: any) {
  let vendorUserId: string | null = null;
  let riderUserId: string | null = null;
  let riderName: string | null = order.riderName || null;
  let riderPhone: string | null = null;
  let vendorPhone: string | null = null;
  if (order.vendorId) {
    const v = (await db.select({ userId: vendors.userId }).from(vendors).where(eq(vendors.id, order.vendorId)).limit(1))[0];
    vendorUserId = v?.userId || null;
    if (vendorUserId) vendorPhone = (await db.select({ phone: users.phone }).from(users).where(eq(users.id, vendorUserId)).limit(1))[0]?.phone || null;
  }
  if (order.riderId) {
    const r = (await db.select().from(riders).where(eq(riders.id, order.riderId)).limit(1))[0] as any;
    riderUserId = r?.userId || null;
    riderName = r?.name || riderName;
    riderPhone = r?.phone || null;
  }
  return {
    customerUserId: order.customerId as string,
    customerName: order.customerName as string,
    customerPhone: order.customerPhone as string,
    vendorUserId,
    vendorName: order.vendorName as string,
    vendorPhone,
    riderUserId,
    riderName,
    riderPhone,
  };
}

function pairMembers(pair: Pair, p: Awaited<ReturnType<typeof orderPeople>>): Partial<Record<Role, string | null>> {
  if (pair === "customer_vendor") return { customer: p.customerUserId, vendor: p.vendorUserId };
  if (pair === "customer_rider") return { customer: p.customerUserId, rider: p.riderUserId };
  return { rider: p.riderUserId, vendor: p.vendorUserId };
}

function orderIsActive(order: any) {
  return !["delivered", "cancelled"].includes(order.status);
}

function closesAt(order: any, pair: Pair): number | null {
  if (order.status === "cancelled") return 0;
  if (order.status !== "delivered") return null; // open
  if (!order.deliveredAt) return 0;
  return new Date(order.deliveredAt).getTime() + CLOSE_AFTER_MS[pair];
}

function pairAvailable(order: any, pair: Pair) {
  if (pair === "customer_vendor") return true;
  return !!order.riderId; // rider chats appear once a rider has the job
}

async function ensureOrderThread(orderId: string, pair: Pair) {
  const existing = await db.select().from(chatThreads).where(and(eq(chatThreads.orderId, orderId), eq(chatThreads.pair, pair), eq(chatThreads.kind, "order"))).limit(1);
  if (existing[0]) return existing[0] as any;
  const row = { id: newId("ct"), kind: "order", orderId, pair, status: "open", createdAt: new Date().toISOString() };
  await db.insert(chatThreads).values(row as any).onConflictDoNothing();
  return (await db.select().from(chatThreads).where(and(eq(chatThreads.orderId, orderId), eq(chatThreads.pair, pair), eq(chatThreads.kind, "order"))).limit(1))[0] as any;
}

interface Access {
  canRead: boolean;
  canWrite: boolean;
  myRole: Role | null;
  isStaff: boolean;
  recipients: string[]; // user ids to notify (excluding me), plus "staff" marker
  closesAt: number | null;
  order?: any;
  people?: any;
}

async function threadAccess(deps: Deps, me: any, thread: any): Promise<Access> {
  const isStaff = deps.isAdminUser(me) || (await deps.isActiveEmployee(me));
  const none: Access = { canRead: false, canWrite: false, myRole: null, isStaff, recipients: [], closesAt: null };

  if (thread.kind === "support") {
    const isOwner = thread.ownerUserId === me.id;
    if (!isOwner && !isStaff) return none;
    return {
      canRead: true,
      canWrite: true,
      myRole: isOwner ? (thread.ownerRole as Role) : "support",
      isStaff,
      recipients: isOwner ? ["staff"] : [thread.ownerUserId],
      closesAt: null,
    };
  }

  const order = (await db.select().from(orders).where(eq(orders.id, thread.orderId)).limit(1))[0] as any;
  if (!order) return none;
  const pair = thread.pair as Pair;
  if (!pairAvailable(order, pair)) return isStaff ? { ...none, canRead: true, order } : none;
  const people = await orderPeople(order);
  const members = pairMembers(pair, people);
  const myRole = (Object.keys(members) as Role[]).find((r) => members[r] && members[r] === me.id) || null;
  if (!myRole && !isStaff) return none;
  const close = closesAt(order, pair);
  const open = close === null || Date.now() < close;
  return {
    canRead: true,
    canWrite: !!myRole && open,
    myRole,
    isStaff,
    recipients: Object.values(members).filter((id): id is string => !!id && id !== me.id),
    closesAt: close,
    order,
    people,
  };
}

function counterpart(pair: Pair, myRole: Role | null, people: any, order: any) {
  // Phone numbers are only shared while the order is still active.
  const showPhone = orderIsActive(order);
  const other: Role =
    pair === "customer_vendor" ? (myRole === "vendor" ? "customer" : "vendor")
    : pair === "customer_rider" ? (myRole === "rider" ? "customer" : "rider")
    : (myRole === "vendor" ? "rider" : "vendor");
  const name = other === "customer" ? people.customerName : other === "vendor" ? people.vendorName : people.riderName || "Rider";
  const phone = other === "customer" ? people.customerPhone : other === "vendor" ? people.vendorPhone : people.riderPhone;
  return { role: other, name, phone: showPhone ? phone || null : null };
}

function pairTitle(pair: Pair, myRole: Role | null, people: any) {
  if (!myRole) {
    return pair === "customer_vendor" ? "Customer ↔ Restaurant" : pair === "customer_rider" ? "Customer ↔ Rider" : "Rider ↔ Restaurant";
  }
  const c = counterpart(pair, myRole, people, { status: "x" });
  return c.role === "vendor" ? "Restaurant" : c.role === "rider" ? "Rider" : "Customer";
}

async function unreadCounts(threadIds: string[], userId: string): Promise<Record<string, number>> {
  if (threadIds.length === 0) return {};
  const rows: any = await db.execute(sql`
    SELECT m.thread_id AS "threadId", COUNT(*)::int AS "n"
    FROM chat_messages m
    LEFT JOIN chat_reads r ON r.thread_id = m.thread_id AND r.user_id = ${userId}
    WHERE m.thread_id IN (${sql.join(threadIds.map((id) => sql`${id}`), sql`, `)})
      AND m.sender_id <> ${userId}
      AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
    GROUP BY m.thread_id`);
  const list = Array.isArray(rows) ? rows : rows?.rows || [];
  const out: Record<string, number> = {};
  for (const r of list) out[r.threadId] = Number(r.n) || 0;
  return out;
}

async function markRead(threadId: string, userId: string) {
  const now = new Date().toISOString();
  await db.insert(chatReads).values({ id: `${threadId}:${userId}`, threadId, userId, lastReadAt: now })
    .onConflictDoUpdate({ target: chatReads.id, set: { lastReadAt: now } });
}

function pushUrlFor(role: Role | "staff", thread: any) {
  if (thread.kind === "support") {
    if (role === "staff") return "/admin/support";
    if (role === "rider") return "/rider/dashboard?support=1";
    if (role === "vendor") return "/vendor/dashboard?support=1";
    return "/?support=1";
  }
  if (role === "vendor") return `/vendor/orders?chat=${thread.orderId}`;
  if (role === "rider") return `/rider/deliveries?chat=${thread.orderId}`;
  return `/orders?chat=${thread.orderId}`;
}

export function registerChatRoutes(app: any, deps: Deps) {
  const { io, verifyTokenOptional } = deps;
  const needUser = (req: any, res: any) => {
    if (!req.user) { res.status(401).json({ error: "Please log in." }); return null; }
    return req.user;
  };

  // ---- Threads for one order ------------------------------------------------
  app.get("/api/chat/order/:orderId", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = needUser(req, res); if (!me) return;
      const order = (await db.select().from(orders).where(eq(orders.id, req.params.orderId)).limit(1))[0] as any;
      if (!order) return res.status(404).json({ error: "Order not found." });

      const out: any[] = [];
      for (const pair of PAIRS) {
        if (!pairAvailable(order, pair)) continue;
        const thread = await ensureOrderThread(order.id, pair);
        const access = await threadAccess(deps, me, thread);
        if (!access.canRead || (!access.myRole && !access.isStaff)) continue;
        out.push({
          id: thread.id,
          kind: "order",
          pair,
          orderId: order.id,
          title: pairTitle(pair, access.myRole, access.people),
          myRole: access.myRole,
          counterpart: access.myRole ? counterpart(pair, access.myRole, access.people, order) : null,
          canWrite: access.canWrite,
          closesAt: access.closesAt,
          lastMessageAt: thread.lastMessageAt,
        });
      }
      if (out.length === 0) return res.status(403).json({ error: "No chats for this order." });
      const unread = await unreadCounts(out.map((t) => t.id), me.id);
      res.json({ threads: out.map((t) => ({ ...t, unread: unread[t.id] || 0 })) });
    } catch (e) {
      console.error("[chat] order threads failed", e);
      res.status(500).json({ error: "Could not load chats." });
    }
  });

  // ---- Messages in a thread -----------------------------------------------
  app.get("/api/chat/threads/:id/messages", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = needUser(req, res); if (!me) return;
      const thread = (await db.select().from(chatThreads).where(eq(chatThreads.id, req.params.id)).limit(1))[0] as any;
      if (!thread) return res.status(404).json({ error: "Chat not found." });
      const access = await threadAccess(deps, me, thread);
      if (!access.canRead) return res.status(403).json({ error: "Forbidden" });

      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const before = typeof req.query.before === "string" ? req.query.before : null;
      const rows = await db.select().from(chatMessages)
        .where(before ? and(eq(chatMessages.threadId, thread.id), lt(chatMessages.createdAt, before)) : eq(chatMessages.threadId, thread.id))
        .orderBy(desc(chatMessages.createdAt)).limit(limit);

      if (access.myRole || (thread.kind === "support" && access.isStaff)) await markRead(thread.id, me.id);
      res.json({
        messages: rows.reverse(),
        canWrite: access.canWrite,
        closesAt: access.closesAt,
        myRole: access.myRole,
        hasMore: rows.length === limit,
      });
    } catch (e) {
      console.error("[chat] messages failed", e);
      res.status(500).json({ error: "Could not load messages." });
    }
  });

  // ---- Send ---------------------------------------------------------------
  app.post("/api/chat/threads/:id/messages", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = needUser(req, res); if (!me) return;
      if (rateLimited(me.id)) return res.status(429).json({ error: "You're sending messages too fast. Wait a moment." });
      const thread = (await db.select().from(chatThreads).where(eq(chatThreads.id, req.params.id)).limit(1))[0] as any;
      if (!thread) return res.status(404).json({ error: "Chat not found." });
      const access = await threadAccess(deps, me, thread);
      if (!access.canWrite) {
        return res.status(403).json({ error: access.canRead ? "This chat is closed." : "Forbidden" });
      }

      const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, MAX_BODY) : "";
      const image = typeof req.body?.image === "string" && req.body.image.startsWith("data:image/") ? req.body.image : null;
      const orderRef = thread.kind === "support" && typeof req.body?.orderRef === "string" ? req.body.orderRef.slice(0, 64) : null;
      if (!body && !image) return res.status(400).json({ error: "Type a message." });

      // Support: an order can only be attached by its own customer/vendor/rider.
      let validOrderRef: string | null = null;
      if (orderRef && thread.ownerUserId === me.id) {
        const o = (await db.select().from(orders).where(eq(orders.id, orderRef)).limit(1))[0] as any;
        if (o) {
          const p = await orderPeople(o);
          if ([p.customerUserId, p.vendorUserId, p.riderUserId].includes(me.id)) validOrderRef = o.id;
        }
      }

      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await uploadPrivateImage(image, `chat/${thread.id}`).catch(() => null);
        if (!imageUrl) return res.status(500).json({ error: "Couldn't upload the photo. Try again." });
      }

      const meRow = await loadUser(me.id);
      const role = access.myRole as Role;
      const senderName = role === "support" ? `${(meRow?.name || "Support").split(" ")[0]} (Support)`
        : role === "vendor" ? (access.people?.vendorName || meRow?.name || "Restaurant")
        : role === "rider" ? (access.people?.riderName || meRow?.name || "Rider")
        : (meRow?.name || "Customer");

      const now = new Date().toISOString();
      const msg = { id: newId("cm"), threadId: thread.id, senderId: me.id, senderRole: role, senderName, body: body || null, imageUrl, orderRef: validOrderRef, createdAt: now };
      await db.insert(chatMessages).values(msg as any);

      const preview = body ? body.slice(0, 80) : "📷 Photo";
      const threadUpdate: any = { lastMessageAt: now, lastMessagePreview: preview };
      if (thread.kind === "support") {
        if (role === "support") {
          // First staff reply claims it if nobody has.
          if (!thread.assignedTo) { threadUpdate.assignedTo = me.id; threadUpdate.assignedName = meRow?.name || "Staff"; }
          if (thread.status !== "resolved") threadUpdate.status = "open";
        } else {
          // Customer writes again -> back in the "new" queue if it had been resolved.
          threadUpdate.status = thread.status === "resolved" || !thread.status ? "new" : thread.status;
        }
        if (validOrderRef) threadUpdate.attachedOrderId = validOrderRef;
      }
      await db.update(chatThreads).set(threadUpdate).where(eq(chatThreads.id, thread.id));
      await markRead(thread.id, me.id);

      // Live + phone notifications.
      const event = { threadId: thread.id, kind: thread.kind, orderId: thread.orderId || null, message: msg };
      const userRecipients = access.recipients.filter((r) => r !== "staff");
      for (const uid of [...userRecipients, me.id]) io.to(uid).emit("chat_message", event);
      if (access.recipients.includes("staff") || thread.kind === "support") io.to("staff").emit("chat_message", event);
      if (thread.kind === "order") io.to("admin").emit("chat_message", event);

      const pushBody = body ? body.slice(0, 120) : "📷 Sent a photo";
      for (const uid of userRecipients) {
        let theirRole: Role = "customer";
        if (thread.kind === "order" && access.people) {
          const p = access.people;
          theirRole = uid === p.vendorUserId ? "vendor" : uid === p.riderUserId ? "rider" : "customer";
        } else if (thread.kind === "support") {
          theirRole = thread.ownerRole as Role;
        }
        deps.sendPushToUsers([uid], {
          title: thread.kind === "support" ? "OwodeFood Support" : senderName,
          body: thread.kind === "order" ? `#${String(thread.orderId).substring(0, 8)}: ${pushBody}` : pushBody,
          url: pushUrlFor(theirRole, thread),
          tag: `chat-${thread.id}`,
          urgent: true,
        });
      }
      if (thread.kind === "support" && role !== "support") {
        // Tell staff: the one handling it, or everyone if unassigned.
        let staffIds: string[] = [];
        if (thread.assignedTo) staffIds = [thread.assignedTo];
        else {
          const staffUsers: any[] = await db.select({ id: users.id, roles: users.roles, role: users.role, email: users.email }).from(users)
            .where(sql`${users.role} IN ('admin','super_admin','employee') OR ${users.roles}::text ILIKE '%admin%' OR ${users.roles}::text ILIKE '%employee%'`);
          for (const su of staffUsers) {
            if (deps.isAdminUser(su) || (await deps.isActiveEmployee(su))) staffIds.push(su.id);
          }
        }
        deps.sendPushToUsers(staffIds.filter((id) => id !== me.id), {
          title: `Support: ${senderName}`,
          body: pushBody,
          url: "/admin/support",
          tag: `chat-${thread.id}`,
          urgent: true,
        });
      }

      res.json({ success: true, message: msg });
    } catch (e) {
      console.error("[chat] send failed", e);
      res.status(500).json({ error: "Could not send. Try again." });
    }
  });

  app.post("/api/chat/threads/:id/read", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = needUser(req, res); if (!me) return;
      const thread = (await db.select().from(chatThreads).where(eq(chatThreads.id, req.params.id)).limit(1))[0] as any;
      if (!thread) return res.status(404).json({ error: "Chat not found." });
      const access = await threadAccess(deps, me, thread);
      if (!access.canRead) return res.status(403).json({ error: "Forbidden" });
      await markRead(thread.id, me.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed" });
    }
  });

  // ---- Unread badges ------------------------------------------------------
  app.get("/api/chat/unread", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = needUser(req, res); if (!me) return;
      const isStaff = deps.isAdminUser(me) || (await deps.isActiveEmployee(me));
      const since = new Date(Date.now() - 7 * 86400000).toISOString();

      // Order chats with recent activity that this user belongs to.
      const myVendorIds = (await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, me.id))).map((v: any) => v.id);
      const myRiderIds = (await db.select({ id: riders.id }).from(riders).where(eq(riders.userId, me.id))).map((r: any) => r.id);
      const recent: any[] = await db.select({ t: chatThreads, o: orders }).from(chatThreads)
        .innerJoin(orders, eq(orders.id, chatThreads.orderId))
        .where(and(eq(chatThreads.kind, "order"), gt(chatThreads.lastMessageAt, since)));
      const mine = recent.filter(({ t, o }: any) => {
        const isC = o.customerId === me.id, isV = myVendorIds.includes(o.vendorId), isR = !!o.riderId && myRiderIds.includes(o.riderId);
        return t.pair === "customer_vendor" ? (isC || isV) : t.pair === "customer_rider" ? (isC || isR) : (isR || isV);
      });
      const orderUnread = await unreadCounts(mine.map((x: any) => x.t.id), me.id);
      const byOrder: Record<string, number> = {};
      for (const { t } of mine) byOrder[t.orderId] = (byOrder[t.orderId] || 0) + (orderUnread[t.id] || 0);

      const mySupport = await db.select().from(chatThreads).where(and(eq(chatThreads.kind, "support"), eq(chatThreads.ownerUserId, me.id)));
      const supportUnread = await unreadCounts(mySupport.map((t: any) => t.id), me.id);
      const supportByRole: Record<string, number> = {};
      for (const t of mySupport as any[]) supportByRole[t.ownerRole] = supportUnread[t.id] || 0;

      let inbox = 0;
      if (isStaff) {
        const r: any = await db.execute(sql`SELECT COUNT(*)::int AS n FROM chat_threads WHERE kind = 'support' AND status = 'new'`);
        inbox = Number((Array.isArray(r) ? r : r?.rows || [])[0]?.n) || 0;
      }
      res.json({ byOrder, support: supportByRole, inbox, isStaff });
    } catch (e) {
      console.error("[chat] unread failed", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ---- Support: open my conversation -------------------------------------
  app.post("/api/chat/support/open", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = needUser(req, res); if (!me) return;
      const role = ["customer", "rider", "vendor"].includes(req.body?.role) ? req.body.role : "customer";
      if (role === "vendor") {
        const v = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, me.id)).limit(1);
        if (!v.length) return res.status(403).json({ error: "No vendor account." });
      }
      if (role === "rider") {
        const r = await db.select({ id: riders.id }).from(riders).where(eq(riders.userId, me.id)).limit(1);
        if (!r.length) return res.status(403).json({ error: "No rider account." });
      }
      let thread = (await db.select().from(chatThreads).where(and(eq(chatThreads.kind, "support"), eq(chatThreads.ownerUserId, me.id), eq(chatThreads.ownerRole, role))).limit(1))[0] as any;
      if (!thread) {
        await db.insert(chatThreads).values({ id: newId("ct"), kind: "support", ownerUserId: me.id, ownerRole: role, status: "resolved", createdAt: new Date().toISOString() } as any).onConflictDoNothing();
        thread = (await db.select().from(chatThreads).where(and(eq(chatThreads.kind, "support"), eq(chatThreads.ownerUserId, me.id), eq(chatThreads.ownerRole, role))).limit(1))[0];
      }
      // Recent orders the person can attach.
      let recentOrders: any[] = [];
      if (role === "customer") {
        recentOrders = await db.select({ id: orders.id, vendorName: orders.vendorName, status: orders.status, createdAt: orders.createdAt, totalAmount: orders.totalAmount }).from(orders).where(eq(orders.customerId, me.id)).orderBy(desc(orders.createdAt)).limit(5);
      } else if (role === "vendor") {
        const vIds = (await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, me.id))).map((v: any) => v.id);
        if (vIds.length) recentOrders = await db.select({ id: orders.id, vendorName: orders.customerName, status: orders.status, createdAt: orders.createdAt, totalAmount: orders.totalAmount }).from(orders).where(inArray(orders.vendorId, vIds)).orderBy(desc(orders.createdAt)).limit(5);
      } else {
        const rIds = (await db.select({ id: riders.id }).from(riders).where(eq(riders.userId, me.id))).map((r: any) => r.id);
        if (rIds.length) recentOrders = await db.select({ id: orders.id, vendorName: orders.vendorName, status: orders.status, createdAt: orders.createdAt, totalAmount: orders.totalAmount }).from(orders).where(inArray(orders.riderId, rIds)).orderBy(desc(orders.createdAt)).limit(5);
      }
      res.json({ thread: { id: thread.id, kind: "support", status: thread.status, assignedName: thread.assignedName }, recentOrders });
    } catch (e) {
      console.error("[chat] support open failed", e);
      res.status(500).json({ error: "Could not open support chat." });
    }
  });

  // ---- Support inbox (all admins + all staff) ----------------------------
  const requireStaff = async (req: any, res: any) => {
    const me = needUser(req, res); if (!me) return null;
    if (!(deps.isAdminUser(me) || (await deps.isActiveEmployee(me)))) { res.status(403).json({ error: "Staff only." }); return null; }
    return me;
  };

  app.get("/api/chat/support/inbox", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = await requireStaff(req, res); if (!me) return;
      const status = typeof req.query.status === "string" ? req.query.status : "active";
      const where = status === "resolved"
        ? and(eq(chatThreads.kind, "support"), eq(chatThreads.status, "resolved"), sql`${chatThreads.lastMessageAt} IS NOT NULL`)
        : and(eq(chatThreads.kind, "support"), or(eq(chatThreads.status, "new"), eq(chatThreads.status, "open")));
      const rows: any[] = await db.select({ t: chatThreads, u: users }).from(chatThreads)
        .leftJoin(users, eq(users.id, chatThreads.ownerUserId))
        .where(where).orderBy(desc(chatThreads.lastMessageAt)).limit(200);
      const unread = await unreadCounts(rows.map((r) => r.t.id), me.id);
      res.json({
        threads: rows.map(({ t, u }) => ({
          id: t.id, status: t.status, ownerRole: t.ownerRole, ownerName: u?.name || "User", ownerPhone: u?.phone || null,
          assignedTo: t.assignedTo, assignedName: t.assignedName, attachedOrderId: t.attachedOrderId,
          lastMessageAt: t.lastMessageAt, lastMessagePreview: t.lastMessagePreview, unread: unread[t.id] || 0,
        })),
      });
    } catch (e) {
      console.error("[chat] inbox failed", e);
      res.status(500).json({ error: "Could not load inbox." });
    }
  });

  // Who the person is + their recent orders, for the staff side panel.
  app.get("/api/chat/support/:id/context", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = await requireStaff(req, res); if (!me) return;
      const t = (await db.select().from(chatThreads).where(eq(chatThreads.id, req.params.id)).limit(1))[0] as any;
      if (!t || t.kind !== "support") return res.status(404).json({ error: "Not found." });
      const u = await loadUser(t.ownerUserId);
      let recentOrders: any[] = [];
      if (t.ownerRole === "customer") {
        recentOrders = await db.select().from(orders).where(eq(orders.customerId, t.ownerUserId)).orderBy(desc(orders.createdAt)).limit(8);
      } else if (t.ownerRole === "vendor") {
        const vIds = (await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, t.ownerUserId))).map((v: any) => v.id);
        if (vIds.length) recentOrders = await db.select().from(orders).where(inArray(orders.vendorId, vIds)).orderBy(desc(orders.createdAt)).limit(8);
      } else {
        const rIds = (await db.select({ id: riders.id }).from(riders).where(eq(riders.userId, t.ownerUserId))).map((r: any) => r.id);
        if (rIds.length) recentOrders = await db.select().from(orders).where(inArray(orders.riderId, rIds)).orderBy(desc(orders.createdAt)).limit(8);
      }
      res.json({
        owner: { id: u?.id, name: u?.name, phone: u?.phone, email: u?.email, role: t.ownerRole },
        thread: { id: t.id, status: t.status, assignedTo: t.assignedTo, assignedName: t.assignedName, attachedOrderId: t.attachedOrderId },
        recentOrders: recentOrders.map((o: any) => ({ id: o.id, vendorName: o.vendorName, customerName: o.customerName, status: o.status, totalAmount: o.totalAmount, createdAt: o.createdAt, riderName: o.riderName })),
      });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/chat/support/:id/claim", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = await requireStaff(req, res); if (!me) return;
      const meRow = await loadUser(me.id);
      await db.update(chatThreads).set({ assignedTo: me.id, assignedName: meRow?.name || "Staff", status: "open" } as any).where(and(eq(chatThreads.id, req.params.id), eq(chatThreads.kind, "support")));
      io.to("staff").emit("chat_thread_update", { threadId: req.params.id });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/chat/support/:id/status", verifyTokenOptional, async (req: any, res: any) => {
    try {
      const me = await requireStaff(req, res); if (!me) return;
      const status = ["new", "open", "resolved"].includes(req.body?.status) ? req.body.status : null;
      if (!status) return res.status(400).json({ error: "Bad status." });
      await db.update(chatThreads).set({ status } as any).where(and(eq(chatThreads.id, req.params.id), eq(chatThreads.kind, "support")));
      io.to("staff").emit("chat_thread_update", { threadId: req.params.id });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed" });
    }
  });
}
