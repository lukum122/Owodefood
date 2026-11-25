import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import type { ToastDetail } from "../notify";

interface Toast extends ToastDetail { id: number }

// Shows the toasts fired by notifyUser(). Replaces the old blocking
// alert() pop-ups, which froze the screen until "OK" was pressed.
export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail;
      if (!d?.title) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { ...d, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), d.kind === "urgent" ? 12000 : 6000);
    };
    window.addEventListener("fd-toast", onToast);
    return () => window.removeEventListener("fd-toast", onToast);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,380px)] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => { if (t.link) navigate(t.link); setToasts((p) => p.filter((x) => x.id !== t.id)); }}
          className={`pointer-events-auto cursor-pointer rounded-2xl shadow-xl border p-3 flex gap-3 items-start bg-white ${
            t.kind === "urgent" ? "border-orange-300 ring-2 ring-orange-200" : t.kind === "success" ? "border-green-200" : "border-gray-200"
          }`}
          role="status"
        >
          <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
            t.kind === "urgent" ? "bg-orange-100 text-orange-600" : t.kind === "success" ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
          }`}>
            <Bell className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-gray-900 break-words">{t.title}</p>
            {t.message && <p className="text-[11px] text-gray-600 mt-0.5 break-words whitespace-pre-wrap">{t.message}</p>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToasts((p) => p.filter((x) => x.id !== t.id)); }}
            className="p-1 text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
