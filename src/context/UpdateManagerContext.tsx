import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

export const UpdateManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [criticalOperationsCount, setCriticalOperationsCount] = useState(0);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  // Initialize SW updater
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

  const isUpdateAvailable = needRefresh;

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

  // Track user activity
  useEffect(() => {
    const handleActivity = () => setLastActivityTime(Date.now());
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    
    events.forEach(event => window.addEventListener(event, handleActivity));
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, []);

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

  // Automatic Idle Reload
  useEffect(() => {
    if (isUpdateAvailable && criticalOperationsCount === 0) {
      const interval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        // 30 seconds idle timeout as requested
        if (timeSinceLastActivity >= 30000) {
          triggerUpdate();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isUpdateAvailable, criticalOperationsCount, lastActivityTime, triggerUpdate]);

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
