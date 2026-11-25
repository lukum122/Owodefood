// Small fetch helper for the newer pages: adds the login token and turns
// error responses into a readable message.
export async function api<T = any>(url: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const token = localStorage.getItem("fd_jwt_token") || "";
  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Auth-Token": token },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.error || `Something went wrong (${res.status}). Please try again.`);
  return data as T;
}

export const naira = (n: number) => `₦${Math.round(n || 0).toLocaleString()}`;

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} day(s) ago`;
}
