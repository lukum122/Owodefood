import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";

// Storage is entirely client-side (localStorage/sessionStorage), keyed by
// popupVersion -- nothing about "has this browser seen the popup" is
// tracked in the database at all. This keeps the feature completely free
// of per-visit database writes, and means editing the popup's content
// (which bumps popupVersion automatically on save) naturally reaches
// everyone again, since the old version's storage keys simply stop
// matching.
const seenKey = (version: string) => `fd_popup_seen_${version}`;
const dismissedKey = (version: string) => `fd_popup_dismissed_${version}`;
const lastShownKey = (version: string) => `fd_popup_lastshown_${version}`;

const STAFF_ROLES = ["vendor", "rider", "employee", "admin", "super_admin"];

export const AnnouncementPopup: React.FC = () => {
  const {
    popupEnabled,
    popupMessage,
    popupImage,
    popupLinkUrl,
    popupLinkLabel,
    popupFrequency,
    popupFrequencyDays,
    popupAudience,
    popupVersion,
    currentUser,
  } = useDatabase();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!popupEnabled || !popupMessage.trim()) {
      setIsVisible(false);
      return;
    }

    // Anonymous visitors and logged-in customers are both treated as the
    // "customer" audience -- an anonymous person browsing the site IS a
    // prospective customer, not a separate category. Staff roles only
    // match if the admin explicitly included them.
    const effectiveRole = currentUser ? currentUser.role : "customer";
    const audienceMatches = popupAudience.length === 0 || popupAudience.includes(effectiveRole);
    if (!audienceMatches) {
      setIsVisible(false);
      return;
    }

    let shouldShow = false;
    try {
      switch (popupFrequency) {
        case "every_visit":
          shouldShow = true;
          break;
        case "first_visit":
          shouldShow = !localStorage.getItem(seenKey(popupVersion));
          break;
        case "session":
          shouldShow = !sessionStorage.getItem(seenKey(popupVersion));
          break;
        case "until_dismissed":
          shouldShow = !localStorage.getItem(dismissedKey(popupVersion));
          break;
        case "every_n_days": {
          const lastShown = localStorage.getItem(lastShownKey(popupVersion));
          const daysMs = Math.max(1, popupFrequencyDays) * 24 * 60 * 60 * 1000;
          shouldShow = !lastShown || (Date.now() - Number(lastShown)) >= daysMs;
          break;
        }
      }
    } catch {
      // Storage unavailable (e.g. private browsing edge cases) -- fail
      // safe by simply not showing, rather than risking a crash loop.
      shouldShow = false;
    }

    if (shouldShow) {
      setIsVisible(true);
      // "Seen" is recorded the moment it's actually shown, not on close,
      // for the modes where a single viewing is what counts (first_visit,
      // session, every_n_days). "until_dismissed" is deliberately the one
      // exception -- it keeps reappearing until the person actively closes
      // it, not merely because they saw it once.
      try {
        if (popupFrequency === "first_visit") localStorage.setItem(seenKey(popupVersion), "true");
        if (popupFrequency === "session") sessionStorage.setItem(seenKey(popupVersion), "true");
        if (popupFrequency === "every_n_days") localStorage.setItem(lastShownKey(popupVersion), String(Date.now()));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupEnabled, popupMessage, popupVersion, popupFrequency, popupFrequencyDays, popupAudience, currentUser?.id]);

  const handleClose = () => {
    setIsVisible(false);
    try {
      if (popupFrequency === "until_dismissed") localStorage.setItem(dismissedKey(popupVersion), "true");
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {popupImage && (
          <img src={popupImage} alt="" className="w-full h-44 object-cover" />
        )}

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {popupMessage}
          </div>

          {popupLinkUrl && (
            <a
              href={popupLinkUrl}
              target={popupLinkUrl.startsWith("http") ? "_blank" : undefined}
              rel={popupLinkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
              onClick={handleClose}
              className="block w-full text-center py-3 px-5 bg-[#070329] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl transition"
            >
              {popupLinkLabel || "Learn More"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
