import React from "react";
import { Wrench } from "lucide-react";

interface MaintenanceScreenProps {
  message: string;
}

// Shown in place of the entire app when maintenance mode is on, for anyone
// who isn't an admin/employee/super_admin session. Deliberately standalone
// with no dependency on routing, auth, or page state — it just needs a
// message to display, so it can never itself break due to unrelated app
// state being mid-change during a maintenance window.
export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
  let cachedLogo = "";
  try { cachedLogo = localStorage.getItem("fd_cached_brand_logo") || ""; } catch {}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#070329] px-6 text-center">
      {cachedLogo ? (
        <img
          src={cachedLogo}
          alt="Owode Food"
          className="w-20 h-20 object-contain rounded-2xl"
        />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
          <Wrench className="w-9 h-9 text-white/70" />
        </div>
      )}
      <div className="space-y-2 max-w-sm">
        <p className="text-lg font-bold text-white">We'll be right back</p>
        <p className="text-sm text-white/60 leading-relaxed">{message}</p>
      </div>
    </div>
  );
};
