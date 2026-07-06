import React, { useState, useMemo } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Product, Vendor, Addon, Order, User, OrderStatus } from "../types";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User as UserIcon, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  Printer, 
  Layers, 
  Coins, 
  Clock, 
  Store,
  ChevronRight,
  Info,
  X,
  FileText,
  Check
} from "lucide-react";

interface PosCartItem {
  id: string; // unique cart entry id
  product: Product;
  quantity: number;
  selectedAddons: Addon[];
}

export const AdminPOS: React.FC = () => {
  const { 
    products, 
    vendors, 
    users, 
    categoryServiceFees, 
    adminCreateOrder,
    calculateDeliveryFee,
    calculateServiceFee,
    currency,
    vatEnabled,
    vatRate
  } = useDatabase();

  // POS State
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Checkout Info
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [walkInName, setWalkInName] = useState("Walk-in Guest");
  const [walkInPhone, setWalkInPhone] = useState("+234 ");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  
  // Fulfillment & Fees
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("In-Store Counter Checkout");
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number | "auto">("auto");
  const [customServiceFee, setCustomServiceFee] = useState<number | "auto">("auto");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [initialOrderStatus, setInitialOrderStatus] = useState<OrderStatus>("delivered");

  // Addon Modal State
  const [addonModalProduct, setAddonModalProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [posAddonSelections, setPosAddonSelections] = useState<Record<string, any>>({});

  // Receipt Success Modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // 1. Get all customers
  const customers = useMemo(() => {
    return users.filter(u => u.role === "customer");
  }, [users]);

  // 2. Get active unique categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // 3. Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isAvailable) return false;
      
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVendor = selectedVendorId === "all" || p.vendorId === selectedVendorId;
      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;

      return matchesSearch && matchesVendor && matchesCategory;
    });
  }, [products, searchQuery, selectedVendorId, selectedCategory]);

  // Handle Add to Cart
  const handleProductClick = (product: Product) => {
    const hasAddons = (product.addons && product.addons.length > 0) || (product.addonGroups && product.addonGroups.length > 0);
    if (hasAddons) {
      setAddonModalProduct(product);
      setSelectedAddons([]);
      setPosAddonSelections({});
    } else {
      addToPosCart(product, []);
    }
  };

  const addToPosCart = (product: Product, addons: Addon[]) => {
    // Check if item with same product & addons is already in cart (matching exact IDs and quantities)
    const existingIndex = cart.findIndex(item => {
      if (item.product.id !== product.id) return false;
      const itemAddons = item.selectedAddons || [];
      if (itemAddons.length !== addons.length) return false;
      const sSorted = [...addons].sort((a, b) => a.id.localeCompare(b.id));
      const iSorted = [...itemAddons].sort((a, b) => a.id.localeCompare(b.id));
      return sSorted.every((sa, i) => sa.id === iSorted[i].id && (sa.quantity || 1) === (iSorted[i].quantity || 1));
    });

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      const newItem: PosCartItem = {
        id: `pos-${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        product,
        quantity: 1,
        selectedAddons: addons
      };
      setCart(prev => [...prev, newItem]);
    }
    
    setAddonModalProduct(null);
    setSelectedAddons([]);
    setPosAddonSelections({});
  };

  // Toggle addon selection in modal
  const handleToggleAddon = (addon: Addon) => {
    if (selectedAddons.find(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      if (addonModalProduct?.maxAddons !== undefined && addonModalProduct.maxAddons > 0) {
        if (selectedAddons.length >= addonModalProduct.maxAddons) {
          return;
        }
      }
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Update Cart quantities
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as PosCartItem[];
    setCart(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Compute detailed financial calculations
  const { subtotal, tax, deliveryFee, serviceFee, grandTotal, targetVendor } = useMemo(() => {
    let sub = 0;
    let vendorObj: Vendor | undefined = undefined;

    cart.forEach(item => {
      const addonsPrice = item.selectedAddons.reduce((acc, a) => acc + ((a.price ?? 0) * (a.quantity ?? 1)), 0);
      sub += (item.product.price + addonsPrice) * item.quantity;
      if (!vendorObj) {
        vendorObj = vendors.find(v => v.id === item.product.vendorId);
      }
    });

    const calculatedTax = vatEnabled ? Math.round(sub * (vatRate / 100)) : 0; // Dynamic VAT

    let delFee = 0;
    if (fulfillmentType === "delivery") {
      if (customDeliveryFee === "auto") {
        delFee = calculateDeliveryFee(vendorObj?.id, sub);
      } else {
        delFee = customDeliveryFee;
      }
    }

    let servFee = 0;
    if (sub > 0) {
      if (customServiceFee === "auto") {
        servFee = calculateServiceFee(vendorObj?.id, sub);
      } else {
        servFee = customServiceFee;
      }
    }

    return {
      subtotal: sub,
      tax: calculatedTax,
      deliveryFee: delFee,
      serviceFee: servFee,
      grandTotal: Math.round(sub + calculatedTax + delFee + servFee),
      targetVendor: vendorObj as Vendor | undefined
    };
  }, [cart, fulfillmentType, customDeliveryFee, customServiceFee, vendors, calculateDeliveryFee, calculateServiceFee]);

  // Handle Order Placement / Completion
  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    // Resolve Customer
    let customerName = walkInName;
    let customerPhone = walkInPhone;
    let customerId = "walk-in";

    if (!isWalkIn) {
      const userObj = customers.find(c => c.id === selectedCustomerId);
      if (userObj) {
        customerName = userObj.name;
        customerPhone = userObj.phone;
        customerId = userObj.id;
      } else {
        alert("Please select a registered customer.");
        return;
      }
    }

    // Resolve Vendor details
    const finalVendor = targetVendor || vendors[0];
    if (!finalVendor) {
      alert("No vendor associated with these products.");
      return;
    }

    const newOrder: Order = {
      id: "ord-" + Math.floor(1000 + Math.random() * 9000),
      customerId,
      customerName,
      customerPhone,
      vendorId: finalVendor.id,
      vendorName: finalVendor.name,
      status: initialOrderStatus,
      totalAmount: grandTotal,
      deliveryAddress: fulfillmentType === "pickup" ? "Walk-in Counter (Pickup)" : deliveryAddress,
      paymentMethod: `${paymentMethod} (POS)`,
      createdAt: new Date().toISOString(),
      serviceFee,
      deliveryFee,
      tax,
      items: cart.map(item => {
        const addonsPrice = item.selectedAddons.reduce((acc, a) => acc + ((a.price ?? 0) * (a.quantity ?? 1)), 0);
        const addonsLabel = item.selectedAddons.length > 0 
          ? ` (${item.selectedAddons.map(a => `${a.name}${a.quantity && a.quantity > 1 ? ` (x${a.quantity})` : ""}`).join(", ")})` 
          : "";
        return {
          id: `oi-${Math.random().toString(36).substring(2, 9)}`,
          orderId: "", // will match on storage
          productId: item.product.id,
          name: item.product.name + addonsLabel,
          price: item.product.price + addonsPrice,
          quantity: item.quantity
        };
      })
    };

    adminCreateOrder(newOrder);
    setCompletedOrder(newOrder);
    setShowReceiptModal(true);

    // Reset checkout state
    setCart([]);
    setIsWalkIn(true);
    setWalkInName("Walk-in Guest");
    setWalkInPhone("+234 ");
    setDeliveryAddress("In-Store Counter Checkout");
    setFulfillmentType("pickup");
    setCustomDeliveryFee("auto");
    setCustomServiceFee("auto");
  };

  return (
    <div id="admin-pos-workspace" className="space-y-6">
      {/* Banner / Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#070329] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="z-10">
          <span className="text-[10px] tracking-widest font-mono text-purple-300 uppercase font-black bg-purple-950/50 px-3 py-1.5 rounded-full border border-purple-800/40">ADMIN TOOLS</span>
          <h1 className="text-xl sm:text-2xl font-black mt-2">Point Of Sale (POS) Console</h1>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            In-store and on-behalf sales processor. Instantly checkout any item listed across vendors on behalf of guests or platform customers.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 z-10 font-mono text-xs">
          <Layers className="w-4 h-4 text-purple-300" />
          <span>Catalog Items: <strong className="text-white text-sm">{products.length}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Catalog Browser (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search catalog items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 border border-gray-250/75 rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-purple-50 transition font-sans text-gray-900"
                />
              </div>

              {/* Vendor Selector */}
              <div>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-255 rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-purple-50 transition font-sans text-gray-700 cursor-pointer"
                >
                  <option value="all">🏢 All Listed Vendors</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.category || "restaurant"})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Tags Horizontal bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-50">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-2">Category:</span>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition cursor-pointer ${
                  selectedCategory === "all" 
                    ? "bg-purple-600 text-white shadow-sm" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition cursor-pointer ${
                    selectedCategory === cat 
                      ? "bg-purple-600 text-white shadow-sm" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCTS GRID */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-3">
              <span className="text-4xl block">🔎</span>
              <h3 className="font-bold text-gray-800">No available products found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">Try resetting filters or adjusting search terms to discover items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(p => {
                const vendor = vendors.find(v => v.id === p.vendorId);
                return (
                  <div 
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className="group bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 hover:shadow-md hover:border-purple-200 transition cursor-pointer relative overflow-hidden text-left"
                  >
                    {/* Image placeholder */}
                    <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-300 font-bold font-sans">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>🍽️</span>
                      )}
                    </div>

                    <div className="flex-grow flex flex-col justify-between min-w-0 py-0.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 truncate max-w-[120px]">
                            {vendor?.name || "Merchant"}
                          </span>
                          {((p.addons && p.addons.length > 0) || (p.addonGroups && p.addonGroups.length > 0)) && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title="Includes customizable options">
                              Options+
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-purple-700 transition line-clamp-1">{p.name}</h4>
                        <p className="text-[11px] text-gray-400 line-clamp-1">{p.description || "Fresh platform items cataloged"}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50/50">
                        <span className="font-mono font-black text-gray-950 text-xs">{currency}{(p.price ?? 0).toLocaleString()}</span>
                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white px-2.5 py-1 rounded-lg border border-purple-100 transition flex items-center gap-1">
                          <Plus className="w-3 h-3" /> ADD
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: POS Checkout & Cart Controller (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
            
            {/* CART HEADER */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#070329]" />
                <h3 className="font-extrabold text-sm text-gray-900 uppercase">POS Cart Items</h3>
              </div>
              <span className="px-2.5 py-1 bg-[#070329] text-white text-[10px] font-bold rounded-full font-mono">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
              </span>
            </div>

            {/* CART LIST */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <span className="text-3xl block">🛒</span>
                <p className="text-xs font-semibold">POS Cart is currently empty.</p>
                <p className="text-[10px] max-w-[200px] mx-auto text-gray-400">Tap products on the catalog list on the left to add items to cart.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
                {cart.map(item => {
                  const addonsPrice = item.selectedAddons.reduce((acc, a) => acc + ((a.price ?? 0) * (a.quantity ?? 1)), 0);
                  const basePrice = item.product.price + addonsPrice;
                  const itemTotal = basePrice * item.quantity;
                  
                  return (
                    <div key={item.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between gap-3 text-left">
                      <div className="min-w-0 space-y-0.5">
                        <h5 className="font-bold text-xs text-gray-900 truncate">{item.product.name}</h5>
                        {item.selectedAddons.length > 0 && (
                          <p className="text-[9px] text-gray-500 font-sans italic truncate">
                            + {item.selectedAddons.map(a => `${a.name}${a.quantity && a.quantity > 1 ? ` (x${a.quantity})` : ""} (${currency}${((a.price ?? 0) * (a.quantity ?? 1))}`).join(", ")}
                          </p>
                        )}
                        <span className="font-mono text-[10px] text-gray-400 font-semibold block">
                          {currency}{basePrice.toLocaleString()} each
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Quantity triggers */}
                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-1.5 py-1 rounded-xl">
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono text-xs font-bold px-1.5 text-gray-800">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Cost & Delete */}
                        <div className="text-right flex flex-col justify-center min-w-[70px]">
                          <span className="font-mono font-black text-xs text-[#070329]">{currency}{itemTotal.toLocaleString()}</span>
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 text-[10px] font-bold flex items-center gap-0.5 justify-end mt-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Del
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CUSTOMER SELECTOR */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-[11px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Customer Identity
                </h4>
                
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button 
                    onClick={() => setIsWalkIn(true)}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${isWalkIn ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    Walk-In
                  </button>
                  <button 
                    onClick={() => {
                      setIsWalkIn(false);
                      if (customers.length > 0 && !selectedCustomerId) {
                        setSelectedCustomerId(customers[0].id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${!isWalkIn ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    Platform User
                  </button>
                </div>
              </div>

              {isWalkIn ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">Guest Full Name</label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:bg-white text-gray-800 font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">Contact Phone</label>
                    <input
                      type="text"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:bg-white text-gray-800 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Choose Registered Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none text-gray-700 cursor-pointer font-sans"
                  >
                    {customers.length === 0 ? (
                      <option value="">No platform customers found</option>
                    ) : (
                      customers.map(c => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} ({c.phone || c.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* FULFILLMENT & LOGISTICS */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-[11px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Delivery & Fulfillment
                </h4>
                
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button 
                    onClick={() => setFulfillmentType("pickup")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${fulfillmentType === "pickup" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    In-Store Counter
                  </button>
                  <button 
                    onClick={() => {
                      setFulfillmentType("delivery");
                      if (deliveryAddress === "In-Store Counter Checkout") {
                        setDeliveryAddress("");
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${fulfillmentType === "delivery" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    Dispatch Courier
                  </button>
                </div>
              </div>

              {fulfillmentType === "delivery" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">Physical Delivery Address</label>
                    <textarea
                      placeholder="Enter delivery residential or business address..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:bg-white text-gray-800 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500">Custom Delivery Fee ({currency})</label>
                      <select
                        value={customDeliveryFee}
                        onChange={(e) => setCustomDeliveryFee(e.target.value === "auto" ? "auto" : Number(e.target.value))}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none text-gray-700 cursor-pointer"
                      >
                        <option value="auto">Auto calculate</option>
                        <option value={0}>{currency}0 (Free Delivery)</option>
                        <option value={500}>{currency}500 (Discounted)</option>
                        <option value={750}>{currency}750 (Standard)</option>
                        <option value={1200}>{currency}1,200 (Express)</option>
                        <option value={2000}>{currency}2,000 (Prime Remote)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500">Service Fee Override ({currency})</label>
                      <select
                        value={customServiceFee}
                        onChange={(e) => setCustomServiceFee(e.target.value === "auto" ? "auto" : Number(e.target.value))}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none text-gray-700 cursor-pointer"
                      >
                        <option value="auto">Auto calculate</option>
                        <option value={0}>{currency}0 (Waive Fee)</option>
                        <option value={150}>{currency}150 (Discounted)</option>
                        <option value={350}>{currency}350 (Standard Category)</option>
                        <option value={500}>{currency}500 (Premium Category)</option>
                        <option value={750}>{currency}750 (Expedited)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PAYMENT METRICS & OPTIONS */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h4 className="font-black text-[11px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Payment & Status Setup
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none text-gray-700 cursor-pointer font-sans font-medium"
                  >
                    <option value="Cash">💵 Cash Handover</option>
                    <option value="POS Card Terminal">💳 POS Card Terminal</option>
                    <option value="Direct Bank Transfer">🏦 Bank Transfer</option>
                    <option value="Store Credit">🎁 Store Credits</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Set Initial Order Status</label>
                  <select
                    value={initialOrderStatus}
                    onChange={(e) => setInitialOrderStatus(e.target.value as OrderStatus)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none text-gray-700 cursor-pointer font-sans font-medium"
                  >
                    <option value="delivered">✅ Delivered (Immediate Counter Sale)</option>
                    <option value="pending">⏳ Pending Dispatch (In Queue)</option>
                    <option value="accepted">🧑‍🍳 Accepted / Preparing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BILL SUMMARY PANEL */}
            <div className="pt-5 border-t border-gray-100 space-y-2.5">
              <div className="flex justify-between text-xs text-gray-500 font-sans">
                <span>Items Subtotal</span>
                <span className="font-mono text-gray-700">{currency}{subtotal.toLocaleString()}</span>
              </div>
              {vatEnabled && (
                <div className="flex justify-between text-xs text-gray-500 font-sans">
                  <span>Estimated VAT ({vatRate}%)</span>
                  <span className="font-mono text-gray-700">{currency}{Math.round(tax).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500 font-sans">
                <span>Dispatch / Delivery Fee</span>
                <span className="font-mono text-gray-700">{deliveryFee > 0 ? `${currency}${deliveryFee.toLocaleString()}` : `${currency}0`}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-sans">
                <span>Service Fee</span>
                <span className="font-mono text-gray-700">{currency}{serviceFee.toLocaleString()}</span>
              </div>
              
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-extrabold text-sm text-gray-950 uppercase">Grand Total Due</span>
                <span className="font-black text-xl text-[#070329] font-mono">{currency}{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* CHECKOUT TRIGGER ACTION */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className={`w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                cart.length > 0 
                  ? "bg-[#070329] hover:bg-indigo-950 text-white shadow-indigo-100 hover:translate-y-[-1px]" 
                  : "bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Complete Sales Checkout
            </button>

          </div>
        </div>
      </div>

      {/* MODAL 1: ADDON CUSTOMIZATION */}
      {addonModalProduct && (() => {
        const addonGroups = addonModalProduct.addonGroups && addonModalProduct.addonGroups.length > 0
          ? addonModalProduct.addonGroups
          : addonModalProduct.addons && addonModalProduct.addons.length > 0
            ? [{
                id: "legacy-group",
                name: "Available Addons",
                isRequired: false,
                maxSelections: addonModalProduct.maxAddons,
                addons: addonModalProduct.addons
              }]
            : [];

        const getGroupSelectionCount = (groupId: string) => {
          return (Object.values(posAddonSelections) as any[])
            .filter(sel => sel.groupId === groupId)
            .reduce((sum, sel) => sum + sel.quantity, 0);
        };

        const isGroupValid = (group: any) => {
          const count = getGroupSelectionCount(group.id);
          if (group.isRequired) {
            const min = group.minSelections ?? 1;
            if (count < min) return false;
          }
          if (group.maxSelections !== undefined && group.maxSelections > 0) {
            if (count > group.maxSelections) return false;
          }
          return true;
        };

        const isAllSelectionsValid = addonGroups.every(isGroupValid);

        const currentAddonsList = (Object.values(posAddonSelections) as any[]).map(sel => ({
          ...sel.addon,
          quantity: sel.quantity,
          groupId: sel.groupId
        }));

        const totalCustomPrice = (addonModalProduct.price ?? 0) + currentAddonsList.reduce((sum, a) => sum + ((a.price ?? 0) * (a.quantity ?? 1)), 0);

        return (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl border border-gray-150 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">ADDON SELECTION</span>
                  <h3 className="font-bold text-lg text-gray-950 mt-1.5">{addonModalProduct.name}</h3>
                  <span className="text-xs text-gray-400 font-mono">Base Price: {currency}{(addonModalProduct.price ?? 0).toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => setAddonModalProduct(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto flex-grow pr-1 py-1">
                {addonGroups.map((group: any) => {
                  const groupTotalSelected = getGroupSelectionCount(group.id);
                  const isSingleSelect = group.maxSelections === 1;

                  return (
                    <div key={group.id} className="space-y-3">
                      <div className="pb-1 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 uppercase">{group.name}</h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {group.isRequired ? (
                              <b className="text-amber-600">Required (Choose {group.minSelections ?? 1})</b>
                            ) : (
                              <span>Optional {group.maxSelections ? `(Choose up to ${group.maxSelections})` : ""}</span>
                            )}
                          </span>
                        </div>
                        {isGroupValid(group) ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-150 px-2 py-0.5 rounded font-extrabold uppercase">Satisfied</span>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-150 px-2 py-0.5 rounded font-extrabold uppercase animate-pulse">Required</span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {group.addons.map((addon: any) => {
                          const selection = posAddonSelections[addon.id];
                          const quantity = selection ? selection.quantity : 0;
                          const isSelected = quantity > 0;

                          const maxGroupSelections = group.maxSelections;
                          const groupLimitReached = maxGroupSelections !== undefined && maxGroupSelections > 0 && groupTotalSelected >= maxGroupSelections;
                          const isAddonDisabled = !isSelected && groupLimitReached && !isSingleSelect;

                          const handleIncrement = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (maxGroupSelections !== undefined && maxGroupSelections > 0 && groupTotalSelected >= maxGroupSelections) {
                              return;
                            }
                            const maxPerAddon = group.maxQuantityPerAddon || 99;
                            if (quantity >= maxPerAddon) return;

                            setPosAddonSelections({
                              ...posAddonSelections,
                              [addon.id]: { addon, quantity: quantity + 1, groupId: group.id }
                            });
                          };

                          const handleDecrement = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (quantity <= 1) {
                              const updated = { ...posAddonSelections };
                              delete updated[addon.id];
                              setPosAddonSelections(updated);
                            } else {
                              setPosAddonSelections({
                                ...posAddonSelections,
                                [addon.id]: { addon, quantity: quantity - 1, groupId: group.id }
                              });
                            }
                          };

                          const handleToggle = () => {
                            if (isSingleSelect) {
                              const updated = { ...posAddonSelections };
                              Object.keys(updated).forEach(id => {
                                if (updated[id].groupId === group.id) {
                                  delete updated[id];
                                }
                              });
                              updated[addon.id] = { addon, quantity: 1, groupId: group.id };
                              setPosAddonSelections(updated);
                            } else {
                              if (isSelected) {
                                const updated = { ...posAddonSelections };
                                delete updated[addon.id];
                                setPosAddonSelections(updated);
                              } else {
                                if (isAddonDisabled) return;
                                setPosAddonSelections({
                                  ...posAddonSelections,
                                  [addon.id]: { addon, quantity: 1, groupId: group.id }
                                });
                              }
                            }
                          };

                          return (
                            <div
                              key={addon.id}
                              onClick={handleToggle}
                              className={`p-3 rounded-xl border flex items-center justify-between transition text-left select-none ${
                                isSelected
                                  ? "bg-purple-50/55 border-purple-300 text-purple-950 font-bold cursor-pointer"
                                  : isAddonDisabled
                                    ? "bg-gray-50 border-gray-100 text-gray-400 opacity-40 cursor-not-allowed"
                                    : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                                  isSingleSelect ? "rounded-full" : "rounded"
                                } ${
                                  isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300"
                                }`}>
                                  {isSelected && (
                                    isSingleSelect
                                      ? <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                      : <Check className="w-3 h-3 text-white stroke-[3px]" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-xs font-semibold block">{addon.name}</span>
                                  {addon.price > 0 && (
                                    <span className="text-[10px] text-gray-400 font-mono">+{currency}{(addon.price ?? 0).toLocaleString()}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center">
                                {group.allowMultipleQuantity && isSelected && (
                                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 shadow-xs rounded-lg px-1 py-0.5">
                                    <button
                                      type="button"
                                      onClick={handleDecrement}
                                      className="w-5 h-5 rounded bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-4 text-center text-xs font-black font-mono">{quantity}</span>
                                    <button
                                      type="button"
                                      onClick={handleIncrement}
                                      className="w-5 h-5 rounded bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 shrink-0 font-sans">
                <div className="text-left">
                  <span className="text-[10px] text-gray-400 block font-semibold">Total Price:</span>
                  <span className="font-mono text-base font-black text-gray-950">
                    {currency}{totalCustomPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddonModalProduct(null)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!isAllSelectionsValid}
                    onClick={() => {
                      if (isAllSelectionsValid) {
                        addToPosCart(addonModalProduct, currentAddonsList);
                      }
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition ${
                      isAllSelectionsValid
                        ? "bg-purple-600 hover:bg-purple-700 cursor-pointer"
                        : "bg-gray-300 cursor-not-allowed opacity-60"
                    }`}
                  >
                    Confirm & Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: SUCCESS RECEIPT MODAL */}
      {showReceiptModal && completedOrder && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Confetti / Ribbon decoration */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500"></div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-gray-950">Sale Processed Successfully!</h3>
              <p className="text-xs text-gray-400">Transaction recorded under order <strong className="font-mono text-gray-800">{completedOrder.id}</strong></p>
            </div>

            {/* Simulated Receipt paper layout */}
            <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl space-y-4 font-mono text-[11px] text-gray-700 shadow-inner">
              <div className="text-center border-b border-dashed border-gray-300 pb-3">
                <h4 className="font-black text-xs text-gray-950 uppercase tracking-wider">OWODE FOOD PLATFORM</h4>
                <p className="text-[10px] text-gray-400">Official POS Sales Receipt</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(completedOrder.createdAt).toLocaleString()}</p>
              </div>

              {/* Transaction details */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Merchant:</span>
                  <span className="font-bold text-gray-800 text-right max-w-[150px] truncate">{completedOrder.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer:</span>
                  <span className="font-bold text-gray-800 text-right max-w-[150px] truncate">{completedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tel/Phone:</span>
                  <span className="font-bold text-gray-800">{completedOrder.customerPhone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fulfillment:</span>
                  <span className="font-bold text-gray-800 text-right max-w-[150px] truncate">{completedOrder.deliveryAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pay Mode:</span>
                  <span className="font-bold text-purple-700">{completedOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-b border-dashed border-gray-300 pb-3">
                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 pb-1">
                  <span className="col-span-6">ITEM</span>
                  <span className="col-span-2 text-center">QTY</span>
                  <span className="col-span-4 text-right">TOTAL</span>
                </div>
                
                {completedOrder.items.map((oi, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[10px]">
                    <span className="col-span-6 text-gray-800 font-semibold truncate" title={oi.name}>{oi.name}</span>
                    <span className="col-span-2 text-center text-gray-500">{oi.quantity}</span>
                    <span className="col-span-4 text-right font-black text-gray-800">{currency}{((oi.price ?? 0) * oi.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Money Totals */}
              <div className="space-y-1 pt-1 text-right">
                {completedOrder.tax !== undefined && completedOrder.tax !== null && completedOrder.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-left">EST. VAT:</span>
                    <span className="font-bold">{currency}{(completedOrder.tax ?? 0).toLocaleString()}</span>
                  </div>
                )}
                {completedOrder.serviceFee !== undefined && completedOrder.serviceFee !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-left">SERVICE FEE:</span>
                    <span className="font-bold">{currency}{(completedOrder.serviceFee ?? 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                  <span className="font-bold text-gray-950 text-left">AMOUNT PAID:</span>
                  <span className="font-black text-xs text-[#070329]">{currency}{(completedOrder.totalAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-gray-400 border-t border-dashed border-gray-300">
                <p>--- Thank you for your patronage! ---</p>
                <p className="mt-0.5">Admin-Assisted In-Store Checkout</p>
              </div>
            </div>

            {/* Receipt Modal Trigger actions */}
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-xs font-bold text-gray-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-3 px-4 bg-[#070329] hover:bg-indigo-950 rounded-2xl text-xs font-bold text-white transition flex items-center justify-center cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
