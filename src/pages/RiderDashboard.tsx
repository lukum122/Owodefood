import React from "react";
import { useDatabase } from "../context/DatabaseContext";
import { MapPin, Store, DollarSign, Clock, Compass, HelpCircle, Bike, CheckCircle2 } from "lucide-react";

export const RiderDashboard: React.FC = () => {
  const { 
    currentRider, 
    orders, 
    acceptDelivery, 
    currency,
    riderCommissionType,
    riderCommissionValue
  } = useDatabase();

  if (!currentRider) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto font-sans">
        <div className="w-16 h-16 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mx-auto mb-4 border border-yellow-105">
          <Bike className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Rider Account Pending</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
          Please complete your driver details profile under the settings page to establish delivery capabilities before checking active queues.
        </p>
      </div>
    );
  }

  // Active riders see unassigned orders that are either accepted, preparing, or ready
  const unassignedJobs = orders.filter(
    o => !o.riderId && ["accepted", "preparing", "ready"].includes(o.status)
  );

  const completedOrders = orders.filter(o => o.riderId === currentRider.id && o.status === "delivered");
  const completedCount = completedOrders.length;
  const activeJobsCount = orders.filter(o => o.riderId === currentRider.id && o.status === "out_for_delivery").length;

  // Helper to compute net rider payout after platform commission
  const getNetPayout = (deliveryFee: number) => {
    if (riderCommissionType === "flat") {
      return Math.max(0, deliveryFee - riderCommissionValue);
    } else {
      return Math.max(0, deliveryFee - (deliveryFee * riderCommissionValue) / 100);
    }
  };

  // Compute actual payouts based on delivery fees of completed orders minus platform commission
  const earnings = completedOrders.reduce(
    (sum, o) => sum + getNetPayout(o.deliveryFee !== undefined ? o.deliveryFee : 750), 
    0
  );

  const handleClaimJob = (orderId: string) => {
    acceptDelivery(orderId, currentRider.id);
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Availability Status Badge Banner */}
      {!currentRider.isAvailable && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></span>
          You are currently marked as "Offline". Please toggle your Availability status in the left sidebar to start pulling dispatch jobs in realtime!
        </div>
      )}

      {/* Stats KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Earnings */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl border border-green-100 shrink-0">
            <DollarSign className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Simulated Payouts</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5 font-mono">{currency}{earnings.toLocaleString()}</h3>
          </div>
        </div>

        {/* Deliveries */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-101 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Completed Runs</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{completedCount} routes</h3>
          </div>
        </div>

        {/* In-Transit tasks */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-101 shrink-0">
            <Clock className="w-5 h-5 text-sky-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none font-sans">Active In Transit</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{activeJobsCount} active</h3>
          </div>
        </div>

      </div>

      {/* Available orders queue */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider border-b border-gray-100 pb-3 block">
            Nearby Available Delivery Tickets ({unassignedJobs.length})
          </h3>
          <p className="text-xs text-gray-400 mt-1.5">
            Claim delivery routes. Payout rate is the customer delivery fee minus the platform commission of{" "}
            <span className="font-bold text-indigo-600 font-mono">
              {riderCommissionType === "flat" ? `${currency}${riderCommissionValue}` : `${riderCommissionValue}%`}
            </span>.
          </p>
        </div>

        {currentRider.isAvailable ? (
          unassignedJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {unassignedJobs.map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition">
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <span className="font-mono font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg"># {job.id}</span>
                      <span className="text-[9px] bg-[#070329]/10 text-gray-650 px-2 py-0.5 rounded font-black tracking-widest capitalize font-mono">
                        Pickup: {job.status}
                      </span>
                    </div>

                    {/* From Restaurant */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-blue-500" />
                        Restaurant Pickup
                      </span>
                      <p className="font-bold text-gray-900 capitalize">{job.vendorName}</p>
                    </div>

                    {/* Drop-off recipient details */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        Destination drop-off
                      </span>
                      <p className="text-gray-700 leading-snug">{job.deliveryAddress}</p>
                    </div>

                    <div className="text-[11px] text-indigo-700 font-bold block bg-indigo-50/50 p-2 rounded-xl">
                      Estimated earnings: {currency}{getNetPayout(job.deliveryFee !== undefined ? job.deliveryFee : 750).toLocaleString()} (after commission)
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimJob(job.id)}
                    className="w-full py-2.5 px-4 bg-[#070329] hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer transition uppercase"
                  >
                    Accept Delivery Route
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto">
              <Compass className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-spin" />
              <p className="text-sm font-bold text-gray-700">No jobs ready at this moment</p>
              <p className="text-xs text-gray-400 mt-1">Waiting for partners to complete kitchen prep. Keep terminal online.</p>
            </div>
          )
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto">
            <Compass className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700 font-sans">You are currently OFFLINE</p>
            <p className="text-xs text-gray-400 mt-1">Toggle your availability state in the sidebar to synchronize dispatch jobs.</p>
          </div>
        )}
      </div>

    </div>
  );
};
