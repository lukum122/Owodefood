import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, MoreVertical, PlusSquare, Share, Smartphone } from "lucide-react";
import {
  canPromptInstall, inAppBrowserName, isIosDevice, isRunningInstalled, promptInstall, subscribeInstall,
} from "../installPrompt";

// "Get the app" for everyone (not only after a first order): Owode Food
// installs straight from the website to the phone's home screen. Android
// gets a one-tap install button; iPhone gets the Share → Add to Home
// Screen steps (Apple doesn't allow a button for this).
export const GetAppSection: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [, force] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  useEffect(() => subscribeInstall(() => force((n) => n + 1)), []);

  const installed = isRunningInstalled();
  const ios = isIosDevice();
  const inApp = inAppBrowserName();
  const canInstall = canPromptInstall();

  if (installed) {
    if (compact) return null;
    return (
      <div className="p-5 rounded-3xl bg-green-50 border border-green-100 text-green-800 text-sm font-bold flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5" /> You're using the Owode Food app. 🎉
      </div>
    );
  }

  const install = async () => {
    const r = await promptInstall();
    setResult(r === "accepted" ? "Installing… look for Owode Food on your home screen." : r === "dismissed" ? null : "unavailable");
  };

  return (
    <section className="rounded-3xl bg-[#070329] text-white p-6 sm:p-8 overflow-hidden relative">
      <div className="relative z-10 grid gap-6 md:grid-cols-2 items-center">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
            <Smartphone className="w-3.5 h-3.5" /> Get the app
          </span>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">Order faster with the Owode Food app</h2>
          <p className="text-sm text-white/70">
            Free, small, and opens straight from your home screen, with order alerts and live delivery tracking. Works on Android and iPhone.
          </p>
          {compact && <Link to="/get-app" className="text-xs font-bold text-sky-300 underline">See how to install →</Link>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Android */}
          <div className="bg-white text-[#070329] rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black flex items-center gap-2">🤖 Android</p>
            {canInstall ? (
              <button onClick={install} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-xs font-black">
                <Download className="w-4 h-4" /> Install app
              </button>
            ) : (
              <ol className="text-[11px] text-gray-600 space-y-1 list-decimal ml-4">
                <li>Open this site in <strong>Chrome</strong>.</li>
                <li>Tap the menu <MoreVertical className="w-3 h-3 inline" /> at the top right.</li>
                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              </ol>
            )}
          </div>
          {/* iPhone */}
          <div className="bg-white text-[#070329] rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black flex items-center gap-2">🍎 iPhone</p>
            <ol className="text-[11px] text-gray-600 space-y-1 list-decimal ml-4">
              <li>Open this site in <strong>Safari</strong>.</li>
              <li>Tap Share <Share className="w-3 h-3 inline" /> at the bottom.</li>
              <li>Tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3 h-3 inline" />, then <strong>Add</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
      {inApp && (
        <p className="relative z-10 mt-4 text-[11px] font-bold bg-amber-400/20 text-amber-200 p-3 rounded-xl">
          You opened this inside {inApp}, which can't install apps. Tap ⋯ and choose "Open in {ios ? "Safari" : "Chrome"}" first.
        </p>
      )}
      {result && result !== "unavailable" && <p className="relative z-10 mt-4 text-xs font-bold text-green-300">{result}</p>}
      {result === "unavailable" && (
        <p className="relative z-10 mt-4 text-xs font-bold text-amber-200">Use the steps above from your browser menu to install.</p>
      )}
      <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-purple-600/30 blur-3xl" />
    </section>
  );
};
