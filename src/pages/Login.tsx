import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { UserRole } from "../types";
import { Smartphone, UserPlus, LogIn } from "lucide-react";

interface SegmentedPinInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
}

const SegmentedPinInput: React.FC<SegmentedPinInputProps> = ({ value, onChange, length = 4 }) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const items = React.useMemo(() => {
    const arr = value.split("");
    while (arr.length < length) {
      arr.push("");
    }
    return arr.slice(0, length);
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const newValue = [...items];
      newValue[index] = "";
      onChange(newValue.join(""));
      return;
    }

    const singleDigit = cleaned[cleaned.length - 1];
    const newValue = [...items];
    newValue[index] = singleDigit;
    const combined = newValue.join("");
    onChange(combined);

    if (index < length - 1 && singleDigit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!items[index] && index > 0) {
        const newValue = [...items];
        newValue[index - 1] = "";
        onChange(newValue.join(""));
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (items[index]) {
        const newValue = [...items];
        newValue[index] = "";
        onChange(newValue.join(""));
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const digits = pastedText.replace(/\D/g, "").slice(0, length);
    if (digits) {
      onChange(digits);
      const focusIndex = Math.min(digits.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3 py-2">
      {items.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={char}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/10 outline-none transition duration-150 text-[#070329]"
        />
      ))}
    </div>
  );
};

export const Login: React.FC<{ isRegisterMode?: boolean }> = ({ isRegisterMode = false }) => {
  const { login, register, users } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");
  
  // PIN login flow states
  const [pinSent, setPinSent] = useState(false);
  const [verificationPin, setVerificationPin] = useState("");
  const [generatedPin, setGeneratedPin] = useState("");

  // Registration OTP flow states
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [registerGeneratedOtp, setRegisterGeneratedOtp] = useState("");
  const [registerInputOtp, setRegisterInputOtp] = useState("");
  
  // Extra fields for vendor and riders
  const [businessName, setBusinessName] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [vehicleType, setVehicleType] = useState<"bicycle" | "motorcycle" | "car">("motorcycle");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const from = (location.state as any)?.from?.pathname || "/";

  React.useEffect(() => {
    setRegisterOtpSent(false);
    setRegisterGeneratedOtp("");
    setRegisterInputOtp("");
    setPinSent(false);
    setGeneratedPin("");
    setVerificationPin("");
    setError("");
    setSuccess("");
  }, [isRegisterMode]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (pinSent) {
      setPinSent(false);
      setGeneratedPin("");
      setVerificationPin("");
      setError("");
      setSuccess("");
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (pinSent) {
      setPinSent(false);
      setGeneratedPin("");
      setVerificationPin("");
      setError("");
      setSuccess("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError(isRegisterMode ? "Please fill in your email address." : "Please fill in your phone number or email.");
      return;
    }

    if (isRegisterMode) {
      if (!firstName.trim() || !surname.trim() || !phone) {
        setError("Please define your first name, surname, and phone number.");
        return;
      }
      if (!gender) {
        setError("Please select your gender.");
        return;
      }

      const cleansedEmail = email.trim().toLowerCase();
      const exists = users.some(u => u.email.toLowerCase() === cleansedEmail);
      if (exists) {
        setError("An account with this email already exists.");
        return;
      }

      if (!registerOtpSent) {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setRegisterGeneratedOtp(otp);
        setRegisterOtpSent(true);
        setSuccess(`OTP Code Sent! A 4-digit verification code was sent to ${cleansedEmail} and phone ${phone}. OTP: ${otp}`);
      } else {
        if (registerInputOtp.trim() !== registerGeneratedOtp) {
          setError("Incorrect 4-digit verification OTP. Please try again.");
          return;
        }

        const fullName = `${firstName.trim()} ${surname.trim()}`;
        const extraPayload = selectedRole === "vendor" 
          ? { businessName, cuisine }
          : selectedRole === "rider"
          ? { vehicleType }
          : undefined;

        const res = register(fullName, email, phone, selectedRole, gender, extraPayload);
        if (res.success) {
          setSuccess("Success! OTP Verified & Account Created.");
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
      }
    } else {
      const identifier = email.trim().toLowerCase();
      
      // Step 1: Request code
      if (!pinSent) {
        const foundUser = users.find(u => 
          u.email.toLowerCase() === identifier || 
          u.phone.replace(/[\s\-\+\(\)]/g, "") === identifier.replace(/[\s\-\+\(\)]/g, "")
        );

        if (!foundUser) {
          setError("No registered account matches this email or phone number. Try selecting 'Register'.");
          return;
        }

        if (foundUser.role !== selectedRole) {
          setError(`This account is registered as a ${foundUser.role}, not a ${selectedRole}.`);
          return;
        }

        // Generate 4-digit PIN
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedPin(code);
        setPinSent(true);
        setSuccess(`Verification code sent! Your PIN: ${code}`);
      } else {
        // Step 2: Verify code
        if (verificationPin.trim() !== generatedPin) {
          setError("Incorrect 4-digit verification PIN. Please check and try again.");
          return;
        }

        const res = login(email, selectedRole);
        if (res.success) {
          setSuccess("Success! Access granted...");
          setTimeout(() => {
            const defaultRedirects: Record<UserRole, string> = {
              customer: "/",
              vendor: "/vendor/dashboard",
              rider: "/rider/dashboard",
              admin: "/admin/dashboard",
              employee: "/admin/dashboard",
            };
            navigate(defaultRedirects[selectedRole] || "/");
          }, 1000);
        } else {
          setError(res.error || "Authentication process failed.");
        }
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

      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-xl font-bold text-[#070329] tracking-tight mb-6 text-center">
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

          {/* If Register Mode is active and OTP has been sent */}
          {isRegisterMode && registerOtpSent ? (
            <div className="animate-fade-in space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                <p className="text-xs font-bold text-blue-900">Verification Required</p>
                <p className="text-[11px] text-blue-750">
                  A 4-digit verification code has been dispatched to:
                </p>
                <ul className="text-[10px] text-gray-605 list-disc list-inside">
                  <li>Email: <span className="font-semibold text-gray-850">{email}</span></li>
                  <li>Phone: <span className="font-semibold text-gray-855">{phone}</span></li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-600 leading-none">
                    Enter 4-Digit OTP Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const otp = Math.floor(1000 + Math.random() * 9000).toString();
                      setRegisterGeneratedOtp(otp);
                      setSuccess(`A new OTP has been sent! Code: ${otp}`);
                    }}
                    className="text-[10px] text-blue-600 font-extrabold hover:underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                </div>
                
                <SegmentedPinInput
                  value={registerInputOtp}
                  onChange={(val) => setRegisterInputOtp(val)}
                  length={4}
                />

                <p className="text-[10px] text-gray-400 text-center">
                  Type the 4-digit OTP code shown in the green success message above to verify your account.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterOtpSent(false);
                    setRegisterInputOtp("");
                    setRegisterGeneratedOtp("");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  ← Edit Registration Details
                </button>
              </div>
            </div>
          ) : (
            <>
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
                      onClick={() => handleRoleChange(role)}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. John"
                        className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none font-medium text-[#070329]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">Surname (Last Name)</label>
                      <input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="e.g. Doe"
                        className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none font-medium text-[#070329]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 leading-none">Gender Selection</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["male", "female"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`py-2.5 px-3 text-center font-bold text-xs capitalize rounded-xl border transition cursor-pointer ${
                            gender === g
                              ? "bg-[#0ea5e9] border-[#0ea5e9] text-white shadow-sm"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">Phone Contact</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +234 803 123 4567"
                      className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none font-medium text-[#070329]"
                      required
                    />
                  </div>
                </>
              )}

              {/* Shared Email / Phone Input Field */}
              {isRegisterMode ? (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">Email Credentials</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">
                      Phone Number or Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        disabled={pinSent}
                        placeholder="e.g. you@example.com or +234 803 123 4567"
                        className={`w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none ${
                          pinSent ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                        required
                      />
                      {pinSent && (
                        <button
                          type="button"
                          onClick={() => {
                            setPinSent(false);
                            setVerificationPin("");
                            setGeneratedPin("");
                            setError("");
                            setSuccess("");
                          }}
                          className="absolute right-3 top-3 text-xs text-blue-650 font-extrabold hover:underline"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>

                  {pinSent && (
                    <div className="animate-fade-in space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-gray-600 leading-none">
                          Enter 4-Digit PIN
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const code = Math.floor(1000 + Math.random() * 9000).toString();
                            setGeneratedPin(code);
                            setSuccess(`A new PIN code has been sent! Code: ${code}`);
                          }}
                          className="text-[10px] text-blue-600 font-extrabold hover:underline"
                        >
                          Resend PIN
                        </button>
                      </div>
                      
                      <SegmentedPinInput
                        value={verificationPin}
                        onChange={(val) => setVerificationPin(val)}
                        length={4}
                      />

                      <p className="text-[10px] text-gray-400 text-center">
                        Please type the 4-digit verification code sent to your phone or email.
                      </p>
                    </div>
                  )}
                </>
              )}

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
            </>
          )}

          {/* Login button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#070329] hover:bg-[#0d074e] text-white text-sm font-bold rounded-xl transition duration-200 shadow-lg cursor-pointer mt-4"
          >
            {isRegisterMode ? (
              registerOtpSent ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Verify OTP & Create Account
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Verification OTP & Sign Up
                </>
              )
            ) : pinSent ? (
              <>
                <LogIn className="w-4 h-4" />
                Verify PIN & Sign In
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                Send Verification PIN
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
    </div>
  );
};
