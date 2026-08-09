import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { compressImageToDataUrl } from "../imageUtils";
import { 
  Store, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ChevronLeft, 
  Upload, 
  Image, 
  FileText,
  DollarSign,
  TrendingUp,
  Award,
  Utensils,
  ShoppingBag,
  HeartPulse,
  Smartphone,
  Check
} from "lucide-react";

export const VendorOnboarding: React.FC = () => {
  const { 
    currentUser, 
    vendors, 
    applyForVendor, 
    switchRole 
  } = useDatabase();
  const navigate = useNavigate();

  // Find user's vendor profile if it exists
  const myVendorProfile = vendors.find(v => v.userId === currentUser?.id);

  // Flow State: "landing" | "form"
  const [flowState, setFlowState] = useState<"landing" | "form">("landing");

  // Form fields
  const [businessName, setBusinessName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [businessRegNo, setBusinessRegNo] = useState("");
  const [foodPermitNo, setFoodPermitNo] = useState("");
  const [verificationDoc, setVerificationDoc] = useState("/images/chicken.png");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload handler
  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageToDataUrl(file, 1600, 0.85);
        setVerificationDoc(compressed);
        setErrorMsg("");
      } catch (err) {
        console.error("[vendor doc upload] Failed to process image:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!businessName.trim() || !cuisine.trim()) {
      setErrorMsg("Please fill out both Business Name and Cuisine/Category Specialty.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!businessRegNo.trim() || !foodPermitNo.trim()) {
      setErrorMsg("Please provide both your Business Registration Number and Food Safety Permit Number.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await applyForVendor(businessName.trim(), cuisine.trim(), {
        businessRegNo: businessRegNo.trim(),
        foodPermitNo: foodPermitNo.trim(),
        verificationDoc: verificationDoc
      });
      if (res.success) {
        window.scrollTo(0, 0);
        setSuccessMsg("Your application was submitted successfully! An administrator will review your credentials shortly.");
        // Clear fields
        setBusinessName("");
        setCuisine("");
        setBusinessRegNo("");
        setFoodPermitNo("");
      } else {
        setErrorMsg(res.error || "Failed to submit vendor application.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchToVendor = () => {
    switchRole("vendor");
    navigate("/vendor/dashboard");
  };

  // If the user already has a vendor profile, bypass landing/form and show status
  if (myVendorProfile) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 font-sans">
        {/* Back button */}
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition mb-6 font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100">
            <Store className="w-8 h-8 text-[#070329]" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Vendor Partnership Application</span>
            <h1 className="text-xl font-black text-[#070329] mt-1">Application Status</h1>
          </div>

          {/* STATUS VIEWS */}
          {myVendorProfile.status === "pending" && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-900">Pending Admin Review ⏳</h3>
                  <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                    We have received your application for <strong>{myVendorProfile.name}</strong> ({myVendorProfile.cuisine}). 
                    Our verification team is currently auditing your Business Registration and Food Safety certificates. 
                    This usually takes between 12 to 24 hours.
                  </p>
                </div>
              </div>

              <div className="border-t border-amber-150/50 pt-4 text-xs text-amber-800/60 font-mono space-y-1">
                <div>• Business Name: {myVendorProfile.name}</div>
                <div>• Cuisine Specialty: {myVendorProfile.cuisine}</div>
                <div>• Registration No: {myVendorProfile.businessRegNo || "Provided"}</div>
                <div>• Food Permit No: {myVendorProfile.foodPermitNo || "Provided"}</div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/60 border border-amber-150 rounded-xl text-[11px] text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You will receive an activity notification once our operations desk updates your merchant credentials.</span>
              </div>
            </div>
          )}

          {myVendorProfile.status === "approved" && (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-emerald-900">Application Approved! 🏪🎉</h3>
                  <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
                    Congratulations! Your application for <strong>{myVendorProfile.name}</strong> has been audited and approved. 
                    You are now an active merchant partner on the Owode Food platform.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSwitchToVendor}
                className="w-full py-3 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#0ea5e9]" />
                Open Vendor Dashboard
              </button>
            </div>
          )}

          {myVendorProfile.status === "suspended" && (
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-red-950">Account Temporarily Suspended ⚠️</h3>
                  <p className="text-xs text-red-800/80 mt-1 leading-relaxed">
                    Your vendor status is currently suspended. This might be due to compliance reviews, 
                    expired permits, or logistics policy audits. Please contact Owode Partner Support to reactivate your store.
                  </p>
                </div>
              </div>
            </div>
          )}

          {myVendorProfile.status === "rejected" && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-rose-950">Application Declined ❌</h3>
                  <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
                    Unfortunately, your vendor application was not approved. Our compliance desk noted that the uploaded 
                    credentials did not match official government databases or the business permits were illegible.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/60 border border-rose-150 rounded-xl text-xs text-rose-800">
                <p className="font-bold">Recommendation:</p>
                <p className="mt-0.5 text-[11px] text-gray-500 leading-normal">
                  Please review your Registration and Food Safety details, ensure images are high-resolution, and submit a corrected request.
                </p>
              </div>

              <button
                onClick={() => {
                  // Allow to re-apply by removing old profile or resetting status
                  // In local storage, we can trigger re-apply state
                  // Let's implement this beautifully by calling applyForVendor again which filters rejected profile
                  setFlowState("form");
                  // Prefill fields
                  setBusinessName(myVendorProfile.name);
                  setCuisine(myVendorProfile.cuisine);
                  setBusinessRegNo(myVendorProfile.businessRegNo || "");
                  setFoodPermitNo(myVendorProfile.foodPermitNo || "");
                  // Move to profile and delete rejected vendor
                  localStorage.removeItem(`rejected_vendor_prefill`);
                  setSuccessMsg("");
                  setErrorMsg("");
                  // Temporarily bypass by overriding state or we can let applyForVendor handle it during submission
                }}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-purple-600" />
                Edit & Re-Submit Application
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-gray-50 flex justify-center">
            <button
              onClick={() => navigate("/profile")}
              className="text-xs text-gray-500 hover:text-gray-800 transition font-medium"
            >
              Return to User Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FLOW 1: LANDING PAGE (EXPLORING BENEFITS)
  if (flowState === "landing") {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 font-sans">
        {/* Back button */}
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition mb-6 font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Profile
        </button>

        {/* Hero Section */}
        <div className="text-center space-y-4 mb-10 max-w-2xl mx-auto">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100 shadow-sm">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none sm:text-4xl">
            Become an Owode Vendor
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Expand your merchant reach, automate kitchen orders, manage products, and grow your local business with Owode Food.
          </p>
        </div>

        {/* Grid layout for categories of items to sell */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
          <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-6 block text-center">
            What You Can Sell
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Sell Food", icon: <Utensils className="w-5 h-5 text-emerald-600" />, desc: "Meals & hot soups" },
              { label: "Sell Groceries", icon: <ShoppingBag className="w-5 h-5 text-blue-600" />, desc: "Fresh ingredients & grain bags" },
              { label: "Sell Pharmacy Products", icon: <HeartPulse className="w-5 h-5 text-rose-600" />, desc: "Wellness supplies & OTC drugs" },
              { label: "Sell Fashion", icon: <ShoppingBag className="w-5 h-5 text-amber-600" />, desc: "Native clothes & footwear" },
              { label: "Sell Electronics", icon: <Smartphone className="w-5 h-5 text-indigo-600" />, desc: "Phones, tech accessories" },
              { label: "Sell Household Items", icon: <Store className="w-5 h-5 text-purple-600" />, desc: "Kitchenware & daily essentials" },
            ].map((cat, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 space-y-2 text-left">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100/50 w-fit">
                  {cat.icon}
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800">{cat.label}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Merchant Benefits
            </h3>

            <div className="space-y-4">
              {[
                { title: "Reach thousands of customers", desc: "Gain instant visibility in active neighborhoods and zone markets without active marketing." },
                { title: "Fast payouts", desc: "Settle logistics bills easily with immediate wallet withdrawals and bank deposits." },
                { title: "Manage products easily", desc: "Take charge of your catalog with rich product listings, customizable add-ons, and prices." },
                { title: "Track orders", desc: "Watch dishes or parcels move in real-time with automated notification timelines." },
              ].map((b, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 font-bold" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{b.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#070329] text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between text-left space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] text-[#0ea5e9] tracking-wider uppercase font-mono font-bold">Ready to Launch?</span>
              <h3 className="text-xl font-black leading-tight">Partner with Owode Food today and start earning!</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Take less than 5 minutes to submit your business details, upload your credentials, 
                and receive dashboard access immediately upon validation.
              </p>
            </div>

            <button
              onClick={() => setFlowState("form")}
              className="w-full py-3.5 bg-white hover:bg-gray-50 text-[#070329] text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow transition cursor-pointer active:scale-95"
            >
              Apply Now
              <ArrowRight className="w-4 h-4 text-[#0ea5e9]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FLOW 2: APPLICATION FORM
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 font-sans">
      {/* Back button */}
      <button 
        onClick={() => setFlowState("landing")}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition mb-6 font-semibold"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Benefits
      </button>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
        <div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-3">
            <Store className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">
            Merchant Application Form
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Please fill out your verified brand and regulatory permit registration numbers.
          </p>
        </div>

        {successMsg ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div>
              <h4 className="text-sm font-extrabold text-emerald-900">Application Submitted!</h4>
              <p className="text-xs text-emerald-700/85 mt-1 leading-relaxed">
                Your credentials are now pending review with our regulatory operations desk. 
                We will verify your registration parameters and update your profile shortly.
              </p>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="w-full py-2 bg-[#070329] text-white text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-opacity-95"
            >
              Return to Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-750 border border-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Business Brand Name</label>
              <input
                type="text"
                placeholder="e.g. Sarah's Kitchen Hub"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-gray-900"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Cuisine Focus / Product Specialty</label>
              <input
                type="text"
                placeholder="e.g. Local Soups, Burgers, Fashion Accessories, Cosmetics"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-gray-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Business Reg No (Tax ID / CAC No)</label>
                <input
                  type="text"
                  placeholder="e.g. CAC-998822"
                  value={businessRegNo}
                  onChange={(e) => setBusinessRegNo(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-mono text-gray-900 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Food Safety Permit / Trade License No</label>
                <input
                  type="text"
                  placeholder="e.g. FSP-443311"
                  value={foodPermitNo}
                  onChange={(e) => setFoodPermitNo(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-mono text-gray-900 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50/50">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700">Verification Document Proof</label>
                <span className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition relative cursor-pointer flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDocChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </span>
              </div>
              
              {verificationDoc ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white group h-24 shadow-sm">
                  <img src={verificationDoc} alt="Vendor ID Doc" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold text-white">
                    Replace file
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-gray-400 font-medium">No certificate selected.</div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-black rounded-xl transition cursor-pointer uppercase tracking-wider shadow-md disabled:bg-gray-400"
            >
              {isSubmitting ? "Syncing credentials with platform database..." : "Submit Store Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
