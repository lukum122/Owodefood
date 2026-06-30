import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { Shield, LayoutDashboard, ShoppingBag, Store, Bike, Users, Settings, LogOut, ChevronRight, Activity, Menu, X, Receipt, ShieldCheck } from "lucide-react";

export const AdminLayout: React.FC = () => {
  const { currentUser, logout, orders } = useDatabase();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { name: "Analytics Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "POS Terminal", path: "/admin/pos", icon: Receipt },
    { name: "Master Orders", path: "/admin/orders", icon: ShoppingBag },
    { name: "Manage Vendors", path: "/admin/vendors", icon: Store },
    { name: "Manage Riders", path: "/admin/riders", icon: Bike },
    { name: "Manage Users", path: "/admin/customers", icon: Users },
    { name: "Manage Staff", path: "/admin/employees", icon: ShieldCheck },
    { name: "Global Settings", path: "/admin/settings", icon: Settings },
  ];

  const pendingCount = orders.filter(o => o.status === "pending").length;

  const renderSidebarContent = () => (
    <>
      {/* Brand Banner */}
      <div className="p-6 border-b border-slate-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-purple-900/30">
            <Shield className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sm leading-none text-white">NavyBites Admin</h1>
            <span className="text-[9px] text-purple-400 mt-1 uppercase font-semibold font-mono tracking-wider">Superintendent</span>
          </div>
        </div>
        
        {/* Close Button only visible in mobile sidebar drawer */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden p-1 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          title="Close Navigation Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Console operational status */}
      <div className="px-5 py-3.5 bg-slate-900/40 border-b border-slate-900 text-xs text-left">
        <div className="flex items-center justify-between mb-1.5 text-gray-400">
          <span>Overall Health:</span>
          <span className="text-green-400 font-mono text-[10px] font-bold">100% ONLINE</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-gray-300 font-medium">Platform HQ Node</span>
        </div>
      </div>

      {/* Links */}
      <nav className="flex-grow p-4 space-y-1.5 focus:outline-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== "/admin/dashboard" && location.pathname.startsWith(item.path));
          const isOrders = item.name === "Master Orders";
          
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center justify-between py-2.5 px-4 rounded-xl transition text-sm font-medium ${
                isActive
                  ? "bg-purple-600/25 border border-purple-500/30 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-900/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {isOrders && pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full">
                    {pendingCount}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-purple-400" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Logout */}
      <div className="p-4 border-t border-slate-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition text-sm font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Terminate Session</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      
      {/* Sidebar for Administration (Desktop view only, persistent) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-white shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Sidebar Drawer Container for Administration (Mobile view, toggleable slide-out) */}
      <div className="md:hidden">
        {/* Overlay Backdrop */}
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity duration-305 ${
            isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />
        
        {/* Slider aside */}
        <aside 
          className={`fixed inset-y-0 left-0 w-64 bg-slate-950 text-white flex flex-col shrink-0 z-50 transform transition-transform duration-305 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {renderSidebarContent()}
        </aside>
      </div>

      {/* Main Console Panel */}
      <div className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 min-h-16 z-30 sticky top-0 flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 shadow-xs shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button shown only in Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-xl text-slate-700 transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 tracking-tight truncate">
                {menuItems.find((m) => location.pathname.startsWith(m.path))?.name || "System Admin"}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 hidden lg:block">Monitor revenue trends, approve merchant applications, register drivers, and audits.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 font-sans">
            <span className="text-[9px] sm:text-xs text-purple-700 bg-purple-50 px-2 sm:px-2.5 py-1 rounded-md border border-purple-100 font-semibold font-mono whitespace-nowrap">
              ROOT
            </span>
            <div className="h-6 w-px bg-gray-250"></div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 max-w-[80px] sm:max-w-none truncate">{currentUser?.name || "Master Admin"}</span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
