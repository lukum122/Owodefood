import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { 
  Shield, 
  LayoutDashboard, 
  ShoppingBag, 
  Store, 
  Bike, 
  Users, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Activity, 
  Menu, 
  X, 
  Receipt, 
  ShieldCheck, 
  Coins, 
  Bell,
  Lock,
  ShieldAlert,
  ChevronDown,
  Layers
} from "lucide-react";
import { UserRole } from "../types";

export const AdminLayout: React.FC = () => {
  const { 
    currentUser, 
    logout, 
    orders,
    notifications = [],
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    employees = [],
    switchRole,
  } = useDatabase();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const adminNotifications = notifications.filter(
    n => n.userId === "admin-1" || n.userId === "all" || n.userId === "admin"
  );
  const unreadCount = adminNotifications.filter(n => !n.read).length;

  const myApprovedRoles = currentUser?.roles || (currentUser ? [currentUser.role] : []);

  const isItemAllowed = (itemName: string) => {
    if (currentUser?.role === "admin" || currentUser?.role === "super_admin") {
      return true;
    }
    
    if (currentUser?.role === "employee") {
      const empProfile = employees.find(emp => emp.id === currentUser?.id || emp.email.toLowerCase() === currentUser?.email.toLowerCase());
      
      // If yet to be assigned a role under staff management (empProfile is undefined)
      if (!empProfile) {
        // "low privilege" by default: only "Analytics Dashboard" and "POS Terminal"
        return itemName === "Analytics Dashboard" || itemName === "POS Terminal";
      }

      // If they exist under staff management, check their assigned permissions:
      const perms = empProfile.permissions || [];
      const dept = empProfile.department;

      switch (itemName) {
        case "Analytics Dashboard":
          return true; // Always visible for employees
        case "POS Terminal":
          return true; // Always visible for employees
        case "Master Orders":
          return perms.includes("manage_orders") || dept === "manager" || dept === "admin";
        case "Manage Vendors":
          return perms.includes("manage_vendors") || dept === "manager" || dept === "admin";
        case "Manage Riders":
          return perms.includes("manage_riders") || dept === "manager" || dept === "admin";
        case "Manage Users":
          return dept === "manager" || dept === "admin";
        case "Manage Staff":
          return perms.includes("manage_employees") || dept === "admin";
        case "Wallet Management":
          return dept === "finance" || dept === "admin";
        case "Platform Communications":
          return perms.includes("manage_orders") || dept === "support" || dept === "admin";
        case "Homepage Engine":
          return perms.includes("view_settings") || dept === "admin";
        case "Global Settings":
          return perms.includes("view_settings") || dept === "admin";
        default:
          return false;
      }
    }
    
    return false;
  };

  const menuItems = [
    { name: "Analytics Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "POS Terminal", path: "/admin/pos", icon: Receipt },
    { name: "Master Orders", path: "/admin/orders", icon: ShoppingBag },
    { name: "Manage Vendors", path: "/admin/vendors", icon: Store },
    { name: "Manage Riders", path: "/admin/riders", icon: Bike },
    { name: "Manage Users", path: "/admin/customers", icon: Users },
    { name: "Manage Staff", path: "/admin/employees", icon: ShieldCheck },
    { name: "Wallet Management", path: "/admin/wallets", icon: Coins },
    { name: "Platform Communications", path: "/admin/notifications", icon: Bell },
    { name: "Homepage Engine", path: "/admin/discovery", icon: Layers },
    { name: "Global Settings", path: "/admin/settings", icon: Settings },
  ];

  const allowedMenuItems = menuItems.filter(item => isItemAllowed(item.name));
  const currentItem = menuItems.find((m) => location.pathname === m.path || (m.path !== "/admin/dashboard" && location.pathname.startsWith(m.path)));
  const isAllowed = currentItem ? isItemAllowed(currentItem.name) : true;

  const pendingCount = orders.filter(o => o.status === "pending").length;

  const renderSidebarContent = () => (
    <>
      {/* Brand Banner */}
      <div className="p-6 border-b border-slate-900 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-purple-900/30">
            <Shield className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="text-left">
            <h1 className="font-bold tracking-tight text-sm leading-none text-white">Owode Food Admin</h1>
            <span className="text-[9px] text-purple-400 mt-1 uppercase font-semibold font-mono tracking-wider block">Operations HQ</span>
          </div>
        </Link>
        
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
        {allowedMenuItems.map((item) => {
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
                {currentItem?.name || "System Admin"}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 hidden lg:block">Monitor revenue trends, approve merchant applications, register drivers, and audits.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 font-sans">
            <div className="relative">
              <button 
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl text-gray-600 relative transition cursor-pointer active:scale-95 flex items-center justify-center border border-gray-100"
                title="View Admin Alerts"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center leading-none scale-100">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Admin Alerts Popover Dropdown */}
              {showNotifPopover && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifPopover(false)} 
                  />
                  <div className="fixed left-4 right-4 top-[64px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white border border-gray-100 rounded-3xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-200 text-left text-gray-900">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                      <div>
                        <h4 className="font-extrabold text-[#070329] text-xs">Admin Console Alerts</h4>
                        <span className="text-[8.5px] text-gray-400 uppercase tracking-wider font-bold">System, Orders & Wallet events</span>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        {unreadCount > 0 && (
                          <button 
                            onClick={() => markAllNotificationsAsRead("admin-1")}
                            className="text-purple-600 hover:text-purple-800 font-bold transition cursor-pointer bg-transparent border-none p-0"
                          >
                            Read All
                          </button>
                        )}
                        {adminNotifications.length > 0 && (
                          <button 
                            onClick={() => clearAllNotifications("admin-1")}
                            className="text-gray-400 hover:text-gray-600 transition cursor-pointer font-medium bg-transparent border-none p-0"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                      {adminNotifications.length > 0 ? (
                        adminNotifications.map((n) => (
                          <div 
                            key={n.id}
                            onClick={() => markNotificationAsRead(n.id)}
                            className={`p-2.5 rounded-2xl border transition relative cursor-pointer text-xs ${
                              n.read 
                                ? "bg-white border-gray-100 hover:bg-gray-50/50" 
                                : "bg-rose-50/30 border-rose-100/50 hover:bg-rose-50/50"
                            }`}
                          >
                            {!n.read && (
                              <span className="absolute top-3.5 right-3 w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse" />
                            )}
                            <div className="flex gap-2 text-left">
                              <span className="text-sm shrink-0">
                                {n.type === "order" ? "🍳" : n.type === "wallet" ? "💰" : n.type === "delivery" ? "🚴" : "🔔"}
                              </span>
                              <div className="space-y-0.5 pr-3 min-w-0 flex-1">
                                <span className="block font-sans font-black text-gray-900 text-[10.5px] leading-tight break-words">
                                  {n.title}
                                </span>
                                <p className="text-[10px] text-gray-500 font-sans leading-relaxed break-words whitespace-pre-wrap">
                                  {n.message}
                                </p>
                                <span className="block text-[8px] text-gray-400 font-mono">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400 space-y-1">
                          <span className="text-xl block">🎐</span>
                          <span className="block text-[11px] font-bold text-gray-400">No admin alerts</span>
                          <span className="block text-[9px] text-gray-450">Everything is fully processed!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {myApprovedRoles.length > 1 ? (
              <div className="relative shrink-0">
                <select
                  value={currentUser?.role || "employee"}
                  onChange={(e) => {
                    const selectedRole = e.target.value as UserRole;
                    if (currentUser) {
                      const updated = { ...currentUser, role: selectedRole };
                      localStorage.setItem("fd_session_user", JSON.stringify(updated));
                    }
                    if (selectedRole === "customer") {
                      window.location.href = "/";
                    } else if (selectedRole === "vendor") {
                      window.location.href = "/vendor/dashboard";
                    } else if (selectedRole === "rider") {
                      window.location.href = "/rider/dashboard";
                    } else {
                      window.location.href = "/admin/dashboard";
                    }
                  }}
                  className="text-[10px] sm:text-xs font-bold font-mono text-purple-700 bg-purple-50 border border-purple-200 rounded-xl pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-4 focus:ring-purple-100 cursor-pointer appearance-none"
                >
                  {myApprovedRoles.map((role) => (
                    <option key={role} value={role}>
                      {role === "customer" ? "Consumer (Customer)" : role === "vendor" ? "Merchant (Vendor)" : role === "rider" ? "Rider (Delivery)" : role === "employee" ? "Staff" : "Admin"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-[9px] sm:text-xs text-purple-700 bg-purple-50 px-2 sm:px-2.5 py-1.5 rounded-xl border border-purple-100 font-bold font-mono whitespace-nowrap uppercase">
                {currentUser?.role === "employee" ? "Staff" : "Admin"}
              </span>
            )}

            <div className="h-6 w-px bg-gray-250"></div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 max-w-[80px] sm:max-w-none truncate">{currentUser?.name || "Master Admin"}</span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-4 sm:p-6 md:p-8">
          {isAllowed ? (
            <Outlet />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-gray-150 p-8 shadow-xl text-center space-y-6 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Access Restricted (Low Privilege)</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your staff account is currently active with baseline privileges. Additional operational hubs are locked until a Platform Administrator configures your department and authorized modules under <strong>Manage Staff</strong>.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Required Setup</span>
                <div className="flex gap-2.5 items-start">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-600 leading-normal">
                    Ask a super-admin to edit your email <strong>{currentUser?.email}</strong> and assign your department and authorized modules.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
