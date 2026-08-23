import React, { useState, useEffect } from "react";

interface SecureImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}

// Plain <img src="..."> tags can never carry an Authorization header --
// that's a hard browser limitation, not something fixable with more
// markup. Private-bucket images (payment receipts, pickup vouchers) are
// served through an authenticated proxy endpoint specifically because
// they're not meant to be publicly reachable, so a raw <img> tag pointed
// at that endpoint will always be rejected with no credentials attached.
//
// This component detects that specific case, fetches the image manually
// with the same auth header used everywhere else in the app, and turns
// the response into a local blob URL the browser can actually display.
// Everything else (public R2 URLs, legacy base64 data URIs, the
// "PRESET_..." sentinel strings) is left completely untouched and
// rendered exactly as a normal <img> would.
export const SecureImage: React.FC<SecureImageProps> = ({ src, alt = "", className = "" }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!src.startsWith("/api/r2/private-image")) {
      // Public URL, base64 data URI, or a preset sentinel string -- no
      // special handling needed, use it exactly as given.
      setResolvedSrc(src);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(src, { headers });
        if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      } catch (err) {
        console.error("[SecureImage] Failed to load private image:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    // Object URLs hold real memory until explicitly released -- clean up
    // whenever the src changes or this component unmounts.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-400 text-[10px] font-bold text-center p-2`}>
        Failed to load image
      </div>
    );
  }

  if (!resolvedSrc) {
    return <div className={`${className} bg-gray-100 animate-pulse`} />;
  }

  return <img src={resolvedSrc} alt={alt} className={className} />;
};
