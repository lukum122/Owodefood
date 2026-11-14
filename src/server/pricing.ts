// Server-side order pricing. The server is the ONLY place the final
// delivery fee, service fee and tax are decided -- previously these were
// taken as-is from the customer's browser, so anyone could submit ₦0.
//
// Delivery pricing has three admin-selectable modes (setting
// "deliveryPricing"):
//   zones           -- exactly the old rules (vendor base fee + "extreme
//                      location" surcharge + cross-district charge)
//   distance        -- base fee covering the first N km + price per extra km
//   distance_zones  -- distance price + extreme-location surcharge (default)
// Surge / rain / night extras are added on top in every mode. If either
// pin is missing, the fee falls back to the zone rules.

import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import { extremeLocations, extremeLocationTiers, products, systemSettings, vendors } from "../db/schema.ts";

export interface DeliveryPricingConfig {
  mode: "zones" | "distance" | "distance_zones";
  baseFee: number;      // ₦ for the first `baseKm`
  baseKm: number;
  perKm: number;        // ₦ per km after that
  minFee: number;
  roadFactor: number;   // straight-line km x this ~= road km
  roundTo: number;      // round fee up to the nearest ₦X
  defaultMaxKm: number; // vendors can override with their own
}

export const DEFAULT_DELIVERY_PRICING: DeliveryPricingConfig = {
  mode: "distance_zones",
  baseFee: 500,
  baseKm: 2,
  perKm: 150,
  minFee: 500,
  roadFactor: 1.3,
  roundTo: 50,
  defaultMaxKm: 10,
};

const SETTING_KEYS = [
  "deliveryPricing", "globalFreeDelivery", "surgeConfig", "vatEnabled", "vatRate",
  "globalServiceFeeType", "globalServiceFeeValue", "categoryServiceFees",
  "batchDiscountType", "batchDiscountValue", "receiptPickupConfig",
];

export async function loadPricingSettings() {
  const rows = await db.select().from(systemSettings).where(inArray(systemSettings.key, SETTING_KEYS));
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;
  const json = <T,>(k: string, fallback: T): T => { try { return m[k] ? { ...(fallback as any), ...JSON.parse(m[k]) } : fallback; } catch { return fallback; } };

  return {
    pricing: json<DeliveryPricingConfig>("deliveryPricing", DEFAULT_DELIVERY_PRICING),
    globalFreeDelivery: m.globalFreeDelivery === "true",
    surge: json("surgeConfig", { isSurgeActive: false, surgeFee: 0, isRainActive: false, rainFee: 0, isNightActive: false, nightFee: 0, nightStartTime: "22:00", nightEndTime: "06:00" }),
    // Same defaults the app has always used when a setting was never saved.
    vatEnabled: m.vatEnabled ? m.vatEnabled === "true" : true,
    vatRate: m.vatRate ? Number(m.vatRate) : 7.5,
    globalServiceFeeType: (m.globalServiceFeeType || "category") as "category" | "flat" | "percentage",
    globalServiceFeeValue: Number(m.globalServiceFeeValue || 0),
    categoryServiceFees: json<Record<string, number>>("categoryServiceFees", { restaurant: 350, shop: 500, pharmacy: 200, groceries: 400 }),
    batchDiscountType: (m.batchDiscountType || "free") as "free" | "flat" | "percentage",
    batchDiscountValue: Number(m.batchDiscountValue || 0),
    receiptPickup: json("receiptPickupConfig", { isEnabled: true, flatServiceFee: 50 }),
  };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function validCoord(lat: any, lng: any): lat is number {
  return typeof lat === "number" && typeof lng === "number" && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

// Old area-name detection, kept identical for "zones" mode / fallback.
function getRegion(address: string): string {
  const a = (address || "").toLowerCase();
  if (a.includes("tanke")) return "tanke";
  if (a.includes("gra")) return "gra";
  if (a.includes("challenge")) return "challenge";
  if (a.includes("fate")) return "fate";
  if (a.includes("adewole")) return "adewole";
  return "other";
}

// Nigeria time, whatever timezone the VPS runs in.
function lagosMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value || 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return h * 60 + m;
}

function surgeExtras(surge: any) {
  let extra = 0;
  if (surge.isSurgeActive) extra += Number(surge.surgeFee) || 0;
  if (surge.isRainActive) extra += Number(surge.rainFee) || 0;
  if (surge.isNightActive) {
    const now = lagosMinutesNow();
    const [sh, sm] = String(surge.nightStartTime || "22:00").split(":").map(Number);
    const [eh, em] = String(surge.nightEndTime || "06:00").split(":").map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    const night = start > end ? now >= start || now <= end : now >= start && now <= end;
    if (night) extra += Number(surge.nightFee) || 0;
  }
  return extra;
}

async function extremeSurcharge(address: string) {
  if (!address) return 0;
  const lower = address.toLowerCase();
  const [locs, tiers] = await Promise.all([db.select().from(extremeLocations), db.select().from(extremeLocationTiers)]);
  for (const ex of locs as any[]) {
    if (ex?.name && lower.includes(String(ex.name).toLowerCase())) {
      const tier = (tiers as any[]).find((t) => t.id === ex.tierId);
      if (tier) return Number(tier.surcharge) || 0;
    }
  }
  return 0;
}

export interface FeeQuote {
  subtotal: number;
  deliveryFee: number;
  normalDeliveryFee: number; // before any batch discount
  serviceFee: number;
  tax: number;
  total: number;
  distanceKm: number | null;
  pricingMode: DeliveryPricingConfig["mode"];
  usedDistance: boolean;
  outOfRange: boolean;
  maxKm: number | null;
  vendorHasLocation: boolean;
}

export async function computeDeliveryFee(opts: {
  vendor: any; subtotal: number; deliveryAddress: string; isReceiptPickup: boolean;
  lat?: number | null; lng?: number | null; settings: Awaited<ReturnType<typeof loadPricingSettings>>;
}) {
  const { vendor, subtotal, deliveryAddress, isReceiptPickup, settings } = opts;
  const cfg = settings.pricing;
  const vendorHasLocation = validCoord(vendor?.latitude, vendor?.longitude);
  const customerHasPin = validCoord(opts.lat, opts.lng);
  const maxKm = vendor?.maxDeliveryKm ?? cfg.defaultMaxKm ?? null;

  let distanceKm: number | null = null;
  if (vendorHasLocation && customerHasPin) {
    distanceKm = Math.round(haversineKm(vendor.latitude, vendor.longitude, opts.lat as number, opts.lng as number) * (cfg.roadFactor || 1) * 10) / 10;
  }
  const outOfRange = distanceKm !== null && !!maxKm && distanceKm > maxKm;
  const base = { distanceKm, outOfRange, maxKm, vendorHasLocation, pricingMode: cfg.mode };

  if ((subtotal <= 0 && !isReceiptPickup) || settings.globalFreeDelivery || !vendor || vendor.freeDelivery) {
    return { ...base, fee: 0, usedDistance: false };
  }

  const useDistance = cfg.mode !== "zones" && distanceKm !== null;
  let fee: number;
  if (useDistance) {
    const extraKm = Math.max(0, (distanceKm as number) - (cfg.baseKm || 0));
    fee = (cfg.baseFee || 0) + Math.ceil(extraKm) * (cfg.perKm || 0);
    fee = Math.max(fee, cfg.minFee || 0);
    if (cfg.mode === "distance_zones") fee += await extremeSurcharge(deliveryAddress);
  } else {
    // ZONES -- identical to the original calculation.
    fee = vendor.deliveryFee !== undefined && vendor.deliveryFee !== null ? vendor.deliveryFee : 750;
    fee += await extremeSurcharge(deliveryAddress);
    if (deliveryAddress) {
      const vr = getRegion(vendor.address), cr = getRegion(deliveryAddress);
      if (vr !== "other" && cr !== "other" && vr !== cr) fee += 850;
    }
  }
  if (deliveryAddress) fee += surgeExtras(settings.surge);
  const roundTo = useDistance ? cfg.roundTo || 0 : 0;
  if (roundTo > 0) fee = Math.ceil(fee / roundTo) * roundTo;
  return { ...base, fee: Math.max(0, Math.round(fee)), usedDistance: useDistance };
}

export function computeServiceFee(vendor: any, subtotal: number, isReceiptPickup: boolean, settings: Awaited<ReturnType<typeof loadPricingSettings>>) {
  if (isReceiptPickup) return Math.max(50, Number(settings.receiptPickup?.flatServiceFee) || 0);
  if (!vendor || subtotal <= 0) return 0;
  if (vendor.serviceFeeType != null && vendor.serviceFeeValue != null) {
    return vendor.serviceFeeType === "percentage" ? Math.round((subtotal * vendor.serviceFeeValue) / 100) : vendor.serviceFeeValue;
  }
  if (vendor.serviceFee != null) return vendor.serviceFee;
  if (settings.globalServiceFeeType === "flat") return settings.globalServiceFeeValue;
  if (settings.globalServiceFeeType === "percentage") return Math.round((subtotal * settings.globalServiceFeeValue) / 100);
  const cat = vendor.category || "restaurant";
  const v = settings.categoryServiceFees?.[cat];
  return v !== undefined && v !== null ? v : 300;
}

export function applyBatchDiscount(fee: number, settings: Awaited<ReturnType<typeof loadPricingSettings>>) {
  if (settings.batchDiscountType === "free") return 0;
  if (settings.batchDiscountType === "flat") return Math.max(0, fee - settings.batchDiscountValue);
  return Math.max(0, Math.round(fee - (fee * settings.batchDiscountValue) / 100));
}

// Re-prices the cart from the database. Quantities must be whole numbers
// 1-100; add-on prices come from the product record, never the browser.
export async function priceItems(vendorId: string, items: any[]): Promise<{ subtotal: number; lines: any[] } | { error: string }> {
  const dbProducts: any[] = await db.select().from(products).where(eq(products.vendorId, vendorId));
  let subtotal = 0;
  const lines: any[] = [];
  for (const item of items || []) {
    const p = dbProducts.find((x) => x.id === item?.productId);
    if (!p) return { error: `A product in your cart is no longer available. Please refresh your cart.` };
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) return { error: "Invalid quantity in cart." };

    const allAddons: any[] = [
      ...(Array.isArray(p.addons) ? p.addons : []),
      ...((Array.isArray(p.addonGroups) ? p.addonGroups : []).flatMap((g: any) => (Array.isArray(g?.addons) ? g.addons : []))),
    ];
    let unit = Number(p.price) || 0;
    const addonsOut: any[] = [];
    for (const a of Array.isArray(item.selectedAddons) ? item.selectedAddons : []) {
      const real = allAddons.find((x) => x?.id === a?.id) || allAddons.find((x) => x?.name === a?.name);
      if (!real) return { error: `An add-on in your cart ("${a?.name || "item"}") is no longer available. Please refresh your cart.` };
      const aq = a.quantity === undefined ? 1 : Number(a.quantity);
      if (!Number.isInteger(aq) || aq < 1 || aq > 20) return { error: "Invalid add-on quantity." };
      unit += (Number(real.price) || 0) * aq;
      addonsOut.push({ ...a, price: Number(real.price) || 0, quantity: aq });
    }
    subtotal += unit * qty;
    lines.push({ ...item, quantity: qty, price: Number(p.price) || 0, name: p.name, selectedAddons: addonsOut });
  }
  return { subtotal, lines };
}

export async function quoteOrder(opts: {
  vendorId: string; items: any[]; deliveryAddress: string; isReceiptPickup: boolean;
  lat?: number | null; lng?: number | null; batch?: boolean;
}): Promise<(FeeQuote & { lines: any[]; vendor: any }) | { error: string }> {
  const vendor = (await db.select().from(vendors).where(eq(vendors.id, opts.vendorId)).limit(1))[0] as any;
  if (!vendor) return { error: "Vendor not found." };
  const settings = await loadPricingSettings();

  let subtotal = 0;
  let lines: any[] = [];
  if (!opts.isReceiptPickup) {
    const priced = await priceItems(vendor.id, opts.items);
    if ("error" in priced) return priced;
    subtotal = priced.subtotal;
    lines = priced.lines;
  }

  const d = await computeDeliveryFee({ vendor, subtotal, deliveryAddress: opts.deliveryAddress || "", isReceiptPickup: opts.isReceiptPickup, lat: opts.lat, lng: opts.lng, settings });
  const deliveryFee = opts.batch ? applyBatchDiscount(d.fee, settings) : d.fee;
  const serviceFee = computeServiceFee(vendor, subtotal, opts.isReceiptPickup, settings);
  const tax = settings.vatEnabled ? Math.round(subtotal * (settings.vatRate / 100)) : 0;

  return {
    vendor, lines, subtotal, deliveryFee, normalDeliveryFee: d.fee, serviceFee, tax,
    total: subtotal + deliveryFee + serviceFee + tax,
    distanceKm: d.distanceKm, pricingMode: d.pricingMode, usedDistance: d.usedDistance,
    outOfRange: d.outOfRange, maxKm: d.maxKm, vendorHasLocation: d.vendorHasLocation,
  };
}
