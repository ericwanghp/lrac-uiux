import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";

import { applyDocumentUiSettings } from "@/lib/utils/theme";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import type { UserSettings } from "@/lib/types/settings";

const fetchMock = vi.fn();

const lightSettings: UserSettings = {
  theme: "light",
  fontSize: 16,
  autoSave: true,
  autoSaveInterval: 30,
  desktopNotifications: true,
  soundEnabled: false,
  emailNotifications: false,
  notificationLevel: "important",
  compactMode: true,
  showLineNumbers: true,
};

describe("ui settings behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    document.documentElement.className = "dark";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.style.fontSize = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies theme, density, and font size to the document root", () => {
    applyDocumentUiSettings(lightSettings);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.density).toBe("compact");
    expect(document.documentElement.style.fontSize).toBe("16px");
  });

  it("loads persisted settings and updates the shell immediately", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { settings: lightSettings },
      }),
    });

    render(
      <UiSettingsProvider>
        <div>shell</div>
      </UiSettingsProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          cache: "no-store",
        })
      );
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.dataset.density).toBe("compact");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("responds to settings update events without a reload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          settings: {
            ...lightSettings,
            theme: "dark",
            compactMode: false,
          },
        },
      }),
    });

    render(
      <UiSettingsProvider>
        <div>shell</div>
      </UiSettingsProvider>
    );

    window.dispatchEvent(
      new CustomEvent("lrac:settings-updated", {
        detail: {
          ...lightSettings,
          theme: "light",
          fontSize: 18,
          compactMode: false,
        } satisfies UserSettings,
      })
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.dataset.density).toBe("comfortable");
      expect(document.documentElement.style.fontSize).toBe("18px");
    });
  });
});
