import React, { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Clock, Loader2, Pencil, Send, XCircle } from "lucide-react";
import { api, naira } from "../apiClient";

// Earnings & payouts for a restaurant or rider: see what's owed, save bank
// details, and ask admin to pay out. Admin transfers the money and presses
// "Paid"; this page then shows it as paid.

interface Account { bankName: string; accountNumber: string; accountName: string }
interface PayoutReq {
  id: string; amount: number; status: "pending" | "paid" | "rejected"; requestedAt: string; processedAt?: string | null;
  reference?: string | null; adminNote?: string | null; orderCount: number; bankName: string; accountNumber: string;
}
interface Recipient {
  type: "vendor" | "rider"; id: string; name: string; available: number; orderCount: number;
  account: Account | null; requests: PayoutReq[];
}

const BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank", "FCMB", "Globus Bank", "GTBank", "Heritage Bank",
  "Jaiz Bank", "Keystone Bank", "Kuda", "Moniepoint", "OPay", "PalmPay", "Polaris Bank", "Providus Bank", "Stanbic IBTC",
  "Standard Chartered", "Sterling Bank", "SunTrust Bank", "Titan Trust Bank", "Union Bank", "UBA", "Unity Bank", "Wema Bank", "Zenith Bank",
];

export const EarningsPage: React.FC<{ role: "vendor" | "rider" }> = ({ role }) => {
  const [data, setData] = useState<{ recipients: Recipient[]; minAmount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api("/api/payouts/me").then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-sm font-semibold">{error}</div>;
  if (!data) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const mine = data.recipients.filter((r) => r.type === role);
  if (mine.length === 0) {
    return (
      <div className="p-6 bg-amber-50 text-amber-800 rounded-2xl text-sm font-semibold">
        Your {role === "vendor" ? "restaurant" : "rider account"} needs to be approved before you can request payouts.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-950">Earnings & Payouts</h1>
        <p className="text-xs text-gray-500 mt-1">
          {role === "vendor"
            ? "You earn the food total of each delivered order, minus the platform commission. Delivery, service fee and VAT are not part of your earnings."
            : "You earn the delivery fee of each order you deliver, minus the platform commission."}
        </p>
      </div>
      {mine.map((r) => <RecipientCard key={r.id} r={r} minAmount={data.minAmount} onChanged={load} />)}
    </div>
  );
};

const RecipientCard: React.FC<{ r: Recipient; minAmount: number; onChanged: () => void }> = ({ r, minAmount, onChanged }) => {
  const [editing, setEditing] = useState(!r.account);
  const [form, setForm] = useState<Account>(r.account || { bankName: "", accountNumber: "", accountName: "" });
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pending = r.requests.find((x) => x.status === "pending");
  const belowMin = minAmount > 0 && r.available < minAmount;

  const saveAccount = async () => {
    setSaving(true); setMsg(null);
    try {
      await api("/api/payouts/account", { body: { type: r.type, recipientId: r.id, ...form } });
      setEditing(false);
      setMsg({ ok: true, text: "Bank details saved." });
      onChanged();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally { setSaving(false); }
  };

  const request = async () => {
    if (!window.confirm(`Request a payout of ${naira(r.available)} to ${r.account?.bankName} (${r.account?.accountName})?`)) return;
    setRequesting(true); setMsg(null);
    try {
      await api("/api/payouts/request", { body: { type: r.type, recipientId: r.id } });
      setMsg({ ok: true, text: "Request sent. Admin has been notified and will pay you shortly." });
      onChanged();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally { setRequesting(false); }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-6">
      {/* Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{r.name} · Available to withdraw</p>
          <p className="text-3xl font-black text-gray-950 font-mono mt-1">{naira(r.available)}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            From {r.orderCount} delivered order{r.orderCount === 1 ? "" : "s"} not yet paid out
            {pending ? " (orders in your waiting request are not counted)" : ""}.
          </p>
        </div>
        <button
          onClick={request}
          disabled={requesting || !!pending || !r.account || r.available <= 0 || belowMin}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-green-600 text-white text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Request payout
        </button>
      </div>
      {pending && (
        <p className="text-[11px] font-bold bg-amber-50 text-amber-800 p-3 rounded-xl">
          Your request for {naira(pending.amount)} is waiting for admin to pay. You can request again once it's paid.
        </p>
      )}
      {!pending && !r.account && <p className="text-[11px] font-bold text-gray-500">Add your bank details below to request a payout.</p>}
      {!pending && r.account && belowMin && r.available > 0 && (
        <p className="text-[11px] font-bold text-gray-500">The minimum payout is {naira(minAmount)}.</p>
      )}
      {msg && <p className={`text-xs font-bold p-3 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {/* Bank details */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><Banknote className="w-4 h-4" /> Bank account for payouts</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-purple-700 flex items-center gap-1"><Pencil className="w-3 h-3" /> Change</button>
          )}
        </div>
        {!editing && r.account ? (
          <div className="text-sm text-gray-700 bg-gray-50 rounded-2xl p-4">
            <p className="font-bold">{r.account.accountName}</p>
            <p className="font-mono">{r.account.accountNumber} · {r.account.bankName}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Bank</label>
              <input list="ng-banks" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="e.g. OPay" />
              <datalist id="ng-banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Account number</label>
              <input inputMode="numeric" maxLength={10} value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono" placeholder="10 digits" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Account name</label>
              <input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="As on your bank account" />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button onClick={saveAccount} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#070329] text-white text-xs font-black disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save bank details
              </button>
              {r.account && (
                <button onClick={() => { setEditing(false); setForm(r.account!); }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold">Cancel</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-black text-gray-900 mb-3">Payout requests</h3>
        {r.requests.length === 0 ? (
          <p className="text-xs text-gray-400">No requests yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {r.requests.map((q) => (
              <div key={q.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black font-mono text-gray-900">{naira(q.amount)}</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(q.requestedAt).toLocaleString()} · {q.orderCount} order(s) · {q.bankName} {q.accountNumber}
                  </p>
                  {q.reference && <p className="text-[11px] text-gray-500">Ref: {q.reference}</p>}
                  {q.adminNote && <p className="text-[11px] text-gray-600 italic">Note: {q.adminNote}</p>}
                </div>
                <StatusPill status={q.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  if (status === "paid") return <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-green-50 text-green-700"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
  if (status === "rejected") return <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-red-50 text-red-700"><XCircle className="w-3 h-3" /> Declined</span>;
  return <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-amber-50 text-amber-700"><Clock className="w-3 h-3" /> Waiting</span>;
};
