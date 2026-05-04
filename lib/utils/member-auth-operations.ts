import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE_KEY } from "@/lib/constants/auth";
import type {
  AuthSession,
  AuthSessionsEnvelope,
  MemberCredentialsEnvelope,
  ProjectMember,
  UserSettingsEnvelope,
} from "@/lib/types";
import type { MemberCredentialRecord } from "@/lib/types/auth";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { readProjectSettings } from "@/lib/utils/project-settings-operations";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function createEmptySessions(): AuthSessionsEnvelope {
  return { version: "1.0", sessions: [] };
}

function createEmptyCredentials(): MemberCredentialsEnvelope {
  return { version: "1.0", credentials: [] };
}

async function getConfigPath(fileName: string, projectRoot?: string | null): Promise<string> {
  return path.join(await getCurrentProjectRoot(projectRoot), ".auto-coding", "config", fileName);
}

async function readEnvelope<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeEnvelope(filePath: string, payload: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

async function readAuthSessions(projectRoot?: string | null): Promise<AuthSessionsEnvelope> {
  return readEnvelope(await getConfigPath("auth-sessions.json", projectRoot), createEmptySessions());
}

async function writeAuthSessions(data: AuthSessionsEnvelope, projectRoot?: string | null): Promise<void> {
  await writeEnvelope(await getConfigPath("auth-sessions.json", projectRoot), data);
}

async function readMemberCredentials(projectRoot?: string | null): Promise<MemberCredentialsEnvelope> {
  return readEnvelope(
    await getConfigPath("member-credentials.json", projectRoot),
    createEmptyCredentials()
  );
}

async function writeMemberCredentials(
  data: MemberCredentialsEnvelope,
  projectRoot?: string | null
): Promise<void> {
  await writeEnvelope(await getConfigPath("member-credentials.json", projectRoot), data);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export async function setMemberPassword(input: {
  projectRoot?: string | null;
  memberId: string;
  password: string;
}): Promise<void> {
  const credentials = await readMemberCredentials(input.projectRoot);
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(input.password, salt);
  const nextRecord = {
    memberId: input.memberId,
    passwordHash,
    passwordSalt: salt,
    updatedAt: new Date().toISOString(),
  };

  const index = credentials.credentials.findIndex(
    (record: MemberCredentialRecord) => record.memberId === input.memberId
  );
  if (index === -1) {
    credentials.credentials.push(nextRecord);
  } else {
    credentials.credentials[index] = nextRecord;
  }

  await writeMemberCredentials(credentials, input.projectRoot);
}

async function findProjectMember(
  memberId: string,
  projectRoot?: string | null
): Promise<{ member: ProjectMember | null; settings: UserSettingsEnvelope }> {
  const settings = await readProjectSettings(projectRoot);
  const member =
    settings.settings.communication.members.find((entry) => entry.id === memberId && entry.active) ?? null;
  return { member, settings };
}

export async function createAuthSession(input: {
  projectRoot?: string | null;
  memberId: string;
  password: string;
}): Promise<{ token: string; member: ProjectMember; projectRoot: string }> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const [{ member }, credentials] = await Promise.all([
    findProjectMember(input.memberId, projectRoot),
    readMemberCredentials(projectRoot),
  ]);
  if (!member) {
    throw new Error("Member not found or inactive");
  }

  const credential = credentials.credentials.find(
    (record: MemberCredentialRecord) => record.memberId === input.memberId
  );
  if (!credential) {
    throw new Error("Password has not been set for this member");
  }

  const expectedHash = hashPassword(input.password, credential.passwordSalt);
  if (expectedHash !== credential.passwordHash) {
    throw new Error("Invalid password");
  }

  const token = crypto.randomUUID();
  const now = Date.now();
  const session: AuthSession = {
    token,
    memberId: member.id,
    projectRoot,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };

  const sessions = await readAuthSessions(projectRoot);
  sessions.sessions = sessions.sessions
    .filter((entry: AuthSession) => entry.memberId !== member.id && new Date(entry.expiresAt).getTime() > now)
    .concat(session);
  await writeAuthSessions(sessions, projectRoot);

  return { token, member, projectRoot };
}

export async function deleteAuthSession(
  token: string,
  projectRoot?: string | null
): Promise<void> {
  const resolvedProjectRoot = await getCurrentProjectRoot(projectRoot);
  const sessions = await readAuthSessions(resolvedProjectRoot);
  sessions.sessions = sessions.sessions.filter((entry: AuthSession) => entry.token !== token);
  await writeAuthSessions(sessions, resolvedProjectRoot);
}

export async function getCurrentAuthSession(
  projectRoot?: string | null
): Promise<{ member: ProjectMember | null; projectRoot: string | null; token: string | null }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE_KEY)?.value || null;
  const resolvedProjectRoot = await getCurrentProjectRoot(projectRoot);
  if (!token) {
    return { member: null, projectRoot: resolvedProjectRoot, token: null };
  }

  const [sessions, settings] = await Promise.all([
    readAuthSessions(resolvedProjectRoot),
    readProjectSettings(resolvedProjectRoot),
  ]);
  const now = Date.now();
  const activeSessions = sessions.sessions.filter(
    (entry: AuthSession) =>
      entry.projectRoot === resolvedProjectRoot && entry.token === token && new Date(entry.expiresAt).getTime() > now
  );

  if (activeSessions.length === 0) {
    return { member: null, projectRoot: resolvedProjectRoot, token };
  }

  const session = activeSessions[0];
  const member =
    settings.settings.communication.members.find(
      (entry: ProjectMember) => entry.id === session?.memberId && entry.active
    ) ?? null;
  return { member, projectRoot: resolvedProjectRoot, token };
}
