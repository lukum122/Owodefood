import React, { useState, useRef, useEffect } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Save, Store, Sparkles, Check, Globe, Upload, Image as ImageIcon, Clock, Link as LinkIcon, Trash, DollarSign, Lock } from "lucide-react";
import { VendorCategory, DailyHours } from "../types";

export const VendorSettings: React.FC = () => {
  const { currentUser, resetUserPin, currentVendor, updateVendorProfile, vendorCategories, currency, availableLocations = [] } = useDatabase();

  const [name, setName] = useState(currentVendor?.name || "");
  const [description, setDescription] = useState(currentVendor?.description || "");
  const [cuisine, setCuisine] = useState(currentVendor?.cuisine || "Italian");
  const [image, setImage] = useState(currentVendor?.image || "");
  const [coverImage, setCoverImage] = useState(currentVendor?.coverImage || "");

  // Detect matching district from current vendor address
  const initialDistrict = availableLocations.find(loc => {
    const distName = loc.split(",")[0].trim().toLowerCase();
    return (currentVendor?.address || "").toLowerCase().includes(distName);
  }) || (availableLocations[0] || "");

  const initialStreet = (() => {
    const full = currentVendor?.address || "";
    if (initialDistrict) {
      const distName = initialDistrict.split(",")[0].trim();
      const idx = full.toLowerCase().indexOf(distName.toLowerCase());
      if (idx !== -1) {
        return full.substring(0, idx).replace(/,\s*$/, "").trim();
      }
    }
    return full;
  })();

  const [streetAddress, setStreetAddress] = useState(initialStreet);
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);

  const [operatingHours, setOperatingHours] = useState<Record<string, DailyHours>>(
    currentVendor?.operatingHours || {
      "Monday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      "Tuesday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      "Wednesday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      "Thursday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      "Friday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      "Saturday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      "Sunday": { isOpen: true, openTime: "08:00", closeTime: "22:00" },
    }
  );
  const [category, setCategory] = useState<string>(currentVendor?.category || "restaurant");
  const [prepTime, setPrepTime] = useState<number>(currentVendor?.prepTime || 20);
  const [deliveryFee, setDeliveryFee] = useState<number>(currentVendor?.deliveryFee || 750);
  const [receiptPickupEnabled, setReceiptPickupEnabled] = useState<boolean>(currentVendor?.receiptPickupEnabled !== false);

  const [errorStr, setErrorStr] = useState("");
  const [successStr, setSuccessStr] = useState("");

  // Security & PIN changing state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  const vendorFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Sync state with currentVendor once it loads
  useEffect(() => {
    if (currentVendor) {
      setName(currentVendor.name || "");
      setDescription(currentVendor.description || "");
      setCuisine(currentVendor.cuisine || "Italian");
      setImage(currentVendor.image || "");
      setCoverImage(currentVendor.coverImage || "");
      if (currentVendor.operatingHours) {
        setOperatingHours(currentVendor.operatingHours);
      } else {
        // Fallback for legacy
        const defDays = currentVendor.openingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const fallbackHours: Record<string, DailyHours> = {};
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach(day => {
          fallbackHours[day] = {
            isOpen: defDays.includes(day),
            openTime: currentVendor.openingTime || "08:00",
            closeTime: currentVendor.closingTime || "22:00"
          };
        });
        setOperatingHours(fallbackHours);
      }
      setCategory(currentVendor.category || "restaurant");
      setPrepTime(currentVendor.prepTime || 20);
      setDeliveryFee(currentVendor.deliveryFee || 750);
      setReceiptPickupEnabled(currentVendor.receiptPickupEnabled !== false);

      const dist = availableLocations.find(loc => {
        const distName = loc.split(",")[0].trim().toLowerCase();
        return (currentVendor.address || "").toLowerCase().includes(distName);
      }) || (availableLocations[0] || "");
      setSelectedDistrict(dist);

      let street = currentVendor.address || "";
      if (dist) {
        const distName = dist.split(",")[0].trim();
        const idx = street.toLowerCase().indexOf(distName.toLowerCase());
        if (idx !== -1) {
          street = street.substring(0, idx).replace(/,\s*$/, "").trim();
        }
      }
      setStreetAddress(street);
    }
  }, [currentVendor, availableLocations]);

  const handleVendorImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorStr("Vendor image is too large. Keeps it under 2MB for storage performance.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorStr("Cover image is too large. Keeps it under 2MB for storage performance.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr("");
    setSuccessStr("");

    if (!name || !description || !cuisine || !streetAddress) {
      setErrorStr("All basic business credentials must be populated before saving.");
      return;
    }

    try {
      const finalAddress = streetAddress.trim() + (selectedDistrict ? `, ${selectedDistrict}` : "");
      updateVendorProfile({
        name,
        description,
        cuisine,
        image,
        coverImage,
        address: finalAddress,
        operatingHours,
        category,
        prepTime,
        deliveryFee,
        receiptPickupEnabled,
      });
      setSuccessStr("Awesome! Your merchant profile was successfully updated!");
      setTimeout(() => {
        setSuccessStr("");
      }, 3500);
    } catch (err: any) {
      setErrorStr("Failed to save changes.");
    }
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
    <div className="max-w-2xl mx-auto space-y-8 font-sans pb-12">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight font-sans">Eatery Profile Terminal</h1>
        <p className="text-xs text-gray-500 mt-0.5">Customize your brand appearance, schedule opening times, and upload high-resolution brand visuals.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0ea5e9]/5 border border-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center p-1 shadow-md overflow-hidden relative">
            {image ? (
              <img src={image} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Store className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">{currentVendor?.name || "Unconfigured Eatery"}</h3>
            <span className="text-xs text-gray-400 block mt-0.5">{cuisine} Partner • Rating: {currentVendor?.rating.toFixed(1) || "5.0"}</span>
            <div className="flex gap-2 items-center mt-2">
              <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2.5 py-0.5 rounded inline-block uppercase font-mono tracking-wider">
                {currentVendor?.status || "approved"}
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded inline-block uppercase font-mono tracking-wider">
                {operatingHours["Monday"]?.isOpen ? `${operatingHours["Monday"].openTime} - ${operatingHours["Monday"].closeTime}` : "Schedule Set"}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">Company Merchant Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">Primary Cuisine Type</label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition cursor-pointer"
              >
                <option value="Italian">Italian Pizza & Pasta</option>
                <option value="Burgers">American Hamburgers</option>
                <option value="Sushi">Nippon Sushi & Sashimi</option>
                <option value="Asian">Stir noodles & dumplings</option>
                <option value="Desserts">Plated sweet waffles</option>
                <option value="Salads">Healthy Salads</option>
                <option value="Chicken">Delicious Crispy Chicken</option>
                <option value="Drinks">Drinks & Beverages</option>
              </select>
            </div>
          </div>

          {/* Opening & Closing Times section */}
          <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl">
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-500" />
              Hours of Operation (Opening & Closing)
            </h4>
            <div className="space-y-3">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                const dayData = operatingHours[day];
                return (
                  <div key={day} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-150 rounded-xl">
                    <div className="w-24">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dayData?.isOpen || false}
                          onChange={(e) => {
                            setOperatingHours({
                              ...operatingHours,
                              [day]: { ...dayData, isOpen: e.target.checked }
                            });
                          }}
                          className="w-4 h-4 text-sky-600 rounded border-gray-300 focus:ring-sky-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{day.substring(0, 3)}</span>
                      </label>
                    </div>
                    
                    {dayData?.isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={dayData.openTime}
                          onChange={(e) => {
                            setOperatingHours({
                              ...operatingHours,
                              [day]: { ...dayData, openTime: e.target.value }
                            });
                          }}
                          className="text-xs p-1.5 border border-gray-250 rounded-lg outline-none focus:ring-2 focus:ring-sky-100 font-mono"
                        />
                        <span className="text-[10px] text-gray-400 font-bold">TO</span>
                        <input
                          type="time"
                          value={dayData.closeTime}
                          onChange={(e) => {
                            setOperatingHours({
                              ...operatingHours,
                              [day]: { ...dayData, closeTime: e.target.value }
                            });
                          }}
                          className="text-xs p-1.5 border border-gray-250 rounded-lg outline-none focus:ring-2 focus:ring-sky-100 font-mono"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <span className="text-[10px] bg-gray-200 text-gray-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider">Closed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vendor Category & Delivery/Packing Specs */}
          <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0ea5e9]" />
              Merchant Category & Delivery Logistics
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 block">Merchant Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100 transition cursor-pointer font-semibold"
                >
                  {vendorCategories && vendorCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 block">Prep / Packing Time (mins)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100 transition font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 block">Base Delivery Fee ({currency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">{currency}</span>
                  <input
                    type="number"
                    min={0}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-250 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100 transition font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Receipt Pickup Toggle */}
            <div className="pt-4 border-t border-gray-150 flex items-center justify-between">
              <div>
                <label className="text-[11px] font-bold text-gray-800 block">Allow Client Receipt Pickup</label>
                <span className="text-[9px] text-gray-500 font-sans block mt-0.5">Enable customers to request rider pickup for items they pre-purchased from you directly.</span>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={receiptPickupEnabled}
                  onChange={(e) => setReceiptPickupEnabled(e.target.checked)}
                  className="w-5 h-5 text-sky-600 focus:ring-sky-100 border-gray-300 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Vendor profile Image (Avatar) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-gray-600 block">Vendor Image (e.g., Avatar / Logo)</label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4 flex justify-center">
                <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-250 hover:border-sky-500 transition-colors flex flex-col items-center justify-center overflow-hidden bg-gray-50/55 group">
                  {image ? (
                    <>
                      <img src={image} alt="Logo preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImage("")}
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2 cursor-pointer" onClick={() => vendorFileRef.current?.click()}>
                      <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                      <span className="text-[9px] text-gray-400 font-extrabold uppercase mt-1 block">Upload file</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="sm:col-span-8 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={vendorFileRef}
                    accept="image/*"
                    onChange={handleVendorImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => vendorFileRef.current?.click()}
                    className="w-full py-2.5 px-4 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-sky-500" />
                    Upload Logo file
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Or direct URL link (optional)</span>
                  </div>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="/images/hero.png"
                    className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cover image (Jumbotron card) */}
          <div className="space-y-2.5 pt-2">
            <label className="text-xs font-bold text-gray-600 block">Cover Jumbotron Banner Image</label>
            <div className="grid grid-cols-1 gap-4">
              <div className="relative h-28 w-full rounded-2xl border-2 border-dashed border-gray-250 hover:border-sky-500 transition-all flex flex-col items-center justify-center overflow-hidden bg-gray-50/55 group">
                {coverImage ? (
                  <>
                    <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4 cursor-pointer" onClick={() => coverFileRef.current?.click()}>
                    <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 block">Upload Jumbotron Banner (Drop or Click)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={coverFileRef}
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    className="w-full py-2.5 px-4 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-750 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-sky-500" />
                    Upload Cover Photo JPG/PNG
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Or direct URL link (optional)</span>
                  </div>
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="/images/jollof.png"
                    className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">Business District / Delivery Zone</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition font-semibold"
                required
              >
                <option value="">Select Local Zone</option>
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 block">Crucial for matching courier delivery fees correctly</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">Street Address / Landmark Details</label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g. 15 Fate Road, Opp. Phase 2 Gate"
                className="w-full text-xs p-3.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                required
              />
              <span className="text-[10px] text-gray-400 block">Enter street number, building or shop name</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">Restaurant Description / Pitch</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs p-3.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
              required
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-green-300" />
              Commit Restaurant Settings
            </button>
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

      {successStr && (
        <div className="fixed bottom-6 right-6 p-4 bg-green-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-5 h-5 text-white" />
          {successStr}
        </div>
      )}

      {errorStr && (
        <div className="fixed bottom-6 right-6 p-4 bg-red-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5">
          {errorStr}
        </div>
      )}
    </div>
  );
};
