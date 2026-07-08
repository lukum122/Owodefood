import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { isVendorOpen } from "../types";
import { Search, Star, MapPin, Sparkles, Filter, ChevronRight, ArrowRight, LayoutGrid, Store, UtensilsCrossed, Apple, Pill, ShoppingBag, Flame, Shuffle, ArrowUpDown, Heart } from "lucide-react";
import * as LucideIcons from "lucide-react";

export const CustomerHome: React.FC = () => {
  const { vendors, categories, products, vendorCategories, orders, selectedLocation, setSelectedLocation, availableLocations = [], currentUser } = useDatabase();
  
  // Sync favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const key = `fd_favorites_${currentUser?.id || "guest"}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : ["v-1", "v-2"];
  });

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

  const handleToggleFavorite = (vendorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const key = `fd_favorites_${currentUser?.id || "guest"}`;
    let newFavs: string[];
    if (favorites.includes(vendorId)) {
      newFavs = favorites.filter(id => id !== vendorId);
    } else {
      newFavs = [...favorites, vendorId];
    }
    localStorage.setItem(key, JSON.stringify(newFavs));
    setFavorites(newFavs);
    window.dispatchEvent(new Event("fd-favorites-updated"));
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMerchantCategory, setSelectedMerchantCategory] = useState<string | null>(null);
  
  // States for delivery zone search dropdown on homepage
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  
  // Sorting options for top categories
  const [categoriesSortMode, setCategoriesSortMode] = useState<"popularity" | "products" | "shuffle" | "alphabetical">("popularity");
  const [shuffledSeed, setShuffledSeed] = useState<number>(0);

  // Maps category names to direct background colors for rich icons like in mockup
  const getCatBg = (name: string) => {
    switch(name.toLowerCase()) {
      case "burgers":
      case "burger":
        return "bg-orange-50 text-orange-600";
      case "pizza":
        return "bg-red-50 text-red-600";
      case "chicken":
        return "bg-amber-50 text-amber-600";
      case "drinks":
      case "drink":
        return "bg-blue-50 text-blue-600";
      case "desserts":
      case "dessert":
        return "bg-pink-50 text-pink-600";
      case "groceries":
      case "grocery":
        return "bg-emerald-50 text-emerald-600";
      case "vegetables":
      case "vegetable":
        return "bg-green-50 text-green-600";
      case "fruits":
      case "fruit":
        return "bg-red-50 text-red-500";
      case "spices":
        return "bg-amber-50 text-amber-700";
      case "grains":
        return "bg-yellow-50 text-yellow-700";
      case "wellness":
      case "vitamins":
      case "supplements":
        return "bg-purple-50 text-purple-600";
      case "hygiene":
      case "first aid":
      case "skincare":
        return "bg-sky-50 text-sky-600";
      case "snacks":
        return "bg-amber-50 text-amber-600";
      case "toiletries":
      case "household":
        return "bg-teal-50 text-teal-600";
      case "stationery":
        return "bg-indigo-50 text-indigo-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const emojiMap: Record<string, string> = {
    "burgers": "🍔",
    "burger": "🍔",
    "pizza": "🍕",
    "chicken": "🍗",
    "drinks": "🥤",
    "drink": "🥤",
    "desserts": "🍰",
    "dessert": "🍰",
    "salads": "🥗",
    "salad": "🥗",
    "local dishes": "🍲",
    "traditional": "🍲",
    "swallow": "🫓",
    "rice": "🍚",
    "pasta": "🍝",
    "fast food": "🍟",
    "medicines": "💊",
    "medicine": "💊",
    "otc": "💊",
    "prescriptions": "🩺",
    "vitamins": "✨",
    "supplements": "🔋",
    "first aid": "🩹",
    "skincare": "🧴",
    "wellness": "🌿",
    "groceries": "🛒",
    "grocery": "🛒",
    "vegetables": "🥦",
    "vegetable": "🥦",
    "fruits": "🍎",
    "fruit": "🍎",
    "spices": "🌶️",
    "grains": "🌾",
    "dairy": "🧀",
    "bakery": "🍞",
    "meat": "🥩",
    "household": "🧹",
    "toiletries": "🧼",
    "snacks": "🍪",
    "beverages": "🧃",
    "electronics": "🔌",
    "accessories": "🎒",
    "personal care": "🧴",
    "stationery": "✏️"
  };

  // Only display approved restaurants on the main customer page
  const approvedVendors = vendors.filter(v => v.status === "approved");

  // Calculate dynamic metrics and sorting for each category based on chosen merchant type
  const dynamicCategories = useMemo(() => {
    // Filter vendors to current selected merchant category
    const targetVendors = selectedMerchantCategory
      ? approvedVendors.filter(v => v.category === selectedMerchantCategory)
      : approvedVendors;

    const targetVendorIds = new Set(targetVendors.map(v => v.id));

    // Gather products of these vendors
    const relevantProducts = products.filter(p => targetVendorIds.has(p.vendorId));

    // Get unique product categories
    const uniqueCategoryNames: string[] = Array.from(
      new Set<string>(
        relevantProducts
          .map(p => p.category?.trim())
          .filter((cat): cat is string => !!cat)
      )
    );

    // Dynamic defaults if no products/categories found yet
    if (uniqueCategoryNames.length === 0) {
      if (selectedMerchantCategory === "restaurant") {
        uniqueCategoryNames.push("Burgers", "Pizza", "Chicken", "Drinks", "Desserts");
      } else if (selectedMerchantCategory === "pharmacy") {
        uniqueCategoryNames.push("Medicines", "Vitamins", "First Aid", "Skincare");
      } else if (selectedMerchantCategory === "shop") {
        uniqueCategoryNames.push("Snacks", "Toiletries", "Beverages", "Household");
      } else if (selectedMerchantCategory === "groceries") {
        uniqueCategoryNames.push("Vegetables", "Fruits", "Spices", "Grains");
      } else {
        uniqueCategoryNames.push("Burgers", "Pizza", "Chicken", "Drinks", "Desserts", "Groceries");
      }
    }

    // Map to beautiful UI model objects
    const baseList = uniqueCategoryNames.map((name, idx) => {
      const lowerName = name.toLowerCase();
      let icon = "📦";
      
      if (emojiMap[lowerName]) {
        icon = emojiMap[lowerName];
      } else {
        const foundKey = Object.keys(emojiMap).find(key => lowerName.includes(key) || key.includes(lowerName));
        if (foundKey) {
          icon = emojiMap[foundKey];
        } else {
          if (selectedMerchantCategory === "restaurant") icon = "🍔";
          else if (selectedMerchantCategory === "pharmacy") icon = "💊";
          else if (selectedMerchantCategory === "shop") icon = "🛍️";
          else if (selectedMerchantCategory === "groceries") icon = "🍎";
        }
      }

      return {
        id: `dyn-cat-${idx}`,
        name,
        icon,
      };
    });

    const popularityMap: Record<string, number> = {};
    const productsCountMap: Record<string, number> = {};

    baseList.forEach(cat => {
      popularityMap[cat.name] = 0;
      productsCountMap[cat.name] = 0;
    });

    // Count products under this subcategory
    relevantProducts.forEach(p => {
      if (p.category) {
        const cat = baseList.find(c => c.name.toLowerCase() === p.category.toLowerCase());
        if (cat) {
          productsCountMap[cat.name] += 1;
        }
      }
    });

    // Count order items matching this subcategory
    orders.forEach(order => {
      if (targetVendorIds.has(order.vendorId)) {
        order.items.forEach(item => {
          const p = products.find(prod => prod.id === item.productId);
          if (p && p.category) {
            const cat = baseList.find(c => c.name.toLowerCase() === p.category.toLowerCase());
            if (cat) {
              popularityMap[cat.name] += 1;
            }
          }
        });
      }
    });

    const enriched = baseList.map(cat => ({
      ...cat,
      ordersCount: popularityMap[cat.name] || 0,
      productsCount: productsCountMap[cat.name] || 0,
    }));

    // Sort based on current mode
    if (categoriesSortMode === "popularity") {
      return [...enriched].sort((a, b) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name));
    } else if (categoriesSortMode === "products") {
      return [...enriched].sort((a, b) => b.productsCount - a.productsCount || a.name.localeCompare(b.name));
    } else if (categoriesSortMode === "alphabetical") {
      return [...enriched].sort((a, b) => a.name.localeCompare(b.name));
    } else if (categoriesSortMode === "shuffle") {
      return [...enriched].sort((a, b) => {
        const hashA = (a.name.charCodeAt(0) * 17 + shuffledSeed) % 100;
        const hashB = (b.name.charCodeAt(0) * 17 + shuffledSeed) % 100;
        return hashA - hashB;
      });
    }

    return enriched;
  }, [selectedMerchantCategory, approvedVendors, products, orders, categoriesSortMode, shuffledSeed]);

  const filteredVendors = approvedVendors.filter(vendor => {
    // Check top-level merchant category
    if (selectedMerchantCategory && vendor.category !== selectedMerchantCategory) {
      return false;
    }

    const matchesVendor = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          vendor.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          vendor.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if any of the vendor's products matches the search
    const hasMatchingProduct = products.some(p => p.vendorId === vendor.id && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    ));

    const matchesSearch = matchesVendor || hasMatchingProduct;
    
    // Sub-category check: check if vendor cuisine OR any vendor product matches the selectedCategory
    const matchesCategory = selectedCategory 
      ? (vendor.cuisine.toLowerCase() === selectedCategory.toLowerCase() ||
         products.some(p => p.vendorId === vendor.id && p.category?.toLowerCase() === selectedCategory.toLowerCase()))
      : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12">
      
      {/* High-Fidelity Chowdeck-style Navigation & Subheader */}
      <div className="bg-white border border-gray-100 rounded-[28px] p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="relative">
          <button 
            onClick={() => setShowZoneDropdown(!showZoneDropdown)}
            className="flex items-center gap-3 text-left hover:opacity-90 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider font-mono">Delivery to</span>
              <span className="text-xs font-black text-[#070329] flex items-center gap-1.5">
                {selectedLocation || "Active Delivery Zone"}
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] text-gray-400 font-normal">▼</span>
              </span>
            </div>
          </button>

          {showZoneDropdown && (
            <div className="absolute left-0 mt-3 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-[#070329] uppercase tracking-wider">Select Delivery Zone</span>
                <button 
                  onClick={() => setShowZoneDropdown(false)}
                  className="text-gray-400 hover:text-gray-600 text-[10px] font-bold"
                >
                  ✕ Close
                </button>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="🔍 Search delivery zones..."
                  value={zoneSearch}
                  onChange={(e) => setZoneSearch(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 font-medium text-gray-900 bg-gray-50/50"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {availableLocations
                  .filter((loc) => loc.toLowerCase().includes(zoneSearch.toLowerCase()))
                  .map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setShowZoneDropdown(false);
                        setZoneSearch("");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition hover:bg-gray-50 ${
                        selectedLocation === loc ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{loc}</span>
                    </button>
                  ))}
                {availableLocations.filter((loc) => loc.toLowerCase().includes(zoneSearch.toLowerCase())).length === 0 && (
                  <div className="text-[10px] text-gray-400 text-center py-4">No matching zones found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Navigation Categories Row matching Chowdeck Mockup */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-t md:border-t-0 border-gray-50 pt-3 md:pt-0">
          
          {/* Browse All Tab */}
          <button
            onClick={() => {
              setSelectedMerchantCategory(null);
              setSelectedCategory(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold tracking-tight transition cursor-pointer relative shrink-0 ${
              selectedMerchantCategory === null
                ? "bg-amber-500/10 text-amber-600"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/85"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Browse All</span>
            {selectedMerchantCategory === null && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {vendorCategories && vendorCategories.map((catInfo) => {
            const IconComponent = (LucideIcons as any)[catInfo.iconName] || LucideIcons.ShoppingBag;
            
            const colorMap: Record<string, { bgActive: string; textActive: string; iconColor: string; barBg: string }> = {
              orange: { bgActive: "bg-orange-500/10 text-orange-600", textActive: "text-orange-600", iconColor: "text-orange-600", barBg: "bg-orange-500" },
              yellow: { bgActive: "bg-yellow-500/10 text-yellow-600", textActive: "text-yellow-600", iconColor: "text-yellow-600", barBg: "bg-yellow-500" },
              sky: { bgActive: "bg-sky-500/10 text-sky-600", textActive: "text-sky-600", iconColor: "text-sky-600", barBg: "bg-sky-500" },
              red: { bgActive: "bg-red-500/10 text-red-600", textActive: "text-red-600", iconColor: "text-red-600", barBg: "bg-red-500" },
              purple: { bgActive: "bg-purple-500/10 text-purple-600", textActive: "text-purple-600", iconColor: "text-purple-600", barBg: "bg-purple-500" },
              emerald: { bgActive: "bg-emerald-500/10 text-emerald-600", textActive: "text-emerald-600", iconColor: "text-emerald-600", barBg: "bg-emerald-500" },
              indigo: { bgActive: "bg-indigo-500/10 text-indigo-600", textActive: "text-indigo-600", iconColor: "text-indigo-600", barBg: "bg-indigo-500" },
              pink: { bgActive: "bg-pink-500/10 text-pink-600", textActive: "text-pink-600", iconColor: "text-pink-600", barBg: "bg-pink-500" },
            };

            const colors = colorMap[catInfo.color] || {
              bgActive: "bg-[#070329]/10 text-[#070329]",
              textActive: "text-[#070329]",
              iconColor: "text-[#070329]",
              barBg: "bg-[#070329]"
            };

            const isActive = selectedMerchantCategory === catInfo.id;

            return (
              <button
                key={catInfo.id}
                onClick={() => {
                  setSelectedMerchantCategory(catInfo.id);
                  setSelectedCategory(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold tracking-tight transition cursor-pointer relative shrink-0 ${
                  isActive
                    ? colors.bgActive
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/85"
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? colors.iconColor : "text-gray-400"} shrink-0`} />
                <span>{catInfo.name}</span>
                {isActive && (
                  <span className={`absolute bottom-0 left-2 right-2 h-0.5 ${colors.barBg} rounded-full animate-pulse`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Owode Food Hero Promo Banner */}
      <section className="relative rounded-[32px] bg-[#070329] text-white p-8 sm:p-12 lg:p-14 overflow-hidden border border-white/5">
        
        {/* Subtle backgrounds */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none hidden lg:block bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-300 via-blue-900 to-[#070329]"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-[#38bdf8] py-1.5 px-4 rounded-full text-xs font-bold leading-none uppercase tracking-wide border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              Easy Local Delivery
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white">
              Good food,<br className="hidden sm:inline" /> fast delivery
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md">
              Order from your favorite restaurants and get it delivered to your door. Fresh meals brought with speed.
            </p>
            
            <div className="pt-2">
              <button 
                onClick={() => {
                  const el = document.getElementById("restaurants-grid");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-[#070329] py-3.5 px-7 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg transition duration-200"
              >
                <span>Order Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* High Fidelity bowl image matching mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 shrink-0 aspect-square rounded-full overflow-hidden border-8 border-white/5 shadow-2xl relative">
              <img 
                src="/images/hero.png"
                alt="ramen ramen bowl food"
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

        </div>

        {/* Carousel indicators dots like mockup */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:left-14 lg:translate-x-0 flex gap-2">
          <span className="w-6 h-1.5 bg-white rounded-full"></span>
          <span className="w-2 h-1.5 bg-white/30 rounded-full"></span>
          <span className="w-2 h-1.5 bg-white/30 rounded-full"></span>
        </div>
      </section>

      {/* Search Bar section on Mobile */}
      <section className="block md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for food, restaurants..."
            className="w-full p-4 pl-12 border border-gray-100 rounded-3xl bg-white focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition text-xs"
          />
        </div>
      </section>

      {/* Categories Horizontal list with Round Buttons & Interactive Sorting Controls */}
      <section className="space-y-5 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100/70 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-[#070329] uppercase tracking-widest font-mono">Dynamic Categories</h3>
              <span className="bg-amber-500/10 text-amber-600 text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                Live Data Feed
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Dynamically ordered by customer demand, product abundance, or alphabetical listing.</p>
          </div>

          {/* Interactive sort controls */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase mr-1">Sort:</span>
            
            <button
              onClick={() => setCategoriesSortMode("popularity")}
              className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                categoriesSortMode === "popularity"
                  ? "bg-[#070329] text-white shadow-md scale-102"
                  : "bg-white border border-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Flame className="w-3 h-3 text-orange-500" />
              <span>Trending</span>
            </button>

            <button
              onClick={() => setCategoriesSortMode("products")}
              className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                categoriesSortMode === "products"
                  ? "bg-[#070329] text-white shadow-md scale-102"
                  : "bg-white border border-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <LayoutGrid className="w-3 h-3 text-sky-500" />
              <span>Abundant</span>
            </button>

            <button
              onClick={() => setCategoriesSortMode("alphabetical")}
              className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                categoriesSortMode === "alphabetical"
                  ? "bg-[#070329] text-white shadow-md scale-102"
                  : "bg-white border border-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <ArrowUpDown className="w-3 h-3 text-purple-500" />
              <span>A - Z</span>
            </button>

            <button
              onClick={() => {
                setCategoriesSortMode("shuffle");
                setShuffledSeed(prev => prev + 1);
              }}
              className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                categoriesSortMode === "shuffle"
                  ? "bg-[#070329] text-white shadow-md scale-102"
                  : "bg-white border border-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Shuffle className="w-3 h-3 text-emerald-500" />
              <span>Mix / Shuffle</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-none w-full">
          
          {/* "All" categories choice */}
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition duration-150 ${
              selectedCategory === null 
                ? "bg-[#070329] text-white shadow-xl scale-110" 
                : "bg-white border border-gray-100 text-[#070329] hover:bg-gray-50 hover:shadow-md"
            }`}>
              <span className="text-xs font-extrabold uppercase font-mono tracking-wider">All</span>
            </div>
            <div className="text-center">
              <span className={`text-[10px] font-black uppercase tracking-wider block ${
                selectedCategory === null ? "text-[#0ea5e9]" : "text-gray-400"
              }`}>All</span>
              <span className="text-[8px] font-bold text-gray-450 uppercase block font-mono">Show all</span>
            </div>
          </button>
          
          {dynamicCategories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            
            // Determine dynamic badge/subtitle text based on sort mode
            let badgeText = "";
            let showCountBadge = false;
            let countVal = 0;
            
            if (categoriesSortMode === "popularity") {
              badgeText = cat.ordersCount > 0 ? `${cat.ordersCount} orders` : "0 orders";
              showCountBadge = cat.ordersCount > 0;
              countVal = cat.ordersCount;
            } else if (categoriesSortMode === "products") {
              badgeText = cat.productsCount > 0 ? `${cat.productsCount} items` : "0 items";
              showCountBadge = cat.productsCount > 0;
              countVal = cat.productsCount;
            } else if (categoriesSortMode === "alphabetical") {
              badgeText = "A - Z";
            } else {
              badgeText = "Shuffled";
            }

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition duration-150 relative ${
                  isSelected
                    ? "bg-[#070329] text-white shadow-xl scale-110"
                    : `bg-white border border-gray-100 hover:bg-gray-50 hover:shadow-md`
                }`}>
                  <span className={`${isSelected ? "" : getCatBg(cat.name)} p-2 rounded-xl text-lg flex items-center justify-center transition-all duration-150`}>
                    {cat.icon}
                  </span>

                  {/* Bubble Count Badge */}
                  {showCountBadge && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-[#0ea5e9] text-white rounded-full h-4 min-w-4 px-1 flex items-center justify-center border-2 border-white shadow-sm transform scale-90">
                      {countVal}
                    </span>
                  )}
                </div>
                
                <div className="text-center space-y-0.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${
                    isSelected ? "text-[#0ea5e9]" : "text-gray-500 group-hover:text-gray-800"
                  }`}>
                    {cat.name}
                  </span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase block font-mono">
                    {badgeText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popular Restaurants section with cover cards */}
      <section className="space-y-6" id="restaurants-grid">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#070329] uppercase">
              {selectedMerchantCategory 
                ? (vendorCategories.find(c => c.id === selectedMerchantCategory)?.name || selectedMerchantCategory)
                : "All Featured Outlets"
              }
            </h2>
            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider font-semibold">Showing {filteredVendors.length} active hubs matching selection</p>
          </div>
          
          <button className="text-xs font-bold text-[#0ea5e9] hover:underline flex items-center gap-1">
            See all
          </button>
        </div>

        {filteredVendors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredVendors.map((vendor) => (
              <Link 
                key={vendor.id} 
                to={`/vendor/${vendor.id}`} 
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
              >
                {/* Cover picture */}
                <div className="h-40 overflow-hidden relative bg-gray-50">
                  <img
                    src={vendor.image}
                    alt={vendor.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${!isVendorOpen(vendor) ? "grayscale contrast-75 brightness-75" : ""}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback image in case Unsplash fails
                      e.currentTarget.src = "/images/hero.png";
                    }}
                  />
                  
                  {/* Closed overlay */}
                  {!isVendorOpen(vendor) && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span className="px-3 py-1.5 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg border border-red-500/20">
                        Closed
                      </span>
                    </div>
                  )}

                  {/* Favorite Toggle Button on cover card */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(vendor.id, e)}
                    className="absolute top-3 left-3 p-2 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl text-gray-400 hover:text-red-500 hover:scale-110 transition duration-200 shadow-sm flex items-center justify-center z-20 cursor-pointer"
                    title={favorites.includes(vendor.id) ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(vendor.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                  </button>

                  {/* Rating Badge on cover like mock */}
                  <div className="absolute top-3 right-3 py-1 px-2 bg-white/95 backdrop-blur-md rounded-xl text-[10px] font-black text-gray-800 shadow-sm flex items-center gap-0.5 z-20">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Info block */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-[#070329] tracking-tight group-hover:text-[#0ea5e9] transition-colors leading-snug">
                      {vendor.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 leading-normal line-clamp-2">
                      {vendor.description}
                    </p>
                  </div>

                  {/* Pricing and time specs matching the mock screenshot */}
                  <div className="pt-3 border-t border-gray-50 flex flex-col gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded uppercase text-[9px] tracking-wider">
                        {vendor.category || "restaurant"}
                      </span>
                      <span className="text-gray-400 font-bold">
                        {vendor.prepTime || 20} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold">
                        ₦{(vendor.deliveryFee ?? 750).toLocaleString()} delivery
                      </span>
                      
                      {isVendorOpen(vendor) ? (
                        <span className="text-[#0ea5e9] font-black inline-flex items-center gap-0.5">
                          Order <ChevronRight className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
            <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700">No restaurants match your search</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing categories or search filters.</p>
          </div>
        )}
      </section>

    </div>
  );
};
