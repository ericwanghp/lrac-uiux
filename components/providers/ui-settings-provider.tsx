"use client";

import * as React from "react";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/lib/types/settings";
import { applyDocumentUiSettings } from "@/lib/utils/theme";

type SettingsUpdateEvent = CustomEvent<UserSettings>;

async function loadPersistedSettings(): Promise<UserSettings> {
  const response = await fetch("/api/settings", {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success || !payload?.data?.settings) {
    throw new Error(payload?.error || "Failed to load UI settings");
  }

  return {
    ...DEFAULT_USER_SETTINGS,
    ...payload.data.settings,
  } as UserSettings;
}

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    applyDocumentUiSettings(DEFAULT_USER_SETTINGS);

    void loadPersistedSettings()
      .then((settings) => {
        applyDocumentUiSettings(settings);
      })
      .catch(() => {
        applyDocumentUiSettings(DEFAULT_USER_SETTINGS);
      });

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as SettingsUpdateEvent).detail;
      if (!detail) {
        return;
      }

      applyDocumentUiSettings({
        ...DEFAULT_USER_SETTINGS,
        ...detail,
      });
    };

    window.addEventListener("lrac:settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("lrac:settings-updated", handleSettingsUpdated);
    };
  }, []);

  return <>{children}</>;
}
