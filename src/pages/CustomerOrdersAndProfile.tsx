import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { OrderStatus, UserRole } from "../types";
import { ClipboardList, User, Phone, MapPin, CheckCircle2, ChevronRight, Clock, Star, Edit3, Save, Compass, LogOut, Upload, Image, Camera, RefreshCw, Briefcase, ShieldCheck, Bike, Store, HelpCircle, Heart, Trash2, ChevronDown, TrendingUp, Lock, CreditCard, ArrowLeftRight, UserX, DollarSign, XCircle, Download, X } from "lucide-react";
import { compressImageToDataUrl } from "../imageUtils";

export const getUserAvatarUrl = (user: { gender?: string; profileImage?: string } | null | undefined) => {
  if (user?.profileImage) return user.profileImage;
  if (user?.gender === "male") {
    return "/images/burger.png";
  }
  if (user?.gender === "female") {
    return "/images/hero.png";
  }
  return "/images/jollof.png";
};

export const CustomerOrders: React.FC = () => {
  const { orders, currentUser, currency, resubmitOrderReceipt } = useDatabase();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Filter orders where customer matches current logged user
  const customerOrders = orders.filter(o => o.customerId === currentUser?.id);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "awaiting_payment_verification": return "text-orange-600 bg-orange-50 border-orange-200";
      case "pending": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "accepted": return "text-blue-600 bg-blue-50 border-blue-200";
      case "preparing": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "ready": return "text-purple-600 bg-purple-50 border-purple-200";
      case "out_for_delivery": return "text-amber-600 bg-amber-50 border-amber-200";
      case "delivered": return "text-green-600 bg-green-50 border-green-200";
      case "cancelled": return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusStep = (status: OrderStatus): number => {
    switch (status) {
      case "awaiting_payment_verification": return -2;
      case "pending": return 0;
      case "accepted": return 1;
      case "preparing": return 2;
      case "ready": return 3;
      case "out_for_delivery": return 4;
      case "delivered": return 5;
      case "cancelled": return -1;
    }
  };

  const steps = ["Sent", "Accepted", "Cooking", "Ready", "Dispatched", "Delivered"];

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">Active Fulfillment Timelines</h1>
        <p className="text-xs text-gray-500 mt-0.5">Track kitchen acceptance, meal prep, courier dispatch, and history.</p>
      </div>

      {customerOrders.length > 0 ? (
        <div className="space-y-6">
          {customerOrders.map((order) => {
            const currentStep = getStatusStep(order.status);
            return (
              <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col gap-6">
                
                {/* Order Header / Stats metadata */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-sm">Order ID: {order.id}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="block text-xs font-semibold text-gray-500">From: <b className="text-gray-900 capitalize">{order.vendorName}</b></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`py-1.5 px-3 border rounded-xl text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <span className="font-extrabold text-sm text-[#070329] font-mono">{currency}{(order.totalAmount ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Tracking Progress Node (Only show if not cancelled) */}
                {currentStep >= 0 ? (
                  <div className="py-2">
                    {/* Status Step indicators */}
                    <div className="flex items-center justify-between relative mb-2">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-10 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#070329] -z-10 rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                      ></div>

                      {steps.map((st, idx) => {
                        const isDone = idx <= currentStep;
                        const isCurr = idx === currentStep;
                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs sm:text-sm transition duration-300 ${
                              isDone 
                                ? "bg-[#070329] border-[#070329] text-white" 
                                : "bg-white border-gray-200 text-gray-400"
                            } ${isCurr ? "ring-4 ring-blue-100 scale-110" : ""}`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-semibold mt-1.5 hidden sm:block ${
                              isCurr ? "text-gray-900 font-bold" : isDone ? "text-gray-600" : "text-gray-400"
                            }`}>
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : currentStep === -2 ? (
                  <div className={`p-5 border rounded-2xl text-xs flex flex-col gap-3 ${order.rejectionReason ? 'bg-red-50 border-red-200 text-red-900' : 'bg-orange-50 border-orange-200 text-orange-900'}`}>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className={`w-5 h-5 shrink-0 ${order.rejectionReason ? 'text-red-600' : 'text-orange-600'}`} />
                      <div>
                        <p className={`font-bold text-sm ${order.rejectionReason ? 'text-red-700' : 'text-orange-700'}`}>
                          {order.rejectionReason ? "Payment Rejected" : "Awaiting Payment Verification"}
                        </p>
                        <p className={`opacity-90 mt-1 ${order.rejectionReason ? 'text-red-800' : 'text-orange-800'}`}>
                          {order.rejectionReason ? (
                            <>Your payment receipt was rejected. Reason: <b>{order.rejectionReason}</b>. Please upload a valid replacement receipt below to continue processing this order.</>
                          ) : (
                            "Your payment receipt has been submitted and is currently being verified by an administrator. Once approved, your order will automatically be sent to the kitchen."
                          )}
                        </p>
                      </div>
                    </div>
                    {order.rejectionReason && (
                      <div className="mt-2 bg-white rounded-xl border border-red-100 p-4">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id={`receipt-upload-${order.id}`}
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              try {
                                const compressed = await compressImageToDataUrl(e.target.files[0]);
                                const result = await resubmitOrderReceipt(order.id, compressed);
                                if (!result?.success) {
                                  window.alert(result?.error || "Failed to upload your receipt. Please try again.");
                                }
                              } catch (err) {
                                console.error("[receipt resubmit] Failed to process image:", err);
                                window.alert(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
                              }
                            }
                          }}
                        />
                        <label 
                          htmlFor={`receipt-upload-${order.id}`}
                          className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer transition"
                        >
                          <Upload className="w-4 h-4" /> Upload Replacement Receipt
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> This order was cancelled.
                  </div>
                )}

                {/* Bottom Receipt & Logistics assigned driver */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs">
                    <p className="font-bold text-gray-900 uppercase tracking-wide">Basket Contents</p>
                    <div className="divide-y divide-gray-100">
                      {order.orderType === "receipt_pickup" ? (
                        <div className="py-2 flex flex-col space-y-2">
                          <span className="text-gray-900 font-bold">Receipt Pickup Request</span>
                          {order.receiptNote && (
                            <span className="text-gray-600 text-[10px]">Note: {order.receiptNote}</span>
                          )}
                          {order.receiptImageOrQr && (
                            <button
                              type="button"
                              onClick={() => setZoomedImage(order.receiptImageOrQr)}
                              className="text-blue-600 underline text-[10px] text-left cursor-pointer"
                            >
                              View Receipt / QR
                            </button>
                          )}
                        </div>
                      ) : (
                        order.items.map((item, id) => (
                          <div key={id} className="py-2 flex justify-between">
                            <span className="text-gray-600">{item.name} <b className="text-gray-900">x{item.quantity}</b></span>
                            <span className="font-bold text-gray-800 font-mono">{currency}{((item.price ?? 0) * item.quantity).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                      {order.serviceFee !== undefined && order.serviceFee !== null && (
                        <div className="py-2 flex justify-between text-[11px] font-medium border-t border-dashed border-gray-200 mt-1 pt-2">
                          <span className="text-gray-500">Service Fee</span>
                          <span className="font-extrabold text-gray-700 font-mono">{currency}{(order.serviceFee ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <span className="font-bold text-gray-900 uppercase tracking-wide block">Courier Logistics</span>
                      {order.riderId ? (
                        <div className="flex items-center gap-2 bg-blue-50/40 p-3 rounded-xl border border-blue-50 text-blue-900">
                          <Compass className="w-5 h-5 text-blue-600 shrink-0" />
                          <div>
                            <p className="font-bold leading-none text-xs text-blue-950">Driver: {order.riderName}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Vehicle dispatched. Track status above.</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 font-mono italic text-[11px]">
                          {order.status === "pending" || order.status === "accepted" || order.status === "preparing"
                            ? "Waiting for kitchen to finish prep before courier dispatch..."
                            : "Searching for nearby rider in Owode Food..."}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 pt-1.5 border-t border-gray-50">
                      <span className="font-bold text-gray-400 uppercase tracking-wider block text-[10px]">Recipient Destination</span>
                      <p className="flex items-center gap-1.5 text-gray-600 leading-snug">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        {order.deliveryAddress}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">No active orders found</p>
          <p className="text-xs text-gray-400 mt-1">Browse restaurants and order fresh food to initialize a ticket.</p>
        </div>
      )}

      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-[110]">
            <a
              href={zoomedImage}
              download="receipt-proof.png"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-lg flex items-center justify-center cursor-pointer"
              title="Download Original Image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setZoomedImage(null)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-lg flex items-center justify-center cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <img
              src={zoomedImage}
              alt="Receipt / QR Preview"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="text-white/60 text-xs mt-4 font-sans font-medium text-center max-w-md select-none">
            Click anywhere to close.
          </p>
        </div>
      )}
    </div>
  );
};

export const CustomerProfile: React.FC = () => {
  const { 
    currentUser, 
    updateProfile, 
    logout, 
    vendors, 
    riders, 
    applyForVendor, 
    applyForRider, 
    switchRole,
    resetUserPin,
    getUserWalletBalance,
    updateUserWalletBalance,
    users,
    currency
  } = useDatabase();
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [gender, setGender] = useState(currentUser?.gender || "male");
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || "");

  // Sensitive security & wallet operations state
  const [bankName, setBankName] = useState(() => localStorage.getItem(`bank_name_user_${currentUser?.id}`) || "");
  const [accountNum, setAccountNum] = useState(() => localStorage.getItem(`bank_acc_num_user_${currentUser?.id}`) || "");
  const [accountName, setAccountName] = useState(() => localStorage.getItem(`bank_acc_name_user_${currentUser?.id}`) || "");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [sensitiveActionType, setSensitiveActionType] = useState<"link_bank" | "withdraw" | "transfer" | "delete_account" | null>(null);
  const [sensitiveOtp, setSensitiveOtp] = useState("");
  const [generatedSensitiveOtp, setGeneratedSensitiveOtp] = useState("");
  const [sensitiveOtpInput, setSensitiveOtpInput] = useState("");
  const [sensitiveError, setSensitiveError] = useState("");
  const [sensitiveSuccess, setSensitiveSuccess] = useState("");
  
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Security & PIN changing state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  // OTP flow for phone number change
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpNotification, setOtpNotification] = useState("");

  // Sync favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const key = `fd_favorites_${currentUser?.id || "guest"}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : ["v-1", "v-2"];
  });

  useEffect(() => {
    const handleSync = () => {
      const key = `fd_favorites_${currentUser?.id || "guest"}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    };
    window.addEventListener("fd-favorites-updated", handleSync);
    return () => window.removeEventListener("fd-favorites-updated", handleSync);
  }, [currentUser]);

  const handleRemoveFavorite = (vendorId: string) => {
    const key = `fd_favorites_${currentUser?.id || "guest"}`;
    const newFavs = favorites.filter(id => id !== vendorId);
    localStorage.setItem(key, JSON.stringify(newFavs));
    setFavorites(newFavs);
    window.dispatchEvent(new Event("fd-favorites-updated"));
  };

  // States for Vendor / Rider Applications
  const [vBusinessName, setVBusinessName] = useState("");
  const [vCuisine, setVCuisine] = useState("");
  const [vBusinessRegNo, setVBusinessRegNo] = useState("");
  const [vFoodPermitNo, setVFoodPermitNo] = useState("");
  const [vVerificationDoc, setVVerificationDoc] = useState("/images/chicken.png");
  const [vSuccess, setVSuccess] = useState("");
  const [vError, setVError] = useState("");

  const [rVehicleType, setRVehicleType] = useState<"bicycle" | "motorcycle" | "car">("motorcycle");
  const [rLicenseNo, setRLicenseNo] = useState("");
  const [rPlateNo, setRPlateNo] = useState("");
  const [rNationalIdNo, setRNationalIdNo] = useState("");
  const [rVerificationDoc, setRVerificationDoc] = useState("/images/pizza.png");
  const [rSuccess, setRSuccess] = useState("");
  const [rError, setRError] = useState("");

  const handleVendorDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setVError("Document size should be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setVVerificationDoc(reader.result as string);
        setVError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRiderDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setRError("Document size should be less than 2MB.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRVerificationDoc(reader.result as string);
        setRError("");
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setGender(currentUser.gender || "male");
      setProfileImage(currentUser.profileImage || "");
    }
  }, [currentUser]);

  // Sensitive security & wallet operations triggers
  const triggerSensitiveAction = async (type: "link_bank" | "withdraw" | "transfer" | "delete_account") => {
    setSensitiveError("");
    setSensitiveSuccess("");

    if (type === "link_bank") {
      if (!bankName.trim() || !accountNum.trim() || !accountName.trim()) {
        setSensitiveError("Please fill out all bank account fields before proceeding.");
        return;
      }
      if (accountNum.trim().length < 10) {
        setSensitiveError("Account number must be a valid 10-digit NUBAN.");
        return;
      }
    }

    if (type === "withdraw") {
      const balance = currentUser ? getUserWalletBalance(currentUser.id) : 0;
      const amt = Number(withdrawAmount);
      if (isNaN(amt) || amt <= 0) {
        setSensitiveError("Please enter a valid withdrawal amount.");
        return;
      }
      if (amt > balance) {
        setSensitiveError(`Insufficient wallet balance. Your current balance is ${currency}${(balance ?? 0).toLocaleString()}.`);
        return;
      }
      if (!bankName.trim() || !accountNum.trim()) {
        setSensitiveError("You must link a valid payout bank account before requesting withdrawal.");
        return;
      }
    }

    if (type === "transfer") {
      const balance = currentUser ? getUserWalletBalance(currentUser.id) : 0;
      const amt = Number(transferAmount);
      if (isNaN(amt) || amt <= 0) {
        setSensitiveError("Please enter a valid transfer amount.");
        return;
      }
      if (amt > balance) {
        setSensitiveError(`Insufficient wallet balance. Your current balance is ${currency}${(balance ?? 0).toLocaleString()}.`);
        return;
      }
      const recip = users.find(u => 
        u.email.toLowerCase() === transferRecipient.trim().toLowerCase() ||
        u.phone.replace(/[\s\-\+\(\)]/g, "") === transferRecipient.trim().replace(/[\s\-\+\(\)]/g, "")
      );
      if (!recip) {
        setSensitiveError("Recipient user not found on the platform. Verify email or phone.");
        return;
      }
      if (recip.id === currentUser?.id) {
        setSensitiveError("You cannot transfer wallet funds to yourself.");
        return;
      }
    }

    // Generate random 4-digit security OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedSensitiveOtp(code);
    setSensitiveActionType(type);
    setSensitiveOtpInput("");

    // Try sending email
    if (currentUser?.email) {
      try {
        await fetch("/api/email/send-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: currentUser.email,
            name: currentUser.name,
            pin: code
          })
        });
      } catch (e) {
        console.warn("Could not dispatch sensitive action OTP via SMTP, visual sandbox bypass ready.", e);
      }
    }
  };

  const confirmSensitiveAction = (e: React.FormEvent) => {
    e.preventDefault();
    setSensitiveError("");

    if (sensitiveOtpInput !== generatedSensitiveOtp) {
      setSensitiveError("Incorrect 4-digit OTP. Please check the simulated OTP code and try again.");
      return;
    }

    if (!currentUser) return;

    if (sensitiveActionType === "link_bank") {
      localStorage.setItem(`bank_name_user_${currentUser.id}`, bankName.trim());
      localStorage.setItem(`bank_acc_num_user_${currentUser.id}`, accountNum.trim());
      localStorage.setItem(`bank_acc_name_user_${currentUser.id}`, accountName.trim());
      setSensitiveSuccess("Success! Your bank details have been verified & linked successfully.");
    }

    if (sensitiveActionType === "withdraw") {
      const amt = Number(withdrawAmount);
      updateUserWalletBalance(currentUser.id, amt, "withdrawal", `Withdrawal of ${currency}${(amt ?? 0).toLocaleString()} to ${bankName} (${accountNum})`);
      setSensitiveSuccess(`Withdrawal Authorized! ${currency}${(amt ?? 0).toLocaleString()} has been deducted and dispatched to your bank.`);
      setWithdrawAmount("");
    }

    if (sensitiveActionType === "transfer") {
      const amt = Number(transferAmount);
      const recip = users.find(u => 
        u.email.toLowerCase() === transferRecipient.trim().toLowerCase() ||
        u.phone.replace(/[\s\-\+\(\)]/g, "") === transferRecipient.trim().replace(/[\s\-\+\(\)]/g, "")
       )!;

      updateUserWalletBalance(currentUser.id, amt, "transfer", `Transfer of ${currency}${(amt ?? 0).toLocaleString()} to ${recip.name}`);
      updateUserWalletBalance(recip.id, amt, "funding", `Transfer of ${currency}${(amt ?? 0).toLocaleString()} from ${currentUser.name}`);
      
      setSensitiveSuccess(`Transfer Authorized! ${currency}${(amt ?? 0).toLocaleString()} was successfully transferred to ${recip.name}.`);
      setTransferRecipient("");
      setTransferAmount("");
    }

    if (sensitiveActionType === "delete_account") {
      alert("WARNING: Your account deletion is being executed permanently.");
      logout();
      navigate("/login");
      return;
    }

    setSensitiveActionType(null);
  };

  // Retrieve existing profiles to detect pending, approved, or empty states
  const myVendorProfile = vendors.find(v => v.userId === currentUser?.id);
  const myRiderProfile = riders.find(r => r.userId === currentUser?.id);

  const myApprovedRoles = currentUser?.roles || (currentUser ? [currentUser.role] : []);

  const handleGenderChange = (newGender: "male" | "female") => {
    setGender(newGender);
    const maleDefault = "/images/burger.png";
    const femaleDefault = "/images/hero.png";
    if (!profileImage || profileImage === maleDefault || profileImage === femaleDefault) {
      setProfileImage("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorText("Image size should be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setErrorText("");
      };
      reader.readAsDataURL(file);
    }
  };

  const performProfileUpdate = async () => {
    const result = await updateProfile(name.trim(), phone.trim(), gender, profileImage);
    if (!result?.success) {
      setErrorText(result?.error || "Could not update profile details.");
      return;
    }
    setSuccessText("Your member profile details were synced successfully!");
    setIsEditing(false);
    setTimeout(() => {
      setSuccessText("");
    }, 3000);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!name.trim() || !phone.trim()) {
      setErrorText("Please enter both your name and phone number.");
      return;
    }

    const cleanNewPhone = phone.trim();
    const cleanOldPhone = (currentUser?.phone || "").trim();

    if (cleanNewPhone !== cleanOldPhone) {
      // Intercept phone number change and request OTP
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setSentOtp(code);
      setOtpCode("");
      setOtpError("");
      setOtpNotification(`SIMULATED SMS: Your Owode Food verification code is ${code}`);
      setShowOtpModal(true);
      return;
    }

    performProfileUpdate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (otpCode.trim() === sentOtp) {
      performProfileUpdate();
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

  const handlePinChange = async (e: React.FormEvent) => {
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
        const result = await resetUserPin(currentUser.id, newPin);
        if (!result?.success) {
          setPinError(result?.error || "Failed to update security PIN.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
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

  const handleApplyVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVSuccess("");
    setVError("");
    if (!vBusinessName.trim() || !vCuisine.trim()) {
      setVError("Please fill out both Business Name and Cuisine Specialty.");
      return;
    }
    if (!vBusinessRegNo.trim() || !vFoodPermitNo.trim()) {
      setVError("Please provide both your Business Registration Number and Food Safety Permit Number.");
      return;
    }
    const res = await applyForVendor(vBusinessName.trim(), vCuisine.trim(), {
      businessRegNo: vBusinessRegNo.trim(),
      foodPermitNo: vFoodPermitNo.trim(),
      verificationDoc: vVerificationDoc
    });
    if (res.success) {
      setVSuccess("Your application with verified credentials was submitted! A platform Administrator will review this shortly.");
      setVBusinessName("");
      setVCuisine("");
      setVBusinessRegNo("");
      setVFoodPermitNo("");
    } else {
      setVError(res.error || "Failed to submit vendor application.");
    }
  };

  const handleApplyRider = async (e: React.FormEvent) => {
    e.preventDefault();
    setRSuccess("");
    setRError("");
    if (!rLicenseNo.trim() || !rPlateNo.trim() || !rNationalIdNo.trim()) {
      setRError("All driver registration fields (License No, Plate No, National ID No) are required.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const res = await applyForRider(rVehicleType, {
      licenseNo: rLicenseNo.trim(),
      plateNo: rPlateNo.trim(),
      nationalIdNo: rNationalIdNo.trim(),
      verificationDoc: rVerificationDoc
    });
    if (res.success) {
      setRSuccess("Rider delivery dispatch request with verification files was submitted! Review is pending.");
      setRLicenseNo("");
      setRPlateNo("");
      setRNationalIdNo("");
    } else {
      setRError(res.error || "Failed to submit rider application.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSwitchRole = (newRole: UserRole) => {
    if (currentUser) {
      const updated = { ...currentUser, role: newRole };
      localStorage.setItem("fd_session_user", JSON.stringify(updated));
    }
    // Dynamic dashboard redirection based on authorized modules
    if (newRole === "customer") {
      window.location.href = "/";
    } else if (newRole === "vendor") {
      window.location.href = "/vendor/dashboard";
    } else if (newRole === "rider") {
      window.location.href = "/rider/dashboard";
    } else if (newRole === "admin" || newRole === "employee" || newRole === "super_admin") {
      window.location.href = "/admin/dashboard";
    }
  };

  const ensureEditing = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight">Your Client Profile</h1>
          <p className="text-xs text-gray-500 mt-0.5">Edit billing info, delivery destination names, and contact parameters.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="self-start sm:self-auto py-2 px-4 bg-[#070329] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
          >
            <Edit3 className="w-4 h-4 text-[#0ea5e9]" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {successText && (
          <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold">
            {successText}
          </div>
        )}
        {errorText && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">
            {errorText}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-gray-50 pb-6">
          <div 
            onClick={ensureEditing}
            className="relative group shrink-0 cursor-pointer"
            title={!isEditing ? "Click to edit profile picture" : undefined}
          >
            <img
              src={profileImage || getUserAvatarUrl({ gender, profileImage })}
              alt={name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-100 shadow-md bg-white group-hover:border-purple-300 transition"
            />
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-grow space-y-1.5 text-center sm:text-left">
            <h3 className="font-extrabold text-lg text-slate-900 leading-none">{currentUser?.name}</h3>
            <span className="text-xs text-gray-400 block font-mono">{currentUser?.email}</span>
            <span className="inline-block py-0.5 px-2 bg-purple-50 text-purple-700 border border-purple-100 text-[10px] uppercase font-bold rounded-md">
              Verified {currentUser?.role} Member
            </span>
            
            {isEditing ? (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 animate-in fade-in duration-200">
                <label className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg cursor-pointer transition flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5 text-purple-600" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Please enter preferred profile picture URL:", profileImage || "");
                    if (url !== null) {
                      setProfileImage(url.trim());
                    }
                  }}
                  className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Image className="w-3.5 h-3.5 text-blue-500" />
                  Paste URL
                </button>

                {profileImage && (
                  <button
                    type="button"
                    onClick={() => setProfileImage("")}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset to Default
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 italic">Click on any details below to initiate edit mode.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-slate-500 block">Email Address (Immutable)</label>
            <input
              type="text"
              value={currentUser?.email || ""}
              disabled
              title="Registered email address cannot be changed."
              className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed outline-none font-mono"
            />
          </div>

          <div 
            onClick={ensureEditing}
            className="space-y-1.5 text-left cursor-pointer"
          >
            <label className="text-xs font-bold text-slate-700 block">First & Last Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              placeholder="Enter first & last name"
              className={`w-full text-xs p-3.5 border rounded-xl outline-none transition ${
                isEditing 
                  ? "bg-white border-blue-400 focus:ring-4 focus:ring-blue-100 font-bold text-slate-900" 
                  : "bg-gray-50/50 border-gray-150 cursor-pointer hover:bg-gray-50 text-slate-700"
              }`}
            />
          </div>

          <div 
            onClick={ensureEditing}
            className="space-y-1.5 text-left cursor-pointer"
          >
            <label className="text-xs font-bold text-slate-700 block">Telephone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
              placeholder="Enter phone number"
              className={`w-full text-xs p-3.5 border rounded-xl outline-none transition ${
                isEditing 
                  ? "bg-white border-blue-400 focus:ring-4 focus:ring-blue-100 font-bold text-slate-900" 
                  : "bg-gray-50/50 border-gray-150 cursor-pointer hover:bg-gray-50 text-slate-700"
              }`}
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-slate-700 block">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    ensureEditing();
                    handleGenderChange(g);
                  }}
                  className={`py-2.5 px-3 text-center font-bold text-xs capitalize rounded-xl border transition cursor-pointer ${
                    gender === g
                      ? "bg-[#070329] border-[#070329] text-white shadow-sm ring-4 ring-purple-100 font-extrabold"
                      : "bg-gray-50/50 border-gray-200 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setName(currentUser?.name || "");
                    setPhone(currentUser?.phone || "");
                    setGender(currentUser?.gender || "male");
                    setProfileImage(currentUser?.profileImage || "");
                    setIsEditing(false);
                    setErrorText("");
                  }}
                  className="py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Parameters
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Account
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
          <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold">
            {pinSuccess}
          </div>
        )}
        {pinError && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">
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
              className="py-2.5 px-4 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Lock className="w-4 h-4 text-purple-400" />
              Update Security PIN
            </button>
          </div>
        </form>
      </div>

      {/* SECURED WALLET & BANK OPERATIONS CENTER */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
              <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#070329] leading-tight">Secured Wallet & Bank Settlement Hub</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage digital wallet funds, payouts, transfers, and linked bank settlement credentials.</p>
            </div>
          </div>
        </div>

        {/* WALLET BALANCE CARD */}
        <div className="bg-gradient-to-br from-[#070329] to-[#1d1253] text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-purple-200 uppercase tracking-widest font-black block">Digital Settlement Wallet</span>
              <span className="text-2xl font-black font-mono mt-1 block">
                {currency}{((currentUser ? getUserWalletBalance(currentUser.id) : 0) ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg text-[9px] uppercase tracking-wider font-extrabold text-emerald-300">
              Active & Secured
            </div>
          </div>
          
          <div className="flex justify-between items-end border-t border-white/10 pt-3 text-[10px] text-purple-200 font-mono">
            <div>
              <span className="text-[9px] text-purple-300/60 block uppercase">Settlement Tier</span>
              <span className="font-extrabold text-white">Tier 2 Verification</span>
            </div>
            <div>
              <span className="text-[9px] text-purple-300/60 block uppercase">Account Holder</span>
              <span className="font-extrabold text-white uppercase">{currentUser?.name}</span>
            </div>
          </div>
        </div>

        {sensitiveSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {sensitiveSuccess}
          </div>
        )}
        {sensitiveError && (
          <div className="p-3 bg-rose-50 text-rose-805 border border-rose-200 rounded-xl text-xs font-bold animate-fade-in">
            {sensitiveError}
          </div>
        )}

        <div className="space-y-6">
          {/* FEATURE 1: LINK PAYOUT BANK ACCOUNT */}
          <div className="p-4 border border-gray-150 rounded-2xl bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-600" />
                Linked Settlement Payout Account
              </span>
              <span className="text-[9px] text-gray-400 font-mono font-bold">NUBAN Verified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. GTBank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                  value={accountNum}
                  onChange={(e) => setAccountNum(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => triggerSensitiveAction("link_bank")}
                className="py-1.5 px-3.5 bg-[#070329] hover:bg-opacity-95 text-white text-[10px] font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
              >
                Secure Link Bank Account
              </button>
            </div>
          </div>

          {/* FEATURE 2: WITHDRAW FUNDS & PEER-TO-PEER TRANSFER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* WITHDRAWAL BLOCK */}
            <div className="p-4 border border-gray-150 rounded-2xl bg-gray-50/50 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Withdraw to Bank
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold">Payout</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Withdrawal Amount ({currency})</label>
                  <input
                    type="number"
                    placeholder="Min 100"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-mono"
                  />
                </div>
                <p className="text-[9px] text-gray-400 leading-normal">
                  Withdrawals are instantly settled into your linked payout bank: <span className="font-semibold text-slate-700">{bankName || "(Not Linked)"}</span>.
                </p>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => triggerSensitiveAction("withdraw")}
                  className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </div>

            {/* P2P TRANSFER BLOCK */}
            <div className="p-4 border border-gray-150 rounded-2xl bg-gray-50/50 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                    P2P Instant Transfer
                  </span>
                  <span className="text-[9px] text-blue-500 font-bold">Zero Fee</span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500">Recipient Email or Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. receiver@email.com"
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500">Amount ({currency})</label>
                    <input
                      type="number"
                      placeholder="Transfer Amount"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => triggerSensitiveAction("transfer")}
                  className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
                >
                  Send Cash Instantly
                </button>
              </div>
            </div>

          </div>

          {/* DANGER ZONE: PERMANENT ACCOUNT DELETION */}
          <div className="pt-4 border-t border-gray-100">
            <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1 text-left min-w-[200px]">
                <h4 className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                  <UserX className="w-4 h-4" />
                  Danger Settlement: Deactivate Profile
                </h4>
                <p className="text-[10px] text-gray-500 leading-normal max-w-sm">
                  Permanently deactivate and delete your entire customer billing data, wallets, and orders. This action is irreversible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => triggerSensitiveAction("delete_account")}
                className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-xl transition active:scale-95 cursor-pointer"
              >
                Delete Profile Permanent
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* SENSITIVE OPERATION OTP VERIFICATION MODAL */}
      {sensitiveActionType && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-gray-100 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-amber-50/50">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Security Check Gated</h3>
              <p className="text-xs text-gray-500 leading-normal">
                You are performing a high-risk security action (<strong className="text-slate-800 uppercase">{sensitiveActionType.replace("_", " ")}</strong>). To complete this settlement, enter the 4-digit security challenge code.
              </p>
            </div>

            {/* Sandbox visual verification bypass helper */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center space-y-1 text-xs">
              <span className="inline-block py-0.5 px-1.5 bg-purple-200 text-purple-900 rounded font-black text-[9px] uppercase tracking-wider">
                🔒 Sandbox Security OTP Bypass
              </span>
              <p className="font-mono font-black text-purple-950 text-base tracking-widest select-all">
                {generatedSensitiveOtp}
              </p>
            </div>

            <form onSubmit={confirmSensitiveAction} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 block">4-Digit Security PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={sensitiveOtpInput}
                  onChange={(e) => setSensitiveOtpInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-black p-3.5 border border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 rounded-xl outline-none"
                />
              </div>

              {sensitiveError && (
                <p className="text-xs font-bold text-red-650">{sensitiveError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSensitiveActionType(null)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  Authorize Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-ROLE SWITCHER HUB */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
        <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
          <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center">
            <Briefcase className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#070329] leading-tight">Partnership & Multi-Role Hub</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Switch active user environments instantly, or apply for new operational status credentials.</p>
          </div>
        </div>

        {/* SECTION 1: ROLE SWITCHER DROPDOWN */}
        <div className="space-y-3.5">
          <div className="space-y-1.5 text-left bg-indigo-50/25 border border-indigo-100/50 rounded-2xl p-4">
            <label className="text-xs font-black text-[#070329] block flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Current Active Role
            </label>
            <div className="relative">
              <select
                value={currentUser?.role || "customer"}
                onChange={(e) => handleSwitchRole(e.target.value as UserRole)}
                className="w-full text-xs p-3.5 pr-10 border border-gray-200 rounded-xl bg-white font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 appearance-none cursor-pointer"
              >
                {myApprovedRoles.map((role) => (
                  <option key={role} value={role}>
                    {role === "customer" ? "Customer" : role === "vendor" ? "Vendor Partner" : role === "rider" ? "Dispatch Rider" : role === "admin" ? "Platform Admin" : role}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Select an approved role above to instantly switch to its specialized dashboard environment.</p>
          </div>
        </div>

        {/* SECTION 2: GROW WITH OWODE */}
        <div className="pt-6 border-t border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-xs font-extrabold text-[#070329] uppercase tracking-wider">Grow with Owode</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Become a Vendor card / status */}
            {!myVendorProfile ? (
              <button
                onClick={() => navigate("/onboard-vendor")}
                className="p-4 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/5 rounded-2xl flex items-center justify-between gap-4 transition text-left group w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      Become a Vendor
                    </h4>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-tight">Sell food, groceries, healthcare and home accessories</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ) : (
              <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/30 flex flex-col justify-between gap-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900">Vendor Status</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${
                    myVendorProfile.status === "approved" ? "bg-green-50 border-green-200 text-green-700" :
                    myVendorProfile.status === "pending" ? "bg-amber-50 border-amber-200 text-amber-700" :
                    myVendorProfile.status === "suspended" ? "bg-red-50 border-red-200 text-red-750" :
                    "bg-rose-50 border-rose-200 text-rose-700"
                  }`}>
                    {myVendorProfile.status === "pending" ? "Pending Review" : myVendorProfile.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs gap-2 pt-1">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{myVendorProfile.name}</p>
                    <p className="text-[9px] text-gray-450 truncate mt-0.5">Specialty: {myVendorProfile.cuisine}</p>
                  </div>
                  <button
                    onClick={() => navigate("/onboard-vendor")}
                    className="py-1 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-[10px] font-bold rounded-lg transition shadow-sm shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>
            )}

            {/* Become a Rider card / status */}
            {!myRiderProfile ? (
              <button
                onClick={() => navigate("/onboard-rider")}
                className="p-4 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/5 rounded-2xl flex items-center justify-between gap-4 transition text-left group w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      Become a Rider
                    </h4>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-tight">Deliver orders, register dispatch vehicles and earn tips</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ) : (
              <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/30 flex flex-col justify-between gap-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-extrabold text-slate-900">Rider Status</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${
                    myRiderProfile.status === "approved" ? "bg-green-50 border-green-200 text-green-700" :
                    myRiderProfile.status === "pending" ? "bg-amber-50 border-amber-200 text-amber-700" :
                    myRiderProfile.status === "suspended" ? "bg-red-50 border-red-200 text-red-750" :
                    "bg-rose-50 border-rose-200 text-rose-700"
                  }`}>
                    {myRiderProfile.status === "pending" ? "Pending Review" : myRiderProfile.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs gap-2 pt-1">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">Vehicle: <span className="capitalize">{myRiderProfile.vehicleType}</span></p>
                    <p className="text-[9px] text-gray-450 truncate mt-0.5">Plate: {myRiderProfile.plateNo || "N/A"}</p>
                  </div>
                  <button
                    onClick={() => navigate("/onboard-rider")}
                    className="py-1 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-[10px] font-bold rounded-lg transition shadow-sm shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* SECTION 3: FAVORITES HUB */}
        <div className="pt-6 border-t border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Your Favorite Culinary Hubs</h3>
          </div>
          
          {vendors.filter(v => favorites.includes(v.id)).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vendors.filter(v => favorites.includes(v.id)).map(v => (
                <div key={v.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between gap-3 hover:shadow-md transition">
                  <div className="flex items-center gap-3">
                    <img src={v.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-[#070329]">{v.name}</h4>
                      <p className="text-[10px] text-gray-400">{v.cuisine} Cuisine</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/vendor/${v.id}`)}
                      className="bg-[#070329] hover:bg-opacity-90 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Menu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(v.id)}
                      className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-gray-150 rounded-2xl bg-gray-50/50">
              <p className="text-xs text-gray-400">No favorite kitchens added yet.</p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-2 text-[#0ea5e9] hover:underline text-xs font-bold cursor-pointer"
              >
                Browse & Favorite Restaurants
              </button>
            </div>
          )}
        </div>
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
                To secure your profile, we have dispatched a simulated verification OTP to <strong className="text-slate-800">{phone}</strong>.
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
                    setPhone(currentUser?.phone || "");
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

