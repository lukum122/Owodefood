import React, { useState, useEffect } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { DollarSign, ShoppingBag, Store, Bike, Users, Shield, TrendingUp, UsersRound, Award, CheckCircle } from "lucide-react";

interface DashboardStats {
  totalOrdersCount: number;
  activeDeliveriesCount: number;
  totalCustomersCount: number;
  gmv: number;
  commission: number;
  totalVendorApplications: number;
  pendingApprovalVendors: number;
  approvedVendorsCount: number;
  suspendedVendorsCount: number;
  totalRiderApplications: number;
  pendingApprovalRiders: number;
  approvedRidersCount: number;
  suspendedRidersCount: number;
}

export const AdminDashboard: React.FC = () => {
  const { currency } = useDatabase();

  // Fetches pre-computed aggregates from a dedicated endpoint instead of
  // requiring the full orders/vendors/riders/users dataset to be loaded
  // client-side just to show 8 numbers.
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch("/api/admin/dashboard-stats", { headers });
        const data = await res.json();
        if (!res.ok) {
          setStatsError(data.error || "Failed to load dashboard stats.");
          return;
        }
        setStats(data);
      } catch (err) {
        console.error("[AdminDashboard] Failed to fetch stats:", err);
        setStatsError("Failed to load dashboard stats. Please check your connection.");
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalOrdersCount = stats?.totalOrdersCount ?? 0;
  const activeDeliveriesCount = stats?.activeDeliveriesCount ?? 0;
  const totalCustomersCount = stats?.totalCustomersCount ?? 0;
  const gmv = stats?.gmv ?? 0;
  const commission = stats?.commission ?? 0;
  const totalVendorApplications = stats?.totalVendorApplications ?? 0;
  const pendingApprovalVendors = stats?.pendingApprovalVendors ?? 0;
  const approvedVendorsCount = stats?.approvedVendorsCount ?? 0;
  const suspendedVendorsCount = stats?.suspendedVendorsCount ?? 0;
  const totalRiderApplications = stats?.totalRiderApplications ?? 0;
  const pendingApprovalRiders = stats?.pendingApprovalRiders ?? 0;
  const approvedRidersCount = stats?.approvedRidersCount ?? 0;
  const suspendedRidersCount = stats?.suspendedRidersCount ?? 0;

  // Custom responsive SVG layout data points (past 7 days sales)
  const dailyCommisionsData = [45, 78, 62, 95, 110, 140, 155];
  const maxVal = Math.max(...dailyCommisionsData);
  const chartHeight = 120;
  const chartWidth = 500;

  return (
    <div className="space-y-8 font-sans text-gray-900 selection:bg-purple-600/10">

      {statsError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center justify-between gap-3">
          <span>{statsError}</span>
          <button onClick={() => window.location.reload()} className="underline shrink-0">Retry</button>
        </div>
      )}
      {statsLoading && !stats && (
        <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl text-xs font-bold text-gray-400">
          Loading dashboard stats...
        </div>
      )}

      {/* Admin banner */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 py-0.5 px-2 bg-purple-500/10 text-purple-300 rounded text-[10px] uppercase font-mono tracking-wider font-semibold border border-purple-500/20">
            System Superintendent Command
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-2 leading-none">Security Node: Active</h1>
          <p className="text-xs text-gray-400 mt-1 max-w-lg">All modules are operating nominally. Review platform billing trends, check merchant verifications, and audit active fleets.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center text-xs min-w-32">
            <span className="text-[10px] text-gray-400 block uppercase font-mono leading-none">Active Deliveries</span>
            <span className="text-lg font-black text-purple-400 block mt-2 leading-none animate-pulse">{activeDeliveriesCount} runs</span>
          </div>
        </div>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Commision platform revenue */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shrink-0">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Platform Fee (15%)</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5 font-mono">{currency}{(commission ?? 0).toLocaleString()}</h3>
          </div>
        </div>

        {/* Global GMV */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl border border-green-100 shrink-0">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Platform GMV</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5 font-mono">{currency}{(gmv ?? 0).toLocaleString()}</h3>
          </div>
        </div>

        {/* Dynamic Registered accounts */}
        <div className="bg-white p-6 border border-[#f3f4f6] rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-105 shrink-0">
            <UsersRound className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Diners Active</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{totalCustomersCount} profiles</h3>
          </div>
        </div>

        {/* Total verified merchants and couriers */}
        <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl border border-slate-150 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Transactions Count</span>
            <h3 className="text-xl font-black text-gray-950 mt-1.5">{totalOrdersCount} orders</h3>
          </div>
        </div>

      </div>

      {/* Vendor & Rider Application Stats */}
      <div>
        <h2 className="text-sm font-bold text-gray-950 mb-4">Vendor & Rider Applications</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Total Vendor Applications</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{totalVendorApplications}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider block leading-none">Pending Vendors</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{pendingApprovalVendors}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block leading-none">Approved Vendors</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{approvedVendorsCount}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block leading-none">Suspended Vendors</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{suspendedVendorsCount}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Total Rider Applications</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{totalRiderApplications}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider block leading-none">Pending Riders</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{pendingApprovalRiders}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block leading-none">Approved Riders</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{approvedRidersCount}</h3>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block leading-none">Suspended Riders</span>
            <h3 className="text-lg font-black text-gray-950 mt-2 font-mono">{suspendedRidersCount}</h3>
          </div>

        </div>
      </div>

      {/* Main Grid: Revenue chart & Verifications checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SVG Daily Commissions Chart */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <div>
              <h3 className="font-bold text-gray-950 text-sm">Platform Commission Growth</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Tracking net daily platform payouts (last 7 days).</p>
            </div>
            
            <div className="flex items-center gap-1 bg-green-50 text-green-700 py-1 px-2.5 rounded-lg text-[10px] font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              +14.8% weekly
            </div>
          </div>

          {/* SVG visualizer graph */}
          <div className="relative pt-4">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-40 overflow-visible text-[#070329]"
            >
              {/* Grid Lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="0" y1="60" x2={chartWidth} y2="60" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="#f1f5f9" strokeDasharray="4 4" />

              {/* Area path */}
              <path
                d={`
                  M 0,${chartHeight}
                  ${dailyCommisionsData.map((d, i) => {
                    const x = (i / (dailyCommisionsData.length - 1)) * chartWidth;
                    const y = chartHeight - (d / maxVal) * 80;
                    return `L ${x},${y}`;
                  }).join(" ")}
                  L ${chartWidth},${chartHeight} Z
                `}
                fill="url(#comm-gradient)"
                opacity="0.1"
              />

              {/* Line path */}
              <path
                d={dailyCommisionsData.map((d, i) => {
                  const x = (i / (dailyCommisionsData.length - 1)) * chartWidth;
                  const y = chartHeight - (d / maxVal) * 80;
                  return `${i === 0 ? "M" : "L"} ${x},${y}`;
                }).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots on top of coordinates */}
              {dailyCommisionsData.map((d, i) => {
                const x = (i / (dailyCommisionsData.length - 1)) * chartWidth;
                const y = chartHeight - (d / maxVal) * 80;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4.5"
                    className="fill-purple-600 stroke-white stroke-2 shadow"
                  />
                );
              })}

              <defs>
                <linearGradient id="comm-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e1b4b" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>

            {/* Days axis labels */}
            <div className="flex justify-between text-[11px] text-gray-400 font-mono mt-4 border-t border-gray-50 pt-3">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Verifications Checklist Taskbox */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-gray-50 pb-4">
            <h3 className="font-bold text-gray-950 text-sm">Actionable Applications Pending</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Merchants and couriers awaiting operational verification badges.</p>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Vendors ticket application */}
            <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-950 block">Partners pending</span>
                <span className="text-[11px] text-purple-700 mt-1 block font-semibold">{pendingApprovalVendors} restaurant applications</span>
              </div>
              
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>

            {/* Riders ticket application */}
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-[#fef3c7] flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-950 block block animate-pulse">Couriers pending</span>
                <span className="text-[11px] text-amber-700 mt-1 block font-semibold">{pendingApprovalRiders} rider profiles matching</span>
              </div>
              
              <CheckCircle className="w-5 h-5 text-amber-500" />
            </div>

            <div className="p-3.5 bg-gray-50 text-gray-500 rounded-xl text-[10px] leading-relaxed">
              * Verification approvals grant instant marketplace viewability blocks. Manage via sidebars.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
