import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { User, Vendor, Product, Order, Rider, Address, Category, UserRole, OrderStatus, Addon, PaymentGateway, VendorCategory, VendorCategoryInfo, Employee, UserSavedAddress, ExtremeLocationTier, ExtremeLocation, Review, AppNotification, WalletTransaction, SystemSurgeConfig, LegalContent, ContactInfo, HomepageSection, Collection, HeroBannerConfig, ReceiptPickupConfig } from "../types";
import { hasRole } from "../roleHelper";
import { useUpdateManager } from './UpdateManagerContext';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedAddons?: Addon[];
}

interface DatabaseContextType {
  currentUser: User | null;
  currentVendor: Vendor | null;
  currentRider: Rider | null;
  users: User[];
  vendors: Vendor[];
  products: Product[];
  orders: Order[];
  riders: Rider[];
  cart: CartItem[];
  categories: Category[];
  addProductCategory: (category: Omit<Category, "id">) => void;
  updateProductCategory: (id: string, updates: Partial<Category>) => void;
  deleteProductCategory: (id: string) => void;

  // Homepage Dynamic Engine
  homepageSections: HomepageSection[];
  updateHomepageSections: (sections: HomepageSection[]) => void;
  collections: Collection[];
  updateCollections: (collections: Collection[]) => void;
  heroBanner: HeroBannerConfig;
  updateHeroBanner: (config: HeroBannerConfig) => void;

  availableLocations: string[];
  updateAvailableLocations: (locations: string[]) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  paymentGateways: PaymentGateway[];
  updatePaymentGateways: (gateways: PaymentGateway[]) => void;
  categoryServiceFees: Record<string, number>;
  updateCategoryServiceFee: (category: string, fee: number) => void;
  vendorCategories: VendorCategoryInfo[];
  addVendorCategory: (category: VendorCategoryInfo) => void;
  removeVendorCategory: (categoryId: string) => void;
  updateVendorCategory: (categoryId: string, updatedFields: Partial<Omit<VendorCategoryInfo, "id">>) => void;
  
  // Global Service & Delivery Fee settings
  globalServiceFeeType: "category" | "flat" | "percentage";
  globalServiceFeeValue: number;
  updateGlobalServiceFeeSettings: (type: "category" | "flat" | "percentage", value: number) => void;
  globalFreeDelivery: boolean;
  updateGlobalFreeDelivery: (isEnabled: boolean) => void;
  calculateServiceFee: (vendorId: string | undefined, subtotal: number) => number;
  calculateDeliveryFee: (vendorId: string | undefined, subtotal: number, deliveryAddress?: string, isReceiptPickup?: boolean) => number;
  currency: string;
  updateCurrency: (symbol: string) => void;
  
  // Platform & Rider Commissions
  platformCommissionRate: number;
  updatePlatformCommissionRate: (rate: number) => void;
  riderCommissionType: "flat" | "percentage";
  riderCommissionValue: number;
  updateRiderCommissionSettings: (type: "flat" | "percentage", value: number) => void;

  // VAT settings
  vatEnabled: boolean;
  vatRate: number;
  updateVatSettings: (enabled: boolean, rate: number) => void;

  // Max cart item limit
  maxCartItems: number;
  updateMaxCartItems: (limit: number) => void;

  // Surge Pricing Config
  surgeConfig: SystemSurgeConfig;
  updateSurgeConfig: (config: Partial<SystemSurgeConfig>) => void;

  // Legal & Contact Info
  legalContent: LegalContent;
  updateLegalContent: (content: Partial<LegalContent>) => void;
  contactInfo: ContactInfo;
  updateContactInfo: (info: Partial<ContactInfo>) => void;
  saveSystemSettings: () => Promise<void>;
  saveDeliveryZones: () => Promise<void>;

  // Employee Management
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id" | "createdAt">) => void;
  updateEmployee: (id: string, updated: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  
  // Auth Actions
  checkUser: (identifier: string) => Promise<{ exists: boolean; user?: User; error?: string }>;
  login: (email: string, pin: string, role: UserRole, preventStateUpdate?: boolean) => Promise<{ success: boolean; error?: string; user?: User; token?: string }>;
  finalizeLogin: (user: User, token: string, role: UserRole) => void;
  register: (name: string, email: string, phone: string, role: UserRole, gender?: string, extra?: { businessName?: string; cuisine?: string; vehicleType?: string; pin?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  overrideUserRole: (role: UserRole) => void; // Development booster
  updateProfile: (name: string, phone: string, gender?: string, profileImage?: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPin: (userId: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: UserRole) => void;
  applyForVendor: (businessName: string, cuisine: string, extra?: { businessRegNo?: string; foodPermitNo?: string; verificationDoc?: string }) => Promise<{ success: boolean; error?: string }>;
  applyForRider: (vehicleType: "bicycle" | "motorcycle" | "car", extra?: { licenseNo?: string; plateNo?: string; nationalIdNo?: string; verificationDoc?: string }) => Promise<{ success: boolean; error?: string }>;
  
  // Cart Actions
  addToCart: (product: Product, selectedAddons?: Addon[]) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Checkout & Customer Actions
  placeOrder: (deliveryAddress: string, paymentMethod: string, deliveryPhone?: string, receiptImage?: string, options?: { orderType?: "receipt_pickup"; vendorId?: string; receiptImageOrQr?: string; receiptNote?: string }) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  
  // Vendor Actions
  updateVendorOrder: (orderId: string, status: OrderStatus, extra?: { verifiedBy?: string; verifiedAt?: string; rejectedBy?: string; rejectedAt?: string; rejectionReason?: string }) => Promise<{ success: boolean; error?: string }>;
  addProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  updateVendorProfile: (profile: Partial<Vendor>) => Promise<{ success: boolean; error?: string }>;
  
  // Rider Actions
  acceptDelivery: (orderId: string, riderId: string) => Promise<{ success: boolean; error?: string }>;
  updateDeliveryStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean; error?: string }>;
  updateOrderPayoutStatus: (orderId: string, type: "rider" | "vendor", status: "pending" | "paid") => Promise<{ success: boolean; error?: string }>;
  updateRiderProfile: (profile: Partial<Rider>) => Promise<{ success: boolean; error?: string }>;
  
  // Admin Actions
  toggleVendorStatus: (vendorId: string, status: Vendor["status"]) => void;
  toggleRiderStatus: (riderId: string, status: Rider["status"]) => void;
  deleteUser: (userId: string) => void;
  adminUpdateVendor: (vendorId: string, updatedFields: Partial<Vendor>) => void;
  adminCreateOrder: (order: Order) => void;
  adminCreateUser: (name: string, email: string, phone: string, role: UserRole, extra?: { businessName?: string; cuisine?: string; vehicleType?: string; pin?: string; roles?: UserRole[] }) => { success: boolean; error?: string };
  adminUpdateUser: (userId: string, fields: { name: string; email: string; phone: string; role: UserRole; pin?: string; roles?: UserRole[] }, extra?: { businessName?: string; cuisine?: string; vehicleType?: string }) => { success: boolean; error?: string };
  adminUpdateUserRole: (userId: string, role: UserRole) => void;

  // Coverage Guide & Extreme Locations & Saved Addresses (Kwara coverage expansion)
  coverageGuideText: string;
  updateCoverageGuideText: (text: string) => void;
  extremeLocationTiers: ExtremeLocationTier[];
  updateExtremeLocationTiers: (tiers: ExtremeLocationTier[]) => void;
  extremeLocations: ExtremeLocation[];
  addExtremeLocation: (name: string, tierId: string) => void;
  removeExtremeLocation: (id: string) => void;
  updateExtremeLocations: (locations: ExtremeLocation[]) => void;
  savedAddresses: UserSavedAddress[];
  addSavedAddress: (streetAddress: string, district: string, landmarkNote: string) => void;
  removeSavedAddress: (id: string) => void;

  // Reviews System
  reviews: Review[];
  addReview: (vendorId: string, rating: number, comment: string) => Promise<{ success: boolean; error?: string }>;

  // Notifications System
  notifications: AppNotification[];
  addNotification: (userId: string, title: string, message: string, type: AppNotification["type"], relatedId?: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  clearAllNotifications: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;

  // Wallet System Management
  walletTransactions: WalletTransaction[];
  getUserWalletBalance: (userId: string) => number;
  updateUserWalletBalance: (userId: string, amount: number, type: WalletTransaction["type"], note?: string) => void;
  walletFundingBankTransferEnabled: boolean;
  walletFundingMonnifyEnabled: boolean;
  walletFundingPaystackEnabled: boolean;
  updateWalletFundingModes: (bankTransfer: boolean, monnify: boolean, paystack: boolean) => void;
  requestWalletFunding: (userId: string, amount: number, gateway: "bank_transfer" | "monnify" | "paystack", reference?: string) => Promise<string>;
  approveWalletFunding: (transactionId: string) => void;
  declineWalletFunding: (transactionId: string) => void;

  // Receipt Pickup & Delivery System (Strictly for pre-purchased items from listed vendors)
  receiptPickupOrders: ReceiptPickupOrder[];
  createReceiptPickupOrder: (order: Omit<ReceiptPickupOrder, "id" | "riderId" | "riderName" | "status" | "paymentStatus" | "createdAt">) => { success: boolean; error?: string; orderId?: string };
  acceptReceiptPickupDelivery: (orderId: string, riderId: string) => void;
  updateReceiptPickupStatus: (orderId: string, status: ReceiptPickupOrder["status"]) => void;
  cancelReceiptPickupOrder: (orderId: string) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Helper to generate UUIDs when needed (or simple unique string IDs)
const generateId = () => Math.random().toString(36).substring(2, 11);

const ensureSuperAdminsOnly = (usersList: User[]): User[] => {
  let updated = [...usersList];
  const superAdminEmails = ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"];

  // Ensure specified emails exist as super admins with PIN 9880
  superAdminEmails.forEach((email) => {
    const index = updated.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (index >= 0) {
      const existingRoles = updated[index].roles || [updated[index].role];
      const nextRoles = [...existingRoles];
      if (!nextRoles.includes("super_admin")) nextRoles.push("super_admin");
      if (!nextRoles.includes("admin")) nextRoles.push("admin");
      if (!nextRoles.includes("customer")) nextRoles.unshift("customer");
      
      updated[index] = {
        ...updated[index],
        role: "super_admin",
        roles: nextRoles,
        pin: updated[index].pin || "9880"
      };
    } else {
      const id = email.toLowerCase() === "azeezlukman122@gmail.com" 
        ? "super-admin-azeez" 
        : email.toLowerCase() === "omotayo111111@gmail.com"
        ? "super-admin-omotayo"
        : "super-admin-dev";
      updated.push({
        id,
        email: email.toLowerCase(),
        name: email.toLowerCase() === "azeezlukman122@gmail.com" 
          ? "Azeez Lukman" 
          : email.toLowerCase() === "omotayo111111@gmail.com"
          ? "Omotayo Admin"
          : "Developer Admin",
        phone: "+234 803 123 4567",
        role: "super_admin",
        roles: ["customer", "admin", "super_admin"],
        pin: "9880",
        createdAt: "2026-07-03T03:39:56-07:00"
      });
    }
  });

  return updated;
};

const getInitialUsersSeed = (): User[] => {
  const seeds: User[] = [
    { id: "cust-1", email: "sarah@gmail.com", name: "Sarah Collins", phone: "+234 803 123 4567", role: "customer", roles: ["customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor1-id", email: "mamacass@gmail.com", name: "Mama Cass Admin", phone: "+234 811 111 2222", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor2-id", email: "chickenrepublic@gmail.com", name: "Chicken Republic Admin", phone: "+234 812 222 3333", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "ride-1", email: "daniel@gmail.com", name: "Rider Daniel", phone: "+234 803 999 0000", role: "rider", roles: ["rider", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor3-id", email: "domino@gmail.com", name: "Domino's Pizza", phone: "+234 813 111 2222", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor4-id", email: "kfc@gmail.com", name: "KFC Ilorin", phone: "+234 814 333 4444", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor5-id", email: "megaplaza@gmail.com", name: "Mega Plaza", phone: "+234 815 555 6666", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor6-id", email: "medplus@gmail.com", name: "Medplus Pharmacy", phone: "+234 816 777 8888", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor7-id", email: "chowstore@gmail.com", name: "Chowstore Ilorin", phone: "+234 817 999 0000", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "admin-1", email: "admin@gmail.com", name: "Platform Admin", phone: "+234 809 999 0000", role: "admin", roles: ["admin", "customer"], createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "vendor8-id", email: "value_mart@owodefood.com", name: "Value Mart Admin", phone: "+234 815 111 2222", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z", pin: "1234" },
    { id: "vendor9-id", email: "safco@owodefood.com", name: "Safco Admin", phone: "+234 816 222 3333", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z", pin: "1234" },
    { id: "vendor10-id", email: "farm_direct@owodefood.com", name: "Farm Direct Admin", phone: "+234 817 333 4444", role: "vendor", roles: ["vendor", "customer"], createdAt: "2026-06-23T04:54:01.156Z", pin: "1234" }
  ];
  return ensureSuperAdminsOnly(seeds);
};

const getInitialVendorsSeed = (): Vendor[] => [
  {
    id: "v-1",
    userId: "vendor1-id",
    name: "Mama Cass",
    description: "Authentic local delicacies, Jollof rice, soups, and traditional Nigerian meals.",
    cuisine: "Local",
    image: "/images/hero.png",
    rating: 4.7,
    address: "Tanke Road, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "restaurant",
    prepTime: 25,
    deliveryFee: 600,
    openingTime: "08:00",
    closingTime: "22:00"
  },
  {
    id: "v-2",
    userId: "vendor2-id",
    name: "Chicken Republic",
    description: "Sizzling fried chicken, Citizens meal, and spicy Nigerian rice dishes.",
    cuisine: "Local",
    image: "/images/jollof.png",
    rating: 4.3,
    address: "Fate Road, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "restaurant",
    prepTime: 15,
    deliveryFee: 500,
    openingTime: "08:00",
    closingTime: "22:00"
  },
  {
    id: "v-3",
    userId: "vendor3-id",
    name: "Domino's Pizza",
    description: "Hot, fresh, oven-baked pizzas, delicious chicken sides, and sweet dessert treats.",
    cuisine: "Pizza",
    image: "/images/chicken.png",
    rating: 4.5,
    address: "GRA, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "restaurant",
    prepTime: 20,
    deliveryFee: 900,
    openingTime: "09:00",
    closingTime: "23:00"
  },
  {
    id: "v-4",
    userId: "vendor4-id",
    name: "KFC",
    description: "Crispy fried chicken buckets, spicy Zinger burgers, and golden fries.",
    cuisine: "Burgers",
    image: "/images/pizza.png",
    rating: 4.4,
    address: "Challenge Area, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "restaurant",
    prepTime: 20,
    deliveryFee: 800,
    openingTime: "10:00",
    closingTime: "22:00"
  },
  {
    id: "v-5",
    userId: "vendor5-id",
    name: "Mega Plaza Supermarket",
    description: "Household groceries, premium imported products, electronics, snacks, cold beverages, laundry essentials, and personal toiletries.",
    cuisine: "Groceries",
    image: "/images/burger.png",
    rating: 4.6,
    address: "Tanke Road, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "shop",
    prepTime: 40,
    deliveryFee: 1200,
    openingTime: "08:00",
    closingTime: "21:00"
  },
  {
    id: "v-6",
    userId: "vendor6-id",
    name: "Medplus Pharmacy",
    description: "Prescription medicines, daily vitamins, first aid kits, skin care products, and essential sanitizers.",
    cuisine: "Drinks",
    image: "/images/hero.png",
    rating: 4.8,
    address: "GRA, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "pharmacy",
    prepTime: 10,
    deliveryFee: 500,
    openingTime: "07:00",
    closingTime: "23:00"
  },
  {
    id: "v-7",
    userId: "vendor7-id",
    name: "Chowstore Ilorin",
    description: "Fresh farm-to-table produce, local spices, cooking oil, fresh tomatoes, green vegetables, grains, and kitchen condiments.",
    cuisine: "Salads",
    image: "/images/jollof.png",
    rating: 4.9,
    address: "Adewole Estate, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "groceries",
    prepTime: 30,
    deliveryFee: 1000,
    openingTime: "08:00",
    closingTime: "20:00"
  },
  {
    id: "v-8",
    userId: "vendor8-id",
    name: "Value Mart Supermarket",
    description: "Premium lifestyle, household items, grocery selection, toiletries, snacks, and cosmetics.",
    cuisine: "Groceries",
    image: "/images/chicken.png",
    rating: 4.5,
    address: "Challenge, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "shop",
    prepTime: 30,
    deliveryFee: 800,
    openingTime: "08:00",
    closingTime: "22:00"
  },
  {
    id: "v-9",
    userId: "vendor9-id",
    name: "Safco Pharmacy",
    description: "Prescription medicines, local drugs, vitamins, daily supplements, first-aid tools, and sanitizer.",
    cuisine: "Drinks",
    image: "/images/pizza.png",
    rating: 4.7,
    address: "GRA, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "pharmacy",
    prepTime: 15,
    deliveryFee: 500,
    openingTime: "08:00",
    closingTime: "22:00"
  },
  {
    id: "v-10",
    userId: "vendor10-id",
    name: "Farm Direct Groceries",
    description: "Fresh farm-direct vegetables, yams, local spices, grains, plantains, and healthy produce.",
    cuisine: "Salads",
    image: "/images/burger.png",
    rating: 4.8,
    address: "Tanke, Ilorin, Kwara",
    status: "approved",
    createdAt: "2026-06-23T04:54:01.156Z",
    category: "groceries",
    prepTime: 25,
    deliveryFee: 700,
    openingTime: "07:30",
    closingTime: "20:30"
  }
];

const getInitialProductsSeed = (): Product[] => {
  const productsList: Product[] = [
    { id: "p-1", vendorId: "v-1", name: "Jollof Rice", description: "Smoky party Jollof rice with fried plantains and sliced salad.", price: 4500, image: "/images/hero.png", category: "Desserts", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-2", vendorId: "v-1", name: "Fried Rice", description: "Special fried rice with fresh vegetables.", price: 4000, image: "/images/jollof.png", category: "Desserts", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-3", vendorId: "v-1", name: "Grilled Chicken", description: "Spicy grilled chicken thigh marinated in local spices.", price: 3500, image: "/images/chicken.png", category: "Desserts", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-4", vendorId: "v-1", name: "Coca Cola (50cl)", description: "Ice cold refreshing Cola beverage in plastic bottle.", price: 500, image: "/images/pizza.png", category: "Drinks", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-5", vendorId: "v-2", name: "Citizens Meal", description: "Standard meal package containing Jollof rice, 1 fried chicken and drink.", price: 3200, image: "/images/burger.png", category: "Chicken", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-6", vendorId: "v-2", name: "Crunchy Chicken (2 pcs)", description: "Crispy and spicy original recipe fried chicken pieces.", price: 2800, image: "/images/hero.png", category: "Chicken", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-7", vendorId: "v-3", name: "Pepperoni Supreme Pizza", description: "Loaded with pepperoni, mozzarella cheese and pizza sauce.", price: 6500, image: "/images/jollof.png", category: "Pizza", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-8", vendorId: "v-3", name: "Chicken Supreme Pizza", description: "Oven-grilled chicken breast slices, sweet corn, green peppers.", price: 7200, image: "/images/chicken.png", category: "Pizza", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-9", vendorId: "v-4", name: "Zinger Burger", description: "A hot & crispy chicken fillet inside a warm toasted sesame bun.", price: 3800, image: "/images/pizza.png", category: "Burgers", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-10", vendorId: "v-4", name: "Fried Chicken Bucket", description: "5 pieces of signature original recipe fried chicken.", price: 6800, image: "/images/burger.png", category: "Chicken", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-11", vendorId: "v-5", name: "Brand New Hardcover Notebook", description: "Standard ruled 80-sheet hardcover study/business journal.", price: 1500, image: "/images/hero.png", category: "Stationery", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-12", vendorId: "v-5", name: "Premium Salted Potato Crisps", description: "Crunchy golden potato crisps seasoned with light sea salt.", price: 950, image: "/images/jollof.png", category: "Snacks", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-13", vendorId: "v-6", name: "Vitamin C Chewable Boosters", description: "High potency Vitamin C tablets (1000mg) for strong immunity.", price: 3200, image: "/images/chicken.png", category: "Wellness", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-14", vendorId: "v-6", name: "Aloe Hand Sanitizer Gel", description: "Kills 99.9% of germs while keeping skin moisturized with organic Aloe Vera.", price: 1200, image: "/images/pizza.png", category: "Hygiene", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-15", vendorId: "v-7", name: "Farm Fresh Tomatoes Basket", description: "Freshly harvested, organic and juicy red tomatoes (1kg).", price: 2800, image: "/images/burger.png", category: "Produce", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-16", vendorId: "v-7", name: "Golden Penny Spaghetti Pasta", description: "Rich in fiber, quick-cooking premium semolina wheat spaghetti pack (500g).", price: 1100, image: "/images/hero.png", category: "Grains", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-17", vendorId: "v-8", name: "Premium Orange Juice 1L", description: "100% freshly squeezed pulp-free orange juice.", price: 2200, image: "/images/jollof.png", category: "Beverages", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-18", vendorId: "v-8", name: "Organic Lavender Body Wash", description: "Deep moisturizing skin wash with lavender extract.", price: 3500, image: "/images/chicken.png", category: "Toiletries", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-19", vendorId: "v-9", name: "Paracetamol Extra Pack", description: "Rapid relief tablets for headache and mild pain relief.", price: 800, image: "/images/pizza.png", category: "Medicines", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-20", vendorId: "v-9", name: "Multivitamin Gummies", description: "Daily multivitamin gummies with vitamins A, C, D, and Zinc.", price: 4500, image: "/images/burger.png", category: "Vitamins", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-21", vendorId: "v-10", name: "Ilorin Sweet Yam (Medium)", description: "Freshly harvested local yam tuber, sweet and easy to boil.", price: 3800, image: "/images/hero.png", category: "Produce", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" },
    { id: "p-22", vendorId: "v-10", name: "Wholesale Rice Bag 5kg", description: "High quality clean local parboiled stone-free rice.", price: 7500, image: "/images/jollof.png", category: "Grains", isAvailable: true, createdAt: "2026-06-23T04:54:01.156Z" }
  ];

  const defaultAddonsMap: Record<string, { id: string; name: string; price: number }[]> = {
    "p-1": [
      { id: "a-1", name: "Grilled Chicken Thigh", price: 1500 },
      { id: "a-2", name: "Fried Plantain Portion", price: 500 },
      { id: "a-3", name: "Extra Coleslaw", price: 400 }
    ],
    "p-2": [
      { id: "a-4", name: "Peppered Gizzard", price: 1200 },
      { id: "a-2", name: "Fried Plantain Portion", price: 500 },
      { id: "a-13", name: "Boiled Egg Side", price: 300 }
    ],
    "p-5": [
      { id: "a-5", name: "Moimoi Option", price: 600 },
      { id: "a-6", name: "Extra Chicken Piece", price: 1800 }
    ],
    "p-7": [
      { id: "a-7", name: "Extra Mozzarella Cheese", price: 1000 },
      { id: "a-8", name: "BBQ Drizzle Cup", price: 300 }
    ],
    "p-8": [
      { id: "a-7", name: "Extra Mozzarella Cheese", price: 1000 },
      { id: "a-9", name: "Extra Sweetcorn", price: 400 }
    ],
    "p-9": [
      { id: "a-10", name: "Double Beef Upgrade", price: 1500 },
      { id: "a-11", name: "Fried Egg Side", price: 300 },
      { id: "a-12", name: "Cheddar Cheese Slice", price: 400 }
    ]
  };

  return productsList.map(p => {
    let addons = defaultAddonsMap[p.id] || [];
    let addonGroups: any[] = [];

    if (p.id === "p-1") {
      addonGroups = [
        {
          id: "g-1-protein",
          name: "Required Protein Choice",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          addons: [
            { id: "a-1", name: "Grilled Chicken Thigh", price: 1500 },
            { id: "a-14", name: "Spicy Fried Beef (1pc)", price: 1200 },
            { id: "a-15", name: "Grilled Fish Portion", price: 1800 }
          ]
        },
        {
          id: "g-1-sides",
          name: "Extra Sides (Up to 4 total, max 2 of each)",
          isRequired: false,
          minSelections: 0,
          maxSelections: 4,
          allowMultipleQuantity: true,
          maxQuantityPerAddon: 2,
          addons: [
            { id: "a-2", name: "Fried Plantain Portion", price: 500 },
            { id: "a-3", name: "Extra Coleslaw", price: 400 },
            { id: "a-5", name: "Moimoi Option", price: 600 },
            { id: "a-13", name: "Boiled Egg Side", price: 300 }
          ]
        }
      ];
    } else if (p.id === "p-5") {
      addonGroups = [
        {
          id: "g-5-rice",
          name: "Required Rice Base Selection",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          addons: [
            { id: "a-5-jollof", name: "Classic smoky Jollof Rice", price: 0 },
            { id: "a-5-fried", name: "Signature Fried Rice", price: 200 },
            { id: "a-5-mixed", name: "Half Jollof, Half Fried Rice", price: 300 }
          ]
        },
        {
          id: "g-5-extras",
          name: "Add Extra Toppings (Max 3 total, max 3 of each)",
          isRequired: false,
          minSelections: 0,
          maxSelections: 3,
          allowMultipleQuantity: true,
          maxQuantityPerAddon: 3,
          addons: [
            { id: "a-5-egg", name: "Fried Egg Side", price: 300 },
            { id: "a-6", name: "Extra Chicken Piece", price: 1800 },
            { id: "a-2", name: "Fried Plantain Portion", price: 500 }
          ]
        }
      ];
    }

    if (addonGroups.length > 0) {
      return { ...p, addons, addonGroups };
    }
    if (defaultAddonsMap[p.id]) {
      return { ...p, addons: defaultAddonsMap[p.id] };
    }
    return p;
  });
};

const getInitialRidersSeed = (): Rider[] => [
  {
    id: "r-1",
    userId: "ride-1",
    name: "Rider Daniel",
    phone: "+234 905 987 6543",
    vehicleType: "motorcycle",
    status: "approved",
    isAvailable: true,
    createdAt: "2026-06-23T04:54:01.156Z"
  }
];

const getInitialOrdersSeed = (): Order[] => [
  {
    id: "1253",
    customerId: "cust-1",
    customerName: "Sarah Collins",
    customerPhone: "+234 803 123 4567",
    vendorId: "v-1",
    vendorName: "Mama Cass",
    riderId: "r-1",
    riderName: "Rider Daniel",
    status: "delivered",
    totalAmount: 15000,
    deliveryAddress: "Tanke Road, Ilorin, Kwara",
    paymentMethod: "Cash on Delivery",
    createdAt: "2026-07-05T09:00:00Z",
    items: [
      { id: "oi-1", orderId: "ord-1253", productId: "p-1", name: "Jollof Rice", price: 4500, quantity: 2 },
      { id: "oi-4", orderId: "ord-1253", productId: "p-4", name: "Coca Cola (50cl)", price: 500, quantity: 2 }
    ]
  },
  {
    id: "1254",
    customerId: "cust-1",
    customerName: "Sarah Collins",
    customerPhone: "+234 803 123 4567",
    vendorId: "v-2",
    vendorName: "Chicken Republic",
    riderId: "r-1",
    riderName: "Rider Daniel",
    status: "ready",
    totalAmount: 4500,
    deliveryAddress: "Fate Road, Ilorin, Kwara",
    paymentMethod: "Paystack (Card)",
    createdAt: "2026-07-05T09:15:00Z",
    items: [
      { id: "oi-2", orderId: "ord-1254", productId: "p-5", name: "Citizens Meal", price: 3200, quantity: 1 }
    ]
  },
  {
    id: "1255",
    customerId: "cust-1",
    customerName: "Sarah Collins",
    customerPhone: "+234 803 123 4567",
    vendorId: "v-1",
    vendorName: "Mama Cass",
    status: "preparing",
    totalAmount: 12000,
    deliveryAddress: "Fate Road, Ilorin, Kwara",
    paymentMethod: "Paystack (Card)",
    createdAt: "2026-07-05T09:25:00Z",
    items: [
      { id: "oi-3", orderId: "ord-1255", productId: "p-3", name: "Grilled Chicken", price: 3500, quantity: 3 }
    ]
  },
  {
    id: "1256",
    customerId: "cust-1",
    customerName: "Sarah Collins",
    customerPhone: "+234 803 123 4567",
    vendorId: "v-1",
    vendorName: "Mama Cass",
    status: "pending",
    totalAmount: 8500,
    deliveryAddress: "Fate Road, Ilorin, Kwara",
    paymentMethod: "Paystack (Card)",
    createdAt: "2026-07-05T09:30:00Z",
    items: [
      { id: "oi-5", orderId: "ord-1256", productId: "p-1", name: "Jollof Rice", price: 4500, quantity: 1 },
      { id: "oi-6", orderId: "ord-1256", productId: "p-3", name: "Grilled Chicken", price: 3500, quantity: 1 }
    ]
  }
];

const getInitialPaymentGatewaysSeed = (): PaymentGateway[] => [
  { id: "credit_card", name: "Credit Card", desc: "Pay with VISA / Mastercard / Verve", isEnabled: true, apiKey: "pk_live_51O..." },
  { id: "cash_on_delivery", name: "Cash on Delivery", desc: "Pay with cash or bank transfer on arrival", isEnabled: true },
  { id: "wallet", name: "Owode Food Wallet", desc: "Instantly settle using your balance wallet", isEnabled: true },
  { id: "monnify", name: "Monnify (Bank & Card)", desc: "Secure automated payments via Monnify API", isEnabled: true, apiKey: "MK_prod_x94k...", secretKey: "sk_prod_948j...", contractCode: "1234567890" },
  { id: "bank_transfer", name: "Local Bank Transfer", desc: "Direct transfer with automated receipt uploading", isEnabled: true, bankName: "GTBank", accountNumber: "0123456789", accountName: "Owode Food Marketplace LTD" }
];

const getInitialEmployeesSeed = (): Employee[] => [
  { id: "emp-1", name: "Adewale Banjo", email: "adewale@owodefood.com", phone: "+234 812 345 6789", department: "dispatcher", status: "active", permissions: ["manage_orders", "manage_riders"], createdAt: "2026-06-23T04:54:01.156Z" },
  { id: "emp-2", name: "Chidi Okafor", email: "chidi@owodefood.com", phone: "+234 803 111 2222", department: "finance", status: "active", permissions: ["view_settings"], createdAt: "2026-06-23T04:54:01.156Z" },
  { id: "emp-3", name: "Fatima Yusuf", email: "fatima@owodefood.com", phone: "+234 705 999 8888", department: "support", status: "active", permissions: ["manage_orders", "manage_vendors"], createdAt: "2026-06-23T04:54:01.156Z" },
];

const getInitialReviewsSeed = (): Review[] => [];

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("fd_session_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(() => {
    try {
      const savedUserStr = localStorage.getItem("fd_session_user");
      if (!savedUserStr) return null;
      const user = JSON.parse(savedUserStr);
      if (user.role !== "vendor") return null;
      
      const savedVendors = localStorage.getItem("fd_vendors");
      if (savedVendors) {
        const vendorsList = JSON.parse(savedVendors);
        return vendorsList.find((v: Vendor) => v.userId === user.id) || null;
      }
    } catch {}
    return null;
  });

  const [currentRider, setCurrentRider] = useState<Rider | null>(() => {
    try {
      const savedUserStr = localStorage.getItem("fd_session_user");
      if (!savedUserStr) return null;
      const user = JSON.parse(savedUserStr);
      if (user.role !== "rider") return null;
      
      const savedRiders = localStorage.getItem("fd_riders");
      if (savedRiders) {
        const ridersList = JSON.parse(savedRiders);
        return ridersList.find((r: Rider) => r.userId === user.id) || null;
      }
    } catch {}
    return null;
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Homepage Dynamic Engine State
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(() => {
    try {
      const saved = localStorage.getItem("fd_homepage_sections");
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed initial sections
    return [
      { id: "sec-featured", title: "Featured Restaurants", type: "featured_restaurants", isEnabled: true, sortOrder: 1 },
      { id: "sec-categories", title: "Explore by Category", type: "food_category", isEnabled: true, sortOrder: 2 },
      { id: "sec-fast", title: "Fast Delivery", subtitle: "Under 30 mins", type: "fast_delivery", isEnabled: true, sortOrder: 3 }
    ];
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem("fd_collections");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem("fd_homepage_sections", JSON.stringify(homepageSections));
  }, [homepageSections]);

  useEffect(() => {
    localStorage.setItem("fd_collections", JSON.stringify(collections));
  }, [collections]);

  const updateHomepageSections = (sections: HomepageSection[]) => {
    setHomepageSections(sections);
    syncSave("SYSTEM_SETTING_UPSERT", { key: "homepageSections", value: JSON.stringify(sections) });
  };
  const updateCollections = (colls: Collection[]) => {
    setCollections(colls);
    syncSave("SYSTEM_SETTING_UPSERT", { key: "collections", value: JSON.stringify(colls) });
  };

  const [heroBanner, setHeroBanner] = useState<HeroBannerConfig>(() => {
    try {
      const saved = localStorage.getItem("fd_hero_banner");
      if (saved) return JSON.parse(saved);
    } catch {}
    // No cached copy yet (genuine first-ever visit) — show a blank hero
    // section rather than hardcoded placeholder text, so a real visitor
    // never briefly sees content that isn't actually true for this store.
    // The real text fills in the moment the backend responds.
    return {
      isEnabled: true,
      badgeText: "",
      title: "",
      description: "",
      backgroundColor: "#070329",
      image: "/images/hero.png"
    };
  });

  useEffect(() => {
    localStorage.setItem("fd_hero_banner", JSON.stringify(heroBanner));
  }, [heroBanner]);

  const updateHeroBanner = (config: HeroBannerConfig) => {
    setHeroBanner(config);
    syncSave("SYSTEM_SETTING_UPSERT", { key: "heroBanner", value: JSON.stringify(config) });
  };

  const [receiptPickupConfig, setReceiptPickupConfig] = useState<ReceiptPickupConfig>(() => {
    try {
      const saved = localStorage.getItem("fd_receipt_pickup_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
    } catch {}
    return {
      isEnabled: true,
      flatServiceFee: 50
    };
  });

  useEffect(() => {
    localStorage.setItem("fd_receipt_pickup_config", JSON.stringify(receiptPickupConfig));
  }, [receiptPickupConfig]);

  const updateReceiptPickupConfig = (config: ReceiptPickupConfig) => {
    setReceiptPickupConfig(config);
    localStorage.setItem("fd_receipt_pickup_config", JSON.stringify(config));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "receiptPickupConfig", value: JSON.stringify(config) });
  };

  const [receiptPickupOrders, setReceiptPickupOrders] = useState<ReceiptPickupOrder[]>(() => {
    try {
      const saved = localStorage.getItem("fd_receipt_pickup_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fd_receipt_pickup_orders", JSON.stringify(receiptPickupOrders));
    } catch (e) {
      console.error(e);
    }
  }, [receiptPickupOrders]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem("fd_notifications");
      return saved ? JSON.parse(saved) : [
        {
          id: "notif-init-1",
          userId: "cust-1",
          title: "Welcome to Owode Food! 🍲",
          message: "Experience swift meal deliveries and convenient cashless payments across Owode Food and Ilorin.",
          type: "system",
          read: false,
          createdAt: new Date().toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fd_notifications", JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  const [userBalances, setUserBalances] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("fd_user_balances");
      if (saved) return JSON.parse(saved);
      
      const initialBalances: Record<string, number> = {
        "cust-1": 15000,
        "ride-1": 2500,
        "vend-id1": 50000,
        "vend-id2": 35000,
      };
      
      const oldBalance = localStorage.getItem("fd_wallet_balance");
      if (oldBalance) {
        initialBalances["cust-1"] = Number(oldBalance);
      }
      return initialBalances;
    } catch {
      return {};
    }
  });

  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem("fd_wallet_transactions");
      return saved ? JSON.parse(saved) : [
        {
          id: "tx-init-1",
          userId: "cust-1",
          userName: "Sarah Collins",
          amount: 15000,
          type: "deposit" as const,
          note: "Initial activation deposit",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fd_user_balances", JSON.stringify(userBalances));
      if (userBalances["cust-1"] !== undefined) {
        localStorage.setItem("fd_wallet_balance", String(userBalances["cust-1"]));
        window.dispatchEvent(new Event("wallet-balance-updated"));
      }
    } catch (e) {
      console.error(e);
    }
  }, [userBalances]);

  useEffect(() => {
    try {
      localStorage.setItem("fd_wallet_transactions", JSON.stringify(walletTransactions));
    } catch (e) {
      console.error(e);
    }
  }, [walletTransactions]);

  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  // Coverage guide & extreme locations states
  const [coverageGuideText, setCoverageGuideText] = useState<string>(() => {
    let saved = localStorage.getItem("fd_coverage_guide");
    if (saved && saved.includes("Kwara & Ilorin Marketplace")) {
      saved = saved.replace("Kwara & Ilorin Marketplace Coverage Reference Guide", "Owode Food Coverage Reference Guide");
      localStorage.setItem("fd_coverage_guide", saved);
    }
    return saved || `### 📍 Owode Food Coverage Reference Guide

We provide express local delivery to the following key zones in Ilorin, Kwara State:
- **Tanke Zone**: covers Tanke, University Road, Fate Area, Oke-Odo, and environs.
- **GRA Zone**: covers GRA, Fate Road, Admiralty, and upscale inner-city districts.
- **Challenge Zone**: covers Challenge Area, Post Office, Taiwo Road, and busy commercial blocks.
- **Fate Zone**: covers Fate, Gaa-Akanbi, and immediate surrounds.
- **Adewole Zone**: covers Adewole Estate, Federal Secretariat, and Western outskirts.

---

### ⚠️ Extreme & Faraway Locations (Surcharge Tiers Apply)
Certain destinations located on the absolute outer outskirts of Ilorin require premium rider mobilization. These are classed into Tiers:
- **Tier 1 (Outer Suburbs)**: E.g., University Permanent Site, Airport Road, Oke-Ose (Teaching Hospital).
- **Tier 2 (Outskirts)**: E.g., Eyenkorin, Shao, Oke-Oyi.
- **Tier 3 (Ultra Remote)**: E.g., Ganmo Outer Bounds, Afono.`;
  });

  const [extremeLocationTiers, setExtremeLocationTiers] = useState<ExtremeLocationTier[]>(() => {
    try {
      const saved = localStorage.getItem("fd_extreme_tiers");
      return saved ? JSON.parse(saved) : [
        { id: "tier-1", name: "Tier 1: Outer Suburbs", surcharge: 1000 },
        { id: "tier-2", name: "Tier 2: Extreme Outskirts", surcharge: 2000 },
        { id: "tier-3", name: "Tier 3: Ultra Remote / Borders", surcharge: 3500 }
      ];
    } catch {
      return [
        { id: "tier-1", name: "Tier 1: Outer Suburbs", surcharge: 1000 },
        { id: "tier-2", name: "Tier 2: Extreme Outskirts", surcharge: 2000 },
        { id: "tier-3", name: "Tier 3: Ultra Remote / Borders", surcharge: 3500 }
      ];
    }
  });

  const [extremeLocations, setExtremeLocations] = useState<ExtremeLocation[]>(() => {
    try {
      const saved = localStorage.getItem("fd_extreme_locations");
      return saved ? JSON.parse(saved) : [
        { id: "ex-1", name: "University Permanent Site", tierId: "tier-1" },
        { id: "ex-2", name: "Airport Road", tierId: "tier-1" },
        { id: "ex-3", name: "Oke-Ose", tierId: "tier-1" },
        { id: "ex-4", name: "Eyenkorin", tierId: "tier-2" },
        { id: "ex-5", name: "Shao", tierId: "tier-2" },
        { id: "ex-6", name: "Oke-Oyi", tierId: "tier-2" },
        { id: "ex-7", name: "Ganmo Outer Bounds", tierId: "tier-3" },
        { id: "ex-8", name: "Afono", tierId: "tier-3" }
      ];
    } catch {
      return [
        { id: "ex-1", name: "University Permanent Site", tierId: "tier-1" },
        { id: "ex-2", name: "Airport Road", tierId: "tier-1" },
        { id: "ex-3", name: "Oke-Ose", tierId: "tier-1" },
        { id: "ex-4", name: "Eyenkorin", tierId: "tier-2" },
        { id: "ex-5", name: "Shao", tierId: "tier-2" },
        { id: "ex-6", name: "Oke-Oyi", tierId: "tier-2" },
        { id: "ex-7", name: "Ganmo Outer Bounds", tierId: "tier-3" },
        { id: "ex-8", name: "Afono", tierId: "tier-3" }
      ];
    }
  });

  const [savedAddresses, setSavedAddresses] = useState<UserSavedAddress[]>(() => {
    try {
      const saved = localStorage.getItem("fd_saved_addresses");
      return saved ? JSON.parse(saved) : [
        { id: "sa-1", userId: "cust-1", streetAddress: "Tanke Road, Flat 3B", district: "Tanke, Ilorin, Kwara", landmarkNote: "Beside MTN Mast" },
        { id: "sa-2", userId: "cust-1", streetAddress: "GRA Crescent", district: "GRA, Ilorin, Kwara", landmarkNote: "Opposite Golf Club" }
      ];
    } catch {
      return [
        { id: "sa-1", userId: "cust-1", streetAddress: "Tanke Road, Flat 3B", district: "Tanke, Ilorin, Kwara", landmarkNote: "Beside MTN Mast" },
        { id: "sa-2", userId: "cust-1", streetAddress: "GRA Crescent", district: "GRA, Ilorin, Kwara", landmarkNote: "Opposite Golf Club" }
      ];
    }
  });
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("fd_selected_location");
      return saved ? JSON.parse(saved) : "";
    } catch {
      return "";
    }
  });

  const handleSetSelectedLocation = (loc: string) => {
    setSelectedLocation(loc);
    try {
      localStorage.setItem("fd_selected_location", JSON.stringify(loc));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (availableLocations.length > 0 && !selectedLocation) {
      handleSetSelectedLocation(availableLocations[0]);
    }
  }, [availableLocations, selectedLocation]);

  const [walletFundingBankTransferEnabled, setWalletFundingBankTransferEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fd_funding_bank_transfer");
      return saved ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [walletFundingMonnifyEnabled, setWalletFundingMonnifyEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fd_funding_monnify");
      return saved ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [walletFundingPaystackEnabled, setWalletFundingPaystackEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fd_funding_paystack");
      return saved ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fd_funding_bank_transfer", String(walletFundingBankTransferEnabled));
    } catch (e) {
      console.error(e);
    }
  }, [walletFundingBankTransferEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem("fd_funding_monnify", String(walletFundingMonnifyEnabled));
    } catch (e) {
      console.error(e);
    }
  }, [walletFundingMonnifyEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem("fd_funding_paystack", String(walletFundingPaystackEnabled));
    } catch (e) {
      console.error(e);
    }
  }, [walletFundingPaystackEnabled]);

  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [categoryServiceFees, setCategoryServiceFees] = useState<Record<string, number>>({
    restaurant: 350,
    shop: 500,
    pharmacy: 200,
    groceries: 400,
  });
  const [vendorCategories, setVendorCategories] = useState<VendorCategoryInfo[]>([]);
  
  const [globalServiceFeeType, setGlobalServiceFeeType] = useState<"category" | "flat" | "percentage">("category");
  const [globalServiceFeeValue, setGlobalServiceFeeValue] = useState<number>(0);
  const [globalFreeDelivery, setGlobalFreeDelivery] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fd_global_free_delivery");
      if (saved) return saved === "true";
    } catch {}
    return false;
  });
  const [surgeConfig, setSurgeConfig] = useState<SystemSurgeConfig>({
    isSurgeActive: false,
    surgeFee: 0,
    isRainActive: false,
    rainFee: 0,
    isNightActive: false,
    nightFee: 0,
    nightStartTime: "22:00",
    nightEndTime: "06:00"
  });
  const [legalContent, setLegalContent] = useState<LegalContent>(() => {
    try {
      const saved = localStorage.getItem("fd_legal_content");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      terms: "Welcome to our Terms of Service...",
      privacy: "Your privacy is important to us...",
      cookies: "We use cookies to improve your experience...",
      refund: "Our refund policy allows for refunds within 24 hours under certain conditions."
    };
  });
  const [contactInfo, setContactInfo] = useState<ContactInfo>(() => {
    try {
      const saved = localStorage.getItem("fd_contact_info");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      address: "123 Owode Street, Tanke, Ilorin, Nigeria",
      phone: "+234 (0) 800 000 0000",
      email: "support@owodefood.com",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com"
    };
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currency, setCurrency] = useState<string>("₦");
  
  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(15);
  const [riderCommissionType, setRiderCommissionType] = useState<"flat" | "percentage">("flat");
  const [riderCommissionValue, setRiderCommissionValue] = useState<number>(150);
  
  const [vatEnabled, setVatEnabled] = useState<boolean>(true);
  const [vatRate, setVatRate] = useState<number>(7.5);
  const [maxCartItems, setMaxCartItems] = useState<number>(12);
  
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("fd_product_categories");
      if (saved) return JSON.parse(saved);
      return [
        { id: "1", name: "Burgers", icon: "🍔" },
        { id: "2", name: "Pizza", icon: "🍕" },
        { id: "3", name: "Chicken", icon: "🍗" },
        { id: "4", name: "Drinks", icon: "🥤" },
        { id: "5", name: "Desserts", icon: "🍰" },
      ];
    } catch {
      return [
        { id: "1", name: "Burgers", icon: "🍔" },
        { id: "2", name: "Pizza", icon: "🍕" },
        { id: "3", name: "Chicken", icon: "🍗" },
        { id: "4", name: "Drinks", icon: "🥤" },
        { id: "5", name: "Desserts", icon: "🍰" },
      ];
    }
  });

  const addProductCategory = (category: Omit<Category, "id">) => {
    const newCategory: Category = { ...category, id: `cat-${Date.now()}` };
    const updated = [...categories, newCategory];
    setCategories(updated);
    localStorage.setItem("fd_product_categories", JSON.stringify(updated));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "productCategories", value: JSON.stringify(updated) });
  };

  const updateProductCategory = (id: string, updates: Partial<Category>) => {
    const updated = categories.map(c => c.id === id ? { ...c, ...updates } : c);
    setCategories(updated);
    localStorage.setItem("fd_product_categories", JSON.stringify(updated));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "productCategories", value: JSON.stringify(updated) });
  };

  const deleteProductCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    localStorage.setItem("fd_product_categories", JSON.stringify(updated));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "productCategories", value: JSON.stringify(updated) });
  };

  // Tracks the last known "has anything changed?" version so the 15-second
  // poll can skip re-downloading the full dataset when nothing changed.
  const lastKnownDataVersionRef = useRef<string | null>(null);

  // Load initial data from Cloud SQL or fallback to Local Storage / Seeds
  useEffect(() => {
    const loadFromCloudSQL = async () => {
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch("/api/sync/load", { headers });
        if (!res.ok) throw new Error("Backend load failed");
        const data = await res.json();

        // Keep the lightweight version-poll in sync with whatever we just
        // fully loaded, so the next 15s check doesn't immediately think
        // something changed and redundantly re-fetch everything again.
        if (data.systemSettings?.dataVersion) {
          lastKnownDataVersionRef.current = data.systemSettings.dataVersion;
        }

        // IMPORTANT: `users` is deliberately empty/short for anonymous visitors
        // and ordinary logged-in customers (privacy — they only ever receive
        // their own record, if any). It says nothing about whether vendors,
        // products, orders, or settings came back correctly. `vendors` is the
        // one field the backend always returns in full for everyone, logged
        // in or not — so it's the right signal for "did this request actually
        // succeed," instead of previously requiring `users.length > 0`, which
        // silently discarded perfectly good data for every guest visitor.
        if (data && Array.isArray(data.vendors)) {
          // Found data in Cloud SQL! Let's load it and synchronize local states.
          // Users merging
          const initialUsers = getInitialUsersSeed();
          const mergedUsers = [...data.users];
          let usersUpdated = false;
          for (const u of initialUsers) {
            if (!mergedUsers.some(mu => mu.id === u.id)) {
              mergedUsers.push(u);
              usersUpdated = true;
            }
          }
          const loadedUsers = ensureSuperAdminsOnly(mergedUsers);
          setUsers(loadedUsers);
          localStorage.setItem("fd_users", JSON.stringify(loadedUsers));
          if (usersUpdated) {
            await syncSave("USERS_BULK", loadedUsers);
          }

          // Vendors merging
          const initialVendors = getInitialVendorsSeed();
          let mergedVendors = [...(data.vendors || [])];
          let vendorsUpdated = false;
          for (const v of initialVendors) {
            if (!mergedVendors.some(mv => mv.id === v.id)) {
              mergedVendors.push(v);
              vendorsUpdated = true;
            }
          }
          if (mergedVendors.length === 0) {
            mergedVendors = initialVendors;
            vendorsUpdated = true;
          }
          setVendors(mergedVendors);
          localStorage.setItem("fd_vendors", JSON.stringify(mergedVendors));
          if (vendorsUpdated) {
            await syncSave("VENDORS_BULK", mergedVendors);
          }

          // Products merging
          const initialProducts = getInitialProductsSeed();
          let mergedProducts = [...(data.products || [])];
          let productsUpdated = false;
          for (const p of initialProducts) {
            if (!mergedProducts.some(mp => mp.id === p.id)) {
              mergedProducts.push(p);
              productsUpdated = true;
            }
          }
          if (mergedProducts.length === 0) {
            mergedProducts = initialProducts;
            productsUpdated = true;
          }
          setProducts(mergedProducts);
          localStorage.setItem("fd_products", JSON.stringify(mergedProducts));
          if (productsUpdated) {
            await syncSave("PRODUCTS_BULK", mergedProducts);
          }

          // Riders merging
          const initialRiders = getInitialRidersSeed();
          let mergedRiders = [...(data.riders || [])];
          let ridersUpdated = false;
          for (const r of initialRiders) {
            if (!mergedRiders.some(mr => mr.id === r.id)) {
              mergedRiders.push(r);
              ridersUpdated = true;
            }
          }
          if (mergedRiders.length === 0) {
            mergedRiders = initialRiders;
            ridersUpdated = true;
          }
          setRiders(mergedRiders);
          localStorage.setItem("fd_riders", JSON.stringify(mergedRiders));
          if (ridersUpdated) {
            await syncSave("RIDERS_BULK", mergedRiders);
          }

          // Orders merging
          const initialOrders = getInitialOrdersSeed();
          let mergedOrders = [...(data.orders || [])];
          let ordersUpdated = false;
          for (const o of initialOrders) {
            if (!mergedOrders.some(mo => mo.id === o.id)) {
              mergedOrders.push(o);
              ordersUpdated = true;
            }
          }
          if (mergedOrders.length === 0) {
            mergedOrders = initialOrders;
            ordersUpdated = true;
          }
          mergedOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setOrders(mergedOrders);
          localStorage.setItem("fd_orders", JSON.stringify(mergedOrders));
          if (ordersUpdated) {
            await syncSave("ORDERS_BULK", mergedOrders);
          }

          // Payment Gateways merging
          const initialPaymentGateways = getInitialPaymentGatewaysSeed();
          let mergedPaymentGateways = [...(data.paymentGateways || [])];
          let paymentGatewaysUpdated = false;
          for (const pg of initialPaymentGateways) {
            if (!mergedPaymentGateways.some(mpg => mpg.id === pg.id)) {
              mergedPaymentGateways.push(pg);
              paymentGatewaysUpdated = true;
            }
          }
          if (mergedPaymentGateways.length === 0) {
            mergedPaymentGateways = initialPaymentGateways;
            paymentGatewaysUpdated = true;
          }
          setPaymentGateways(mergedPaymentGateways);
          localStorage.setItem("fd_payment_gateways", JSON.stringify(mergedPaymentGateways));
          if (paymentGatewaysUpdated) {
            await syncSave("PAYMENT_GATEWAYS_BULK", mergedPaymentGateways);
          }

          if (data.savedAddresses) {
            setSavedAddresses(data.savedAddresses);
            localStorage.setItem("fd_saved_addresses", JSON.stringify(data.savedAddresses));
          }

          if (data.receiptPickupOrders) {
            let mergedReceipts = [...data.receiptPickupOrders];
            mergedReceipts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setReceiptPickupOrders(mergedReceipts);
            localStorage.setItem("fd_receipt_pickup_orders", JSON.stringify(mergedReceipts));
          }

          if (data.extremeLocationTiers) {
            setExtremeLocationTiers(data.extremeLocationTiers);
            localStorage.setItem("fd_extreme_location_tiers", JSON.stringify(data.extremeLocationTiers));
          } else {
            const tiers = [
              { id: "tier-1", name: "Tier 1: Moderately Far", surcharge: 300, description: "Outside central but accessible." },
              { id: "tier-2", name: "Tier 2: Distant / Outskirts", surcharge: 600, description: "Requires extra fuel and time." },
              { id: "tier-3", name: "Tier 3: Remote / Borderline", surcharge: 1000, description: "Hard to reach, extreme ends of the city." }
            ];
            setExtremeLocationTiers(tiers);
            localStorage.setItem("fd_extreme_location_tiers", JSON.stringify(tiers));
            await syncSave("EXTREME_LOCATION_TIERS_BULK", tiers);
          }

          if (data.extremeLocations) {
            setExtremeLocations(data.extremeLocations);
            localStorage.setItem("fd_extreme_locations", JSON.stringify(data.extremeLocations));
          } else {
            const extreme = [
              { id: "ex-1", name: "University Permanent Site", tierId: "tier-1" },
              { id: "ex-2", name: "Airport Road", tierId: "tier-1" },
              { id: "ex-3", name: "Oke-Ose", tierId: "tier-1" },
              { id: "ex-4", name: "Eyenkorin", tierId: "tier-2" },
              { id: "ex-5", name: "Ganmo", tierId: "tier-2" },
              { id: "ex-6", name: "Amoyo", tierId: "tier-3" },
              { id: "ex-7", name: "Shao", tierId: "tier-3" }
            ];
            setExtremeLocations(extreme);
            localStorage.setItem("fd_extreme_locations", JSON.stringify(extreme));
            await syncSave("EXTREME_LOCATIONS_BULK", extreme);
          }

          const loadedEmployees = (data.employees && data.employees.length > 0) ? data.employees : getInitialEmployeesSeed();
          setEmployees(loadedEmployees);
          localStorage.setItem("fd_employees", JSON.stringify(loadedEmployees));
          if (!data.employees || data.employees.length === 0) {
            await syncSave("EMPLOYEES_BULK", loadedEmployees);
          }

          const loadedReviews = (data.reviews && data.reviews.length > 0) ? data.reviews : getInitialReviewsSeed();
          setReviews(loadedReviews);
          localStorage.setItem("fd_reviews", JSON.stringify(loadedReviews));
          if (!data.reviews || data.reviews.length === 0) {
            await syncSave("REVIEWS_BULK", loadedReviews);
          }

          if (data.systemSettings) {
            if (data.systemSettings.platformCommissionRate) setPlatformCommissionRate(Number(data.systemSettings.platformCommissionRate));
            if (data.systemSettings.riderCommissionType) setRiderCommissionType(data.systemSettings.riderCommissionType as any);
            if (data.systemSettings.riderCommissionValue) setRiderCommissionValue(Number(data.systemSettings.riderCommissionValue));
            if (data.systemSettings.vatEnabled) setVatEnabled(data.systemSettings.vatEnabled === "true");
            if (data.systemSettings.vatRate) setVatRate(Number(data.systemSettings.vatRate));
            if (data.systemSettings.maxCartItems) setMaxCartItems(Number(data.systemSettings.maxCartItems));
            if (data.systemSettings.walletFundingBankTransferEnabled) setWalletFundingBankTransferEnabled(data.systemSettings.walletFundingBankTransferEnabled === "true");
            if (data.systemSettings.walletFundingMonnifyEnabled) setWalletFundingMonnifyEnabled(data.systemSettings.walletFundingMonnifyEnabled === "true");
            if (data.systemSettings.walletFundingPaystackEnabled) setWalletFundingPaystackEnabled(data.systemSettings.walletFundingPaystackEnabled === "true");
            if (data.systemSettings.contactInfo) {
              try { setContactInfo(JSON.parse(data.systemSettings.contactInfo)); } catch(e){}
            }
            if (data.systemSettings.legalContent) {
              try { setLegalContent(JSON.parse(data.systemSettings.legalContent)); } catch(e){}
            }
            if (data.systemSettings.currency) setCurrency(data.systemSettings.currency);
            if (data.systemSettings.coverageGuideText) setCoverageGuideText(data.systemSettings.coverageGuideText);
            if (data.systemSettings.globalServiceFeeType) setGlobalServiceFeeType(data.systemSettings.globalServiceFeeType as any);
            if (data.systemSettings.globalServiceFeeValue) setGlobalServiceFeeValue(Number(data.systemSettings.globalServiceFeeValue));
            if (data.systemSettings.globalFreeDelivery) setGlobalFreeDelivery(data.systemSettings.globalFreeDelivery === "true");
            if (data.systemSettings.surgeConfig) {
              try { setSurgeConfig(JSON.parse(data.systemSettings.surgeConfig)); } catch(e){}
            }
            if (data.systemSettings.receiptPickupConfig) {
              try { 
                const parsed = JSON.parse(data.systemSettings.receiptPickupConfig);
                if (parsed) setReceiptPickupConfig(parsed); 
              } catch(e){}
            }
            if (data.systemSettings.heroBanner) {
              try { 
                const parsed = JSON.parse(data.systemSettings.heroBanner);
                setHeroBanner(parsed); 
              } catch(e){}
            }
            if (data.systemSettings.homepageSections) {
              try { 
                const parsed = JSON.parse(data.systemSettings.homepageSections);
                setHomepageSections(parsed); 
              } catch(e){}
            }
            if (data.systemSettings.collections) {
              try { 
                const parsed = JSON.parse(data.systemSettings.collections);
                setCollections(parsed); 
              } catch(e){}
            }
          }

          // Compute and set available locations
          let initialAvailableLocations: string[] = [];
          if (data.systemSettings.availableLocations) {
            try { initialAvailableLocations = JSON.parse(data.systemSettings.availableLocations); } catch(e){}
          } else if (localStorage.getItem("fd_available_locations")) {
            initialAvailableLocations = JSON.parse(localStorage.getItem("fd_available_locations")!);
          } else {
            initialAvailableLocations = [
              "Tanke, Ilorin, Kwara",
              "GRA, Ilorin, Kwara",
              "Challenge, Ilorin, Kwara",
              "Fate, Ilorin, Kwara",
              "Adewole, Ilorin, Kwara",
              "Post Office Area, Ilorin, Kwara"
            ];
          }
          const extremeLocationsToUse = data.extremeLocations 
            ? data.extremeLocations
            : [
                { id: "ex-1", name: "University Permanent Site", tierId: "tier-1" },
                { id: "ex-2", name: "Airport Road", tierId: "tier-1" },
                { id: "ex-3", name: "Oke-Ose", tierId: "tier-1" },
                { id: "ex-4", name: "Eyenkorin", tierId: "tier-2" },
                { id: "ex-5", name: "Ganmo", tierId: "tier-2" },
                { id: "ex-6", name: "Amoyo", tierId: "tier-3" },
                { id: "ex-7", name: "Shao", tierId: "tier-3" }
              ];
          const finalLocations = [...initialAvailableLocations];
          localStorage.setItem("fd_available_locations", JSON.stringify(finalLocations));
          setAvailableLocations(finalLocations);

          // Restore vendor categories
          let initialCategories: VendorCategoryInfo[] = [];
          if (data.systemSettings.vendorCategories) {
            try { initialCategories = JSON.parse(data.systemSettings.vendorCategories); } catch(e){}
          } else if (localStorage.getItem("fd_vendor_categories")) {
            initialCategories = JSON.parse(localStorage.getItem("fd_vendor_categories")!);
          } else {
            initialCategories = [
              { id: "restaurant", name: "Restaurants", iconName: "UtensilsCrossed", color: "orange" },
              { id: "shop", name: "Shops", iconName: "Store", color: "yellow" },
              { id: "pharmacy", name: "Pharmacies", iconName: "Pill", color: "sky" },
              { id: "groceries", name: "Chowstore", iconName: "Apple", color: "red" },
            ];
            localStorage.setItem("fd_vendor_categories", JSON.stringify(initialCategories));
          }
          setVendorCategories(initialCategories);

          if (data.systemSettings.currency) {
            setCurrency(data.systemSettings.currency);
            localStorage.setItem("fd_currency", data.systemSettings.currency);
          } else if (localStorage.getItem("fd_currency")) {
            setCurrency(localStorage.getItem("fd_currency")!);
          }

          if (data.systemSettings.productCategories) {
            try { 
              const parsed = JSON.parse(data.systemSettings.productCategories);
              setCategories(parsed);
              localStorage.setItem("fd_product_categories", JSON.stringify(parsed));
            } catch(e){}
          }

          // Restore category service fees
          if (data.systemSettings.categoryServiceFees) {
            try { 
              const parsed = JSON.parse(data.systemSettings.categoryServiceFees);
              setCategoryServiceFees(parsed);
              localStorage.setItem("fd_category_service_fees", JSON.stringify(parsed));
            } catch(e){}
          } else if (localStorage.getItem("fd_category_service_fees")) {
            setCategoryServiceFees(JSON.parse(localStorage.getItem("fd_category_service_fees")!));
          }

          // Restore session or auto-login
          const savedSession = localStorage.getItem("fd_session_user");
          if (savedSession) {
            const u = JSON.parse(savedSession);
            const latestDbUser = data.users.find((user: any) => user.id === u.id || user.email.toLowerCase() === u.email.toLowerCase());
            let activeUser = u;
            if (latestDbUser) {
              const authorizedRoles = latestDbUser.roles || [latestDbUser.role];
              
              // Dynamically inject derived roles based on vendor/rider status
              const hasApprovedVendor = data.vendors?.some((v: any) => v.userId === latestDbUser.id && v.status === "approved");
              const hasApprovedRider = data.riders?.some((r: any) => r.userId === latestDbUser.id && r.status === "approved");
              
              if (hasApprovedVendor && !authorizedRoles.includes("vendor")) authorizedRoles.push("vendor");
              if (hasApprovedRider && !authorizedRoles.includes("rider")) authorizedRoles.push("rider");

              const activeRole = authorizedRoles.includes(u.role) ? u.role : (latestDbUser.role || "customer");
              activeUser = {
                ...latestDbUser,
                role: activeRole,
                roles: authorizedRoles
              };
              localStorage.setItem("fd_session_user", JSON.stringify(activeUser));
            }
            setCurrentUser(activeUser);
            if (activeUser.role === "vendor") {
              const v = data.vendors.find((vendor: any) => vendor.userId === activeUser.id);
              setCurrentVendor(v || null);
            } else if (activeUser.role === "rider") {
              const r = data.riders.find((rider: any) => rider.userId === activeUser.id);
              setCurrentRider(r || null);
            }
          } else {
            setCurrentUser(null);
          }
          return;
        }
      } catch (err) {
        // Silently fallback to Local Storage/Seeds if Cloud SQL load fails or endpoint doesn't exist yet
        // console.warn("Sync load deferred. Falling back to Local Storage/Seeds.");
      }

      // FALLBACK & SEEDING FLOW:
      // If Cloud SQL was empty, run original seed & bulk sync to database!
      
      // 1. Users
      const savedUsers = localStorage.getItem("fd_users");
      let initialUsers: User[] = [];
      if (savedUsers) {
        initialUsers = ensureSuperAdminsOnly(JSON.parse(savedUsers));
      } else {
        initialUsers = getInitialUsersSeed();
        localStorage.setItem("fd_users", JSON.stringify(initialUsers));
      }
      setUsers(initialUsers);

      // 2. Vendors
      const savedVendors = localStorage.getItem("fd_vendors");
      let initialVendors: Vendor[] = [];
      if (savedVendors) {
        initialVendors = JSON.parse(savedVendors);
      } else {
        initialVendors = [
          {
            id: "v-1",
            userId: "vendor1-id",
            name: "Mama Cass",
            description: "Traditional Nigerian dishes, rich aromatic Jollof Rice, Swallow, and delicious side delicacies.",
            cuisine: "Desserts",
            image: "/images/chicken.png",
            rating: 4.7,
            address: "Fate Road, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "restaurant",
            prepTime: 25,
            deliveryFee: 750,
            openingTime: "08:00",
            closingTime: "22:00"
          },
          {
            id: "v-2",
            userId: "vendor2-id",
            name: "Chicken Republic",
            description: "Home of the famous Soulfully Spiced chicken, crunchy tenders, and legendary Jollof meals.",
            cuisine: "Chicken",
            image: "/images/pizza.png",
            rating: 4.6,
            address: "GRA, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "restaurant",
            prepTime: 15,
            deliveryFee: 600,
            openingTime: "09:00",
            closingTime: "21:30"
          },
          {
            id: "v-3",
            userId: "vendor3-id",
            name: "Domino's Pizza",
            description: "Hot, fresh, oven-baked pizzas, delicious chicken sides, and sweet dessert treats.",
            cuisine: "Pizza",
            image: "/images/burger.png",
            rating: 4.5,
            address: "GRA, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "restaurant",
            prepTime: 20,
            deliveryFee: 900,
            openingTime: "09:00",
            closingTime: "23:00"
          },
          {
            id: "v-4",
            userId: "vendor4-id",
            name: "KFC",
            description: "Crispy fried chicken buckets, spicy Zinger burgers, and golden fries.",
            cuisine: "Burgers",
            image: "/images/hero.png",
            rating: 4.4,
            address: "Challenge Area, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "restaurant",
            prepTime: 20,
            deliveryFee: 800,
            openingTime: "10:00",
            closingTime: "22:00"
          },
          {
            id: "v-5",
            userId: "vendor5-id",
            name: "Mega Plaza Supermarket",
            description: "Household groceries, premium imported products, electronics, snacks, cold beverages, laundry essentials, and personal toiletries.",
            cuisine: "Groceries",
            image: "/images/jollof.png",
            rating: 4.6,
            address: "Tanke Road, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "shop",
            prepTime: 40,
            deliveryFee: 1200,
            openingTime: "08:00",
            closingTime: "21:00"
          },
          {
            id: "v-6",
            userId: "vendor6-id",
            name: "Medplus Pharmacy",
            description: "Prescription medicines, daily vitamins, first aid kits, skin care products, and essential sanitizers.",
            cuisine: "Drinks",
            image: "/images/chicken.png",
            rating: 4.8,
            address: "GRA, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "pharmacy",
            prepTime: 10,
            deliveryFee: 500,
            openingTime: "07:00",
            closingTime: "23:00"
          },
          {
            id: "v-7",
            userId: "vendor7-id",
            name: "Chowstore Ilorin",
            description: "Fresh farm-to-table produce, local spices, cooking oil, fresh tomatoes, green vegetables, grains, and kitchen condiments.",
            cuisine: "Salads",
            image: "/images/pizza.png",
            rating: 4.9,
            address: "Adewole Estate, Ilorin, Kwara",
            status: "approved",
            createdAt: new Date().toISOString(),
            category: "groceries",
            prepTime: 30,
            deliveryFee: 1000,
            openingTime: "08:00",
            closingTime: "20:00"
          }
        ];
        localStorage.setItem("fd_vendors", JSON.stringify(initialVendors));
      }
      setVendors(initialVendors);

      // 3. Products
      const savedProducts = localStorage.getItem("fd_products");
      let initialProducts: Product[] = [];
      const defaultAddonsMap: Record<string, { id: string; name: string; price: number }[]> = {
        "p-1": [
          { id: "a-1", name: "Grilled Chicken Thigh", price: 1500 },
          { id: "a-2", name: "Fried Plantain Portion", price: 500 },
          { id: "a-3", name: "Extra Coleslaw", price: 400 }
        ],
        "p-2": [
          { id: "a-4", name: "Peppered Gizzard", price: 1200 },
          { id: "a-2", name: "Fried Plantain Portion", price: 500 },
          { id: "a-13", name: "Boiled Egg Side", price: 300 }
        ],
        "p-5": [
          { id: "a-5", name: "Moimoi Option", price: 600 },
          { id: "a-6", name: "Extra Chicken Piece", price: 1800 }
        ],
        "p-7": [
          { id: "a-7", name: "Extra Mozzarella Cheese", price: 1000 },
          { id: "a-8", name: "BBQ Drizzle Cup", price: 300 }
        ],
        "p-8": [
          { id: "a-7", name: "Extra Mozzarella Cheese", price: 1000 },
          { id: "a-9", name: "Extra Sweetcorn", price: 400 }
        ],
        "p-9": [
          { id: "a-10", name: "Double Beef Upgrade", price: 1500 },
          { id: "a-11", name: "Fried Egg Side", price: 300 },
          { id: "a-12", name: "Cheddar Cheese Slice", price: 400 }
        ]
      };

      if (savedProducts) {
        initialProducts = JSON.parse(savedProducts);
      } else {
        initialProducts = getInitialProductsSeed();
        localStorage.setItem("fd_products", JSON.stringify(initialProducts));
      }

      setProducts(initialProducts);

      // 4. Riders
      const savedRiders = localStorage.getItem("fd_riders");
      let initialRiders: Rider[] = [];
      if (savedRiders) {
        initialRiders = JSON.parse(savedRiders);
      } else {
        initialRiders = [
          {
            id: "r-1",
            userId: "ride-1",
            name: "Rider Daniel",
            phone: "+234 905 987 6543",
            vehicleType: "motorcycle",
            status: "approved",
            isAvailable: true,
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem("fd_riders", JSON.stringify(initialRiders));
      }
      setRiders(initialRiders);

      // 5. Orders
      const savedOrders = localStorage.getItem("fd_orders");
      let initialOrders: Order[] = [];
      if (savedOrders) {
        initialOrders = JSON.parse(savedOrders);
      } else {
        initialOrders = [
          {
            id: "1253",
            customerId: "cust-1",
            customerName: "Sarah Collins",
            customerPhone: "+234 803 123 4567",
            vendorId: "v-1",
            vendorName: "Mama Cass",
            riderId: "r-1",
            riderName: "Rider Daniel",
            status: "delivered",
            totalAmount: 15000,
            deliveryAddress: "Tanke Road, Ilorin, Kwara",
            paymentMethod: "Cash on Delivery",
            createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
            items: [
              { id: "oi-1", orderId: "ord-1253", productId: "p-1", name: "Jollof Rice", price: 4500, quantity: 2 },
              { id: "oi-4", orderId: "ord-1253", productId: "p-4", name: "Coca Cola (50cl)", price: 500, quantity: 2 }
            ]
          },
          {
            id: "1254",
            customerId: "cust-1",
            customerName: "Sarah Collins",
            customerPhone: "+234 803 123 4567",
            vendorId: "v-2",
            vendorName: "Chicken Republic",
            riderId: "r-1",
            riderName: "Rider Daniel",
            status: "ready",
            totalAmount: 4500,
            deliveryAddress: "Fate Road, Ilorin, Kwara",
            paymentMethod: "Paystack (Card)",
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
            items: [
              { id: "oi-2", orderId: "ord-1254", productId: "p-5", name: "Citizens Meal", price: 3200, quantity: 1 }
            ]
          },
          {
            id: "1255",
            customerId: "cust-1",
            customerName: "Sarah Collins",
            customerPhone: "+234 803 123 4567",
            vendorId: "v-1",
            vendorName: "Mama Cass",
            status: "preparing",
            totalAmount: 12000,
            deliveryAddress: "Fate Road, Ilorin, Kwara",
            paymentMethod: "Paystack (Card)",
            createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
            items: [
              { id: "oi-3", orderId: "ord-1255", productId: "p-3", name: "Grilled Chicken", price: 3500, quantity: 3 }
            ]
          },
          {
            id: "1256",
            customerId: "cust-1",
            customerName: "Sarah Collins",
            customerPhone: "+234 803 123 4567",
            vendorId: "v-1",
            vendorName: "Mama Cass",
            status: "pending",
            totalAmount: 8500,
            deliveryAddress: "Fate Road, Ilorin, Kwara",
            paymentMethod: "Paystack (Card)",
            createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
            items: [
              { id: "oi-5", orderId: "ord-1256", productId: "p-1", name: "Jollof Rice", price: 4500, quantity: 1 },
              { id: "oi-6", orderId: "ord-1256", productId: "p-3", name: "Grilled Chicken", price: 3500, quantity: 1 }
            ]
          }
        ];
        localStorage.setItem("fd_orders", JSON.stringify(initialOrders));
      }
      initialOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setOrders(initialOrders);

      // 6. Restore active session
      const savedSessionUser = localStorage.getItem("fd_session_user");
      if (savedSessionUser) {
        const u: User = JSON.parse(savedSessionUser);
        const latestDbUser = initialUsers.find(user => user.id === u.id || user.email.toLowerCase() === u.email.toLowerCase());
        let activeUser = u;
        if (latestDbUser) {
          const authorizedRoles = latestDbUser.roles || [latestDbUser.role];
          
          const hasApprovedVendor = initialVendors?.some((v: any) => v.userId === latestDbUser.id && v.status === "approved");
          const hasApprovedRider = initialRiders?.some((r: any) => r.userId === latestDbUser.id && r.status === "approved");
          
          if (hasApprovedVendor && !authorizedRoles.includes("vendor")) authorizedRoles.push("vendor");
          if (hasApprovedRider && !authorizedRoles.includes("rider")) authorizedRoles.push("rider");

          const activeRole = authorizedRoles.includes(u.role) ? u.role : (latestDbUser.role || "customer");
          activeUser = {
            ...latestDbUser,
            role: activeRole,
            roles: authorizedRoles
          };
          localStorage.setItem("fd_session_user", JSON.stringify(activeUser));
        }
        setCurrentUser(activeUser);
        if (activeUser.role === "vendor") {
          const v = initialVendors.find(vendor => vendor.userId === activeUser.id);
          setCurrentVendor(v || null);
        } else if (activeUser.role === "rider") {
          const r = initialRiders.find(rider => rider.userId === activeUser.id);
          setCurrentRider(r || null);
        }
      } else {
        setCurrentUser(null);
      }

      // 7. Available Locations Seed
      const savedAvailableLocations = localStorage.getItem("fd_available_locations");
      let initialAvailableLocations: string[] = [];
      if (savedAvailableLocations) {
        initialAvailableLocations = JSON.parse(savedAvailableLocations);
      } else {
        initialAvailableLocations = [
          "Tanke, Ilorin, Kwara",
          "GRA, Ilorin, Kwara",
          "Challenge, Ilorin, Kwara",
          "Fate, Ilorin, Kwara",
          "Adewole, Ilorin, Kwara",
          "Post Office Area, Ilorin, Kwara"
        ];
      }

      const savedExtremeLocations = localStorage.getItem("fd_extreme_locations");
      let initialExtreme: ExtremeLocation[] = [];
      if (savedExtremeLocations) {
        try {
          initialExtreme = JSON.parse(savedExtremeLocations);
        } catch {}
      }
      if (!initialExtreme || initialExtreme.length === 0) {
        initialExtreme = [
          { id: "ex-1", name: "University Permanent Site", tierId: "tier-1" },
          { id: "ex-2", name: "Airport Road", tierId: "tier-1" },
          { id: "ex-3", name: "Oke-Ose", tierId: "tier-1" },
          { id: "ex-4", name: "Eyenkorin", tierId: "tier-2" },
          { id: "ex-5", name: "Shao", tierId: "tier-2" },
          { id: "ex-6", name: "Oke-Oyi", tierId: "tier-2" },
          { id: "ex-7", name: "Ganmo Outer Bounds", tierId: "tier-3" },
          { id: "ex-8", name: "Afono", tierId: "tier-3" }
        ];
      }

      let finalLocations = [...initialAvailableLocations];
      initialExtreme.forEach(ex => {
        if (!finalLocations.includes(ex.name)) {
          finalLocations.push(ex.name);
        }
      });
      localStorage.setItem("fd_available_locations", JSON.stringify(finalLocations));
      setAvailableLocations(finalLocations);

      // 8. Restore or seed Payment Gateways
      const savedPaymentGateways = localStorage.getItem("fd_payment_gateways");
      let initialPaymentGateways: PaymentGateway[] = [];
      if (savedPaymentGateways) {
        initialPaymentGateways = JSON.parse(savedPaymentGateways);
      } else {
        initialPaymentGateways = [
          { id: "credit_card", name: "Credit Card", desc: "Pay with VISA / Mastercard / Verve", isEnabled: true, apiKey: "pk_live_51O..." },
          { id: "cash_on_delivery", name: "Cash on Delivery", desc: "Pay with cash or bank transfer on arrival", isEnabled: true },
          { id: "wallet", name: "Owode Food Wallet", desc: "Instantly settle using your balance wallet", isEnabled: true },
          { id: "monnify", name: "Monnify (Bank & Card)", desc: "Secure automated payments via Monnify API", isEnabled: true, apiKey: "MK_prod_x94k...", secretKey: "sk_prod_948j...", contractCode: "1234567890" },
          { id: "bank_transfer", name: "Local Bank Transfer", desc: "Direct transfer with automated receipt uploading", isEnabled: true, bankName: "GTBank", accountNumber: "0123456789", accountName: "Owode Food Marketplace LTD" }
        ];
        localStorage.setItem("fd_payment_gateways", JSON.stringify(initialPaymentGateways));
      }
      setPaymentGateways(initialPaymentGateways);

      // 9. Restore category service fees
      const savedCategoryFees = localStorage.getItem("fd_category_service_fees");
      if (savedCategoryFees) {
        setCategoryServiceFees(JSON.parse(savedCategoryFees));
      }

      // 10. Restore vendor categories
      const savedVendorCategories = localStorage.getItem("fd_vendor_categories");
      let initialCategories: VendorCategoryInfo[] = [];
      if (savedVendorCategories) {
        initialCategories = JSON.parse(savedVendorCategories);
      } else {
        initialCategories = [
          { id: "restaurant", name: "Restaurants", iconName: "UtensilsCrossed", color: "orange" },
          { id: "shop", name: "Shops", iconName: "Store", color: "yellow" },
          { id: "pharmacy", name: "Pharmacies", iconName: "Pill", color: "sky" },
          { id: "groceries", name: "Chowstore", iconName: "Apple", color: "red" },
        ];
        localStorage.setItem("fd_vendor_categories", JSON.stringify(initialCategories));
      }
      setVendorCategories(initialCategories);

      // 11. Restore global service fee / delivery fee settings
      const savedFeeType = localStorage.getItem("fd_global_service_fee_type");
      if (savedFeeType) {
        setGlobalServiceFeeType(savedFeeType as any);
      }
      const savedFeeValue = localStorage.getItem("fd_global_service_fee_value");
      if (savedFeeValue) {
        setGlobalServiceFeeValue(Number(savedFeeValue));
      }
      const savedFreeDel = localStorage.getItem("fd_global_free_delivery");
      if (savedFreeDel) {
        setGlobalFreeDelivery(savedFreeDel === "true");
      }
      const savedSurge = localStorage.getItem("fd_surge_config");
      if (savedSurge) {
        try {
          setSurgeConfig(JSON.parse(savedSurge));
        } catch (e) {
          console.error("Failed to parse surge config", e);
        }
      }

      const savedLegal = localStorage.getItem("fd_legal_content");
      if (savedLegal) {
        try {
          setLegalContent(JSON.parse(savedLegal));
        } catch (e) {
          console.error("Failed to parse legal config", e);
        }
      }

      const savedContact = localStorage.getItem("fd_contact_info");
      if (savedContact) {
        try {
          setContactInfo(JSON.parse(savedContact));
        } catch (e) {
          console.error("Failed to parse contact config", e);
        }
      }

      const savedCurrency = localStorage.getItem("fd_currency");
      if (savedCurrency) {
        setCurrency(savedCurrency);
      }

      const savedPlatformCommissionRate = localStorage.getItem("fd_platform_commission_rate");
      if (savedPlatformCommissionRate) {
        setPlatformCommissionRate(Number(savedPlatformCommissionRate));
      }
      const savedRiderCommissionType = localStorage.getItem("fd_rider_commission_type");
      if (savedRiderCommissionType) {
        setRiderCommissionType(savedRiderCommissionType as any);
      }
      const savedRiderCommissionValue = localStorage.getItem("fd_rider_commission_value");
      if (savedRiderCommissionValue) {
        setRiderCommissionValue(Number(savedRiderCommissionValue));
      }

      const savedVatEnabled = localStorage.getItem("fd_vat_enabled");
      if (savedVatEnabled) {
        setVatEnabled(savedVatEnabled === "true");
      }
      const savedVatRate = localStorage.getItem("fd_vat_rate");
      if (savedVatRate) {
        setVatRate(Number(savedVatRate));
      }

      const savedMaxCartItems = localStorage.getItem("fd_max_cart_items");
      if (savedMaxCartItems) {
        setMaxCartItems(Number(savedMaxCartItems));
      }

      // 12. Restore employees
      const savedEmployees = localStorage.getItem("fd_employees");
      let initialEmployees: Employee[] = [];
      if (savedEmployees) {
        initialEmployees = JSON.parse(savedEmployees);
      } else {
        initialEmployees = [
          { id: "emp-1", name: "Adewale Banjo", email: "adewale@owodefood.com", phone: "+234 812 345 6789", department: "dispatcher", status: "active", permissions: ["manage_orders", "manage_riders"], createdAt: new Date().toISOString() },
          { id: "emp-2", name: "Chidi Okafor", email: "chidi@owodefood.com", phone: "+234 803 111 2222", department: "finance", status: "active", permissions: ["view_settings"], createdAt: new Date().toISOString() },
          { id: "emp-3", name: "Fatima Yusuf", email: "fatima@owodefood.com", phone: "+234 705 999 8888", department: "support", status: "active", permissions: ["manage_orders", "manage_vendors"], createdAt: new Date().toISOString() },
        ];
        localStorage.setItem("fd_employees", JSON.stringify(initialEmployees));
      }
      setEmployees(initialEmployees);

      // 13. Restore reviews
      const savedReviews = localStorage.getItem("fd_reviews");
      let initialReviews: Review[] = [];
      if (savedReviews) {
        initialReviews = JSON.parse(savedReviews);
      } else {
        initialReviews = [
          { id: "rev-1", vendorId: "v-1", customerId: "cust-1", author: "Adebayo O.", rating: 5, comment: "Smoky Jollof of dreams! Highly recommend Mama Cass, original flavor is preserved.", createdAt: "2026-06-27T10:00:00.000Z" },
          { id: "rev-2", vendorId: "v-1", customerId: "cust-1", author: "Chinedu E.", rating: 4, comment: "Crispy grilled chicken is excellent. Perfectly packed and came hot.", createdAt: "2026-06-25T14:30:00.000Z" },
          { id: "rev-3", vendorId: "v-2", customerId: "cust-1", author: "Fatima Y.", rating: 5, comment: "Authentic taste. Fast checkout setup, we will order again on Friday!", createdAt: "2026-06-20T12:00:00.000Z" }
        ];
        localStorage.setItem("fd_reviews", JSON.stringify(initialReviews));
      }
      setReviews(initialReviews);

      // Upload seeded / local storage data to Cloud SQL for permanent persistence!
      try {
        await syncSave("USERS_BULK", initialUsers);
        await syncSave("VENDORS_BULK", initialVendors);
        await syncSave("PRODUCTS_BULK", initialProducts);
        await syncSave("RIDERS_BULK", initialRiders);
        await syncSave("ORDERS_BULK", initialOrders);
        await syncSave("PAYMENT_GATEWAYS_BULK", initialPaymentGateways);
        await syncSave("EXTREME_LOCATION_TIERS_BULK", [
          { id: "tier-1", name: "Tier 1: Outer Suburbs", surcharge: 1000 },
          { id: "tier-2", name: "Tier 2: Extreme Outskirts", surcharge: 2000 },
          { id: "tier-3", name: "Tier 3: Ultra Remote / Borders", surcharge: 3500 }
        ]);
        await syncSave("EXTREME_LOCATIONS_BULK", initialExtreme);
        await syncSave("EMPLOYEES_BULK", initialEmployees);
        await syncSave("REVIEWS_BULK", initialReviews);
      } catch (e) {
        console.error("Failed to seed database with fallback variables", e);
      }
    };

    loadFromCloudSQL();

    const handleSyncEvent = () => loadFromCloudSQL();
    window.addEventListener("sync_update_event", handleSyncEvent);

    // Lightweight polling every 15 seconds: check a tiny "has anything
    // changed?" version string instead of re-downloading the entire dataset
    // every tick. Only fetch the full dataset when the version actually
    // differs from what we last saw. This was previously calling
    // loadFromCloudSQL() (the full dataset) unconditionally every 15 seconds
    // on every open tab, which was the confirmed cause of excessive
    // Supabase egress usage.
    const checkForUpdates = async () => {
      try {
        const res = await fetch("/api/sync/version");
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== lastKnownDataVersionRef.current) {
          lastKnownDataVersionRef.current = data.version;
          loadFromCloudSQL();
        }
      } catch (e) {
        // Silent — a failed version check just means we skip this tick;
        // the next successful one will catch up. Not worth logging noise
        // for every transient network blip.
      }
    };

    const interval = setInterval(checkForUpdates, 15000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("sync_update_event", handleSyncEvent);
    };
  }, []);

  // Automatically synchronize currentUser's roles if they have approved vendor/rider profiles or if their roles changed in the main users list.
  useEffect(() => {
    if (!currentUser) return;
    
    // Find the latest user record in the active users list
    const latestDbUser = users.find(u => u.id === currentUser.id);
    const myVendor = vendors.find(v => v.userId === currentUser.id);
    const myRider = riders.find(r => r.userId === currentUser.id);
    
    // Determine what roles the user should have
    const baseRoles = latestDbUser ? (latestDbUser.roles || [latestDbUser.role]) : (currentUser.roles || [currentUser.role]);
    const unionRoles = Array.from(new Set([...baseRoles, ...(currentUser.roles || [])]));
    const updatedRoles = [...unionRoles];
    
    if (myVendor && myVendor.status === "approved" && !updatedRoles.includes("vendor")) {
      updatedRoles.push("vendor");
    }
    if (myRider && myRider.status === "approved" && !updatedRoles.includes("rider")) {
      updatedRoles.push("rider");
    }
    
    // Also, if latestDbUser is different in core profile fields (name, phone, pin, roles)
    // To safely check for role changes regardless of order:
    const rolesChanged = currentUser.roles?.length !== updatedRoles.length || 
                         !(currentUser.roles || []).every(r => updatedRoles.includes(r));
    const nameChanged = latestDbUser && currentUser.name !== latestDbUser.name;
    const phoneChanged = latestDbUser && currentUser.phone !== latestDbUser.phone;
    const pinChanged = latestDbUser && currentUser.pin !== latestDbUser.pin;
    
    if (rolesChanged || nameChanged || phoneChanged || pinChanged) {
      const updatedUser = {
        ...currentUser,
        name: latestDbUser ? latestDbUser.name : currentUser.name,
        phone: latestDbUser ? latestDbUser.phone : currentUser.phone,
        pin: latestDbUser ? latestDbUser.pin : currentUser.pin,
        roles: updatedRoles
      };
      
      setCurrentUser(updatedUser);
      localStorage.setItem("fd_session_user", JSON.stringify(updatedUser));
      
      // Keep the users list in sync as well
      if (latestDbUser) {
        const updatedDbUser = { ...latestDbUser, roles: updatedRoles };
        const updatedUsersList = users.map(u => u.id === currentUser.id ? updatedDbUser : u);
        // Only trigger users list persist if it actually changed
        if (JSON.stringify(latestDbUser.roles) !== JSON.stringify(updatedRoles)) {
          persistUsers(updatedUsersList);
        }
      }
    }
  }, [currentUser, users, vendors, riders]);

  const updateAvailableLocations = (locations: string[]) => {
    setAvailableLocations(locations);
    localStorage.setItem("fd_available_locations", JSON.stringify(locations));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "availableLocations", value: JSON.stringify(locations) });
  };

  const updateCoverageGuideText = (text: string) => {
    setCoverageGuideText(text);
    localStorage.setItem("fd_coverage_guide", text);
  };

  const updateExtremeLocationTiers = (tiers: ExtremeLocationTier[]) => {
    setExtremeLocationTiers(tiers);
    localStorage.setItem("fd_extreme_tiers", JSON.stringify(tiers));
    syncSave("EXTREME_LOCATION_TIERS_BULK", tiers);
  };

  const addExtremeLocation = (name: string, tierId: string) => {
    const newLoc: ExtremeLocation = { id: "ex-" + generateId(), name, tierId };
    const updated = [...extremeLocations, newLoc];
    setExtremeLocations(updated);
    localStorage.setItem("fd_extreme_locations", JSON.stringify(updated));
    syncSave("EXTREME_LOCATIONS_BULK", updated);
  };

  const removeExtremeLocation = (id: string) => {
    const updated = extremeLocations.filter(item => item.id !== id);
    setExtremeLocations(updated);
    localStorage.setItem("fd_extreme_locations", JSON.stringify(updated));
    syncSave("EXTREME_LOCATIONS_DELETE", { id });
  };

  const updateExtremeLocations = (locations: ExtremeLocation[]) => {
    setExtremeLocations(locations);
    localStorage.setItem("fd_extreme_locations", JSON.stringify(locations));
    syncSave("EXTREME_LOCATIONS_BULK", locations);
  };

  const addSavedAddress = (streetAddress: string, district: string, landmarkNote: string) => {
    if (!currentUser) return;
    const newAddress: UserSavedAddress = {
      id: "sa-" + generateId(),
      userId: currentUser.id,
      streetAddress,
      district,
      landmarkNote
    };
    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    localStorage.setItem("fd_saved_addresses", JSON.stringify(updated));
    syncSave("USER_SAVED_ADDRESSES_BULK", updated);
  };

  const removeSavedAddress = (id: string) => {
    const updated = savedAddresses.filter(item => item.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem("fd_saved_addresses", JSON.stringify(updated));
    syncSave("USER_SAVED_ADDRESS_DELETE", { id });
  };

  const updatePaymentGateways = (gateways: PaymentGateway[]) => {
    setPaymentGateways(gateways);
    localStorage.setItem("fd_payment_gateways", JSON.stringify(gateways));
    syncSave("PAYMENT_GATEWAYS_BULK", gateways);
  };

  const updateCategoryServiceFee = (category: string, fee: number) => {
    const updated = { ...categoryServiceFees, [category]: fee };
    setCategoryServiceFees(updated);
    localStorage.setItem("fd_category_service_fees", JSON.stringify(updated));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "categoryServiceFees", value: JSON.stringify(updated) });
  };

  const addVendorCategory = (newCat: VendorCategoryInfo) => {
    const updatedCats = [...vendorCategories, newCat];
    setVendorCategories(updatedCats);
    localStorage.setItem("fd_vendor_categories", JSON.stringify(updatedCats));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "vendorCategories", value: JSON.stringify(updatedCats) });

    if (categoryServiceFees[newCat.id] === undefined) {
      const updatedFees = { ...categoryServiceFees, [newCat.id]: 300 };
      setCategoryServiceFees(updatedFees);
      localStorage.setItem("fd_category_service_fees", JSON.stringify(updatedFees));
      syncSave("SYSTEM_SETTING_UPSERT", { key: "categoryServiceFees", value: JSON.stringify(updatedFees) });
    }
  };

  const removeVendorCategory = (catId: string) => {
    const updatedCats = vendorCategories.filter(c => c.id !== catId);
    setVendorCategories(updatedCats);
    localStorage.setItem("fd_vendor_categories", JSON.stringify(updatedCats));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "vendorCategories", value: JSON.stringify(updatedCats) });

    const updatedFees = { ...categoryServiceFees };
    delete updatedFees[catId];
    setCategoryServiceFees(updatedFees);
    localStorage.setItem("fd_category_service_fees", JSON.stringify(updatedFees));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "categoryServiceFees", value: JSON.stringify(updatedFees) });
  };

  const updateVendorCategory = (catId: string, updatedFields: Partial<Omit<VendorCategoryInfo, "id">>) => {
    const updatedCats = vendorCategories.map(c => c.id === catId ? { ...c, ...updatedFields } : c);
    setVendorCategories(updatedCats);
    localStorage.setItem("fd_vendor_categories", JSON.stringify(updatedCats));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "vendorCategories", value: JSON.stringify(updatedCats) });
  };

  const updateGlobalServiceFeeSettings = (type: "category" | "flat" | "percentage", value: number) => {
    setGlobalServiceFeeType(type);
    setGlobalServiceFeeValue(value);
    localStorage.setItem("fd_global_service_fee_type", type);
    localStorage.setItem("fd_global_service_fee_value", String(value));
  };

  const updateGlobalFreeDelivery = (isEnabled: boolean) => {
    setGlobalFreeDelivery(isEnabled);
    localStorage.setItem("fd_global_free_delivery", String(isEnabled));
  };

  const updateSurgeConfig = (config: Partial<SystemSurgeConfig>) => {
    setSurgeConfig(prev => {
      const updated = { ...prev, ...config };
      localStorage.setItem("fd_surge_config", JSON.stringify(updated));
      return updated;
    });
  };

  const updateLegalContent = (content: Partial<LegalContent>) => {
    setLegalContent(prev => {
      const updated = { ...prev, ...content };
      localStorage.setItem("fd_legal_content", JSON.stringify(updated));
      return updated;
    });
  };

  const updateContactInfo = (info: Partial<ContactInfo>) => {
    setContactInfo(prev => {
      const updated = { ...prev, ...info };
      localStorage.setItem("fd_contact_info", JSON.stringify(updated));
      return updated;
    });
  };

  const saveSystemSettings = async () => {
    const payload = [
      { key: "platformCommissionRate", value: String(platformCommissionRate) },
      { key: "riderCommissionType", value: riderCommissionType },
      { key: "riderCommissionValue", value: String(riderCommissionValue) },
      { key: "vatEnabled", value: String(vatEnabled) },
      { key: "vatRate", value: String(vatRate) },
      { key: "maxCartItems", value: String(maxCartItems) },
      { key: "walletFundingBankTransferEnabled", value: String(walletFundingBankTransferEnabled) },
      { key: "walletFundingMonnifyEnabled", value: String(walletFundingMonnifyEnabled) },
      { key: "walletFundingPaystackEnabled", value: String(walletFundingPaystackEnabled) },
      { key: "contactInfo", value: JSON.stringify(contactInfo) },
      { key: "legalContent", value: JSON.stringify(legalContent) },
      { key: "currency", value: currency },
      { key: "coverageGuideText", value: coverageGuideText },
      { key: "globalServiceFeeType", value: globalServiceFeeType },
      { key: "globalServiceFeeValue", value: String(globalServiceFeeValue) },
      { key: "globalFreeDelivery", value: String(globalFreeDelivery) },
      { key: "surgeConfig", value: JSON.stringify(surgeConfig) },
      { key: "receiptPickupConfig", value: JSON.stringify(receiptPickupConfig) },
      { key: "categoryServiceFees", value: JSON.stringify(categoryServiceFees) }
    ];
    await syncSave("SYSTEM_SETTINGS_BULK", payload);
  };

  const saveDeliveryZones = async () => {
    await syncSave("EXTREME_LOCATION_TIERS_BULK", extremeLocationTiers);
    await syncSave("EXTREME_LOCATIONS_BULK", extremeLocations);
  };

  const updateCurrency = (symbol: string) => {
    setCurrency(symbol);
    localStorage.setItem("fd_currency", symbol);
  };

  const updatePlatformCommissionRate = (rate: number) => {
    setPlatformCommissionRate(rate);
    localStorage.setItem("fd_platform_commission_rate", String(rate));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "platformCommissionRate", value: String(rate) });
  };

  const updateRiderCommissionSettings = (type: "flat" | "percentage", value: number) => {
    setRiderCommissionType(type);
    setRiderCommissionValue(value);
    localStorage.setItem("fd_rider_commission_type", type);
    localStorage.setItem("fd_rider_commission_value", String(value));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "riderCommissionType", value: type });
    syncSave("SYSTEM_SETTING_UPSERT", { key: "riderCommissionValue", value: String(value) });
  };

  const updateVatSettings = (enabled: boolean, rate: number) => {
    setVatEnabled(enabled);
    setVatRate(rate);
    localStorage.setItem("fd_vat_enabled", String(enabled));
    localStorage.setItem("fd_vat_rate", String(rate));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "vatEnabled", value: String(enabled) });
    syncSave("SYSTEM_SETTING_UPSERT", { key: "vatRate", value: String(rate) });
  };

  const updateMaxCartItems = (limit: number) => {
    setMaxCartItems(limit);
    localStorage.setItem("fd_max_cart_items", String(limit));
    syncSave("SYSTEM_SETTING_UPSERT", { key: "maxCartItems", value: String(limit) });
  };

  const calculateServiceFee = (vendorId: string | undefined, subtotal: number): number => {
    if (!vendorId || subtotal <= 0) return 0;
    const vendorObj = vendors.find(v => v.id === vendorId);
    if (!vendorObj) return 0;

    // 1. Vendor level override has highest priority
    if (vendorObj.serviceFeeType !== undefined && vendorObj.serviceFeeType !== null && vendorObj.serviceFeeValue !== undefined && vendorObj.serviceFeeValue !== null) {
      if (vendorObj.serviceFeeType === "percentage") {
        return Math.round((subtotal * vendorObj.serviceFeeValue) / 100);
      } else {
        return vendorObj.serviceFeeValue;
      }
    }

    // Fallback to legacy field serviceFee
    if (vendorObj.serviceFee !== undefined && vendorObj.serviceFee !== null) {
      return vendorObj.serviceFee;
    }

    // 2. Global service fee settings
    if (globalServiceFeeType === "flat") {
      return globalServiceFeeValue;
    } else if (globalServiceFeeType === "percentage") {
      return Math.round((subtotal * globalServiceFeeValue) / 100);
    }

    // 3. Category level (default fallback)
    const cat = vendorObj.category || "restaurant";
    return (categoryServiceFees[cat] !== undefined && categoryServiceFees[cat] !== null) ? categoryServiceFees[cat] : 300;
  };

  const getRegion = (address: string): string => {
    const addr = address.toLowerCase();
    if (addr.includes("tanke")) return "tanke";
    if (addr.includes("gra")) return "gra";
    if (addr.includes("challenge")) return "challenge";
    if (addr.includes("fate")) return "fate";
    if (addr.includes("adewole")) return "adewole";
    return "other";
  };

  const calculateDeliveryFee = (vendorId: string | undefined, subtotal: number, deliveryAddress?: string, isReceiptPickup?: boolean): number => {
    if (subtotal <= 0 && !isReceiptPickup) return 0;
    if (globalFreeDelivery) return 0;
    
    if (!vendorId) return 750;
    const vendorObj = vendors.find(v => v.id === vendorId);
    if (!vendorObj) return 750;

    if (vendorObj.freeDelivery) return 0;

    const baseFee = (vendorObj.deliveryFee !== undefined && vendorObj.deliveryFee !== null) ? vendorObj.deliveryFee : 750;

    // Search for extreme location match in the deliveryAddress
    let extremeSurcharge = 0;
    if (deliveryAddress) {
      const lowerAddress = deliveryAddress.toLowerCase();
      for (const ex of extremeLocations) {
        if (lowerAddress.includes(ex.name.toLowerCase())) {
          const tier = extremeLocationTiers.find(t => t.id === ex.tierId);
          if (tier) {
            extremeSurcharge = tier.surcharge;
            break;
          }
        }
      }
    }

    if (!deliveryAddress) return baseFee + extremeSurcharge;

    const vendorRegion = getRegion(vendorObj.address);
    const customerRegion = getRegion(deliveryAddress);

    // If regions mismatch and both are known, add a cross-district delivery fee of ₦850
    if (vendorRegion !== "other" && customerRegion !== "other" && vendorRegion !== customerRegion) {
      extremeSurcharge += 850;
    }

    // Apply Surge Pricing & Weather Charges
    let totalSurge = 0;
    if (surgeConfig.isSurgeActive) totalSurge += surgeConfig.surgeFee;
    if (surgeConfig.isRainActive) totalSurge += surgeConfig.rainFee;
    if (surgeConfig.isNightActive) {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentMinutes = currentH * 60 + currentM;
      
      const [startH, startM] = surgeConfig.nightStartTime.split(":").map(Number);
      const [endH, endM] = surgeConfig.nightEndTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      let isNightNow = false;
      if (startMinutes > endMinutes) {
        // Night crosses midnight (e.g. 22:00 to 06:00)
        isNightNow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      } else {
        isNightNow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
      if (isNightNow) totalSurge += surgeConfig.nightFee;
    }

    return baseFee + extremeSurcharge + totalSurge;
  };

  const addEmployee = (newEmpData: Omit<Employee, "id" | "createdAt">) => {
    const newEmp: Employee = {
      ...newEmpData,
      id: "emp-" + Math.floor(100 + Math.random() * 900),
      createdAt: new Date().toISOString(),
    };
    const updated = [...employees, newEmp];
    setEmployees(updated);
    localStorage.setItem("fd_employees", JSON.stringify(updated));
    syncSave("EMPLOYEES_BULK", updated);

    // Also register them in users state so they can log in via quick login!
    const updatedUsers = [...users, {
      id: newEmp.id,
      email: newEmp.email,
      name: newEmp.name,
      phone: newEmp.phone,
      role: "employee" as UserRole,
      roles: ["customer", "employee" as UserRole],
      createdAt: newEmp.createdAt
    }];
    persistUsers(updatedUsers);
  };

  const updateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    const updated = employees.map(emp => emp.id === id ? { ...emp, ...updatedFields } : emp);
    setEmployees(updated);
    localStorage.setItem("fd_employees", JSON.stringify(updated));
    syncSave("EMPLOYEES_BULK", updated);

    // Keep users state synced too
    const updatedUsers = users.map(u => u.id === id ? { 
      ...u, 
      name: updatedFields.name || u.name, 
      email: updatedFields.email || u.email,
      phone: updatedFields.phone || u.phone,
      role: (updatedFields.status === "inactive" ? "customer" : "employee") as UserRole // switch to customer if inactive
    } : u);
    persistUsers(updatedUsers);
  };

  const removeEmployee = (id: string) => {
    const updated = employees.filter(emp => emp.id !== id);
    setEmployees(updated);
    localStorage.setItem("fd_employees", JSON.stringify(updated));
    syncSave("EMPLOYEE_DELETE", { id });

    // Also delete from users state
    const updatedUsers = users.filter(u => u.id !== id);
    persistUsers(updatedUsers);
  };

  // Cloud SQL Sync helper
  const syncSave = async (type: string, payload: any) => {
    try {
      const token = localStorage.getItem("fd_jwt_token");

      // Bulk writes (USERS_BULK, VENDORS_BULK, etc.) require admin auth on the
      // server. Attempting one with no token, or as a logged-in non-admin user
      // (customer/vendor/rider), is guaranteed to fail — this was firing on
      // every periodic poll for every such visitor, spamming the console with
      // doomed 401s for no benefit. Skip the network call entirely in that
      // case; anything else (including USER_UPSERT, which legitimately runs
      // unauthenticated for new registrations) still goes through as before.
      const isCurrentUserAdmin = !!currentUser && (
        currentUser.role === "admin" ||
        currentUser.roles?.includes("admin") ||
        ["azeezlukman122@gmail.com", "omotayo111111@gmail.com", "ptrcrwlnd@gmail.com"].includes(currentUser.email?.toLowerCase())
      );
      if (type.endsWith("_BULK") && (!token || !isCurrentUserAdmin)) {
        return { success: false, error: "Skipped: bulk sync requires an authenticated admin session." };
      }

      const headers: any = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["X-Auth-Token"] = token;
      }
      // Note: no early return when there's no token. The backend explicitly allows
      // unauthenticated USER_UPSERT (new registrations) and empty-table bulk seeding —
      // bailing out here silently dropped brand-new user accounts before they ever
      // reached the database.

      const res = await fetch("/api/sync/save", {
        method: "POST",
        headers,
        body: JSON.stringify({ type, payload }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[syncSave] "${type}" failed with status ${res.status}: ${errText}`);
        return { success: false, error: `Sync failed (${res.status})` };
      }

      const data = await res.json().catch(() => ({}));
      return { success: true, ...data };
    } catch (err: any) {
      console.error(`[syncSave] "${type}" threw an error:`, err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  };

  // Update localStorage whenever values change and sync to Cloud SQL
  const persistUsers = (newUsers: User[]) => {
    const checkedUsers = ensureSuperAdminsOnly(newUsers);
    setUsers(checkedUsers);
    localStorage.setItem("fd_users", JSON.stringify(checkedUsers));
    syncSave("USERS_BULK", checkedUsers);
  };

  const persistVendors = (newVendors: Vendor[]) => {
    setVendors(newVendors);
    localStorage.setItem("fd_vendors", JSON.stringify(newVendors));
    syncSave("VENDORS_BULK", newVendors);
  };

  const persistProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem("fd_products", JSON.stringify(newProducts));
    syncSave("PRODUCTS_BULK", newProducts);
  };

  const persistOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem("fd_orders", JSON.stringify(newOrders));
    syncSave("ORDERS_BULK", newOrders);
  };

  const persistRiders = (newRiders: Rider[]) => {
    setRiders(newRiders);
    localStorage.setItem("fd_riders", JSON.stringify(newRiders));
    syncSave("RIDERS_BULK", newRiders);
  };

  // AUTH ACTIONS
  const checkUser = async (identifier: string) => {
    try {
      const response = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      if (!response.ok) throw new Error("Backend check failed");
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }
      return await response.json();
    } catch (err) {
      // Fallback to local users array if backend is unavailable
      const identifierLower = identifier.trim().toLowerCase();
      const localUser = users.find(
        (u) => u.email.toLowerCase() === identifierLower || u.phone === identifier
      );
      if (localUser) {
        return { exists: true, user: localUser };
      }
      return { exists: false, error: "Network error" };
    }
  };

  const finalizeLogin = (user: any, token: string, role: UserRole) => {
    const loggedInUser = { ...user, role, roles: user.roles || [user.role] };
    setCurrentUser(loggedInUser);
    localStorage.setItem("fd_session_user", JSON.stringify(loggedInUser));
    localStorage.setItem("fd_jwt_token", token);
    
    if (role === "vendor") {
      const v = vendors.find(vend => vend.userId === user.id);
      setCurrentVendor(v || null);
    } else if (role === "rider") {
      const r = riders.find(rid => rid.userId === user.id);
      setCurrentRider(r || null);
    }
  };

  const login = async (identifier: string, pin: string, role: UserRole, preventStateUpdate: boolean = false) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, pin })
      });
      if (!response.ok) throw new Error("Backend login failed");
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }
      const data = await response.json();
      
      if (!data.success) {
        return { success: false, error: data.error || "Login failed" };
      }
      
      const user = data.user;
      const userRoles = user.roles || [user.role];
      if (!userRoles.includes(role)) {
        return { success: false, error: `This account does not have the ${role} role. Available roles: ${userRoles.join(", ")}.` };
      }
      
      if (!preventStateUpdate) {
        finalizeLogin(user, data.token, role);
      }
      
      return { success: true, user: { ...user, role, roles: userRoles }, token: data.token };
    } catch (err) {
      // Fallback to local login if backend is unavailable
      const identifierLower = identifier.trim().toLowerCase();
      const localUser = users.find(
        (u) => u.email.toLowerCase() === identifierLower || u.phone === identifier
      );
      
      if (!localUser) {
        return { success: false, error: "No registered account matches this email or phone number. Try selecting 'Register'." };
      }
      
      if (localUser.pin !== pin) {
        return { success: false, error: "Incorrect PIN. Please try again." };
      }
      
      const userRoles = localUser.roles || [localUser.role];
      if (!userRoles.includes(role)) {
        return { success: false, error: `This account does not have the ${role} role. Available roles: ${userRoles.join(", ")}.` };
      }
      
      if (!preventStateUpdate) {
        // We generate a dummy token for local session
        const dummyToken = "local_token_" + localUser.id;
        finalizeLogin(localUser, dummyToken, role);
      }
      
      return { success: true, user: { ...localUser, role, roles: userRoles }, token: "local_token_" + localUser.id };
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    role: UserRole,
    gender?: string,
    extra?: { businessName?: string; cuisine?: string; vehicleType?: string; pin?: string }
  ) => {
    const cleansedEmail = email.trim().toLowerCase();
    
    // Secure backend check instead of insecure local check
    const checkRes = await checkUser(cleansedEmail);
    if (checkRes.exists) {
      return { success: false, error: "An account with this email already exists." };
    }

    const checkPhone = await checkUser(phone);
    if (checkPhone.exists) {
      return { success: false, error: "An account with this phone number already exists." };
    }

    const newUserId = generateId();
    const newUser: User = {
      id: newUserId,
      email: cleansedEmail,
      name,
      phone,
      role,
      roles: role === "customer" ? ["customer"] : ["customer", role],
      gender: gender || undefined,
      createdAt: new Date().toISOString(),
      pin: extra?.pin || undefined
    };

    const updatedUsers = [...users, newUser];
    persistUsers(updatedUsers);

    // If role is vendor, register a vendor profile as well
    if (role === "vendor") {
      const newVendor: Vendor = {
        id: "v-" + generateId(),
        userId: newUserId,
        name: extra?.businessName || `${name}'s Eatery`,
        description: `Freshly prepared ${extra?.cuisine || "delicious"} food.`,
        cuisine: extra?.cuisine || "Continental",
        image: "/images/burger.png",
        rating: 5.0,
        address: "Food Street Market, District 1",
        status: "pending", // Admins approve vendors
        createdAt: new Date().toISOString()
      };
      const updatedVendors = [...vendors, newVendor];
      persistVendors(updatedVendors);
      setCurrentVendor(newVendor);
    } 

    // If role is rider, register a rider profile
    else if (role === "rider") {
      const vType = (extra?.vehicleType || "motorcycle") as Rider["vehicleType"];
      const newRider: Rider = {
        id: "r-" + generateId(),
        userId: newUserId,
        name,
        phone,
        vehicleType: vType,
        status: "pending", // Admins approve riders
        isAvailable: true,
        createdAt: new Date().toISOString()
      };
      const updatedRiders = [...riders, newRider];
      persistRiders(updatedRiders);
      setCurrentRider(newRider);
    }

    setCurrentUser(newUser);
    localStorage.setItem("fd_session_user", JSON.stringify(newUser));

    // Ensure the backend has this user before attempting login to get the JWT
    const syncResult = await syncSave("USER_UPSERT", newUser);

    if (extra?.pin) {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newUser.email, pin: extra.pin })
        });
        const data = await response.json();
        if (data.success) {
          localStorage.setItem("fd_jwt_token", data.token);
        }
      } catch (e) {
        console.error("[register] Auto-login after registration failed:", e);
      }
    }

    if (!syncResult?.success) {
      return {
        success: true,
        warning: "Your account was created on this device, but we couldn't confirm it saved to the server. If you can't log in from another device, please try registering again.",
      };
    }

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentVendor(null);
    setCurrentRider(null);
    setCart([]);
    localStorage.removeItem("fd_session_user");
    localStorage.removeItem("fd_jwt_token"); // Clear JWT on logout
  };

  const switchRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const userRoles = currentUser.roles || [currentUser.role];
    if (!userRoles.includes(newRole)) {
      console.warn("User does not have role:", newRole);
      return;
    }
    const updated = { ...currentUser, role: newRole, roles: userRoles };
    setCurrentUser(updated);
    localStorage.setItem("fd_session_user", JSON.stringify(updated));

    if (newRole === "vendor") {
      const v = vendors.find(vend => vend.userId === currentUser.id);
      setCurrentVendor(v || null);
    } else if (newRole === "rider") {
      const r = riders.find(rid => rid.userId === currentUser.id);
      setCurrentRider(r || null);
    } else {
      setCurrentVendor(null);
      setCurrentRider(null);
    }
  };

  const applyForVendor = async (businessName: string, cuisine: string, extra?: { businessRegNo?: string; foodPermitNo?: string; verificationDoc?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Not logged in" };

    const existingV = vendors.find(v => v.userId === currentUser.id);
    if (existingV) {
      if (existingV.status === "approved") {
        return { success: false, error: "You are already an approved vendor." };
      } else if (existingV.status === "pending") {
        return { success: false, error: "Your vendor application is already pending approval." };
      }
    }

    const newVendor: Vendor = {
      id: "v-" + generateId(),
      userId: currentUser.id,
      name: businessName,
      description: `Freshly prepared ${cuisine} food.`,
      cuisine: cuisine,
      image: "/images/hero.png",
      rating: 5.0,
      address: "Food Street Market, District 1",
      status: "pending",
      createdAt: new Date().toISOString(),
      businessRegNo: extra?.businessRegNo,
      foodPermitNo: extra?.foodPermitNo,
      verificationDoc: extra?.verificationDoc,
    };

    // Individual VENDOR_UPSERT — not VENDORS_BULK, which requires admin auth
    // and silently rejected every real applicant's own submission.
    const result = await syncSave("VENDOR_UPSERT", newVendor);
    if (!result?.success) {
      console.error("[applyForVendor] Failed to submit vendor application:", result?.error);
      return { success: false, error: result?.error || "Failed to submit your application. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedVendor = result.vendor ? { ...newVendor, ...result.vendor } : newVendor;
    // Filter out previously rejected vendor profile to allow re-application
    const updatedVendors = vendors.filter(v => v.userId !== currentUser.id || v.status !== "rejected").concat(confirmedVendor);
    setVendors(updatedVendors);
    localStorage.setItem("fd_vendors", JSON.stringify(updatedVendors));

    addNotification(
      "admin",
      "New Vendor Application 🏪",
      `${currentUser.name} has submitted a vendor application for '${businessName}' (${cuisine}).`,
      "system"
    );

    return { success: true };
  };

  const applyForRider = async (vehicleType: "bicycle" | "motorcycle" | "car", extra?: { licenseNo?: string; plateNo?: string; nationalIdNo?: string; verificationDoc?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Not logged in" };

    const existingR = riders.find(r => r.userId === currentUser.id);
    if (existingR) {
      if (existingR.status === "approved") {
        return { success: false, error: "You are already an approved rider." };
      } else if (existingR.status === "pending") {
        return { success: false, error: "Your rider application is already pending approval." };
      }
    }

    const newRider: Rider = {
      id: "r-" + generateId(),
      userId: currentUser.id,
      name: currentUser.name,
      phone: currentUser.phone,
      vehicleType,
      status: "pending",
      isAvailable: true,
      createdAt: new Date().toISOString(),
      licenseNo: extra?.licenseNo,
      plateNo: extra?.plateNo,
      nationalIdNo: extra?.nationalIdNo,
      verificationDoc: extra?.verificationDoc,
    };

    // Individual RIDER_UPSERT — not RIDERS_BULK, which requires admin auth
    // and silently rejected every real applicant's own submission.
    const result = await syncSave("RIDER_UPSERT", newRider);
    if (!result?.success) {
      console.error("[applyForRider] Failed to submit rider application:", result?.error);
      return { success: false, error: result?.error || "Failed to submit your application. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedRider = result.rider ? { ...newRider, ...result.rider } : newRider;
    // Filter out previously rejected rider profile to allow re-application
    const updatedRiders = riders.filter(r => r.userId !== currentUser.id || r.status !== "rejected").concat(confirmedRider);
    setRiders(updatedRiders);
    localStorage.setItem("fd_riders", JSON.stringify(updatedRiders));

    addNotification(
      "admin",
      "New Rider Application 🚴",
      `${currentUser.name} has applied to become a rider using a ${vehicleType}.`,
      "system"
    );

    return { success: true };
  };

  // Helper designed for review to switch roles seamlessly
  const overrideUserRole = (role: UserRole) => {
    // Finds or creates a sample user for that role
    let targetUser = users.find(u => hasRole(u, role));
    if (!targetUser) {
      // Auto-creates a robust preset so developer has immediate access
      const id = `${role}-guest`;
      targetUser = {
        id,
        email: `${role}@gmail.com`,
        name: `Sample ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        phone: "+234 803 123 4567",
        role,
        roles: role === "customer" ? ["customer"] : ["customer", role],
        createdAt: new Date().toISOString()
      };
      persistUsers([...users, targetUser]);
    } else {
      // Ensure roles is initialized with at least customer and their current role
      const currentRoles = targetUser.roles || [targetUser.role];
      if (!currentRoles.includes("customer")) {
        currentRoles.unshift("customer");
      }
      if (!currentRoles.includes(role)) {
        currentRoles.push(role);
      }
      targetUser = {
        ...targetUser,
        roles: currentRoles
      };
      persistUsers(users.map(u => u.id === targetUser?.id ? targetUser! : u));
    }

    setCurrentUser(targetUser);
    localStorage.setItem("fd_session_user", JSON.stringify(targetUser));

    if (role === "vendor") {
      let v = vendors.find(vend => vend.userId === targetUser?.id);
      if (!v) {
        // Create sample approved vendor
        v = {
          id: "v-" + generateId(),
          userId: targetUser.id,
          name: "Spicy Dynasty Express",
          description: "Stir-fried delicacies, sizzling dim sums, and fiery noodle bowls.",
          cuisine: "Asian",
          image: "/images/jollof.png",
          rating: 4.7,
          address: "88 Wok St, Owode District",
          status: "approved",
          createdAt: new Date().toISOString()
        };
        persistVendors([...vendors, v]);
      }
      setCurrentVendor(v);
    } else if (role === "rider") {
      let r = riders.find(rid => rid.userId === targetUser?.id);
      if (!r) {
        r = {
          id: "r-" + generateId(),
          userId: targetUser.id,
          name: targetUser.name,
          phone: targetUser.phone,
          vehicleType: "bicycle",
          status: "approved",
          isAvailable: true,
          createdAt: new Date().toISOString()
        };
        persistRiders([...riders, r]);
      }
      setCurrentRider(r);
    }
  };

  const updateProfile = async (name: string, phone: string, gender?: string, profileImage?: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    const candidateUser = { ...currentUser, name, phone, gender, profileImage };

    const result = await syncSave("USER_UPSERT", candidateUser);
    if (!result?.success) {
      console.error("[updateProfile] Failed to update profile:", result?.error);
      return { success: false, error: result?.error || "Failed to save your changes. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    // (The server never returns the pin hash, so this merge can't clobber it.)
    const confirmedUser = result.user ? { ...candidateUser, ...result.user } : candidateUser;
    const updatedUsers = users.map(u => u.id === currentUser.id ? confirmedUser : u);
    setUsers(updatedUsers);
    localStorage.setItem("fd_users", JSON.stringify(updatedUsers));
    setCurrentUser(confirmedUser);
    localStorage.setItem("fd_session_user", JSON.stringify(confirmedUser));

    // Also sync the secondary user profiles if matching
    if (currentUser.role === "vendor") {
      // Do not overwrite Vendor Name
    } else if (currentUser.role === "rider") {
      const r = riders.find(rid => rid.userId === currentUser.id);
      if (r) {
        const updatedR = { ...r, name, phone };
        persistRiders(riders.map(item => item.id === r.id ? updatedR : item));
        setCurrentRider(updatedR);
      }
    }

    return { success: true };
  };

  const resetUserPin = async (userId: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return { success: false, error: "User not found" };
    const candidateUser = { ...targetUser, pin: newPin };

    const result = await syncSave("USER_UPSERT", candidateUser);
    if (!result?.success) {
      console.error("[resetUserPin] Failed to reset PIN:", result?.error);
      return { success: false, error: result?.error || "Failed to reset the PIN. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    // (The server never returns the pin hash, so this merge can't clobber it —
    // we intentionally keep our own locally-set newPin as the source of truth here.)
    const confirmedUser = result.user ? { ...candidateUser, ...result.user, pin: newPin } : candidateUser;
    const updatedUsers = users.map(u => u.id === userId ? confirmedUser : u);
    setUsers(updatedUsers);
    localStorage.setItem("fd_users", JSON.stringify(updatedUsers));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(confirmedUser);
      localStorage.setItem("fd_session_user", JSON.stringify(confirmedUser));
    }

    return { success: true };
  };

  // CART ACTIONS
  const addToCart = (product: Product, selectedAddons: Addon[] = []) => {
    const currentTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cart.length > 0 && cart[0].product.vendorId !== product.vendorId) {
      // Clear cart first if item belongs to a different vendor (standard food rule)
      const newItem: CartItem = {
        id: "cart-" + generateId(),
        product,
        quantity: 1,
        selectedAddons,
      };
      setCart([newItem]);
    } else {
      // Find if we have an item with the exact same product ID AND exact same selected addons
      const index = cart.findIndex(item => {
        if (item.product.id !== product.id) return false;
        const itemAddons = item.selectedAddons || [];
        if (itemAddons.length !== selectedAddons.length) return false;
        // Check that all selectedAddons are in itemAddons with exact same quantities
        const sSorted = [...selectedAddons].sort((a, b) => a.id.localeCompare(b.id));
        const iSorted = [...itemAddons].sort((a, b) => a.id.localeCompare(b.id));
        return sSorted.every((sa, i) => sa.id === iSorted[i].id && (sa.quantity || 1) === (iSorted[i].quantity || 1));
      });

      if (index > -1) {
        if (currentTotalQty + 1 > maxCartItems) {
          alert(`Maximum Order Limit Reached: A dispatch bike can convey a maximum of ${maxCartItems} items per order to guarantee safe transportation.`);
          return;
        }
        const newCart = [...cart];
        newCart[index].quantity += 1;
        setCart(newCart);
      } else {
        if (currentTotalQty + 1 > maxCartItems) {
          alert(`Maximum Order Limit Reached: A dispatch bike can convey a maximum of ${maxCartItems} items per order to guarantee safe transportation.`);
          return;
        }
        const newItem: CartItem = {
          id: "cart-" + generateId(),
          product,
          quantity: 1,
          selectedAddons,
        };
        setCart([...cart, newItem]);
      }
    }
  };

  const removeFromCart = (id: string) => {
    if (cart.some(item => item.id === id)) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      // Fallback: match by product.id
      setCart(cart.filter(item => item.product.id !== id));
    }
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    const itemToUpdate = cart.find(item => item.id === id) || cart.find(item => item.product.id === id);
    if (itemToUpdate) {
      const otherItemsQty = cart
        .filter(item => item.id !== itemToUpdate.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      const prospectiveTotalQty = otherItemsQty + quantity;
      
      if (prospectiveTotalQty > maxCartItems) {
        alert(`Maximum Order Limit Reached: A dispatch bike can convey a maximum of ${maxCartItems} items per order to guarantee safe transportation.`);
        return;
      }
    }

    if (cart.some(item => item.id === id)) {
      setCart(cart.map(item => item.id === id ? { ...item, quantity } : item));
    } else {
      // Fallback: match by product.id
      setCart(cart.map(item => item.product.id === id ? { ...item, quantity } : item));
    }
  };

  const clearCart = () => setCart([]);

  // CHECKOUT & CUSTOMER ACTIONS
  const placeOrder = async (deliveryAddress: string, paymentMethod: string, deliveryPhone?: string, receiptImage?: string, options?: { orderType?: "receipt_pickup"; vendorId?: string; receiptImageOrQr?: string; receiptNote?: string }): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    let activeUser = currentUser;
    if (!activeUser) {
      const savedSession = localStorage.getItem("fd_session_user");
      if (savedSession) {
        try {
          activeUser = JSON.parse(savedSession);
        } catch {}
      }
    }
    if (!activeUser) return { success: false, error: "Not logged in" };

    const isReceiptPickup = options?.orderType === "receipt_pickup";

    // A receipt-pickup order is proof of a purchase made *outside* the app
    // (an external receipt/QR code), so it legitimately has no cart items.
    // A normal order still requires a non-empty cart.
    if (!isReceiptPickup && cart.length === 0) return { success: false, error: "Your cart is empty" };

    let vendorObj: Vendor | undefined;
    if (isReceiptPickup) {
      vendorObj = vendors.find(v => v.id === options?.vendorId);
    } else {
      const firstProduct = cart[0].product;
      vendorObj = vendors.find(v => v.id === firstProduct.vendorId);
    }

    if (!vendorObj) {
      return { success: false, error: "Vendor not found" };
    }

    const total = cart.reduce((sum, item) => {
      const addonCost = (item.selectedAddons || []).reduce((acc, ad) => acc + ((ad.price ?? 0) * (ad.quantity ?? 1)), 0);
      return sum + ((item.product.price + addonCost) * item.quantity);
    }, 0);
    const tax = vatEnabled ? Math.round(total * (vatRate / 100)) : 0;
    const deliveryFee = calculateDeliveryFee(vendorObj.id, total, deliveryAddress, isReceiptPickup);
    const serviceFee = isReceiptPickup ? (receiptPickupConfig.flatServiceFee || 0) : calculateServiceFee(vendorObj.id, total);

    try {
      let token = localStorage.getItem("fd_jwt_token");
      
      // Auto-recover JWT for old sessions if PIN is available
      if (!token && activeUser?.pin && activeUser?.email) {
        try {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: activeUser.email, pin: activeUser.pin })
          });
          const loginData = await loginRes.json();
          if (loginData.success) {
            token = loginData.token;
            localStorage.setItem("fd_jwt_token", token);
          }
        } catch (e) {
          console.error("[checkout] Auto-recover token failed:", e);
        }
      }

      if (!token) {
        alert("Your session does not have a secure token. Please log out completely and log back in to refresh your session.");
        return { success: false, error: "No auth token" };
      }

      const headers: any = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["X-Auth-Token"] = token;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerId: activeUser.id,
          customerName: activeUser.name,
          customerPhone: deliveryPhone || activeUser.phone || "N/A",
          vendorId: vendorObj.id,
          vendorName: vendorObj.name,
          deliveryAddress,
          paymentMethod,
          serviceFee,
          deliveryFee,
          tax,
          orderType: options?.orderType,
          receiptImage,
          receiptImageOrQr: options?.receiptImageOrQr,
          receiptNote: options?.receiptNote,
          items: isReceiptPickup ? [] : cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            selectedAddons: item.selectedAddons
          }))
        })
      });

      const data = await res.json();
      if (!data.success || res.status === 401 || res.status === 403) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("fd_jwt_token");
          alert(data.error + "\n\nYour secure session has expired or is invalid. Please log out and log back in to get a fresh token.");
        } else {
          alert(data.error || "Checkout failed");
        }
        return { success: false, error: data.error || "Checkout failed" };
      }

      clearCart();

      // Trigger role-based notifications
      addNotification(
        activeUser.id,
        "Order Placed Successfully! 🍲",
        `Your order #${data.orderId} with ${vendorObj.name} has been placed.`,
        "order",
        data.orderId
      );

      addNotification(
        vendorObj.userId,
        "New Order Received! 🔔",
        `You have received a new order #${data.orderId} from ${activeUser.name}.`,
        "system",
        data.orderId
      );

      const allAdmins = users.filter(u => u.roles?.includes("admin") || u.roles?.includes("super_admin"));
      allAdmins.forEach(admin => {
        addNotification(
          admin.id,
          "New Order Alert 🚀",
          `Order #${data.orderId} was just placed at ${vendorObj.name}.`,
          "system",
          data.orderId
        );
      });

      // Create local order object for immediate UI update
      const newOrder: Order = {
        id: data.orderId,
        customerId: activeUser.id,
        customerName: activeUser.name,
        customerPhone: deliveryPhone || activeUser.phone || "N/A",
        vendorId: vendorObj.id,
        vendorName: vendorObj.name,
        status: isReceiptPickup && (paymentMethod === "bank_transfer" || paymentMethod?.toLowerCase().includes("bank transfer")) ? "awaiting_payment_verification" : "pending",
        totalAmount: data.finalTotal || total,
        deliveryAddress,
        paymentMethod,
        createdAt: new Date().toISOString(),
        serviceFee,
        deliveryFee,
        tax,
        orderType: options?.orderType,
        paymentReceiptUrl: receiptImage,
        receiptImageOrQr: options?.receiptImageOrQr,
        receiptNote: options?.receiptNote,
        items: isReceiptPickup ? [] : cart.map(item => ({
          id: "oi-" + generateId(),
          orderId: data.orderId,
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        }))
      };
      
      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      // We don't call persistOrders because the server already saved it.

      return { success: true, orderId: data.orderId };
    } catch (error) {
      console.error("Checkout error:", error);
      return { success: false, error: "Checkout failed" };
    }
  };

  const addReview = async (vendorId: string, rating: number, comment: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Not logged in" };

    const newReview: Review = {
      id: "rev-" + generateId(),
      vendorId,
      customerId: currentUser.id,
      author: currentUser.name || "Anonymous",
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    const result = await syncSave("REVIEW_UPSERT", newReview);
    if (!result?.success) {
      console.error("[addReview] Failed to save review:", result?.error);
      return { success: false, error: result?.error || "Failed to submit your review. Please check your connection and try again." };
    }

    // 1. Persist the review locally now that the server has confirmed it.
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem("fd_reviews", JSON.stringify(updatedReviews));

    // 2. Use the vendor's average rating exactly as the server computed and
    // persisted it — the server recalculates this itself as part of saving
    // the review (a customer isn't authorized to directly upsert a vendor
    // record, so a separate client-side VENDOR_UPSERT call here would only
    // ever be rejected).
    if (typeof result.vendorRating === "number") {
      const updatedVendors = vendors.map(v =>
        v.id === vendorId ? { ...v, rating: result.vendorRating } : v
      );
      setVendors(updatedVendors);
      localStorage.setItem("fd_vendors", JSON.stringify(updatedVendors));
    }

    return { success: true };
  };

  // NOTIFICATION ACTIONS
  const addNotification = (userId: string, title: string, message: string, type: AppNotification["type"], relatedId?: string) => {
    const newNotif: AppNotification = {
      id: "notif-" + generateId(),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      relatedId
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Persist to the server so the intended recipient actually sees this on
    // their own device/session — previously this only ever updated the
    // current browser's local state, so nobody but the person who triggered
    // it ever saw it. This is deliberately fire-and-forget (not awaited by
    // callers) since a missed notification isn't as critical as a missed
    // order or payment, and addNotification is called from dozens of
    // places throughout the app that shouldn't all need to become async.
    syncSave("NOTIFICATION_CREATE", newNotif).then(result => {
      if (!result?.success) {
        console.error("[addNotification] Failed to persist notification to server:", result?.error);
      }
    });
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = (userId: string) => {
    setNotifications(prev => prev.map(n => n.userId === userId || userId === "all" ? { ...n, read: true } : n));
  };

  const clearAllNotifications = (userId: string) => {
    setNotifications(prev => prev.filter(n => n.userId !== userId && userId !== "all"));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // WALLET SYSTEM MANAGEMENT ACTIONS
  const getUserWalletBalance = (userId: string) => {
    return userBalances[userId] || 0;
  };

  const updateUserWalletBalance = (userId: string, amount: number, type: WalletTransaction["type"], note?: string) => {
    setUserBalances(prev => {
      const current = prev[userId] || 0;
      const next = current + amount;
      return { ...prev, [userId]: Math.max(0, next) };
    });

    const userObj = users.find(u => u.id === userId);
    const userName = userObj ? userObj.name : "System User";
    const newTx: WalletTransaction = {
      id: "tx-" + generateId(),
      userId,
      userName,
      amount,
      type,
      note: note || `${type.charAt(0).toUpperCase() + type.slice(1)} transaction`,
      createdAt: new Date().toISOString()
    };
    setWalletTransactions(prev => [newTx, ...prev]);

    // Role-specific wallet notification
    const direction = amount >= 0 ? "credited with" : "debited by";
    const absAmount = Math.abs(amount);
    addNotification(
      userId,
      amount >= 0 ? "Wallet Credited! 💰" : "Wallet Debited 💸",
      `Your wallet balance has been ${direction} ${currency}${absAmount.toLocaleString()}. Note: ${note || 'System adjustment'}.`,
      "wallet"
    );
  };

  const updateWalletFundingModes = (bankTransfer: boolean, monnify: boolean, paystack: boolean) => {
    setWalletFundingBankTransferEnabled(bankTransfer);
    setWalletFundingMonnifyEnabled(monnify);
    setWalletFundingPaystackEnabled(paystack);
    try {
      localStorage.setItem("fd_funding_bank_transfer", String(bankTransfer));
      localStorage.setItem("fd_funding_monnify", String(monnify));
      localStorage.setItem("fd_funding_paystack", String(paystack));
      syncSave("SYSTEM_SETTING_UPSERT", { key: "walletFundingBankTransferEnabled", value: String(bankTransfer) });
      syncSave("SYSTEM_SETTING_UPSERT", { key: "walletFundingMonnifyEnabled", value: String(monnify) });
      syncSave("SYSTEM_SETTING_UPSERT", { key: "walletFundingPaystackEnabled", value: String(paystack) });
    } catch (e) {
      console.error(e);
    }
  };

  const requestWalletFunding = async (userId: string, amount: number, gateway: "bank_transfer" | "monnify" | "paystack", reference?: string) => {
    const userObj = users.find(u => u.id === userId);
    const userName = userObj ? userObj.name : "System User";
    
    try {
      const token = localStorage.getItem("fd_jwt_token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["X-Auth-Token"] = token;
      }

      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId, userName, amount, gateway, reference: reference || `OWD-TX-${Math.floor(100000 + Math.random() * 900000)}` })
      });
      const data = await res.json();
      
      if (!data.success) {
        alert(data.error || "Funding request failed");
        return "";
      }

      const txId = data.transactionId;
      const isInstant = gateway === "paystack" || gateway === "monnify";
      const status = isInstant ? "approved" as const : "pending" as const;

      const newTx: WalletTransaction = {
        id: txId,
        userId,
        userName,
        amount,
        type: "deposit",
        note: `Wallet recharge via ${gateway === "bank_transfer" ? "Local Bank Transfer" : gateway === "paystack" ? "Paystack Gateway" : "Monnify Gateway"}`,
        createdAt: new Date().toISOString(),
        status,
        gateway,
        reference: reference || `OWD-TX-${Math.floor(100000 + Math.random() * 900000)}`
      };

      setWalletTransactions(prev => [newTx, ...prev]);

      if (isInstant) {
        setUserBalances(prev => {
          const current = prev[userId] || 0;
          return { ...prev, [userId]: current + amount };
        });

        addNotification(
          userId,
          "Wallet Funded! 💰",
          `Your wallet balance has been credited with ${currency}${amount.toLocaleString()} via ${gateway === "paystack" ? "Paystack" : "Monnify"}.`,
          "wallet"
        );
      } else {
        addNotification(
          "admin-1",
          "Pending Wallet Funding Request ⏳",
          `User ${userName} submitted a wallet funding request of ${currency}${amount.toLocaleString()} via Bank Transfer. Reference: ${newTx.reference}. Approval required!`,
          "wallet",
          txId
        );
        addNotification(
          "admin",
          "New Funding Request 💰",
          `User ${userName} submitted a wallet funding request of ${currency}${amount.toLocaleString()} via Bank Transfer.`,
          "wallet"
        );
      }

      return txId;
    } catch (error) {
      console.error("Wallet funding failed:", error);
      return "";
    }
  };

  const approveWalletFunding = (transactionId: string) => {
    setWalletTransactions(prev => {
      const targetTx = prev.find(t => t.id === transactionId);
      if (!targetTx || targetTx.status !== "pending") return prev;

      const userId = targetTx.userId;
      const amount = targetTx.amount;

      // Credit balance
      setUserBalances(curr => {
        const current = curr[userId] || 0;
        return { ...curr, [userId]: current + amount };
      });

      // Notify user
      addNotification(
        userId,
        "Wallet Credited! 💰",
        `Your wallet funding request of ${currency}${amount.toLocaleString()} has been APPROVED and credited to your available balance!`,
        "wallet"
      );

      // Notify admin
      addNotification(
        "admin",
        "Funding Request Approved ✅",
        `Funding request ${targetTx.reference} for ${targetTx.userName} (${currency}${amount.toLocaleString()}) has been approved.`,
        "wallet"
      );

      return prev.map(t => t.id === transactionId ? { ...t, status: "approved" as const } : t);
    });
  };

  const declineWalletFunding = (transactionId: string) => {
    setWalletTransactions(prev => {
      const targetTx = prev.find(t => t.id === transactionId);
      if (!targetTx || targetTx.status !== "pending") return prev;

      const userId = targetTx.userId;
      const amount = targetTx.amount;

      // Notify user
      addNotification(
        userId,
        "Wallet Funding Declined ❌",
        `Your wallet funding request of ${currency}${amount.toLocaleString()} has been declined. Please contact support if this is an error.`,
        "wallet"
      );

      // Notify admin
      addNotification(
        "admin",
        "Funding Request Declined ❌",
        `Funding request ${targetTx.reference} for ${targetTx.userName} (${currency}${amount.toLocaleString()}) was declined.`,
        "wallet"
      );

      return prev.map(t => t.id === transactionId ? { ...t, status: "declined" as const } : t);
    });
  };

  // VENDOR ACTIONS
  const updateVendorOrder = async (
    orderId: string,
    status: OrderStatus,
    extra?: { verifiedBy?: string; verifiedAt?: string; rejectedBy?: string; rejectedAt?: string; rejectionReason?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return { success: false, error: "Order not found" };

    const candidateOrder = { ...orderToUpdate, status, ...extra };

    const result = await syncSave("ORDER_UPSERT", candidateOrder);
    if (!result?.success) {
      console.error(`[updateVendorOrder] Failed to update order ${orderId}:`, result?.error);
      return { success: false, error: result?.error || "Failed to update the order. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedOrder = result.order ? { ...orderToUpdate, ...result.order } : candidateOrder;
    const updatedOrders = orders.map(o => (o.id === orderId ? confirmedOrder : o));
    setOrders(updatedOrders);
    localStorage.setItem("fd_orders", JSON.stringify(updatedOrders));

    // Notify Customer about status change
    let statusText = status as string;
    if (status === "preparing") statusText = "is being prepared 🍳";
    else if (status === "ready") statusText = "is ready for delivery! 📦";
    else if (status === "delivered") statusText = "has been completed! 🎉";
    else if (status === "cancelled") statusText = "has been cancelled. ❌";

    addNotification(
      orderToUpdate.customerId,
      `Order Update: ${orderToUpdate.vendorName}`,
      `Your order #${orderId} from ${orderToUpdate.vendorName} ${statusText}.`,
      "order",
      orderId
    );

    // Notify Admin about status change
    addNotification(
      "admin-1",
      `Order #${orderId} Updated`,
      `Order #${orderId} status has been updated to ${status} by ${orderToUpdate.vendorName}.`,
      "order",
      orderId
    );

    return { success: true };
  };

  const addProduct = async (product: Omit<Product, "id" | "createdAt">): Promise<{ success: boolean; error?: string }> => {
    const newProduct: Product = {
      ...product,
      id: "p-" + generateId(),
      createdAt: new Date().toISOString()
    };

    const result = await syncSave("PRODUCT_UPSERT", newProduct);
    if (!result?.success) {
      console.error("[addProduct] Failed to add product:", result?.error);
      return { success: false, error: result?.error || "Failed to add the product. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedProduct = result.product ? { ...newProduct, ...result.product } : newProduct;
    const newProducts = [...products, confirmedProduct];
    setProducts(newProducts);
    localStorage.setItem("fd_products", JSON.stringify(newProducts));

    return { success: true };
  };

  const updateProduct = async (updatedProduct: Product): Promise<{ success: boolean; error?: string }> => {
    const result = await syncSave("PRODUCT_UPSERT", updatedProduct);
    if (!result?.success) {
      console.error("[updateProduct] Failed to update product:", result?.error);
      return { success: false, error: result?.error || "Failed to save the product. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedProduct = result.product ? { ...updatedProduct, ...result.product } : updatedProduct;
    const newProducts = products.map(p => p.id === confirmedProduct.id ? confirmedProduct : p);
    setProducts(newProducts);
    localStorage.setItem("fd_products", JSON.stringify(newProducts));

    return { success: true };
  };

  const deleteProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await syncSave("PRODUCT_DELETE", { id: productId });
    if (!result?.success) {
      console.error("[deleteProduct] Failed to delete product:", result?.error);
      return { success: false, error: result?.error || "Failed to delete the product. Please check your connection and try again." };
    }

    const newProducts = products.filter(p => p.id !== productId);
    setProducts(newProducts);
    localStorage.setItem("fd_products", JSON.stringify(newProducts));

    return { success: true };
  };

  const updateVendorProfile = async (profileData: Partial<Vendor>): Promise<{ success: boolean; error?: string }> => {
    if (!currentVendor) return { success: false, error: "No vendor profile found" };
    const candidateVendor = { ...currentVendor, ...profileData };

    const result = await syncSave("VENDOR_UPSERT", candidateVendor);
    if (!result?.success) {
      console.error("[updateVendorProfile] Failed to update vendor profile:", result?.error);
      return { success: false, error: result?.error || "Failed to save your changes. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedVendor = result.vendor ? { ...currentVendor, ...result.vendor } : candidateVendor;
    const updatedVendors = vendors.map(v => v.id === currentVendor.id ? confirmedVendor : v);
    setVendors(updatedVendors);
    localStorage.setItem("fd_vendors", JSON.stringify(updatedVendors));
    setCurrentVendor(confirmedVendor);

    return { success: true };
  };

  // RIDER ACTIONS
  const acceptDelivery = async (orderId: string, riderId: string): Promise<{ success: boolean; error?: string }> => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return { success: false, error: "Rider not found" };

    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return { success: false, error: "Order not found" };

    const candidateOrder = {
      ...orderToUpdate,
      riderId,
      riderName: rider.name,
      status: "out_for_delivery" as OrderStatus,
    };

    const result = await syncSave("ORDER_UPSERT", candidateOrder);
    if (!result?.success) {
      console.error(`[acceptDelivery] Failed to assign rider to order ${orderId}:`, result?.error);
      return { success: false, error: result?.error || "Failed to accept the delivery. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedOrder = result.order ? { ...orderToUpdate, ...result.order } : candidateOrder;
    const updatedOrders = orders.map(o => (o.id === orderId ? confirmedOrder : o));
    setOrders(updatedOrders);
    localStorage.setItem("fd_orders", JSON.stringify(updatedOrders));

    // Trigger customer notification
    addNotification(
      orderToUpdate.customerId,
      "Rider Assigned! 🚴",
      `Rider ${rider.name} has accepted your order #${orderId} and is out for delivery!`,
      "delivery",
      orderId
    );

    // Notify vendor as well
    const vendorObj = vendors.find(v => v.id === orderToUpdate.vendorId);
    if (vendorObj && vendorObj.userId) {
      addNotification(
        vendorObj.userId,
        "Rider Assigned to Delivery 🚴",
        `Rider ${rider.name} has accepted order #${orderId} for delivery.`,
        "delivery",
        orderId
      );
    }

    // Notify Admin
    addNotification(
      "admin-1",
      "Rider Assigned to Order",
      `Rider ${rider.name} has accepted delivery for order #${orderId}.`,
      "delivery",
      orderId
    );

    return { success: true };
  };

  const updateDeliveryStatus = async (orderId: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return { success: false, error: "Order not found" };

    const candidateOrder = { ...orderToUpdate, status };

    const result = await syncSave("ORDER_UPSERT", candidateOrder);
    if (!result?.success) {
      console.error(`[updateDeliveryStatus] Failed to update order ${orderId}:`, result?.error);
      return { success: false, error: result?.error || "Failed to update the delivery status. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedOrder = result.order ? { ...orderToUpdate, ...result.order } : candidateOrder;
    const updatedOrders = orders.map(o => (o.id === orderId ? confirmedOrder : o));
    setOrders(updatedOrders);
    localStorage.setItem("fd_orders", JSON.stringify(updatedOrders));

    if (status === "delivered") {
      // Notify customer
      addNotification(
        orderToUpdate.customerId,
        "Order Delivered! 🍲🎉",
        `Your order #${orderId} from ${orderToUpdate.vendorName} has been delivered. Enjoy your meal!`,
        "delivery",
        orderId
      );
      // Notify vendor
      const vObj = vendors.find(v => v.id === orderToUpdate.vendorId);
      if (vObj && vObj.userId) {
        addNotification(
          vObj.userId,
          "Delivery Confirmed! 💸",
          `Order #${orderId} has been successfully delivered by ${orderToUpdate.riderName || 'Rider'}. Payout processed.`,
          "delivery",
          orderId
        );
      }
      // Notify Admin
      addNotification(
        "admin-1",
        "Order Completed",
        `Order #${orderId} from ${orderToUpdate.vendorName} has been successfully delivered by ${orderToUpdate.riderName || 'Rider'}.`,
        "delivery",
        orderId
      );
    } else {
      // General status update
      addNotification(
        orderToUpdate.customerId,
        "Delivery Status Update",
        `Your delivery for order #${orderId} is now: ${status.replace(/_/g, " ")}.`,
        "delivery",
        orderId
      );
    }

    return { success: true };
  };

  const updateOrderPayoutStatus = async (orderId: string, type: "rider" | "vendor", status: "pending" | "paid"): Promise<{ success: boolean; error?: string }> => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return { success: false, error: "Order not found" };

    const candidateOrder = type === "rider"
      ? { ...orderToUpdate, riderPayoutStatus: status }
      : { ...orderToUpdate, vendorPayoutStatus: status };

    const result = await syncSave("ORDER_UPSERT", candidateOrder);
    if (!result?.success) {
      console.error(`[updateOrderPayoutStatus] Failed to update ${type} payout for order ${orderId}:`, result?.error);
      return { success: false, error: result?.error || "Failed to update the payout status. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedOrder = result.order ? { ...orderToUpdate, ...result.order } : candidateOrder;
    const updatedOrders = orders.map(o => (o.id === orderId ? confirmedOrder : o));
    setOrders(updatedOrders);
    localStorage.setItem("fd_orders", JSON.stringify(updatedOrders));

    return { success: true };
  };

  const updateRiderProfile = async (profileData: Partial<Rider>): Promise<{ success: boolean; error?: string }> => {
    if (!currentRider) return { success: false, error: "No rider profile found" };
    const candidateRider = { ...currentRider, ...profileData };

    const result = await syncSave("RIDER_UPSERT", candidateRider);
    if (!result?.success) {
      console.error("[updateRiderProfile] Failed to update rider profile:", result?.error);
      return { success: false, error: result?.error || "Failed to save your changes. Please check your connection and try again." };
    }

    // Trust what the server actually confirmed/saved over our own optimistic copy.
    const confirmedRider = result.rider ? { ...currentRider, ...result.rider } : candidateRider;
    const updatedRiders = riders.map(r => r.id === currentRider.id ? confirmedRider : r);
    setRiders(updatedRiders);
    localStorage.setItem("fd_riders", JSON.stringify(updatedRiders));
    setCurrentRider(confirmedRider);

    return { success: true };
  };

  // ADMIN ACTIONS
  const toggleVendorStatus = (vendorId: string, status: Vendor["status"]) => {
    const updatedVendors = vendors.map(v => v.id === vendorId ? { ...v, status } : v);
    persistVendors(updatedVendors);

    if (status === "approved") {
      const vendorObj = vendors.find(v => v.id === vendorId);
      if (vendorObj && vendorObj.userId) {
        const updatedUsers = users.map(u => {
          if (u.id === vendorObj.userId) {
            const currentRoles = u.roles || [u.role];
            const updatedRoles = currentRoles.includes("vendor") ? currentRoles : [...currentRoles, "vendor" as UserRole];
            const updatedUser = { ...u, roles: updatedRoles };
            if (currentUser && currentUser.id === u.id) {
              const updatedSession = { ...currentUser, roles: updatedRoles };
              setCurrentUser(updatedSession);
              localStorage.setItem("fd_session_user", JSON.stringify(updatedSession));
            }
            return updatedUser;
          }
          return u;
        });
        persistUsers(updatedUsers);

        addNotification(
          vendorObj.userId,
          "Vendor Account Approved! 🏪🎉",
          `Congratulations! Your vendor profile for '${vendorObj.name}' has been approved. You can now switch to the Vendor dashboard!`,
          "system"
        );
      }
    }
  };

  const toggleRiderStatus = (riderId: string, status: Rider["status"]) => {
    const updatedRiders = riders.map(r => r.id === riderId ? { ...r, status } : r);
    persistRiders(updatedRiders);

    if (status === "approved") {
      const riderObj = riders.find(r => r.id === riderId);
      if (riderObj && riderObj.userId) {
        const updatedUsers = users.map(u => {
          if (u.id === riderObj.userId) {
            const currentRoles = u.roles || [u.role];
            const updatedRoles = currentRoles.includes("rider") ? currentRoles : [...currentRoles, "rider" as UserRole];
            const updatedUser = { ...u, roles: updatedRoles };
            if (currentUser && currentUser.id === u.id) {
              const updatedSession = { ...currentUser, roles: updatedRoles };
              setCurrentUser(updatedSession);
              localStorage.setItem("fd_session_user", JSON.stringify(updatedSession));
            }
            return updatedUser;
          }
          return u;
        });
        persistUsers(updatedUsers);

        addNotification(
          riderObj.userId,
          "Rider Account Approved! 🚴🎉",
          `Congratulations! Your rider profile has been approved. You can now switch to the Rider dashboard!`,
          "system"
        );
      }
    }
  };

  const deleteUser = (userId: string) => {
    persistUsers(users.filter(u => u.id !== userId));
    // Also remove related assets
    persistVendors(vendors.filter(v => v.userId !== userId));
    persistRiders(riders.filter(r => r.userId !== userId));
  };

  const adminUpdateVendor = (vendorId: string, updatedFields: Partial<Vendor>) => {
    persistVendors(vendors.map(v => v.id === vendorId ? { ...v, ...updatedFields } : v));
  };

  const adminCreateOrder = (order: Order) => {
    persistOrders([order, ...orders]);
  };

  const adminCreateUser = (
    name: string,
    email: string,
    phone: string,
    role: UserRole,
    extra?: { businessName?: string; cuisine?: string; vehicleType?: string; pin?: string; roles?: UserRole[] }
  ) => {
    const cleansedEmail = email.trim().toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === cleansedEmail);
    if (exists) {
      return { success: false, error: "An account with this email already exists." };
    }

    const newUserId = generateId();
    const userRoles = extra?.roles || [role];
    if (!userRoles.includes("customer")) {
      userRoles.unshift("customer");
    }
    const newUser: User = {
      id: newUserId,
      email: cleansedEmail,
      name,
      phone,
      role: userRoles.includes(role) ? role : (userRoles[userRoles.length - 1] || "customer"),
      roles: userRoles,
      pin: extra?.pin || "1234",
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    persistUsers(updatedUsers);

    // If roles list includes employee, register an employee profile as well
    if (userRoles.includes("employee")) {
      const newEmp: Employee = {
        id: newUserId,
        name: name,
        email: cleansedEmail,
        phone: phone,
        department: "support",
        status: "active",
        permissions: ["manage_orders"],
        createdAt: new Date().toISOString()
      };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      localStorage.setItem("fd_employees", JSON.stringify(updated));
      syncSave("EMPLOYEES_BULK", updated);
    }

    // If roles list includes vendor, register a vendor profile as well
    if (userRoles.includes("vendor")) {
      const newVendor: Vendor = {
        id: "v-" + generateId(),
        userId: newUserId,
        name: extra?.businessName || `${name}'s Eatery`,
        description: `Freshly prepared ${extra?.cuisine || "delicious"} food.`,
        cuisine: "N/A", // Deprecated field
        category: extra?.cuisine || "restaurant",
        image: "/images/chicken.png",
        rating: 5.0,
        address: "Food Street Market, District 1",
        status: "approved",
        createdAt: new Date().toISOString()
      };
      const updatedVendors = [...vendors, newVendor];
      persistVendors(updatedVendors);
    } 

    // If roles list includes rider, register a rider profile
    if (userRoles.includes("rider")) {
      const vType = (extra?.vehicleType || "motorcycle") as Rider["vehicleType"];
      const newRider: Rider = {
        id: "r-" + generateId(),
        userId: newUserId,
        name,
        phone,
        vehicleType: vType,
        status: "approved",
        isAvailable: true,
        createdAt: new Date().toISOString()
      };
      const updatedRiders = [...riders, newRider];
      persistRiders(updatedRiders);
    }

    return { success: true };
  };

  const adminUpdateUserRole = (userId: string, role: UserRole) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const currentRoles = u.roles || [u.role];
        const updatedRoles = currentRoles.includes(role) ? currentRoles : [...currentRoles, role];
        const updatedUser = { ...u, role, roles: updatedRoles };
        if (currentUser && currentUser.id === userId) {
          const updatedSession = { ...currentUser, role, roles: updatedRoles };
          setCurrentUser(updatedSession);
          localStorage.setItem("fd_session_user", JSON.stringify(updatedSession));
        }
        return updatedUser;
      }
      return u;
    });
    persistUsers(updatedUsers);

    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      if (role === "vendor" && !vendors.some(v => v.userId === userId)) {
        const newVendor: Vendor = {
          id: "v-" + generateId(),
          userId,
          name: `${targetUser.name}'s Eatery`,
          description: "Premium platform vendor.",
          cuisine: "N/A", // Deprecated field
          category: "restaurant",
          image: "/images/pizza.png",
          rating: 5.0,
          address: "Kwara Delivery Zone",
          status: "approved",
          createdAt: new Date().toISOString()
        };
        persistVendors([...vendors, newVendor]);
      } else if (role === "rider" && !riders.some(r => r.userId === userId)) {
        const newRider: Rider = {
          id: "r-" + generateId(),
          userId,
          name: targetUser.name,
          phone: targetUser.phone,
          vehicleType: "motorcycle",
          status: "approved",
          isAvailable: true,
          createdAt: new Date().toISOString()
        };
        persistRiders([...riders, newRider]);
      } else if (role === "employee" && !employees.some(emp => emp.id === userId)) {
        const newEmp: Employee = {
          id: userId,
          name: targetUser.name,
          email: targetUser.email,
          phone: targetUser.phone,
          department: "support",
          status: "active",
          permissions: ["manage_orders"],
          createdAt: new Date().toISOString()
        };
        const updated = [...employees, newEmp];
        setEmployees(updated);
        localStorage.setItem("fd_employees", JSON.stringify(updated));
        syncSave("EMPLOYEES_BULK", updated);
      }
    }
  };

  const adminUpdateUser = (
    userId: string,
    fields: { name: string; email: string; phone: string; role: UserRole; pin?: string; roles?: UserRole[] },
    extra?: { businessName?: string; cuisine?: string; vehicleType?: Rider["vehicleType"] }
  ) => {
    const cleansedEmail = fields.email.trim().toLowerCase();
    const otherExists = users.some(u => u.id !== userId && u.email.toLowerCase() === cleansedEmail);
    if (otherExists) {
      return { success: false, error: "An account with this email already exists." };
    }

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const updatedRoles = fields.roles || u.roles || [fields.role];
        if (!updatedRoles.includes("customer")) {
          updatedRoles.unshift("customer");
        }
        const activeRole = updatedRoles.includes(fields.role) ? fields.role : (updatedRoles[updatedRoles.length - 1] || "customer");
        const updatedUser = {
          ...u,
          name: fields.name.trim(),
          email: cleansedEmail,
          phone: fields.phone.trim(),
          role: activeRole,
          roles: updatedRoles,
          pin: fields.pin !== undefined ? fields.pin : u.pin
        };
        if (currentUser && currentUser.id === userId) {
          const keepCurrentRole = updatedRoles.includes(currentUser.role);
          const newSessionRole = keepCurrentRole ? currentUser.role : activeRole;
          const updatedSession = { ...currentUser, ...updatedUser, role: newSessionRole };
          setCurrentUser(updatedSession);
          localStorage.setItem("fd_session_user", JSON.stringify(updatedSession));
        }
        return updatedUser;
      }
      return u;
    });

    persistUsers(updatedUsers);

    const targetRoles = fields.roles || [fields.role];
    if (!targetRoles.includes("customer")) {
      targetRoles.unshift("customer");
    }

    // If role includes vendor, onboard them automatically if they don't exist, OR update if they do
    if (targetRoles.includes("vendor")) {
      const existingVendor = vendors.find(v => v.userId === userId);
      if (!existingVendor) {
        const newVendor: Vendor = {
          id: "v-" + generateId(),
          userId,
          name: extra?.businessName || `${fields.name.trim()}'s Eatery`,
          description: `Premium platform vendor serving ${extra?.cuisine || "delicious"} food.`,
          cuisine: "N/A", // Deprecated field
          category: extra?.cuisine || "restaurant",
          image: "/images/burger.png",
          rating: 5.0,
          address: "Kwara Delivery Zone",
          status: "approved",
          createdAt: new Date().toISOString()
        };
        persistVendors([...vendors, newVendor]);
      } else if (extra?.businessName || extra?.cuisine) {
        // Update existing vendor if admin provided new details
        const updatedVendor = {
          ...existingVendor,
          name: extra.businessName || existingVendor.name,
          category: extra.cuisine || existingVendor.category
        };
        persistVendors(vendors.map(v => v.id === existingVendor.id ? updatedVendor : v));
      }
    }
    
    if (targetRoles.includes("rider") && !riders.some(r => r.userId === userId)) {
      const newRider: Rider = {
        id: "r-" + generateId(),
        userId,
        name: fields.name.trim(),
        phone: fields.phone.trim(),
        vehicleType: extra?.vehicleType || "motorcycle",
        status: "approved",
        isAvailable: true,
        createdAt: new Date().toISOString()
      };
      persistRiders([...riders, newRider]);
    }

    // If roles include employee, onboard them automatically if they don't exist
    if (targetRoles.includes("employee") && !employees.some(emp => emp.id === userId)) {
      const newEmp: Employee = {
        id: userId,
        name: fields.name.trim(),
        email: cleansedEmail,
        phone: fields.phone.trim(),
        department: "support",
        status: "active",
        permissions: ["manage_orders"],
        createdAt: new Date().toISOString()
      };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      localStorage.setItem("fd_employees", JSON.stringify(updated));
      syncSave("EMPLOYEES_BULK", updated);
    } else if (employees.some(emp => emp.id === userId)) {
      // Sync or remove
      if (!targetRoles.includes("employee")) {
        // Remove employee
        const updated = employees.filter(emp => emp.id !== userId);
        setEmployees(updated);
        localStorage.setItem("fd_employees", JSON.stringify(updated));
        syncSave("EMPLOYEES_BULK", updated);
      } else {
        // Sync profile fields
        const updated = employees.map(emp => emp.id === userId ? {
          ...emp,
          name: fields.name.trim(),
          email: cleansedEmail,
          phone: fields.phone.trim()
        } : emp);
        setEmployees(updated);
        localStorage.setItem("fd_employees", JSON.stringify(updated));
        syncSave("EMPLOYEES_BULK", updated);
      }
    }

    return { success: true };
  };

  // --- RECEIPT PICKUP & DELIVERY FUNCTIONS ---
  const createReceiptPickupOrder = (orderData: Omit<ReceiptPickupOrder, "id" | "riderId" | "riderName" | "status" | "paymentStatus" | "createdAt">) => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    
    // Auto-approve if standard method, else pending
    const status = orderData.paymentMethod === "cash" || orderData.paymentMethod === "wallet" 
      ? "pending" 
      : "pending";

    // Deduct from wallet if wallet
    if (orderData.paymentMethod === "wallet") {
      const bal = getUserWalletBalance(currentUser.id);
      const totalAmount = orderData.deliveryFee + receiptPickupConfig.flatServiceFee;
      if (bal < totalAmount) {
        return { success: false, error: "Insufficient wallet balance" };
      }
      updateUserWalletBalance(
        currentUser.id,
        -totalAmount,
        "purchase",
        `Payment for receipt pickup from ${orderData.vendorName}`
      );
    }

    const newOrder: ReceiptPickupOrder = {
      ...orderData,
      id: "owf-rp-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      status: "awaiting_admin_verification",
      paymentStatus: orderData.paymentMethod === "wallet" ? "paid" : "unpaid",
      createdAt: new Date().toISOString()
    };

    const nextOrders = [newOrder, ...receiptPickupOrders];
    setReceiptPickupOrders(nextOrders);
    localStorage.setItem("fd_receipt_pickup_orders", JSON.stringify(nextOrders));
    syncSave("RECEIPT_PICKUP_UPSERT", newOrder);

    addNotification(
      "admin",
      "New Receipt Pickup & Delivery Request",
      `${orderData.customerName} requested pickup from ${orderData.vendorName} for delivery to ${orderData.deliveryAddress}.`,
      "delivery",
      newOrder.id
    );

    addNotification(
      orderData.vendorId,
      "Receipt Pickup Scheduled",
      `A customer (${orderData.customerName}) has scheduled a receipt/QR-code pickup at your store. Ref: #${newOrder.id}`,
      "delivery",
      newOrder.id
    );

    return { success: true, orderId: newOrder.id };
  };

  const acceptReceiptPickupDelivery = (orderId: string, riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;

    const updated = receiptPickupOrders.map(o => {
      if (o.id === orderId) {
        addNotification(
          o.customerId,
          "Rider Assigned to Receipt Pickup",
          `Rider ${rider.name} is on the way to pick up your pre-purchased items from ${o.vendorName}.`,
          "delivery",
          orderId
        );
        addNotification(
          o.vendorId,
          "Rider Dispatched for Pickup",
          `Rider ${rider.name} has accepted the pickup for #${orderId} and is on their way to your store.`,
          "delivery",
          orderId
        );
        return {
          ...o,
          riderId: rider.id,
          riderName: rider.name,
          status: "accepted" as const
        };
      }
      return o;
    });
    setReceiptPickupOrders(updated);
    localStorage.setItem("fd_receipt_pickup_orders", JSON.stringify(updated));
    
    const updatedOrder = updated.find(o => o.id === orderId);
    if (updatedOrder) {
      syncSave("RECEIPT_PICKUP_UPSERT", updatedOrder);
    }
  };

  const updateReceiptPickupStatus = (orderId: string, status: ReceiptPickupOrder["status"]) => {
    const updated = receiptPickupOrders.map(o => {
      if (o.id === orderId) {
        let title = "";
        let msg = "";
        if (status === "picked_up") {
          title = "Receipt Order Picked Up";
          msg = `Rider has verified the receipt at ${o.vendorName} and picked up your items!`;
        } else if (status === "delivered") {
          title = "Receipt Order Delivered";
          msg = `Your pre-purchased items from ${o.vendorName} have been delivered successfully!`;
        } else if (status === "cancelled") {
          title = "Receipt Order Cancelled";
          msg = `Your receipt pickup and delivery order #${orderId} was cancelled.`;
          
          if (o.paymentMethod === "wallet" && o.paymentStatus === "paid") {
            updateUserWalletBalance(
              o.customerId,
              o.deliveryFee,
              "refund",
              `Refund of delivery fee for cancelled receipt order #${orderId}`
            );
          }
        }

        if (title && msg) {
          addNotification(o.customerId, title, msg, "delivery", orderId);
          addNotification(o.vendorId, title, msg, "delivery", orderId);
        }

        return {
          ...o,
          status,
          paymentStatus: status === "delivered" ? "paid" as const : o.paymentStatus
        };
      }
      return o;
    });
    setReceiptPickupOrders(updated);
    localStorage.setItem("fd_receipt_pickup_orders", JSON.stringify(updated));
    
    const updatedOrder = updated.find(o => o.id === orderId);
    if (updatedOrder) {
      syncSave("RECEIPT_PICKUP_UPSERT", updatedOrder);
    }
  };

  const cancelReceiptPickupOrder = (orderId: string) => {
    updateReceiptPickupStatus(orderId, "cancelled");
  };

  const socketRef = useRef<Socket | null>(null);

  const publicVapidKey = "BPEg3-o75k9oT_P58tN3X8w3D0aC7CgT8Qd2lE_244FqL9c-859ZpA34A_R-V9t-V7h48x3Yp8M06xR61O4hXwI";
  
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    if (currentUser) {
      // 1. Connect Socket.io
      socketRef.current = io({ path: "/socket.io" });
      socketRef.current.emit("join", currentUser.id);
      
      if (currentVendor) {
        socketRef.current.emit("join", currentVendor.id);
      }

      if (currentUser.roles?.includes("admin") || currentUser.roles?.includes("super_admin")) {
        socketRef.current.emit("join", "admin");
      }
      
      // If user is a rider, join the riders room
      if (currentUser.roles?.includes("rider")) {
        socketRef.current.emit("join", "riders");
      }

      socketRef.current.on("new_order", (data) => {
        // Play a "Ding" sound
        try {
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audio.play();
        } catch(e) {}
        alert(`New Order Received! Order ID: ${data.orderId}`);

        if (data.order) {
          setOrders(prev => {
            if (prev.find(o => o.id === data.order.id)) return prev;
            return [data.order, ...prev];
          });
        }
      });

      socketRef.current.on("new_delivery_job", (data) => {
        // Play a "Ding" sound for riders
        try {
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audio.play();
        } catch(e) {}
        alert(`New Delivery Job Available! Order ID: ${data.orderId}`);
      });

      socketRef.current.on("sync_update", () => {
        window.dispatchEvent(new Event("sync_update_event"));
      });

      // 2. Request Web Push Subscription if PWA/ServiceWorker is ready
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          }).then((subscription) => {
            // Send subscription to backend
            const token = localStorage.getItem("fd_jwt_token");
            if (token) {
              fetch("/api/push/subscribe", {
                method: "POST",
                body: JSON.stringify({ subscription }),
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                  "X-Auth-Token": token
                }
              });
            }
          }).catch(console.error);
        });
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser]);

  return (
    <DatabaseContext.Provider
      value={{
        currentUser,
        currentVendor,
        currentRider,
        users,
        vendors,
        products,
        orders,
        riders,
        cart,
        categories,
        addProductCategory,
        updateProductCategory,
        deleteProductCategory,
        homepageSections,
        updateHomepageSections,
        collections,
        updateCollections,
        heroBanner,
        updateHeroBanner,
        availableLocations,
        updateAvailableLocations,
        selectedLocation,
        setSelectedLocation: handleSetSelectedLocation,
        paymentGateways,
        updatePaymentGateways,
        categoryServiceFees,
        updateCategoryServiceFee,
        vendorCategories,
        addVendorCategory,
        removeVendorCategory,
        updateVendorCategory,
        
        // Global Service & Delivery Fees
        globalServiceFeeType,
        globalServiceFeeValue,
        updateGlobalServiceFeeSettings,
        globalFreeDelivery,
        updateGlobalFreeDelivery,
        surgeConfig,
        updateSurgeConfig,
        legalContent,
        updateLegalContent,
        contactInfo,
        updateContactInfo,
        saveSystemSettings,
        saveDeliveryZones,
        calculateServiceFee,
        calculateDeliveryFee,
        currency,
        updateCurrency,

        // Platform & Rider Commissions
        platformCommissionRate,
        updatePlatformCommissionRate,
        riderCommissionType,
        riderCommissionValue,
        updateRiderCommissionSettings,

        // VAT settings
        vatEnabled,
        vatRate,
        updateVatSettings,

        // Max cart item limit
        maxCartItems,
        updateMaxCartItems,

        // Employee Management
        employees,
        addEmployee,
        updateEmployee,
        removeEmployee,

        checkUser,
        finalizeLogin,
        login,
        register,
        logout,
        switchRole,
        overrideUserRole,
        updateProfile,
        resetUserPin,
        applyForVendor,
        applyForRider,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        placeOrder,
        updateVendorOrder,
        addProduct,
        updateProduct,
        deleteProduct,
        updateVendorProfile,
        acceptDelivery,
        updateDeliveryStatus,
        updateOrderPayoutStatus,
        updateRiderProfile,
        toggleVendorStatus,
        toggleRiderStatus,
        deleteUser,
        adminUpdateVendor,
        adminCreateOrder,
        adminCreateUser,
        adminUpdateUser,
        adminUpdateUserRole,

        // Kwara Coverage expansion fields
        coverageGuideText,
        updateCoverageGuideText,
        extremeLocationTiers,
        updateExtremeLocationTiers,
        extremeLocations,
        addExtremeLocation,
        removeExtremeLocation,
        updateExtremeLocations,
        savedAddresses,
        addSavedAddress,
        removeSavedAddress,
        reviews,
        addReview,

        // Notifications System
        notifications,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        deleteNotification,

        // Wallet System Management
        walletTransactions,
        getUserWalletBalance,
        updateUserWalletBalance,
        walletFundingBankTransferEnabled,
        walletFundingMonnifyEnabled,
        walletFundingPaystackEnabled,
        updateWalletFundingModes,
        requestWalletFunding,
        approveWalletFunding,
        declineWalletFunding,

        // Receipt Pickup & Delivery System
        receiptPickupConfig,
        updateReceiptPickupConfig,
        receiptPickupOrders,
        createReceiptPickupOrder,
        acceptReceiptPickupDelivery,
        updateReceiptPickupStatus,
        cancelReceiptPickupOrder,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};
