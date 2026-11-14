import React, { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { enablePushNotifications, notificationPermission, isIos, isInstalledApp, syncPushSubscription } from "../pushClient";

interface Props {
  // What the alerts are for, shown in the banner text.
  audience: "rider" | "vendor" | "customer";
}

const COPY: Record<Props["audience"], { title: string; text: string }> = {
  rider: {
    title: "Turn on job alerts",
    text: "Get a loud alert on your phone for new delivery jobs, even when OwodeFood is closed.",
  },
  vendor: {
    title: "Turn on order alerts",
    text: "Get an alert on your phone the moment a new order comes in, even when OwodeFood is closed.",
  },
  customer: {
    title: "Get delivery updates",
    text: "Know when your rider is on the way and see your delivery code instantly.",
  },
};

export const EnableAlertsBanner: React.FC<Props> = ({ audience }) => {
  const dismissKey = `fd_alerts_banner_dismissed_${audience}`;
  const [permission, setPermission] = useState(notificationPermission());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === "1"; } catch { return false; }
  });

  useEffect(() => {
    // Already allowed earlier: make sure this device is registered.
    if (permission === "granted") syncPushSubscription();
  }, [permission]);

  const iosNeedsInstall = isIos() && !isInstalledApp();

  // Riders always see it until alerts are on -- missing jobs costs them money.
  // Others can dismiss it.
  if (permission === "granted") return null;
  // iPhone not yet installed: the "Add to Home Screen" banner covers it.
  if (permission === "unsupported" || iosNeedsInstall) return null;
  if (dismissed && audience !== "rider") return null;

  const handleEnable = async () => {
    setBusy(true);
    setMessage(null);
    const result = await enablePushNotifications();
    setBusy(false);
    setPermission(notificationPermission());
    if (!result.ok) setMessage(result.reason || "Couldn't turn on alerts.");
  };

  const copy = COPY[audience];

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs">
      <BellRing className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-bold text-gray-900">{copy.title}</p>
        <p className="text-gray-600">
          {iosNeedsInstall
            ? "On iPhone: tap the Share button, choose 'Add to Home Screen', then open OwodeFood from your Home Screen and tap 'Turn on' there."
            : permission === "denied"
              ? "Alerts are blocked for this site. Tap the lock icon next to the web address → Permissions → Notifications → Allow, then reload."
              : copy.text}
        </p>
        {message && <p className="text-red-600 font-semibold">{message}</p>}
        {!iosNeedsInstall && permission === "default" && (
          <button
            onClick={handleEnable}
            disabled={busy}
            className="mt-2 py-2 px-4 bg-[#070329] text-white font-bold rounded-xl disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Turning on..." : "Turn on"}
          </button>
        )}
      </div>
      {audience !== "rider" && (
        <button
          onClick={() => { try { localStorage.setItem(dismissKey, "1"); } catch {} setDismissed(true); }}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
