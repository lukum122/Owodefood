import React from "react";
import { useDatabase } from "../context/DatabaseContext";
import { OrderStatus } from "../types";
import { Check, X, Flame, ShieldCheck, ShoppingBag, MapPin, Phone, User, Clock } from "lucide-react";

export const VendorOrders: React.FC = () => {
  const { currentVendor, orders, updateVendorOrder, currency } = useDatabase();

  if (!currentVendor) {
    return <div className="text-sm font-semibold text-gray-500">No store record configured.</div>;
  }

  // Filter orders by current vendor, newest first -- sorted here (not
  // relying on fetch/array order) since new orders always get appended to
  // the end of the shared context array regardless of how recent they
  // are, same fix applied to the customer-facing My Orders page.
  const vendorOrders = orders
    .filter(o => o.vendorId === currentVendor.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group active vs historic orders
  const activeStatuses = ["pending", "accepted", "preparing", "ready", "out_for_delivery"];
  const activeOrders = vendorOrders.filter(o => activeStatuses.includes(o.status));
  const historicOrders = vendorOrders.filter(o => ["delivered", "cancelled"].includes(o.status));

  const handleAction = async (orderId: string, actionStatus: OrderStatus) => {
    const result = await updateVendorOrder(orderId, actionStatus);
    if (!result?.success) {
      window.alert(result?.error || "Failed to update the order. Please try again.");
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending": return "text-amber-700 bg-amber-50 border-amber-200 animate-pulse";
      case "accepted": return "text-blue-700 bg-blue-50 border-blue-200";
      case "preparing": return "text-purple-700 bg-purple-50 border-purple-200";
      case "ready": return "text-green-700 bg-green-50 border-green-200";
      case "out_for_delivery": return "text-cyan-700 bg-cyan-50 border-cyan-200";
      case "delivered": return "text-gray-500 bg-gray-50 border-gray-200";
      case "cancelled": return "text-red-700 bg-red-50 border-red-200";
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">Food Fulfillment Queue</h1>
        <p className="text-xs text-gray-500 mt-0.5">Approve incoming tickets, supervise meal preparedness, and assign to courier fleets.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Active Ticket Terminal List */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-150 pb-3">
            <h3 className="font-extrabold text-sm text-[#070329] uppercase tracking-wide">Live Active Tickets ({activeOrders.length})</h3>
            <span className="text-[10px] bg-red-500 text-white font-extrabold px-2 py-0.5 rounded-full animate-bounce">Live Terminal</span>
          </div>

          {activeOrders.length > 0 ? (
            <div className="space-y-6">
              {activeOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                  
                  {/* Order Meta Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-50 pb-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">ID: {order.id}</span>
                        <span className={`py-1 px-2.5 border rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 pl-1">Placed {new Date(order.createdAt).toLocaleTimeString()}</p>
                    </div>

                    <span className="font-extrabold text-gray-950 text-base font-mono">{currency}{(order.totalAmount ?? 0).toLocaleString()}</span>
                  </div>

                  {/* Customer receipt details & Recipient parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                    
                    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dish Ordered</span>
                      <div className="divide-y divide-gray-100 text-xs">
                        {order.items.map((oi) => (
                          <div key={oi.id} className="py-2 flex justify-between">
                            <span className="text-gray-700">{oi.name} <b className="text-gray-900">x{oi.quantity}</b></span>
                            <span className="font-bold text-gray-800 font-mono">{currency}{((oi.price ?? 0) * oi.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        {order.serviceFee !== undefined && order.serviceFee !== null && (
                          <div className="py-2 flex justify-between text-[11px] font-medium border-t border-dashed border-gray-250 mt-1 pt-2">
                            <span className="text-gray-500">Service Fee</span>
                            <span className="font-extrabold text-gray-700 font-mono">{currency}{(order.serviceFee ?? 0).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed">
                      <div className="space-y-1">
                        <span className="font-bold text-gray-400 uppercase tracking-widest block text-[10px]">Client Recipient</span>
                        <p className="flex items-center gap-1.5 text-gray-700">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          {order.customerName} (Phone: <b className="text-gray-900">{order.customerPhone}</b>)
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-gray-400 uppercase tracking-widest block text-[10px]">Destination dropoff</span>
                        <p className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                          {order.deliveryAddress}
                        </p>
                      </div>

                      {order.riderId && (
                        <div className="pt-2">
                          <span className="py-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-[10px] font-bold inline-block">
                            Assigned Courier: <b>{order.riderName}</b>
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Dynamic Action controllers */}
                  <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-end border-t border-gray-50 pt-4">
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAction(order.id, "cancelled")}
                          className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Decline Ticket
                        </button>
                        <button
                          onClick={() => handleAction(order.id, "accepted")}
                          className="w-full sm:w-auto py-2.5 px-5 rounded-xl font-bold text-xs bg-[#070329] text-white hover:bg-opacity-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                          Accept Ticket
                        </button>
                      </>
                    )}

                    {order.status === "accepted" && (
                      <button
                        onClick={() => handleAction(order.id, "preparing")}
                        className="w-full sm:w-auto py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Flame className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-bounce" />
                        Initiate Kitchen Cooking
                      </button>
                    )}

                    {order.status === "preparing" && (
                      <button
                        onClick={() => handleAction(order.id, "ready")}
                        className="w-full sm:w-auto py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-green-300" />
                        Mark Meal as READY
                      </button>
                    )}

                    {order.status === "ready" && (
                      <div className="py-2.5 px-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-center text-xs font-bold w-full sm:w-auto">
                        Food is packed & awaiting driver pickup.
                      </div>
                    )}

                    {order.status === "out_for_delivery" && (
                      <div className="py-2.5 px-4 bg-cyan-50 text-cyan-700 border border-cyan-100 rounded-xl text-center text-xs font-bold w-full sm:w-auto">
                        In Transit. Dispatched via Courier <b>{order.riderName}</b>.
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-700">Kitchen Queue is Empty</p>
              <p className="text-xs text-gray-400 mt-1">Pending order notifications will buzz immediately on arrival.</p>
            </div>
          )}
        </div>

        {/* Historic logs column side */}
        <div className="xl:col-span-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-gray-950 text-sm uppercase tracking-wider pb-3 border-b border-gray-50 leading-none">Completed Archive</h3>
          
          {historicOrders.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto pr-1">
              {historicOrders.map((ho) => (
                <div key={ho.id} className="py-4.5 flex justify-between items-start text-xs first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-gray-900 font-mono">ID: {ho.id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded capitalize ${
                        ho.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                      }`}>
                        {ho.status}
                      </span>
                    </div>
                    <span className="block text-[11px] text-gray-500">{ho.customerName}</span>
                    <span className="text-[10px] text-gray-400 font-mono italic">{new Date(ho.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <span className="font-bold text-gray-900 font-mono">{currency}{(ho.totalAmount ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-gray-400">
              No completed orders logs recorded.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
