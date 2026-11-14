import React, { useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { LeafletMap } from "./LeafletMap";

export interface LatLng { lat: number; lng: number }

interface Props {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  kind?: "customer" | "vendor";
  hint?: string;
  heightClass?: string;
}

// "Use my current location" + a map where the pin can be dragged or the
// map tapped to place it exactly at the gate.
export const LocationPicker: React.FC<Props> = ({ value, onChange, kind = "customer", hint, heightClass }) => {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recenter, setRecenter] = useState<LatLng | null>(value);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { setError("Your phone/browser can't share location. Tap the map to place the pin."); return; }
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
          ? "Location permission was blocked. Allow location for this site, or tap the map to place the pin."
          : "Couldn't get your location. Move to an open area or tap the map to place the pin.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  return (
    <div className="space-y-2">
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
        markers={value ? [{ id: "pin", lat: value.lat, lng: value.lng, kind, draggable: true }] : []}
        onMapClick={(lat, lng) => onChange({ lat, lng })}
        onMarkerDrag={(_, lat, lng) => onChange({ lat, lng })}
      />
      <p className="text-[10px] text-gray-500 flex items-start gap-1">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        {value
          ? hint || "Drag the pin (or tap the map) to the exact gate/entrance."
          : "Tap the map where you are, or use your current location."}
      </p>
    </div>
  );
};
