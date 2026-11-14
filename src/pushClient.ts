// Phone notifications (Web Push) for the OwodeFood web app.
//
// Works when the app is closed on Android (Chrome, Edge, Samsung Internet)
// and on desktop. On iPhone it only works after the user has added the app
// to the Home Screen (iOS 16.4+) and opened it from there.

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function bytesEqual(a: ArrayBuffer | null, b: Uint8Array) {
  if (!a) return false;
  const x = new Uint8Array(a);
  if (x.length !== b.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== b[i]) return false;
  return true;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isInstalledApp(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

let inFlight: Promise<boolean> | null = null;

// Registers this device with the server. Only call when permission is
// already "granted" (it never shows a prompt by itself).
export function syncPushSubscription(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      if (!pushSupported() || Notification.permission !== "granted") return false;
      const token = localStorage.getItem("fd_jwt_token");
      if (!token) return false;

      const keyRes = await fetch("/api/push/public-key");
      const { enabled, publicKey } = await keyRes.json();
      if (!enabled || !publicKey) return false;
      const serverKey = urlBase64ToUint8Array(publicKey);

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      // Old subscriptions were made with a different (hardcoded) key and
      // can never receive anything -- replace them.
      if (subscription && !bytesEqual(subscription.options?.applicationServerKey ?? null, serverKey)) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Auth-Token": token },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      return res.ok;
    } catch (e) {
      console.error("[push] subscription failed", e);
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// Must be called from a button tap (iPhone and newer Chrome require it).
export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) {
    if (isIos() && !isInstalledApp()) {
      return { ok: false, reason: "On iPhone, first tap Share → 'Add to Home Screen', then open OwodeFood from your Home Screen and turn alerts on there." };
    }
    return { ok: false, reason: "This browser doesn't support notifications. Please use Chrome." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notifications are blocked. Open your browser's site settings for this website and allow Notifications." };
  }
  const ok = await syncPushSubscription();
  return ok ? { ok: true } : { ok: false, reason: "Couldn't turn on alerts right now. Please try again." };
}

// On logout: stop this device getting the old account's alerts.
export async function removePushSubscription(): Promise<void> {
  try {
    if (!pushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  } catch {}
}
