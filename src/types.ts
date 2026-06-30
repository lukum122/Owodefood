export type UserRole = "customer" | "vendor" | "rider" | "admin" | "employee";

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
}

export type VendorStatus = "pending" | "approved" | "suspended";
export type VendorCategory = string;

export interface VendorCategoryInfo {
  id: string;
  name: string;
  iconName: string;
  color: string;
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
}

export interface Addon {
  id: string;
  name: string;
  price: number;
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
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type RiderStatus = "pending" | "approved" | "suspended";

export interface Rider {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: "bicycle" | "motorcycle" | "car";
  status: RiderStatus;
  isAvailable: boolean;
  createdAt: string;
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

