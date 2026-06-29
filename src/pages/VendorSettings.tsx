import React, { useState, useRef } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Save, Store, Sparkles, Check, Globe, Upload, Image as ImageIcon, Clock, Link as LinkIcon, Trash, DollarSign } from "lucide-react";
import { VendorCategory } from "../types";

export const VendorSettings: React.FC = () => {
  const { currentVendor, updateVendorProfile, vendorCategories, currency, availableLocations = [] } = useDatabase();

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

  const [openingTime, setOpeningTime] = useState(currentVendor?.openingTime || "08:00");
  const [closingTime, setClosingTime] = useState(currentVendor?.closingTime || "22:00");
  const [category, setCategory] = useState<string>(currentVendor?.category || "restaurant");
  const [prepTime, setPrepTime] = useState<number>(currentVendor?.prepTime || 20);
  const [deliveryFee, setDeliveryFee] = useState<number>(currentVendor?.deliveryFee || 750);

  const [errorStr, setErrorStr] = useState("");
  const [successStr, setSuccessStr] = useState("");

  const vendorFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

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
        openingTime,
        closingTime,
        category,
        prepTime,
        deliveryFee,
      });
      setSuccessStr("Awesome! Your merchant profile was successfully updated!");
      setTimeout(() => {
        setSuccessStr("");
      }, 3500);
    } catch (err: any) {
      setErrorStr("Failed to save changes.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans pb-12">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight font-sans">Eatery Profile Terminal</h1>
        <p className="text-xs text-gray-500 mt-0.5">Customize your brand appearance, schedule opening times, and upload high-resolution brand visuals.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {successStr && (
          <div className="p-3.5 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            {successStr}
          </div>
        )}
        {errorStr && (
          <div className="p-3.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-xs font-semibold">
            {errorStr}
          </div>
        )}

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
                {openingTime} - {closingTime}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 block">Opening Time</label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100 transition font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 block">Closing Time</label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100 transition font-mono"
                  required
                />
              </div>
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
                    placeholder="https://images.unsplash.com/... or base64 format"
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
                    placeholder="https://images.unsplash.com/... or keep blank to use default logo"
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
    </div>
  );
};
