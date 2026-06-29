import React, { useState } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { UserRole } from "../types";
import { useNavigate } from "react-router-dom";
import { Sparkles, RefreshCw, User, Store, Bike, ShieldCheck, ChevronRight, Menu, X, Database, Users } from "lucide-react";

export const RoleSwitcher: React.FC = () => {
  const { currentUser, overrideUserRole, orders, vendors, riders, users } = useDatabase();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitch = (role: UserRole) => {
    overrideUserRole(role);
    setIsOpen(false);
    
    // Redirect to the appropriate portal landing route
    const defaultRedirects: Record<UserRole, string> = {
      customer: "/",
      vendor: "/vendor/dashboard",
      rider: "/rider/dashboard",
      admin: "/admin/dashboard",
      employee: "/admin/dashboard",
    };
    navigate(defaultRedirects[role]);
  };

  const activeCount = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {isOpen ? (
        <div className="w-80 bg-[#070329] text-white rounded-2xl shadow-2xl border border-blue-900/30 overflow-hidden transform scale-100 transition-all duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#0d093e] to-[#070329] border-b border-blue-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <div>
                <h3 className="font-semibold text-sm leading-tight">Simulation Control Hub</h3>
                <p className="text-[10px] text-gray-400">Instantly swap identities & test state</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-blue-900/40 rounded-lg text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="px-4 py-2 bg-[#0c0836] border-b border-blue-900/30 flex items-center justify-around text-center">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Active Orders</p>
              <p className="text-sm font-bold text-yellow-400">{activeCount}</p>
            </div>
            <div className="h-4 w-px bg-blue-900/30"></div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Vendors/Riders</p>
              <p className="text-sm font-bold text-sky-400">{vendors.length}/{riders.length}</p>
            </div>
          </div>

          {/* Role selection list */}
          <div className="p-4 space-y-2">
            <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider block mb-1">
              Select Profile to Simulate
            </span>
            
            {/* Customer Button */}
            <button
              onClick={() => handleSwitch("customer")}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left group ${
                currentUser?.role === "customer" 
                  ? "bg-blue-600/30 border border-blue-500 text-white" 
                  : "bg-blue-950/20 hover:bg-blue-900/30 border border-transparent text-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans">Sarah Collins</p>
                  <p className="text-[10px] text-gray-400">Role: Customer (Buyer)</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Vendor Button */}
            <button
              onClick={() => handleSwitch("vendor")}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left group ${
                currentUser?.role === "vendor" 
                  ? "bg-green-600/30 border border-green-500 text-white" 
                  : "bg-blue-950/20 hover:bg-blue-900/30 border border-transparent text-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans">Bella Italia Owner</p>
                  <p className="text-[10px] text-gray-400">Role: Food Vendor</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Rider Button */}
            <button
              onClick={() => handleSwitch("rider")}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left group ${
                currentUser?.role === "rider" 
                  ? "bg-amber-600/30 border border-amber-500 text-white" 
                  : "bg-blue-950/20 hover:bg-blue-900/30 border border-transparent text-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans">Alex Mercer</p>
                  <p className="text-[10px] text-gray-400">Role: Delivery Rider</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Admin Button */}
            <button
              onClick={() => handleSwitch("admin")}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left group ${
                currentUser?.role === "admin" 
                  ? "bg-purple-600/30 border border-purple-500 text-white" 
                  : "bg-blue-950/20 hover:bg-blue-900/30 border border-transparent text-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans">Platform Board Admin</p>
                  <p className="text-[10px] text-gray-400">Super Administrator</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Employee Button */}
            <button
              onClick={() => handleSwitch("employee")}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left group ${
                currentUser?.role === "employee" 
                  ? "bg-teal-600/30 border border-teal-500 text-white" 
                  : "bg-blue-950/20 hover:bg-blue-900/30 border border-transparent text-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold font-sans">Platform Staff Agent</p>
                  <p className="text-[10px] text-gray-400">Employee Management Simulation</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Footer context feedback */}
          <div className="p-3 bg-blue-950/60 border-t border-blue-900/40 text-[10px] flex items-center justify-between text-gray-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-sky-400" />
              Active User: <span className="text-white font-semibold">{currentUser?.name || "Guest"}</span>
            </span>
            <span className="capitalize font-bold text-sky-400">{currentUser?.role}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 py-3 px-5 bg-gradient-to-r from-[#070329] to-[#120a59] text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-300 border border-blue-900/40 group font-sans"
        >
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold tracking-wide">portal simulator</span>
          <span className="bg-yellow-400/20 text-yellow-400 rounded-full text-[9px] font-bold px-2 py-0.5 capitalize animate-bounce">
            {currentUser?.role || "Select role"}
          </span>
        </button>
      )}
    </div>
  );
};
