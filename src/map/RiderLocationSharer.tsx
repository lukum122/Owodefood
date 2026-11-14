import React, { useEffect, useRef, useState } from "react";
import { Navigation, AlertTriangle } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";

const SEND_EVERY_MS = 12_000;

// While the rider has an order "out for delivery", send their position to
// the server every ~12 s (the customer sees the bike move) and keep the
// screen awake. A web app can't send location with the phone locked, so
// keeping the screen on is what makes tracking reliable.
export const RiderLocationSharer: React.FC = () => {
  const { currentRider, orders } = useDatabase();
  const active = !!currentRider && orders.some((o) => o.riderId === currentRider.id && o.status === "out_for_delivery");
  const [state, setState] = useState<"off" | "on" | "denied" | "error">("off");
  const lastSent = useRef(0);
  const latest = useRef<GeolocationPosition | null>(null);
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    if (!active) { setState("off"); return; }
    if (!("geolocation" in navigator)) { setState("error"); return; }

    const send = (pos: GeolocationPosition, force = false) => {
      latest.current = pos;
      const now = Date.now();
      if (!force && now - lastSent.current < SEND_EVERY_MS) return;
      lastSent.current = now;
      const token = localStorage.getItem("fd_jwt_token") || "";
      fetch("/api/rider/location", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Auth-Token": token },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        keepalive: true,
      }).catch(() => {});
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => { setState("on"); send(pos); },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    // Even if the rider is standing still, keep the position fresh.
    const heartbeat = setInterval(() => { if (latest.current) send(latest.current, true); }, SEND_EVERY_MS * 2);

    const lock = async () => {
      try { wakeLock.current = await (navigator as any).wakeLock?.request("screen"); } catch {}
    };
    lock();
    const onVisible = () => { if (document.visibilityState === "visible") lock(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
      try { wakeLock.current?.release(); } catch {}
      wakeLock.current = null;
    };
  }, [active]);

  if (!active) return null;
  if (state === "denied" || state === "error") {
    return (
      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-xs text-red-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {state === "denied"
            ? "Location is blocked, so the customer can't see you coming. Allow location for this site in your browser settings."
            : "Can't read your location right now. Turn on GPS/Location on your phone."}
        </span>
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-3 flex items-center gap-2 text-xs font-semibold text-green-800">
      <Navigation className="w-4 h-4 shrink-0" />
      Sharing your location with the customer. Keep this app open on your screen while delivering.
    </div>
  );
};

export function directionsUrl(dest: { lat?: number | null; lng?: number | null; address?: string }) {
  if (typeof dest.lat === "number" && typeof dest.lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.address || "")}&travelmode=driving`;
}
