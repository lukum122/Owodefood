import React, { useState } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { WalletTransaction, User } from "../types";
import { hasRole } from "../roleHelper";
import { Coins, Plus, Minus, Search, ArrowUpRight, ArrowDownLeft, ShieldAlert, CheckCircle, RefreshCw, X, FileText, Landmark, CreditCard } from "lucide-react";

export const AdminWallets: React.FC = () => {
  const { 
    users, 
    walletTransactions, 
    getUserWalletBalance, 
    updateUserWalletBalance, 
    currency,
    walletFundingBankTransferEnabled,
    walletFundingMonnifyEnabled,
    walletFundingPaystackEnabled,
    updateWalletFundingModes,
    approveWalletFunding,
    declineWalletFunding,
  } = useDatabase();

  const handleToggleGateway = (gateway: "bank_transfer" | "monnify" | "paystack") => {
    const nextBank = gateway === "bank_transfer" ? !walletFundingBankTransferEnabled : walletFundingBankTransferEnabled;
    const nextMonnify = gateway === "monnify" ? !walletFundingMonnifyEnabled : walletFundingMonnifyEnabled;
    const nextPaystack = gateway === "paystack" ? !walletFundingPaystackEnabled : walletFundingPaystackEnabled;
    updateWalletFundingModes(nextBank, nextMonnify, nextPaystack);
  };

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Adjustment modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjType, setAdjType] = useState<"credit" | "debit">("credit");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Statistics calculation
  const totalEscrow = users.reduce((sum, u) => sum + getUserWalletBalance(u.id), 0);
  const totalTransactionsCount = walletTransactions.length;
  const pendingTransactions = walletTransactions.filter(tx => tx.status === "pending");
  
  const totalDeposits = walletTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalDebits = walletTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Filter users
  const filteredUsers = users.filter(u => {
    const balance = getUserWalletBalance(u.id);
    const matchesRole = roleFilter === "all" || hasRole(u, roleFilter);
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  const handleOpenAdjustment = (user: User, defaultType: "credit" | "debit") => {
    setSelectedUser(user);
    setAdjType(defaultType);
    setAdjAmount("");
    setAdjNote("");
    setModalError("");
    setModalSuccess("");
  };

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!selectedUser) return;

    const amountNum = parseFloat(adjAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError("Please enter a valid amount greater than zero.");
      return;
    }

    if (!adjNote.trim()) {
      setModalError("An audit adjustment reason / memo is required.");
      return;
    }

    const currentBalance = getUserWalletBalance(selectedUser.id);
    if (adjType === "debit" && amountNum > currentBalance) {
      setModalError(`Insufficient funds. Cannot debit ${currency}${(amountNum ?? 0).toLocaleString()} from a current balance of ${currency}${(currentBalance ?? 0).toLocaleString()}.`);
      return;
    }

    // Execute adjustment. Debit is negative, credit is positive
    const adjustmentValue = adjType === "credit" ? amountNum : -amountNum;
    const transactionType = adjType === "credit" ? "deposit" : "adjustment";

    updateUserWalletBalance(
      selectedUser.id,
      adjustmentValue,
      transactionType,
      adjNote.trim()
    );

    setModalSuccess(`Successfully ${adjType === "credit" ? "credited" : "debited"} ${selectedUser.name}'s wallet by ${currency}${(amountNum ?? 0).toLocaleString()}!`);
    
    setTimeout(() => {
      setSelectedUser(null);
      setModalSuccess("");
    }, 1500);
  };

  return (
    <div className="space-y-8 font-sans text-xs">
      
      {/* Wallet Adjustment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">Ledger Adjustment Form</span>
                <h3 className="text-base font-extrabold text-[#070329] tracking-tight mt-1">Adjust Wallet Balance</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Perform operational deposits/debits on customer account.</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Target User Profile</span>
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 block">{selectedUser.name}</span>
                  <span className="text-[9px] text-gray-400 font-mono">{selectedUser.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Current Balance</span>
                  <span className="font-black text-purple-600">{currency}{(getUserWalletBalance(selectedUser.id) ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-650 font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  {modalSuccess}
                </div>
              )}

              <div className="space-y-3">
                {/* Adjustment Mode selection */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Adjustment Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjType("credit")}
                      className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition text-xs cursor-pointer ${
                        adjType === "credit"
                          ? "bg-green-50 border-green-300 text-green-700 ring-2 ring-green-100"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <Plus className="w-4 h-4 text-green-650" />
                      Credit / Top Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType("debit")}
                      className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition text-xs cursor-pointer ${
                        adjType === "debit"
                          ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-100"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <Minus className="w-4 h-4 text-rose-650" />
                      Debit / Charge
                    </button>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans font-extrabold"
                  />
                </div>

                {/* Note memo */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Audit Log Memo / Reason</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Offline cash deposit verifications, refunds for out-of-stock orders..."
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl border border-gray-200 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 ${
                    adjType === "credit" ? "bg-green-600 hover:bg-green-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {adjType === "credit" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none text-gray-950 font-sans">Wallet Management HQ</h1>
        <p className="text-xs text-gray-400 mt-1 max-w-lg">Manage platform wallet balances, process customer credits/debits, and audit full marketplace ledger trails.</p>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Escrow */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market Escrow Balance</span>
            <div className="p-2 bg-purple-50 rounded-xl border border-purple-100">
              <Coins className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#070329] tracking-tight">{currency}{totalEscrow.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Sum of all customer, vendor, rider balances</p>
          </div>
        </div>

        {/* Total Deposits */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Inflow (Deposits)</span>
            <div className="p-2 bg-green-50 rounded-xl border border-green-100">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-green-700 tracking-tight">{currency}{totalDeposits.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Total added credits into system</p>
          </div>
        </div>

        {/* Total Debits */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Outflow (Debits)</span>
            <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
              <ArrowDownLeft className="w-4 h-4 text-rose-650" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">{currency}{totalDebits.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Total charged / processed payouts</p>
          </div>
        </div>

        {/* Active Ledger ledger */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Ledgers Logged</span>
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">{totalTransactionsCount}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Audited ledger records in directory</p>
          </div>
        </div>
      </div>

      {/* ⚙️ WALLET FUNDING CONFIGURATION & APPROVALS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Pending Approval Requests */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-2">
            <div>
              <h2 className="text-sm font-black text-[#070329] tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Awaiting Admin Approval
              </h2>
              <p className="text-[10px] text-gray-400">Confirm and credit manual bank transfers submitted by users.</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              {pendingTransactions.length} pending
            </span>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {pendingTransactions.map((tx) => (
              <div key={tx.id} className="p-3.5 bg-amber-50/40 border border-amber-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#070329]">{tx.userName}</span>
                    <span className="text-[8px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase">
                      Bank Transfer
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 font-mono">
                    <span>Amount: <strong className="text-amber-950 font-bold">{currency}{(tx.amount ?? 0).toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>Ref: <strong className="text-gray-700">{tx.reference}</strong></span>
                  </div>
                  <span className="block text-[9px] text-gray-400 font-mono">{new Date(tx.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex gap-1.5 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => approveWalletFunding(tx.id)}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-green-650 hover:bg-green-700 text-white rounded-xl text-[10px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => declineWalletFunding(tx.id)}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}

            {pendingTransactions.length === 0 && (
              <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200/80 text-gray-400">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                <p className="text-xs font-bold text-gray-500">Perfect Reconciliation!</p>
                <p className="text-[10px] text-gray-400 mt-0.5">No pending bank transfer approvals awaiting review.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Wallet Gateway Settings */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="border-b border-gray-50 pb-2">
            <h2 className="text-sm font-black text-[#070329] tracking-tight">Wallet Funding Mode Settings</h2>
            <p className="text-[10px] text-gray-400">Enable or disable payment channels accessible to users instantly.</p>
          </div>

          <div className="space-y-3 pt-1">
            {/* Paystack Channel */}
            <div className="p-3 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50/30 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-800 block">Paystack Gateway</span>
                  <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Immediate Auto-Crediting ⚡</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleGateway("paystack")}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                  walletFundingPaystackEnabled ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    walletFundingPaystackEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Monnify Channel */}
            <div className="p-3 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50/30 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-800 block">Monnify Gateway</span>
                  <span className="text-[9px] text-sky-600 font-bold block mt-0.5">Immediate Auto-Crediting ⚡</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleGateway("monnify")}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                  walletFundingMonnifyEnabled ? "bg-sky-500" : "bg-gray-200"
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    walletFundingMonnifyEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Bank Transfer Channel */}
            <div className="p-3 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50/30 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-800 block">Local Bank Transfer</span>
                  <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Requires Manual Review & Approval ⏳</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleGateway("bank_transfer")}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                  walletFundingBankTransferEnabled ? "bg-amber-500" : "bg-gray-200"
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    walletFundingBankTransferEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Users Balance Sheet Directory (7 cols) */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
            <div>
              <h2 className="text-sm font-black text-[#070329] tracking-tight">System Account Balances</h2>
              <p className="text-[10px] text-gray-400">View user wallet reserves, credit top-ups, or charge debits directly.</p>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-1 px-2 outline-none cursor-pointer focus:ring-2 focus:ring-purple-150 transition"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="vendor">Vendors</option>
              <option value="rider">Riders</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search directory by account name, email, or telephone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 pl-8 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
            />
            <span className="absolute left-2.5 top-3 text-gray-400">🔍</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wide text-[9px] py-1.5">
                  <th className="py-2.5 px-3">Account User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Available Balance</th>
                  <th className="py-2.5 px-3 text-center">Ledger Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredUsers.map((u) => {
                  const bal = getUserWalletBalance(u.id);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold font-sans text-[10px] shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block text-gray-900 font-bold font-sans">{u.name}</span>
                            <span className="text-[8.5px] text-gray-400 font-mono leading-none block">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border whitespace-nowrap ${
                          u.role === "admin" ? "bg-rose-50 border-rose-100 text-rose-700" :
                          u.role === "vendor" ? "bg-amber-50 border-amber-100 text-amber-700" :
                          u.role === "rider" ? "bg-blue-50 border-blue-100 text-blue-700" :
                          "bg-purple-50 border-purple-100 text-purple-700"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black font-sans text-gray-950">
                        {currency}{(bal ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleOpenAdjustment(u, "credit")}
                            className="px-1.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-150 rounded-lg font-bold transition text-[9px] cursor-pointer flex items-center gap-0.5"
                            title="Credit / Top Up Wallet"
                          >
                            <Plus className="w-3 h-3 text-green-650" /> Fund
                          </button>
                          <button
                            onClick={() => handleOpenAdjustment(u, "debit")}
                            className="px-1.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-lg font-bold transition text-[9px] cursor-pointer flex items-center gap-0.5"
                            title="Debit / Charge Wallet"
                          >
                            <Minus className="w-3 h-3 text-rose-650" /> Debit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No matching accounts found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Ledger / Recent Transactions Trail Audit Log (5 cols) */}
        <div className="bg-slate-950 rounded-3xl border border-slate-900 p-5 sm:p-6 shadow-xs lg:col-span-5 space-y-4 text-white">
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-400" />
              Platform System Ledger
            </h2>
            <p className="text-[10px] text-gray-450 mt-0.5">Chronological trail of marketplace deposits, adjustments, and refunds.</p>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1.5">
            {walletTransactions.map((tx) => {
              const isCredit = tx.amount >= 0;
              return (
                <div key={tx.id} className="bg-slate-900/60 p-3 rounded-2xl border border-slate-900 flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold ${
                        tx.type === "deposit" ? "bg-green-500/10 text-green-400" :
                        tx.type === "refund" ? "bg-blue-500/10 text-blue-400" :
                        tx.type === "purchase" ? "bg-purple-500/10 text-purple-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {tx.type}
                      </span>
                      <span className="text-[8.5px] text-gray-500 font-mono">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <span className="block text-gray-200 font-sans font-bold text-[11px] truncate leading-tight">{tx.userName}</span>
                    <p className="text-[10px] text-gray-400 leading-tight italic">"{tx.note || 'Adjustment'}"</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-black font-sans text-xs ${isCredit ? "text-green-400" : "text-rose-400"}`}>
                      {isCredit ? "+" : ""}{currency}{(tx.amount ?? 0).toLocaleString()}
                    </span>
                    <span className="block text-[8px] text-gray-500 font-mono mt-0.5">ID: {tx.id}</span>
                  </div>
                </div>
              );
            })}

            {walletTransactions.length === 0 && (
              <div className="text-center py-12 text-gray-500 font-sans">
                No ledger transactions logged.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
