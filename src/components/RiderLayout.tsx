import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { 
  Bike, 
  Compass, 
  Briefcase, 
  History, 
  User, 
  LogOut, 
  Shield, 
  Power, 
  Menu, 
  X, 
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { UserRole } from "../types";

export const RiderLayout: React.FC = () => {
  const { currentUser, switchRole, currentRider, logout, updateRiderProfile } = useDatabase();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const myApprovedRoles = currentUser?.roles || (currentUser ? [currentUser.role] : []);

  const toggleAvailability = () => {
    if (!currentRider) return;
    updateRiderProfile({ isAvailable: !currentRider.isAvailable });
  };

  const menuItems = [
    { name: "Discover Jobs", path: "/rider/dashboard", icon: Compass },
    { name: "My Active Jobs", path: "/rider/deliveries", icon: Briefcase },
    { name: "Rider Payout History", path: "/rider/history", icon: History },
    { name: "Courier Profile", path: "/rider/profile", icon: User },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Rider Application Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center shadow-md">
            <Bike className="w-4 h-4 text-slate-900 fill-slate-900" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-sm tracking-tight leading-none text-white">Owode Food Courier</h1>
            <span className="text-[10px] text-gray-400 font-mono block">Mobile Dispatch v1.2</span>
          </div>
        </Link>

        {/* Close Button only visible in mobile sidebar drawer */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="sm:hidden p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          title="Close Navigation Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Rider Availability Controller Dashboard */}
      {currentRider && (
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duties Status</p>
              <p className="font-bold text-white text-xs mt-0.5">
                {currentRider.isAvailable ? "Accepting Orders" : "Offline / Idle"}
              </p>
            </div>
            
            <button
              type="button"
              onClick={toggleAvailability}
              className={`py-1 px-3 rounded-full flex items-center gap-1 cursor-pointer transition ${
                currentRider.isAvailable 
                  ? "bg-green-500 hover:bg-green-600 text-slate-950" 
                  : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span className="font-semibold text-[11px]">{currentRider.isAvailable ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[11px] text-gray-400">
            <span className="capitalize">Vehicle: <b className="text-white">{currentRider.vehicleType}</b></span>
          </div>
        </div>
      )}

      {/* Navigation links for Rider */}
      <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto select-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== "/rider/dashboard" && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center justify-between py-2.5 px-4 rounded-xl transition text-sm font-medium ${
                isActive
                  ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-yellow-400" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-yellow-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Logout */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-red-400 hover:bg-red-950/20 hover:text-red-300 transition text-sm font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out Courier</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      
      {/* Sidebar for Rider (Desktop view only, persistent) */}
      <aside className="hidden sm:flex flex-col w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        {renderSidebarContent()}
      </aside>

      {/* Sidebar Drawer Container for Rider (Mobile view, toggleable slide-out) */}
      <div className="sm:hidden">
        {/* Overlay Backdrop */}
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className={`fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />
        
        {/* Slider aside */}
        <aside 
          className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {renderSidebarContent()}
        </aside>
      </div>

      {/* Main Container For Rider */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top bar for Rider */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 h-16 z-30 sticky top-0 flex items-center justify-between px-4 sm:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button shown only in Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="sm:hidden p-2 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-xl text-slate-700 transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="font-bold text-gray-900 tracking-tight text-sm sm:text-base truncate">
              {menuItems.find((m) => location.pathname.startsWith(m.path))?.name || "Rider Console"}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {myApprovedRoles.length > 1 && (
              <div className="relative shrink-0 mr-1">
                <select
                  value={currentUser?.role || "rider"}
                  onChange={(e) => {
                    const selectedRole = e.target.value as UserRole;
                    switchRole(selectedRole);
                    if (selectedRole === "customer") {
                      navigate("/");
                    } else if (selectedRole === "vendor") {
                      navigate("/vendor/dashboard");
                    } else if (selectedRole === "rider") {
                      navigate("/rider/dashboard");
                    } else {
                      navigate("/admin/dashboard");
                    }
                  }}
                  className="text-[10px] sm:text-xs font-bold font-mono text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-4 focus:ring-yellow-100 cursor-pointer appearance-none"
                >
                  {myApprovedRoles.map((role) => (
                    <option key={role} value={role}>
                      {role === "customer" ? "Consumer" : role === "vendor" ? "Merchant" : role === "rider" ? "Rider" : role === "employee" ? "Staff" : "Admin"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-yellow-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <span className="text-[10px] sm:text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 font-semibold uppercase font-mono">
              GPS Active
            </span>
            <div className="h-6 w-px bg-gray-200"></div>
            <span className="text-xs text-slate-600 font-semibold truncate max-w-[100px] sm:max-w-none">{currentRider?.name || "Courier"}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-grow p-4 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
