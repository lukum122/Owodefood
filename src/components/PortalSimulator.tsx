import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { UserRole } from "../types";
import { Sparkles, ArrowRight, User, Shield, Bike, Store, ChevronDown, ChevronUp, Check } from "lucide-react";

export const PortalSimulator: React.FC = () => {
  const { currentUser, overrideUserRole } = useDatabase();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Only show the simulator if the user is a super admin
  const currentRole = currentUser?.role || "guest";
  
  if (currentRole !== "super_admin") {
    return null;
  }

  const rolesConfig: { role: UserRole; label: string; path: string; icon: React.ReactNode; color: string; desc: string }[] = [
    {
      role: "customer",
      label: "Customer Portal",
      path: "/",
      icon: <User className="w-4 h-4 text-blue-600" />,
      color: "border-blue-100 hover:bg-blue-50/50 text-blue-900",
      desc: "Order food, manage cart, track delivery status & payments."
    },
    {
      role: "vendor",
      label: "Vendor Portal",
      path: "/vendor/dashboard",
      icon: <Store className="w-4 h-4 text-emerald-600" />,
      color: "border-emerald-100 hover:bg-emerald-50/50 text-emerald-900",
      desc: "Manage kitchen orders, dishes, and restaurant profiles."
    },
    {
      role: "rider",
      label: "Rider Portal",
      path: "/rider/dashboard",
      icon: <Bike className="w-4 h-4 text-amber-600" />,
      color: "border-amber-100 hover:bg-amber-50/50 text-amber-900",
      desc: "Accept and deliver orders, track payouts, map routes."
    },
    {
      role: "admin",
      label: "Admin Portal",
      path: "/admin/dashboard",
      icon: <Shield className="w-4 h-4 text-purple-600" />,
      color: "border-purple-100 hover:bg-purple-50/50 text-purple-900",
      desc: "Complete business controls, rider approval, staff roles, POS."
    },
    {
      role: "employee",
      label: "Staff Portal",
      path: "/admin/dashboard",
      icon: <Shield className="w-4 h-4 text-indigo-600" />,
      color: "border-indigo-100 hover:bg-indigo-50/50 text-indigo-900",
      desc: "Limited privilege employee console to fulfill operations."
    }
  ];

  const handleSwitch = (role: UserRole, path: string) => {
    overrideUserRole(role);
    navigate(path);
    // Keep open or close
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans text-left">
      {/* Expanded Container */}
      {isOpen ? (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-150 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-[#070329] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold leading-tight">Portal Simulation</h3>
                <span className="text-[10px] text-gray-300">Fast role switching console</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
            {/* Active Role Indicator */}
            <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Currently Active</span>
                <p className="text-xs font-bold text-[#070329] capitalize">{currentRole} Profile</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {/* List of Roles */}
            <div className="space-y-2">
              {rolesConfig.map((cfg) => {
                const isActive = currentRole === cfg.role;
                return (
                  <button
                    key={cfg.role}
                    onClick={() => handleSwitch(cfg.role, cfg.path)}
                    className={`w-full text-left p-2.5 border rounded-xl transition flex gap-3 items-start cursor-pointer group ${
                      isActive 
                        ? "bg-[#070329]/5 border-[#070329] ring-2 ring-[#070329]/5" 
                        : cfg.color
                    }`}
                  >
                    <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0 mt-0.5">
                      {cfg.icon}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold block">{cfg.label}</span>
                        {isActive ? (
                          <span className="text-[9px] bg-[#070329] text-white font-bold py-0.5 px-1.5 rounded flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition group-hover:translate-x-0.5 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 leading-tight mt-0.5 block">
                        {cfg.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 text-center">
            <p className="text-[9px] text-gray-400">
              Owode Food Portal Simulation Sandbox
            </p>
          </div>
        </div>
      ) : (
        /* Floating Badge Trigger */
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#070329] text-white hover:bg-[#0c0540] px-4 py-3 rounded-full shadow-2xl transition duration-200 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer border border-white/15"
        >
          <Sparkles className="w-4 h-4 text-yellow-400 animate-bounce" />
          <span className="text-xs font-black tracking-tight">Portal Simulation</span>
          <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
        </button>
      )}
    </div>
  );
};
