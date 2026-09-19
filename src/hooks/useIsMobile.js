import { useState, useEffect } from "react";

/**
 * Returns true when the viewport is at/under the given breakpoint (default 768px,
 * matching Tailwind's `md` breakpoint used across the app for md:hidden splits).
 * JS-based (not CSS-only) on purpose: for components that open live connections
 * (sockets, polling) we only want ONE version mounted at a time, not both hidden
 * via CSS — otherwise you get duplicate socket connections / duplicate fetches.
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [breakpoint]);

  return isMobile;
}
