export type UserRole = "customer" | "vendor" | "rider" | "admin" | "employee" | "super_admin";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: "support" | "dispatcher" | "finance" | "manager" | "admin";
  status: "active" | "inactive";
  permissions: string[]; // e.g. ["manage_orders", "manage_vendors", "manage_riders", "view_settings"]
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  gender?: string;
  createdAt: string;
  pin?: string;
  profileImage?: string;
  roles?: UserRole[];
}

export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";
export type VendorCategory = string;

export interface VendorCategoryInfo {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

export interface DailyHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Vendor {
  id: string;
  userId: string;
  name: string;
  description: string;
  cuisine: string;
  image: string;
  rating: number;
  address: string;
  status: VendorStatus;
  createdAt: string;
  openingTime?: string;
  closingTime?: string;
  openingDays?: string[]; // e.g., ["Monday", "Tuesday", etc.]
  operatingHours?: Record<string, DailyHours>; // More detailed daily hours mapping
  coverImage?: string;
  category?: VendorCategory;
  prepTime?: number; // preparation/packing time in minutes
  deliveryFee?: number; // base delivery fee override
  serviceFee?: number; // Custom service fee override for this vendor
  serviceFeeType?: "flat" | "percentage";
  serviceFeeValue?: number;
  commissionType?: "flat" | "percentage";
  commissionValue?: number;
  freeDelivery?: boolean;
  businessRegNo?: string;
  foodPermitNo?: string;
  verificationDoc?: string;
  receiptPickupEnabled?: boolean;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  quantity?: number; // Optional selected quantity for the cart/order
  groupId?: string;  // Optional reference to the group it belongs to
}

export interface AddonGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections?: number;
  maxSelections?: number;
  allowMultipleQuantity?: boolean;
  maxQuantityPerAddon?: number;
  addons: Addon[];
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
  createdAt: string;
  addons?: Addon[];
  maxAddons?: number;
  addonGroups?: AddonGroup[];
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vendorId: string;
  vendorName: string;
  riderId?: string;
  riderName?: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
  serviceFee?: number;
  deliveryFee?: number;
  tax?: number;
  receiptImage?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type RiderStatus = "pending" | "approved" | "suspended" | "rejected";

export interface Rider {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: "bicycle" | "motorcycle" | "car";
  status: RiderStatus;
  isAvailable: boolean;
  createdAt: string;
  licenseNo?: string;
  plateNo?: string;
  nationalIdNo?: string;
  verificationDoc?: string;
}

export interface Address {
  id: string;
  userId: string;
  title: string;
  address: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  vendorCategoryId?: string;
}

export interface ReceiptPickupConfig {
  isEnabled: boolean;
  flatServiceFee: number;
}

export interface PaymentGateway {
  id: string;
  name: string;
  desc: string;
  isEnabled: boolean;
  apiKey?: string;
  secretKey?: string;
  contractCode?: string; // for Monnify
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isActive?: boolean;
}

export interface UserSavedAddress {
  id: string;
  userId: string;
  streetAddress: string;
  district: string;
  landmarkNote: string;
}

export interface ExtremeLocationTier {
  id: string;
  name: string;
  surcharge: number;
}

export interface ExtremeLocation {
  id: string;
  name: string;
  tierId: string;
}

export interface Review {
  id: string;
  vendorId: string;
  customerId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function isVendorOpen(vendor: any): boolean {
  if (!vendor) return false;

  const now = new Date();
  
  // 1. Check opening days (e.g., ["Monday", "Tuesday", etc.])
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysOfWeek[now.getDay()];

  if (vendor.openingDays && Array.isArray(vendor.openingDays) && vendor.openingDays.length > 0) {
    if (!vendor.openingDays.includes(currentDayName)) {
      return false;
    }
  }

  // 2. Check opening/closing hours
  const opening = vendor.openingTime || "08:00";
  const closing = vendor.closingTime || "22:00";

  const [opH, opM] = opening.split(":").map(Number);
  const [clH, clM] = closing.split(":").map(Number);

  const curH = now.getHours();
  const curM = now.getMinutes();

  const openMinutes = opH * 60 + opM;
  const closeMinutes = clH * 60 + clM;
  const currentMinutes = curH * 60 + curM;

  if (closeMinutes < openMinutes) {
    // Overnight operation
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

export interface AppNotification {
  id: string;
  userId: string; // The user ID it belongs to (or "admin" or "all")
  title: string;
  message: string;
  type: "order" | "wallet" | "system" | "delivery";
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: "deposit" | "purchase" | "refund" | "adjustment";
  note?: string;
  createdAt: string;
  status?: "approved" | "pending" | "declined";
  gateway?: "bank_transfer" | "monnify" | "paystack";
  reference?: string;
}

export interface ReceiptPickupOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  deliveryAddress: string;
  deliveryPhone: string;
  receiptImageOrQr: string; // Base64 data or QR content
  receiptNote?: string;
  deliveryFee: number;
  riderId?: string;
  riderName?: string;
  status: "pending" | "accepted" | "picked_up" | "delivered" | "cancelled";
  paymentMethod: string;
  paymentStatus: "paid" | "unpaid";
  serviceFee?: number;
  totalAmount?: number;
  createdAt: string;
}

export interface SystemSurgeConfig {
  isSurgeActive: boolean;
  surgeFee: number;
  isRainActive: boolean;
  rainFee: number;
  isNightActive: boolean;
  nightFee: number;
  nightStartTime: string;
  nightEndTime: string;
}

export interface LegalContent {
  terms: string;
  privacy: string;
  cookies: string;
  refund: string;
}

export interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  vendorIds?: string[];
  productIds?: string[];
  imageUrl?: string;
}

export interface HeroBannerConfig {
  isEnabled: boolean;
  badgeText: string;
  title: string;
  description: string;
  backgroundColor: string;
  image: string;
}