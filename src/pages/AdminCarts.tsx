import React, { useEffect, useState } from "react";
import { Loader2, MessageCircle, Phone, RefreshCw, ShoppingCart } from "lucide-react";
import { api, naira, timeAgo } from "../apiClient";

// What logged-in customers have in their carts right now but haven't
// ordered yet -- so the team can call/WhatsApp them and close the sale.

interface CartRow {
  userId: string; userName?: string | null; userPhone?: string | null; vendorId?: string | null; vendorName?: string | null;
  items: { productId: string; name: string; image?: string | null; price: number; quantity: number; addons: { name: string; price: number; quantity: number }[]; lineTotal: number }[];
  itemCount: number; subtotal: number; updatedAt: string;
}

function waLink(phone: string, name: string, vendor: string) {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  const text = `Hello ${name || ""}, this is Owode Food 👋 We noticed you have items from ${vendor || "a restaurant"} in your cart. Can we help you complete your order?`;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export const AdminCarts: React.FC = () => {
  const [data, setData] = useState<{ carts: CartRow[]; keepDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => { setError(null); api("/api/admin/carts").then(setData).catch((e) => setError(e.message)); };
  useEffect(() => { load(); const t = window.setInterval(load, 60000); return () => window.clearInterval(t); }, []);

  const total = data?.carts.reduce((s, c) => s + c.subtotal, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950">Active Carts</h1>
          <p className="text-xs text-gray-500 mt-1">
            Logged-in customers with food in their cart who haven't ordered yet. Carts older than {data?.keepDays || 7} days are removed. Guests who aren't logged in can't be seen.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold self-start"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {data && data.carts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Carts</p>
            <p className="text-xl font-black">{data.carts.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Food value</p>
            <p className="text-xl font-black font-mono">{naira(total)}</p>
          </div>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-semibold">{error}</div>}
      {!data && !error && <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
      {data && data.carts.length === 0 && (
        <div className="p-10 text-center bg-white border border-gray-100 rounded-3xl text-sm text-gray-400 font-semibold">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" /> No open carts right now.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.carts.map((c) => (
          <div key={c.userId} className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900">{c.userName || "Customer"}</p>
                <p className="text-[11px] text-gray-500">{c.vendorName || "Restaurant"} · updated {timeAgo(c.updatedAt)}</p>
              </div>
              <p className="text-lg font-black font-mono shrink-0">{naira(c.subtotal)}</p>
            </div>
            <ul className="text-xs text-gray-700 space-y-1 bg-gray-50 rounded-2xl p-3">
              {c.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-2">
                  <span className="min-w-0">
                    <strong>{i.quantity}×</strong> {i.name}
                    {i.addons?.length > 0 && <span className="text-gray-400"> + {i.addons.map((a) => a.name).join(", ")}</span>}
                  </span>
                  <span className="font-mono shrink-0">{naira(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {c.userPhone ? (
              <div className="flex gap-2">
                <a href={`tel:${c.userPhone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-xs font-bold">
                  <Phone className="w-4 h-4" /> {c.userPhone}
                </a>
                <a href={waLink(c.userPhone, c.userName || "", c.vendorName || "")} target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No phone number on this account.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
