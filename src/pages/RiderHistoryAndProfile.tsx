import React, { useState, useEffect } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Bike, ShieldCheck, User, Save, Edit3, Check, DollarSign, Lock } from "lucide-react";

export const RiderHistory: React.FC = () => {
  const { 
    currentRider, 
    orders, 
    currency,
    riderCommissionType,
    riderCommissionValue,
    receiptPickupOrders
  } = useDatabase();

  if (!currentRider) {
    return <div className="text-gray-500 text-sm">Rider profile not synced.</div>;
  }

  // Historic orders delivered by current rider
  const pastOrders = orders.filter(
    o => o.riderId === currentRider.id && o.status === "delivered"
  );

  const pastReceiptOrders = (receiptPickupOrders || []).filter(
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

  const combinedHistory = [
    ...pastOrders.map(o => ({
      id: o.id,
      type: "Food Delivery",
      createdAt: o.createdAt || new Date().toISOString(),
      vendorName: o.vendorName,
      address: o.deliveryAddress,
      deliveryFee: o.deliveryFee ?? 750
    })),
    ...pastReceiptOrders.map(o => ({
      id: o.id,
      type: "Receipt Pickup",
      createdAt: o.createdAt || new Date().toISOString(),
      vendorName: o.vendorName,
      address: o.deliveryAddress,
      deliveryFee: o.deliveryFee ?? 750
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const netEarnings = combinedHistory.reduce(
    (sum, o) => sum + getNetPayout(o.deliveryFee ?? 750), 
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
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Courier Audits ({combinedHistory.length})</span>
          <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded font-mono font-bold">Net Paid Balance: {currency}{ netEarnings.toLocaleString() }</span>
        </div>

        {combinedHistory.length > 0 ? (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto pr-1 text-xs">
            {combinedHistory.map((hist) => {
              const baseFee = hist.deliveryFee;
              const netFee = getNetPayout(baseFee);
              const commDeducted = baseFee - netFee;
              
              return (
                <div key={hist.id} className="py-4.5 flex gap-4 items-center justify-between first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-950 font-mono">RUN ID: {hist.id}</span>
                      <span className="text-[10px] text-gray-400 font-mono leading-none">{new Date(hist.createdAt).toLocaleDateString()}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-800 font-bold uppercase font-mono px-1.5 py-0.5 rounded shrink-0">
                        {hist.type}
                      </span>
                    </div>
                    
                    <span className="block text-gray-500 text-[11px]">From merchant: <b className="text-gray-900 capitalize">{hist.vendorName}</b></span>
                    <span className="block text-gray-500 text-[11px] truncate max-w-sm">Drop-off: {hist.address}</span>
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
  const { currentUser, resetUserPin, currentRider, updateRiderProfile } = useDatabase();

  const [name, setName] = useState(currentRider?.name || "");
  const [phone, setPhone] = useState(currentRider?.phone || "");
  const [vehicle, setVehicle] = useState(currentRider?.vehicleType || "motorcycle");

  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Security & PIN changing state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  // OTP verification states for phone number modification
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpNotification, setOtpNotification] = useState("");

  useEffect(() => {
    if (currentRider) {
      setName(currentRider.name || "");
      setPhone(currentRider.phone || "");
      setVehicle(currentRider.vehicleType || "motorcycle");
    }
  }, [currentRider]);

  const performRiderProfileUpdate = () => {
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

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!name || !phone) {
      setErrorText("Legal name and telephone details are required.");
      return;
    }

    const cleanNewPhone = phone.trim();
    const cleanOldPhone = (currentRider?.phone || "").trim();

    if (cleanNewPhone !== cleanOldPhone) {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setSentOtp(code);
      setOtpCode("");
      setOtpError("");
      setOtpNotification(`SIMULATED SMS: Your Owode Food verification code is ${code}`);
      setShowOtpModal(true);
      return;
    }

    performRiderProfileUpdate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (otpCode.trim() === sentOtp) {
      performRiderProfileUpdate();
      setShowOtpModal(false);
      setOtpNotification("");
    } else {
      setOtpError("Incorrect code. Please enter the simulated verification code shown above.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResendOtp = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setSentOtp(code);
    setOtpCode("");
    setOtpError("");
    setOtpNotification(`SIMULATED SMS: Your new verification code is ${code}`);
  };

  const handlePinChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess("");

    if (!currentPin || !newPin || !confirmNewPin) {
      setPinError("Please fill in all security PIN fields.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentPin !== currentUser?.pin) {
      setPinError("The current security PIN you entered is incorrect.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError("The new security PIN must be exactly 4 digits.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinError("The new security PIN and confirmation PIN do not match.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (newPin === currentPin) {
      setPinError("The new PIN cannot be the same as your current PIN.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      if (currentUser) {
        resetUserPin(currentUser.id, newPin);
        setPinSuccess("Your login security PIN has been updated successfully!");
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
      }
    } catch (err: any) {
      setPinError("Failed to update security PIN.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition ${
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
                className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition ${
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
              className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition capitalize ${
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

      {/* SECURITY / PASSWORD (PIN) CHANGE CARD */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
        <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
          <div className="w-9 h-9 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center">
            <Lock className="w-4.5 h-4.5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#070329] leading-tight">Security & Login Credentials</h2>
            <p className="text-xs text-gray-500 mt-0.5">Change your 4-digit security PIN used to log into your Owode Food account.</p>
          </div>
        </div>

        {pinSuccess && (
          <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold animate-fade-in">
            {pinSuccess}
          </div>
        )}
        {pinError && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold animate-fade-in">
            {pinError}
          </div>
        )}

        <form onSubmit={handlePinChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Current Security PIN</label>
              <input
                type="password"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full text-xs p-3.5 border border-gray-150 rounded-xl outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 font-mono tracking-widest text-center"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">New 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full text-xs p-3.5 border border-gray-150 rounded-xl outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 font-mono tracking-widest text-center"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Confirm New PIN</label>
              <input
                type="password"
                maxLength={4}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full text-xs p-3.5 border border-gray-150 rounded-xl outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 font-mono tracking-widest text-center"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 bg-purple-700 hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-purple-200" />
              Update Security PIN
            </button>
          </div>
        </form>
      </div>

      {/* OTP MODAL OVERLAY */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-gray-100 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Verify Telephone Change</h3>
              <p className="text-xs text-gray-500 leading-normal">
                To secure your dispatch credentials, we have dispatched a simulated verification OTP to <strong className="text-slate-800">{phone}</strong>.
              </p>
            </div>

            {/* Simulated Notification Box */}
            {otpNotification && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1 text-xs animate-pulse">
                <span className="inline-block py-0.5 px-1.5 bg-amber-200 text-amber-900 rounded font-black text-[9px] uppercase tracking-wider">
                  Simulated Notification
                </span>
                <p className="font-mono font-bold text-amber-950 text-[11px] select-all">
                  {otpNotification}
                </p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 block">4-Digit Security Code</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-black p-3.5 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl outline-none"
                />
              </div>

              {otpError && (
                <p className="text-xs font-bold text-red-600">{otpError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtpNotification("");
                    setPhone(currentRider?.phone || "");
                  }}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer animate-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  Confirm & Save
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-gray-50 text-center">
              <span className="text-[11px] text-gray-400 block">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Resend OTP
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
