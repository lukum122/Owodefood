import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface UpdateManagerContextType {
  isUpdateAvailable: boolean;
  triggerUpdate: () => void;
  startCriticalOperation: () => void;
  endCriticalOperation: () => void;
  withUpdateLock: <T>(operation: () => Promise<T>) => Promise<T>;
  dismissUpdateBanner: () => void;
  isBannerDismissed: boolean;
}

const UpdateManagerContext = createContext<UpdateManagerContextType | undefined>(undefined);

export const useUpdateManager = () => {
  const context = useContext(UpdateManagerContext);
  if (!context) {
    throw new Error("useUpdateManager must be used within an UpdateManagerProvider");
  }
  return context;
};

const DISMISSED_VERSION_KEY = "fd_dismissed_update_version";
const DISMISSED_AT_KEY = "fd_dismissed_update_at";

// How long a fresh session waits before it's even allowed to show an
// update prompt. This exists specifically so a brand-new visitor (whose
// very first load can race with a just-finished deploy across Vercel's
// edge cache) never gets told "update available" the moment they land --
// they're already on the current version; there's nothing to update from.
const STARTUP_GRACE_PERIOD_MS = 60 * 1000;

// After a dismissal, don't re-show the banner for this long even if one of
// the two detection sources fires again on its own -- unless the server
// reports a version that's genuinely different from the one dismissed,
// which overrides the cooldown since that's a real new update, not the
// same one re-triggering.
const DISMISS_COOLDOWN_MS = 30 * 60 * 1000;

export const UpdateManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [criticalOperationsCount, setCriticalOperationsCount] = useState(0);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const appMountTimeRef = useRef<number>(Date.now());
  const pendingVersionRef = useRef<string | null>(null);
  const dismissedVersionRef = useRef<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(DISMISSED_VERSION_KEY) : null
  );
  const dismissedAtRef = useRef<number>(
    typeof window !== "undefined" ? Number(localStorage.getItem(DISMISSED_AT_KEY)) || 0 : 0
  );

  // Initialize SW updater. Note: `needRefresh` can become true from the
  // library's own internal detection, completely independent of the
  // custom /api/version polling below -- that mismatch (two sources,
  // only one respecting dismissal) was the actual cause of the banner
  // reappearing after being dismissed once. The unified "shouldShow"
  // logic further down is what actually fixes it, by gating on both
  // sources through the same grace-period + cooldown rules.
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => r.update(), 5 * 60 * 1000); // Check every 5 minutes
      }
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  // Unified visibility rule, regardless of which of the two sources
  // (native SW detection or the custom version poll) flipped the
  // underlying "an update exists" signal:
  // 1. Never show within the startup grace period (fresh-visit noise).
  // 2. Never show during a dismissal cooldown, unless the server-reported
  //    version has genuinely changed since the dismissal.
  const withinGracePeriod = Date.now() - appMountTimeRef.current < STARTUP_GRACE_PERIOD_MS;
  const withinDismissCooldown =
    Date.now() - dismissedAtRef.current < DISMISS_COOLDOWN_MS &&
    (!pendingVersionRef.current || pendingVersionRef.current === dismissedVersionRef.current);

  const isUpdateAvailable = needRefresh && !withinGracePeriod && !withinDismissCooldown;

  // Poll backend for new versions every 5 minutes
  useEffect(() => {
    const checkServerVersion = async () => {
      try {
        const res = await fetch("/api/version");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (serverVersion && serverVersion !== data.version) {
              pendingVersionRef.current = data.version;
              setNeedRefresh(true);
            } else if (!serverVersion) {
              setServerVersion(data.version);
            }
          }
        }
      } catch (error) {
        // Suppress error log if the server doesn't support version checking yet
        // console.error("Failed to check server version:", error);
      }
    };

    checkServerVersion();
    const interval = setInterval(checkServerVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [serverVersion, setNeedRefresh]);

  // Cross-tab synchronization
  useEffect(() => {
    const channel = new BroadcastChannel("app-update-channel");
    channel.onmessage = (event) => {
      if (event.data === "APP_UPDATING") {
        window.location.reload();
      }
    };
    return () => channel.close();
  }, []);

  const triggerUpdate = useCallback(() => {
    const channel = new BroadcastChannel("app-update-channel");
    channel.postMessage("APP_UPDATING");
    channel.close();
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const startCriticalOperation = useCallback(() => {
    setCriticalOperationsCount(prev => prev + 1);
  }, []);

  const endCriticalOperation = useCallback(() => {
    setCriticalOperationsCount(prev => Math.max(0, prev - 1));
  }, []);

  const withUpdateLock = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    startCriticalOperation();
    try {
      return await operation();
    } finally {
      endCriticalOperation();
    }
  }, [startCriticalOperation, endCriticalOperation]);

  const dismissUpdateBanner = useCallback(() => {
    setIsBannerDismissed(true);
    dismissedAtRef.current = Date.now();
    // Record whichever version triggered this (if known via the custom
    // poll) so a genuinely newer version can still override the cooldown.
    dismissedVersionRef.current = pendingVersionRef.current;
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(dismissedAtRef.current));
      if (pendingVersionRef.current) {
        localStorage.setItem(DISMISSED_VERSION_KEY, pendingVersionRef.current);
      }
    } catch {
      // localStorage unavailable — dismissal just won't persist across reloads, not fatal
    }
  }, []);

  const value: UpdateManagerContextType = {
    isUpdateAvailable,
    triggerUpdate,
    startCriticalOperation,
    endCriticalOperation,
    withUpdateLock,
    dismissUpdateBanner,
    isBannerDismissed,
  };

  return (
    <UpdateManagerContext.Provider value={value}>
      {children}
    </UpdateManagerContext.Provider>
  );
};
