import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { UserRole } from "../types";
import { Star, Shield, Smartphone, ArrowRight, UserPlus, LogIn } from "lucide-react";

export const Login: React.FC<{ isRegisterMode?: boolean }> = ({ isRegisterMode = false }) => {
  const { login, register, users } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");
  
  // Extra fields for vendor and riders
  const [businessName, setBusinessName] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [vehicleType, setVehicleType] = useState<"bicycle" | "motorcycle" | "car">("motorcycle");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const from = (location.state as any)?.from?.pathname || "/";

  // Quick sandbox accounts available
  const sampleAccounts = [
    { name: "Sarah Collins", email: "customer@gmail.com", role: "customer" as UserRole, desc: "Browse and order foods" },
    { name: "Bella Italia Owner", email: "vendor@gmail.com", role: "vendor" as UserRole, desc: "Approve orders & cook" },
    { name: "Alex Mercer", email: "rider@gmail.com", role: "rider" as UserRole, desc: "Accept & deliver orders" },
    { name: "Platform Admin", email: "admin@gmail.com", role: "admin" as UserRole, desc: "Audit platform & approve users" },
    { name: "Platform Staff Agent", email: "employee@gmail.com", role: "employee" as UserRole, desc: "Employee Management & dispatch support" },
  ];

  const handleQuickLogin = (emailStr: string, roleVal: UserRole) => {
    setError("");
    const res = login(emailStr, roleVal);
    if (res.success) {
      const defaultRedirects: Record<UserRole, string> = {
        customer: "/",
        vendor: "/vendor/dashboard",
        rider: "/rider/dashboard",
        admin: "/admin/dashboard",
        employee: "/admin/dashboard",
      };
      navigate(defaultRedirects[roleVal] || "/");
    } else {
      setError(res.error || "Authentication error.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please fill in your email address.");
      return;
    }

    if (isRegisterMode) {
      if (!name || !phone) {
        setError("Please define your name and phone number.");
        return;
      }
      
      const extraPayload = selectedRole === "vendor" 
        ? { businessName, cuisine }
        : selectedRole === "rider"
        ? { vehicleType }
        : undefined;

      const res = register(name, email, phone, selectedRole, extraPayload);
      if (res.success) {
        setSuccess("Success! Your profile was registered.");
        setTimeout(() => {
          const defaultRedirects: Record<UserRole, string> = {
            customer: "/",
            vendor: "/vendor/dashboard",
            rider: "/rider/dashboard",
            admin: "/admin/dashboard",
            employee: "/admin/dashboard",
          };
          navigate(defaultRedirects[selectedRole] || "/");
        }, 1200);
      } else {
        setError(res.error || "Failed to create account.");
      }
    } else {
      const res = login(email, selectedRole);
      if (res.success) {
        const defaultRedirects: Record<UserRole, string> = {
          customer: "/",
          vendor: "/vendor/dashboard",
          rider: "/rider/dashboard",
          admin: "/admin/dashboard",
          employee: "/admin/dashboard",
        };
        navigate(defaultRedirects[selectedRole] || "/");
      } else {
        setError(res.error || "Authenticating failed.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#070329]/15">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-10 h-10 rounded-2xl bg-[#070329] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/10">
            N
          </span>
          <span className="font-bold text-2xl text-[#070329]">
            Navy<span className="text-blue-600">Bites</span>
          </span>
        </div>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Multi-Vendor Food Delivery MVP Marketplace Pilot Platform
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Portal Credentials Login Form */}
        <div className="lg:col-span-7 bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="text-xl font-bold text-[#070329] tracking-tight mb-6">
            {isRegisterMode ? "Create Your NavyBites Account" : "Sign In to NavyBites"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Form Validation Indicator banner */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
                {success}
              </div>
            )}

            {/* Select Profile Role */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Choose Access Role
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["customer", "vendor", "rider", "admin"] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`py-2 px-1 text-center font-bold text-xs capitalize rounded-xl border transition cursor-pointer ${
                      selectedRole === role
                        ? "bg-[#070329] border-[#070329] text-white shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* If Register Mode, get Name & Phone numbers */}
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">Full Legal Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your first and last name"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">Phone Contact</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +234 803 123 4567"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none"
                    required
                  />
                </div>
              </>
            )}

            {/* Shared Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">Email Credentials</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none"
                required
              />
            </div>

            {/* Additional parameters if Vendor / Rider signup */}
            {isRegisterMode && selectedRole === "vendor" && (
              <div className="space-y-3 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                <p className="text-[11px] text-blue-800 font-bold uppercase leading-none">Restaurant Details</p>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Company / E-store Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Golden Wok Gourmet"
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Food Category/Cuisine Type</label>
                  <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                  >
                    <option value="Italian">Italian Cuisine</option>
                    <option value="Burgers">American Burgers</option>
                    <option value="Sushi">Traditional Sushi</option>
                    <option value="Asian">Wok & Noodles</option>
                    <option value="Desserts">Plated Desserts & Cakes</option>
                    <option value="Salads">Helthy Salads</option>
                  </select>
                </div>
              </div>
            )}

            {isRegisterMode && selectedRole === "rider" && (
              <div className="space-y-3 p-3 bg-amber-50/40 rounded-xl border border-amber-100">
                <p className="text-[11px] text-amber-800 font-bold uppercase leading-none">Courier Logistics</p>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Vehicle Dispatch Class</label>
                  <select
                    value={vehicleType}
                    onChange={(e: any) => setVehicleType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                  >
                    <option value="motorcycle">Motorcycle / Scooter</option>
                    <option value="bicycle">Bicycle (Eco Friendly)</option>
                    <option value="car">Car (Heavy Cargo)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#070329] hover:bg-[#0d074e] text-white text-sm font-bold rounded-xl transition duration-200 shadow-lg cursor-pointer mt-4"
            >
              {isRegisterMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Sign Up & Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Account
                </>
              )}
            </button>
          </form>

          {/* Toggle Register state links */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            {isRegisterMode ? (
              <p className="text-xs text-gray-500">
                Already registered?{" "}
                <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                  Sign In to Account
                </Link>
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                New to NavyBites?{" "}
                <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                  Create an Account
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Demo Review Sandbox Accelerator Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-[#070329] to-[#0c0550] text-white p-6 rounded-2xl shadow-xl border border-blue-950">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <h3 className="font-bold text-base">MVP Showcase Sandbox</h3>
            </div>
            
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              To expedite testing, we have pre-configured four standard users with realistic database records. Click any profile card to authenticate instantly into that separate area role:
            </p>

            <div className="space-y-2.5">
              {sampleAccounts.map((account) => {
                const colors: Record<UserRole, string> = {
                  customer: "border-blue-500 hover:bg-blue-600/10",
                  vendor: "border-green-500 hover:bg-green-600/10",
                  rider: "border-amber-500 hover:bg-amber-600/10",
                  admin: "border-purple-500 hover:bg-purple-600/10",
                  employee: "border-teal-500 hover:bg-teal-600/10",
                };
                
                return (
                  <button
                    key={account.email}
                    onClick={() => handleQuickLogin(account.email, account.role)}
                    className={`w-full flex items-center justify-between p-3.5 bg-[#0b0643]/60 border rounded-xl cursor-pointer text-left transition ${colors[account.role]}`}
                  >
                    <div>
                      <span className="text-xs font-black block leading-tight">{account.name}</span>
                      <span className="text-[10px] text-gray-400 leading-none">{account.email}</span>
                      <p className="text-[10px] text-gray-300 mt-1 italic">{account.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-gray-900 block mb-1">State Synchronized Gate</span>
              <p className="text-gray-500 leading-relaxed">
                All roles modify the exact same local state context in realtime. A courier can log in, accept an order placed by a customer, and the administrator will monitor delivery timelines instantly.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
