import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUpdateManager } from '../context/UpdateManagerContext';
import * as LucideIcons from 'lucide-react';

export const PwaUpdater = () => {
  const { isUpdateAvailable, triggerUpdate, isBannerDismissed, dismissUpdateBanner } = useUpdateManager();
  const location = useLocation();

  if (!isUpdateAvailable || isBannerDismissed) return null;

  const isCheckout = location.pathname.includes('/checkout') || location.pathname.includes('/cart');
  const isAdmin = location.pathname.startsWith('/admin');

  // Do not show banner during checkout/payment flows
  if (isCheckout) return null;

  // Admin Top Bar
  if (isAdmin) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LucideIcons.RefreshCw className="w-5 h-5 animate-spin-slow" />
          <span className="font-medium text-sm">A new version of Food Owode is available.</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={dismissUpdateBanner}
            className="text-white/80 hover:text-white text-sm font-medium"
          >
            Dismiss
          </button>
          <button
            onClick={triggerUpdate}
            className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-bold shadow hover:bg-gray-50 transition"
          >
            Update Now
          </button>
        </div>
      </div>
    );
  }

  // Customer/Vendor Bottom-Right Toast
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-2xl rounded-2xl p-5 flex flex-col gap-4 z-[9999] w-80 transform transition-all duration-300 ease-out translate-y-0 opacity-100">
      <div>
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
          <span className="text-blue-500 animate-pulse">🚀</span> Update Available
        </h3>
        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
          A new version of Food Owode is available. Update now to ensure everything runs smoothly.
        </p>
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <button
          onClick={dismissUpdateBanner}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Not right now
        </button>
        <button
          onClick={triggerUpdate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          Update Now
        </button>
      </div>
    </div>
  );
};
