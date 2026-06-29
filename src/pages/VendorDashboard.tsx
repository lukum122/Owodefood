import React from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Link, useNavigate } from "react-router-dom";
import { DollarSign, Clock, ListCollapse, UtensilsCrossed, Sparkles, TrendingUp, ShieldAlert, Star, ChevronRight } from "lucide-react";

export const VendorDashboard: React.FC = () => {
  const { currentVendor, orders, products, updateProduct } = useDatabase();
  const navigate = useNavigate();

  if (!currentVendor) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto font-sans">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">No Store Record Assigned</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
          We could not associate a restaurant brand profile with this vendor account. Please review credentials or configure your settings.
        </p>
        <Link 
          to="/vendor/settings" 
          className="mt-6 inline-flex items-center gap-2 py-2.5 px-5 bg-[#070329] hover:bg-opacity-90 text-white font-bold text-xs rounded-xl shadow transition"
        >
          SetUp Restaurant Profile
        </Link>
      </div>
    );
  }

  // Calculate statistics (scoped strictly to current vendor)
  const vendorOrders = orders.filter(o => o.vendorId === currentVendor.id);
  const vendorProducts = products.filter(p => p.vendorId === currentVendor.id);

  const earnings = vendorOrders
    .filter(o => o.status === "delivered")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCount = vendorOrders.filter(o => o.status === "pending").length;
  
  const inFulfillmentCount = vendorOrders.filter(
    o => ["accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)
  ).length;

  const totalCompletedCount = vendorOrders.filter(o => o.status === "delivered").length;

  // Toggle dynamic inventory in stock / out of stock status
  const handleToggleInventory = (p: any) => {
    updateProduct({
      ...p,
      isAvailable: !p.isAvailable
    });
  };

  const recentOrders = vendorOrders.slice(0, 4);

  return (
    <div className="space-y-8 font-sans">
      
      {/* Welcome Banner */}
      <div className="bg-[#070329] hover:bg-opacity-98 transition rounded-3xl p-6 text-white border border-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 py-0.5 px-2 bg-blue-500/10 text-blue-300 rounded text-[10px] uppercase font-mono tracking-wider font-semibold">
            Merchant Center Console
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-2 leading-none">Welcome back, {currentVendor.name}!</h1>
          <p className="text-xs text-gray-400 mt-1 max-w-md">Your kitchen portal is dispatch-ready. Review and fulfill orders in real-time below.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-blue-950/40 p-3.5 rounded-2xl border border-blue-900/20 text-center min-w-24">
            <span className="text-[10px] text-gray-400 block uppercase font-mono leading-none">Partner Rating</span>
            <span className="text-base font-black text-yellow-400 block mt-1 flex items-center justify-center gap-1 leading-none">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
              {currentVendor.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Earnings */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl border border-green-100 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Net Store Income</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5 font-mono">₦{earnings.toLocaleString()}</h3>
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100 shrink-0 relative">
            <Clock className="w-5 h-5 animate-pulse" />
            {pendingCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full"></span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Pending Tickets</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{pendingCount}</h3>
          </div>
        </div>

        {/* Fulfillments */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shrink-0">
            <ListCollapse className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Active Cooking</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{inFulfillmentCount}</h3>
          </div>
        </div>

        {/* Active Dishes */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Active Products</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{vendorProducts.length} dishes</h3>
          </div>
        </div>

      </div>

      {/* Main Grid: Orders & Fast Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Recent Kitchen Orders Section */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <h3 className="font-bold text-gray-950 text-sm">Recent Store Tickets</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Click "Active Orders" sidebar for full ticket managers.</p>
            </div>
            
            <Link 
              to="/vendor/orders" 
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 group cursor-pointer"
            >
              Master Orders Queue
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900">ID: {order.id}</span>
                      <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="block text-[11px] text-gray-500 font-medium">To: {order.customerName} : {order.deliveryAddress}</span>
                    <span className="text-[10px] text-blue-600 font-bold block">{order.items.length} items : ₦{order.totalAmount.toLocaleString()}</span>
                  </div>

                  <span className={`py-1 px-2 rounded-lg font-bold text-[10px] capitalize ${
                    order.status === "pending" ? "bg-amber-100 text-amber-700" :
                    order.status === "delivered" ? "bg-green-100 text-green-700" : "bg-sky-100 text-sky-700"
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50/30 rounded-2xl border border-dashed border-gray-100">
              <p className="text-xs text-gray-400">No recent tickets logged today.</p>
            </div>
          )}
        </div>

        {/* Quick Inventory Stock Switches Section */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <h3 className="font-bold text-gray-950 text-sm">Quick Inventory Stock</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Protect customers from ordering sold out items.</p>
            </div>

            <Link 
              to="/vendor/products" 
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 group cursor-pointer"
            >
              All Products
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto pr-1">
            {vendorProducts.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-gray-900 block truncate">{p.name}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">₦{p.price.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleInventory(p)}
                  className={`py-1 px-2.5 rounded-full text-[10px] font-black cursor-pointer uppercase transition ${
                    p.isAvailable
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-1 focus:ring-red-400"
                  }`}
                >
                  {p.isAvailable ? "In Stock" : "Sold Out"}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
