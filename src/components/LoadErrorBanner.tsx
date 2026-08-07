import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import * as LucideIcons from 'lucide-react';

/**
 * Shows a small, dismissible-by-retry banner only when the app's initial
 * load from the database has genuinely failed. Deliberately not a
 * full-screen blocking loader -- the app is designed to render
 * progressively, and most navigations don't need to block on this at all.
 * This exists purely so a real failure is visible and actionable instead
 * of silently leaving the person looking at an empty or stale screen.
 */
export const LoadErrorBanner = () => {
  const { initialLoadError, retryInitialLoad } = useDatabase();

  if (!initialLoadError) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white px-4 py-3 shadow-md flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <LucideIcons.WifiOff className="w-5 h-5" />
        <span className="font-medium text-sm">{initialLoadError}</span>
      </div>
      <button
        onClick={retryInitialLoad}
        className="bg-white text-rose-600 px-4 py-1.5 rounded text-sm font-bold shadow hover:bg-gray-50 transition"
      >
        Retry
      </button>
    </div>
  );
};
