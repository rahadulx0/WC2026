"use client";

import { useEffect } from "react";

// Theme follows the device/OS preference (prefers-color-scheme). This inline
// script runs before first paint to avoid a flash of the wrong theme.
export const themeScript = `
(function(){
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

// Keeps the theme in sync when the OS preference changes at runtime
// (e.g. macOS/Windows automatic day→night switch). Renders nothing.
export function ThemeWatcher() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (matches: boolean) =>
      document.documentElement.classList.toggle("dark", matches);
    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
