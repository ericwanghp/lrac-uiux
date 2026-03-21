export type ThemeMode = "dark" | "light";
export type NotificationLevel = "all" | "important" | "critical";

export interface UserSettings {
  theme: ThemeMode;
  fontSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  notificationLevel: NotificationLevel;
  compactMode: boolean;
  showLineNumbers: boolean;
}

export interface UserSettingsEnvelope {
  version: "1.0";
  settings: UserSettings;
  updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "dark",
  fontSize: 14,
  autoSave: true,
  autoSaveInterval: 30,
  desktopNotifications: true,
  soundEnabled: false,
  emailNotifications: false,
  notificationLevel: "important",
  compactMode: false,
  showLineNumbers: true,
};
