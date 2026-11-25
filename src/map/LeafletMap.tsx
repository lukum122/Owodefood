// Thin React wrapper around Leaflet (free, open-source maps). Tiles come
// from whatever the server is configured with (/api/map/config), so
// switching to a paid/keyed tile provider later needs no code change.
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface CoverageArea { id: string; name: string; lat: number; lng: number; radiusKm: number }
export interface MapConfig {
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  defaultCenter: { lat: number; lng: number };
  provider?: "osm" | "google";
  coverage?: { areas: CoverageArea[]; message: string } | null;
}

/** Is a point inside any admin delivery area? (true when coverage is off) */
export function insideCoverage(cfg: MapConfig | null, lat: number, lng: number): boolean {
  const areas = cfg?.coverage?.areas || [];
  if (areas.length === 0) return true;
  const toRad = (d: number) => (d * Math.PI) / 180;
  return areas.some((a) => {
    const dLat = toRad(lat - a.lat), dLng = toRad(lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h)) <= a.radiusKm;
  });
}

let configPromise: Promise<MapConfig> | null = null;
export function getMapConfig(): Promise<MapConfig> {
  if (!configPromise) {
    configPromise = fetch("/api/map/config")
      .then((r) => r.json())
      .catch(() => ({
        tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
        defaultCenter: { lat: 8.4966, lng: 4.5421 },
      }));
  }
  return configPromise;
}

export type MarkerKind = "vendor" | "customer" | "rider";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  label?: string;
  draggable?: boolean;
}

const COLORS: Record<MarkerKind, string> = { vendor: "#7c3aed", customer: "#dc2626", rider: "#0ea5e9" };
const GLYPH: Record<MarkerKind, string> = { vendor: "🍽", customer: "📍", rider: "🛵" };

function iconFor(kind: MarkerKind) {
  // Plain HTML markers -- no image files, so nothing to break in the build.
  const c = COLORS[kind];
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${c};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);font-size:16px;line-height:1">${GLYPH[kind]}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

interface Props {
  markers: MapMarker[];
  center?: { lat: number; lng: number } | null;
  zoom?: number;
  fitToMarkers?: boolean;
  /** Circles to draw, e.g. delivery areas. */
  circles?: CoverageArea[];
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerDrag?: (id: string, lat: number, lng: number) => void;
  className?: string;
}

export const LeafletMap: React.FC<Props> = ({ markers, center, zoom = 15, fitToMarkers, circles, onMapClick, onMarkerDrag, className }) => {
  const circleLayerRef = useRef<L.LayerGroup | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<Map<string, L.Marker>>(new Map());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const clickRef = useRef(onMapClick);
  const dragRef = useRef(onMarkerDrag);
  clickRef.current = onMapClick;
  dragRef.current = onMarkerDrag;

  // Create map once.
  useEffect(() => {
    let cancelled = false;
    getMapConfig().then((cfg) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      const start = center || markers[0] || cfg.defaultCenter;
      const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView([start.lat, start.lng], zoom);
      const tiles = L.tileLayer(cfg.tileUrl, { maxZoom: cfg.maxZoom || 19, attribution: cfg.attribution });
      let tileErrors = 0;
      tiles.on("tileerror", () => { if (++tileErrors > 8) setFailed(true); });
      tiles.addTo(map);
      map.on("click", (e: L.LeafletMouseEvent) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      setReady(true);
      // Leaflet measures its box once; fix sizing inside modals/tabs.
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      circleLayerRef.current = null;
      layerRef.current.clear();
    };
  }, []);

  // Sync markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const existing = layerRef.current;
    const seen = new Set<string>();
    for (const m of markers) {
      seen.add(m.id);
      let mk = existing.get(m.id);
      if (!mk) {
        mk = L.marker([m.lat, m.lng], { icon: iconFor(m.kind), draggable: !!m.draggable });
        if (m.draggable) {
          mk.on("dragend", () => {
            const p = mk!.getLatLng();
            dragRef.current?.(m.id, p.lat, p.lng);
          });
        }
        if (m.label) mk.bindTooltip(m.label, { direction: "top", offset: [0, -30] });
        mk.addTo(map);
        existing.set(m.id, mk);
      } else {
        const cur = mk.getLatLng();
        if (cur.lat !== m.lat || cur.lng !== m.lng) mk.setLatLng([m.lat, m.lng]);
        if (m.label) mk.setTooltipContent(m.label);
      }
    }
    for (const [id, mk] of existing) {
      if (!seen.has(id)) { mk.remove(); existing.delete(id); }
    }
    if (fitToMarkers && markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
    }
  }, [markers, ready, fitToMarkers]);

  // Delivery-area circles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!circleLayerRef.current) circleLayerRef.current = L.layerGroup().addTo(map);
    const g = circleLayerRef.current;
    g.clearLayers();
    for (const c of circles || []) {
      L.circle([c.lat, c.lng], { radius: c.radiusKm * 1000, color: "#16a34a", weight: 2, fillColor: "#22c55e", fillOpacity: 0.08, interactive: false })
        .bindTooltip(c.name, { permanent: false })
        .addTo(g);
    }
  }, [circles, ready]);

  // Re-center when asked (e.g. "use my location").
  useEffect(() => {
    if (mapRef.current && ready && center) mapRef.current.setView([center.lat, center.lng], Math.max(mapRef.current.getZoom(), zoom));
  }, [center?.lat, center?.lng, ready]);

  return (
    <div className={`relative isolate z-0 overflow-hidden rounded-2xl border border-gray-200 ${className || "h-64"}`} style={{ isolation: "isolate" }}>
      <div ref={elRef} className="absolute inset-0 z-0" />
      {failed && (
        <div className="absolute inset-x-0 bottom-0 z-[500] bg-amber-50 text-amber-800 text-[11px] font-semibold p-2 text-center">
          Map images aren't loading. Check your connection. You can still type your address and landmark.
        </div>
      )}
    </div>
  );
};
