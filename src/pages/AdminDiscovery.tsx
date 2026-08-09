import React, { useState } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { HomepageSection, Collection } from "../types";
import { Layers, Plus, Trash2, ArrowUp, ArrowDown, Save, CheckCircle2 } from "lucide-react";
import { compressImageToDataUrl } from "../imageUtils";

export const AdminDiscovery: React.FC = () => {
  const { homepageSections, updateHomepageSections, vendors, vendorCategories, heroBanner, updateHeroBanner } = useDatabase();
  const [activeTab, setActiveTab] = useState<"sections" | "collections" | "hero">("sections");
  const [isSaved, setIsSaved] = useState(false);

  // Local state for editing before saving
  const [localSections, setLocalSections] = useState<HomepageSection[]>(homepageSections.sort((a, b) => a.sortOrder - b.sortOrder));
  const [localHeroBanner, setLocalHeroBanner] = useState(heroBanner);

  const handleSaveHeroBanner = () => {
    updateHeroBanner(localHeroBanner);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveSections = () => {
    // Re-assign sortOrder based on array index
    const updated = localSections.map((sec, i) => ({ ...sec, sortOrder: i + 1 }));
    updateHomepageSections(updated);
    setLocalSections(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newArr = [...localSections];
    const temp = newArr[index - 1];
    newArr[index - 1] = newArr[index];
    newArr[index] = temp;
    setLocalSections(newArr);
  };

  const moveDown = (index: number) => {
    if (index === localSections.length - 1) return;
    const newArr = [...localSections];
    const temp = newArr[index + 1];
    newArr[index + 1] = newArr[index];
    newArr[index] = temp;
    setLocalSections(newArr);
  };

  const toggleVisibility = (id: string) => {
    setLocalSections(localSections.map(sec => sec.id === id ? { ...sec, isEnabled: !sec.isEnabled } : sec));
  };

  const addSection = () => {
    const newSection: HomepageSection = {
      id: "sec-" + Math.random().toString(36).substr(2, 9),
      title: "New Section",
      type: "featured_restaurants",
      isEnabled: true,
      sortOrder: localSections.length + 1
    };
    setLocalSections([...localSections, newSection]);
  };

  const deleteSection = (id: string) => {
    setLocalSections(localSections.filter(sec => sec.id !== id));
  };

  const handleImageUpload = async (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Image size should be less than 3MB.");
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      setLocalSections(localSections.map(s => s.id === sectionId ? { ...s, bannerImage: compressed } : s));
    } catch (err) {
      console.error("[banner upload] Failed to process image:", err);
      alert(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Image size should be less than 3MB.");
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      setLocalHeroBanner({ ...localHeroBanner, image: compressed });
    } catch (err) {
      console.error("[hero image upload] Failed to process image:", err);
      alert(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-500" />
            Homepage Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">Configure dynamic discovery sections and custom food collections.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("sections")}
          className={`pb-3 px-2 text-sm font-bold border-b-2 transition ${activeTab === "sections" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Homepage Sections
        </button>
        <button
          onClick={() => setActiveTab("hero")}
          className={`pb-3 px-2 text-sm font-bold border-b-2 transition ${activeTab === "hero" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Hero Banner
        </button>
        <button
          onClick={() => setActiveTab("collections")}
          className={`pb-3 px-2 text-sm font-bold border-b-2 transition ${activeTab === "collections" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Custom Collections
        </button>
      </div>

      {activeTab === "sections" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-150 space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Manage Sections</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Control the exact layout and content of the customer homepage.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={addSection} className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer">
                <Plus className="w-4 h-4" /> Add Section
              </button>
              <button onClick={handleSaveSections} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
                <Save className="w-4 h-4" /> Save Order
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {localSections.map((section, index) => (
              <div key={section.id} className={`flex items-center justify-between p-4 rounded-2xl border ${section.isEnabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-70"}`}>
                <div className="flex flex-col gap-1 w-full max-w-sm">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={section.title} 
                      onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                      className="font-bold text-sm text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-100 rounded px-1"
                    />
                    <select
                      value={section.type}
                      onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, type: e.target.value as any } : s))}
                      className="text-[9px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold uppercase tracking-wider outline-none border-none cursor-pointer"
                    >
                      <option value="featured_restaurants">Featured Restaurants</option>
                      <option value="food_category">Food Categories</option>
                      <option value="fast_delivery">Fast Delivery</option>
                      <option value="top_rated">Top Rated</option>
                      <option value="new_restaurants">New Restaurants</option>
                      <option value="promotional_banner">Promotional Banner</option>
                    </select>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Optional Subtitle"
                    value={section.subtitle || ""} 
                    onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, subtitle: e.target.value } : s))}
                    className="text-xs text-gray-500 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-100 rounded px-1 w-full"
                  />
                  {section.type === "promotional_banner" && (
                    <div className="flex flex-col gap-2 mt-2 w-full p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Banner Image</label>
                        <div className="flex items-center gap-2">
                          <label className="bg-white border border-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded-lg font-bold cursor-pointer hover:bg-gray-50 shrink-0 shadow-sm transition">
                            Upload Image
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(section.id, e)}
                            />
                          </label>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                          <input 
                            type="text" 
                            placeholder="Paste Image URL"
                            value={section.bannerImage || ""} 
                            onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, bannerImage: e.target.value } : s))}
                            className="text-xs text-gray-600 bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg px-2 py-1.5 w-full"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1 mt-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Link (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Link URL (e.g. /vendors or https://...)"
                          value={section.linkUrl || ""} 
                          onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, linkUrl: e.target.value } : s))}
                          className="text-xs text-gray-600 bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg px-2 py-1.5 w-full"
                        />
                      </div>
                    </div>
                  )}
                  {section.type === "food_category" && (
                    <div className="flex flex-col gap-2 mt-2 w-full p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Showcase Type</label>
                        <select 
                          value={section.filterType || "category"}
                          onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, filterType: e.target.value as 'category' | 'vendor', filterValue: "" } : s))}
                          className="text-xs text-gray-600 bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg px-2 py-1.5 w-full cursor-pointer"
                        >
                          <option value="category">Specific Category</option>
                          <option value="vendor">Specific Vendor</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1 mt-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select {section.filterType === 'vendor' ? 'Vendor' : 'Category'}</label>
                        <select
                          value={section.filterValue || ""}
                          onChange={(e) => setLocalSections(localSections.map(s => s.id === section.id ? { ...s, filterValue: e.target.value } : s))}
                          className="text-xs text-gray-600 bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg px-2 py-1.5 w-full cursor-pointer"
                        >
                          <option value="">-- Select --</option>
                          {section.filterType === 'vendor' ? (
                            vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                          ) : (
                            vendorCategories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer mr-2">
                    <input type="checkbox" className="sr-only peer" checked={section.isEnabled} onChange={() => toggleVisibility(section.id)} />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                  
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveUp(index)} disabled={index === 0} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveDown(index)} disabled={index === localSections.length - 1} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => deleteSection(section.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition ml-2 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {localSections.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-500">No sections created yet. Add one above.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "collections" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-150 space-y-6 text-center py-16 animate-in fade-in duration-300">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900">Custom Collections (Coming Soon)</h3>
          <p className="text-[11px] text-gray-500 max-w-sm mx-auto mt-1">Here you will be able to group specific restaurants or products into custom collections like "Student Favorites" or "Budget Meals".</p>
        </div>
      )}

      {activeTab === "hero" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-150 space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Hero Banner Config</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Customize the main landing banner on the customer homepage.</p>
            </div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer border border-gray-200 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                <input 
                  type="checkbox" 
                  checked={localHeroBanner.isEnabled} 
                  onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, isEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-gray-700">Enable Banner</span>
              </label>
              <button onClick={handleSaveHeroBanner} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
                <Save className="w-4 h-4" /> Save Banner
              </button>
            </div>
          </div>

          <div className={`space-y-4 ${!localHeroBanner.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 block">Badge Text</label>
                <input 
                  type="text" 
                  value={localHeroBanner.badgeText}
                  onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, badgeText: e.target.value })}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                  placeholder="e.g. EASY LOCAL DELIVERY"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 block">Background Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={localHeroBanner.backgroundColor}
                    onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, backgroundColor: e.target.value })}
                    className="h-10 w-14 rounded-xl cursor-pointer border border-gray-200 p-1 bg-white"
                  />
                  <input 
                    type="text" 
                    value={localHeroBanner.backgroundColor}
                    onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, backgroundColor: e.target.value })}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 transition uppercase font-mono"
                    placeholder="#070329"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">Main Title (Use &lt;br /&gt; for line break)</label>
              <input 
                type="text" 
                value={localHeroBanner.title}
                onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, title: e.target.value })}
                className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 transition font-mono"
                placeholder="Good food,<br /> fast delivery"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">Description text</label>
              <textarea 
                value={localHeroBanner.description}
                onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, description: e.target.value })}
                rows={2}
                className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                placeholder="Order from your favorite restaurants..."
              />
            </div>

            <div className="space-y-2.5 pt-2">
              <label className="text-xs font-bold text-gray-600 block">Banner Hero Image</label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 flex justify-center">
                  <div className="relative w-32 h-32 rounded-full border-4 border-gray-100 flex flex-col items-center justify-center overflow-hidden bg-gray-50 group">
                    {localHeroBanner.image ? (
                      <img src={localHeroBanner.image} alt="Hero preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase">No Image</span>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-8 space-y-2">
                  <div className="flex gap-2">
                    <label className="w-full py-2.5 px-4 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition cursor-pointer">
                      Upload Image File
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleHeroImageUpload}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <span>Or direct URL link (optional)</span>
                    </div>
                    <input
                      type="url"
                      value={localHeroBanner.image}
                      onChange={(e) => setLocalHeroBanner({ ...localHeroBanner, image: e.target.value })}
                      placeholder="/images/hero.png"
                      className="w-full text-xs p-2.5 border border-gray-250 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 transition font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {isSaved && (
        <div className="fixed bottom-6 right-6 p-4 bg-green-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-white" />
          Changes Saved Successfully!
        </div>
      )}
    </div>
  );
};
