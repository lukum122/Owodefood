import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { isVendorOpen } from "../types";
import { Star, MapPin, ArrowLeft, Plus, Minus, Check, ThumbsUp, Clock, Info, ShieldCheck, X, Truck, AlertTriangle, Heart } from "lucide-react";

export const CustomerVendorMenu: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { vendors, products, addToCart, cart, updateCartQuantity, clearCart, currency, reviews, addReview, currentUser, receiptPickupOrders, createReceiptPickupOrder, cancelReceiptPickupOrder, savedAddresses, getUserWalletBalance, calculateDeliveryFee, paymentGateways, receiptPickupConfig } = useDatabase();
  
  // Sync favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const key = `fd_favorites_${currentUser?.id || "guest"}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : ["v-1", "v-2"];
  });

  const vendorObj = vendors.find(v => v.id === id);

  const isFavorite = vendorObj ? favorites.includes(vendorObj.id) : false;

  const handleToggleFavorite = () => {
    if (!vendorObj) return;
    const key = `fd_favorites_${currentUser?.id || "guest"}`;
    let newFavs: string[];
    if (isFavorite) {
      newFavs = favorites.filter(id => id !== vendorObj.id);
    } else {
      newFavs = [...favorites, vendorObj.id];
    }
    localStorage.setItem(key, JSON.stringify(newFavs));
    setFavorites(newFavs);
    window.dispatchEvent(new Event("fd-favorites-updated"));
  };

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

  const [addedBanner, setAddedBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "reviews" | "info" | "pickup">("menu");
  const [productToOverwrite, setProductToOverwrite] = useState<any | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [addonSelections, setAddonSelections] = useState<Record<string, any>>({});

  // States for Receipt Pickup & Delivery Form
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [receiptImage, setReceiptImage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cash">("wallet");
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false);
  const [pickupSuccessMsg, setPickupSuccessMsg] = useState<string | null>(null);
  const [pickupErrorMsg, setPickupErrorMsg] = useState<string | null>(null);
  const [presetReceipt, setPresetReceipt] = useState<string | "">("");

  const dynamicDeliveryFee = calculateDeliveryFee(vendorObj?.id, 0, pickupAddress);

  // Addon group helper calculations
  const getGroupSelectionCount = (groupId: string) => {
    return (Object.values(addonSelections) as any[])
      .filter(sel => sel.groupId === groupId)
      .reduce((sum, sel) => sum + sel.quantity, 0);
  };

  const isGroupValid = (group: any) => {
    const count = getGroupSelectionCount(group.id);
    if (group.isRequired) {
      const min = group.minSelections ?? 1;
      if (count < min) return false;
    }
    if (group.maxSelections !== undefined && group.maxSelections > 0) {
      if (count > group.maxSelections) return false;
    }
    return true;
  };

  // New review form states
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  if (!vendorObj) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <p className="text-sm font-bold text-[#070329]">Kitchen Record Not Found</p>
        <p className="text-xs text-gray-400 mt-1">This slot doesn't point to an active food kitchen.</p>
        <Link to="/" className="text-[#0ea5e9] font-bold text-xs hover:underline mt-4 inline-block">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  // Get products only belonging to this specific vendor
  const vendorProducts = products.filter(p => p.vendorId === vendorObj.id);

  // Group products by category
  const categoriesList: string[] = Array.from(new Set(vendorProducts.map(p => p.category as string))) as string[];

  const handleAddProduct = (p: any) => {
    if (!isVendorOpen(vendorObj)) {
      return;
    }
    // Check if cart has items from another vendor
    if (cart.length > 0 && cart[0].product.vendorId !== vendorObj.id) {
      setProductToOverwrite(p);
      return;
    }
    
    addToCart(p);
    setAddedBanner(p.name);
    setTimeout(() => {
      setAddedBanner(null);
    }, 2500);
  };

  const handleCustomizeOrAdd = (p: any) => {
    if (!isVendorOpen(vendorObj)) {
      return;
    }
    const hasAddons = (p.addons && p.addons.length > 0) || (p.addonGroups && p.addonGroups.length > 0);
    if (hasAddons) {
      setCustomizingProduct(p);
      setAddonSelections({});
      setSelectedAddons([]);
    } else {
      handleAddProduct(p);
    }
  };

  const handleAddProductWithCustomExtras = (p: any, addons: any[]) => {
    if (!isVendorOpen(vendorObj)) {
      return;
    }
    if (cart.length > 0 && cart[0].product.vendorId !== vendorObj.id) {
      setProductToOverwrite({ product: p, addons });
      setCustomizingProduct(null);
      return;
    }
    
    addToCart(p, addons);
    setAddedBanner(p.name);
    setCustomizingProduct(null);
    setSelectedAddons([]);
    setAddonSelections({});
    setTimeout(() => {
      setAddedBanner(null);
    }, 2500);
  };

  const handleConfirmOverwrite = () => {
    if (productToOverwrite) {
      clearCart();
      const p = productToOverwrite.product || productToOverwrite;
      const addons = productToOverwrite.addons || [];
      addToCart(p, addons);
      setAddedBanner(p.name);
      setProductToOverwrite(null);
      setTimeout(() => {
        setAddedBanner(null);
      }, 2500);
    }
  };

  // Filter reviews for this vendor
  const vendorReviews = reviews.filter(r => r.vendorId === vendorObj.id);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!currentUser) {
      setFormError("Please log in to submit a review.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!newComment.trim()) {
      setFormError("Review comment cannot be empty.");

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    addReview(vendorObj.id, newRating, newComment.trim());
    setFormSuccess(true);
    setNewComment("");
    setNewRating(5);
    setTimeout(() => {
      setFormSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Back to Restaurants Link */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#070329] transition group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Culinary Grid
      </Link>

      {/* Floating Add Confirmation Banner */}
      {addedBanner && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 bg-[#070329] border border-blue-900 text-white py-3.5 px-6 rounded-2xl shadow-2xl flex items-center gap-3 z-50 text-xs animate-slideUp">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center p-1">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span>Added <b>{addedBanner}</b> to your basket!</span>
        </div>
      )}

      {/* Modern state-driven Overwrite Confirmation Modal (Avoiding blocked window.confirm scripts) */}
      {productToOverwrite && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-105 animate-in zoom-in-95 duration-200 p-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold block">Cart Overwrite Alert</span>
              <h3 className="text-base font-extrabold text-[#070329] tracking-tight">Replace Current Food Basket?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your cart already contains dishes from <b className="text-gray-800">
                  {vendors.find(v => v.id === cart[0]?.product.vendorId)?.name || "another restaurant"}
                </b>. 
                Adding dishes from <b className="text-[#0ea5e9]">{vendorObj.name}</b> will clear your existing order basket. 
                Are you sure you want to proceed?
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setProductToOverwrite(null)}
                className="px-4 py-2 bg-gray-50 text-gray-550 border border-gray-100 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel, Keep Existing
              </button>
              <button 
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Yes, Replace Basket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Header Jumbotron banner */}
      <section className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-md">
        <div className="h-60 sm:h-80 w-full bg-gray-100 relative">
          <img
            src={vendorObj.coverImage || vendorObj.image}
            alt={vendorObj.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"></div>
          
          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white hover:scale-110 transition duration-300 shadow-md cursor-pointer flex items-center justify-center z-10 border border-white/25"
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart className={`w-5.5 h-5.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`} />
          </button>
          
          {/* Logo overlay element if a distinct cover image is set */}
          {vendorObj.coverImage && vendorObj.image && (
            <div className="absolute top-6 left-6 w-16 h-16 rounded-2xl border-2 border-white bg-white shadow-xl overflow-hidden shrink-0 hidden sm:block">
              <img src={vendorObj.image} alt={vendorObj.name} className="w-full h-full object-cover animate-fade-in" />
            </div>
          )}
          
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="py-1 px-3 bg-[#0ea5e9] text-white text-[10px] font-extrabold uppercase rounded-full">
                {vendorObj.cuisine}
              </span>
              {!isVendorOpen(vendorObj) && (
                <span className="py-1 px-3 bg-red-600 text-white text-[10px] font-extrabold uppercase rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Closed
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {vendorObj.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed max-w-2xl">
              {vendorObj.description}
            </p>
          </div>
        </div>

        {/* Info Block bar */}
        <div className="p-6 flex flex-wrap gap-y-4 gap-x-6 items-center justify-between text-xs text-gray-500 bg-white">
          <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-extrabold text-[#070329] text-sm">{vendorObj.rating.toFixed(1)}</span>
              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Approved Stars</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-[#070329]">{vendorObj.address}</span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0ea5e9]" />
              <span className="font-semibold text-gray-700">
                {vendorObj.prepTime || 20} mins prep
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {currency}{(vendorObj.deliveryFee ?? 750).toLocaleString()} Delivery
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-50/50 py-1.5 px-3.5 rounded-full border border-blue-500/10">
            <ShieldCheck className="w-4 h-4 text-[#0ea5e9]" />
            <span className="font-black text-[#070329] uppercase tracking-wider text-[9px]">{vendorObj.category || "restaurant"}</span>
          </div>
        </div>
      </section>

      {/* Interactive Tabs Header matching image mockup */}
      <section className="border-b border-gray-100 flex gap-8">
        <button 
          onClick={() => setActiveTab("menu")}
          className={`py-3.5 text-sm font-extrabold border-b-2 transition uppercase tracking-wider ${
            activeTab === "menu" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-gray-400 hover:text-[#070329]"
          }`}
        >
          Menu
        </button>
        <button 
          onClick={() => setActiveTab("reviews")}
          className={`py-3.5 text-sm font-extrabold border-b-2 transition uppercase tracking-wider ${
            activeTab === "reviews" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-gray-400 hover:text-[#070329]"
          }`}
        >
          Reviews ({vendorReviews.length})
        </button>
        <button 
          onClick={() => setActiveTab("info")}
          className={`py-3.5 text-sm font-extrabold border-b-2 transition uppercase tracking-wider ${
            activeTab === "info" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-gray-400 hover:text-[#070329]"
          }`}
        >
          Info & Hours
        </button>
        {vendorObj.receiptPickupEnabled !== false && receiptPickupConfig?.isEnabled !== false && (
          <button 
            onClick={() => setActiveTab("pickup")}
            className={`py-3.5 text-sm font-extrabold border-b-2 transition uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === "pickup" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-gray-400 hover:text-[#070329]"
            }`}
          >
            <Truck className="w-4 h-4" /> Pickup with Receipt
          </button>
        )}
      </section>

      {/* Dynamic Tab Body content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* MENU TAB */}
        {activeTab === "menu" && (
          <>
            {/* Scroll Anchor Menus on Left size */}
            <div className="lg:col-span-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm sticky top-28 space-y-1.5 hidden lg:block">
              <span className="text-[10px] uppercase font-mono text-gray-400 font-black block mb-2 px-2 tracking-widest">Menu Sections</span>
              {categoriesList.map((cat: string) => (
                <a
                  key={cat}
                  href={`#cat-${cat.toLowerCase()}`}
                  className="block px-3 py-2 text-xs font-bold text-gray-500 hover:text-[#0ea5e9] hover:bg-gray-50 rounded-xl transition"
                >
                  {cat}
                </a>
              ))}
            </div>

            {/* Dynamic Products listings */}
            <div className="lg:col-span-9 space-y-12">
              {categoriesList.length > 0 ? (
                categoriesList.map((cat: string) => (
                  <section key={cat} id={`cat-${cat.toLowerCase()}`} className="space-y-4 scroll-mt-24">
                    <h3 className="text-xs font-black text-[#070329] uppercase tracking-wider border-b border-gray-100 pb-2">
                      {cat || "Delicacies"}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {vendorProducts
                        .filter(p => p.category === cat)
                        .map((product) => {
                          const qtyInCart = cart.filter(ci => ci.product.id === product.id).reduce((sum, ci) => sum + ci.quantity, 0);
                          return (
                            <div 
                              key={product.id} 
                              className={`bg-white p-4 rounded-3xl border flex gap-4 transition hover:shadow-lg ${
                                product.isAvailable ? "border-gray-100" : "border-gray-100 opacity-60 bg-gray-50"
                              }`}
                            >
                              {/* Product Cover image */}
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gray-50 shrink-0 relative">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {!product.isAvailable && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                    Sold Out
                                  </div>
                                )}
                              </div>

                              {/* Product Details info */}
                              <div className="flex-grow flex flex-col justify-between">
                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-xs sm:text-sm text-gray-950 leading-tight">
                                    {product.name}
                                  </h4>
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                    {product.description}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <span className="font-extrabold text-[#070329] text-xs sm:text-sm font-mono">
                                    {currency}{(product.price ?? 0).toLocaleString()}
                                  </span>

                                  {!isVendorOpen(vendorObj) ? (
                                    <span className="text-[10px] font-black text-red-650 bg-red-50 py-1.5 px-3 rounded-xl border border-red-100 uppercase tracking-wider">
                                      Closed
                                    </span>
                                  ) : product.isAvailable ? (
                                    qtyInCart > 0 ? (
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 bg-gray-150 py-1 px-2 rounded-xl border border-gray-200">
                                          <button
                                            onClick={() => {
                                              const lastItem = [...cart].reverse().find(ci => ci.product.id === product.id);
                                              if (lastItem) {
                                                updateCartQuantity(lastItem.id, lastItem.quantity - 1);
                                              }
                                            }}
                                            className="text-gray-600 hover:text-red-500 font-bold text-sm cursor-pointer"
                                            title="Reduce quantity"
                                          >
                                            <Minus className="w-3.5 h-3.5" />
                                          </button>
                                          <span className="text-xs font-extrabold font-mono min-w-4 text-center">{qtyInCart}</span>
                                          <button
                                            onClick={() => {
                                              const lastItem = [...cart].reverse().find(ci => ci.product.id === product.id);
                                              if (lastItem) {
                                                updateCartQuantity(lastItem.id, lastItem.quantity + 1);
                                              }
                                            }}
                                            className="text-gray-600 hover:text-green-500 font-bold text-sm cursor-pointer"
                                            title="Increase quantity"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        {((product.addons && product.addons.length > 0) || (product.addonGroups && product.addonGroups.length > 0)) && (
                                          <button
                                            onClick={() => handleCustomizeOrAdd(product)}
                                            className="text-[9px] text-[#0ea5e9] font-extrabold hover:underline block cursor-pointer"
                                          >
                                            + Customize Extra
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleCustomizeOrAdd(product)}
                                        className="p-1.5 px-4 bg-[#070329] hover:bg-[#0ea5e9] text-white font-extrabold text-[10px] uppercase rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add</span>
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 py-1 px-2 rounded-lg">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-sm font-bold text-gray-700">No products entered yet</p>
                  <p className="text-xs text-gray-400 mt-1">This restaurant hasn't uploaded menu details yet.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div className="lg:col-span-12 space-y-6 max-w-2xl">
            {/* WRITE A REVIEW FORM */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#070329] uppercase tracking-wider">Share your experience</h3>
              
              {currentUser ? (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
                      {formError}
                    </div>
                  )}
                  {formSuccess && (
                    <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-xl text-xs font-semibold">
                      ✓ Your review has been published successfully!
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setNewRating(stars)}
                          className="focus:outline-none cursor-pointer transform hover:scale-110 transition"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              stars <= newRating
                                ? "text-amber-500 fill-amber-500"
                                : "text-gray-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Your Comment:</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="What did you love about their food? Be specific!"
                      className="w-full text-xs p-3.5 border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] min-h-[90px] font-medium text-[#070329] placeholder-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0ea5e9] text-white py-3 px-5 rounded-2xl text-xs font-bold hover:bg-[#0284c7] cursor-pointer shadow-sm hover:shadow transition"
                  >
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-100">
                  <p className="text-xs font-bold text-gray-600">Want to write a review?</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Please sign in to your customer account to leave feedback.</p>
                </div>
              )}
            </div>

            {/* REVIEWS LIST */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#070329] uppercase tracking-wider px-1">
                Customer Feedback ({vendorReviews.length})
              </h3>

              {vendorReviews.length > 0 ? (
                vendorReviews.map(r => (
                  <div key={r.id} className="bg-white p-5 rounded-3xl border border-gray-100 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#070329]">{r.author}</h4>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : "Recently"}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-650 leading-relaxed font-medium">"{r.comment}"</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-500">No reviews yet</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Be the first to share your dining experience!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INFO & HOURS TAB */}
        {activeTab === "info" && (
          <div className="lg:col-span-12 space-y-6 max-w-2xl bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-[#070329] uppercase tracking-wider">Merchant Details</h3>
            
            <div className="space-y-4 text-xs font-medium text-gray-600">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span>Opening Hours</span>
                <span className="font-bold text-[#070329]">
                  {vendorObj.openingTime && vendorObj.closingTime 
                    ? `${vendorObj.openingTime} - ${vendorObj.closingTime} Daily` 
                    : "08:00 AM - 10:00 PM Daily"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span>Address</span>
                <span className="font-bold text-[#070329] text-right max-w-xs">{vendorObj.address}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span>Estimated Prep/Packing Speed</span>
                <span className="font-bold text-green-600">Fast ({vendorObj.prepTime || 20} min)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span>Merchant Category</span>
                <span className="font-bold text-[#0ea5e9] uppercase font-mono">{vendorObj.category || "restaurant"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Support Channel</span>
                <span className="font-bold text-[#0ea5e9]">hello@owodefood.com</span>
              </div>
            </div>
          </div>
        )}

        {/* RECEIPT PICKUP & DELIVERY TAB */}
        {activeTab === "pickup" && (
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Schedule Booking Form */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-md space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#070329] tracking-tight">Rider Dispatch for Pre-Purchased Items</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Have you already ordered or bought an item directly from <span className="font-bold text-[#070329]">{vendorObj?.name}</span>? Upload your receipt invoice or QR code below, and a rider will pick it up and deliver it to your doorstep.
                </p>
              </div>

              {!currentUser ? (
                <div className="p-6 bg-[#070329]/5 border border-dashed border-[#070329]/10 rounded-2xl text-center space-y-4">
                  <p className="text-xs font-semibold text-gray-650 leading-relaxed">
                    You must be signed in to your customer account to request rider pickup & delivery.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block px-5 py-2.5 bg-[#0ea5e9] text-white rounded-xl text-xs font-bold hover:bg-[#0284c7] shadow transition cursor-pointer"
                  >
                    Go to Authentication
                  </Link>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!pickupAddress.trim()) {
                    setPickupErrorMsg("Please specify a delivery destination address.");
                    return;
                  }
                  if (!receiptImage && !presetReceipt) {
                    setPickupErrorMsg("Please upload a receipt/QR code image or pick a verification preset below.");
                    return;
                  }

                  setIsSubmittingPickup(true);
                  setPickupErrorMsg(null);
                  setPickupSuccessMsg(null);

                  setTimeout(() => {
                    const chosenReceipt = receiptImage || presetReceipt;
                    const res = createReceiptPickupOrder({
                      customerId: currentUser.id,
                      customerName: currentUser.name,
                      customerPhone: currentUser.phone,
                      vendorId: vendorObj?.id || "",
                      vendorName: vendorObj?.name || "",
                      vendorAddress: vendorObj?.address || "",
                      deliveryAddress: pickupAddress,
                      receiptImageOrQr: chosenReceipt,
                      receiptNote: pickupNote,
                      deliveryFee: dynamicDeliveryFee,
                      paymentMethod: paymentMethod
                    });

                    setIsSubmittingPickup(false);
                    if (res.success) {
                      setPickupSuccessMsg("Rider pickup delivery booked successfully! Track its status on the right.");
                      // Reset fields
                      setPickupAddress("");
                      setPickupNote("");
                      setReceiptImage("");
                      setPresetReceipt("");
                    } else {
                      setPickupErrorMsg(res.error || "Failed to submit booking.");
                    }
                  }, 800);
                }} className="space-y-4">
                  {pickupSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-semibold">
                      ✓ {pickupSuccessMsg}
                    </div>
                  )}

                  {pickupErrorMsg && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
                      ⚠ {pickupErrorMsg}
                    </div>
                  )}

                  {/* Saved Addresses Quick Pick */}
                  {savedAddresses && savedAddresses.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-black text-gray-400">Quick-Pick Saved Address</label>
                      <div className="flex flex-wrap gap-2">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => setPickupAddress(`${addr.streetAddress}, ${addr.district}`)}
                            className="px-3 py-1.5 bg-gray-50 hover:bg-[#0ea5e9]/10 border border-gray-150 hover:border-[#0ea5e9] rounded-xl text-[10px] font-bold text-gray-700 transition text-left cursor-pointer"
                          >
                            📍 {addr.streetAddress} ({addr.district})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Address Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-black text-gray-400 block">Delivery Address Destination</label>
                    <input
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Enter street name, house number, landmarks..."
                      className="w-full text-xs p-3.5 border border-gray-150 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] font-medium text-[#070329]"
                    />
                  </div>

                  {/* Verification Receipt Selection / File Upload */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-black text-gray-400 block">Receipt or QR Code Verification</label>
                    
                    {/* Sandbox Preset Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPresetReceipt("PRESET_INVOICE_1");
                          setReceiptImage("");
                        }}
                        className={`p-2.5 rounded-xl border text-[10px] font-extrabold transition flex items-center gap-1.5 cursor-pointer justify-center ${
                          presetReceipt === "PRESET_INVOICE_1"
                            ? "bg-sky-50 border-[#0ea5e9] text-sky-950"
                            : "bg-white border-gray-150 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        📄 Preset Store Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPresetReceipt("PRESET_QR_2");
                          setReceiptImage("");
                        }}
                        className={`p-2.5 rounded-xl border text-[10px] font-extrabold transition flex items-center gap-1.5 cursor-pointer justify-center ${
                          presetReceipt === "PRESET_QR_2"
                            ? "bg-sky-50 border-[#0ea5e9] text-sky-950"
                            : "bg-white border-gray-150 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        📱 Preset QR Voucher
                      </button>
                    </div>

                    <div className="text-center py-1 text-[10px] font-bold text-gray-400 uppercase font-mono">or upload custom file</div>

                    {/* Drag and Drop File Input */}
                    <label className="border-2 border-dashed border-gray-200 hover:border-[#0ea5e9] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-gray-50/20 hover:bg-sky-50/10 text-center space-y-1 relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onloadend = () => {
                              setReceiptImage(r.result as string);
                              setPresetReceipt("");
                            };
                            r.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <span className="text-xs font-bold text-gray-600">📁 Click to Select or Drop Receipt Image</span>
                      <span className="text-[9px] text-gray-400 font-semibold">Supports JPEG, PNG, or screenshots</span>
                    </label>

                    {/* Thumbnail Preview */}
                    {(receiptImage || presetReceipt) && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-150">
                        <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                          {presetReceipt === "PRESET_INVOICE_1" && "📄"}
                          {presetReceipt === "PRESET_QR_2" && "📱"}
                          {receiptImage && <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />}
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-extrabold text-[#070329]">Verification Asset Selected</p>
                          <p className="text-[9px] text-gray-400 font-semibold uppercase font-mono">
                            {presetReceipt ? "Built-in Simulator Preset" : "User-Uploaded Custom File"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Receipt Note */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-black text-gray-400 block">Rider Verification Instructions</label>
                    <textarea
                      value={pickupNote}
                      onChange={(e) => setPickupNote(e.target.value)}
                      placeholder="e.g. Ask for counter #2 manager Yusuf. Give them code #4492."
                      className="w-full text-xs p-3.5 border border-gray-150 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] min-h-[70px] font-medium text-[#070329] placeholder-gray-400"
                    />
                  </div>

                  {/* Delivery Fee Settlement Method */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-black text-gray-400 block">Delivery Settlement Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentGateways?.filter(g => g.isEnabled).map(gateway => (
                        <div
                          key={gateway.id}
                          onClick={() => setPaymentMethod(gateway.id)}
                          className={`p-3.5 rounded-2xl border transition text-left cursor-pointer relative select-none flex flex-col justify-between ${
                            paymentMethod === gateway.id
                              ? "bg-sky-50/55 border-[#0ea5e9] text-sky-950"
                              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black capitalize">{gateway.name}</span>
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] text-white ${
                              paymentMethod === gateway.id ? "bg-[#0ea5e9] border-[#0ea5e9]" : "border-gray-300"
                            }`}>{paymentMethod === gateway.id && "✓"}</span>
                          </div>
                          {gateway.id === "wallet" && (
                            <p className="text-[10px] text-gray-400 font-semibold mt-1">
                              Wallet Balance: {currency}{getUserWalletBalance(currentUser.id).toLocaleString()}
                            </p>
                          )}
                          {gateway.id === "cash" && (
                            <p className="text-[10px] text-gray-400 font-semibold mt-1">Pay rider when items arrive</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {paymentMethod === "wallet" && getUserWalletBalance(currentUser.id) < (dynamicDeliveryFee + (receiptPickupConfig?.flatServiceFee || 0)) && (
                      <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-xl border border-amber-100">
                        ⚠ Your wallet balance is too low to cover the total amount. Please choose another method or fund your wallet.
                      </p>
                    )}
                  </div>

                  {/* Fee Summary */}
                  <div className="space-y-1">
                    <div className="p-3 bg-gray-50 rounded-t-2xl border border-gray-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-600">Delivery Dispatch Fee</span>
                      </div>
                      <span className="text-gray-900 font-bold font-mono">{currency}{(dynamicDeliveryFee).toLocaleString()}</span>
                    </div>
                    {(receiptPickupConfig?.flatServiceFee || 0) > 0 && (
                      <div className="p-3 bg-gray-50 border-x border-b border-gray-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-gray-600">Platform Service Fee</span>
                        </div>
                        <span className="text-gray-900 font-bold font-mono">{currency}{(receiptPickupConfig.flatServiceFee).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="p-4 bg-sky-50 rounded-b-2xl border-x border-b border-sky-100 flex justify-between items-center text-sm">
                      <span className="font-extrabold text-[#070329]">Total</span>
                      <span className="text-[#070329] font-black">{currency}{(dynamicDeliveryFee + (receiptPickupConfig?.flatServiceFee || 0)).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!paymentMethod || isSubmittingPickup || (paymentMethod === "wallet" && getUserWalletBalance(currentUser.id) < (dynamicDeliveryFee + (receiptPickupConfig?.flatServiceFee || 0)))}
                    className={`w-full text-white py-3 px-5 rounded-2xl text-xs font-bold shadow transition flex items-center justify-center gap-2 ${
                      !paymentMethod || isSubmittingPickup || (paymentMethod === "wallet" && getUserWalletBalance(currentUser.id) < (dynamicDeliveryFee + (receiptPickupConfig?.flatServiceFee || 0)))
                        ? "bg-gray-300 cursor-not-allowed text-gray-500 shadow-none"
                        : "bg-[#0ea5e9] hover:bg-[#0284c7] cursor-pointer"
                    }`}
                  >
                    {isSubmittingPickup ? "Dispatched Rider..." : "Schedule Rider Pickup"}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Active and Past Pickup Orders List */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#070329] uppercase tracking-wider px-1">
                Your Pickup History at this Store
              </h3>

              {!currentUser ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-500">Sign in to view history</p>
                </div>
              ) : (() => {
                const customerPickups = (receiptPickupOrders || []).filter(
                  o => o.customerId === currentUser.id && o.vendorId === id
                );

                if (customerPickups.length === 0) {
                  return (
                    <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-gray-200 space-y-1">
                      <p className="text-xs font-bold text-gray-500">No pickup requests here yet</p>
                      <p className="text-[10px] text-gray-400 leading-normal max-w-xs mx-auto px-4">
                        Your booked receipt deliveries from {vendorObj?.name} will appear right here in real-time.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {customerPickups.map((o) => (
                      <div key={o.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] uppercase font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Ref: #{o.id}</span>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                              {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "Date Unknown"}
                            </p>
                          </div>
                          
                          {/* Status pill */}
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            o.status === "pending" ? "bg-amber-50 text-amber-600" :
                            o.status === "accepted" ? "bg-blue-50 text-blue-600" :
                            o.status === "picked_up" ? "bg-indigo-50 text-indigo-600" :
                            o.status === "delivered" ? "bg-emerald-50 text-emerald-600" :
                            "bg-red-50 text-red-600"
                          }`}>
                            {o.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Order Details */}
                        <div className="space-y-2 text-xs text-gray-600 font-medium border-t border-b border-gray-50 py-3">
                          <div className="flex justify-between">
                            <span>Delivery to:</span>
                            <span className="font-extrabold text-[#070329] text-right truncate max-w-[180px]">{o.deliveryAddress}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rider Assigned:</span>
                            <span className="font-extrabold text-[#070329]">{o.riderName || "Searching for rider..."}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment Method:</span>
                            <span className="font-extrabold text-[#070329] uppercase font-mono text-[10px]">{o.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment Status:</span>
                            <span className={`font-extrabold uppercase text-[10px] ${o.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{o.paymentStatus}</span>
                          </div>
                        </div>

                        {/* Interactive cancellation */}
                        {o.status === "pending" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to cancel this pickup request?")) {
                                cancelReceiptPickupOrder(o.id);
                              }
                            }}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-[10px] font-bold transition cursor-pointer text-center"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>

      {/* Customize Product Modal */}
      {customizingProduct && (() => {
        const addonGroups = customizingProduct.addonGroups && customizingProduct.addonGroups.length > 0
          ? customizingProduct.addonGroups
          : customizingProduct.addons && customizingProduct.addons.length > 0
            ? [{
                id: "legacy-group",
                name: "Available Addons",
                isRequired: false,
                maxSelections: customizingProduct.maxAddons,
                addons: customizingProduct.addons
              }]
            : [];

        const isAllSelectionsValid = addonGroups.every(isGroupValid);

        const currentAddonsList = (Object.values(addonSelections) as any[]).map(sel => ({
          ...sel.addon,
          quantity: sel.quantity,
          groupId: sel.groupId
        }));

        const totalCustomPrice = (customizingProduct.price ?? 0) + currentAddonsList.reduce((sum, a) => sum + ((a.price ?? 0) * (a.quantity ?? 1)), 0);

        return (
          <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-gray-150 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              {/* Header image & cover */}
              <div className="h-44 w-full bg-gray-50 relative shrink-0">
                <img
                  src={customizingProduct.image}
                  alt={customizingProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setCustomizingProduct(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <h3 className="text-base font-black tracking-tight">{customizingProduct.name}</h3>
                  <p className="text-[10px] text-gray-200 leading-snug line-clamp-1 mt-0.5">{customizingProduct.description}</p>
                </div>
              </div>

              {/* Customize list (scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs">
                {addonGroups.map((group: any) => {
                  const groupTotalSelected = getGroupSelectionCount(group.id);
                  const isSingleSelect = group.maxSelections === 1;

                  return (
                    <div key={group.id} className="space-y-3">
                      {/* Group Header */}
                      <div className="pb-1.5 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <h4 className="font-extrabold text-xs text-[#070329] uppercase tracking-wide">{group.name}</h4>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            {group.isRequired ? (
                              <span className="text-amber-600 font-bold">Required (Choose {group.minSelections ?? 1})</span>
                            ) : (
                              <span>Optional {group.maxSelections ? `(Choose up to ${group.maxSelections})` : ""}</span>
                            )}
                          </p>
                        </div>
                        {isGroupValid(group) ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg font-black uppercase font-mono">
                            Satisfied
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-lg font-black uppercase font-mono animate-pulse">
                            Required
                          </span>
                        )}
                      </div>

                      {/* Group Options */}
                      <div className="space-y-2">
                        {group.addons.map((addon: any) => {
                          const selection = addonSelections[addon.id];
                          const quantity = selection ? selection.quantity : 0;
                          const isSelected = quantity > 0;

                          const maxGroupSelections = group.maxSelections;
                          const groupLimitReached = maxGroupSelections !== undefined && maxGroupSelections > 0 && groupTotalSelected >= maxGroupSelections;
                          const isAddonDisabled = !isSelected && groupLimitReached && !isSingleSelect;

                          const handleIncrement = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (maxGroupSelections !== undefined && maxGroupSelections > 0 && groupTotalSelected >= maxGroupSelections) {
                              return;
                            }
                            const maxPerAddon = group.maxQuantityPerAddon || 99;
                            if (quantity >= maxPerAddon) return;

                            setAddonSelections({
                              ...addonSelections,
                              [addon.id]: { addon, quantity: quantity + 1, groupId: group.id }
                            });
                          };

                          const handleDecrement = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (quantity <= 1) {
                              const updated = { ...addonSelections };
                              delete updated[addon.id];
                              setAddonSelections(updated);
                            } else {
                              setAddonSelections({
                                ...addonSelections,
                                [addon.id]: { addon, quantity: quantity - 1, groupId: group.id }
                              });
                            }
                          };

                          const handleToggle = () => {
                            if (isSingleSelect) {
                              const updated = { ...addonSelections };
                              Object.keys(updated).forEach(id => {
                                if (updated[id].groupId === group.id) {
                                  delete updated[id];
                                }
                              });
                              updated[addon.id] = { addon, quantity: 1, groupId: group.id };
                              setAddonSelections(updated);
                            } else {
                              if (isSelected) {
                                const updated = { ...addonSelections };
                                delete updated[addon.id];
                                setAddonSelections(updated);
                              } else {
                                if (isAddonDisabled) return;
                                setAddonSelections({
                                  ...addonSelections,
                                  [addon.id]: { addon, quantity: 1, groupId: group.id }
                                });
                              }
                            }
                          };

                          return (
                            <div 
                              key={addon.id}
                              onClick={handleToggle}
                              className={`flex items-center justify-between p-3 rounded-2xl border transition text-left select-none ${
                                isSelected 
                                  ? "bg-sky-50/40 border-[#0ea5e9] text-sky-950 cursor-pointer" 
                                  : isAddonDisabled
                                    ? "bg-gray-50 border-gray-100 opacity-40 text-gray-400 cursor-not-allowed"
                                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded flex items-center justify-center transition border ${
                                  isSingleSelect ? "rounded-full" : "rounded-md"
                                } ${
                                  isSelected ? "bg-[#0ea5e9] border-[#0ea5e9]" : "border-gray-300"
                                }`}>
                                  {isSelected && (
                                    isSingleSelect
                                      ? <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                      : <Check className="w-3 h-3 text-white stroke-[3px]" />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-xs">{addon.name}</span>
                                  {addon.price > 0 && (
                                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      +{currency}{(addon.price ?? 0).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center">
                                {group.allowMultipleQuantity && isSelected && (
                                  <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-xl px-1.5 py-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={handleDecrement}
                                      className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-5 text-center text-xs font-black text-[#070329] font-mono">{quantity}</span>
                                    <button
                                      type="button"
                                      onClick={handleIncrement}
                                      className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {!group.allowMultipleQuantity && isSelected && (
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#0ea5e9] bg-sky-50 border border-sky-100 rounded-lg px-2 py-0.5 font-mono">
                                    Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sticky Actions bar */}
              <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="space-y-0.5 pl-2">
                  <span className="text-[9px] text-gray-400 uppercase font-mono font-bold leading-none block">Total Item Est.</span>
                  <span className="text-sm font-black text-[#070329] font-mono leading-none block mt-0.5">
                    {currency}{totalCustomPrice.toLocaleString()}
                  </span>
                </div>

                <button
                  disabled={!isAllSelectionsValid}
                  onClick={() => {
                    if (isAllSelectionsValid) {
                      handleAddProductWithCustomExtras(customizingProduct, currentAddonsList);
                    }
                  }}
                  className={`py-3 px-6 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-lg transition flex items-center gap-1.5 ${
                    isAllSelectionsValid 
                      ? "bg-[#070329] hover:bg-[#0ea5e9] cursor-pointer" 
                      : "bg-gray-300 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Basket</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
