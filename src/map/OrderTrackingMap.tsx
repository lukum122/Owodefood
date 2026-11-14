import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { LeafletMap, MapMarker } from "./LeafletMap";

interface Tracking {
  status: string;
  vendor: { lat: number; lng: number; name: string } | null;
  dropoff: { lat: number; lng: number; address: string } | null;
  rider: { lat: number; lng: number; at: string; name: string } | null;
  distanceKm: number | null;
}

function agoText(iso?: string) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

// Restaurant, drop-off pin and -- while on the way -- the rider moving live.
export const OrderTrackingMap: React.FC<{ orderId: string; status: string }> = ({ orderId, status }) => {
  const [data, setData] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("fd_jwt_token") || "";
    setLoading(true);
    fetch(`/api/orders/${encodeURIComponent(orderId)}/tracking`, { headers: { Authorization: `Bearer ${token}`, "X-Auth-Token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId, status]);

  // Live updates from the rider's phone.
  useEffect(() => {
    const fn = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d?.orderId !== orderId) return;
      setData((prev) => (prev ? { ...prev, rider: { lat: d.lat, lng: d.lng, at: d.at, name: prev.rider?.name || "Rider" } } : prev));
    };
    window.addEventListener("fd-rider-location", fn);
    const t = setInterval(() => tick((n) => n + 1), 15000); // refresh "x s ago"
    return () => { window.removeEventListener("fd-rider-location", fn); clearInterval(t); };
  }, [orderId]);

  const markers = useMemo(() => {
    const m: MapMarker[] = [];
    if (data?.vendor) m.push({ id: "vendor", lat: data.vendor.lat, lng: data.vendor.lng, kind: "vendor", label: data.vendor.name });
    if (data?.dropoff) m.push({ id: "dropoff", lat: data.dropoff.lat, lng: data.dropoff.lng, kind: "customer", label: "Delivery point" });
    if (data?.rider && status === "out_for_delivery") m.push({ id: "rider", lat: data.rider.lat, lng: data.rider.lng, kind: "rider", label: data.rider.name });
    return m;
  }, [data, status]);

  if (loading) return <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>;
  if (!data || markers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <LeafletMap markers={markers} fitToMarkers zoom={15} className="h-56" />
      <p className="text-[11px] text-gray-500">
        {status === "out_for_delivery"
          ? data.rider
            ? <>🛵 {data.rider.name} · updated {agoText(data.rider.at)}</>
            : "Waiting for the rider's location..."
          : data.distanceKm != null ? `${data.distanceKm} km from the restaurant` : null}
      </p>
    </div>
  );
};
