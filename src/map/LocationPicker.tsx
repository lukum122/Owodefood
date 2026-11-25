import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { LeafletMap, MapConfig, getMapConfig, insideCoverage } from "./LeafletMap";

export interface LatLng { lat: number; lng: number }

interface Props {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  kind?: "customer" | "vendor";
  hint?: string;
  heightClass?: string;
  /** Called with the place name under the pin (when found). */
  onPlaceName?: (name: string) => void;
}

interface SearchResult { name: string; address: string; lat: number; lng: number }

// Search box + "Use my current location" + a map where the pin can be
// dragged or the map tapped to place it exactly at the gate. Shows the
// name of the place under the pin and the admin's delivery areas.
export const LocationPicker: React.FC<Props> = ({ value, onChange, kind = "customer", hint, heightClass, onPlaceName }) => {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recenter, setRecenter] = useState<LatLng | null>(value);
  const [cfg, setCfg] = useState<MapConfig | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const searchTimer = useRef<number | undefined>(undefined);
  const placeNameRef = useRef(onPlaceName);
  placeNameRef.current = onPlaceName;

  useEffect(() => { getMapConfig().then(setCfg); }, []);

  // Name of the place under the pin.
  useEffect(() => {
    if (!value) { setPlaceName(null); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      fetch(`/api/map/reverse?lat=${value.lat}&lng=${value.lng}`)
        .then((r) => r.json())
        .then((j) => {
          if (cancelled || !j?.name) return;
          setPlaceName(j.name);
          placeNameRef.current?.(j.name);
        })
        .catch(() => {});
    }, 600);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [value?.lat, value?.lng]);

  const runSearch = (q: string) => {
    window.clearTimeout(searchTimer.current);
    if (q.trim().length < 3) { setResults([]); setSearchMsg(null); return; }
    searchTimer.current = window.setTimeout(() => {
      setSearching(true);
      setSearchMsg(null);
      const near = value || cfg?.defaultCenter;
      fetch(`/api/map/search?q=${encodeURIComponent(q.trim())}${near ? `&lat=${near.lat}&lng=${near.lng}` : ""}`)
        .then((r) => r.json())
        .then((j) => {
          const list: SearchResult[] = j?.results || [];
          setResults(list);
          if (j?.error) setSearchMsg(j.error);
          else if (list.length === 0) setSearchMsg("No places found. Try a landmark, street or area name, or tap the map.");
        })
        .catch(() => setSearchMsg("Search isn't available right now. Tap the map to place your pin."))
        .finally(() => setSearching(false));
    }, 450);
  };

  const pick = (r: SearchResult) => {
    const v = { lat: r.lat, lng: r.lng };
    onChange(v);
    setRecenter(v);
    setResults([]);
    setQuery(r.name);
    setSearchMsg(null);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { setError("Your phone/browser can't share location. Search for your area or tap the map."); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(v);
        setRecenter(v);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(err.code === err.PERMISSION_DENIED
          ? "Location permission was blocked. Allow location for this site, or search / tap the map to place the pin."
          : "Couldn't get your location. Move to an open area, or search / tap the map to place the pin.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const areas = cfg?.coverage?.areas || [];
  const outside = kind === "customer" && value && areas.length > 0 && !insideCoverage(cfg, value.lat, value.lng);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
          placeholder="Search a street, landmark or area…"
          className="w-full pl-9 pr-9 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        {searching
          ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          : query && (
            <button type="button" onClick={() => { setQuery(""); setResults([]); setSearchMsg(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        {results.length > 0 && (
          <div className="absolute z-[1000] mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => pick(r)} className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-gray-100 last:border-0">
                <p className="text-xs font-bold text-gray-900">{r.name}</p>
                {r.address && r.address !== r.name && <p className="text-[10px] text-gray-500 truncate">{r.address}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
      {searchMsg && <p className="text-[11px] text-gray-500 font-semibold">{searchMsg}</p>}

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-[#070329] text-[#070329] font-bold text-xs cursor-pointer hover:bg-gray-50 disabled:opacity-60"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
        {locating ? "Finding you..." : kind === "vendor" ? "Use my current location (I'm at the shop)" : "Use my current location"}
      </button>
      {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
      <LeafletMap
        className={heightClass || "h-60"}
        center={recenter}
        zoom={16}
        circles={kind === "customer" ? areas : undefined}
        markers={value ? [{ id: "pin", lat: value.lat, lng: value.lng, kind, draggable: true }] : []}
        onMapClick={(lat, lng) => onChange({ lat, lng })}
        onMarkerDrag={(_, lat, lng) => onChange({ lat, lng })}
      />
      {value && placeName && (
        <p className="text-[11px] font-bold text-gray-800 flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-600" />
          <span>Pin is at: {placeName}</span>
        </p>
      )}
      {outside && (
        <p className="text-[11px] font-bold px-3 py-2 rounded-xl bg-red-50 text-red-700 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {cfg?.coverage?.message || "We don't deliver to this location yet."}
        </p>
      )}
      <p className="text-[10px] text-gray-500 flex items-start gap-1">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        {value
          ? hint || "Drag the pin (or tap the map) to the exact gate/entrance."
          : areas.length > 0 && kind === "customer"
            ? "Search, use your location, or tap the map. The green circles show where we deliver."
            : "Search, use your current location, or tap the map where you are."}
      </p>
    </div>
  );
};
