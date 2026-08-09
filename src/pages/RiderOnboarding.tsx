import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { compressImageToDataUrl } from "../imageUtils";
import { 
  Bike, 
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
  Briefcase,
  Smartphone,
  Navigation,
  Calendar,
  Check,
  User
} from "lucide-react";

export const RiderOnboarding: React.FC = () => {
  const { 
    currentUser, 
    riders, 
    applyForRider, 
    switchRole 
  } = useDatabase();
  const navigate = useNavigate();

  // Find user's rider profile if it exists
  const myRiderProfile = riders.find(r => r.userId === currentUser?.id);

  // Flow State: "landing" | "form"
  const [flowState, setFlowState] = useState<"landing" | "form">("landing");

  // Form fields
  const [vehicleType, setVehicleType] = useState<"bicycle" | "motorcycle" | "car">("motorcycle");
  const [licenseNo, setLicenseNo] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [nationalIdNo, setNationalIdNo] = useState("");
  const [verificationDoc, setVerificationDoc] = useState("/images/jollof.jpg");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload handler
  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Higher quality/dimension than the default -- this is an ID
        // document, it needs to stay legible, not just small.
        const compressed = await compressImageToDataUrl(file, 1600, 0.85);
        setVerificationDoc(compressed);
        setErrorMsg("");
      } catch (err) {
        console.error("[rider doc upload] Failed to process image:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!licenseNo.trim() || !plateNo.trim() || !nationalIdNo.trim()) {
      setErrorMsg("All driver registration fields (License No, Plate No, National ID No) are required.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await applyForRider(vehicleType, {
        licenseNo: licenseNo.trim(),
        plateNo: plateNo.trim(),
        nationalIdNo: nationalIdNo.trim(),
        verificationDoc: verificationDoc
      });
      if (res.success) {
        window.scrollTo(0, 0);
        setSuccessMsg("Your dispatch rider registration was submitted successfully! An administrator will verify your credentials.");
        // Clear fields
        setLicenseNo("");
        setPlateNo("");
        setNationalIdNo("");
      } else {
        setErrorMsg(res.error || "Failed to submit rider application.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchToRider = () => {
    switchRole("rider");
    navigate("/rider/dashboard");
  };

  // If the user already has a rider profile, bypass landing/form and show status
  if (myRiderProfile) {
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
            <Bike className="w-8 h-8 text-[#070329]" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Dispatch Rider Application</span>
            <h1 className="text-xl font-black text-[#070329] mt-1">Application Status</h1>
          </div>

          {/* STATUS VIEWS */}
          {myRiderProfile.status === "pending" && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-900">Credentials Audit Pending ⏳</h3>
                  <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                    We are currently verification-checking your vehicle credentials. Our operations team is validating 
                    your <strong>Driver's License</strong> and <strong>National Identification Number (NIN)</strong>. 
                    Verification takes between 12 to 24 hours.
                  </p>
                </div>
              </div>

              <div className="border-t border-amber-150/50 pt-4 text-xs text-amber-800/60 font-mono space-y-1">
                <div>• Vehicle Class: <span className="capitalize">{myRiderProfile.vehicleType}</span></div>
                <div>• Driver License No: {myRiderProfile.licenseNo || "Provided"}</div>
                <div>• Vehicle License Plate: {myRiderProfile.plateNo || "Provided"}</div>
                <div>• National ID (NIN): {myRiderProfile.nationalIdNo || "Provided"}</div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/60 border border-amber-150 rounded-xl text-[11px] text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You will receive an in-app system notification once your credentials are verified.</span>
              </div>
            </div>
          )}

          {myRiderProfile.status === "approved" && (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-emerald-900">Courier Account Verified! 🚴🎉</h3>
                  <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
                    Congratulations! Your dispatcher application has been approved and verified. 
                    You can now set your status as Active and begin accepting delivery gig requests.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSwitchToRider}
                className="w-full py-3 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#0ea5e9]" />
                Open Rider Dashboard
              </button>
            </div>
          )}

          {myRiderProfile.status === "suspended" && (
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 text-red-650 rounded-xl mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-red-950">Driver Account Suspended ⚠️</h3>
                  <p className="text-xs text-red-800/80 mt-1 leading-relaxed">
                    Your logistics dispatch account is currently suspended. This might be due to compliance reviews, 
                    expired licenses, or safety policy audits. Please reach out to the Logistics Desk for assistance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {myRiderProfile.status === "rejected" && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-rose-950">Application Declined ❌</h3>
                  <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
                    Your rider application was declined. Our verification team could not validate the uploaded 
                    identity credentials or drivers licenses.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/60 border border-rose-150 rounded-xl text-xs text-rose-800">
                <p className="font-bold">Recommendation:</p>
                <p className="mt-0.5 text-[11px] text-gray-500 leading-normal">
                  Please review your NIN number and driver's license parameters, upload readable, glare-free ID images, and re-submit.
                </p>
              </div>

              <button
                onClick={() => {
                  setFlowState("form");
                  setLicenseNo(myRiderProfile.licenseNo || "");
                  setPlateNo(myRiderProfile.plateNo || "");
                  setNationalIdNo(myRiderProfile.nationalIdNo || "");
                  setSuccessMsg("");
                  setErrorMsg("");
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

  // FLOW 1: LANDING PAGE (EXPLORING BENEFITS & REQUIREMENTS)
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
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mx-auto border border-purple-100 shadow-sm">
            <Bike className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none sm:text-4xl">
            Become an Owode Rider
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Join our verified delivery network, deliver hot meals, groceries, and parcels across logistics zones, and build a steady source of income.
          </p>
        </div>

        {/* Requirements and Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* Benefits card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Rider Benefits
            </h3>

            <div className="space-y-4">
              {[
                { title: "Flexible working hours", desc: "Choose when to deliver. Toggle your availability state active or offline in 1 tap." },
                { title: "Fast & secure payouts", desc: "Earn consistent fees per delivery and withdraw immediately to your linked Naira banks." },
                { title: "High delivery demand", desc: "Gain massive gig volumes in high-density areas including university districts and city zones." },
                { title: "Keep 100% of tips", desc: "All client gratuities and tips are fully yours. We never charge commission on tips." },
              ].map((b, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{b.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              Requirements
            </h3>

            <div className="space-y-4">
              {[
                { title: "Dispatch Vehicle", desc: "Access to a reliable vehicle: bicycle, motorcycle, or car for logistics operations." },
                { title: "Valid Drivers License", desc: "Must have an up-to-date driver's license (not required if operating a bicycle)." },
                { title: "National ID (NIN)", desc: "A verified National Identification Number card for regulatory background clearance." },
                { title: "Smartphone with GPS", desc: "An Android or iOS smartphone with an active internet plan and location services enabled." },
              ].map((r, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{r.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* CTA Banner */}
        <div className="bg-[#070329] text-white rounded-3xl p-6 sm:p-8 shadow-sm text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[10px] text-[#0ea5e9] uppercase font-mono font-bold tracking-widest">Earn on your schedule</span>
            <h3 className="text-xl font-black">Ready to ride with Owode Food?</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Verify your vehicle parameters, input your identification records, and let our compliance desk verify your delivery license quickly.
            </p>
          </div>

          <button
            onClick={() => setFlowState("form")}
            className="w-full md:w-auto py-3.5 px-8 bg-white hover:bg-gray-50 text-[#070329] text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow transition shrink-0 cursor-pointer active:scale-95"
          >
            Apply Now
            <ArrowRight className="w-4 h-4 text-[#0ea5e9]" />
          </button>
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
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-3">
            <Bike className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">
            Rider Registration Form
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Input your vehicle classification details and National Identity Number.
          </p>
        </div>

        {successMsg ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div>
              <h4 className="text-sm font-extrabold text-emerald-900">Registration Submitted!</h4>
              <p className="text-xs text-emerald-700/85 mt-1 leading-relaxed">
                Your dispatch logistics parameters have been logged. Our compliance operations desk is checking 
                your verification ID. You will be cleared to receive shipments shortly.
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Select Dispatch Vehicle Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(["bicycle", "motorcycle", "car"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVehicleType(v)}
                    className={`py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition text-center cursor-pointer ${
                      vehicleType === v 
                        ? "bg-[#070329] border-[#070329] text-white font-black shadow-md ring-4 ring-indigo-100"
                        : "bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Driver's License Number</label>
              <input
                type="text"
                placeholder={vehicleType === "bicycle" ? "Not required for bicycles (e.g. N/A)" : "e.g. DL-987654321"}
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-mono text-gray-900 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Vehicle License Plate</label>
                <input
                  type="text"
                  placeholder={vehicleType === "bicycle" ? "Not required for bicycles (e.g. N/A)" : "e.g. KWR-221-AB"}
                  value={plateNo}
                  onChange={(e) => setPlateNo(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-mono text-gray-900 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">National ID Card Number (NIN)</label>
                <input
                  type="text"
                  placeholder="e.g. NIN-1200998822"
                  value={nationalIdNo}
                  onChange={(e) => setNationalIdNo(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-mono text-gray-900 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50/50">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700">National ID / License Proof Document</label>
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
                  <img src={verificationDoc} alt="Rider ID Doc" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold text-white">
                    Replace file
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-gray-400 font-medium">No document selected.</div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-black rounded-xl transition cursor-pointer uppercase tracking-wider shadow-md disabled:bg-gray-400"
            >
              {isSubmitting ? "Uploading parameters to logistics hub..." : "Submit Courier Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
