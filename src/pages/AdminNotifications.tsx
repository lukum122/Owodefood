import React, { useState, useEffect } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { AppNotification, User } from "../types";
import { hasRole } from "../roleHelper";
import { 
  Bell, 
  Send, 
  Trash2, 
  Search, 
  Users, 
  Check, 
  AlertTriangle, 
  Coins, 
  Bike, 
  Store, 
  Info, 
  MessageSquare,
  Sparkles,
  UserCheck
} from "lucide-react";

export const AdminNotifications: React.FC = () => {
  const { 
    users, 
    notifications = [], 
    addNotification, 
    deleteNotification,
    fetchFullUsers
  } = useDatabase();
  useEffect(() => {
    fetchFullUsers();
  }, []);

  // Selected state
  const [targetType, setTargetType] = useState<"all" | "role" | "individual">("all");
  const [selectedRole, setSelectedRole] = useState<"customer" | "vendor" | "rider">("customer");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [notifType, setNotifType] = useState<AppNotification["type"]>("system");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Statistics calculation
  const totalNotifications = notifications.length;
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const systemNotifs = notifications.filter(n => n.type === "system").length;
  const walletNotifs = notifications.filter(n => n.type === "wallet").length;
  const orderNotifs = notifications.filter(n => n.type === "order").length;
  const deliveryNotifs = notifications.filter(n => n.type === "delivery").length;

  // Filtered users for individual dropdown/search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.phone.includes(searchUserQuery)
  );

  // Quick message templates
  const templates = [
    {
      label: "System Maintenance ⚙️",
      title: "Platform Maintenance Alert",
      message: "Our systems will undergo routine performance optimizations tonight between 2:00 AM and 3:00 AM. Ordering services might experience temporary brief latency.",
      type: "system" as const
    },
    {
      label: "Rain/Weather Alert 🌧️",
      title: "Heavy Rainfall: Potential Delivery Latency",
      message: "Due to heavy precipitation across Owode Food service areas, deliveries may experience slight transit delays. Our riders are taking extra care on the roads to ensure safety.",
      type: "delivery" as const
    },
    {
      label: "Wallet Promotion 💰",
      title: "Top-Up Promo: Enjoy 5% Cashback",
      message: "Instantly reload your Owode Food secure wallet with ₦10,000 or more today and receive an immediate 5% cashback credit credited to your available balance!",
      type: "wallet" as const
    },
    {
      label: "Vendor Promo Announcement 🍔",
      title: "New Local Flavors Available Now!",
      message: "Exciting culinary additions have launched on our platform. Explore newly approved merchant kitchens and enjoy exclusive 15% discount vouchers on checkout.",
      type: "order" as const
    }
  ];

  const handleApplyTemplate = (tpl: typeof templates[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setNotifType(tpl.type);
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim() || !message.trim()) {
      setErrorMsg("Notification title and message body cannot be blank.");
      return;
    }

    try {
      if (targetType === "all") {
        // Broadcast notification
        addNotification("all", title.trim(), message.trim(), notifType);
        setSuccessMsg("Broadcast notification dispatched to all accounts successfully!");
      } 
      else if (targetType === "role") {
        // Filter users of role
        const targetUsers = users.filter(u => hasRole(u, selectedRole));
        if (targetUsers.length === 0) {
          setErrorMsg(`No active user profiles found with the role of '${selectedRole}'.`);
          return;
        }
        
        // Dispatch to all users of role
        targetUsers.forEach(u => {
          addNotification(u.id, title.trim(), message.trim(), notifType);
        });
        setSuccessMsg(`Dispatched targeted notifications to all ${targetUsers.length} active '${selectedRole}' accounts successfully!`);
      } 
      else if (targetType === "individual") {
        if (!selectedUserId) {
          setErrorMsg("Please search and select a specific target account.");
          return;
        }
        const targetUser = users.find(u => u.id === selectedUserId);
        if (!targetUser) {
          setErrorMsg("Selected user profile was not found.");
          return;
        }

        addNotification(targetUser.id, title.trim(), message.trim(), notifType);
        setSuccessMsg(`Successfully delivered personalized alert to ${targetUser.name} (${targetUser.role})!`);
      }

      // Reset fields
      setTitle("");
      setMessage("");
      
      // Auto-dismiss success word
      setTimeout(() => {
        setSuccessMsg("");
      }, 4000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to dispatch notifications. Please try again.");
    }
  };

  const getUserNameById = (id: string) => {
    if (id === "all") return "🌎 All Users (Broadcast)";
    if (id === "admin") return "🛡️ Admin Console";
    const found = users.find(u => u.id === id);
    return found ? `${found.name} (${found.role})` : "System Profile";
  };

  const handleDeleteNotification = (notifId: string) => {
    deleteNotification(notifId);
  };

  return (
    <div className="space-y-8 font-sans text-xs text-left">
      
      {/* Page Header banner */}
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none text-gray-950">Broadcast & Targeted Alerts</h1>
        <p className="text-xs text-gray-400 mt-1 max-w-lg">Deliver critical system notices, wallet updates, logistics dispatch bulletins, or personalized messages to customers, vendors, and riders.</p>
      </div>

      {/* KPI Stats summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notifications */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Dispatched</span>
            <div className="p-2 bg-purple-50 rounded-xl border border-purple-100">
              <Bell className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#070329] tracking-tight">{totalNotifications}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Total operational alerts logged</p>
          </div>
        </div>

        {/* Unread Ratio */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unread alerts</span>
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">{unreadNotifications}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Notifications pending user review</p>
          </div>
        </div>

        {/* Active Accounts total */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subscribers</span>
            <div className="p-2 bg-green-50 rounded-xl border border-green-100">
              <Users className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-green-700 tracking-tight">{users.length} profiles</h3>
            <p className="text-[10px] text-gray-400 mt-1">Accounts available for targeted delivery</p>
          </div>
        </div>

        {/* Categories split */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channels Used</span>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-bold text-gray-500 font-mono">
            <div>🔔 System: <span className="text-[#070329] font-black">{systemNotifs}</span></div>
            <div>💰 Wallet: <span className="text-green-650 font-black">{walletNotifs}</span></div>
            <div>🍳 Order: <span className="text-purple-600 font-black">{orderNotifs}</span></div>
            <div>🚴 Rider: <span className="text-blue-600 font-black">{deliveryNotifs}</span></div>
          </div>
        </div>
      </div>

      {/* Main Grid Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Compose Message Panel (7 cols) */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs lg:col-span-7 space-y-5">
          <div>
            <h2 className="text-sm font-black text-[#070329] tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Compose Communication Campaign
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Author a message, specify recipients, select channel tags, and dispatch.</p>
          </div>

          {/* Quick Draft Templates */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Quick Draft Templates</span>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-2 py-1 text-[10px] bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-250 border border-gray-200 rounded-lg text-gray-500 font-medium transition cursor-pointer"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
            
            {successMsg && (
              <div className="p-3 bg-green-50 text-green-700 border border-green-150 rounded-xl text-[11px] font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-650 border border-red-150 rounded-xl text-[11px] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Target Audience Selector */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Audience</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={`py-2 px-3 border rounded-xl text-center font-bold text-xs capitalize transition cursor-pointer ${
                    targetType === "all"
                      ? "bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-100"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  🌎 All Users
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("role")}
                  className={`py-2 px-3 border rounded-xl text-center font-bold text-xs capitalize transition cursor-pointer ${
                    targetType === "role"
                      ? "bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-100"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  👥 By Privilege Role
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("individual")}
                  className={`py-2 px-3 border rounded-xl text-center font-bold text-xs capitalize transition cursor-pointer ${
                    targetType === "individual"
                      ? "bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-100"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  👤 Single Account
                </button>
              </div>
            </div>

            {/* Conditionally show Role selection */}
            {targetType === "role" && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Specify Privilege Role:</span>
                <div className="flex gap-2">
                  {(["customer", "vendor", "rider"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition capitalize cursor-pointer ${
                        selectedRole === r
                          ? "bg-[#070329] border-[#070329] text-white"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {r}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conditionally show Individual Search/Select */}
            {targetType === "individual" && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Search & Bind Target Account</span>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type name, email address, or telephone..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full text-xs p-2.5 pl-8 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
                  />
                  <span className="absolute left-2.5 top-3 text-gray-400">🔍</span>
                </div>

                {/* Display matches list */}
                <div className="max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-gray-200">
                  {filteredUsers.slice(0, 10).map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setSearchUserQuery(u.name);
                      }}
                      className={`p-2 rounded-lg cursor-pointer flex justify-between items-center transition ${
                        selectedUserId === u.id 
                          ? "bg-purple-50 text-purple-800 font-bold border border-purple-100" 
                          : "hover:bg-slate-50 text-gray-700"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{u.name}</span>
                        <span className="text-[9px] text-gray-400 font-mono">{u.email}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-extrabold rounded-md border ${
                        u.role === "admin" ? "bg-rose-50 border-rose-100 text-rose-700" :
                        u.role === "vendor" ? "bg-amber-50 border-amber-100 text-amber-700" :
                        u.role === "rider" ? "bg-blue-50 border-blue-100 text-blue-700" :
                        "bg-purple-50 border-purple-100 text-purple-700"
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center py-4 text-gray-400">No profiles match search query.</p>
                  )}
                </div>
              </div>
            )}

            {/* Notification Channel Tags Selection */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Notification Channel Tag</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "system", label: "System Notices", icon: Bell, bg: "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200", active: "bg-slate-100 border-slate-400 text-slate-900 ring-4 ring-slate-50" },
                  { id: "wallet", label: "Payments/Promo", icon: Coins, bg: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200", active: "bg-green-100 border-green-400 text-green-900 ring-4 ring-green-50" },
                  { id: "order", label: "Orders & Kitchen", icon: Info, bg: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200", active: "bg-purple-100 border-purple-400 text-purple-900 ring-4 ring-purple-50" },
                  { id: "delivery", label: "Logistics", icon: Bike, bg: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200", active: "bg-blue-100 border-blue-400 text-blue-900 ring-4 ring-blue-50" }
                ].map((tag) => {
                  const Icon = tag.icon;
                  const isActive = notifType === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setNotifType(tag.id as any)}
                      className={`p-2.5 rounded-xl border font-bold text-[10px] flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        isActive ? tag.active : tag.bg
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Body Inputs */}
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Alert Header Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical platform status, holiday scheduler, top-up promotions..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Alert Body Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Draft your detailed message bulletin to deliver to clients. Keep it humble, literal, and informative."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans text-slate-700 bg-white"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full py-3 bg-[#070329] hover:bg-opacity-95 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <Send className="w-4 h-4 text-[#0ea5e9]" />
              Dispatch Platform Bulletin
            </button>

          </form>
        </div>

        {/* Right Hand: Dispatched Alerts History Log (5 cols) */}
        <div className="bg-slate-950 rounded-3xl border border-slate-900 p-5 sm:p-6 shadow-xs lg:col-span-5 space-y-4 text-white">
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Dispatched Broadcasts History
            </h2>
            <p className="text-[10px] text-gray-450 mt-0.5">Chronological audit trail of sent bulletins and targeted alert deliveries.</p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1.5 text-left">
            {notifications.map((n) => {
              return (
                <div key={n.id} className="bg-slate-900/50 p-3 rounded-2xl border border-slate-900 flex justify-between items-start gap-3 hover:border-slate-800 transition">
                  <div className="space-y-1 min-w-0 flex-grow">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold ${
                        n.type === "wallet" ? "bg-green-500/10 text-green-400" :
                        n.type === "delivery" ? "bg-blue-500/10 text-blue-400" :
                        n.type === "order" ? "bg-purple-500/10 text-purple-400" :
                        "bg-slate-500/10 text-slate-400"
                      }`}>
                        {n.type}
                      </span>
                      <span className="text-[8.5px] text-gray-500 font-mono">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`text-[8.5px] font-mono ${n.read ? "text-gray-600" : "text-amber-500"}`}>
                        {n.read ? "• Read" : "• Sent"}
                      </span>
                    </div>
                    <span className="block text-gray-200 font-sans font-black text-[11px] leading-tight truncate">{n.title}</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-sans">{n.message}</p>
                    <div className="flex items-center gap-1 pt-1 border-t border-slate-900 text-gray-500 text-[8.5px] font-mono">
                      <UserCheck className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">{getUserNameById(n.userId)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(n.id)}
                    className="p-1 hover:bg-slate-900 rounded-lg text-gray-500 hover:text-rose-400 transition cursor-pointer active:scale-90 shrink-0"
                    title="Delete Alert Log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {notifications.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <span className="text-3xl block mb-2">🎐</span>
                <span className="font-sans font-bold text-xs">No notifications logged in directory.</span>
                <span className="block text-[10px] text-gray-600 mt-1">Compose a message on the left to broadcast alerts!</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
