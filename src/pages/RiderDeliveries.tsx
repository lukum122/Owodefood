import React from "react";
import { useDatabase } from "../context/DatabaseContext";
import { OrderStatus } from "../types";
import { Compass, Bike, Store, MapPin, Phone, CheckCircle2, User } from "lucide-react";

export const RiderDeliveries: React.FC = () => {
  const { currentRider, orders, updateDeliveryStatus } = useDatabase();

  if (!currentRider) {
    return <div className="text-gray-500 text-sm">Rider profile not synced.</div>;
  }

  // Active routes assigned to this driver (status: out_for_delivery)
  const activeJobs = orders.filter(
    o => o.riderId === currentRider.id && o.status === "out_for_delivery"
  );

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateDeliveryStatus(orderId, status);
  };

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">Active Deliveries In-Transit</h1>
        <p className="text-xs text-gray-500 mt-0.5">Maintain transit timeline speed and coordinates. Mark drop-offs upon physical delivery.</p>
      </div>

      {activeJobs.length > 0 ? (
        <div className="space-y-6">
          {activeJobs.map((job) => (
            <div key={job.id} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              
              {/* Job ID Header details */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-50 pb-4">
                <div className="space-y-0.5">
                  <span className="font-mono text-xs font-black bg-gray-100 px-2.5 py-1 rounded-lg">JOB: {job.id}</span>
                  <span className="text-[10px] text-gray-400 block mt-1">Acceptance registered {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                
                <span className="text-xs font-bold bg-[#070329] text-white py-1 px-3 rounded-xl uppercase tracking-wider font-mono">
                  IN TRANSIT
                </span>
              </div>

              {/* Transit coordinate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section A: PickUp */}
                <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-3 text-xs leading-relaxed">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-blue-500" />
                    Kitchen Pickup Location
                  </span>
                  <div>
                    <p className="font-extrabold text-gray-950">{job.vendorName}</p>
                    <p className="text-gray-500 mt-1">Eatery address: <b>{job.deliveryAddress}</b></p>
                  </div>
                </div>

                {/* Section B: Drop off */}
                <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-3 text-xs leading-relaxed">
                  <span className="text-[10px] font-bold text-[#070329] uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 font-bold" />
                    Customer Drop-off coordinates
                  </span>
                  <div>
                    <p className="font-extrabold text-gray-950 flex items-center gap-1.5 text-xs text-gray-850">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      Recipient Name: {job.customerName}
                    </p>
                    <p className="font-medium text-gray-600 mt-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      Telephone: <b>{job.customerPhone}</b>
                    </p>
                    <p className="text-gray-500 mt-1">Destination: <b>{job.deliveryAddress}</b></p>
                  </div>
                </div>

              </div>

              {/* Actions details controllers */}
              <div className="flex justify-end pt-2 border-t border-gray-50">
                <button
                  onClick={() => handleUpdateStatus(job.id, "delivered")}
                  className="w-full sm:w-auto py-3 px-6 bg-[#070329] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer transition uppercase"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-300 fill-transparent" />
                  Mark Route Completed / Delivered
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <Compass className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">No active cargo in-transit</p>
          <p className="text-xs text-gray-400 mt-1">Go check out your "Discover Jobs" board to accept available delivery routes.</p>
        </div>
      )}
    </div>
  );
};
