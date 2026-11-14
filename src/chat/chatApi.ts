// Small client for the chat API + live-event helpers.
import { useEffect, useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: "customer" | "vendor" | "rider" | "support" | "system";
  senderName: string;
  body: string | null;
  imageUrl: string | null;
  orderRef: string | null;
  createdAt: string;
}

export interface OrderThread {
  id: string;
  kind: "order";
  pair: "customer_vendor" | "customer_rider" | "rider_vendor";
  orderId: string;
  title: string;
  myRole: "customer" | "vendor" | "rider" | null;
  counterpart: { role: string; name: string; phone: string | null } | null;
  canWrite: boolean;
  closesAt: number | null;
  unread: number;
}

function authHeaders(json = false): Record<string, string> {
  const token = localStorage.getItem("fd_jwt_token") || "";
  const h: Record<string, string> = { Authorization: `Bearer ${token}`, "X-Auth-Token": token };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function call<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

export const chatApi = {
  orderThreads: (orderId: string) =>
    call<{ threads: OrderThread[] }>(`/api/chat/order/${encodeURIComponent(orderId)}`, { headers: authHeaders() }),
  messages: (threadId: string, before?: string) =>
    call<{ messages: ChatMessage[]; canWrite: boolean; closesAt: number | null; myRole: string | null; hasMore: boolean }>(
      `/api/chat/threads/${threadId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
      { headers: authHeaders() }
    ),
  send: (threadId: string, payload: { body?: string; image?: string; orderRef?: string }) =>
    call<{ success: boolean; message: ChatMessage }>(`/api/chat/threads/${threadId}/messages`, {
      method: "POST", headers: authHeaders(true), body: JSON.stringify(payload),
    }),
  markRead: (threadId: string) =>
    call(`/api/chat/threads/${threadId}/read`, { method: "POST", headers: authHeaders() }).catch(() => {}),
  unread: () =>
    call<{ byOrder: Record<string, number>; support: Record<string, number>; inbox: number; isStaff: boolean }>(`/api/chat/unread`, { headers: authHeaders() }),
  openSupport: (role: "customer" | "rider" | "vendor") =>
    call<{ thread: { id: string; status: string; assignedName: string | null }; recentOrders: any[] }>(`/api/chat/support/open`, {
      method: "POST", headers: authHeaders(true), body: JSON.stringify({ role }),
    }),
  inbox: (status: "active" | "resolved") =>
    call<{ threads: any[] }>(`/api/chat/support/inbox?status=${status}`, { headers: authHeaders() }),
  supportContext: (threadId: string) =>
    call<any>(`/api/chat/support/${threadId}/context`, { headers: authHeaders() }),
  claim: (threadId: string) =>
    call(`/api/chat/support/${threadId}/claim`, { method: "POST", headers: authHeaders() }),
  setStatus: (threadId: string, status: "new" | "open" | "resolved") =>
    call(`/api/chat/support/${threadId}/status`, { method: "POST", headers: authHeaders(true), body: JSON.stringify({ status }) }),
};

export function onChatMessage(handler: (e: { threadId: string; kind: string; orderId: string | null; message: ChatMessage }) => void) {
  const fn = (ev: Event) => handler((ev as CustomEvent).detail);
  window.addEventListener("fd-chat-message", fn);
  return () => window.removeEventListener("fd-chat-message", fn);
}

export function onChatThreadUpdate(handler: (e: { threadId: string }) => void) {
  const fn = (ev: Event) => handler((ev as CustomEvent).detail);
  window.addEventListener("fd-chat-thread-update", fn);
  return () => window.removeEventListener("fd-chat-thread-update", fn);
}

// Shared unread counts for badges (one poll for the whole page).
type Unread = { byOrder: Record<string, number>; support: Record<string, number>; inbox: number; isStaff: boolean };
let cache: Unread = { byOrder: {}, support: {}, inbox: 0, isStaff: false };
const subs = new Set<(u: Unread) => void>();
let timer: any = null;
let inflight = false;

export async function refreshUnread() {
  if (inflight || !localStorage.getItem("fd_jwt_token")) return;
  inflight = true;
  try {
    cache = await chatApi.unread();
    subs.forEach((s) => s(cache));
  } catch {
    /* ignore */
  } finally {
    inflight = false;
  }
}

let refreshTimeout: any = null;
function scheduleRefresh() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(refreshUnread, 400);
}

export function useChatUnread(): Unread {
  const [u, setU] = useState<Unread>(cache);
  useEffect(() => {
    subs.add(setU);
    if (subs.size === 1) {
      refreshUnread();
      timer = setInterval(refreshUnread, 60_000);
    }
    const off1 = onChatMessage(scheduleRefresh);
    const off2 = onChatThreadUpdate(scheduleRefresh);
    return () => {
      subs.delete(setU);
      off1();
      off2();
      if (subs.size === 0) clearInterval(timer);
    };
  }, []);
  return u;
}

export function useQueryParam(name: string): [string | null, () => void] {
  const read = () => new URLSearchParams(window.location.search).get(name);
  const [value, setValue] = useState<string | null>(read);
  const clear = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, "", url.toString());
    setValue(null);
  }, [name]);
  return [value, clear];
}
