// "Add to Home Screen" support.
//
// Android Chrome/Edge/Samsung fire `beforeinstallprompt` once the site is
// installable; we keep that event so our own "Install" button can open the
// real install box. iPhone has no such event -- there we can only show
// instructions (Share -> Add to Home Screen). Links opened inside WhatsApp,
// Instagram, Facebook etc. use a built-in browser that can't install at all,
// so we tell people to open the site in Chrome/Safari instead.

type Listener = () => void;

let deferredPrompt: any = null;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

const INSTALLED_KEY = "fd_app_installed";

export function initInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault(); // we show our own button instead of the mini-bar
    deferredPrompt = e;
    try { localStorage.removeItem(INSTALLED_KEY); } catch {}
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
    notify();
  });
}

export function subscribeInstall(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isRunningInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    (navigator as any).standalone === true
  );
}

// Installed earlier on this phone, but currently opened in a browser tab.
export function wasInstalledHere(): boolean {
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
}

export function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
}

export function inAppBrowserName(): string | null {
  const ua = navigator.userAgent;
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "Facebook";
  if (/Twitter/i.test(ua)) return "X (Twitter)";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/Snapchat/i.test(ua)) return "Snapchat";
  if (/Telegram/i.test(ua)) return "Telegram";
  if (/; wv\)/.test(ua) && /Android/i.test(ua)) return "this app";
  return null;
}

export function canPromptInstall(): boolean {
  return !!deferredPrompt;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const evt = deferredPrompt;
  deferredPrompt = null;
  notify();
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice?.outcome === "accepted") {
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
      notify();
      return "accepted";
    }
    return "dismissed";
  } catch {
    return "unavailable";
  }
}
