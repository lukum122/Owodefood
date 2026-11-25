// What a restaurant actually sold on an order: the food (items + add-ons).
// order.totalAmount is what the CUSTOMER paid, which also includes the
// delivery fee, service fee and VAT -- none of which belong to the vendor.
export function foodSubtotal(o: { totalAmount?: number; serviceFee?: number; deliveryFee?: number; tax?: number }): number {
  return Math.max(0, (o.totalAmount ?? 0) - (o.serviceFee ?? 0) - (o.deliveryFee ?? 0) - (o.tax ?? 0));
}

/** Food subtotal minus the platform's commission on this vendor. */
export function vendorTakeHome(o: any, vendor: { commissionType?: string; commissionValue?: number } | null | undefined): number {
  const sub = foodSubtotal(o);
  const type = vendor?.commissionType || "percentage";
  const val = vendor?.commissionValue ?? 15;
  return Math.round(type === "flat" ? Math.max(0, sub - val) : Math.max(0, sub - (sub * val) / 100));
}
