import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { isVendorOpen } from "../types";
import { Star, MapPin, ArrowLeft, Plus, Minus, Check, ThumbsUp, Clock, Info, ShieldCheck, X, Truck, AlertTriangle } from "lucide-react";

export const CustomerVendorMenu: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { vendors, products, addToCart, cart, updateCartQuantity, clearCart, currency, reviews, addReview, currentUser } = useDatabase();
  const [addedBanner, setAddedBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "reviews" | "info">("menu");
  const [productToOverwrite, setProductToOverwrite] = useState<any | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  // New review form states
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  const vendorObj = vendors.find(v => v.id === id);
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
    if (p.addons && p.addons.length > 0) {
      setCustomizingProduct(p);
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
      return;
    }

    if (!newComment.trim()) {
      setFormError("Review comment cannot be empty.");
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
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
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
                                    {currency}{product.price.toLocaleString()}
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
                                        {product.addons && product.addons.length > 0 && (
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

      </div>

      {/* Customize Product Modal */}
      {customizingProduct && (
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
            <div className="p-6 overflow-y-auto space-y-4 flex-grow text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#0ea5e9] font-black">Choose Food Addons</span>
                  {customizingProduct.maxAddons !== undefined && customizingProduct.maxAddons > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold mt-0.5">
                      ⚠️ Limit: Choose up to {customizingProduct.maxAddons} {customizingProduct.maxAddons === 1 ? "addon" : "addons"}
                    </span>
                  )}
                </div>
                <span className="text-[10px] bg-sky-50 text-[#0ea5e9] py-0.5 px-2 rounded-md font-bold uppercase font-mono">
                  {selectedAddons.length} selected
                </span>
              </div>
 
              <div className="space-y-2.5">
                {customizingProduct.addons.map((addon: any) => {
                  const isChecked = selectedAddons.some(a => a.id === addon.id);
                  const limitReached = customizingProduct.maxAddons !== undefined && customizingProduct.maxAddons > 0 && selectedAddons.length >= customizingProduct.maxAddons;
                  const isDisabled = !isChecked && limitReached;

                  return (
                    <button
                      key={addon.id}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
                        } else {
                          setSelectedAddons([...selectedAddons, addon]);
                        }
                      }}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition ${
                        isChecked 
                          ? "bg-sky-50/50 border-[#0ea5e9] text-sky-950 cursor-pointer" 
                          : isDisabled
                            ? "bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed text-gray-400"
                            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                          isChecked ? "bg-[#0ea5e9] border-[#0ea5e9]" : "border-gray-300"
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                        </div>
                        <span className="font-extrabold text-xs">{addon.name}</span>
                      </div>
                      <span className="font-mono font-extrabold text-xs text-gray-900 bg-gray-100/80 px-2 py-0.5 rounded-lg border border-gray-150">
                        +{currency}{addon.price.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Actions bar */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between shrink-0">
              <div className="space-y-0.5 pl-2">
                <span className="text-[9px] text-gray-400 uppercase font-mono font-bold leading-none block">Total Item Est.</span>
                <span className="text-sm font-black text-[#070329] font-mono leading-none block mt-0.5">
                  {currency}{(customizingProduct.price + selectedAddons.reduce((sum, a) => sum + a.price, 0)).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => {
                  handleAddProductWithCustomExtras(customizingProduct, selectedAddons);
                }}
                className="py-3 px-6 bg-[#070329] hover:bg-[#0ea5e9] text-white font-extrabold text-[10px] uppercase rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Basket</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
