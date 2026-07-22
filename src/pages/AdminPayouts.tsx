import React, { useState } from "react";
import { Search, Eye, CheckCircle, Clock } from "lucide-react";

export const AdminPayouts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"rider" | "vendor">("rider");
  const [searchQuery, setSearchQuery] = useState("");

  // Placeholder data for Rider Payouts
  const mockRiderPayouts = [
    { id: "ORD-1234", rider: "John Doe", customer: "Alice Smith", deliveryFee: 750, date: "2026-07-22", status: "pending" },
    { id: "ORD-1235", rider: "Jane Rider", customer: "Bob Jones", deliveryFee: 800, date: "2026-07-22", status: "paid" },
  ];

  // Placeholder data for Vendor Payouts
  const mockVendorPayouts = [
    { id: "ORD-1234", vendor: "Burger King", customer: "Alice Smith", foodAmount: 5000, commission: 500, receivable: 4500, status: "pending" },
    { id: "ORD-1236", vendor: "KFC", customer: "Charlie Davis", foodAmount: 12000, commission: 1200, receivable: 10800, status: "paid" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
                  <th className="p-4">Delivery Date</th>
                  <th className="p-4">Delivery Fee</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {mockRiderPayouts.map((payout, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono font-medium text-gray-600">{payout.id}</td>
                    <td className="p-4 font-bold text-gray-900">{payout.rider}</td>
                    <td className="p-4 text-gray-600">{payout.customer}</td>
                    <td className="p-4 text-gray-500">{payout.date}</td>
                    <td className="p-4 font-bold text-gray-900">₦{payout.deliveryFee.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        payout.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {payout.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {payout.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-[#0ea5e9] hover:bg-sky-50 rounded-lg transition" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition" title="Mark as Paid">
                          Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <tbody className="divide-y divide-gray-100 text-sm">
                {mockVendorPayouts.map((payout, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono font-medium text-gray-600">{payout.id}</td>
                    <td className="p-4 font-bold text-gray-900">{payout.vendor}</td>
                    <td className="p-4 text-gray-600">{payout.customer}</td>
                    <td className="p-4 font-medium text-gray-500">₦{payout.foodAmount.toLocaleString()}</td>
                    <td className="p-4 font-medium text-rose-500">-₦{payout.commission.toLocaleString()}</td>
                    <td className="p-4 font-black text-gray-900">₦{payout.receivable.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        payout.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {payout.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {payout.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-[#0ea5e9] hover:bg-sky-50 rounded-lg transition" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition" title="Mark as Paid">
                          Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
        </div>
      </div>
    </div>
  );
};