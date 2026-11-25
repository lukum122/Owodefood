import React, { useEffect, useState } from "react";
import { Bike, CheckCircle2, Copy, Loader2, RefreshCw, Store, XCircle } from "lucide-react";
import { api, naira, timeAgo } from "../apiClient";
import { StatusPill } from "./EarningsPage";

// Restaurants and riders ask to be paid; admin sends the bank transfer,
// then presses "Paid" here. That settles the orders and tells them.

interface Req {
  id: string; recipientType: "vendor" | "rider"; recipientId: string; recipientName: string; amount: number;
  orderIds: string[]; bankName: string; bankAccountNumber: string; bankAccountName: string; note?: string | null;
  status: "pending" | "paid" | "rejected"; adminNote?: string | null; reference?: string | null;
  requestedAt: string; processedAt?: string | null;
}

export const AdminPayoutRequests: React.FC = () => {
  const [tab, setTab] = useState<"pending" | "paid" | "rejected">("pending");
  const [data, setData] = useState<{ requests: Req[]; pendingCount: number; minAmount: number; canProcess: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [minDraft, setMinDraft] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api(`/api/admin/payout-requests?status=${tab}`)
      .then((d) => { setData(d); setMinDraft(String(d.minAmount || 0)); })
      .catch((e) => setError(e.message));
  };
  useEffect(() => { setData(null); load(); }, [tab]);

  // Reload when a new request notification arrives.
  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent).detail?.title || "";
      if (/payout request/i.test(t)) load();
    };
    window.addEventListener("fd-toast", onToast);
    return () => window.removeEventListener("fd-toast", onToast);
  }, [tab]);

  const markPaid = async (r: Req) => {
    if (!window.confirm(`Have you transferred ${naira(r.amount)} to ${r.bankAccountName} (${r.bankName} ${r.bankAccountNumber})?\n\nPress OK to mark it as paid.`)) return;
    setBusy(r.id);
    try {
      await api(`/api/admin/payout-requests/${r.id}/paid`, { body: { reference: refs[r.id] || "" } });
      load();
    } catch (e: any) { window.alert(e.message); } finally { setBusy(null); }
  };

  const reject = async (r: Req) => {
    const reason = window.prompt(`Decline ${r.recipientName}'s request for ${naira(r.amount)}? Give a reason (they will see it):`);
    if (reason === null) return;
    setBusy(r.id);
    try {
      await api(`/api/admin/payout-requests/${r.id}/reject`, { body: { adminNote: reason } });
      load();
    } catch (e: any) { window.alert(e.message); } finally { setBusy(null); }
  };

  const saveMin = async () => {
    try {
      await api("/api/admin/payout-settings", { body: { minAmount: Number(minDraft) || 0 } });
      load();
    } catch (e: any) { window.alert(e.message); }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950">Payout Requests</h1>
          <p className="text-xs text-gray-500 mt-1">Transfer the money from your bank app, then press <strong>Paid</strong>. The restaurant or rider is notified straight away.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold self-start"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="flex gap-2">
        {(["pending", "paid", "rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-black capitalize ${tab === t ? "bg-[#070329] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            {t === "pending" ? `Waiting${data?.pendingCount ? ` (${data.pendingCount})` : ""}` : t === "rejected" ? "Declined" : "Paid"}
          </button>
        ))}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-semibold">{error}</div>}
      {!data && !error && <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

      {data && data.requests.length === 0 && (
        <div className="p-10 text-center bg-white border border-gray-100 rounded-3xl text-sm text-gray-400 font-semibold">
          {tab === "pending" ? "No payout requests waiting." : "Nothing here yet."}
        </div>
      )}

      <div className="space-y-4">
        {data?.requests.map((r) => (
          <div key={r.id} className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${r.recipientType === "vendor" ? "bg-purple-50 text-purple-600" : "bg-sky-50 text-sky-600"}`}>
                  {r.recipientType === "vendor" ? <Store className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">{r.recipientName}</p>
                  <p className="text-[11px] text-gray-500">{r.recipientType === "vendor" ? "Restaurant" : "Rider"} · asked {timeAgo(r.requestedAt)} · {r.orderIds?.length || 0} order(s)</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-black font-mono text-gray-950">{naira(r.amount)}</p>
                <StatusPill status={r.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <Field label="Bank" value={r.bankName} />
              <Field label="Account number" value={r.bankAccountNumber} mono onCopy={() => copy(r.bankAccountNumber, r.id + "n")} copied={copied === r.id + "n"} />
              <Field label="Account name" value={r.bankAccountName} />
            </div>
            {r.note && <p className="text-[11px] text-gray-600 italic">Their note: {r.note}</p>}
            {r.reference && <p className="text-[11px] text-gray-600">Transfer ref: {r.reference}</p>}
            {r.adminNote && <p className="text-[11px] text-gray-600">Admin note: {r.adminNote}</p>}
            {r.processedAt && <p className="text-[11px] text-gray-400">Processed {new Date(r.processedAt).toLocaleString()}</p>}

            {r.status === "pending" && data.canProcess && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input value={refs[r.id] || ""} onChange={(e) => setRefs({ ...refs, [r.id]: e.target.value })}
                  placeholder="Transfer reference (optional)" className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs" />
                <button onClick={() => markPaid(r)} disabled={busy === r.id}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-black disabled:opacity-50">
                  {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Paid
                </button>
                <button onClick={() => reject(r)} disabled={busy === r.id}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-black disabled:opacity-50">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </div>
            )}
            {r.status === "pending" && !data.canProcess && (
              <p className="text-[11px] text-gray-400">Only an admin can mark this as paid.</p>
            )}
          </div>
        ))}
      </div>

      {data?.canProcess && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Minimum payout amount (₦)</label>
            <input inputMode="numeric" value={minDraft} onChange={(e) => setMinDraft(e.target.value.replace(/\D/g, ""))}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono" />
            <p className="text-[10px] text-gray-400 mt-1">Restaurants and riders can't request less than this. 0 means no minimum.</p>
          </div>
          <button onClick={saveMin} className="px-5 py-2.5 rounded-xl bg-[#070329] text-white text-xs font-black">Save</button>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }> = ({ label, value, mono, onCopy, copied }) => (
  <div className="bg-gray-50 rounded-xl p-3">
    <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
    <div className="flex items-center gap-2">
      <p className={`font-bold text-gray-900 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      {onCopy && (
        <button onClick={onCopy} className="text-gray-400 hover:text-gray-700 shrink-0" aria-label="Copy">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  </div>
);
