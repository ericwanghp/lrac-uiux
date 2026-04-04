import fs from "fs/promises";
import path from "path";
import { DEFAULT_USER_SETTINGS, UserSettings, UserSettingsEnvelope } from "@/lib/types/settings";
import { PROJECT_ROOT, getCurrentProjectRoot } from "@/lib/utils/file-operations";

async function getConfigDir(projectRoot?: string | null): Promise<string> {
  return path.join(await getCurrentProjectRoot(projectRoot), ".auto-coding", "config");
}

async function getSettingsFile(projectRoot?: string | null): Promise<string> {
  return path.join(await getConfigDir(projectRoot), "ui-settings.json");
}

export const PROJECT_SETTINGS_FILE = path.join(PROJECT_ROOT, ".auto-coding", "config", "ui-settings.json");

function createDefaultEnvelope(): UserSettingsEnvelope {
  return {
    version: "1.0",
    settings: DEFAULT_USER_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
}

export async function initializeProjectSettings(projectRoot?: string | null): Promise<void> {
  const configDir = await getConfigDir(projectRoot);
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    await getSettingsFile(projectRoot),
    JSON.stringify(createDefaultEnvelope(), null, 2)
  );
}

export async function readProjectSettings(
  projectRoot?: string | null
): Promise<UserSettingsEnvelope> {
  const settingsFile = await getSettingsFile(projectRoot);

  try {
    await fs.access(settingsFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await initializeProjectSettings(projectRoot);
      return createDefaultEnvelope();
    }
    throw error;
  }

  const content = await fs.readFile(settingsFile, "utf-8");
  const parsed = JSON.parse(content) as Partial<UserSettingsEnvelope>;

  return {
    version: "1.0",
    settings: {
      ...DEFAULT_USER_SETTINGS,
      ...(parsed.settings || {}),
    } as UserSettings,
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  };
}

export async function writeProjectSettings(
  settings: UserSettings,
  projectRoot?: string | null
): Promise<UserSettingsEnvelope> {
  const configDir = await getConfigDir(projectRoot);
  const nextEnvelope: UserSettingsEnvelope = {
    version: "1.0",
    settings,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(await getSettingsFile(projectRoot), JSON.stringify(nextEnvelope, null, 2), "utf-8");

  return nextEnvelope;
}
