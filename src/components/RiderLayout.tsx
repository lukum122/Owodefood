import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { Bike, Compass, Briefcase, History, User, LogOut, Shield, Power } from "lucide-react";

export const RiderLayout: React.FC = () => {
  const { currentRider, logout, updateRiderProfile } = useDatabase();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col sm:flex-row font-sans text-gray-900">
      
      {/* Sidebar for Rider */}
      <aside className="w-full sm:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        {/* Rider Application Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center">
              <Bike className="w-4 h-4 text-slate-900 fill-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none text-white">NavyBites Courier</h1>
              <span className="text-[10px] text-gray-400 font-mono">Mobile Dispatch v1.2</span>
            </div>
          </div>
          
          <div className="sm:hidden">
            <button
              onClick={handleLogout}
              className="p-2 text-red-400 hover:bg-slate-800 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 w-4" />
            </button>
          </div>
        </div>

        {/* Rider Availability Controller Dashboard */}
        {currentRider && (
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duties Status</p>
                <p className="font-bold text-white text-xs mt-0.5">
                  {currentRider.isAvailable ? "Accepting Orders" : "Offline / Idle"}
                </p>
              </div>
              
              <button
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
        <nav className="flex-grow p-4 space-y-1 sm:space-y-1.5 flex flex-row sm:flex-col justify-around sm:justify-start overflow-x-auto select-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl transition text-xs sm:text-sm font-medium ${
                  isActive
                    ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-yellow-400" : "text-gray-400"}`} />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section - Logout */}
        <div className="hidden sm:block p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-red-400 hover:bg-red-950/20 hover:text-red-300 transition text-sm font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4 animate-pulse" />
            <span>Sign Out Courier</span>
          </button>
        </div>
      </aside>

      {/* Main Container For Rider */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top bar for Rider */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 h-16 z-30 sticky top-0 flex items-center justify-between px-6 sm:px-8 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-900 tracking-tight text-sm sm:text-base">
              {menuItems.find((m) => location.pathname.startsWith(m.path))?.name || "Rider Console"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 font-semibold uppercase font-mono">
              GPS Active
            </span>
            <div className="h-6 w-px bg-gray-200"></div>
            <span className="text-xs text-slate-600 font-semibold">{currentRider?.name || "Courier"}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-grow p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
