import React, { useState } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Bike, ShieldCheck, User, Save, Edit3, Check, DollarSign } from "lucide-react";

export const RiderHistory: React.FC = () => {
  const { 
    currentRider, 
    orders, 
    currency,
    riderCommissionType,
    riderCommissionValue
  } = useDatabase();

  if (!currentRider) {
    return <div className="text-gray-500 text-sm">Rider profile not synced.</div>;
  }

  // Historic orders delivered by current rider
  const pastOrders = orders.filter(
    o => o.riderId === currentRider.id && o.status === "delivered"
  );

  // Helper to compute net rider payout after platform commission
  const getNetPayout = (deliveryFee: number) => {
    if (riderCommissionType === "flat") {
      return Math.max(0, deliveryFee - riderCommissionValue);
    } else {
      return Math.max(0, deliveryFee - (deliveryFee * riderCommissionValue) / 100);
    }
  };

  const netEarnings = pastOrders.reduce(
    (sum, o) => sum + getNetPayout(o.deliveryFee !== undefined ? o.deliveryFee : 750), 
    0
  );

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight text-gray-950">Earnings & Payout Logs</h1>
        <p className="text-xs text-[#070329]/50 mt-0.5">Browse history of finished routes and calculated financial balances.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-gray-50 pb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Courier Audits ({pastOrders.length})</span>
          <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded font-mono font-bold">Net Paid Balance: {currency}{ netEarnings.toLocaleString() }</span>
        </div>

        {pastOrders.length > 0 ? (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto pr-1 text-xs">
            {pastOrders.map((hist) => {
              const baseFee = hist.deliveryFee !== undefined ? hist.deliveryFee : 750;
              const netFee = getNetPayout(baseFee);
              const commDeducted = baseFee - netFee;
              
              return (
                <div key={hist.id} className="py-4.5 flex gap-4 items-center justify-between first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-950 font-mono">RUN ID: {hist.id}</span>
                      <span className="text-[10px] text-gray-400 font-mono leading-none">{new Date(hist.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <span className="block text-gray-500 text-[11px]">From restaurant: <b className="text-gray-900 capitalize">{hist.vendorName}</b></span>
                    <span className="block text-gray-500 text-[11px] truncate max-w-sm">Drop-off: {hist.deliveryAddress}</span>
                    <span className="block text-[10px] text-gray-400 font-medium">
                      Base Fee: {currency}{baseFee.toLocaleString()} • Commission: -{currency}{commDeducted.toLocaleString()} ({riderCommissionType === "flat" ? "flat" : `${riderCommissionValue}%`})
                    </span>
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <span className="font-extrabold text-green-600 block flex items-center justify-end text-sm font-mono">{currency}{netFee.toLocaleString()}</span>
                    <span className="text-[9px] bg-green-50 text-green-700 rounded px-1.5 py-0.5 font-bold uppercase leading-none">Released</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 text-xs">
            No finished delivery cycles found. Accept jobs to get rolling.
          </div>
        )}
      </div>
    </div>
  );
};

export const RiderProfile: React.FC = () => {
  const { currentRider, updateRiderProfile } = useDatabase();

  const [name, setName] = useState(currentRider?.name || "");
  const [phone, setPhone] = useState(currentRider?.phone || "");
  const [vehicle, setVehicle] = useState(currentRider?.vehicleType || "motorcycle");

  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!name || !phone) {
      setErrorText("Legal name and telephone details are required.");
      return;
    }

    try {
      updateRiderProfile({
        name,
        phone,
        vehicleType: vehicle as any
      });
      setSuccessText("Successful! Your courier dispatch details were registered.");
      setIsEditing(false);
      setTimeout(() => {
        setSuccessText("");
      }, 3000);
    } catch (err) {
      setErrorText("Failed to save changes.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">Courier Operations Profile</h1>
        <p className="text-xs text-gray-500 mt-0.5 font-sans">Configure your vehicle licensing, background screening name, and delivery states.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {successText && (
          <div className="p-3 bg-green-50 text-green-750 border border-green-250 rounded-2xl text-xs font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-600" />
            {successText}
          </div>
        )}
        {errorText && (
          <div className="p-3 bg-red-50 text-red-650 rounded-2xl text-xs font-semibold">
            {errorText}
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-xl uppercase relative border border-slate-800">
            <Bike className="w-8 h-8 text-yellow-400 animate-pulse fill-transparent" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">{currentRider?.name || "Unconfigured Rider"}</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Approved Courier Partner • Logistics Fleet</span>
            
            <div className={`inline-block mt-2 py-0.5 px-2 rounded text-[9px] uppercase font-bold ${
              currentRider?.status === "approved" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
            }`}>
              {currentRider?.status || "Pending Verification"}
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600">Company Driver Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-4 focus:ring-blue-105 transition ${
                  isEditing ? "bg-white border-blue-400" : "bg-gray-50/50 border-gray-200 cursor-not-allowed"
                }`}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600">Primary Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-4 focus:ring-blue-105 transition ${
                  isEditing ? "bg-white border-blue-400" : "bg-gray-50/50 border-gray-200 cursor-not-allowed"
                }`}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600">Vehicle Logistics Class</label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              disabled={!isEditing}
              className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-4 focus:ring-blue-150 transition capitalize ${
                isEditing ? "bg-white border-blue-400" : "bg-gray-50/50 border-gray-200 cursor-not-allowed"
              }`}
            >
              <option value="motorcycle">Motorcycle / Scooter</option>
              <option value="bicycle">Eco Bicycle</option>
              <option value="car">Heavy Cargo Car</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setName(currentRider?.name || "");
                    setPhone(currentRider?.phone || "");
                    setVehicle(currentRider?.vehicleType || "motorcycle");
                    setIsEditing(false);
                  }}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4 text-green-300" />
                  Commit Courier Details
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-orange-600" />
                Edit Profile Settings
              </button>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
