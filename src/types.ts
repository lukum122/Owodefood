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
  isSuspended?: boolean;
  suspendedReason?: string;
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
  isTemporarilyClosed?: boolean;
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
  batchDeliveryEnabled?: boolean; // vendor's own opt-out toggle for batch delivery, defaults to true
  immediateDeliveryEnabled?: boolean; // vendor's own opt-out toggle for "Deliver Now", defaults to true -- together with batchDeliveryEnabled, gives immediate-only / batch-only / both
  batchCutoffOverrideMinutes?: number; // vendor's own lead-time override, null = inherit category/platform default
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
  | "awaiting_payment_verification"
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
  paymentReceiptUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  orderType?: "standard" | "receipt_pickup";
  receiptImageOrQr?: string;
  receiptNote?: string;
  batchDate?: string; // e.g. "2026-08-10"
  batchTime?: string; // e.g. "13:00"
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
  if (vendor.isTemporarilyClosed) return false;

  const now = new Date();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysOfWeek[now.getDay()];

  // If operatingHours is present, use it as the authoritative source
  if (vendor.operatingHours && typeof vendor.operatingHours === 'object' && Object.keys(vendor.operatingHours).length > 0) {
    const todayHours = vendor.operatingHours[currentDayName];
    if (!todayHours || !todayHours.isOpen) {
      return false;
    }

    const opening = todayHours.openTime || "08:00";
    const closing = todayHours.closeTime || "22:00";

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

  // Fallback to legacy fields if operatingHours is missing
  if (vendor.openingDays && Array.isArray(vendor.openingDays) && vendor.openingDays.length > 0) {
    if (!vendor.openingDays.includes(currentDayName)) {
      return false;
    }
  }

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
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

// Companion to isVendorOpen -- returns what (if anything) should be shown
// alongside the plain Open/Closed badge: a specific reopening time if
// closed, or a "closing soon" warning if open but closing within the
// next hour. Returns null when there's nothing extra worth showing (open
// and not closing soon), so the caller just keeps its default display.
export function getVendorHoursDisplay(vendor: any): { label: string; urgent: boolean } | null {
  if (!vendor) return null;

  const formatTime = (time: string): string => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  };

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const hasStructuredHours = vendor.operatingHours && typeof vendor.operatingHours === "object" && Object.keys(vendor.operatingHours).length > 0;

  if (isVendorOpen(vendor)) {
    let closing = vendor.closingTime || "22:00";
    if (hasStructuredHours) {
      const todayHours = vendor.operatingHours[daysOfWeek[now.getDay()]];
      if (todayHours && todayHours.closeTime) closing = todayHours.closeTime;
    }
    const [clH, clM] = closing.split(":").map(Number);
    const closeMinutes = clH * 60 + clM;
    // Overnight hours (e.g. closes 02:00) wrap past midnight -- treat the
    // close time as "tomorrow" for this comparison so the minutes-until
    // math stays correct instead of coming out negative.
    const effectiveCloseMinutes = closeMinutes < currentMinutes - 12 * 60 ? closeMinutes + 24 * 60 : closeMinutes;
    const minutesUntilClose = effectiveCloseMinutes - currentMinutes;
    if (minutesUntilClose >= 0 && minutesUntilClose <= 60) {
      return { label: `Closes ${formatTime(closing)}`, urgent: true };
    }
    return null;
  }

  // Manually closed by the vendor -- we genuinely don't know when they'll
  // reopen, so don't guess a time; just say so plainly.
  if (vendor.isTemporarilyClosed) {
    return { label: "Temporarily Closed", urgent: false };
  }

  if (hasStructuredHours) {
    const todayName = daysOfWeek[now.getDay()];
    const todayHours = vendor.operatingHours[todayName];
    // Closed right now but hasn't opened yet today -- covers both a
    // normal "not open yet" case and overnight hours where "today's"
    // opening time is later than the current early-morning hour.
    if (todayHours && todayHours.isOpen && todayHours.openTime) {
      const [opH, opM] = todayHours.openTime.split(":").map(Number);
      const openMinutes = opH * 60 + opM;
      if (currentMinutes < openMinutes) {
        return { label: `Opens ${formatTime(todayHours.openTime)}`, urgent: false };
      }
    }
    // Otherwise scan forward for the next day this vendor is actually open.
    for (let i = 1; i <= 7; i++) {
      const dayName = daysOfWeek[(now.getDay() + i) % 7];
      const dayHours = vendor.operatingHours[dayName];
      if (dayHours && dayHours.isOpen && dayHours.openTime) {
        const dayLabel = i === 1 ? "Tomorrow" : dayName;
        return { label: `Opens ${dayLabel} ${formatTime(dayHours.openTime)}`, urgent: false };
      }
    }
    return null; // no open day found anywhere in the week
  }

  // Legacy vendors with flat opening/closing fields, no per-day schedule.
  const opening = vendor.openingTime || "08:00";
  return { label: `Opens ${formatTime(opening)}`, urgent: false };
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