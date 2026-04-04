/**
 * File system utilities for Q&A session persistence
 * Extends file-operations with Q&A session-specific functions
 */

import fs from "fs/promises";
import path from "path";
import { QASessionJson } from "@/lib/types/qa-session";
import { PROJECT_ROOT, getCurrentProjectRoot } from "@/lib/utils/file-operations";

function getQASessionsDir(projectRoot?: string | null): Promise<string> {
  return getCurrentProjectRoot(projectRoot).then((root) => path.join(root, ".auto-coding", "qa-sessions"));
}

async function getQASessionsFile(projectRoot?: string | null): Promise<string> {
  return path.join(await getQASessionsDir(projectRoot), "sessions.json");
}
export const QA_SESSIONS_DIR = path.join(PROJECT_ROOT, ".auto-coding", "qa-sessions");
export const QA_SESSIONS_FILE = path.join(PROJECT_ROOT, ".auto-coding", "qa-sessions", "sessions.json");

/**
 * Initialize Q&A sessions storage
 * Creates the sessions.json file if it doesn't exist
 */
export async function initializeQASessions(projectRoot?: string | null): Promise<void> {
  const qaSessionsDir = await getQASessionsDir(projectRoot);
  await fs.mkdir(qaSessionsDir, { recursive: true });
  const data: QASessionJson = {
    version: "1.0",
    sessions: [],
  };
  await writeQASessionsFile(data, projectRoot);
}

/**
 * Read Q&A sessions file
 */
export async function readQASessionsFile(projectRoot?: string | null): Promise<QASessionJson> {
  const qaSessionsFile = await getQASessionsFile(projectRoot);
  try {
    await fs.access(qaSessionsFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await initializeQASessions(projectRoot);
      return { version: "1.0", sessions: [] };
    }
    throw error;
  }

  const content = await fs.readFile(qaSessionsFile, "utf-8");
  return JSON.parse(content);
}

/**
 * Write Q&A sessions file
 */
export async function writeQASessionsFile(
  data: QASessionJson,
  projectRoot?: string | null
): Promise<void> {
  const qaSessionsDir = await getQASessionsDir(projectRoot);
  const qaSessionsFile = await getQASessionsFile(projectRoot);
  await fs.mkdir(qaSessionsDir, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(qaSessionsFile, content, "utf-8");
}

/**
 * Generate unique ID for Q&A session
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `qa-${timestamp}-${random}`;
}
