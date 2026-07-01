import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { 
  Home, 
  Search, 
  ClipboardList, 
  Heart, 
  User, 
  MapPin, 
  Wallet, 
  HelpCircle, 
  LogOut, 
  Bell, 
  ChevronDown, 
  X, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Menu,
  Lock,
  CreditCard,
  Landmark,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Copy,
  FileText,
  Shield
} from "lucide-react";

export const CustomerLayout: React.FC = () => {
  const { 
    currentUser, 
    cart, 
    logout, 
    vendors, 
    currency, 
    availableLocations = [], 
    selectedLocation, 
    setSelectedLocation,
    savedAddresses,
    addSavedAddress,
    removeSavedAddress
  } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  // Dialog / Drawer States
  const [activeModal, setActiveModal] = useState<"wallet" | "addresses" | "favorites" | "help" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Simulated Wallet balance with localStorage persistence
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem("fd_wallet_balance");
    return saved ? Number(saved) : 14500;
  });
  const [fundAmount, setFundAmount] = useState<string>("5000");
  const [walletSuccessMsg, setWalletSuccessMsg] = useState<string | null>(null);

  // Interactive Gateway Sandbox top-up process state
  const [fundingProcess, setFundingProcess] = useState<{
    amount: number;
    stage: "method_select" | "card_entry" | "bank_transfer" | "otp_entry" | "processing" | "success";
    method: "card" | "bank_transfer";
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
    otp: string;
    txRef: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("fd_wallet_balance", String(walletBalance));
    // Emit custom event to notify other windows or components about balance updates
    window.dispatchEvent(new Event("wallet-balance-updated"));
  }, [walletBalance]);

  // Saved Addresses fields
  const [newStreetAddress, setNewStreetAddress] = useState<string>("");
  const [newAddressDistrict, setNewAddressDistrict] = useState<string>("");
  const [newLandmarkNote, setNewLandmarkNote] = useState<string>("");

  useEffect(() => {
    if (availableLocations.length > 0 && !newAddressDistrict) {
      setNewAddressDistrict(availableLocations[0]);
    }
  }, [availableLocations, newAddressDistrict]);

  // Simulated Favorites
  const [favorites, setFavorites] = useState<string[]>(["v-1", "v-2"]); // Vendor IDs

  // Dropdown UI visibility state
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [districtFilterQuery, setDistrictFilterQuery] = useState("");

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStreetAddress.trim()) {
      addSavedAddress(
        newStreetAddress.trim(), 
        newAddressDistrict || (availableLocations[0] || "Tanke"), 
        newLandmarkNote.trim()
      );
      setNewStreetAddress("");
      setNewLandmarkNote("");
    }
  };

  const handleRemoveAddress = (id: string) => {
    removeSavedAddress(id);
  };

  const handleFundWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fundAmount);
    if (!isNaN(amt) && amt > 0) {
      setFundingProcess({
        amount: amt,
        stage: "method_select",
        method: "card",
        cardNumber: "",
        cardExpiry: "",
        cardCvv: "",
        otp: "",
        txRef: `OWD-TX-${Math.floor(100000 + Math.random() * 900000)}`
      });
    }
  };

  const handleQuickFund = (amt: number) => {
    setFundingProcess({
      amount: amt,
      stage: "method_select",
      method: "card",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      otp: "",
      txRef: `OWD-TX-${Math.floor(100000 + Math.random() * 900000)}`
    });
  };

  // Location selector is managed above dynamically from useDatabase()

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#070329] text-white">
      {/* Brand Header */}
      <div className="p-8 border-b border-white/5 space-y-1 shrink-0">
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-white text-[#070329] flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-105 transition-transform duration-200">
            O
          </div>
          <div>
            <span className="font-bold text-lg tracking-widest text-white uppercase block">
              Owode Food
            </span>
            <span className="text-[9px] text-[#0ea5e9] tracking-wider block font-bold uppercase font-mono">
              Marketplace
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition ${
            location.pathname === "/" || location.pathname === "/vendors" 
              ? "bg-white/10 text-white shadow-sm" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link 
          to="/" 
          onClick={() => {
            setMobileMenuOpen(false);
            setTimeout(() => {
              const el = document.getElementById("search-input");
              if (el) el.focus();
            }, 100);
          }}
          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition text-gray-400 hover:text-white hover:bg-white/5`}
        >
          <Search className="w-5 h-5" />
          <span>Explore Dishes</span>
        </Link>

        <Link 
          to="/orders" 
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition ${
            location.pathname === "/orders" 
              ? "bg-white/10 text-white shadow-sm" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <div className="flex items-center justify-between w-full">
            <span>Orders</span>
            {currentUser && (
              <span className="bg-[#0ea5e9] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Live
              </span>
            )}
          </div>
        </Link>

        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            setActiveModal("favorites");
          }}
          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 w-full text-left transition"
        >
          <Heart className="w-5 h-5 text-red-400" />
          <span>Favorites</span>
        </button>

        <Link 
          to="/profile" 
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition ${
            location.pathname === "/profile" 
              ? "bg-white/10 text-white shadow-sm" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>

        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            setActiveModal("addresses");
          }}
          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 w-full text-left transition"
        >
          <MapPin className="w-5 h-5 text-green-400" />
          <span>Addresses</span>
        </button>

        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            setActiveModal("wallet");
          }}
          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 w-full text-left transition"
        >
          <Wallet className="w-5 h-5 text-amber-400" />
          <div className="flex items-center justify-between w-full">
            <span>Wallet</span>
            <span className="bg-amber-500/25 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-500/20">
              {currency}{walletBalance.toLocaleString()}
            </span>
          </div>
        </button>

        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            setActiveModal("help");
          }}
          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 w-full text-left transition"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help & Support</span>
        </button>
      </nav>

      {/* Sidebar Footer / User section */}
      <div className="p-6 border-t border-white/5 shrink-0">
        {currentUser ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 flex items-center justify-center font-bold text-white uppercase text-sm">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate max-w-[120px]">
                  {currentUser.name}
                </h4>
                <p className="text-[10px] text-gray-400 truncate max-w-[120px]">
                  {currentUser.role}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link 
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white py-3 px-4 rounded-xl text-xs font-bold shadow transition"
          >
            Sign In to Account
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col lg:flex-row text-[#070329] selection:bg-[#070329]/15">
      
      {/* 1. Left Sidebar for Desktop */}
      <aside className="hidden lg:flex w-72 bg-[#070329] text-white flex-col shrink-0 sticky top-0 h-screen transition-all duration-300">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Slide-in */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay mask */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          {/* Drawer container */}
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-[#070329] animate-in slide-in-from-left duration-200">
            {/* Close button inside drawer */}
            <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="h-full flex flex-col">
              {renderSidebarContent()}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header section */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 z-40 sticky top-0 py-3 sm:py-4 px-3 sm:px-6 lg:px-8 shadow-sm flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Logo on mobile view only */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#070329] text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                O
              </span>
              <span className="font-bold text-sm tracking-wider text-[#070329] uppercase hidden min-[440px]:inline">
                Owode Food
              </span>
            </Link>
          </div>

          {/* Location Delivery Selector (Nigeria Theme) */}
          <div className="relative min-w-0">
            <button 
              onClick={() => setShowLocationSelect(!showLocationSelect)}
              className="flex items-center gap-1 sm:gap-1.5 text-left group focus:outline-none min-w-0"
            >
              <div className="p-1.5 sm:p-2 bg-red-50 rounded-xl text-red-500 shrink-0">
                <MapPin className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block leading-none">Deliver to</span>
                <span className="text-xs font-bold text-[#070329] flex items-center gap-1 truncate max-w-[85px] min-[380px]:max-w-[125px] sm:max-w-xs">
                  {selectedLocation}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-600 transition shrink-0" />
                </span>
              </div>
            </button>

             {showLocationSelect && (
              <div className="absolute left-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 block mb-2">Select Delivery Zone</span>
                <div className="px-2 mb-2">
                  <input
                    type="text"
                    placeholder="Search zone..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-medium text-gray-900"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {availableLocations
                    .filter((addr) => addr.toLowerCase().includes(locationQuery.toLowerCase()))
                    .map((addr) => (
                      <button
                        key={addr}
                        onClick={() => {
                          setSelectedLocation(addr);
                          setShowLocationSelect(false);
                          setLocationQuery("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition hover:bg-gray-50 ${
                          selectedLocation === addr ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700"
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{addr}</span>
                      </button>
                    ))}
                  {availableLocations.filter((addr) => addr.toLowerCase().includes(locationQuery.toLowerCase())).length === 0 && (
                    <div className="text-[10px] text-gray-400 text-center py-4">No matching zones found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center search (pure action input proxying home path or listing) */}
          <div className="hidden md:flex flex-1 max-w-md relative mx-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search for food, restaurants..."
              onClick={() => {
                if (location.pathname !== "/" && location.pathname !== "/vendors") {
                  navigate("/");
                }
              }}
              className="w-full text-xs p-2.5 pl-10 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition"
            />
          </div>

          {/* Right Notification Bell & Profile Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            {/* Desktop Quick Wallet Action Pill */}
            <button 
              onClick={() => setActiveModal("wallet")}
              className="hidden md:flex items-center gap-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-[#070329] px-3.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer shadow-sm group active:scale-95"
              title="Click to view & reload wallet"
            >
              <Wallet className="w-4 h-4 text-amber-500 group-hover:scale-115 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest leading-none">Wallet balance</span>
                <span className="text-xs font-black font-mono leading-tight mt-0.5">
                  {currency}{walletBalance.toLocaleString()}
                </span>
              </div>
            </button>

            <button className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-xl text-gray-600 relative transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {currentUser ? (
              <Link 
                to="/profile" 
                className="flex items-center gap-1.5 p-1 hover:bg-gray-50 rounded-xl transition"
              >
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" 
                  alt="user avatar"
                  className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-bold hidden sm:inline text-[#070329]">
                  {currentUser.name}
                </span>
              </Link>
            ) : (
              <Link 
                to="/login"
                className="text-xs font-bold bg-[#070329] text-white py-2 px-3 sm:py-2 sm:px-4 rounded-xl shadow transition hover:bg-opacity-90"
              >
                Login
              </Link>
            )}
          </div>
        </header>

        {/* Dynamic content rendering outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation bar (highly professional - fits screens in flow) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 z-40 flex items-center justify-around px-2 shadow-lg">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold ${
            location.pathname === "/" || location.pathname === "/vendors" ? "text-[#0ea5e9]" : "text-gray-400"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </Link>

        <button 
          onClick={() => {
            navigate("/");
            setTimeout(() => {
              const el = document.getElementById("search-input");
              if (el) el.focus();
            }, 100);
          }}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold text-gray-400"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span>Search</span>
        </button>

        <Link 
          to="/cart" 
          className="relative flex flex-col items-center justify-center -mt-6 bg-[#070329] text-white w-12 h-12 rounded-full shadow-lg border-4 border-white transition-transform active:scale-95"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-white" />
            {cartTotalItems > 0 && (
              <span className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {cartTotalItems}
              </span>
            )}
          </div>
        </Link>

        <Link 
          to="/orders" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold ${
            location.pathname === "/orders" ? "text-[#0ea5e9]" : "text-gray-400"
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          <span>Orders</span>
        </Link>

        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold ${
            location.pathname === "/profile" ? "text-[#0ea5e9]" : "text-gray-400"
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </Link>
      </div>

      {/* Floating high-fidelity Nigeria themed Cart Banner when cart has items but not on /cart page */}
      {cartTotalItems > 0 && location.pathname !== "/cart" && location.pathname !== "/checkout" && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 lg:left-auto lg:w-96 z-40">
          <Link 
            to="/cart"
            className="bg-[#070329] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10 hover:bg-[#120a61] transition group animate-bounce-short"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2.5 rounded-xl text-[#0ea5e9]">
                <ShoppingCartMock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-gray-300 font-bold block">Items in Basket</span>
                <span className="text-xs font-bold text-white block">
                  {cartTotalItems} {cartTotalItems === 1 ? "Item" : "Items"} • {currency}{cartTotalPrice.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0ea5e9] bg-white/5 py-1.5 px-3 rounded-lg group-hover:bg-white/10 transition">
              <span>View Basket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      )}


      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS / DRAWERS (FROM OWODE FOOD SIDEBAR DESIGN SYSTEM) */}
      {/* ========================================================================= */}

      {/* 1. WALLET MODAL */}
      {activeModal === "wallet" && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-[#070329] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black tracking-tight uppercase">My Owode Food Wallet</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-white/10 rounded-xl text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {walletSuccessMsg && (
                <div className="p-3 bg-green-500/10 text-green-400 rounded-xl text-xs font-bold border border-green-500/20 text-center animate-pulse">
                  {walletSuccessMsg}
                </div>
              )}

              {fundingProcess ? (
                // 🔒 OWODE FOOD SECURE PAYMENT GATEWAY SANDBOX SIMULATOR
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  {/* Gateway secure header */}
                  <div className="bg-blue-50/50 p-2.5 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 animate-pulse" />
                      <div>
                        <span className="text-[9px] uppercase font-bold text-blue-500 font-mono block">Sandbox Merchant Terminal</span>
                        <span className="text-xs font-black text-blue-950 font-sans">Owode Food Pay 🔒</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                      TEST ENVIRONMENT
                    </span>
                  </div>

                  {/* Amount Display & Ref */}
                  <div className="text-center py-3 bg-gray-50/60 rounded-2xl border border-gray-100 relative overflow-hidden">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest font-mono">Invoice Settlement</span>
                    <h2 className="text-2xl font-black font-mono text-[#070329] mt-1">
                      {currency}{fundingProcess.amount.toLocaleString()}.00
                    </h2>
                    <div className="flex items-center justify-center gap-1.5 mt-1 text-[9px] text-gray-500 font-semibold">
                      <span className="font-mono">REF: {fundingProcess.txRef}</span>
                    </div>
                  </div>

                  {/* Errors if any */}
                  {fundingProcess.error && (
                    <div className="p-2.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px] font-bold flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{fundingProcess.error}</span>
                    </div>
                  )}

                  {/* STAGE: METHOD_SELECT */}
                  {fundingProcess.stage === "method_select" && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                        Select Your Simulated Funding Channel
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFundingProcess(prev => prev ? { ...prev, stage: "card_entry", method: "card" } : null)}
                          className="p-3 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-xl text-center space-y-2 transition cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-gray-800 block">Simulate Card</span>
                          <p className="text-[8px] text-gray-400">VISA / MasterCard Sandbox</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFundingProcess(prev => prev ? { ...prev, stage: "bank_transfer", method: "bank_transfer" } : null)}
                          className="p-3 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 rounded-xl text-center space-y-2 transition cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                            <Landmark className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-gray-800 block">Simulate Transfer</span>
                          <p className="text-[8px] text-gray-400">Mock Bank Clearing Feed</p>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFundingProcess(null)}
                        className="w-full py-2 text-center text-xs font-bold text-gray-500 hover:text-gray-800 transition cursor-pointer"
                      >
                        Cancel recharge & return
                      </button>
                    </div>
                  )}

                  {/* STAGE: CARD_ENTRY */}
                  {fundingProcess.stage === "card_entry" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Enter Secure Card Credentials
                        </h4>
                        <button
                          type="button"
                          onClick={() => setFundingProcess(prev => prev ? { 
                            ...prev, 
                            cardNumber: "4000 1234 5678 9010",
                            cardExpiry: "12/28",
                            cardCvv: "123"
                          } : null)}
                          className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          💡 Auto-fill Sandbox Card
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Card Number</label>
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="4000 1234 5678 9010"
                              value={fundingProcess.cardNumber}
                              onChange={(e) => setFundingProcess(prev => prev ? { ...prev, cardNumber: e.target.value } : null)}
                              className="w-full text-xs p-2.5 pl-9 border border-gray-100 rounded-xl font-mono outline-none focus:border-blue-300"
                            />
                            <CreditCard className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Expiry Date</label>
                            <input 
                              type="text"
                              placeholder="MM/YY"
                              value={fundingProcess.cardExpiry}
                              onChange={(e) => setFundingProcess(prev => prev ? { ...prev, cardExpiry: e.target.value } : null)}
                              className="w-full text-xs p-2.5 border border-gray-100 rounded-xl font-mono outline-none focus:border-blue-300 text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">CVV Security Code</label>
                            <input 
                              type="password"
                              maxLength={3}
                              placeholder="***"
                              value={fundingProcess.cardCvv}
                              onChange={(e) => setFundingProcess(prev => prev ? { ...prev, cardCvv: e.target.value } : null)}
                              className="w-full text-xs p-2.5 border border-gray-100 rounded-xl font-mono outline-none focus:border-blue-300 text-center tracking-widest"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setFundingProcess(prev => prev ? { ...prev, stage: "method_select" } : null)}
                          className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!fundingProcess.cardNumber || !fundingProcess.cardExpiry || !fundingProcess.cardCvv) {
                              setFundingProcess(prev => prev ? { ...prev, error: "Please enter your sandbox card credentials to verify." } : null);
                              return;
                            }
                            setFundingProcess(prev => prev ? { ...prev, stage: "processing", error: undefined, loaderText: "Authorizing with sandbox issuing bank..." } : null);
                            setTimeout(() => {
                              setFundingProcess(prev => prev ? { ...prev, stage: "otp_entry" } : null);
                            }, 1400);
                          }}
                          className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer text-center shadow-md active:scale-95"
                        >
                          Authorize Payment 💳
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE: OTP_ENTRY */}
                  {fundingProcess.stage === "otp_entry" && (
                    <div className="space-y-3">
                      <div className="text-center space-y-1">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                          <KeyRound className="w-4 h-4 animate-bounce" />
                        </div>
                        <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                          Enter 3D-Secure Sandbox OTP
                        </h4>
                        <p className="text-[9px] text-gray-400 leading-normal max-w-xs mx-auto">
                          A simulated SMS OTP has been generated for your session to complete sandbox settlement.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input 
                          type="text"
                          placeholder="Enter 6-Digit OTP"
                          maxLength={6}
                          value={fundingProcess.otp}
                          onChange={(e) => setFundingProcess(prev => prev ? { ...prev, otp: e.target.value } : null)}
                          className="w-full text-center text-xs p-2.5 border border-gray-100 rounded-xl font-mono font-bold tracking-widest outline-none focus:border-blue-300"
                        />

                        <button
                          type="button"
                          onClick={() => setFundingProcess(prev => prev ? { ...prev, otp: "123456" } : null)}
                          className="w-full py-1 text-center text-[9px] font-bold text-blue-600 hover:underline block"
                        >
                          💡 Auto-fill Sandbox Code (123456)
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (fundingProcess.otp !== "123456" && fundingProcess.otp.length < 4) {
                            setFundingProcess(prev => prev ? { ...prev, error: "Incorrect OTP code. Please use sandbox master code: 123456" } : null);
                            return;
                          }
                          setFundingProcess(prev => prev ? { ...prev, stage: "processing", error: undefined, loaderText: "Settle funds in merchant secure ledger..." } : null);
                          setTimeout(() => {
                            const amt = fundingProcess.amount;
                            setWalletBalance(prev => prev + amt);
                            setFundingProcess(prev => prev ? { ...prev, stage: "success" } : null);
                          }, 1200);
                        }}
                        className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-xs font-black tracking-wide transition cursor-pointer text-center shadow-md active:scale-95"
                      >
                        Verify OTP & Authorize Settlement ⚡
                      </button>
                    </div>
                  )}

                  {/* STAGE: BANK_TRANSFER */}
                  {fundingProcess.stage === "bank_transfer" && (
                    <div className="space-y-3">
                      <div className="text-center space-y-0.5">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Simulated Escrow Bank Transfer
                        </h4>
                        <p className="text-[9px] text-gray-400 leading-normal">
                          Copy the dynamic escrow coordinates below and trigger the mock clearing check.
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-bold uppercase text-[8px]">Escrow Bank</span>
                          <span className="font-extrabold text-[#070329]">Providus Bank</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-bold uppercase text-[8px]">Account Number</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-xs tracking-wide text-amber-950 select-all">
                              982183201
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("982183201");
                              }}
                              className="text-amber-600 hover:text-amber-800 p-0.5 rounded cursor-pointer"
                              title="Copy Account Number"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-bold uppercase text-[8px]">Account Name</span>
                          <span className="font-bold text-[#070329] text-right truncate max-w-[150px]">
                            Owode Food Escrow - {currentUser?.name || "Customer"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-amber-100/60 pt-1.5">
                          <span className="text-gray-400 font-bold uppercase text-[8px]">Amount Due</span>
                          <span className="font-black text-[#070329] text-xs font-mono">
                            {currency}{fundingProcess.amount.toLocaleString()}.00
                          </span>
                        </div>
                      </div>

                      <p className="text-[8px] text-amber-700/80 bg-amber-50 p-2 rounded-lg text-center leading-normal">
                        💡 In development, this is a simulation. Click the confirmation button below to verify.
                      </p>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setFundingProcess(prev => prev ? { ...prev, stage: "method_select" } : null)}
                          className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFundingProcess(prev => prev ? { ...prev, stage: "processing", error: undefined, loaderText: "Scanning sandbox incoming Providus settlement feed..." } : null);
                            setTimeout(() => {
                              const amt = fundingProcess.amount;
                              setWalletBalance(prev => prev + amt);
                              setFundingProcess(prev => prev ? { ...prev, stage: "success" } : null);
                            }, 1600);
                          }}
                          className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer text-center shadow-md active:scale-95"
                        >
                          I have made the transfer ⚡
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE: PROCESSING */}
                  {fundingProcess.stage === "processing" && (
                    <div className="py-6 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-gray-700">
                          {fundingProcess.loaderText || "Verifying secure sandbox settlement..."}
                        </p>
                        <p className="text-[9px] text-gray-400 font-mono">
                          Securing channel • SSL 256-Bit Authorized
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STAGE: SUCCESS */}
                  {fundingProcess.stage === "success" && (
                    <div className="text-center space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="text-base font-black text-[#070329]">Recharge Successful!</h3>
                        <p className="text-[11px] text-gray-500">
                          Your Owode Food wallet secure balance has been credited.
                        </p>
                      </div>

                      <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-left space-y-2 font-mono text-[10px] text-gray-600 max-w-xs mx-auto">
                        <div className="flex justify-between">
                          <span>Cleared Settle</span>
                          <span className="font-bold text-gray-800">+{currency}{fundingProcess.amount.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>New Balance</span>
                          <span className="font-bold text-gray-800">{currency}{walletBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200/50 pt-1.5 text-[9px]">
                          <span>Tx Reference</span>
                          <span className="text-gray-400 select-all">{fundingProcess.txRef}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFundingProcess(null);
                          setWalletSuccessMsg(`Wallet loaded successfully! ${currency}${fundingProcess.amount.toLocaleString()} added.`);
                          setTimeout(() => {
                            setWalletSuccessMsg(null);
                          }, 4000);
                        }}
                        className="w-full py-2.5 bg-[#070329] hover:bg-[#100b47] text-white rounded-xl text-xs font-black transition cursor-pointer text-center shadow-md active:scale-95"
                      >
                        Done - Return to Wallet 🌟
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // STANDARD WALLET OVERVIEW DASHBOARD
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Premium Nigerian balance card */}
                  <div className="bg-gradient-to-br from-[#070329] via-[#100b47] to-[#1d1473] text-white p-4 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 top-0 w-24 opacity-5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-blue-900 to-[#070329]"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-[#0ea5e9] font-black">Authorized Balance</span>
                      <span className="text-[9px] font-bold py-0.5 px-2 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Active</span>
                    </div>
                    <h2 className="text-2xl font-black mb-1 font-mono">{currency}{walletBalance.toLocaleString()}</h2>
                    <p className="text-[9px] text-gray-300">Pre-authorized credits for instant one-click checking.</p>
                  </div>

                  {/* Instant 1-Click Reload Section */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <span>⚡ Secure Top-up Presets</span>
                      <span className="text-[8px] bg-[#0ea5e9]/10 text-[#0ea5e9] py-0.5 px-1.5 rounded font-black lowercase tracking-normal">instant sandbox</span>
                    </h4>
                    
                    {/* Large 1-Click Standard Button */}
                    <button 
                      onClick={() => handleQuickFund(5000)}
                      className="w-full flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white p-2.5 rounded-xl text-xs font-black tracking-wide transition shadow-md active:scale-95 cursor-pointer"
                    >
                      <span className="text-sm">⚡</span>
                      <span>Recharge +{currency}5,000</span>
                    </button>

                    {/* Grid of Preset values */}
                    <div className="grid grid-cols-4 gap-2">
                      {[1000, 2000, 10000, 25000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleQuickFund(amt)}
                          className="p-1.5 border border-gray-100 hover:border-amber-200 bg-gray-50/50 hover:bg-amber-50 rounded-xl text-[10px] font-extrabold text-[#070329] transition-all active:scale-95 text-center cursor-pointer"
                        >
                          +{currency}{amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fund wallet form */}
                  <form onSubmit={handleFundWallet} className="space-y-2 pt-2 border-t border-gray-50">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Recharge Amount</h4>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#070329]">{currency}</span>
                        <input 
                          type="number"
                          required
                          placeholder={`Amount`}
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="w-full text-xs p-2.5 pl-6 border border-gray-100 rounded-xl font-mono focus:ring-4 focus:ring-blue-100 outline-none"
                        />
                      </div>
                      <button type="submit" className="bg-[#070329] hover:bg-[#100b47] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">
                        Recharge
                      </button>
                    </div>
                  </form>

                  {/* payment methods */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secure Funding Networks</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col justify-between">
                        <span className="text-[8px] font-bold text-[#070329] uppercase">Sandbox Mode</span>
                        <span className="text-[10px] font-extrabold text-green-600 mt-0.5 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-green-500 animate-ping"></span>
                          Active
                        </span>
                      </div>
                      <div className="p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 flex flex-col justify-between">
                        <span className="text-[8px] font-bold text-[#070329] uppercase">Channels</span>
                        <span className="text-[10px] font-extrabold text-[#0ea5e9] mt-0.5">Card / Transfer</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADDRESSES MODAL */}
      {activeModal === "addresses" && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#070329] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-black tracking-tight uppercase">Saved Addresses</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-xl text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Add form */}
              <form onSubmit={handleAddAddress} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-150">
                <span className="text-xs font-black text-gray-950 uppercase tracking-wider block">Add New Saved Address</span>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Street Address</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 15 Broad St, Fate Road"
                    value={newStreetAddress}
                    onChange={(e) => setNewStreetAddress(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none text-gray-950 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Select Delivery District / Zone</label>
                  <input
                    type="text"
                    placeholder="🔍 Filter zones list..."
                    value={districtFilterQuery}
                    onChange={(e) => setDistrictFilterQuery(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100 text-gray-950 font-medium mb-1.5"
                  />
                  <select
                    value={newAddressDistrict}
                    onChange={(e) => setNewAddressDistrict(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none text-gray-950 font-bold"
                  >
                    {availableLocations
                      .filter((loc) => loc.toLowerCase().includes(districtFilterQuery.toLowerCase()))
                      .map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    {availableLocations.filter((loc) => loc.toLowerCase().includes(districtFilterQuery.toLowerCase())).length === 0 && (
                      <option value="">No matching zones found</option>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Landmark Note / Delivery Instructions</label>
                  <input 
                    type="text"
                    placeholder="e.g. Opposite MTN Mast, Green gate"
                    value={newLandmarkNote}
                    onChange={(e) => setNewLandmarkNote(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none text-gray-950 font-semibold"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-[#070329] hover:bg-[#120a61] text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Save Address & Notes
                </button>
              </form>

              {/* Lists */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Your saved slots</span>
                {savedAddresses.filter(addr => !currentUser || addr.userId === currentUser.id).map((addr) => (
                  <div key={addr.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="text-xs font-black text-[#070329] truncate">{addr.streetAddress}</span>
                      </div>
                      <div className="pl-5 space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-bold rounded">
                          {addr.district}
                        </span>
                        {addr.landmarkNote && (
                          <p className="text-[11px] text-gray-500 font-medium italic">
                            💡 Landmark: {addr.landmarkNote}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAddress(addr.id)}
                      className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg shrink-0 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {savedAddresses.filter(addr => !currentUser || addr.userId === currentUser.id).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No saved addresses yet. Save your primary locations for quick checkouts!</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. FAVORITES MODAL */}
      {activeModal === "favorites" && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#070329] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-400 fill-red-400" />
                <h3 className="text-lg font-black tracking-tight uppercase">Favorite Hubs</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-xl text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Your Quick Favorites</span>
              
              <div className="space-y-3">
                {vendors.filter(v => favorites.includes(v.id)).map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <img src={v.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-[#070329]">{v.name}</h4>
                        <p className="text-[10px] text-gray-400">{v.cuisine} Cuisine</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setActiveModal(null);
                        navigate(`/vendor/${v.id}`);
                      }}
                      className="bg-[#070329] hover:bg-[#120a61] text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                    >
                      Enter Menu
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. HELP & SUPPORT MODAL */}
      {activeModal === "help" && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#070329] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-[#0ea5e9]" />
                <h3 className="text-lg font-black tracking-tight uppercase">Support Center</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-xl text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#070329]">How can we help you today?</h4>
                <p className="text-xs text-gray-500">Contact our 24/7 support line for order issues, delivery, or general inquiries.</p>
              </div>

              <div className="space-y-2 pt-2">
                <a href="tel:+234803000000" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                  <span className="text-xs font-bold text-[#070329]">Support Hotline:</span>
                  <span className="text-xs text-[#0ea5e9] font-bold font-mono ml-auto">+234 (0) 803 000 000</span>
                </a>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-500/10 text-amber-800 text-[11px] leading-normal flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Your current delivery agent **Rider Daniel** can be contacted directly inside your active delivery status cards!</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple visual SVG proxies to prevent any imports problems and enforce gorgeous visual rhythm
function ShoppingCartMock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
