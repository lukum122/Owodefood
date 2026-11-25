import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Plus, Save, Trash2, XCircle } from "lucide-react";
import { api } from "../apiClient";
import { LeafletMap, CoverageArea } from "../map/LeafletMap";

// Admin: choose the map (free OpenStreetMap or Google), and draw the areas
// we deliver to. Orders with a pin outside every area are blocked.

interface Settings {
  provider: "osm" | "google";
  googleApiKey: string;
  coverageEnabled: boolean;
  areas: CoverageArea[];
  coverageMessage: string;
}

const newAreaId = () => `area-${Date.now().toString(36)}`;

export const AdminMapSettings: React.FC = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [envKeySet, setEnvKeySet] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    api("/api/admin/map-settings")
      .then((d) => { setS(d.settings); setEnvKeySet(d.envKeySet); setSelected(d.settings.areas?.[0]?.id || null); })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  if (!s) {
    return msg
      ? <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-semibold">{msg.text}</div>
      : <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const sel = s.areas.find((a) => a.id === selected) || null;
  const updateArea = (id: string, patch: Partial<CoverageArea>) =>
    setS({ ...s, areas: s.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const addArea = (lat = 8.4966, lng = 4.5421) => {
    const a: CoverageArea = { id: newAreaId(), name: `Area ${s.areas.length + 1}`, lat, lng, radiusKm: 10 };
    setS({ ...s, areas: [...s.areas, a] });
    setSelected(a.id);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const d = await api("/api/admin/map-settings", { body: s });
      setS(d.settings);
      setMsg({ ok: true, text: "Saved. Customers will see the change the next time they open the app (or after a refresh)." });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally { setSaving(false); }
  };

  const runTest = async () => {
    setTesting(true); setTest(null);
    try {
      setTest(await api("/api/admin/map-settings/test-google", { body: { googleApiKey: s.googleApiKey } }));
    } catch (e: any) {
      setTest({ error: e.message });
    } finally { setTesting(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-950">Map & Coverage</h1>
        <p className="text-xs text-gray-500 mt-1">Choose which map the app uses, and mark the areas you deliver to.</p>
      </div>

      {/* Provider */}
      <section className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900">Map provider</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ["osm", "OpenStreetMap (free)", "No setup. Fewer street and place names around Kwara."],
            ["google", "Google Maps", "Full place names and better address search. Needs a Google key with billing turned on."],
          ] as const).map(([val, title, desc]) => (
            <label key={val} className={`p-4 rounded-2xl border-2 cursor-pointer ${s.provider === val ? "border-[#070329] bg-gray-50" : "border-gray-100"}`}>
              <input type="radio" className="mr-2" checked={s.provider === val} onChange={() => setS({ ...s, provider: val })} />
              <span className="text-sm font-black">{title}</span>
              <p className="text-[11px] text-gray-500 mt-1">{desc}</p>
            </label>
          ))}
        </div>

        {s.provider === "google" && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Google Maps API key</label>
              <div className="flex gap-2 mt-1">
                <input value={s.googleApiKey} onChange={(e) => setS({ ...s, googleApiKey: e.target.value })}
                  placeholder={envKeySet ? "Using the key from the server's .env file" : "AIza..."}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono" />
                <button onClick={runTest} disabled={testing || !s.googleApiKey}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold disabled:opacity-40 flex items-center gap-2">
                  {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Test key
                </button>
              </div>
            </div>
            {test && (
              <div className="text-xs space-y-1 bg-gray-50 rounded-2xl p-4">
                {test.error ? <p className="text-red-600 font-bold">{test.error}</p> : (
                  [["mapImages", "Map images (Map Tiles API)"], ["search", "Address search (Places API (New))"], ["placeNames", "Place names (Geocoding API)"]].map(([k, label]) => (
                    <p key={k} className="flex items-start gap-2">
                      {test[k] === "ok" ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span><strong>{label}:</strong> {test[k] === "ok" ? "working" : test[k]}</span>
                    </p>
                  ))
                )}
              </div>
            )}
            <details className="text-[11px] text-gray-600 bg-sky-50 rounded-2xl p-4">
              <summary className="font-bold cursor-pointer text-sky-900">How to get a Google key</summary>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Go to console.cloud.google.com, create a project and turn on billing (Google gives a monthly free allowance).</li>
                <li>Under "APIs & Services → Library", enable <strong>Map Tiles API</strong>, <strong>Places API (New)</strong> and <strong>Geocoding API</strong>.</li>
                <li>Under "Credentials", create an API key. Under "API restrictions", allow only those three APIs. Leave "Application restrictions" as None, because both your server and your customers' phones use the key.</li>
                <li>Paste the key here, press <strong>Test key</strong>, then <strong>Save</strong>.</li>
              </ol>
              <p className="mt-2">If Google stops working (for example, billing runs out), the app switches back to OpenStreetMap by itself.</p>
            </details>
          </div>
        )}
      </section>

      {/* Coverage */}
      <section className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-gray-900">Delivery coverage</h2>
            <p className="text-[11px] text-gray-500">When on, customers must pin a location inside one of these circles to order.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input type="checkbox" checked={s.coverageEnabled} onChange={(e) => setS({ ...s, coverageEnabled: e.target.checked })} />
            {s.coverageEnabled ? "On" : "Off"}
          </label>
        </div>

        <LeafletMap
          className="h-80"
          zoom={11}
          center={sel ? { lat: sel.lat, lng: sel.lng } : null}
          circles={s.areas}
          markers={s.areas.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, kind: "vendor" as const, label: a.name, draggable: true }))}
          onMarkerDrag={(id, lat, lng) => { updateArea(id, { lat, lng }); setSelected(id); }}
          onMapClick={(lat, lng) => { if (sel) updateArea(sel.id, { lat, lng }); else addArea(lat, lng); }}
        />
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Select an area below, then tap the map (or drag its pin) to move its centre.</p>

        <div className="space-y-2">
          {s.areas.map((a) => (
            <div key={a.id} onClick={() => setSelected(a.id)}
              className={`grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-center p-3 rounded-2xl border-2 cursor-pointer ${selected === a.id ? "border-green-500 bg-green-50/40" : "border-gray-100"}`}>
              <input value={a.name} onChange={(e) => updateArea(a.id, { name: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold" placeholder="Area name, e.g. Ilorin" />
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={200} step={0.5} value={a.radiusKm}
                  onChange={(e) => updateArea(a.id, { radiusKm: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
                <span className="text-xs font-bold text-gray-500">km</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setS({ ...s, areas: s.areas.filter((x) => x.id !== a.id) }); if (selected === a.id) setSelected(null); }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl justify-self-end" aria-label="Remove area">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => addArea(sel?.lat, sel?.lng)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-600 w-full justify-center">
            <Plus className="w-4 h-4" /> Add delivery area
          </button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase">Message for customers outside the area</label>
          <textarea value={s.coverageMessage} onChange={(e) => setS({ ...s, coverageMessage: e.target.value })} rows={2}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </section>

      {msg && <p className={`text-xs font-bold p-3 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#070329] text-white text-sm font-black disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save map settings
      </button>
    </div>
  );
};
