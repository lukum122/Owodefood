import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Vendor, Product, Order, Rider, Address, Category, UserRole, OrderStatus, Addon, PaymentGateway, VendorCategory, VendorCategoryInfo, Employee, UserSavedAddress, ExtremeLocationTier, ExtremeLocation } from "../types";

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
  calculateDeliveryFee: (vendorId: string | undefined, subtotal: number, deliveryAddress?: string) => number;
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

  // Employee Management
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id" | "createdAt">) => void;
  updateEmployee: (id: string, updated: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  
  // Auth Actions
  login: (email: string, role: UserRole) => { success: boolean; error?: string };
  register: (name: string, email: string, phone: string, role: UserRole, extra?: { businessName?: string; cuisine?: string; vehicleType?: string }) => { success: boolean; error?: string };
  logout: () => void;
  overrideUserRole: (role: UserRole) => void; // Development booster
  updateProfile: (name: string, phone: string) => void;
  
  // Cart Actions
  addToCart: (product: Product, selectedAddons?: Addon[]) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Checkout & Customer Actions
  placeOrder: (deliveryAddress: string, paymentMethod: string, deliveryPhone?: string) => { success: boolean; orderId?: string };
  
  // Vendor Actions
  updateVendorOrder: (orderId: string, status: OrderStatus) => void;
  addProduct: (product: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  updateVendorProfile: (profile: Partial<Vendor>) => void;
  
  // Rider Actions
  acceptDelivery: (orderId: string, riderId: string) => void;
  updateDeliveryStatus: (orderId: string, status: OrderStatus) => void;
  updateRiderProfile: (profile: Partial<Rider>) => void;
  
  // Admin Actions
  toggleVendorStatus: (vendorId: string, status: Vendor["status"]) => void;
  toggleRiderStatus: (riderId: string, status: Rider["status"]) => void;
  deleteUser: (userId: string) => void;
  adminUpdateVendor: (vendorId: string, updatedFields: Partial<Vendor>) => void;
  adminCreateOrder: (order: Order) => void;
  adminCreateUser: (name: string, email: string, phone: string, role: UserRole, extra?: { businessName?: string; cuisine?: string; vehicleType?: string }) => { success: boolean; error?: string };
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
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Helper to generate UUIDs when needed (or simple unique string IDs)
const generateId = () => Math.random().toString(36).substring(2, 11);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [currentRider, setCurrentRider] = useState<Rider | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  // Coverage guide & extreme locations states
  const [coverageGuideText, setCoverageGuideText] = useState<string>(() => {
    const saved = localStorage.getItem("fd_coverage_guide");
    return saved || `### 📍 Kwara & Ilorin Marketplace Coverage Reference Guide

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
  const [globalFreeDelivery, setGlobalFreeDelivery] = useState<boolean>(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currency, setCurrency] = useState<string>("₦");
  
  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(15);
  const [riderCommissionType, setRiderCommissionType] = useState<"flat" | "percentage">("flat");
  const [riderCommissionValue, setRiderCommissionValue] = useState<number>(150);
  
  const [vatEnabled, setVatEnabled] = useState<boolean>(true);
  const [vatRate, setVatRate] = useState<number>(7.5);
  
  const categories: Category[] = [
    { id: "1", name: "Burgers", icon: "🍔" },
    { id: "2", name: "Pizza", icon: "🍕" },
    { id: "3", name: "Chicken", icon: "🍗" },
    { id: "4", name: "Drinks", icon: "🥤" },
    { id: "5", name: "Desserts", icon: "🍰" },
  ];

  // Load initial data from Local Storage or Seed Data
  useEffect(() => {
    // 1. Users Seed
    const savedUsers = localStorage.getItem("fd_users");
    const savedVendors = localStorage.getItem("fd_vendors");
    const savedProducts = localStorage.getItem("fd_products");
    const savedOrders = localStorage.getItem("fd_orders");
    const savedRiders = localStorage.getItem("fd_riders");

    let initialUsers: User[] = [];
    if (savedUsers) {
      initialUsers = JSON.parse(savedUsers);
    } else {
      initialUsers = [
        { id: "cust-1", email: "customer@gmail.com", name: "Sarah Collins", phone: "+234 803 123 4567", role: "customer", createdAt: new Date().toISOString() },
        { id: "vend-id1", email: "vendor@gmail.com", name: "Mama Cass", phone: "+234 812 345 6789", role: "vendor", createdAt: new Date().toISOString() },
        { id: "vend-id2", email: "burger@gmail.com", name: "Chicken Republic", phone: "+234 815 555 1212", role: "vendor", createdAt: new Date().toISOString() },
        { id: "ride-1", email: "rider@gmail.com", name: "Rider Daniel", phone: "+234 905 987 6543", role: "rider", createdAt: new Date().toISOString() },
        { id: "admin-1", email: "admin@gmail.com", name: "Platform Admin", phone: "+234 809 999 0000", role: "admin", createdAt: new Date().toISOString() },
      ];
      localStorage.setItem("fd_users", JSON.stringify(initialUsers));
    }
    setUsers(initialUsers);

    // 2. Vendors Seed
    let initialVendors: Vendor[] = [];
    if (savedVendors) {
      initialVendors = JSON.parse(savedVendors);
      // Self-healing: ensure all loaded vendors have the new properties or fallbacks & Kwara localization
      let updated = false;
      initialVendors = initialVendors.map(v => {
        let needsUpdate = false;
        const up: Vendor = { ...v };
        
        // Auto-migration to Kwara / Ilorin
        if (up.address && (up.address.includes("Lagos") || up.address.includes("Lekki") || up.address.includes("Victoria Island") || up.address.includes("Ikeja") || up.address.includes("Admiralty"))) {
          if (up.id === "v-1") { up.address = "Fate Road, Ilorin, Kwara"; needsUpdate = true; }
          else if (up.id === "v-2" || up.id === "v-3") { up.address = "GRA, Ilorin, Kwara"; needsUpdate = true; }
          else if (up.id === "v-4") { up.address = "Challenge Area, Ilorin, Kwara"; needsUpdate = true; }
          else if (up.id === "v-5") { up.address = "Tanke Road, Ilorin, Kwara"; needsUpdate = true; }
          else if (up.id === "v-6") { up.address = "GRA, Ilorin, Kwara"; needsUpdate = true; }
          else if (up.id === "v-7") { up.address = "Adewole Estate, Ilorin, Kwara"; up.name = "Chowstore Ilorin"; needsUpdate = true; }
          else { 
            up.address = up.address
              .replace(/Lagos/gi, "Kwara")
              .replace(/Lekki/gi, "Tanke")
              .replace(/Ikeja/gi, "Challenge")
              .replace(/Victoria Island/gi, "GRA"); 
            needsUpdate = true; 
          }
        }

        if (!up.category) {
          up.category = "restaurant";
          needsUpdate = true;
        }
        if (up.prepTime === undefined) {
          up.prepTime = up.id === "v-1" ? 25 : up.id === "v-2" ? 15 : 20;
          needsUpdate = true;
        }
        if (up.deliveryFee === undefined) {
          up.deliveryFee = up.id === "v-1" ? 750 : up.id === "v-2" ? 600 : 800;
          needsUpdate = true;
        }
        if (needsUpdate) updated = true;
        return up;
      });
      // Ensure the newly added shops, pharmacies, and groceries are always present
      const hasShop = initialVendors.some(v => v.id === "v-5");
      if (!hasShop) {
        updated = true;
        initialVendors.push(
          {
            id: "v-5",
            userId: "vendor5-id",
            name: "Mega Plaza Supermarket",
            description: "Household groceries, premium imported products, electronics, snacks, cold beverages, laundry essentials, and personal toiletries.",
            cuisine: "Groceries",
            image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=60",
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
            image: "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=600&auto=format&fit=crop&q=60",
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
            image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=60",
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
        );
      }
      if (updated) {
        localStorage.setItem("fd_vendors", JSON.stringify(initialVendors));
      }
    } else {
      initialVendors = [
        {
          id: "v-1",
          userId: "vend-id1",
          name: "Mama Cass",
          description: "Traditional Nigerian dishes, rich aromatic Jollof Rice, Swallow, and delicious side delicacies.",
          cuisine: "Desserts",
          image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&auto=format&fit=crop&q=60",
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
          userId: "vend-id2",
          name: "Chicken Republic",
          description: "Home of the famous Soulfully Spiced chicken, crunchy tenders, and legendary Jollof meals.",
          cuisine: "Chicken",
          image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=60",
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
          image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60",
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
          image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=600&auto=format&fit=crop&q=60",
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
          image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=60",
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
          image: "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=600&auto=format&fit=crop&q=60",
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
          image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=60",
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

    // 3. Products Seed
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

    let initialProducts: Product[] = [];
    if (savedProducts) {
      initialProducts = JSON.parse(savedProducts);
      // Ensure products for v-5, v-6, v-7 exist
      const hasShopProducts = initialProducts.some(p => p.vendorId === "v-5");
      if (!hasShopProducts) {
        initialProducts.push(
          // Mega Plaza Supermarket (v-5)
          { id: "p-11", vendorId: "v-5", name: "Brand New Hardcover Notebook", description: "Standard ruled 80-sheet hardcover study/business journal.", price: 1500, image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop&q=60", category: "Stationery", isAvailable: true, createdAt: new Date().toISOString() },
          { id: "p-12", vendorId: "v-5", name: "Premium Salted Potato Crisps", description: "Crunchy golden potato crisps seasoned with light sea salt.", price: 950, image: "https://images.unsplash.com/photo-1566478989037-eec170784d20?w=600&auto=format&fit=crop&q=60", category: "Snacks", isAvailable: true, createdAt: new Date().toISOString() },
          
          // Medplus Pharmacy (v-6)
          { id: "p-13", vendorId: "v-6", name: "Vitamin C Chewable Boosters", description: "High potency Vitamin C tablets (1000mg) for strong immunity.", price: 3200, image: "https://images.unsplash.com/photo-1616679911721-fe6eec14f7e9?w=600&auto=format&fit=crop&q=60", category: "Wellness", isAvailable: true, createdAt: new Date().toISOString() },
          { id: "p-14", vendorId: "v-6", name: "Aloe Hand Sanitizer Gel", description: "Kills 99.9% of germs while keeping skin moisturized with organic Aloe Vera.", price: 1200, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=60", category: "Hygiene", isAvailable: true, createdAt: new Date().toISOString() },
          
          // Chowstore Lekki (v-7)
          { id: "p-15", vendorId: "v-7", name: "Farm Fresh Tomatoes Basket", description: "Freshly harvested, organic and juicy red tomatoes (1kg).", price: 2800, image: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&auto=format&fit=crop&q=60", category: "Produce", isAvailable: true, createdAt: new Date().toISOString() },
          { id: "p-16", vendorId: "v-7", name: "Golden Penny Spaghetti Pasta", description: "Rich in fiber, quick-cooking premium semolina wheat spaghetti pack (500g).", price: 1100, image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=60", category: "Grains", isAvailable: true, createdAt: new Date().toISOString() }
        );
        localStorage.setItem("fd_products", JSON.stringify(initialProducts));
      }
    } else {
      initialProducts = [
        // Mama Cass (v-1)
        { id: "p-1", vendorId: "v-1", name: "Jollof Rice", description: "Smoky party Jollof rice with fried plantains and sliced salad.", price: 4500, image: "https://images.unsplash.com/photo-1628294895950-9805353123bc?w=600&auto=format&fit=crop&q=60", category: "Desserts", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-2", vendorId: "v-1", name: "Fried Rice", description: "Special fried rice with fresh vegetables.", price: 4000, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", category: "Desserts", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-3", vendorId: "v-1", name: "Grilled Chicken", description: "Spicy grilled chicken thigh marinated in local spices.", price: 3500, image: "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&auto=format&fit=crop&q=60", category: "Desserts", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-4", vendorId: "v-1", name: "Coca Cola (50cl)", description: "Ice cold refreshing Cola beverage in plastic bottle.", price: 500, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=60", category: "Drinks", isAvailable: true, createdAt: new Date().toISOString() },
        
        // Chicken Republic (v-2)
        { id: "p-5", vendorId: "v-2", name: "Citizens Meal", description: "Standard meal package containing Jollof rice, 1 fried chicken and drink.", price: 3200, image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=60", category: "Chicken", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-6", vendorId: "v-2", name: "Crunchy Chicken (2 pcs)", description: "Crispy and spicy original recipe fried chicken pieces.", price: 2800, image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=60", category: "Chicken", isAvailable: true, createdAt: new Date().toISOString() },
        
        // Domino's Pizza (v-3)
        { id: "p-7", vendorId: "v-3", name: "Pepperoni Supreme Pizza", description: "Loaded with pepperoni, mozzarella cheese and pizza sauce.", price: 6500, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=60", category: "Pizza", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-8", vendorId: "v-3", name: "Chicken Supreme Pizza", description: "Oven-grilled chicken breast slices, sweet corn, green peppers.", price: 7200, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60", category: "Pizza", isAvailable: true, createdAt: new Date().toISOString() },
        
        // KFC (v-4)
        { id: "p-9", vendorId: "v-4", name: "Zinger Burger", description: "A hot & crispy chicken fillet inside a warm toasted sesame bun.", price: 3800, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", category: "Burgers", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-10", vendorId: "v-4", name: "Fried Chicken Bucket", description: "5 pieces of signature original recipe fried chicken.", price: 6800, image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=600&auto=format&fit=crop&q=60", category: "Chicken", isAvailable: true, createdAt: new Date().toISOString() },

        // Mega Plaza Supermarket (v-5)
        { id: "p-11", vendorId: "v-5", name: "Brand New Hardcover Notebook", description: "Standard ruled 80-sheet hardcover study/business journal.", price: 1500, image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop&q=60", category: "Stationery", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-12", vendorId: "v-5", name: "Premium Salted Potato Crisps", description: "Crunchy golden potato crisps seasoned with light sea salt.", price: 950, image: "https://images.unsplash.com/photo-1566478989037-eec170784d20?w=600&auto=format&fit=crop&q=60", category: "Snacks", isAvailable: true, createdAt: new Date().toISOString() },
        
        // Medplus Pharmacy (v-6)
        { id: "p-13", vendorId: "v-6", name: "Vitamin C Chewable Boosters", description: "High potency Vitamin C tablets (1000mg) for strong immunity.", price: 3200, image: "https://images.unsplash.com/photo-1616679911721-fe6eec14f7e9?w=600&auto=format&fit=crop&q=60", category: "Wellness", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-14", vendorId: "v-6", name: "Aloe Hand Sanitizer Gel", description: "Kills 99.9% of germs while keeping skin moisturized with organic Aloe Vera.", price: 1200, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=60", category: "Hygiene", isAvailable: true, createdAt: new Date().toISOString() },
        
        // Chowstore Lekki (v-7)
        { id: "p-15", vendorId: "v-7", name: "Farm Fresh Tomatoes Basket", description: "Freshly harvested, organic and juicy red tomatoes (1kg).", price: 2800, image: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&auto=format&fit=crop&q=60", category: "Produce", isAvailable: true, createdAt: new Date().toISOString() },
        { id: "p-16", vendorId: "v-7", name: "Golden Penny Spaghetti Pasta", description: "Rich in fiber, quick-cooking premium semolina wheat spaghetti pack (500g).", price: 1100, image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=60", category: "Grains", isAvailable: true, createdAt: new Date().toISOString() }
      ];
      localStorage.setItem("fd_products", JSON.stringify(initialProducts));
    }

    const productsWithAddons = initialProducts.map(p => {
      if (defaultAddonsMap[p.id]) {
        return { ...p, addons: defaultAddonsMap[p.id] };
      }
      return p;
    });
    setProducts(productsWithAddons);

    // 4. Riders Seed
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

    // 5. Orders Seed
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
    setOrders(initialOrders);

    // 6. Restore active session if any
    const savedSessionUser = sessionStorage.getItem("fd_session_user");
    if (savedSessionUser) {
      const u: User = JSON.parse(savedSessionUser);
      setCurrentUser(u);
      
      // Load respective portal context too
      if (u.role === "vendor") {
        const v = initialVendors.find(vendor => vendor.userId === u.id);
        setCurrentVendor(v || null);
      } else if (u.role === "rider") {
        const r = initialRiders.find(rider => rider.userId === u.id);
        setCurrentRider(r || null);
      }
    } else {
      // Auto login as basic customer to begin with! Perfect onboarding.
      const defaultCust = initialUsers.find(u => u.role === "customer") || null;
      if (defaultCust) {
        setCurrentUser(defaultCust);
        sessionStorage.setItem("fd_session_user", JSON.stringify(defaultCust));
      }
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

    // Ensure all seed extreme locations are also added to availableLocations so that delivery zones are fully linked with tiers
    const savedExtremeLocations = localStorage.getItem("fd_extreme_locations");
    let initialExtreme: ExtremeLocation[] = [];
    if (savedExtremeLocations) {
      try {
        initialExtreme = JSON.parse(savedExtremeLocations);
      } catch {
        // fallback
      }
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

    // Now let's merge them together
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
  }, []);

  const updateAvailableLocations = (locations: string[]) => {
    setAvailableLocations(locations);
    localStorage.setItem("fd_available_locations", JSON.stringify(locations));
  };

  const updateCoverageGuideText = (text: string) => {
    setCoverageGuideText(text);
    localStorage.setItem("fd_coverage_guide", text);
  };

  const updateExtremeLocationTiers = (tiers: ExtremeLocationTier[]) => {
    setExtremeLocationTiers(tiers);
    localStorage.setItem("fd_extreme_tiers", JSON.stringify(tiers));
  };

  const addExtremeLocation = (name: string, tierId: string) => {
    const newLoc: ExtremeLocation = { id: "ex-" + generateId(), name, tierId };
    const updated = [...extremeLocations, newLoc];
    setExtremeLocations(updated);
    localStorage.setItem("fd_extreme_locations", JSON.stringify(updated));
  };

  const removeExtremeLocation = (id: string) => {
    const updated = extremeLocations.filter(item => item.id !== id);
    setExtremeLocations(updated);
    localStorage.setItem("fd_extreme_locations", JSON.stringify(updated));
  };

  const updateExtremeLocations = (locations: ExtremeLocation[]) => {
    setExtremeLocations(locations);
    localStorage.setItem("fd_extreme_locations", JSON.stringify(locations));
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
  };

  const removeSavedAddress = (id: string) => {
    const updated = savedAddresses.filter(item => item.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem("fd_saved_addresses", JSON.stringify(updated));
  };

  const updatePaymentGateways = (gateways: PaymentGateway[]) => {
    setPaymentGateways(gateways);
    localStorage.setItem("fd_payment_gateways", JSON.stringify(gateways));
  };

  const updateCategoryServiceFee = (category: string, fee: number) => {
    const updated = { ...categoryServiceFees, [category]: fee };
    setCategoryServiceFees(updated);
    localStorage.setItem("fd_category_service_fees", JSON.stringify(updated));
  };

  const addVendorCategory = (newCat: VendorCategoryInfo) => {
    const updatedCats = [...vendorCategories, newCat];
    setVendorCategories(updatedCats);
    localStorage.setItem("fd_vendor_categories", JSON.stringify(updatedCats));

    if (categoryServiceFees[newCat.id] === undefined) {
      const updatedFees = { ...categoryServiceFees, [newCat.id]: 300 };
      setCategoryServiceFees(updatedFees);
      localStorage.setItem("fd_category_service_fees", JSON.stringify(updatedFees));
    }
  };

  const removeVendorCategory = (catId: string) => {
    const updatedCats = vendorCategories.filter(c => c.id !== catId);
    setVendorCategories(updatedCats);
    localStorage.setItem("fd_vendor_categories", JSON.stringify(updatedCats));

    const updatedFees = { ...categoryServiceFees };
    delete updatedFees[catId];
    setCategoryServiceFees(updatedFees);
    localStorage.setItem("fd_category_service_fees", JSON.stringify(updatedFees));
  };

  const updateVendorCategory = (catId: string, updatedFields: Partial<Omit<VendorCategoryInfo, "id">>) => {
    const updatedCats = vendorCategories.map(c => c.id === catId ? { ...c, ...updatedFields } : c);
    setVendorCategories(updatedCats);
    localStorage.setItem("fd_vendor_categories", JSON.stringify(updatedCats));
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

  const updateCurrency = (symbol: string) => {
    setCurrency(symbol);
    localStorage.setItem("fd_currency", symbol);
  };

  const updatePlatformCommissionRate = (rate: number) => {
    setPlatformCommissionRate(rate);
    localStorage.setItem("fd_platform_commission_rate", String(rate));
  };

  const updateRiderCommissionSettings = (type: "flat" | "percentage", value: number) => {
    setRiderCommissionType(type);
    setRiderCommissionValue(value);
    localStorage.setItem("fd_rider_commission_type", type);
    localStorage.setItem("fd_rider_commission_value", String(value));
  };

  const updateVatSettings = (enabled: boolean, rate: number) => {
    setVatEnabled(enabled);
    setVatRate(rate);
    localStorage.setItem("fd_vat_enabled", String(enabled));
    localStorage.setItem("fd_vat_rate", String(rate));
  };

  const calculateServiceFee = (vendorId: string | undefined, subtotal: number): number => {
    if (!vendorId || subtotal <= 0) return 0;
    const vendorObj = vendors.find(v => v.id === vendorId);
    if (!vendorObj) return 0;

    // 1. Vendor level override has highest priority
    if (vendorObj.serviceFeeType !== undefined && vendorObj.serviceFeeValue !== undefined) {
      if (vendorObj.serviceFeeType === "percentage") {
        return Math.round((subtotal * vendorObj.serviceFeeValue) / 100);
      } else {
        return vendorObj.serviceFeeValue;
      }
    }

    // Fallback to legacy field serviceFee
    if (vendorObj.serviceFee !== undefined) {
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
    return categoryServiceFees[cat] !== undefined ? categoryServiceFees[cat] : 300;
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

  const calculateDeliveryFee = (vendorId: string | undefined, subtotal: number, deliveryAddress?: string): number => {
    if (subtotal <= 0) return 0;
    if (globalFreeDelivery) return 0;
    
    if (!vendorId) return 750;
    const vendorObj = vendors.find(v => v.id === vendorId);
    if (!vendorObj) return 750;

    if (vendorObj.freeDelivery) return 0;

    const baseFee = vendorObj.deliveryFee !== undefined ? vendorObj.deliveryFee : 750;

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
      return baseFee + 850 + extremeSurcharge;
    }

    return baseFee + extremeSurcharge;
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

    // Also register them in users state so they can log in via quick login!
    const updatedUsers = [...users, {
      id: newEmp.id,
      email: newEmp.email,
      name: newEmp.name,
      phone: newEmp.phone,
      role: "employee" as UserRole,
      createdAt: newEmp.createdAt
    }];
    persistUsers(updatedUsers);
  };

  const updateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    const updated = employees.map(emp => emp.id === id ? { ...emp, ...updatedFields } : emp);
    setEmployees(updated);
    localStorage.setItem("fd_employees", JSON.stringify(updated));

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

    // Also delete from users state
    const updatedUsers = users.filter(u => u.id !== id);
    persistUsers(updatedUsers);
  };

  // Update localStorage whenever values change
  const persistUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem("fd_users", JSON.stringify(newUsers));
  };

  const persistVendors = (newVendors: Vendor[]) => {
    setVendors(newVendors);
    localStorage.setItem("fd_vendors", JSON.stringify(newVendors));
  };

  const persistProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem("fd_products", JSON.stringify(newProducts));
  };

  const persistOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem("fd_orders", JSON.stringify(newOrders));
  };

  const persistRiders = (newRiders: Rider[]) => {
    setRiders(newRiders);
    localStorage.setItem("fd_riders", JSON.stringify(newRiders));
  };

  // AUTH ACTIONS
  const login = (email: string, role: UserRole) => {
    const cleansedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleansedEmail);
    
    if (user) {
      if (user.role !== role) {
        return { success: false, error: `This account is registered as a ${user.role}, not a ${role}.` };
      }
      
      setCurrentUser(user);
      sessionStorage.setItem("fd_session_user", JSON.stringify(user));
      
      if (role === "vendor") {
        const v = vendors.find(vend => vend.userId === user.id);
        setCurrentVendor(v || null);
      } else if (role === "rider") {
        const r = riders.find(rid => rid.userId === user.id);
        setCurrentRider(r || null);
      }
      return { success: true };
    } else {
      return { success: false, error: "Email not found. Please click 'Register' if you need a new account." };
    }
  };

  const register = (
    name: string,
    email: string,
    phone: string,
    role: UserRole,
    extra?: { businessName?: string; cuisine?: string; vehicleType?: string }
  ) => {
    const cleansedEmail = email.trim().toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === cleansedEmail);
    if (exists) {
      return { success: false, error: "An account with this email already exists." };
    }

    const newUserId = generateId();
    const newUser: User = {
      id: newUserId,
      email: cleansedEmail,
      name,
      phone,
      role,
      createdAt: new Date().toISOString()
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
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
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
    sessionStorage.setItem("fd_session_user", JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentVendor(null);
    setCurrentRider(null);
    setCart([]);
    sessionStorage.removeItem("fd_session_user");
  };

  // Helper designed for review to switch roles seamlessly
  const overrideUserRole = (role: UserRole) => {
    // Finds or creates a sample user for that role
    let targetUser = users.find(u => u.role === role);
    if (!targetUser) {
      // Auto-creates a robust preset so developer has immediate access
      const id = `${role}-guest`;
      targetUser = {
        id,
        email: `${role}@gmail.com`,
        name: `Sample ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        phone: "+234 803 123 4567",
        role,
        createdAt: new Date().toISOString()
      };
      persistUsers([...users, targetUser]);
    }

    setCurrentUser(targetUser);
    sessionStorage.setItem("fd_session_user", JSON.stringify(targetUser));

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
          image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60",
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

  const updateProfile = (name: string, phone: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, name, phone };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updated : u);
    persistUsers(updatedUsers);
    setCurrentUser(updated);
    sessionStorage.setItem("fd_session_user", JSON.stringify(updated));

    // Also sync the secondary user profiles if matching
    if (currentUser.role === "vendor") {
      const v = vendors.find(vend => vend.userId === currentUser.id);
      if (v) {
        const updatedV = { ...v, name };
        persistVendors(vendors.map(item => item.id === v.id ? updatedV : item));
        setCurrentVendor(updatedV);
      }
    } else if (currentUser.role === "rider") {
      const r = riders.find(rid => rid.userId === currentUser.id);
      if (r) {
        const updatedR = { ...r, name, phone };
        persistRiders(riders.map(item => item.id === r.id ? updatedR : item));
        setCurrentRider(updatedR);
      }
    }
  };

  // CART ACTIONS
  const addToCart = (product: Product, selectedAddons: Addon[] = []) => {
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
        // Check that all selectedAddons are in itemAddons
        const sAddonKeys = selectedAddons.map(sa => sa.id).sort();
        const iAddonKeys = itemAddons.map(ia => ia.id).sort();
        return sAddonKeys.every((val, i) => val === iAddonKeys[i]);
      });

      if (index > -1) {
        const newCart = [...cart];
        newCart[index].quantity += 1;
        setCart(newCart);
      } else {
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
    if (cart.some(item => item.id === id)) {
      setCart(cart.map(item => item.id === id ? { ...item, quantity } : item));
    } else {
      // Fallback: match by product.id
      setCart(cart.map(item => item.product.id === id ? { ...item, quantity } : item));
    }
  };

  const clearCart = () => setCart([]);

  // CHECKOUT & CUSTOMER ACTIONS
  const placeOrder = (deliveryAddress: string, paymentMethod: string, deliveryPhone?: string) => {
    if (!currentUser || cart.length === 0) return { success: false };
    
    const firstProduct = cart[0].product;
    const vendorObj = vendors.find(v => v.id === firstProduct.vendorId);
    
    if (!vendorObj) {
      return { success: false };
    }

    const total = cart.reduce((sum, item) => {
      const addonCost = (item.selectedAddons || []).reduce((acc, ad) => acc + ad.price, 0);
      return sum + ((item.product.price + addonCost) * item.quantity);
    }, 0);
    const tax = vatEnabled ? Math.round(total * (vatRate / 100)) : 0;
    const deliveryFee = calculateDeliveryFee(vendorObj.id, total, deliveryAddress);
    const serviceFee = calculateServiceFee(vendorObj.id, total);
    const finalAmount = Math.round(total + tax + deliveryFee + serviceFee);

    const newOrder: Order = {
      id: "ord-" + Math.floor(100 + Math.random() * 900),
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerPhone: deliveryPhone || currentUser.phone || "N/A",
      vendorId: vendorObj.id,
      vendorName: vendorObj.name,
      status: "pending",
      totalAmount: finalAmount,
      deliveryAddress,
      paymentMethod,
      createdAt: new Date().toISOString(),
      serviceFee,
      deliveryFee,
      tax,
      items: cart.map(item => {
        const addonCost = (item.selectedAddons || []).reduce((acc, ad) => acc + ad.price, 0);
        return {
          id: "oi-" + generateId(),
          orderId: "", // will be referenced
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price + addonCost,
          quantity: item.quantity,
          selectedAddons: item.selectedAddons || []
        };
      })
    };

    const updatedOrders = [newOrder, ...orders];
    persistOrders(updatedOrders);
    clearCart();

    return { success: true, orderId: newOrder.id };
  };

  // VENDOR ACTIONS
  const updateVendorOrder = (orderId: string, status: OrderStatus) => {
    let orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        // If preparing is ready and a rider is already assigned, assign to rider or let status flow
        return { ...o, status };
      }
      return o;
    });
    persistOrders(updatedOrders);
  };

  const addProduct = (product: Omit<Product, "id" | "createdAt">) => {
    const newProduct: Product = {
      ...product,
      id: "p-" + generateId(),
      createdAt: new Date().toISOString()
    };
    persistProducts([...products, newProduct]);
  };

  const updateProduct = (updatedProduct: Product) => {
    persistProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = (productId: string) => {
    persistProducts(products.filter(p => p.id !== productId));
  };

  const updateVendorProfile = (profileData: Partial<Vendor>) => {
    if (!currentVendor) return;
    const updated = { ...currentVendor, ...profileData };
    persistVendors(vendors.map(v => v.id === currentVendor.id ? updated : v));
    setCurrentVendor(updated);
  };

  // RIDER ACTIONS
  const acceptDelivery = (orderId: string, riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;

    persistOrders(orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          riderId,
          riderName: rider.name,
          status: "out_for_delivery" as OrderStatus
        };
      }
      return o;
    }));
  };

  const updateDeliveryStatus = (orderId: string, status: OrderStatus) => {
    persistOrders(orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status };
      }
      return o;
    }));
  };

  const updateRiderProfile = (profileData: Partial<Rider>) => {
    if (!currentRider) return;
    const updated = { ...currentRider, ...profileData };
    persistRiders(riders.map(r => r.id === currentRider.id ? updated : r));
    setCurrentRider(updated);
  };

  // ADMIN ACTIONS
  const toggleVendorStatus = (vendorId: string, status: Vendor["status"]) => {
    persistVendors(vendors.map(v => v.id === vendorId ? { ...v, status } : v));
  };

  const toggleRiderStatus = (riderId: string, status: Rider["status"]) => {
    persistRiders(riders.map(r => r.id === riderId ? { ...r, status } : r));
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
    extra?: { businessName?: string; cuisine?: string; vehicleType?: string }
  ) => {
    const cleansedEmail = email.trim().toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === cleansedEmail);
    if (exists) {
      return { success: false, error: "An account with this email already exists." };
    }

    const newUserId = generateId();
    const newUser: User = {
      id: newUserId,
      email: cleansedEmail,
      name,
      phone,
      role,
      createdAt: new Date().toISOString()
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
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
        rating: 5.0,
        address: "Food Street Market, District 1",
        status: "approved",
        createdAt: new Date().toISOString()
      };
      const updatedVendors = [...vendors, newVendor];
      persistVendors(updatedVendors);
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
        const updatedUser = { ...u, role };
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updatedUser);
          sessionStorage.setItem("fd_session_user", JSON.stringify(updatedUser));
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
          cuisine: "Continental",
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
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
      }
    }
  };

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

        // Employee Management
        employees,
        addEmployee,
        updateEmployee,
        removeEmployee,

        login,
        register,
        logout,
        overrideUserRole,
        updateProfile,
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
        updateRiderProfile,
        toggleVendorStatus,
        toggleRiderStatus,
        deleteUser,
        adminUpdateVendor,
        adminCreateOrder,
        adminCreateUser,
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
