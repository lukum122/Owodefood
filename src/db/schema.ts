import { pgTable, text, integer, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase Auth UID
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull(), // customer | vendor | rider | admin | employee
  gender: text("gender"),
  createdAt: text("created_at").notNull(),
  pin: text("pin"),
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
});

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
});

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
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
});

export const riders = pgTable("riders", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  vehicleType: text("vehicle_type").notNull(), // bicycle | motorcycle | car
  status: text("status").notNull(), // pending | approved | suspended
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

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
});

export const extremeLocationTiers = pgTable("extreme_location_tiers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  surcharge: integer("surcharge").notNull(),
});

export const extremeLocations = pgTable("extreme_locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tierId: text("tier_id").references(() => extremeLocationTiers.id).notNull(),
});

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
});

