import React, { useState, useEffect } from "react";
import { Search, Eye, CheckCircle, Clock } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import { Order } from "../types";

export const AdminPayouts: React.FC = () => {
  const { orders, updateOrderPayoutStatus, currency, fetchDeliveredOrders } = useDatabase();
  const [activeTab, setActiveTab] = useState<"rider" | "vendor">("rider");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingOrders(true);
      setOrdersLoadError("");
      const result = await fetchDeliveredOrders();
      if (!cancelled && !result?.success) {
        setOrdersLoadError(result?.error || "Failed to load orders.");
      }
      if (!cancelled) setIsLoadingOrders(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async (orderId: string, type: "rider" | "vendor") => {
    if (window.confirm(`Mark this ${type} payout as PAID?`)) {
      const result = await updateOrderPayoutStatus(orderId, type, "paid");
      if (!result?.success) {
        window.alert(result?.error || "Failed to mark this payout as paid. Please try again.");
      }
    }
  };

  const filteredOrders = orders.filter((o) => {
    // Only show completed/delivered orders
    if (o.status !== "delivered") return false;
    
    // Status filter
    if (activeTab === "rider") {
      if (statusFilter === "pending" && o.riderPayoutStatus !== "pending") return false;
      if (statusFilter === "paid" && o.riderPayoutStatus !== "paid") return false;
    } else {
      if (statusFilter === "pending" && o.vendorPayoutStatus !== "pending") return false;
      if (statusFilter === "paid" && o.vendorPayoutStatus !== "paid") return false;
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!o.id.toLowerCase().includes(q) &&
          !o.vendorName.toLowerCase().includes(q) &&
          !(o.riderName || "").toLowerCase().includes(q) &&
          !o.customerName.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {isLoadingOrders && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-xs font-bold text-gray-400 animate-pulse">
          Loading orders...
        </div>
      )}
      {ordersLoadError && !isLoadingOrders && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-xs font-bold text-red-600 flex flex-col items-center gap-2">
          {ordersLoadError}
          <button
            onClick={() => window.location.reload()}
            className="text-[10px] underline text-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payout Approvals</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage and process settlements for riders and vendors.</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("rider")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === "rider"
                ? "bg-[#0ea5e9] text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Rider Payouts
          </button>
          <button
            onClick={() => setActiveTab("vendor")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === "vendor"
                ? "bg-[#0ea5e9] text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Vendor Payouts
          </button>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeTab}s or order IDs...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] outline-none w-full md:w-64 transition-all"
          />
        </div>
      </div>

      {/* Tables Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "rider" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Rider</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Delivery Fee</th>
                  <th className="p-4">Delivery Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {filteredOrders.filter(o => o.riderId).length > 0 ? (
                filteredOrders.filter(o => o.riderId).map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50/50 transition group">
                    <td className="px-5 py-4 font-mono font-bold text-gray-900 text-xs">#{payout.id}</td>
                    <td className="px-5 py-4 font-bold text-gray-800 text-sm">{payout.riderName}</td>
                    <td className="px-5 py-4 font-medium text-gray-600 text-xs">{payout.customerName}</td>
                    <td className="px-5 py-4 font-mono font-black text-gray-900">{currency}{payout.deliveryFee?.toLocaleString() || 0}</td>
                    <td className="px-5 py-4 font-medium text-gray-500 text-xs">{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                        payout.riderPayoutStatus === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {payout.riderPayoutStatus === "paid" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {payout.riderPayoutStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {payout.riderPayoutStatus === "pending" ? (
                        <button onClick={() => handlePay(payout.id, "rider")} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95">
                          Pay Now
                        </button>
                      ) : (
                        <button className="px-4 py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed">
                          Settled
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500 font-medium text-sm">
                    No rider payouts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Food Amount</th>
                  <th className="p-4">Commission</th>
                  <th className="p-4 text-[#0ea5e9]">Receivable</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50/50 transition group">
                    <td className="px-5 py-4 font-mono font-bold text-gray-900 text-xs">#{payout.id}</td>
                    <td className="px-5 py-4 font-bold text-gray-800 text-sm">{payout.vendorName}</td>
                    <td className="px-5 py-4 font-medium text-gray-600 text-xs">{payout.customerName}</td>
                    <td className="px-5 py-4 font-mono font-bold text-gray-600">{currency}{payout.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-4 font-mono font-bold text-red-500">
                      -{currency}{((payout.totalAmount * 0.1) || 0).toLocaleString()} 
                      <span className="text-[9px] text-gray-400 ml-1 bg-gray-100 px-1 py-0.5 rounded">10%</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-black text-emerald-600">{currency}{(payout.totalAmount - (payout.totalAmount * 0.1) || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                        payout.vendorPayoutStatus === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {payout.vendorPayoutStatus === "paid" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {payout.vendorPayoutStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {payout.vendorPayoutStatus === "pending" ? (
                        <button onClick={() => handlePay(payout.id, "vendor")} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95">
                          Pay Now
                        </button>
                      ) : (
                        <button className="px-4 py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed">
                          Settled
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500 font-medium text-sm">
                    No vendor payouts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          )}
        </div>
        
        {/* Empty State / Pagination Placeholder */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Showing 2 records (Placeholder Data)</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 font-bold">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="paid">Paid Only</option>
          </select>
        </div>
      </div>
    </div>
  );
};