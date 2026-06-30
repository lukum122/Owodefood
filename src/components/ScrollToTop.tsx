import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant" as any, // "instant" or "auto" to prevent visible scrolling
    });
  }, [pathname]);

  return null;
};
