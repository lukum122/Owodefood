import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings, LogOut, ChevronRight, Store, Star, AlertCircle, Menu, X } from "lucide-react";

export const VendorLayout: React.FC = () => {
  const { currentVendor, logout } = useDatabase();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", path: "/vendor/dashboard", icon: LayoutDashboard },
    { name: "Active Orders", path: "/vendor/orders", icon: ShoppingBag },
    { name: "Menu Products", path: "/vendor/products", icon: UtensilsCrossed },
    { name: "Vendor Settings", path: "/vendor/settings", icon: Settings },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#070329]">
      {/* Brand Banner */}
      <div className="p-6 border-b border-blue-950/70 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center font-bold text-sm">
          V
        </div>
        <div>
          <h1 className="font-bold tracking-tight text-sm leading-none text-white">NavyBites</h1>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-mono">Kitchen Terminal</p>
        </div>
      </div>

      {/* Current Active Vendor Details Container */}
      {currentVendor ? (
        <div className="p-5 bg-blue-950/30 border-b border-blue-950/60 text-xs shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-green-400 shrink-0" />
            <span className="font-bold truncate text-white block">{currentVendor.name}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
            <span>{currentVendor.rating.toFixed(1)} Rating</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                currentVendor.status === "approved" ? "bg-green-400" : "bg-yellow-400"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                currentVendor.status === "approved" ? "bg-green-500" : "bg-yellow-500"
              }`}></span>
            </span>
            <span className={`capitalize font-medium text-[11px] ${
              currentVendor.status === "approved" ? "text-green-400" : "text-yellow-400 font-semibold"
            }`}>
              {currentVendor.status} Status
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-950/20 border-b border-blue-950/60 m-3 rounded-xl flex gap-2 items-start text-xs text-red-200 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">No Store Setup</p>
            <p className="text-[10px] opacity-80">This account has no vendor record created yet.</p>
          </div>
        </div>
      )}

      {/* Sidebar Navigation Links */}
      <nav className="flex-grow p-4 space-y-1.5 focus:outline-none overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== "/vendor/dashboard" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between py-2.5 px-4 rounded-xl transition text-sm font-medium ${
                isActive
                  ? "bg-blue-600/20 border border-blue-500/30 text-white shadow-sm font-semibold"
                  : "text-gray-300 hover:bg-blue-950/40 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Logout */}
      <div className="p-4 border-t border-blue-950/60 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-red-400 hover:bg-red-950/20 hover:text-red-300 transition text-sm font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out Terminal</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900 overflow-x-hidden">
      
      {/* Sidebar navigation - Desktop only */}
      <aside className="w-64 bg-[#070329] text-white flex-col shrink-0 hidden lg:flex border-r border-blue-950/40">
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
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-[#070329] animate-in slide-in-from-left duration-200">
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

      {/* Main Context Panel */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 h-16 z-30 sticky top-0 flex items-center justify-between px-4 sm:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex lg:hidden items-center justify-center font-extrabold text-sm shadow-sm shrink-0">
              V
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-lg text-gray-900 tracking-tight leading-tight sm:leading-normal">
                {menuItems.find((m) => location.pathname.startsWith(m.path))?.name || "Vendor Dashboard"}
              </h2>
              <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-mono block lg:hidden">Kitchen Terminal</span>
              <p className="text-[10px] text-gray-400 mt-1 hidden lg:block">Manage order acceptances, dispatch operations, and products.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-[10px] text-green-705 bg-green-50 px-2 py-0.5 sm:py-1 rounded border border-green-150 font-bold uppercase tracking-wider">
              ONLINE
            </span>
            <div className="h-4 w-px bg-gray-200 sm:block hidden"></div>
            <div className="sm:flex items-center gap-2 hidden">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-gray-700">Kitchen Active</span>
            </div>

            {/* Mobile Hamburger to the right side */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -mr-1.5 text-gray-650 hover:bg-gray-100 rounded-xl lg:hidden block transition cursor-pointer"
              title="Open navigation menu"
              id="vendor-hamburger-menu-button"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
