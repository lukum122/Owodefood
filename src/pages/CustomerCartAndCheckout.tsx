import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { CartItem } from "../types";
import { isVendorOpen } from "../types";
import { Trash2, ArrowRight, ShoppingCart, MapPin, CreditCard, CheckCircle2, Landmark, ShieldCheck, ShieldAlert, Loader2, Phone, Layers, AlertTriangle, Wallet, Shield, Lock, KeyRound, Copy, AlertCircle, User, Mail } from "lucide-react";

export const CustomerCart: React.FC = () => {
  const { vendors, cart, updateCartQuantity, removeFromCart, clearCart, calculateDeliveryFee, calculateServiceFee, currency, vatEnabled, vatRate, maxCartItems } = useDatabase();
  const navigate = useNavigate();
  const [addonPromptItem, setAddonPromptItem] = useState<CartItem | null>(null);

  const handleIncreaseQuantity = (item: CartItem) => {
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      setAddonPromptItem(item);
    } else {
      updateCartQuantity(item.id, item.quantity + 1);
    }
  };

  // Dynamic cost calculation incorporating custom addons
  const total = cart.reduce((sum, item) => {
    const addonCost = (item.selectedAddons || []).reduce((s, a) => s + ((a.price ?? 0) * (a.quantity ?? 1)), 0);
    return sum + ((item.product.price + addonCost) * item.quantity);
  }, 0);
  const tax = vatEnabled ? total * (vatRate / 100) : 0; // Dynamic VAT
  const firstCartItem = cart[0];
  const cartVendor = firstCartItem ? vendors.find(v => v.id === firstCartItem.product.vendorId) : null;
  const deliveryFee = calculateDeliveryFee(cartVendor?.id, total);
  const serviceFee = calculateServiceFee(cartVendor?.id, total);
  const grandTotal = total + tax + deliveryFee + serviceFee;

  if (cart.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto font-sans">
        <div className="w-16 h-16 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-4 border border-gray-100">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-[#070329] tracking-tight">Your cart is empty</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Add smoky party Jollof rice, crispy chicken, or fresh drinks from local vendors to get started.
        </p>
        <Link 
          to="/" 
          className="mt-6 inline-flex items-center gap-2 py-3 px-6 bg-[#070329] hover:bg-[#0ea5e9] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow transition"
        >
          View Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-[#070329] tracking-tight">Review Your Food Basket</h1>
        <p className="text-xs text-gray-500 mt-0.5">Ordering secure partner inventory with real-time fleet dispatch.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cart Item lists */}
        <div className="lg:col-span-8 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Basket Items ({cart.length})</span>
              <div className="px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full border border-blue-100">
                Bike Limit: {maxCartItems} Items Max
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[11px] font-bold text-gray-500">
                Order Load: <span className={cart.reduce((sum, item) => sum + item.quantity, 0) >= maxCartItems ? "text-red-650" : "text-[#0ea5e9]"}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>/{maxCartItems}
              </div>
              <button
                onClick={clearCart}
                className="text-xs font-bold text-red-650 hover:text-red-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Empty Cart
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {cart.map((item) => {
              const itemAddonPrice = (item.selectedAddons || []).reduce((s, a) => s + (a.price ?? 0), 0);
              const singleItemTotal = item.product.price + itemAddonPrice;

              return (
                <div key={item.id} className="py-5 flex gap-4 items-center justify-between first:pt-0 last:pb-0 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-grow min-w-0">
                    <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 truncate">{item.product.name}</h4>
                    <p className="text-[11px] text-gray-400 leading-snug tracking-tight line-clamp-1">{item.product.description}</p>
                    
                    {/* Selected Extras list */}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.selectedAddons.map((addon) => (
                          <span key={addon.id} className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold uppercase font-mono tracking-wide border border-gray-200">
                            + {addon.name} {addon.quantity && addon.quantity > 1 ? `x${addon.quantity}` : ""} ({currency}{((addon.price ?? 0) * (addon.quantity ?? 1)).toLocaleString()})
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="text-xs font-extrabold text-[#0ea5e9] font-mono mt-1.5 block">
                      {currency}{(singleItemTotal ?? 0).toLocaleString()} each
                    </span>
                  </div>

                  {/* Adjust Quantities and trash action */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 py-1.5 px-3 rounded-xl border border-gray-150">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="text-gray-500 hover:text-red-500 text-xs font-black cursor-pointer px-1 py-0.5"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold font-mono min-w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleIncreaseQuantity(item)}
                        className="text-gray-500 hover:text-green-500 text-xs font-black cursor-pointer px-1 py-0.5"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-600 transition cursor-pointer p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Subtotals panel side */}
        <div className="lg:col-span-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider leading-none">Checkout Summary</h3>

          <div className="space-y-3.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Fulfillment Subtotal</span>
              <span className="font-bold text-gray-950">{currency}{total.toLocaleString()}</span>
            </div>
            {vatEnabled && (
              <div className="flex justify-between">
                <span>Estimated VAT ({vatRate}%)</span>
                <span>{currency}{Math.round(tax).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Standard Courier Delivery</span>
              <span>{currency}{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee</span>
              <span>{currency}{serviceFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-100 pt-3.5 flex justify-between text-sm">
              <span className="font-extrabold text-gray-950">Grand Total</span>
              <span className="font-black text-[#070329] font-mono text-base">{currency}{Math.round(grandTotal).toLocaleString()}</span>
            </div>
          </div>

          {cartVendor && !isVendorOpen(cartVendor) && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>This kitchen ({cartVendor.name}) is currently closed. You can review items but cannot order until they open.</span>
            </div>
          )}

          {cartVendor && (
            <button
              onClick={() => navigate(`/vendor/${cartVendor.id}`)}
              className="w-full py-3 px-5 text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer mb-3"
            >
              <span>Add More Items</span>
            </button>
          )}

          <button
            onClick={() => navigate("/checkout")}
            disabled={cartVendor ? !isVendorOpen(cartVendor) : false}
            className={`w-full py-3.5 px-5 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition ${
              cartVendor && !isVendorOpen(cartVendor) 
                ? "bg-gray-300 cursor-not-allowed opacity-60" 
                : "bg-[#070329] hover:bg-[#0ea5e9] cursor-pointer"
            }`}
          >
            <span>{cartVendor && !isVendorOpen(cartVendor) ? "Kitchen Closed" : "Proceed to Secure Checkout"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-gray-400 leading-relaxed text-center">
            Secured end-to-end checkout. Real-time courier dispatch initialized immediately on settlement.
          </p>
        </div>

      </div>

      {/* ADDON REPEAT PROMPT MODAL */}
      {addonPromptItem && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Repeat customized item?</h2>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              You've already customized this <span className="font-bold text-gray-800">{addonPromptItem.product.name}</span> with specific add-ons. Do you want to repeat this exact item, or customize a fresh one from the menu?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  updateCartQuantity(addonPromptItem.id, addonPromptItem.quantity + 1);
                  setAddonPromptItem(null);
                }}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition cursor-pointer"
              >
                Repeat Item (Same Add-ons)
              </button>
              
              <button
                onClick={() => {
                  navigate(`/vendor/${addonPromptItem.product.vendorId}`);
                  setAddonPromptItem(null);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-3.5 px-4 rounded-xl transition cursor-pointer"
              >
                Customize New Item
              </button>
              
              <button
                onClick={() => setAddonPromptItem(null)}
                className="w-full text-gray-400 hover:text-gray-600 text-xs font-bold py-2 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CustomerCheckout: React.FC = () => {
  const { 
    vendors, 
    cart, 
    placeOrder, 
    currentUser, 
    paymentGateways, 
    calculateDeliveryFee, 
    calculateServiceFee, 
    availableLocations = [], 
    currency, 
    vatEnabled, 
    vatRate,
    selectedLocation: selectedDistrict,
    setSelectedLocation: setSelectedDistrict,
    coverageGuideText,
    extremeLocations,
    extremeLocationTiers,
    savedAddresses,
    register,
    getUserWalletBalance
  } = useDatabase();
  const navigate = useNavigate();

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Detect matching district from default customer address or use first available
  const initialDistrict = availableLocations.find(loc => {
    const distName = loc.split(",")[0].trim().toLowerCase();
    const defaultAddr = currentUser?.role === "customer" ? "Tanke Road, Ilorin, Kwara" : "";
    return defaultAddr.toLowerCase().includes(distName);
  }) || (availableLocations[0] || "");

  const initialStreet = (() => {
    const defaultAddr = currentUser?.role === "customer" ? "12 Admiralty Way" : "";
    if (initialDistrict) {
      const distName = initialDistrict.split(",")[0].trim();
      const idx = defaultAddr.toLowerCase().indexOf(distName.toLowerCase());
      if (idx !== -1) {
        return defaultAddr.substring(0, idx).replace(/,\s*$/, "").trim();
      }
    }
    return defaultAddr;
  })();

  const [streetAddress, setStreetAddress] = useState(initialStreet);

  // Reactive Wallet Balance tracking
  const checkoutWalletBalance = currentUser ? getUserWalletBalance(currentUser.id) : 0;

  // Derived reactive full delivery address
  const deliveryAddress = streetAddress.trim() + (selectedDistrict ? `, ${selectedDistrict}` : "");

  const [deliveryPhone, setDeliveryPhone] = useState<string>(() => {
    const rawPhone = currentUser?.phone || "";
    // If phone is empty, or is a US number (+1), or contains mock indicators (555)
    if (!rawPhone || rawPhone.startsWith("+1") || rawPhone.includes("555")) {
      return "+234";
    }
    if (rawPhone.startsWith("0")) {
      return "+234" + rawPhone.slice(1);
    }
    if (!rawPhone.startsWith("+")) {
      return "+234" + rawPhone;
    }
    return rawPhone;
  });
  
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");

  // Interactive Sandbox Funding Process for Checkout page
  const [checkoutFundingProcess, setCheckoutFundingProcess] = useState<{
    amount: number;
    stage: "method_select" | "card_entry" | "bank_transfer" | "otp_entry" | "processing" | "success";
    method: "card" | "bank_transfer";
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
    otp: string;
    txRef: string;
    error?: string;
    loaderText?: string;
  } | null>(null);
  const [zoneSearchQuery, setZoneSearchQuery] = useState("");
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [errorWord, setErrorWord] = useState("");

  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [monnifySuccess, setMonnifySuccess] = useState<boolean>(false);
  const [showMonnifyModal, setShowMonnifyModal] = useState<boolean>(false);
  const [monnifyPaying, setMonnifyPaying] = useState<boolean>(false);
  const [monnifyMethod, setMonnifyMethod] = useState<string>("card");

  // Filter active payment gateways
  const activeGateways = (paymentGateways && paymentGateways.length > 0)
    ? paymentGateways.filter(g => g.isEnabled)
    : [
        { id: "credit_card", name: "Credit Card", desc: "Pay with VISA/Mastercard", isEnabled: true },
        { id: "cod", name: "Cash on Delivery", desc: "Pay cash to Courier", isEnabled: true },
        { id: "wallet", name: "Owode Food Wallet", desc: "Pay one-click with credits", isEnabled: true }
      ];

  // Auto select first enabled gateway if current select matches disabled gateway
  React.useEffect(() => {
    if (activeGateways.length > 0) {
      const exists = activeGateways.some(g => g.name === paymentMethod);
      if (!exists) {
        setPaymentMethod(activeGateways[0].name);
      }
    }
  }, [paymentGateways]);

  // Dynamic cost calculation incorporating custom addons
  const total = cart.reduce((sum, item) => {
    const addonCost = (item.selectedAddons || []).reduce((s, a) => s + ((a.price ?? 0) * (a.quantity ?? 1)), 0);
    return sum + ((item.product.price + addonCost) * item.quantity);
  }, 0);
  const tax = vatEnabled ? total * (vatRate / 100) : 0;
  const firstCartItem = cart[0];
  const cartVendor = firstCartItem ? vendors.find(v => v.id === firstCartItem.product.vendorId) : null;
  const deliveryFee = calculateDeliveryFee(cartVendor?.id, total, deliveryAddress);
  const serviceFee = calculateServiceFee(cartVendor?.id, total);
  const grandTotal = total + tax + deliveryFee + serviceFee;

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeMonnifyCheckout = () => {
    setMonnifyPaying(true);
    setTimeout(() => {
      setMonnifyPaying(false);
      setMonnifySuccess(true);
      setShowMonnifyModal(false);
    }, 2500);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setErrorWord("Please state a physical drop-off address.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!deliveryPhone.trim()) {
      setErrorWord("Please state an active delivery phone number.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!currentUser) {
      if (!guestName.trim()) {
        setErrorWord("Please provide your full name to complete guest checkout.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!guestEmail.trim()) {
        setErrorWord("Please provide your email address to complete guest checkout.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      const regRes = register(
        guestName.trim(),
        guestEmail.trim().toLowerCase(),
        deliveryPhone.trim(),
        "customer"
      );
      
      if (!regRes.success) {
        setErrorWord(regRes.error || "Could not register guest user details. If you have an account already, please sign in.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (paymentMethod === "Local Bank Transfer" && !receiptBase64) {
      setErrorWord("Please attach your payment receipt slip image to authorize the manual bank transfer.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paymentMethod === "Monnify (Bank & Card)" && !monnifySuccess) {
      setErrorWord("Please complete your secure payment initialization through the Monnify payment dialog first.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paymentMethod === "Owode Food Wallet") {
      const currentBalance = checkoutWalletBalance;
      if (currentBalance < grandTotal) {
        setErrorWord(`Insufficient wallet balance. Total is ${currency}${grandTotal.toLocaleString()}, but your balance is ${currency}${currentBalance.toLocaleString()}. Please reload your wallet to complete purchase.`);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const { success } = placeOrder(
      deliveryAddress.trim(),
      paymentMethod,
      deliveryPhone.trim(),
      paymentMethod === "Local Bank Transfer" ? receiptBase64 : undefined
    );
    if (success) {
      setIsOrdered(true);
      setTimeout(() => {
        navigate("/orders");
      }, 2000);
    } else {
      setErrorWord("Could not complete checkout. Please check your network and try again.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isOrdered) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-gray-100 rounded-[32px] p-8 shadow-xl font-sans text-gray-950 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto border border-green-100">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#070329]">Order Received!</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your culinary order is logged actively. Our courier dispatch matches instantly!
          </p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0ea5e9] bg-sky-50 py-1.5 px-3.5 rounded-xl inline-block font-mono">
          Redirecting to Tracking Center...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-[#070329] tracking-tight">Complete Settlement</h1>
        <p className="text-xs text-gray-500 mt-0.5">Please finalize your courier details and payment authorization.</p>
      </div>

      {!currentUser && (
        <div className="p-5 bg-[#0ea5e9]/5 border border-[#0ea5e9]/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-xs font-black text-[#070329] flex items-center justify-center md:justify-start gap-1.5">
              <span className="w-2 h-2 bg-[#0ea5e9] rounded-full animate-pulse" />
              Checking out as Guest
            </h4>
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed max-w-xl">
              You do not need to register to purchase, but saving your details lets you track orders in real-time, get free rewards, and top up your secure local wallet!
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/login?redirect=/checkout`)}
            className="px-4 py-2.5 bg-[#070329] hover:bg-[#0ea5e9] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap shadow-sm cursor-pointer"
          >
            Sign In / Register ⚡
          </button>
        </div>
      )}

      {errorWord && (
        <div className="p-3.5 bg-red-50 text-red-650 rounded-2xl border border-red-100 text-xs font-bold">
          {errorWord}
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Address and pay selection */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">Fulfillment Details</h3>

          {/* Guest account identification */}
          {!currentUser && (
            <div className="space-y-4 pb-4 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Guest Account Setup</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-650 flex items-center gap-1.5 leading-none">
                    <User className="w-4 h-4 text-purple-500" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your first and last name"
                    className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition font-semibold text-gray-900"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-650 flex items-center gap-1.5 leading-none">
                    <Mail className="w-4 h-4 text-pink-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition font-semibold text-gray-900"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick Saved Address Select */}
          {savedAddresses && savedAddresses.filter(addr => !currentUser || addr.userId === currentUser.id).length > 0 && (
            <div className="space-y-2 pb-2 border-b border-gray-50">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">1-Click Saved Address Select</span>
              <div className="flex flex-wrap gap-2">
                {savedAddresses.filter(addr => !currentUser || addr.userId === currentUser.id).map(addr => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setStreetAddress(addr.streetAddress);
                      setSelectedDistrict(addr.district);
                      if (addr.landmarkNote) {
                        setStreetAddress(addr.streetAddress + ` (${addr.landmarkNote})`);
                      }
                    }}
                    className="text-left px-3.5 py-2.5 bg-gray-50 hover:bg-sky-50 hover:border-sky-300 border border-gray-200 rounded-2xl transition cursor-pointer text-[11px] font-bold text-[#070329] flex items-center gap-2 shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <div>
                      <span className="block truncate max-w-[140px] font-black text-gray-900">{addr.streetAddress}</span>
                      <span className="block text-[9px] text-gray-500 font-medium">{addr.district}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coverage Reference Guide Toggle */}
          <div className="border border-teal-100 bg-teal-50/20 rounded-2xl p-4 space-y-1">
            <details className="group">
              <summary className="flex items-center justify-between font-extrabold text-xs text-teal-950 cursor-pointer outline-none select-none">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>📍 Owode Food Coverage & Faraway Surcharges</span>
                </div>
                <span className="transition-transform group-open:rotate-180 text-teal-600 font-bold text-xs">▼</span>
              </summary>
              <div className="mt-3 text-xs text-teal-900 space-y-2 leading-relaxed whitespace-pre-line border-t border-teal-100/50 pt-3">
                {(() => {
                  return coverageGuideText.split("\n").map((line, index) => {
                    if (line.startsWith("###")) {
                      return (
                        <h4 key={index} className="font-bold text-teal-950 mt-3 mb-1 text-[11px] uppercase tracking-wider">
                          {line.replace("###", "").trim()}
                        </h4>
                      );
                    }
                    if (line.startsWith("-")) {
                      const cleanLine = line.replace("-", "").trim();
                      const boldParts = cleanLine.split("**");
                      return (
                        <li key={index} className="ml-3 list-disc text-[11px] text-teal-900 leading-relaxed font-medium">
                          {boldParts.map((part, i) => (
                            i % 2 === 1 ? <strong key={i} className="font-black text-[#070329]">{part}</strong> : part
                          ))}
                        </li>
                      );
                    }
                    if (line.trim() === "---") {
                      return <hr key={index} className="border-t border-teal-100/50 my-2" />;
                    }
                    if (line.trim() === "") {
                      return <div key={index} className="h-1" />;
                    }
                    const boldParts = line.split("**");
                    return (
                      <p key={index} className="text-[11px] text-teal-900 leading-relaxed font-medium">
                        {boldParts.map((part, i) => (
                          i % 2 === 1 ? <strong key={i} className="font-black text-[#070329]">{part}</strong> : part
                        ))}
                      </p>
                    );
                  });
                })()}
              </div>
            </details>
          </div>

          {/* Delivery address input */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5 leading-none">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Delivery Zone / District
                </label>
                
                {/* Custom searchable dropdown selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowZoneDropdown(!showZoneDropdown)}
                    className="w-full text-left text-xs p-3.5 border border-gray-150 rounded-2xl bg-gray-50/50 hover:bg-gray-100/50 transition font-semibold text-gray-800 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate">{selectedDistrict || "Select Local Zone"}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal shrink-0">▼</span>
                  </button>

                  {showZoneDropdown && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-bold text-[#070329] uppercase tracking-wider">Search Delivery Zone</span>
                        <button 
                          type="button"
                          onClick={() => setShowZoneDropdown(false)}
                          className="text-gray-400 hover:text-gray-650 text-[10px] font-bold"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <div className="mb-2.5">
                        <input
                          type="text"
                          placeholder="🔍 Search delivery zones..."
                          value={zoneSearchQuery}
                          onChange={(e) => setZoneSearchQuery(e.target.value)}
                          className="w-full text-xs p-2.5 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 font-medium text-gray-900 bg-gray-50/50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {availableLocations
                          .filter((loc) => loc.toLowerCase().includes(zoneSearchQuery.toLowerCase()))
                          .map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setSelectedDistrict(loc);
                                setShowZoneDropdown(false);
                                setZoneSearchQuery("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition hover:bg-gray-50 ${
                                selectedDistrict === loc ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700"
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{loc}</span>
                            </button>
                          ))}
                        {availableLocations.filter((loc) => loc.toLowerCase().includes(zoneSearchQuery.toLowerCase())).length === 0 && (
                          <div className="text-[10px] text-gray-400 text-center py-4">No matching zones found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5 leading-none">
                  <MapPin className="w-4 h-4 text-[#0ea5e9]" />
                  Street Address &amp; Landmark Details
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. 15 Fate Road, Opp. Phase 2 Gate"
                  className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition font-semibold"
                  required
                />
              </div>
            </div>

            {/* Delivery contact phone input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5 leading-none">
                <Phone className="w-4 h-4 text-emerald-500" />
                Delivery Phone Number
              </label>
              <input
                type="tel"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                placeholder="Enter active phone number (e.g., +234 801 234 5678)"
                className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition font-semibold"
                required
              />
              <p className="text-[10px] text-amber-600 font-bold tracking-tight">
                ⚠️ * Required: Must be an active, reachable phone number for courier coordination.
              </p>
            </div>
          </div>

          {/* Payment Method selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5 leading-none">
              <CreditCard className="w-4 h-4 text-[#0ea5e9]" />
              Settlement Protocol
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {activeGateways.map((m) => {
                const isSel = paymentMethod === m.name;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.name);
                      setErrorWord("");
                    }}
                    className={`p-4 text-left rounded-2xl border transition duration-205 cursor-pointer flex justify-between items-start ${
                      isSel 
                        ? "bg-blue-600/5 border-[#0ea5e9] text-blue-950 shadow-sm" 
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{m.name}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">{m.desc}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "border-[#0ea5e9] bg-[#0ea5e9]" : "border-gray-300"}`}>
                      {isSel && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-panels for payment options */}
            {paymentMethod && (
              <div className="mt-4 p-4 bg-gray-50/50 border border-gray-150 rounded-2xl space-y-4 animate-in fade-in duration-200">
                {paymentMethod === "Local Bank Transfer" && (
                  <div className="space-y-3 text-xs font-sans">
                    <span className="font-bold text-gray-700 block text-[10px] uppercase tracking-wider font-mono">Company Account Credentials</span>
                    
                    {(() => {
                      const tg = paymentGateways?.find(g => g.id === "bank_transfer");
                      return (
                        <div className="p-3.5 bg-white border border-gray-150 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">Bank Name</span>
                            <span className="font-bold text-gray-800">{tg?.bankName || "GT Bank"}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">Account Number</span>
                            <span className="font-bold font-mono text-[#0ea5e9] select-all tracking-wide">{tg?.accountNumber || "0123456789"}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">Account Name</span>
                            <span className="font-bold text-gray-800">{tg?.accountName || "Owode Food Marketplace LTD"}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Receipt Upload */}
                    <div className="space-y-1.5 pt-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase block tracking-wide">Attach Transfer Proof (Receipt Image)</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-white text-center hover:border-[#0ea5e9] transition relative min-h-24 flex items-center justify-center">
                        {receiptBase64 ? (
                          <div className="space-y-2 w-full text-center">
                            <img src={receiptBase64} alt="Proof" className="max-h-24 mx-auto rounded-lg shadow-sm border border-gray-100" />
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[10px] text-emerald-600 font-bold">Attached Successfully</span>
                              <button 
                                type="button" 
                                onClick={() => setReceiptBase64("")}
                                className="text-red-500 font-bold text-[10px] hover:underline cursor-pointer"
                              >
                                Replace
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReceiptUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <Landmark className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                            <span className="text-[11px] font-bold text-[#0ea5e9] block font-sans">Upload Receipt Image</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">JPG, PNG under 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "Monnify (Bank & Card)" && (
                  <div className="space-y-3 text-xs font-sans">
                    <span className="font-bold text-gray-700 block text-[10px] uppercase tracking-wider font-mono">Monnify Secure Digital Pay</span>
                    <p className="text-gray-550 leading-relaxed text-[11px]">
                      Your payment of {currency}{grandTotal.toLocaleString()} will be securely authorized via Monnify's instant verification network.
                    </p>

                    {monnifySuccess ? (
                      <div className="p-3 bg-green-50 text-green-700 border border-green-150 rounded-xl font-bold flex items-center gap-2 animate-in zoom-in-95 duration-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Secure Monnify Transaction Successful! Ready to finalize.</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptBase64(""); 
                          setShowMonnifyModal(true);
                        }}
                        className="w-full py-3 h-11 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-white" />
                        Initialize Monnify Checkout
                      </button>
                    )}
                  </div>
                )}

                {paymentMethod === "Owode Food Wallet" && (
                  <div className="space-y-3.5 text-xs font-sans animate-in fade-in duration-200">
                    <span className="font-bold text-gray-700 block text-[10px] uppercase tracking-wider font-mono">Owode Food Core Balance</span>
                    
                    {checkoutFundingProcess ? (
                      // 🔒 INLINE SECURE GATEWAY SANDBOX SIMULATOR FOR CHECKOUT TOP-UP
                      <div className="p-4 bg-white border border-blue-150 rounded-2xl space-y-4 shadow-sm animate-in zoom-in-95 duration-200">
                        {/* Gateway Header */}
                        <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-blue-600 animate-pulse" />
                            <span className="font-extrabold text-xs text-blue-950">Owode Secure Pay 🔒</span>
                          </div>
                          <span className="text-[8px] font-mono font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            SANDBOX
                          </span>
                        </div>

                        {/* Amount & Reference */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                          <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider font-mono">Top-up Balance</span>
                          <span className="text-xl font-black text-[#070329] font-mono block mt-0.5">
                            {currency}{(checkoutFundingProcess.amount ?? 0).toLocaleString()}.00
                          </span>
                          <span className="text-[8px] text-gray-400 font-mono block mt-1">Ref: {checkoutFundingProcess.txRef}</span>
                        </div>

                        {/* Error Alert */}
                        {checkoutFundingProcess.error && (
                          <div className="p-2.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>{checkoutFundingProcess.error}</span>
                          </div>
                        )}

                        {/* STAGE: METHOD_SELECT */}
                        {checkoutFundingProcess.stage === "method_select" && (
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block text-center">Choose Simulated Payment Channel</span>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "card_entry", method: "card" } : null)}
                                className="p-3 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/25 rounded-xl text-center space-y-1 transition cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4 text-blue-600 mx-auto" />
                                <span className="text-[11px] font-extrabold text-gray-800 block">Mock Card</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "bank_transfer", method: "bank_transfer" } : null)}
                                className="p-3 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/25 rounded-xl text-center space-y-1 transition cursor-pointer"
                              >
                                <Landmark className="w-4 h-4 text-amber-600 mx-auto" />
                                <span className="text-[11px] font-extrabold text-gray-800 block">Mock Bank</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setCheckoutFundingProcess(null)}
                              className="w-full py-2 text-center text-[10px] font-bold text-gray-400 hover:text-gray-600 transition cursor-pointer"
                            >
                              Cancel Top-up
                            </button>
                          </div>
                        )}

                        {/* STAGE: CARD_ENTRY */}
                        {checkoutFundingProcess.stage === "card_entry" && (
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Card Payment</span>
                              <button
                                type="button"
                                onClick={() => setCheckoutFundingProcess(prev => prev ? { 
                                  ...prev, 
                                  cardNumber: "4000 1234 5678 9010",
                                  cardExpiry: "12/28",
                                  cardCvv: "123"
                                } : null)}
                                className="text-[9px] font-extrabold text-blue-600 hover:underline"
                              >
                                💡 Auto-fill Test Card
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="relative">
                                <input 
                                  type="text"
                                  placeholder="4000 1234 5678 9010"
                                  value={checkoutFundingProcess.cardNumber}
                                  onChange={(e) => setCheckoutFundingProcess(prev => prev ? { ...prev, cardNumber: e.target.value } : null)}
                                  className="w-full text-xs p-2.5 pl-8 border border-gray-100 rounded-xl font-mono outline-none focus:border-blue-300"
                                />
                                <CreditCard className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="text"
                                  placeholder="MM/YY"
                                  value={checkoutFundingProcess.cardExpiry}
                                  onChange={(e) => setCheckoutFundingProcess(prev => prev ? { ...prev, cardExpiry: e.target.value } : null)}
                                  className="w-full text-xs p-2.5 border border-gray-100 rounded-xl font-mono outline-none focus:border-blue-300 text-center"
                                />
                                <input 
                                  type="password"
                                  maxLength={3}
                                  placeholder="CVV"
                                  value={checkoutFundingProcess.cardCvv}
                                  onChange={(e) => setCheckoutFundingProcess(prev => prev ? { ...prev, cardCvv: e.target.value } : null)}
                                  className="w-full text-xs p-2.5 border border-gray-100 rounded-xl font-mono outline-none focus:border-blue-300 text-center tracking-widest"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "method_select" } : null)}
                                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold transition text-center"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!checkoutFundingProcess.cardNumber || !checkoutFundingProcess.cardExpiry || !checkoutFundingProcess.cardCvv) {
                                    setCheckoutFundingProcess(prev => prev ? { ...prev, error: "Please enter sandbox credentials." } : null);
                                    return;
                                  }
                                  setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "processing", error: undefined, loaderText: "Authorizing with sandbox issuing bank..." } : null);
                                  setTimeout(() => {
                                    setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "otp_entry" } : null);
                                  }, 1300);
                                }}
                                className="flex-[2] py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition text-center shadow-sm"
                              >
                                Pay Securely 💳
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STAGE: OTP_ENTRY */}
                        {checkoutFundingProcess.stage === "otp_entry" && (
                          <div className="space-y-3.5">
                            <div className="text-center space-y-1">
                              <span className="font-extrabold text-[10px] text-gray-700 block uppercase">Enter Secure SMS OTP</span>
                              <p className="text-[9px] text-gray-400">A simulated verification code has been generated.</p>
                            </div>

                            <input 
                              type="text"
                              placeholder="Enter 6-Digit OTP"
                              maxLength={6}
                              value={checkoutFundingProcess.otp}
                              onChange={(e) => setCheckoutFundingProcess(prev => prev ? { ...prev, otp: e.target.value } : null)}
                              className="w-full text-center text-xs p-2.5 border border-gray-150 rounded-xl font-mono font-bold tracking-widest outline-none focus:border-blue-300"
                            />

                            <button
                              type="button"
                              onClick={() => setCheckoutFundingProcess(prev => prev ? { ...prev, otp: "123456" } : null)}
                              className="w-full py-0.5 text-center text-[9px] font-bold text-blue-600 hover:underline block"
                            >
                              💡 Auto-fill Sandbox Code (123456)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (checkoutFundingProcess.otp !== "123456" && checkoutFundingProcess.otp.length < 4) {
                                  setCheckoutFundingProcess(prev => prev ? { ...prev, error: "Incorrect OTP code. Use sandbox code: 123456" } : null);
                                  return;
                                }
                                setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "processing", error: undefined, loaderText: "Settle funds in merchant ledger..." } : null);
                                setTimeout(() => {
                                  const amt = checkoutFundingProcess.amount;
                                  const newBal = checkoutWalletBalance + amt;
                                  localStorage.setItem("fd_wallet_balance", String(newBal));
                                  window.dispatchEvent(new Event("wallet-balance-updated"));
                                  setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "success" } : null);
                                }, 1200);
                              }}
                              className="w-full py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-[10px] font-black transition text-center"
                            >
                              Verify OTP & Settle ⚡
                            </button>
                          </div>
                        )}

                        {/* STAGE: BANK_TRANSFER */}
                        {checkoutFundingProcess.stage === "bank_transfer" && (
                          <div className="space-y-3.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block text-center">Simulated Escrow Bank Transfer</span>
                            
                            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Escrow Bank:</span>
                                <span className="font-bold text-gray-800">Providus Bank</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Account No:</span>
                                <span className="font-mono font-bold text-gray-800 select-all">982183201</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Account Name:</span>
                                <span className="font-bold text-gray-800 truncate max-w-[120px]">Owode Escrow Checkout</span>
                              </div>
                            </div>

                            <p className="text-[8px] text-amber-700/80 bg-amber-50 p-2 rounded-lg text-center leading-normal">
                              💡 Copy details and click below to simulate incoming settlement verification clearing.
                            </p>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "method_select" } : null)}
                                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold transition text-center"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "processing", error: undefined, loaderText: "Scanning sandbox incoming settlement clearing feed..." } : null);
                                  setTimeout(() => {
                                    const amt = checkoutFundingProcess.amount;
                                    const newBal = checkoutWalletBalance + amt;
                                    localStorage.setItem("fd_wallet_balance", String(newBal));
                                    window.dispatchEvent(new Event("wallet-balance-updated"));
                                    setCheckoutFundingProcess(prev => prev ? { ...prev, stage: "success" } : null);
                                  }, 1500);
                                }}
                                className="flex-[2] py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition text-center shadow-sm"
                              >
                                I have transferred ⚡
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STAGE: PROCESSING */}
                        {checkoutFundingProcess.stage === "processing" && (
                          <div className="py-6 text-center space-y-3">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-gray-700">
                                {checkoutFundingProcess.loaderText || "Verifying secure sandbox settlement..."}
                              </p>
                              <p className="text-[9px] text-gray-400 font-mono">Secured SSL Connection Active</p>
                            </div>
                          </div>
                        )}

                        {/* STAGE: SUCCESS */}
                        {checkoutFundingProcess.stage === "success" && (
                          <div className="text-center space-y-3.5 animate-in zoom-in-95 duration-200">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>

                            <div className="space-y-0.5">
                              <h4 className="font-extrabold text-[#070329] text-xs">Sandbox Credit Clearance Complete</h4>
                              <p className="text-[10px] text-gray-500">Your Owode Food wallet has been successfully topped up.</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setCheckoutFundingProcess(null)}
                              className="w-full py-2 bg-[#070329] hover:bg-[#100b47] text-white rounded-xl text-[10px] font-bold transition text-center shadow-sm"
                            >
                              Done - Back to Checkout 🌟
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // STANDARD WALLET VIEW AND PRESETS
                      <div className="p-4 bg-white border border-gray-150 rounded-2xl space-y-3 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-semibold">Current Balance:</span>
                          <span className={`text-sm font-black font-mono ${(checkoutWalletBalance ?? 0) >= grandTotal ? "text-green-600" : "text-red-500"}`}>
                            {currency}{(checkoutWalletBalance ?? 0).toLocaleString()}
                          </span>
                        </div>
                        
                        {(checkoutWalletBalance ?? 0) < grandTotal ? (
                          <div className="space-y-3">
                            <p className="text-[10px] text-red-600 font-bold leading-normal bg-red-50/50 p-2.5 rounded-lg border border-red-100">
                              ⚠️ Insufficient wallet balance. You need {currency}{(grandTotal - (checkoutWalletBalance ?? 0)).toLocaleString()} more to place this order.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCheckoutFundingProcess({
                                    amount: 5000,
                                    stage: "method_select",
                                    method: "card",
                                    cardNumber: "",
                                    cardExpiry: "",
                                    cardCvv: "",
                                    otp: "",
                                    txRef: `OWD-TX-${Math.floor(100000 + Math.random() * 900000)}`
                                  });
                                }}
                                className="flex-1 py-2 px-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-[10px] font-black tracking-wide text-center transition active:scale-95 cursor-pointer shadow-sm animate-pulse"
                              >
                                ⚡ Quick +{currency}5,000
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const needed = Math.ceil((grandTotal - (checkoutWalletBalance ?? 0)) / 1000) * 1000;
                                  setCheckoutFundingProcess({
                                    amount: needed,
                                    stage: "method_select",
                                    method: "card",
                                    cardNumber: "",
                                    cardExpiry: "",
                                    cardCvv: "",
                                    otp: "",
                                    txRef: `OWD-TX-${Math.floor(100000 + Math.random() * 900000)}`
                                  });
                                }}
                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black tracking-wide text-center transition active:scale-95 cursor-pointer shadow-sm"
                              >
                                ⚡ Reload Exact (+{currency}{Math.max(0, Math.ceil((grandTotal - (checkoutWalletBalance ?? 0)) / 1000) * 1000).toLocaleString()})
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[10px] font-bold text-center">
                            ✅ Perfect! Sufficient balance. Your one-click checkout is fully authorized.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pricing Subtotals panel side card on Checkout */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider leading-none">Billing Overview</h3>
            <span className="text-[9px] bg-sky-50 text-sky-700 py-0.5 px-2 rounded-xl font-bold uppercase font-mono">Express Fleet</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto pr-1">
            {cart.map((item) => {
              const itemAddonPrice = (item.selectedAddons || []).reduce((s, a) => s + ((a.price ?? 0) * (a.quantity ?? 1)), 0);
              const singleItemTotal = item.product.price + itemAddonPrice;
              const rowTotal = singleItemTotal * item.quantity;

              return (
                <div key={item.id} className="py-3 flex flex-col justify-center text-xs first:pt-0 last:pb-0 font-medium font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{item.product.name} <b className="text-[#070329]">x{item.quantity}</b></span>
                    <span className="font-bold text-gray-800 font-mono">{currency}{rowTotal.toLocaleString()}</span>
                  </div>
                  
                  {/* Detailed chosen addons inside order confirmation card */}
                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                    <div className="flex flex-col gap-0.5 pl-3 mt-1 text-[10px] text-gray-400 font-semibold font-sans">
                      {item.selectedAddons.map(a => (
                        <span key={a.id}>+ {a.name} {a.quantity && a.quantity > 1 ? `x${a.quantity}` : ""} (+ {currency}{((a.price ?? 0) * (a.quantity ?? 1)).toLocaleString()})</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-4 font-sans">
            <div className="flex justify-between font-sans">
              <span>Items Total</span>
              <span className="font-bold text-gray-950">{currency}{total.toLocaleString()}</span>
            </div>
            {vatEnabled && (
              <div className="flex justify-between font-sans">
                <span>Estimated VAT ({vatRate}%)</span>
                <span>{currency}{Math.round(tax).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-sans">
              <span>Standard Fleet Delivery</span>
              <span>{currency}{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-sans">
              <span>Service Fee</span>
              <span>{currency}{serviceFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-100 pt-3.5 flex justify-between text-sm font-sans">
              <span className="font-bold text-gray-950 font-sans">Grand total</span>
              <span className="font-black text-[#070329] font-mono text-base">{currency}{Math.round(grandTotal).toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={cartVendor ? !isVendorOpen(cartVendor) : false}
            className={`w-full py-4 px-5 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition font-sans ${
              cartVendor && !isVendorOpen(cartVendor) 
                ? "bg-gray-300 cursor-not-allowed opacity-60" 
                : "bg-[#070329] hover:bg-[#0ea5e9] cursor-pointer"
            }`}
          >
            {cartVendor && !isVendorOpen(cartVendor) ? "Closed - Cannot Place Order" : "Authorize Purchase & Place Order"}
          </button>
        </div>

      </form>

      {/* MONNIFY INTEGRATED SECURE CHECKOUT POPUP MODAL */}
      {showMonnifyModal && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-6 relative border border-gray-100 animate-in zoom-in-95 duration-200 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#070329] text-xs uppercase tracking-wider leading-none">Monnify Secure WebPay</h4>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Protected by PCI-DSS Bank Standards</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowMonnifyModal(false)}
                className="text-gray-400 hover:text-gray-950 transition font-bold text-xs cursor-pointer"
              >
                ✕ Esc
              </button>
            </div>

            {/* Invoice Credentials */}
            <div className="p-4 bg-gray-50/50 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-mono tracking-wider">Merchant Address</span>
                <span className="font-bold text-gray-800">Owode Food Marketplace Hub</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px] uppercase font-mono tracking-wider">Total Charge</span>
                <span className="font-black text-[#0ea5e9] font-mono text-sm">{currency}{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Options Selection inside Monnify Web Checkout */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Settlement Route</span>
              
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { id: "card", name: "Card Pay", desc: "Visa / Master" },
                  { id: "transfer", name: "Bank Instant", desc: "Transfer Code" },
                  { id: "ussd", name: "USSD Dial", desc: "GTB/UBA Dial" }
                ].map((opt) => {
                  const active = monnifyMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMonnifyMethod(opt.id)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        active 
                          ? "border-[#0ea5e9] bg-[#0ea5e9]/10 text-[#0ea5e9]" 
                          : "border-gray-150 bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <b className="block text-[11px]">{opt.name}</b>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Interactive Flow per method */}
            {monnifyMethod === "card" && (
              <div className="space-y-3.5 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-550 uppercase tracking-wider block">Card Pan Number</label>
                  <input
                    type="text"
                    placeholder="5399 1234 5678 9010"
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white outline-none font-mono font-bold tracking-widest text-center"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-550 uppercase block">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="12 / 28"
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-center font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-550 uppercase block">CVV</label>
                    <input
                      type="text"
                      placeholder="351"
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-center font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {monnifyMethod === "transfer" && (
              <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 text-center space-y-2.5 text-xs animate-in fade-in duration-200">
                <p className="text-amber-800 leading-normal">
                  Execute direct transfer of <strong className="font-extrabold text-amber-950">{currency}{grandTotal.toLocaleString()}</strong> to the following dynamic host wallet:
                </p>
                <div className="bg-white rounded-xl p-3 border border-amber-100 inline-block font-mono font-bold tracking-wide text-amber-950 select-all text-xs">
                  Providus Bank • 982183201
                </div>
                <p className="text-[10px] text-amber-600 font-medium">
                  * Dynamic credentials cycle every 15 minutes automatically.
                </p>
              </div>
            )}

            {monnifyMethod === "ussd" && (
              <div className="p-4 bg-sky-50/40 rounded-2xl border border-sky-100 text-center space-y-2.5 text-xs animate-in fade-in duration-200">
                <span className="font-extrabold text-sky-900 block uppercase tracking-wider text-[10px] font-mono">Dial USSD Protocol string below</span>
                <div className="bg-white rounded-xl p-3 border border-sky-100 inline-block font-mono font-bold tracking-widest text-[#0ea5e9] select-all">
                  *737*1*2*982183201#
                </div>
                <p className="text-[10px] text-sky-500 font-sans">
                  Dial from registered SIM. Instant checkout verification matching automatically.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={executeMonnifyCheckout}
                disabled={monnifyPaying}
                className="w-full py-3 px-5 bg-[#070329] hover:bg-opacity-95 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {monnifyPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                    Authenticating Secure Gateway...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    Complete Selected Payment
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-gray-400 font-mono text-center mt-3 leading-normal font-sans">
                By tapping this button you authorize the Secure Merchant Agreement under Monnify Ref: MON-{Date.now().toString().slice(-6)}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
