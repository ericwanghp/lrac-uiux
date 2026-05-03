"use client";

import * as React from "react";
import type { ThemeMode } from "@/lib/types/settings";

function readThemeFromDocument(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useActiveTheme(): ThemeMode {
  const [theme, setTheme] = React.useState<ThemeMode>(readThemeFromDocument);

  React.useEffect(() => {
    const syncTheme = () => {
      setTheme(readThemeFromDocument());
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    window.addEventListener("lrac:settings-updated", syncTheme as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("lrac:settings-updated", syncTheme as EventListener);
    };
  }, []);

  return theme;
}
