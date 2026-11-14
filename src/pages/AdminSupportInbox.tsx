import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Headphones, Loader2, Phone, RotateCcw, UserCheck } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import { chatApi, onChatMessage, onChatThreadUpdate, refreshUnread } from "../chat/chatApi";
import { ChatThreadView } from "../chat/ChatThreadView";

interface InboxThread {
  id: string;
  status: "new" | "open" | "resolved";
  ownerRole: "customer" | "rider" | "vendor";
  ownerName: string;
  ownerPhone: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  attachedOrderId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: number;
}

const ROLE_BADGE: Record<string, string> = {
  customer: "bg-sky-50 text-sky-700",
  rider: "bg-amber-50 text-amber-700",
  vendor: "bg-violet-50 text-violet-700",
};

function ago(iso: string | null) {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

// Shared inbox: every admin and every staff member can read and reply.
// "Taken by" shows who's handling a chat so two people don't answer the
// same person -- anyone can still step in.
export const AdminSupportInbox: React.FC = () => {
  const { currentUser, currency } = useDatabase();
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const [threads, setThreads] = useState<InboxThread[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [context, setContext] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    chatApi.inbox(tab).then((d) => { setThreads(d.threads); setError(null); }).catch((e) => setError(e.message));

  useEffect(() => { setThreads(null); load(); }, [tab]);
  useEffect(() => {
    let t: any;
    const soon = () => { clearTimeout(t); t = setTimeout(load, 300); };
    const off1 = onChatMessage((ev) => { if (ev.kind === "support") soon(); });
    const off2 = onChatThreadUpdate(soon);
    return () => { off1(); off2(); clearTimeout(t); };
  }, [tab]);

  useEffect(() => {
    if (!selected) { setContext(null); return; }
    chatApi.supportContext(selected).then(setContext).catch(() => setContext(null));
    setThreads((prev) => prev?.map((t) => (t.id === selected ? { ...t, unread: 0 } : t)) || prev);
  }, [selected]);

  const current = useMemo(() => threads?.find((t) => t.id === selected) || null, [threads, selected]);

  const act = async (fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); await load(); if (selected) setContext(await chatApi.supportContext(selected)); refreshUnread(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const newCount = threads?.filter((t) => t.status === "new").length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-950 flex items-center gap-2"><Headphones className="w-5 h-5" /> Support Inbox</h1>
          <p className="text-xs text-gray-500">Chats from customers, riders and vendors. Every staff member can reply.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["active", "resolved"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${tab === t ? "bg-white shadow-sm text-gray-950" : "text-gray-500"}`}>
              {t === "active" ? `Active${newCount ? ` (${newCount} new)` : ""}` : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* List */}
        <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden ${selected ? "hidden lg:block" : ""}`}>
          {!threads && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
          {threads && threads.length === 0 && <p className="text-xs text-gray-400 text-center py-10">{tab === "active" ? "No open chats. All caught up." : "No resolved chats yet."}</p>}
          <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
            {threads?.map((t) => (
              <button key={t.id} onClick={() => setSelected(t.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer ${selected === t.id ? "bg-sky-50/60" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px] text-gray-900 truncate flex-1">{t.ownerName}</span>
                  <span className="text-[10px] text-gray-400">{ago(t.lastMessageAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${ROLE_BADGE[t.ownerRole] || ""}`}>{t.ownerRole}</span>
                  {t.status === "new" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">New</span>}
                  {t.assignedName && <span className="text-[10px] text-gray-500 truncate">· {t.assignedTo === currentUser?.id ? "You" : t.assignedName}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[12px] text-gray-500 truncate flex-1">{t.lastMessagePreview}</p>
                  {t.unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{t.unread}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className={`bg-white border border-gray-100 rounded-2xl p-4 ${selected ? "" : "hidden lg:block"}`}>
          {!current && <p className="text-xs text-gray-400 text-center py-20">Pick a conversation.</p>}
          {current && currentUser && (
            <div className="grid xl:grid-cols-[1fr_260px] gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
                  <button onClick={() => setSelected(null)} className="lg:hidden p-1 cursor-pointer" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-950 truncate">{current.ownerName}</p>
                    <p className="text-[11px] text-gray-500">
                      {current.assignedName ? <>Taken by <b>{current.assignedTo === currentUser.id ? "you" : current.assignedName}</b></> : "Not taken yet"}
                    </p>
                  </div>
                  {current.ownerPhone && (
                    <a href={`tel:${current.ownerPhone}`} className="p-2 rounded-full bg-green-50 text-green-700" aria-label="Call"><Phone className="w-4 h-4" /></a>
                  )}
                  {current.assignedTo !== currentUser.id && (
                    <button disabled={busy} onClick={() => act(() => chatApi.claim(current.id))}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1 cursor-pointer">
                      <UserCheck className="w-3.5 h-3.5" /> Take
                    </button>
                  )}
                  {current.status !== "resolved" ? (
                    <button disabled={busy} onClick={() => act(() => chatApi.setStatus(current.id, "resolved"))}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white flex items-center gap-1 cursor-pointer">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                    </button>
                  ) : (
                    <button disabled={busy} onClick={() => act(() => chatApi.setStatus(current.id, "open"))}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1 cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5" /> Reopen
                    </button>
                  )}
                </div>
                <ChatThreadView key={current.id} threadId={current.id} myUserId={currentUser.id} observer heightClass="h-[60vh]" />
              </div>

              <aside className="space-y-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="font-bold text-gray-900">{context?.owner?.name || current.ownerName}</p>
                  <p className="text-gray-500 capitalize">{current.ownerRole}</p>
                  {context?.owner?.phone && <p className="text-gray-600">{context.owner.phone}</p>}
                  {context?.owner?.email && <p className="text-gray-600 break-all">{context.owner.email}</p>}
                </div>
                {current.attachedOrderId && (
                  <p className="text-[11px] bg-sky-50 text-sky-800 rounded-lg px-2 py-1.5 font-semibold">Asked about order #{current.attachedOrderId.substring(0, 8)}</p>
                )}
                <div>
                  <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1.5">Recent orders</p>
                  {!context && <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}
                  {context?.recentOrders?.length === 0 && <p className="text-gray-400">None</p>}
                  <div className="space-y-1.5">
                    {context?.recentOrders?.map((o: any) => (
                      <div key={o.id} className={`rounded-lg border px-2 py-1.5 ${o.id === current.attachedOrderId ? "border-sky-300 bg-sky-50/50" : "border-gray-100"}`}>
                        <div className="flex justify-between font-semibold text-gray-800">
                          <span>#{o.id.substring(0, 8)}</span>
                          <span>{currency}{Number(o.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-500 truncate">{current.ownerRole === "vendor" ? o.customerName : o.vendorName}</p>
                        <p className="text-gray-400 capitalize">{String(o.status).replace(/_/g, " ")} · {new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportInbox;
