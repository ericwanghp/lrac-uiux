import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/lib/types/settings";

export function applyDocumentUiSettings(settings: UserSettings): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const nextTheme = settings.theme ?? DEFAULT_USER_SETTINGS.theme;
  const nextDensity = settings.compactMode ? "compact" : "comfortable";
  const nextFontSize = settings.fontSize ?? DEFAULT_USER_SETTINGS.fontSize;

  root.classList.toggle("dark", nextTheme === "dark");
  root.dataset.theme = nextTheme;
  root.dataset.density = nextDensity;
  root.style.fontSize = `${nextFontSize}px`;
}
