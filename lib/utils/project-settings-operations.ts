import fs from "fs/promises";
import path from "path";
import {
  DEFAULT_USER_SETTINGS,
  UserSettings,
  UserSettingsEnvelope,
  normalizeCommunicationSettings,
} from "@/lib/types/settings";
import { PROJECT_ROOT, getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { normalizeOrchestrationSettings } from "@/lib/utils/orchestration-settings";

async function getLegacyConfigDir(projectRoot?: string | null): Promise<string> {
  return path.join(await getCurrentProjectRoot(projectRoot), ".auto-coding", "config");
}

async function getGlobalConfigDir(): Promise<string> {
  return path.join(PROJECT_ROOT, ".auto-coding", "config");
}

async function getSettingsFile(): Promise<string> {
  return path.join(await getGlobalConfigDir(), "ui-settings.json");
}

async function getLegacySettingsFile(projectRoot?: string | null): Promise<string> {
  return path.join(await getLegacyConfigDir(projectRoot), "ui-settings.json");
}

export const PROJECT_SETTINGS_FILE = path.join(PROJECT_ROOT, ".auto-coding", "config", "ui-settings.json");

function createDefaultEnvelope(): UserSettingsEnvelope {
  return {
    version: "1.0",
    settings: {
      ...DEFAULT_USER_SETTINGS,
      orchestration: normalizeOrchestrationSettings(DEFAULT_USER_SETTINGS.orchestration),
      communication: normalizeCommunicationSettings(DEFAULT_USER_SETTINGS.communication),
    },
    updatedAt: new Date().toISOString(),
  };
}

async function readEnvelopeIfExists(filePath: string): Promise<Partial<UserSettingsEnvelope> | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as Partial<UserSettingsEnvelope>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function hasConfiguredCommunication(envelope: Partial<UserSettingsEnvelope> | null): boolean {
  const communication = envelope?.settings?.communication;
  if (!communication) {
    return false;
  }

  return (
    (communication.members?.length ?? 0) > 0 ||
    (communication.stakeholders?.length ?? 0) > 0 ||
    (communication.channels?.length ?? 0) > 0 ||
    (communication.phaseApprovals?.length ?? 0) > 0
  );
}

function hasConfiguredOrchestration(envelope: Partial<UserSettingsEnvelope> | null): boolean {
  const orchestration = envelope?.settings?.orchestration;
  if (!orchestration) {
    return false;
  }

  return (
    (orchestration.agentConfigs?.length ?? 0) > 0 ||
    (orchestration.skillConfigs?.length ?? 0) > 0 ||
    (orchestration.phaseDispatch?.length ?? 0) > 0
  );
}

function normalizeEnvelope(parsed: Partial<UserSettingsEnvelope>): UserSettingsEnvelope {
  return {
    version: "1.0",
    settings: {
      ...DEFAULT_USER_SETTINGS,
      ...(parsed.settings || {}),
      orchestration: normalizeOrchestrationSettings(parsed.settings?.orchestration),
      communication: normalizeCommunicationSettings(parsed.settings?.communication),
    } as UserSettings,
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  };
}

async function migrateLegacyProjectSettings(projectRoot?: string | null): Promise<UserSettingsEnvelope | null> {
  const resolvedProjectRoot = await getCurrentProjectRoot(projectRoot);
  if (resolvedProjectRoot === PROJECT_ROOT) {
    return null;
  }

  const legacyParsed = await readEnvelopeIfExists(await getLegacySettingsFile(resolvedProjectRoot));
  if (!legacyParsed?.settings) {
    return null;
  }

  const globalParsed = (await readEnvelopeIfExists(await getSettingsFile())) ?? {};
  const nextSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...(globalParsed.settings || {}),
  } as Partial<UserSettings>;

  if (!hasConfiguredOrchestration(globalParsed) && hasConfiguredOrchestration(legacyParsed)) {
    nextSettings.orchestration = legacyParsed.settings.orchestration;
  }

  if (!hasConfiguredCommunication(globalParsed) && hasConfiguredCommunication(legacyParsed)) {
    nextSettings.communication = legacyParsed.settings.communication;
  }

  const migratedEnvelope = normalizeEnvelope({
    ...globalParsed,
    settings: nextSettings as UserSettings,
    updatedAt:
      legacyParsed.updatedAt && (!globalParsed.updatedAt || legacyParsed.updatedAt > globalParsed.updatedAt)
        ? legacyParsed.updatedAt
        : globalParsed.updatedAt,
  });

  await fs.mkdir(await getGlobalConfigDir(), { recursive: true });
  await fs.writeFile(await getSettingsFile(), JSON.stringify(migratedEnvelope, null, 2), "utf-8");
  return migratedEnvelope;
}

export async function initializeProjectSettings(projectRoot?: string | null): Promise<void> {
  const migratedEnvelope = await migrateLegacyProjectSettings(projectRoot);
  if (migratedEnvelope) {
    return;
  }

  const configDir = await getGlobalConfigDir();
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    await getSettingsFile(),
    JSON.stringify(createDefaultEnvelope(), null, 2)
  );
}

export async function readProjectSettings(
  projectRoot?: string | null
): Promise<UserSettingsEnvelope> {
  const migratedEnvelope = await migrateLegacyProjectSettings(projectRoot);
  if (migratedEnvelope) {
    return migratedEnvelope;
  }

  const settingsFile = await getSettingsFile();

  try {
    await fs.access(settingsFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await initializeProjectSettings(projectRoot);
      return createDefaultEnvelope();
    }
    throw error;
  }

  const parsed = await readEnvelopeIfExists(settingsFile);
  return normalizeEnvelope(parsed ?? {});
}

export async function writeProjectSettings(
  settings: UserSettings,
  projectRoot?: string | null
): Promise<UserSettingsEnvelope> {
  await migrateLegacyProjectSettings(projectRoot);
  const configDir = await getGlobalConfigDir();
  const nextEnvelope: UserSettingsEnvelope = {
    version: "1.0",
    settings: {
      ...settings,
      orchestration: normalizeOrchestrationSettings(settings.orchestration),
      communication: normalizeCommunicationSettings(settings.communication),
    },
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(await getSettingsFile(), JSON.stringify(nextEnvelope, null, 2), "utf-8");

  return nextEnvelope;
}
