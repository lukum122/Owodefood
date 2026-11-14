import React, { useEffect, useState } from "react";
import { Headphones, Loader2, X } from "lucide-react";
import { chatApi, refreshUnread, useChatUnread, useQueryParam } from "./chatApi";
import { ChatThreadView } from "./ChatThreadView";
import { useDatabase } from "../context/DatabaseContext";

type Role = "customer" | "rider" | "vendor";

export const SupportChatModal: React.FC<{ role: Role; onClose: () => void }> = ({ role, onClose }) => {
  const { currentUser } = useDatabase();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [orders, setOrders] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chatApi.openSupport(role)
      .then((d) => {
        setThreadId(d.thread.id);
        setOrders((d.recentOrders || []).map((o: any) => ({
          id: o.id,
          label: `#${String(o.id).substring(0, 8)} · ${o.vendorName || ""} · ${String(o.status).replace(/_/g, " ")}`,
        })));
      })
      .catch((e) => setError(e.message));
  }, [role]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-4 flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center"><Headphones className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-black text-gray-950">OwodeFood Support</p>
              <p className="text-[11px] text-green-600 font-semibold">Available 24/7</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        {error && <p className="text-xs text-red-600 py-6 text-center">{error}</p>}
        {!threadId && !error && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
        {threadId && currentUser && (
          <ChatThreadView
            threadId={threadId}
            myUserId={currentUser.id}
            attachableOrders={orders}
            emptyText="Tell us what you need help with. If it's about an order, pick it below so we can see the details."
            heightClass="h-[62vh]"
          />
        )}
      </div>
    </div>
  );
};

// Button for any screen. Opens automatically from a notification (?support=1).
export const SupportChatButton: React.FC<{ role: Role; className?: string; label?: string; floating?: boolean }> = ({ role, className, label, floating }) => {
  const { currentUser } = useDatabase();
  const unread = useChatUnread();
  const [open, setOpen] = useState(false);
  const [param, clearParam] = useQueryParam("support");

  useEffect(() => {
    if (param && currentUser) { setOpen(true); clearParam(); }
  }, [param, currentUser]);

  if (!currentUser) return null;
  const count = unread.support[role] || 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Chat with support"
        className={
          className ||
          (floating
            ? "fixed z-40 right-4 bottom-24 lg:bottom-6 w-12 h-12 rounded-full bg-[#070329] text-white shadow-lg flex items-center justify-center cursor-pointer"
            : "relative w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#070329] text-white font-bold text-xs rounded-xl cursor-pointer")
        }
      >
        <Headphones className="w-5 h-5" />
        {!floating && (label || "Chat with support")}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{count}</span>
        )}
      </button>
      {open && <SupportChatModal role={role} onClose={() => { setOpen(false); refreshUnread(); }} />}
    </>
  );
};

// Invisible: only opens support chat when the page is reached from a
// support notification (?support=1). Used where the visible button lives
// inside a menu that isn't open yet.
export const SupportDeepLink: React.FC<{ role: Role }> = ({ role }) => {
  const { currentUser } = useDatabase();
  const [open, setOpen] = useState(false);
  const [param, clearParam] = useQueryParam("support");
  useEffect(() => {
    if (param && currentUser) { setOpen(true); clearParam(); }
  }, [param, currentUser]);
  return open ? <SupportChatModal role={role} onClose={() => { setOpen(false); refreshUnread(); }} /> : null;
};
