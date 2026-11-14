import React, { useEffect, useState } from "react";
import { Download, Share, X, ExternalLink } from "lucide-react";
import {
  canPromptInstall,
  inAppBrowserName,
  isIosDevice,
  isRunningInstalled,
  promptInstall,
  subscribeInstall,
  wasInstalledHere,
} from "../installPrompt";

interface Props {
  audience: "rider" | "vendor" | "customer";
}

const SNOOZE_DAYS = 3;

const WHY: Record<Props["audience"], string> = {
  rider: "Install OwodeFood so job alerts reach you instantly and the app opens in one tap.",
  vendor: "Install OwodeFood so new-order alerts reach you instantly and the app opens in one tap.",
  customer: "Install OwodeFood to see your delivery code, chat with your rider and get updates on your phone.",
};

// Riders and vendors see this until the app is installed (alerts are part
// of their job). Customers can close it; it comes back after a few days.
export const InstallAppBanner: React.FC<Props> = ({ audience }) => {
  const snoozeKey = `fd_install_snoozed_until_${audience}`;
  const [, force] = useState(0);
  const [hiddenThisVisit, setHiddenThisVisit] = useState(false);
  const [snoozed, setSnoozed] = useState(() => {
    try { return Date.now() < Number(localStorage.getItem(snoozeKey) || 0); } catch { return false; }
  });

  useEffect(() => subscribeInstall(() => force((n) => n + 1)), []);

  if (isRunningInstalled()) return null;
  if (hiddenThisVisit) return null;
  if (audience === "customer" && snoozed) return null;

  const inApp = inAppBrowserName();
  const ios = isIosDevice();
  const canPrompt = canPromptInstall();
  const installedButInBrowser = wasInstalledHere() && !canPrompt;

  // Android browser with no install event and not installed before: the
  // browser doesn't support installing (or not yet eligible) -- stay quiet.
  if (!inApp && !ios && !canPrompt && !installedButInBrowser) return null;

  const close = () => {
    if (audience === "customer") {
      try { localStorage.setItem(snoozeKey, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch {}
      setSnoozed(true);
    } else {
      setHiddenThisVisit(true); // riders/vendors: back next visit
    }
  };

  let body: React.ReactNode;
  let action: React.ReactNode = null;

  if (inApp) {
    body = (
      <>
        You opened OwodeFood inside {inApp}, which can't install apps or show alerts. Tap the <b>⋮</b> or <b>…</b> menu
        and choose <b>{ios ? "Open in Safari" : "Open in Chrome"}</b>.
      </>
    );
    action = (
      <button
        onClick={() => { navigator.clipboard?.writeText(window.location.origin).catch(() => {}); }}
        className="mt-2 py-2 px-4 border border-gray-300 text-gray-800 font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Copy link
      </button>
    );
  } else if (installedButInBrowser) {
    body = <>OwodeFood is installed on this phone. Open it from your home screen icon for alerts and the best experience.</>;
  } else if (ios) {
    body = (
      <>
        {WHY[audience]} Tap <Share className="inline w-3.5 h-3.5 -mt-0.5" /> <b>Share</b> at the bottom of Safari, then{" "}
        <b>Add to Home Screen</b>, then open OwodeFood from your home screen.
      </>
    );
  } else {
    body = <>{WHY[audience]}</>;
    action = (
      <button
        onClick={async () => { await promptInstall(); force((n) => n + 1); }}
        className="mt-2 py-2 px-4 bg-[#070329] text-white font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
      >
        <Download className="w-3.5 h-3.5" /> Install app
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-start gap-3 text-xs">
      <Download className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-bold text-gray-900">{inApp ? "Open in your browser" : "Add OwodeFood to your home screen"}</p>
        <p className="text-gray-600 leading-relaxed">{body}</p>
        {action}
      </div>
      <button onClick={close} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
