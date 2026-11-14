import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Lock, Paperclip, Send, X } from "lucide-react";
import { chatApi, ChatMessage, onChatMessage } from "./chatApi";
import { compressImageToDataUrl } from "../imageUtils";
import { SecureImage } from "../components/SecureImage";

interface Props {
  threadId: string;
  myUserId: string;
  // One-tap messages (riders).
  quickReplies?: string[];
  // Support: let the person attach one of their recent orders.
  attachableOrders?: { id: string; label: string }[];
  // Admin viewing someone else's order chat: show every sender's name.
  observer?: boolean;
  emptyText?: string;
  heightClass?: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export const ChatThreadView: React.FC<Props> = ({ threadId, myUserId, quickReplies, attachableOrders, observer, emptyText, heightClass }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setError(null);
    chatApi.messages(threadId)
      .then((d) => {
        if (cancelled) return;
        setMessages(d.messages);
        setHasMore(d.hasMore);
        setCanWrite(d.canWrite);
        stickToBottom.current = true;
        scrollDown();
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    const off = onChatMessage((ev) => {
      if (ev.threadId !== threadId) return;
      setMessages((prev) => (prev.some((m) => m.id === ev.message.id) ? prev : [...prev, ev.message]));
      if (ev.message.senderId !== myUserId) chatApi.markRead(threadId);
      if (stickToBottom.current) scrollDown();
    });
    return () => { cancelled = true; off(); };
  }, [threadId, myUserId]);

  const loadEarlier = async () => {
    if (!messages.length) return;
    const el = listRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const d = await chatApi.messages(threadId, messages[0].createdAt);
      setMessages((prev) => [...d.messages, ...prev]);
      setHasMore(d.hasMore);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
    } catch {}
  };

  const send = async (override?: string) => {
    const body = (override ?? text).trim();
    if (!body && !photo) return;
    setSending(true);
    setError(null);
    try {
      const r = await chatApi.send(threadId, { body, image: photo || undefined, orderRef: orderRef || undefined });
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
      if (!override) setText("");
      setPhoto(null);
      setOrderRef("");
      stickToBottom.current = true;
      scrollDown();
    } catch (e: any) {
      setError(e.message);
      if (/closed/i.test(e.message)) setCanWrite(false);
    } finally {
      setSending(false);
    }
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setPhoto(await compressImageToDataUrl(f, 1024, 0.65)); } catch (err: any) { setError(err?.message || "Couldn't read that photo."); }
  };

  return (
    <div className={`flex flex-col ${heightClass || "h-[60vh]"} min-h-0`}>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto px-1 py-2 space-y-2"
      >
        {hasMore && (
          <button onClick={loadEarlier} className="block mx-auto text-[11px] font-bold text-sky-600 py-1 cursor-pointer">Load earlier messages</button>
        )}
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-10">{emptyText || "No messages yet. Say hello 👋"}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === myUserId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {(!mine && (observer || m.senderRole === "support")) && (
                <span className="text-[10px] font-semibold text-gray-500 mb-0.5 px-1">{m.senderName}</span>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${mine ? "bg-[#070329] text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"}`}>
                {m.imageUrl && <SecureImage src={m.imageUrl} alt="Photo" className="rounded-xl mb-1 max-h-56 w-auto object-cover" />}
                {m.orderRef && <p className={`text-[10px] font-bold mb-1 ${mine ? "text-sky-200" : "text-sky-700"}`}>About order #{m.orderRef.substring(0, 8)}</p>}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 px-1">{timeLabel(m.createdAt)}</span>
            </div>
          );
        })}
      </div>

      {error && <p className="text-[11px] text-red-600 font-semibold px-1 py-1">{error}</p>}

      {canWrite ? (
        <div className="border-t border-gray-100 pt-2 space-y-2">
          {quickReplies && quickReplies.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {quickReplies.map((q) => (
                <button key={q} disabled={sending} onClick={() => send(q)}
                  className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer">
                  {q}
                </button>
              ))}
            </div>
          )}
          {attachableOrders && attachableOrders.length > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <Paperclip className="w-3.5 h-3.5 text-gray-400" />
              <select value={orderRef} onChange={(e) => setOrderRef(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 bg-white text-[11px]">
                <option value="">Not about a specific order</option>
                {attachableOrders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          )}
          {photo && (
            <div className="relative inline-block">
              <img src={photo} alt="To send" className="h-20 rounded-xl border border-gray-200" />
              <button onClick={() => setPhoto(null)} className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-200 p-0.5 cursor-pointer" aria-label="Remove photo"><X className="w-3 h-3" /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
            <button onClick={() => fileRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-800 cursor-pointer" aria-label="Add photo"><Camera className="w-5 h-5" /></button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) { e.preventDefault(); send(); } }}
              rows={1}
              maxLength={1000}
              placeholder="Type a message"
              className="flex-1 resize-none border border-gray-200 rounded-2xl px-3 py-2 text-[13px] outline-none focus:border-[#070329] max-h-28"
            />
            <button onClick={() => send()} disabled={sending || (!text.trim() && !photo)}
              className="p-2.5 bg-[#070329] text-white rounded-full disabled:opacity-40 cursor-pointer" aria-label="Send">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="border-t border-gray-100 pt-2 text-[11px] text-gray-500 flex items-center justify-center gap-1.5 py-2">
            <Lock className="w-3.5 h-3.5" /> {observer ? "View only" : "This chat is closed"}
          </div>
        )
      )}
    </div>
  );
};
