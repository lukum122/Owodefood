import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { UserRole } from "../types";
import { Smartphone, UserPlus, LogIn, ShieldAlert, MapPin, Activity, CheckCircle, Shield } from "lucide-react";

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
  const { login, finalizeLogin, checkUser, register, users, resetUserPin } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");
  
  // Registration and Login multi-step flow
  // registerStep: 1 (details), 2 (create login PIN), 3 (verify OTP/verification code sent to email/phone)
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [createdPin, setCreatedPin] = useState("");
  const [registerOtp, setRegisterOtp] = useState("");
  const [generatedRegisterOtp, setGeneratedRegisterOtp] = useState("");

  const [loginPinStep, setLoginPinStep] = useState(false);
  const [loginPin, setLoginPin] = useState("");
  const [deviceVerificationStep, setDeviceVerificationStep] = useState(false);
  const [deviceOtp, setDeviceOtp] = useState("");
  const [generatedDeviceOtp, setGeneratedDeviceOtp] = useState("");
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);
  
  // Forgot PIN state
  const [forgotPinStep, setForgotPinStep] = useState<"request" | "verify" | "new_pin" | null>(null);
  const [forgotEmailOrPhone, setForgotEmailOrPhone] = useState("");
  const [generatedResetCode, setGeneratedResetCode] = useState("");
  const [resetCodeInput, setResetCodeInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showForgotPinLink, setShowForgotPinLink] = useState(false);
  const [foundUserForReset, setFoundUserForReset] = useState<any>(null);
  
  // Extra fields for vendor and riders
  const [businessName, setBusinessName] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [vehicleType, setVehicleType] = useState<"bicycle" | "motorcycle" | "car">("motorcycle");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/";

  React.useEffect(() => {
    if (isRegisterMode) {
      setLoginPinStep(false);
      setDeviceVerificationStep(false);
      setLoginPin("");
      setDeviceOtp("");
      setGeneratedDeviceOtp("");
      setForgotPinStep(null);
    }
    setRegisterStep(1);
    setCreatedPin("");
    setRegisterOtp("");
    setGeneratedRegisterOtp("");
    setForgotEmailOrPhone("");
    setGeneratedResetCode("");
    setResetCodeInput("");
    setNewPin("");
    setConfirmNewPin("");
    setShowForgotPinLink(false);
    setFoundUserForReset(null);
    setError("");
    setSuccess("");
  }, [isRegisterMode]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (loginPinStep) {
      setLoginPinStep(false);
      setLoginPin("");
      setError("");
      setSuccess("");
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (loginPinStep) {
      setLoginPinStep(false);
      setLoginPin("");
      setError("");
      setSuccess("");
    }
  };

  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (forgotPinStep === "request") {
      const identifier = forgotEmailOrPhone.trim().toLowerCase();
      if (!identifier) {
        setError("Please enter your registered email or phone number.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const checkRes = await checkUser(identifier);
      if (!checkRes.exists || !checkRes.user) {
        setError("No account found with this email or phone number.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      const foundUser = checkRes.user;

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedResetCode(code);
      setFoundUserForReset(foundUser);
      setForgotPinStep("verify");
      setSuccess("Sending 4-digit verification code to your email and phone...");

      try {
        const response = await fetch("/api/email/send-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: foundUser.email,
            name: foundUser.name,
            pin: code
          })
        });
        const resJson = await response.json();
        if (resJson.success) {
          setSuccess(`A 4-digit verification code has been sent to your email (${foundUser.email}) and phone!`);
        } else {
          setError(`Failed to send PIN: ${resJson.error || "SMTP error"}. Please check your connection or contact support.`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err: any) {
        setError("Network error connecting to the server. Please try again later.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (forgotPinStep === "verify") {
      if (resetCodeInput.length < 4) {
        setError("Please enter the complete 4-digit verification code.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (resetCodeInput !== generatedResetCode) {
        setError("Incorrect verification code. Please check and try again.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setForgotPinStep("new_pin");
      setSuccess("Verification successful! Please define your new 4-digit security PIN.");
    } else if (forgotPinStep === "new_pin") {
      if (newPin.length < 4) {
        setError("Please enter a complete 4-digit security PIN.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (confirmNewPin.length < 4) {
        setError("Please confirm your new 4-digit security PIN.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (newPin !== confirmNewPin) {
        setError("PIN mismatch! Both entered PIN codes must be identical.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (!foundUserForReset) {
        setError("Session expired. Please try again.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        setForgotPinStep("request");
        return;
      }

      const result = await resetUserPin(foundUserForReset.id, newPin);
      if (!result?.success) {
        setError(result?.error || "Failed to reset your PIN. Please check your connection and try again.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSuccess("Your security PIN has been successfully reset! Redirecting to login...");
      
      setTimeout(async () => {
        setEmail(foundUserForReset.email);

        setLoginPin("");
        setForgotPinStep(null);
        setLoginPinStep(true);
        setShowForgotPinLink(false);
        setSuccess("Success! Access granted...");
        await login(foundUserForReset.email, newPin, selectedRole);
        const defaultRedirects: Record<UserRole, string> = {
          customer: "/",
          vendor: "/vendor/dashboard",
          rider: "/rider/dashboard",
          admin: "/admin/dashboard",
          employee: "/admin/dashboard",
          super_admin: "/admin/dashboard",
        };
        navigate(defaultRedirects[selectedRole] || "/");
      }, 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPinStep) {
      await handleForgotPinSubmit(e);
      return;
    }
    setError("");
    setSuccess("");

    if (isRegisterMode) {
      if (registerStep === 1) {
        // Step 1: Validate registration info
        if (!email.trim()) {
          setError("Please fill in your email address.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Check temporary email blacklist
        const burnerDomains = ["mailinator.com", "yopmail.com", "tempmail.com", "10minutemail.com", "guerrillamail.com", "throwawaymail.com", "temp-mail.org", "fakeinbox.com"];
        const emailDomain = email.trim().split("@")[1]?.toLowerCase();
        if (emailDomain && burnerDomains.includes(emailDomain)) {
          setError("Temporary or burner email addresses are not allowed for registration.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (!firstName.trim() || !surname.trim() || !phone.trim()) {
          setError("Please define your first name, surname, and phone number.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (!gender) {
          setError("Please select your gender.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const cleansedEmail = email.trim().toLowerCase();
        const exists = users.some(u => u.email.toLowerCase() === cleansedEmail);
        if (exists) {
          setError("An account with this email already exists.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Proceed to PIN Creation Page/Step!
        setRegisterStep(2);
        setSuccess("");
      } else if (registerStep === 2) {
        // Step 2: Create 4-Digit Security PIN and send verification OTP
        if (createdPin.length < 4) {
          setError("Please enter a complete 4-digit PIN.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Generate verification OTP code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedRegisterOtp(code);
        setRegisterStep(3);
        setSuccess("Sending 4-digit verification PIN to your email address...");

        try {
          const response = await fetch("/api/email/send-pin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              toEmail: email.trim().toLowerCase(),
              name: `${firstName.trim()} ${surname.trim()}`,
              pin: code,
            }),
          });
          const resJson = await response.json();
          if (resJson.success) {
            setSuccess(`Verification PIN successfully sent to ${email.trim().toLowerCase()}! Please check your inbox.`);
          } else {
            setError(`Failed to send PIN: ${resJson.error || "SMTP error"}. Please try again later.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch (err: any) {
          setError("Network error connecting to the server. Please try again later.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // Step 3: Verify OTP code and actually create account
        if (registerOtp.length < 4) {
          setError("Please enter the complete 4-digit verification PIN.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (registerOtp !== generatedRegisterOtp) {
          setError("Incorrect 4-digit verification PIN. Please check and try again.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const cleansedEmail = email.trim().toLowerCase();
        const fullName = `${firstName.trim()} ${surname.trim()}`;
        const extraPayload = {
          businessName: selectedRole === "vendor" ? businessName : undefined,
          cuisine: selectedRole === "vendor" ? cuisine : undefined,
          vehicleType: selectedRole === "rider" ? vehicleType : undefined,
          pin: createdPin,
        };

        const res = await register(fullName, cleansedEmail, phone, selectedRole, gender, extraPayload);
        if (res.success) {
          setSuccess("Success! Your account is created & verified. Redirecting...");
          // Mark this initial device as trusted automatically!
          const registeredUser = users.find(u => u.email.toLowerCase() === cleansedEmail);
          if (registeredUser) {
            localStorage.setItem(`trusted_device_${registeredUser.id}`, "true");
          }
        } else {
          setError(res.error || "Failed to create account.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else {
      const identifier = email.trim().toLowerCase();

      if (!loginPinStep) {
        // Step 1: Enter email/phone
        if (!identifier) {
          setError("Please fill in your phone number or email.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const checkRes = await checkUser(identifier);

        if (!checkRes.exists || !checkRes.user) {
          setError("No registered account matches this email or phone number. Try selecting 'Register'.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const foundUser = checkRes.user;
        const autoRole = foundUser.role || (foundUser.roles && foundUser.roles[0]) || "customer";
        setSelectedRole(autoRole);

        // Proceed to login PIN entry step
        setLoginPinStep(true);
        setError("");
        setSuccess("");
      } else if (!deviceVerificationStep) {
        // Step 2: Verify login PIN
        if (loginPin.length < 4) {
          setError("Please enter a complete 4-digit PIN.");

          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const res = await login(identifier, loginPin, selectedRole, true);
        if (!res.success) {
          setError(res.error || "Incorrect 4-digit security PIN. Please try again.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setShowForgotPinLink(true);
          return;
        }

        const foundUser = res.user;

        // Check Device Trust & Inactivity
        const isTrusted = localStorage.getItem(`trusted_device_${foundUser.id}`) === "true";
        const lastLoginStr = localStorage.getItem(`last_login_${foundUser.id}`);
        const lastLoginTime = lastLoginStr ? parseInt(lastLoginStr, 10) : 0;
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const hasBeenLongTime = (Date.now() - lastLoginTime) > THIRTY_DAYS_MS;

        if (!isTrusted || hasBeenLongTime) {
          // Trigger Device Verification
          setPendingLoginData(res);
          const otp = Math.floor(1000 + Math.random() * 9000).toString();
          setGeneratedDeviceOtp(otp);
          setDeviceVerificationStep(true);
          setDeviceOtp("");
          setError("");
          setSuccess("Sending verification code to your email...");
          
          fetch("/api/email/send-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: foundUser.email,
              name: foundUser.name,
              pin: otp,
            }),
          }).then(r => r.json()).then(resJson => {
            if (resJson.success) {
              setSuccess(`A verification code has been sent to ${foundUser.email} for this new device.`);
            } else {
              setError(`Failed to send code: ${resJson.error || "SMTP error"}. Please try again later.`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }).catch(() => {
            setError("Network error connecting to the server. Please try again later.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          return;
        }

        // Device is trusted and active, finalize login
        localStorage.setItem(`last_login_${foundUser.id}`, Date.now().toString());
        finalizeLogin(res.user, res.token, selectedRole);
        setSuccess("Success! Access granted...");
      } else {
        // Step 3: Verify Device OTP
        if (deviceOtp.length < 4) {
          setError("Please enter the complete 4-digit verification code.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (deviceOtp !== generatedDeviceOtp) {
          setError("Incorrect verification code. Please check and try again.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (!pendingLoginData) {
          setError("Session expired. Please start over.");
          setLoginPinStep(false);
          setDeviceVerificationStep(false);
          return;
        }

        const foundUser = pendingLoginData.user;
        localStorage.setItem(`trusted_device_${foundUser.id}`, "true");
        localStorage.setItem(`last_login_${foundUser.id}`, Date.now().toString());

        finalizeLogin(pendingLoginData.user, pendingLoginData.token, selectedRole);
        setSuccess("Success! Access granted...");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#070329]/15">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-3 mb-2 group cursor-pointer justify-center">
          <span className="w-10 h-10 rounded-2xl bg-[#070329] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-200">
            O
          </span>
          <div className="text-left">
            <span className="font-bold text-xl tracking-wider text-[#070329] block uppercase">
              Owode Food
            </span>
            <span className="text-[9px] text-blue-600 tracking-wider block font-bold uppercase font-mono">
              Marketplace
            </span>
          </div>
        </Link>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Multi-Vendor Food Delivery MVP Marketplace Pilot Platform
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-xl font-bold text-[#070329] tracking-tight mb-6 text-center">
          {forgotPinStep
            ? (forgotPinStep === "request" ? "Reset Security PIN" : forgotPinStep === "verify" ? "Verify Reset Code" : "Create New PIN")
            : isRegisterMode 
            ? (registerStep === 3 ? "Verify Your Account" : registerStep === 2 ? "Create Security PIN" : "Create Your Owode Food Account") 
            : (loginPinStep ? "Enter Your PIN" : "Sign In to Owode Food")}
        </h2>

        <form onSubmit={async (e) => { e.preventDefault(); if (isLoading) return; setIsLoading(true); await handleSubmit(e); setIsLoading(false); }} className="space-y-4">
          
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

          {/* FORGOT PIN FLOW */}
          {forgotPinStep ? (
            forgotPinStep === "request" ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">
                    Enter Your Account Phone or Email
                  </label>
                  <input
                    type="text"
                    value={forgotEmailOrPhone}
                    onChange={(e) => setForgotEmailOrPhone(e.target.value)}
                    placeholder="e.g. you@example.com or +234 803 123 4567"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none"
                    required
                  />
                </div>
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setForgotPinStep(null)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            ) : forgotPinStep === "verify" ? (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    Please enter the 4-digit verification code sent to your email and phone (<span className="font-semibold text-gray-700">{foundUserForReset?.email}</span>).
                  </p>
                </div>

                <SegmentedPinInput
                  value={resetCodeInput}
                  onChange={(val) => setResetCodeInput(val)}
                  length={4}
                />

                <div className="flex justify-between items-center px-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setForgotPinStep("request")}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ← Back to request code
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    Set a brand new 4-digit security PIN for your account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none text-center">
                    Enter New PIN
                  </label>
                  <SegmentedPinInput
                    value={newPin}
                    onChange={(val) => setNewPin(val)}
                    length={4}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none text-center">
                    Confirm New PIN
                  </label>
                  <SegmentedPinInput
                    value={confirmNewPin}
                    onChange={(val) => setConfirmNewPin(val)}
                    length={4}
                  />
                </div>

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPinStep("verify");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ← Back to verification
                  </button>
                </div>
              </div>
            )
          ) : isRegisterMode ? (
            registerStep === 1 ? (
              // Registration Details (Step 1)
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
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 14) setPhone(val);
                    }}
                    placeholder="e.g. 2348031234567"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none font-medium text-[#070329]"
                    required
                  />
                </div>

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

                {/* Additional parameters if Vendor signup */}
                {selectedRole === "vendor" && (
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
                        <option value="Salads">Healthy Salads</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Additional parameters if Rider signup */}
                {selectedRole === "rider" && (
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
            ) : registerStep === 2 ? (
              // Create PIN Step (Step 2)
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    Please define a highly secure 4-digit login PIN. This PIN will be used to log in to your account.
                  </p>
                </div>
                
                <SegmentedPinInput
                  value={createdPin}
                  onChange={(val) => setCreatedPin(val)}
                  length={4}
                />

                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterStep(1)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ← Back to Details
                  </button>
                </div>
              </div>
            ) : (
              // Verify Account / Enter OTP Step (Step 3)
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    Please enter the 4-digit verification PIN sent to your email (<span className="font-semibold text-gray-700">{email}</span>) to verify and activate your account.
                  </p>
                </div>

                <SegmentedPinInput
                  value={registerOtp}
                  onChange={(val) => setRegisterOtp(val)}
                  length={4}
                />

                <div className="flex justify-between items-center px-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterStep(2)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ← Back to PIN setup
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const otp = Math.floor(1000 + Math.random() * 9000).toString();
                      setGeneratedRegisterOtp(otp);
                      setRegisterOtp("");
                      setError("");
                      setSuccess("Sending a new verification PIN to your email...");
                      try {
                        const response = await fetch("/api/email/send-pin", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            toEmail: email.trim().toLowerCase(),
                            name: `${firstName.trim()} ${surname.trim()}`,
                            pin: otp,
                          }),
                        });
                        const resJson = await response.json();
                        if (resJson.success) {
                          setSuccess(`A new verification PIN has been successfully sent to ${email.trim().toLowerCase()}!`);
                        } else {
                          setError(`Failed to send PIN: ${resJson.error || "SMTP error"}. Please try again later.`);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      } catch (err: any) {
                        setError("Network error connecting to the server. Please try again later.");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="text-[10px] text-blue-600 font-extrabold hover:underline"
                  >
                    Resend PIN
                  </button>
                </div>
              </div>
            )
          ) : (
            /* LOGIN FLOW */
            !loginPinStep ? (
              // Enter Identifier (Step 1)
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 leading-none">
                    Phone Number or Email Address
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="e.g. you@example.com or +234 803 123 4567"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#070329]/10 outline-none"
                    required
                  />
                </div>
              </>
            ) : deviceVerificationStep ? (
              // Enter Device OTP (Step 3)
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    For your security, please enter the 4-digit verification code sent to your email to verify this device.
                  </p>
                </div>

                <SegmentedPinInput
                  value={deviceOtp}
                  onChange={(val) => setDeviceOtp(val)}
                  length={4}
                />

                <div className="flex justify-between items-center px-1 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceVerificationStep(false);
                      setLoginPinStep(true);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    ← Back to Security PIN
                  </button>
                </div>
              </div>
            ) : (
              // Enter PIN (Step 2)
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    Please enter the 4-digit security PIN for your account to gain access.
                  </p>
                </div>

                <SegmentedPinInput
                  value={loginPin}
                  onChange={(val) => setLoginPin(val)}
                  length={4}
                />

                <div className="flex justify-between items-center px-1 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginPinStep(false);
                      setShowForgotPinLink(false);
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    ← Change Email/Phone
                  </button>

                  <span className="text-[10px] text-gray-400"></span>
                </div>

                {showForgotPinLink && (
                  <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-center space-y-1.5 animate-fade-in mt-2">
                    <p className="text-xs text-red-800 font-medium">
                      Did you forget your login PIN?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmailOrPhone(email);
                        setForgotPinStep("request");
                        setError("");
                        setSuccess("");
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Retrieve / Reset PIN Code →
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#070329] hover:bg-[#0d074e] text-white text-sm font-bold rounded-xl transition duration-200 shadow-lg mt-4 ${isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : forgotPinStep ? (
              forgotPinStep === "request" ? (
                <>
                  <Smartphone className="w-4 h-4" />
                  Request Reset Code
                </>
              ) : forgotPinStep === "verify" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Verify Reset Code
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Reset & Save PIN
                </>
              )
            ) : isRegisterMode ? (
              registerStep === 1 ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Proceed to Create PIN
                </>
              ) : registerStep === 2 ? (
                <>
                  <Smartphone className="w-4 h-4" />
                  Send Verification PIN
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Verify PIN & Create Account
                </>
              )
            ) : !loginPinStep && !deviceVerificationStep ? (
              <>
                <Smartphone className="w-4 h-4" />
                Continue to Enter PIN
              </>
            ) : loginPinStep && !deviceVerificationStep ? (
              <>
                <LogIn className="w-4 h-4" />
                Verify PIN & Sign In
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Verify Device & Sign In
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
              New to Owode Food?{" "}
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
