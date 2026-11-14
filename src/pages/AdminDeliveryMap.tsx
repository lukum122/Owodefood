import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MapPinned, Save } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import { LeafletMap, MapMarker } from "../map/LeafletMap";

function authHeaders(json = false) {
  const token = localStorage.getItem("fd_jwt_token") || "";
  const h: Record<string, string> = { Authorization: `Bearer ${token}`, "X-Auth-Token": token };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
}

// Live map of riders on the road (last 30 min) + restaurants with pins.
export const AdminLiveMap: React.FC = () => {
  const { vendors } = useDatabase();
  const [riders, setRiders] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/rider-locations", { headers: authHeaders() })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); setRiders(d.riders); setError(null); })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const fn = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      setRiders((prev) => prev?.map((r) => (r.id === d.riderId ? { ...r, lat: d.lat, lng: d.lng, at: d.at } : r)) || prev);
    };
    window.addEventListener("fd-rider-position", fn);
    return () => { clearInterval(t); window.removeEventListener("fd-rider-position", fn); };
  }, []);

  const markers = useMemo(() => {
    const m: MapMarker[] = [];
    for (const v of vendors) {
      if (typeof v.latitude === "number" && typeof v.longitude === "number" && v.status === "approved") {
        m.push({ id: `v-${v.id}`, lat: v.latitude, lng: v.longitude, kind: "vendor", label: v.name });
      }
    }
    for (const r of riders || []) {
      m.push({ id: `r-${r.id}`, lat: r.lat, lng: r.lng, kind: "rider", label: `${r.name}${r.orders?.length ? ` · ${r.orders.length} job(s)` : " · free"}` });
    }
    return m;
  }, [vendors, riders]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-gray-950 flex items-center gap-2"><MapPinned className="w-5 h-5" /> Riders on the road</h2>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <LeafletMap markers={markers} fitToMarkers className="h-[420px]" zoom={13} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {riders === null && <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}
        {riders?.length === 0 && <p className="text-xs text-gray-400">No rider has shared a location in the last 30 minutes. Riders share it only while delivering, with the app open.</p>}
        {riders?.map((r) => (
          <div key={r.id} className="border border-gray-100 rounded-xl p-3 text-xs bg-white">
            <p className="font-bold text-gray-900">{r.name}</p>
            <p className="text-gray-500">{r.phone} · updated {ago(r.at)}</p>
            {r.orders?.map((o: any) => (
              <p key={o.id} className="text-gray-600 mt-1">#{o.id.substring(0, 8)} · {o.vendorName} → {o.customerName} · {String(o.status).replace(/_/g, " ")}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MODE_LABEL: Record<string, string> = {
  zones: "Zones only (old way: base fee + area surcharges)",
  distance: "Distance only",
  distance_zones: "Distance + zone surcharges (recommended)",
};

export const AdminDeliveryPricing: React.FC = () => {
  const { currency } = useDatabase();
  const [form, setForm] = useState<any>(null);
  const [missing, setMissing] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/delivery-pricing", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.pricing) { setForm(d.pricing); setMissing(d.vendorsWithoutPin || []); } else setMsg({ ok: false, text: d.error || "Couldn't load." }); })
      .catch(() => setMsg({ ok: false, text: "Couldn't load." }));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/delivery-pricing", { method: "POST", headers: authHeaders(true), body: JSON.stringify(form) });
      const d = await r.json();
      setMsg(r.ok ? { ok: true, text: "Saved. New orders use these prices immediately." } : { ok: false, text: d.error || "Failed to save." });
    } catch {
      setMsg({ ok: false, text: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="py-6">{msg ? <p className="text-xs text-red-600">{msg.text}</p> : <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}</div>;

  const field = (key: string, label: string, help: string, step = 1) => (
    <label className="space-y-1 block">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      <input type="number" step={step} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? "" : Number(e.target.value) })}
        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-100" />
      <span className="text-[10px] text-gray-500 block">{help}</span>
    </label>
  );

  // Worked example for 5 km, so admins can sanity-check numbers.
  const exKm = 5;
  const ex = Math.max(form.minFee || 0, (form.baseFee || 0) + Math.ceil(Math.max(0, exKm - (form.baseKm || 0))) * (form.perKm || 0));
  const exRounded = form.roundTo > 0 ? Math.ceil(ex / form.roundTo) * form.roundTo : ex;

  return (
    <div className="space-y-4 bg-white border border-gray-100 rounded-2xl p-5">
      <div>
        <h2 className="text-lg font-black text-gray-950">Delivery pricing</h2>
        <p className="text-xs text-gray-500">Surge, rain and night charges are always added on top. Orders without a map pin (or from a shop without one) use the zone rules.</p>
      </div>
      <label className="space-y-1 block">
        <span className="text-xs font-bold text-gray-700">Pricing method</span>
        <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white">
          {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {form.mode !== "zones" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {field("baseFee", `Base fee (${currency})`, "Charged for the first few km.")}
          {field("baseKm", "Km covered by base fee", "e.g. 2 = first 2 km included.", 0.5)}
          {field("perKm", `Price per extra km (${currency})`, "Each km after that, rounded up.")}
          {field("minFee", `Minimum delivery fee (${currency})`, "No delivery costs less than this.")}
          {field("roadFactor", "Road factor", "Straight-line km x this ≈ road km. 1.3 is typical.", 0.05)}
          {field("roundTo", `Round up to nearest (${currency})`, "e.g. 50. Use 0 for no rounding.")}
          {field("defaultMaxKm", "Default max delivery distance (km)", "Shops can set their own in Vendor Settings.", 0.5)}
          <div className="text-xs bg-sky-50 text-sky-900 rounded-xl p-3 self-start">
            <b>Example:</b> a {exKm} km delivery (after road factor) costs <b>{currency}{exRounded.toLocaleString()}</b> before surge/area extras.
          </div>
        </div>
      )}
      {missing.length > 0 && form.mode !== "zones" && (
        <div className="text-[11px] bg-amber-50 text-amber-800 rounded-xl p-3">
          <b>{missing.length} shop(s) haven't set their map pin</b>, so they're still charged by zones: {missing.slice(0, 8).map((m) => m.name).join(", ")}{missing.length > 8 ? "..." : ""}. They can set it in Vendor Settings.
        </div>
      )}
      {msg && <p className={`text-xs font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <button onClick={save} disabled={saving} className="py-2.5 px-5 bg-[#070329] text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save pricing
      </button>
    </div>
  );
};

// One admin page for both.
const AdminDeliveryMap: React.FC = () => (
  <div className="space-y-6">
    <AdminDeliveryPricing />
    <div className="bg-white border border-gray-100 rounded-2xl p-5"><AdminLiveMap /></div>
  </div>
);

export default AdminDeliveryMap;
