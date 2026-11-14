import { pgTable, text, integer, boolean, doublePrecision, jsonb, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase Auth UID
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull(), // customer | vendor | rider | admin | employee
  gender: text("gender"),
  createdAt: text("created_at").notNull(),
  pin: text("pin"),
  roles: jsonb("roles"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  suspendedReason: text("suspended_reason"),
});

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cuisine: text("cuisine").notNull(),
  image: text("image").notNull(),
  rating: doublePrecision("rating").notNull().default(5.0),
  address: text("address").notNull(),
  status: text("status").notNull(), // pending | approved | suspended
  createdAt: text("created_at").notNull(),
  openingTime: text("opening_time"),
  closingTime: text("closing_time"),
  openingDays: jsonb("opening_days"),
  operatingHours: jsonb("operating_hours"),
  // When true, openingTime/closingTime above take priority over the
  // vendor's own per-day operatingHours (which normally wins). The
  // vendor's operatingHours is never modified by this -- it's just set
  // aside while this is active, and takes effect again immediately, with
  // no data lost, the moment this is turned back off. Only admin can
  // turn this off, by design -- a vendor editing their own hours again
  // doesn't clear it, so it can't be silently undone.
  adminHoursOverrideActive: boolean("admin_hours_override_active").default(false),
  isTemporarilyClosed: boolean("is_temporarily_closed").default(false),
  coverImage: text("cover_image"),
  category: text("category"),
  prepTime: integer("prep_time"),
  deliveryFee: integer("delivery_fee"),
  serviceFee: integer("service_fee"),
  serviceFeeType: text("service_fee_type"), // flat | percentage
  serviceFeeValue: integer("service_fee_value"),
  commissionType: text("commission_type"), // flat | percentage
  commissionValue: integer("commission_value"),
  freeDelivery: boolean("free_delivery").default(false),
  batchDeliveryEnabled: boolean("batch_delivery_enabled").default(true), // vendor's own opt-out toggle - defaults to participating
  // Independent from the toggle above -- together these give three real
  // states: both on (offer both, today's default), immediate only
  // (existing opt-out), or batch only (this new column off while the
  // other stays on). Defaults to true so no existing vendor's behavior
  // changes just from this column existing.
  immediateDeliveryEnabled: boolean("immediate_delivery_enabled").default(true),
  batchCutoffOverrideMinutes: integer("batch_cutoff_override_minutes"), // null = inherit category/platform default
  // Shop pin on the map (for distance pricing + rider directions).
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  maxDeliveryKm: doublePrecision("max_delivery_km"), // null = platform default
}, (table) => ({
  userIdIdx: index("vendors_user_id_idx").on(table.userId),
}));

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").references(() => vendors.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  category: text("category").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: text("created_at").notNull(),
  addons: jsonb("addons"), // stores array of Addon objects
  maxAddons: integer("max_addons"),
  addonGroups: jsonb("addon_groups"), // stores array of AddonGroup objects
  // Lower shows first. Defaults to 0 so every existing product sorts
  // together (falls back to name-based ordering among ties), and vendors
  // can pull specific items to the front without needing to set this on
  // everything at once.
  priority: integer("priority").notNull().default(0),
}, (table) => ({
  vendorIdIdx: index("products_vendor_id_idx").on(table.vendorId),
}));

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => users.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  vendorId: text("vendor_id").references(() => vendors.id).notNull(),
  vendorName: text("vendor_name").notNull(),
  riderId: text("rider_id"),
  riderName: text("rider_name"),
  status: text("status").notNull(), // pending | accepted | preparing | ready | out_for_delivery | delivered | cancelled
  totalAmount: integer("total_amount").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: text("created_at").notNull(),
  serviceFee: integer("service_fee"),
  deliveryFee: integer("delivery_fee"),
  tax: integer("tax"),
  riderPayoutStatus: text("rider_payout_status").notNull().default("pending"),
  vendorPayoutStatus: text("vendor_payout_status").notNull().default("pending"),
  verifiedBy: text("verified_by"),
  verifiedAt: text("verified_at"),
  rejectedBy: text("rejected_by"),
  rejectedAt: text("rejected_at"),
  rejectionReason: text("rejection_reason"),
  paymentReceiptUrl: text("payment_receipt_url"),
  orderType: text("order_type").default("standard"),
  receiptImageOrQr: text("receipt_image_or_qr"),
  receiptNote: text("receipt_note"),
  batchDate: text("batch_date"), // e.g. "2026-08-10" -- set only for batch-delivery orders
  batchTime: text("batch_time"), // e.g. "13:00" -- the batch slot the customer chose
  specialInstructions: text("special_instructions"), // optional note from the customer, e.g. "call on arrival, leave with the gateman"
  // Proof of delivery (the code itself lives in delivery_codes below, so
  // no order query anywhere can accidentally send it to a rider/vendor).
  deliveredAt: text("delivered_at"),
  // Customer's drop-off pin + the distance used for pricing.
  deliveryLat: doublePrecision("delivery_lat"),
  deliveryLng: doublePrecision("delivery_lng"),
  deliveryDistanceKm: doublePrecision("delivery_distance_km"),
  deliveryProofUrl: text("delivery_proof_url"), // private R2 URL of the drop-off photo
  deliveryConfirmedBy: text("delivery_confirmed_by"), // "code" | "admin:<userId>"
}, (table) => ({
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
  vendorIdIdx: index("orders_vendor_id_idx").on(table.vendorId),
}));

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  // The addons a customer selected for this specific item (name, price,
  // quantity for each). Previously this was sent by the frontend at
  // checkout but silently dropped, since there was nowhere to store it --
  // meaning it was never visible in admin, and its cost got miscounted as
  // part of the delivery fee in any "remainder" calculation.
  selectedAddons: jsonb("selected_addons"),
}, (table) => ({
  orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
}));

export const riders = pgTable("riders", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  vehicleType: text("vehicle_type").notNull(), // bicycle | motorcycle | car
  status: text("status").notNull(), // pending | approved | suspended
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: text("created_at").notNull(),
  // Live tracking: last position sent while delivering.
  lastLat: doublePrecision("last_lat"),
  lastLng: doublePrecision("last_lng"),
  lastLocationAt: text("last_location_at"),
}, (table) => ({
  userIdIdx: index("riders_user_id_idx").on(table.userId),
}));

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

export const paymentGateways = pgTable("payment_gateways", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  desc: text("desc").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  contractCode: text("contract_code"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  isActive: boolean("is_active").default(false),
});

export const userSavedAddresses = pgTable("user_saved_addresses", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  streetAddress: text("street_address").notNull(),
  district: text("district").notNull(),
  landmarkNote: text("landmark_note").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
}, (table) => ({
  userIdIdx: index("user_saved_addresses_user_id_idx").on(table.userId),
}));

export const extremeLocationTiers = pgTable("extreme_location_tiers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  surcharge: integer("surcharge").notNull(),
});

export const extremeLocations = pgTable("extreme_locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tierId: text("tier_id").references(() => extremeLocationTiers.id).notNull(),
}, (table) => ({
  tierIdIdx: index("extreme_locations_tier_id_idx").on(table.tierId),
}));

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  department: text("department").notNull(), // support | dispatcher | finance | manager | admin
  status: text("status").notNull(), // active | inactive
  permissions: jsonb("permissions").notNull(), // array of strings
  createdAt: text("created_at").notNull(),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").references(() => vendors.id).notNull(),
  customerId: text("customer_id").references(() => users.id).notNull(),
  author: text("author").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  vendorIdIdx: index("reviews_vendor_id_idx").on(table.vendorId),
  customerIdIdx: index("reviews_customer_id_idx").on(table.customerId),
}));

export const walletTransactions = pgTable("wallet_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  userName: text("user_name").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // deposit | purchase | refund | adjustment
  note: text("note"),
  createdAt: text("created_at").notNull(),
  status: text("status"), // approved | pending | declined
  gateway: text("gateway"), // bank_transfer | monnify | paystack
  reference: text("reference"),
}, (table) => ({
  userIdIdx: index("wallet_transactions_user_id_idx").on(table.userId),
}));

export const appNotifications = pgTable("app_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // order | wallet | system | delivery
  read: boolean("read").notNull().default(false),
  createdAt: text("created_at").notNull(),
  relatedId: text("related_id"),
}, (table) => ({
  userIdIdx: index("app_notifications_user_id_idx").on(table.userId),
}));


export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  userIdIdx: index("push_subscriptions_user_id_idx").on(table.userId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

export const productReviews = pgTable("product_reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

export const payoutLogs = pgTable("payout_logs", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  recipientType: text("recipient_type").notNull(), // rider | vendor
  recipientId: text("recipient_id").notNull(),
  amount: integer("amount").notNull(),
  releasedBy: text("released_by").notNull(),
  releasedAt: text("released_at").notNull(),
  paymentMethod: text("payment_method").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  status: text("status").notNull().default("released"), // pending | released | reversed | failed
}, (table) => ({
  orderIdIdx: index("payout_logs_order_id_idx").on(table.orderId),
  recipientIdIdx: index("payout_logs_recipient_id_idx").on(table.recipientId),
}));

// One row per order once a rider picks it up. The code is shown ONLY to the
// customer (and admins); the rider must type it in to complete delivery.
// Kept out of the orders table on purpose -- orders are sent to vendors and
// riders through many routes, this table never is.
export const deliveryCodes = pgTable("delivery_codes", {
  orderId: text("order_id").primaryKey(),
  code: text("code").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// -------------------------------------------------------------
// IN-APP CHAT
// -------------------------------------------------------------
// kind "order": one thread per pair per order (pair = customer_vendor |
// customer_rider | rider_vendor). Who belongs to it is always worked out
// live from the order itself, so if a rider is swapped the old rider
// loses access automatically.
// kind "support": one thread per (user, role) -- e.g. someone who is both
// a customer and a vendor has two separate support conversations.
export const chatThreads = pgTable("chat_threads", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // order | support
  orderId: text("order_id"),
  pair: text("pair"),
  ownerUserId: text("owner_user_id"),
  ownerRole: text("owner_role"), // customer | rider | vendor (support only)
  status: text("status").notNull().default("open"), // support: new | open | resolved
  assignedTo: text("assigned_to"),
  assignedName: text("assigned_name"),
  attachedOrderId: text("attached_order_id"),
  lastMessageAt: text("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  orderIdx: index("chat_threads_order_idx").on(table.orderId),
  ownerIdx: index("chat_threads_owner_idx").on(table.ownerUserId),
  lastMsgIdx: index("chat_threads_last_msg_idx").on(table.lastMessageAt),
}));

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  senderId: text("sender_id").notNull(),
  senderRole: text("sender_role").notNull(), // customer | vendor | rider | support | system
  senderName: text("sender_name").notNull(),
  body: text("body"),
  imageUrl: text("image_url"),
  orderRef: text("order_ref"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  threadIdx: index("chat_messages_thread_idx").on(table.threadId, table.createdAt),
}));

export const chatReads = pgTable("chat_reads", {
  id: text("id").primaryKey(), // `${threadId}:${userId}`
  threadId: text("thread_id").notNull(),
  userId: text("user_id").notNull(),
  lastReadAt: text("last_read_at").notNull(),
}, (table) => ({
  userIdx: index("chat_reads_user_idx").on(table.userId),
}));
