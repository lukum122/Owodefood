import React, { useEffect, useState } from "react";
import { Loader2, MessageCircle, Phone, X } from "lucide-react";
import { chatApi, OrderThread, onChatMessage, refreshUnread, useChatUnread, useQueryParam } from "./chatApi";
import { ChatThreadView } from "./ChatThreadView";
import { useDatabase } from "../context/DatabaseContext";

const RIDER_QUICK_REPLIES_CUSTOMER = ["I've picked up your order", "I'm on my way", "I've arrived", "Please come out", "I can't find the address", "Please call me"];
const RIDER_QUICK_REPLIES_VENDOR = ["I'm on my way to pick up", "I've arrived", "Is the order ready?"];
const VENDOR_QUICK_REPLIES_RIDER = ["Order is ready", "Give us 5 more minutes", "Packing now"];

interface Props {
  orderId: string;
  // Admin/staff viewing: all chats for the order, read-only.
  observer?: boolean;
  compact?: boolean;
  className?: string;
}

export const OrderChatButton: React.FC<Props> = ({ orderId, observer, compact, className }) => {
  const { currentUser } = useDatabase();
  const unread = useChatUnread();
  const [open, setOpen] = useState(false);
  const [chatParam, clearChatParam] = useQueryParam("chat");

  // Opened from a phone notification: ?chat=<orderId>
  useEffect(() => {
    if (chatParam && chatParam === orderId) {
      setOpen(true);
      clearChatParam();
    }
  }, [chatParam, orderId]);

  if (!currentUser) return null;
  const count = observer ? 0 : unread.byOrder[orderId] || 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className || `relative inline-flex items-center justify-center gap-1.5 ${compact ? "py-2 px-3" : "py-2.5 px-4"} border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-xl cursor-pointer transition`}
      >
        <MessageCircle className="w-4 h-4" />
        {observer ? "View chats" : "Chat"}
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && <OrderChatModal orderId={orderId} observer={observer} onClose={() => { setOpen(false); refreshUnread(); }} />}
    </>
  );
};

const OrderChatModal: React.FC<{ orderId: string; observer?: boolean; onClose: () => void }> = ({ orderId, observer, onClose }) => {
  const { currentUser } = useDatabase();
  const [threads, setThreads] = useState<OrderThread[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    chatApi.orderThreads(orderId)
      .then((d) => {
        setThreads(d.threads);
        setActive((cur) => cur && d.threads.some((t) => t.id === cur) ? cur : (d.threads.find((t) => t.unread > 0) || d.threads[0])?.id || null);
      })
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, [orderId]);

  // Keep tab badges fresh while open.
  useEffect(() => onChatMessage((ev) => {
    if (ev.orderId !== orderId || ev.message.senderId === currentUser?.id) return;
    setThreads((prev) => prev?.map((t) => (t.id === ev.threadId && t.id !== active ? { ...t, unread: t.unread + 1 } : t)) || prev);
  }), [orderId, active, currentUser?.id]);

  const current = threads?.find((t) => t.id === active) || null;

  const quick =
    current?.myRole === "rider" ? (current.pair === "customer_rider" ? RIDER_QUICK_REPLIES_CUSTOMER : RIDER_QUICK_REPLIES_VENDOR)
    : current?.myRole === "vendor" && current.pair === "rider_vendor" ? VENDOR_QUICK_REPLIES_RIDER
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-4 flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-black text-gray-950">{observer ? "Order chats (view only)" : "Chat"}</p>
            <p className="text-[11px] text-gray-500">Order #{orderId.substring(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-xs text-red-600 py-6 text-center">{error}</p>}
        {!threads && !error && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}

        {threads && threads.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-2">
            {threads.map((t) => (
              <button key={t.id} onClick={() => { setActive(t.id); setThreads((p) => p?.map((x) => (x.id === t.id ? { ...x, unread: 0 } : x)) || p); }}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer ${t.id === active ? "bg-white text-gray-950 shadow-sm" : "text-gray-500"}`}>
                {t.title}
                {t.unread > 0 && t.id !== active && <span className="ml-1 inline-block min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px]">{t.unread}</span>}
              </button>
            ))}
          </div>
        )}

        {current && current.counterpart && (
          <div className="flex items-center gap-3 border-b border-gray-100 pb-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center text-xs font-black">
              {(current.counterpart.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 truncate">{current.counterpart.name}</p>
              <p className="text-[11px] text-gray-500 capitalize">{current.counterpart.role === "vendor" ? "Restaurant" : current.counterpart.role}</p>
            </div>
            {current.counterpart.phone && (
              <a href={`tel:${current.counterpart.phone}`} className="p-2.5 rounded-full bg-green-50 text-green-700" aria-label={`Call ${current.counterpart.name}`}>
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {current && currentUser && (
          <ChatThreadView
            key={current.id}
            threadId={current.id}
            myUserId={currentUser.id}
            quickReplies={quick}
            observer={observer || !current.myRole}
            heightClass="h-[58vh]"
          />
        )}
        {current && current.canWrite && current.closesAt && (
          <p className="text-[10px] text-gray-400 text-center pt-1">
            Chat closes at {new Date(current.closesAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
};
