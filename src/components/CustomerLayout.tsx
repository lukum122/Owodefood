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
  Menu
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
  
  // Simulated Wallet balance
  const [walletBalance, setWalletBalance] = useState<number>(14500);
  const [fundAmount, setFundAmount] = useState<string>("");
  const [walletSuccessMsg, setWalletSuccessMsg] = useState<string | null>(null);

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
      setWalletBalance(prev => prev + amt);
      setFundAmount("");
      setWalletSuccessMsg(`Wallet loaded successfully! ${currency}${amt.toLocaleString()} added.`);
      setTimeout(() => {
        setWalletSuccessMsg(null);
      }, 4000);
    }
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
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#070329] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-black tracking-tight uppercase">My Owode Food Wallet</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-xl text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {walletSuccessMsg && (
                <div className="p-3 bg-green-500/10 text-green-400 rounded-xl text-xs font-bold border border-green-500/20 text-center animate-pulse">
                  {walletSuccessMsg}
                </div>
              )}
              
              {/* Premium Nigerian balance card */}
              <div className="bg-gradient-to-br from-[#070329] via-[#100b47] to-[#1d1473] text-white p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 top-0 w-24 opacity-5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-blue-900 to-[#070329]"></div>
                
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#0ea5e9] font-black">Authorized Balance</span>
                  <span className="text-[10px] font-bold py-1 px-2.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Active</span>
                </div>
                <h2 className="text-3xl font-black mb-1 font-mono">{currency}{walletBalance.toLocaleString()}</h2>
                <p className="text-[10px] text-gray-400">Pre-authorized credits for instant one-click checking.</p>
              </div>

              {/* Fund wallet form */}
              <form onSubmit={handleFundWallet} className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Simulate Credit Funding</h4>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#070329]">{currency}</span>
                    <input 
                      type="number"
                      required
                      placeholder={`Enter ${currency} Amount`}
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full text-xs p-3 pl-7 border border-gray-100 rounded-xl font-mono focus:ring-4 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <button type="submit" className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-5 py-3 rounded-xl text-xs font-bold transition">
                    Reload Bag
                  </button>
                </div>
              </form>

              {/* payment methods */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fast Settlement Services</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Paystack Direct</span>
                    <span className="text-xs font-extrabold text-[#070329] mt-1">Connected</span>
                  </div>
                  <div className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">USSD (*737*)</span>
                    <span className="text-xs font-extrabold text-[#0ea5e9] mt-1">Available</span>
                  </div>
                </div>
              </div>

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
