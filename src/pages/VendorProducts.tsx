import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { Product } from "../types";
import { Plus, Trash2, Edit3, ArrowLeft, Heart, Sparkles, CheckCircle2, Check, X, Upload, Image } from "lucide-react";
import { compressImageToDataUrl } from "../imageUtils";

export const VendorProducts: React.FC<{ mode?: "list" | "new" | "edit" }> = ({ mode = "list" }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentVendor, products, addProduct, updateProduct, deleteProduct, categories, currency } = useDatabase();
  
  const filteredCategories = categories.filter(c => !c.vendorCategoryId || c.vendorCategoryId === currentVendor?.category || c.vendorCategoryId === "global");

  // Selected state if editing
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [priority, setPriority] = useState<number>(0);
  const [addons, setAddons] = useState<{ id: string; name: string; price: number; }[]>([]);
  const [maxAddons, setMaxAddons] = useState("");
  
  // Addon Groups & builder states
  const [addonGroups, setAddonGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPriority, setNewGroupPriority] = useState<number>(0);
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMin, setNewGroupMin] = useState("1");
  const [newGroupMax, setNewGroupMax] = useState("");
  const [newGroupAllowMulti, setNewGroupAllowMulti] = useState(false);
  const [newGroupMaxPerAddon, setNewGroupMaxPerAddon] = useState("");
  const [selectedAddonIdsForGroup, setSelectedAddonIdsForGroup] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  
  // Temporary addon creation state
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editingAddonName, setEditingAddonName] = useState("");
  const [editingAddonPrice, setEditingAddonPrice] = useState("");
  
  // Local File Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  const [errorStr, setErrorStr] = useState("");
  const [successStr, setSuccessStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  if (!currentVendor) {
    return <div className="text-gray-500 font-bold">No active restaurant brand linked.</div>;
  }

  // Get vendor's food items
  const myProducts = products.filter(p => p.vendorId === currentVendor.id);
  const editingProduct = id ? products.find(p => p.id === id) : null;

  // Initialize fields on editing product load
  useEffect(() => {
    if (mode === "edit" && editingProduct) {
      setName(editingProduct.name);
      setDescription(editingProduct.description);
      setPrice(editingProduct.price != null ? editingProduct.price.toString() : "");
      setImage(editingProduct.image);
      setCategory(editingProduct.category);
      setIsAvailable(editingProduct.isAvailable);
      setAddons(editingProduct.addons || []);
      setMaxAddons(editingProduct.maxAddons != null ? editingProduct.maxAddons.toString() : "");
      setAddonGroups(editingProduct.addonGroups || []);
      setPriority(editingProduct.priority ?? 0);
    } else if (mode === "new") {
      setName("");
      setDescription("");
      setPrice("");
      setImage("/images/pizza.jpg");
      setCategory("");
      setIsAvailable(true);
      setAddons([]);
      setMaxAddons("");
      setAddonGroups([]);
      setPriority(0);
    }
  }, [mode, id, editingProduct]);

  // Default a NEW product's category to the first real category once the list loads.
  // Never invents a fake category name — if no real categories exist yet, this stays
  // empty and the vendor must be prompted to create one first.
  useEffect(() => {
    if (mode === "new" && !category && filteredCategories.length > 0) {
      setCategory(filteredCategories[0].name);
    }
  }, [mode, category, filteredCategories.length]);

  // True if the currently-set category isn't actually one of this vendor's real
  // categories — catches both a missing selection and legacy products saved with a
  // category (like the old hardcoded "Burgers" default) that was never real to begin with.
  const categoryIsInvalid = !!category && !filteredCategories.some(c => c.name === category);

  // Addon Group Builder Handlers
  const handleAddGroup = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (selectedAddonIdsForGroup.length === 0) {
      alert("Please select at least one addon to include in this group.");
      return;
    }

    const groupAddons = addons.filter(a => selectedAddonIdsForGroup.includes(a.id));
    
    if (editingGroupId) {
      // Edit mode
      setAddonGroups(addonGroups.map(g => g.id === editingGroupId ? {
        ...g,
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        minSelections: newGroupRequired ? parseInt(newGroupMin) || 1 : 0,
        maxSelections: newGroupMax ? parseInt(newGroupMax) || undefined : undefined,
        allowMultipleQuantity: newGroupAllowMulti,
        maxQuantityPerAddon: newGroupMaxPerAddon ? parseInt(newGroupMaxPerAddon) || undefined : undefined,
        addons: groupAddons,
        priority: newGroupPriority
      } : g));
      setEditingGroupId(null);
    } else {
      // Create mode
      const newGroup = {
        id: "group-" + Date.now(),
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        minSelections: newGroupRequired ? parseInt(newGroupMin) || 1 : 0,
        maxSelections: newGroupMax ? parseInt(newGroupMax) || undefined : undefined,
        allowMultipleQuantity: newGroupAllowMulti,
        maxQuantityPerAddon: newGroupMaxPerAddon ? parseInt(newGroupMaxPerAddon) || undefined : undefined,
        addons: groupAddons,
        priority: newGroupPriority
      };
      setAddonGroups([...addonGroups, newGroup]);
    }

    setNewGroupName("");
    setNewGroupPriority(0);
    setNewGroupRequired(false);
    setNewGroupMin("1");
    setNewGroupMax("");
    setNewGroupAllowMulti(false);
    setNewGroupMaxPerAddon("");
    setSelectedAddonIdsForGroup([]);
  };

  const handleCancelEditGroup = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditingGroupId(null);
    setNewGroupName("");
    setNewGroupPriority(0);
    setNewGroupRequired(false);
    setNewGroupMin("1");
    setNewGroupMax("");
    setNewGroupAllowMulti(false);
    setNewGroupMaxPerAddon("");
    setSelectedAddonIdsForGroup([]);
  };

  const startEditGroup = (g: any, e: React.MouseEvent) => {
    e.preventDefault();
    setEditingGroupId(g.id);
    setNewGroupName(g.name);
    setNewGroupPriority(g.priority ?? 0);
    setNewGroupRequired(g.isRequired);
    setNewGroupMin(g.minSelections != null ? g.minSelections.toString() : "1");
    setNewGroupMax(g.maxSelections != null ? g.maxSelections.toString() : "");
    setNewGroupAllowMulti(g.allowMultipleQuantity || false);
    setNewGroupMaxPerAddon(g.maxQuantityPerAddon != null ? g.maxQuantityPerAddon.toString() : "");
    setSelectedAddonIdsForGroup(g.addons.map((a: any) => a.id));
  };

  const handleRemoveGroup = (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setAddonGroups(addonGroups.filter(g => g.id !== groupId));
    if (editingGroupId === groupId) {
      setEditingGroupId(null);
      setNewGroupName("");
      setNewGroupPriority(0);
      setNewGroupRequired(false);
      setNewGroupMin("1");
      setNewGroupMax("");
      setNewGroupAllowMulti(false);
      setNewGroupMaxPerAddon("");
      setSelectedAddonIdsForGroup([]);
    }
  };

  // Helper functions for inline addons editing
  const handleAddAddon = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!addonName.trim()) return;
    const parsed = parseFloat(addonPrice);
    const finalPrice = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    
    const newAddon = {
      id: "addon-" + Date.now(),
      name: addonName.trim(),
      price: finalPrice
    };
    
    setAddons([...addons, newAddon]);
    setAddonName("");
    setAddonPrice("");
  };

  const handleRemoveAddon = (addonId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setAddons(addons.filter(a => a.id !== addonId));
    if (editingAddonId === addonId) {
      setEditingAddonId(null);
    }
  };

  const startEditAddon = (addon: { id: string; name: string; price: number; }, e: React.MouseEvent) => {
    e.preventDefault();
    setEditingAddonId(addon.id);
    setEditingAddonName(addon.name);
    setEditingAddonPrice(addon.price != null ? addon.price.toString() : "");
  };

  const handleSaveAddonEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editingAddonName.trim()) return;
    const parsed = parseFloat(editingAddonPrice);
    const finalPrice = isNaN(parsed) || parsed < 0 ? 0 : parsed;

    setAddons(addons.map(a => a.id === editingAddonId ? { ...a, name: editingAddonName.trim(), price: finalPrice } : a));
    setEditingAddonId(null);
  };

  // Local device image upload handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadError("");
      try {
        const compressed = await compressImageToDataUrl(file);
        setImage(compressed);
      } catch (err) {
        console.error("[product image upload] Failed to process image:", err);
        setUploadError(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError("");
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Only standard image formats are permitted.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        setUploadError("Image surpasses 3MB limit. Please pick a smaller image.");

        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // guards against a fast double-click firing this twice
    setErrorStr("");
    setSuccessStr("");

    if (!name || !description || !price || !image) {
      setErrorStr("Please provide all dish parameters (Name, Description, Pricing, and Photo URL).");
      return;
    }

    if (!category || !filteredCategories.some(c => c.name === category)) {
      setErrorStr("Please select a valid category for this product from the list.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorStr("Pricing must be a valid positive decimal value.");
      return;
    }

    let parsedMaxAddons: number | undefined = undefined;
    if (maxAddons.trim()) {
      const val = parseInt(maxAddons, 10);
      if (isNaN(val) || val < 0) {
        setErrorStr("Maximum Add-ons must be a positive integer or left empty.");
        return;
      }
      parsedMaxAddons = val;
    }

    setIsSubmitting(true);

    if (mode === "new") {
      const result = await addProduct({
        vendorId: currentVendor.id,
        name,
        description,
        price: parsedPrice,
        image,
        category,
        isAvailable,
        addons,
        maxAddons: parsedMaxAddons,
        addonGroups,
        priority
      });
      if (!result?.success) {
        setErrorStr(result?.error || "Failed to add the product. Please check your connection and try again.");
        setIsSubmitting(false);
        return;
      }
      setSuccessStr("Fabulous! Your new culinary item was successfully minted in the system.");
      // Explicitly reset here rather than relying on navigating away to
      // implicitly clean this up -- that assumption was fragile and left
      // isSubmitting stuck true for a future edit session in some cases.
      // The brief 1200ms delay before navigating still blocks a second
      // click from sneaking in during that window.
      setTimeout(() => {
        setIsSubmitting(false);
        navigate("/vendor/products");
      }, 1200);
    } else if (mode === "edit" && editingProduct) {
      const result = await updateProduct({
        ...editingProduct,
        name,
        description,
        price: parsedPrice,
        image,
        category,
        isAvailable,
        addons,
        maxAddons: parsedMaxAddons,
        addonGroups,
        priority
      });
      if (!result?.success) {
        setErrorStr(result?.error || "Failed to save the product. Please check your connection and try again.");
        setIsSubmitting(false);
        return;
      }
      setSuccessStr("Success! Product details were hot-swapped and saved.");
      setTimeout(() => {
        setIsSubmitting(false);
        navigate("/vendor/products");
      }, 1200);
    } else {
      // Neither branch matched (shouldn't normally happen) — don't leave the button stuck disabled.
      setIsSubmitting(false);
    }
  };

  const handleDelete = (pId: string) => {
    setDeleteTargetId(pId);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      const result = await deleteProduct(deleteTargetId);
      if (!result?.success) {
        window.alert(result?.error || "Failed to delete the product. Please check your connection and try again.");
        return;
      }
      setDeleteTargetId(null);
    }
  };

  const toggleAvailability = async (p: Product) => {
    const result = await updateProduct({
      ...p,
      isAvailable: !p.isAvailable
    });
    if (!result?.success) {
      window.alert(result?.error || "Failed to update availability. Please check your connection and try again.");
    }
  };

  /* Render create/edit form */
  if (mode === "new" || mode === "edit") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 font-sans text-gray-900">
        <Link to="/vendor/products" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-950 transition">
          <ArrowLeft className="w-4 h-4" />
          Cancel and return to list
        </Link>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 py-1 px-2.5 font-bold uppercase tracking-wide rounded">
              Dish Editor
            </span>
            <h2 className="text-xl font-bold mt-2 tracking-tight">
              {mode === "new" ? "Mint New Culinary Entry" : "Revise Menu Option Structure"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Populate ingredients, photos, pricing schedules, and availability indices.</p>
          </div>

          {errorStr && (
            <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
              {errorStr}
            </div>
          )}
          {successStr && (
            <div className="p-3.5 bg-green-50 text-green-700 rounded-xl text-xs font-semibold">
              {successStr}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Product/Dish Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Buffalo Margherita D.O.C."
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Price ({currency})</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Cuisine/Product Category</label>
                <select
                  value={categoryIsInvalid ? "" : category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full text-xs p-3 border rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 ${categoryIsInvalid ? "border-red-300" : "border-gray-200"}`}
                >
                  {(!category || categoryIsInvalid) && (
                    <option value="" disabled>Select a category…</option>
                  )}
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>No categories available</option>
                  )}
                </select>
                {categoryIsInvalid && (
                  <p className="text-[10px] text-red-500 font-bold">
                    "{category}" isn't a real category on your list — please pick one above and save again.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Active Stock State</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAvailable(true)}
                    className={`flex-1 py-3 text-center border font-bold text-xs rounded-xl cursor-pointer ${
                      isAvailable ? "bg-[#070329] text-white border-[#070329]" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    In Stock (Purchasable)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(false)}
                    className={`flex-1 py-3 text-center border font-bold text-xs rounded-xl cursor-pointer ${
                      !isAvailable ? "bg-red-600 text-white border-red-600" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Sold Out (Grayed Out)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Menu Order Priority</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full p-3 rounded-xl border border-gray-150 bg-gray-50/50 focus:bg-white focus:border-[#070329] outline-none transition text-xs font-bold"
                />
                <p className="text-[10px] text-gray-400 font-medium">Lower numbers show first on your menu. Leave at 0 for default ordering.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Maximum Custom Add-ons Allowed</label>
                <input
                  type="number"
                  value={maxAddons}
                  onChange={(e) => setMaxAddons(e.target.value)}
                  placeholder="e.g. 2 (Leave empty or 0 for unlimited)"
                  min="0"
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 font-mono"
                />
                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  Restricts customers or POS operators to selecting at most this number of add-on options for this item.
                </p>
              </div>
            </div>

            {/* PRODUCT IMAGE UPLOAD WORKSPACE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 leading-none">
                <Image className="w-4 h-4 text-indigo-500" />
                Product Presentation Photo <span className="text-red-500">*</span>
              </label>
              
              {uploadError && (
                <div className="p-2 text-[11px] bg-red-50 text-red-650 border border-red-100 rounded-lg font-semibold">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Drag and Drop Zone (Span 3) */}
                <div className="md:col-span-3">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-40 group ${
                      isDragging 
                        ? "border-blue-500 bg-blue-50/50" 
                        : "border-gray-200 bg-gray-50/50 hover:border-[#0ea5e9] hover:bg-slate-50"
                    }`}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-[#0ea5e9]/10 flex items-center justify-center text-slate-500 group-hover:text-[#0ea5e9] mb-3 transition shadow-sm border border-gray-150">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-gray-900">
                      Drag and Drop product photo here
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      or click to browse local files (PNG, JPG, WEBP up to 3MB)
                    </p>
                  </div>
                </div>

                {/* Realtime Live Preview Zone (Span 2) */}
                <div className="md:col-span-2 flex flex-col justify-between border border-gray-100 rounded-2xl p-4 bg-slate-50/30">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Live Graphic Index</div>
                  
                  {image ? (
                     <div className="space-y-3">
                       <div className="relative w-full h-24 rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100 flex items-center justify-center">
                         <img
                           src={image}
                           alt="Product preview"
                           className="w-full h-full object-cover"
                           referrerPolicy="no-referrer"
                         />
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             setImage("");
                           }}
                           className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white cursor-pointer transition"
                           title="Clear photo"
                         >
                           <X className="w-3.5 h-3.5" />
                         </button>
                       </div>
                       <p className="text-[10px] font-mono text-gray-500 truncate leading-none">
                         {image.startsWith("data:") ? "✓ Encoded Base64 Object" : "✓ Active Direct Link"}
                       </p>
                     </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center py-6 text-gray-300">
                      <Image className="w-8 h-8 mb-1 opacity-40 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Preview Unavailable</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage("/images/burger.jpg");
                      }}
                      className="w-full text-center text-[10px] text-[#0ea5e9] hover:text-blue-900 font-extrabold uppercase tracking-wider transition"
                    >
                      ⚡ Reset to placeholder image
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Direct URL manual option in case advanced admin prefers linking */}
              <details className="text-gray-400 group mt-1">
                <summary className="text-[10px] font-bold cursor-pointer hover:text-gray-600 transition select-none">
                  Want to load an external image URL index instead? Click to toggle.
                </summary>
                <div className="mt-2 pl-3 border-l-2 border-gray-100 py-1">
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Paste image URL here (e.g. Unsplash dynamic item URL)..."
                    className="w-full text-[11px] p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>
              </details>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600">Ingredients and Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Compose a brief tasty pitch detailing materials, nutrition, gluten properties, or spices in this dish."
                rows={4}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            {/* PRODUCT ADDONS AND CUSTOM EXTRAS SECTION */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-950 tracking-tight">Product Add-ons & Extras</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Define side dishes, toppings, extra proteins, or custom options with custom pricing.</p>
              </div>

              {/* Addon Form Inputs */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 flex flex-col sm:flex-row items-end gap-3.5">
                <div className="flex-grow space-y-1.5 w-full">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Add-on Name</label>
                  <input
                    type="text"
                    value={addonName}
                    onChange={(e) => setAddonName(e.target.value)}
                    placeholder="e.g. Extra Cheese / Double Beef Patty"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="w-full sm:w-40 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Extra Price ({currency})</label>
                  <input
                    type="number"
                    value={addonPrice}
                    onChange={(e) => setAddonPrice(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddAddon}
                  className="w-full sm:w-auto py-2.5 px-4 bg-[#070329] hover:bg-[#0ea5e9] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Add-on
                </button>
              </div>

              {/* Inline Editing Mode Container */}
              {editingAddonId && (
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 flex flex-col sm:flex-row items-end gap-3.5 animate-in fade-in duration-200">
                  <div className="flex-grow space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Edit Add-on Name</label>
                    <input
                      type="text"
                      value={editingAddonName}
                      onChange={(e) => setEditingAddonName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-amber-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div className="w-full sm:w-40 space-y-1.5">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Edit Extra Price ({currency})</label>
                    <input
                      type="number"
                      value={editingAddonPrice}
                      onChange={(e) => setEditingAddonPrice(e.target.value)}
                      className="w-full text-xs p-2.5 border border-amber-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-amber-200 font-mono"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingAddonId(null)}
                      className="flex-1 sm:flex-none py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAddonEdit}
                      className="flex-1 sm:flex-none py-2.5 px-4 bg-amber-600 hover:bg-[#0ea5e9] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Render Current Added Addons List */}
              {addons.length > 0 ? (
                <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden text-xs">
                  {addons.map((addon) => (
                    <div key={addon.id} className="p-3 bg-white flex items-center justify-between gap-4">
                      <div>
                        <span className="font-extrabold text-[#070329]">{addon.name}</span>
                        <span className="text-gray-400 text-[11px] font-mono ml-2 font-bold">(+{currency}{(addon.price ?? 0).toLocaleString()})</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => startEditAddon(addon, e)}
                          className="py-1 px-3.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAddon(addon.id, e)}
                          className="py-1 px-3.5 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-white rounded-2xl border border-dashed border-gray-150 text-gray-400 text-xs">
                  No custom addon modifiers set yet for this menu item.
                </div>
              )}
            </div>

            {/* ADDON GROUPS (CHOWDECK STYLE) BUILDER */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-950 tracking-tight">Structured Addon Groups (Multi-Quantity & Required Selection)</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Group your addons above into required structures, single choice (radio style), or limit the quantity customers can buy.</p>
              </div>

              {addons.length > 0 ? (
                <div className="bg-[#070329]/5 p-5 rounded-2xl border border-gray-200/60 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Group Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="e.g. Choose Rice Style / Extra Protein"
                          className="flex-1 min-w-0 text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          type="number"
                          value={newGroupPriority}
                          onChange={(e) => setNewGroupPriority(Number(e.target.value) || 0)}
                          title="Menu order priority -- lower shows first"
                          placeholder="0"
                          className="w-14 shrink-0 text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100 font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selection Requirements</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewGroupRequired(true)}
                          className={`flex-1 py-2.5 text-center border font-bold text-xs rounded-xl cursor-pointer transition ${
                            newGroupRequired ? "bg-[#070329] text-white border-[#070329]" : "bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Mandatory Selection
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewGroupRequired(false)}
                          className={`flex-1 py-2.5 text-center border font-bold text-xs rounded-xl cursor-pointer transition ${
                            !newGroupRequired ? "bg-[#070329] text-white border-[#070329]" : "bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Optional Choices
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {newGroupRequired && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Min Choices Required</label>
                        <input
                          type="number"
                          value={newGroupMin}
                          onChange={(e) => setNewGroupMin(e.target.value)}
                          placeholder="e.g. 1"
                          min="1"
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Choices Allowed</label>
                      <input
                        type="number"
                        value={newGroupMax}
                        onChange={(e) => setNewGroupMax(e.target.value)}
                        placeholder="e.g. 1 (For single select radio style)"
                        min="1"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                      />
                      <p className="text-[9px] text-gray-400 font-medium leading-snug">Number of DIFFERENT options a customer can pick from this group.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Qty Per Addon Option</label>
                      <input
                        type="number"
                        value={newGroupMaxPerAddon}
                        disabled={!newGroupAllowMulti}
                        onChange={(e) => setNewGroupMaxPerAddon(e.target.value)}
                        placeholder={newGroupAllowMulti ? "e.g. 5" : "No multiple quantity allowed"}
                        min="1"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white disabled:bg-gray-100/60 disabled:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                      />
                      <p className="text-[9px] text-gray-400 font-medium leading-snug">How many of EACH chosen option a customer can get — independent of Max Choices above.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs py-1">
                    <input
                      type="checkbox"
                      id="allow-multi"
                      checked={newGroupAllowMulti}
                      onChange={(e) => setNewGroupAllowMulti(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="allow-multi" className="font-bold text-gray-700 cursor-pointer select-none">
                      Allow customers to select more than 1 of each addon option in this group
                    </label>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Select Addons to include in this Group:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                      {addons.map((a) => {
                        const isSelected = selectedAddonIdsForGroup.includes(a.id);
                        return (
                          <div
                            key={a.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAddonIdsForGroup(selectedAddonIdsForGroup.filter(id => id !== a.id));
                              } else {
                                setSelectedAddonIdsForGroup([...selectedAddonIdsForGroup, a.id]);
                              }
                            }}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition select-none cursor-pointer text-left ${
                              isSelected ? "bg-indigo-50 border-indigo-300 font-bold text-indigo-950" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                            </div>
                            <span className="truncate">{a.name} (+{currency}{a.price})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {editingGroupId && (
                      <button
                        type="button"
                        onClick={handleCancelEditGroup}
                        className="flex-1 py-2.5 px-4 bg-gray-150 hover:bg-gray-200 text-gray-750 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      className="flex-[2] py-2.5 px-4 bg-[#070329] hover:bg-[#0ea5e9] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    >
                      {editingGroupId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingGroupId ? "Update Addon Group" : "Create Addon Group"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 bg-white rounded-2xl border border-dashed border-gray-150 text-gray-400 text-xs">
                  Please add custom Addons first in the section above before grouping them.
                </div>
              )}

              {/* Render Current Added Groups list */}
              {addonGroups.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Configured Addon Groups ({addonGroups.length})</span>
                  <div className="space-y-2.5">
                    {[...addonGroups].sort((a: any, b: any) => (a.priority ?? 0) - (b.priority ?? 0)).map((g) => (
                      <div key={g.id} className="p-4 bg-white border border-gray-200 rounded-2xl flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900">{g.name}</span>
                            {g.isRequired ? (
                              <span className="text-[8px] bg-red-50 text-red-600 border border-red-150 px-1.5 py-0.5 rounded font-bold uppercase leading-none">Required</span>
                            ) : (
                              <span className="text-[8px] bg-gray-50 text-gray-500 border border-gray-150 px-1.5 py-0.5 rounded font-bold uppercase leading-none">Optional</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 space-x-2 font-medium">
                            <span>Min: {g.minSelections ?? 0}</span>
                            <span>•</span>
                            <span>Max: {g.maxSelections || "No limit"}</span>
                            <span>•</span>
                            <span>Allow Quantity: {g.allowMultipleQuantity ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {g.addons.map((addon: any) => (
                              <span key={addon.id} className="text-[9px] bg-gray-100 text-gray-650 rounded px-1.5 py-0.5 font-bold uppercase">
                                {addon.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startEditGroup(g, e)}
                            className="py-1 px-3.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg cursor-pointer text-center"
                          >
                            Edit Group
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveGroup(g.id, e)}
                            className="py-1 px-3.5 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg cursor-pointer text-center"
                          >
                            Remove Group
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/vendor/products")}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition"
              >
                Abrupt Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`py-2.5 px-5 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-extrabold rounded-xl shadow transition ${isSubmitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isSubmitting ? "Saving…" : "Commit Menu Settings"}
              </button>
            </div>

          </form>

        </div>
      </div>
    );
  }

  /* Render List of products */
  return (
    <div className="space-y-8 font-sans">
      
      {/* State-driven Product Removal Modal (safely replacing blocked window.confirm scripts) */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold block">Danger Zone Action</span>
              <h3 className="text-base font-extrabold text-[#070329] tracking-tight">Delete Culinary Dish?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you absolutely sure you want to permanently delete <b className="text-gray-850">{products.find(p => p.id === deleteTargetId)?.name || "this item"}</b> from your store catalog? This action is irreversible and will purge item records.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-gray-50 text-gray-550 border border-gray-100 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                No, Keep Dish
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight text-gray-950">Store Menu Registry</h1>
          <p className="text-xs text-gray-400 mt-0.5">Fulfill custom culinary lists, toggler inventory limits, and manage catalog items.</p>
        </div>

        <button
          onClick={() => navigate("/vendor/products/new")}
          className="py-2.5 px-4.5 bg-[#070329] hover:bg-blue-900 border border-blue-950 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow cursor-pointer text-center"
        >
          <Plus className="w-4 h-4 text-green-300" />
          Add Product
        </button>
      </div>

      {myProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {myProducts.map((p) => (
            <div 
              key={p.id} 
              className={`bg-white rounded-2xl overflow-hidden border transition shadow-sm hover:shadow ${
                p.isAvailable ? "border-gray-100" : "border-gray-200/50 bg-gray-50/40"
              }`}
            >
              <div className="h-44 overflow-hidden relative bg-gray-100">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                <span className="absolute bottom-4 left-4 py-1 px-2.5 bg-[#070329] text-white text-[9px] font-extrabold uppercase rounded-full tracking-wider">
                  {p.category}
                </span>

                <button
                  onClick={() => toggleAvailability(p)}
                  className={`absolute top-4 right-4 py-1 px-2.5 rounded-lg text-[9px] font-black uppercase shadow cursor-pointer ${
                    p.isAvailable 
                      ? "bg-green-500/90 text-white" 
                      : "bg-red-600/90 text-white"
                  }`}
                >
                  {p.isAvailable ? "In Stock" : "Sold Out"}
                </button>
              </div>

              <div className="p-5 flex flex-col justify-between space-y-4 min-h-40">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-gray-950 leading-tight truncate">{p.name}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>
                  
                  {p.maxAddons !== undefined && p.maxAddons > 0 && (
                    <div className="pb-1">
                      <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded font-extrabold uppercase inline-block">
                        Limit: Max {p.maxAddons} {p.maxAddons === 1 ? "addon" : "addons"}
                      </span>
                    </div>
                  )}

                  {p.addons && p.addons.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1 border-t border-gray-100">
                      {p.addons.map((a) => (
                        <span key={a.id} className="text-[9px] bg-sky-50 text-[#0ea5e9] border border-sky-100 px-2 py-0.5 rounded font-bold uppercase font-mono tracking-tight">
                          + {a.name} (+{currency}{(a.price ?? 0).toLocaleString()})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#070329] text-sm font-mono">{currency}{(p.price ?? 0).toLocaleString()}</span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/vendor/products/edit/${p.id}`)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 hover:text-blue-600 rounded-lg text-gray-600 cursor-pointer"
                      title="Edit dish characteristics"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg cursor-pointer"
                      title="Expel dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <p className="text-sm font-bold text-gray-700">No products entered yet</p>
          <p className="text-xs text-gray-400 mt-1">Populate menu lists with delectable burgers, salads, or sweet drafts above.</p>
        </div>
      )}
    </div>
  );
};
