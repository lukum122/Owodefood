import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { OrderStatus } from "../types";
import { ClipboardList, User, Phone, MapPin, CheckCircle2, ChevronRight, Clock, Star, Edit3, Save, Compass, LogOut } from "lucide-react";

export const CustomerOrders: React.FC = () => {
  const { orders, currentUser, currency } = useDatabase();

  // Filter orders where customer matches current logged user
  const customerOrders = orders.filter(o => o.customerId === currentUser?.id);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
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
                    <span className="font-extrabold text-sm text-[#070329] font-mono">{currency}{order.totalAmount.toLocaleString()}</span>
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
                ) : (
                  <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold">
                    This order was cancelled.
                  </div>
                )}

                {/* Bottom Receipt & Logistics assigned driver */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs">
                    <p className="font-bold text-gray-900 uppercase tracking-wide">Basket Contents</p>
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item, id) => (
                        <div key={id} className="py-2 flex justify-between">
                          <span className="text-gray-600">{item.name} <b className="text-gray-900">x{item.quantity}</b></span>
                          <span className="font-bold text-gray-800 font-mono">{currency}{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      {order.serviceFee !== undefined && (
                        <div className="py-2 flex justify-between text-[11px] font-medium border-t border-dashed border-gray-200 mt-1 pt-2">
                          <span className="text-gray-500">Service Fee</span>
                          <span className="font-extrabold text-gray-700 font-mono">{currency}{order.serviceFee.toLocaleString()}</span>
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
    </div>
  );
};

export const CustomerProfile: React.FC = () => {
  const { currentUser, updateProfile, logout } = useDatabase();
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [gender, setGender] = useState(currentUser?.gender || "");
  
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!name || !phone) {
      setErrorText("Please enter both your name and phone number.");
      return;
    }

    try {
      updateProfile(name, phone, gender);
      setSuccessText("Your member profile details were synced successfully!");
      setIsEditing(false);
      setTimeout(() => {
        setSuccessText("");
      }, 3000);
    } catch (err: any) {
      setErrorText("Could not update profile details.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">Your Client Profile</h1>
        <p className="text-xs text-gray-500 mt-0.5">Edit billing info, delivery destination names, and contact parameters.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {successText && (
          <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold">
            {successText}
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#070329] text-white flex items-center justify-center font-bold text-xl uppercase">
            {currentUser?.name.substring(0, 2) || "U"}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">{currentUser?.name}</h3>
            <span className="text-xs text-gray-400 block mt-0.5">{currentUser?.email}</span>
            <span className="inline-block mt-2 py-0.5 px-2 bg-blue-50 text-blue-700 text-[10px] uppercase font-bold rounded">
              Verified {currentUser?.role} Status
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">Email Credentials (Immutable)</label>
            <input
              type="text"
              value={currentUser?.email || ""}
              disabled
              className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">Deliveries Recipient Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              className={`w-full text-xs p-3.5 border rounded-xl outline-none transition ${
                isEditing 
                  ? "bg-white border-blue-400 focus:ring-4 focus:ring-blue-100" 
                  : "bg-gray-50/50 border-gray-200 cursor-not-allowed"
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">Telephone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
              className={`w-full text-xs p-3.5 border rounded-xl outline-none transition ${
                isEditing 
                  ? "bg-white border-blue-400 focus:ring-4 focus:ring-blue-100" 
                  : "bg-gray-50/50 border-gray-200 cursor-not-allowed"
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setGender(g)}
                  className={`py-2.5 px-3 text-center font-bold text-xs capitalize rounded-xl border transition ${
                    gender === g
                      ? "bg-[#0ea5e9] border-[#0ea5e9] text-white shadow-sm"
                      : "bg-gray-50/50 border-gray-200 text-gray-500"
                  } ${!isEditing ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"}`}
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
                    setGender(currentUser?.gender || "");
                    setIsEditing(false);
                  }}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer font-sans"
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
              <>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Account
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="py-2.5 px-4 bg-[#070329] hover:bg-[#120a61] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Edit3 className="w-4 h-4 text-[#0ea5e9]" />
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
