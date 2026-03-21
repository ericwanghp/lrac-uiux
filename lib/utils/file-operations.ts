/**
 * File system utilities for reading and writing project files
 * with path sanitization for security
 */

import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { TasksJson } from "@/lib/types";
import { PROJECT_ROOT_COOKIE_KEY } from "@/lib/constants/project-context";

export const PROJECT_ROOT = process.cwd();
export const AUTO_CODING_DIR = path.join(PROJECT_ROOT, ".auto-coding");
const WORKSPACE_ROOT = path.dirname(PROJECT_ROOT);

export function resolveWorkspaceProjectRoot(projectRoot: string | null | undefined): string {
  if (!projectRoot) return PROJECT_ROOT;
  const resolved = path.resolve(projectRoot);
  if (resolved === PROJECT_ROOT) return PROJECT_ROOT;
  if (!resolved.startsWith(`${WORKSPACE_ROOT}${path.sep}`)) return PROJECT_ROOT;
  return resolved;
}

function getProjectRootFromCookie(): string {
  try {
    const cookieStore = cookies();
    const selectedRoot = cookieStore.get(PROJECT_ROOT_COOKIE_KEY)?.value;
    return resolveWorkspaceProjectRoot(selectedRoot);
  } catch {
    return PROJECT_ROOT;
  }
}

export function getCurrentProjectRoot(projectRoot?: string | null): string {
  if (projectRoot) return resolveWorkspaceProjectRoot(projectRoot);
  return getProjectRootFromCookie();
}

function getAllowedDirectories(projectRoot: string) {
  return [
    path.join(projectRoot, ".auto-coding"),
    path.join(projectRoot, "docs"),
    path.join(projectRoot, ".stitch"),
  ];
}

function pathWithin(basePath: string, targetPath: string): boolean {
  return targetPath === basePath || targetPath.startsWith(`${basePath}${path.sep}`);
}

function getAutoCodingDir(projectRoot?: string | null): string {
  return path.join(getCurrentProjectRoot(projectRoot), ".auto-coding");
}

/**
 * Sanitize file path to prevent directory traversal attacks
 */
export function sanitizePath(filePath: string, projectRoot?: string | null): string {
  const resolvedProjectRoot = getCurrentProjectRoot(projectRoot);
  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, "");

  // Normalize path (resolves .. and .)
  sanitized = path.normalize(sanitized);

  // Make absolute
  if (!path.isAbsolute(sanitized)) {
    sanitized = path.join(resolvedProjectRoot, sanitized);
  }

  // Check if path is within allowed directories
  const isAllowed = getAllowedDirectories(resolvedProjectRoot).some((allowedDir) =>
    pathWithin(allowedDir, sanitized)
  );

  if (!isAllowed) {
    throw new Error(`Access denied: Path outside allowed directories: ${filePath}`);
  }

  return sanitized;
}

/**
 * Read and parse JSON file safely
 */
export async function readJsonFile<T>(filePath: string, projectRoot?: string | null): Promise<T> {
  const sanitizedPath = sanitizePath(filePath, projectRoot);

  try {
    const content = await fs.readFile(sanitizedPath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Write JSON file safely
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T,
  projectRoot?: string | null
): Promise<void> {
  const sanitizedPath = sanitizePath(filePath, projectRoot);

  // Ensure directory exists
  const dir = path.dirname(sanitizedPath);
  await fs.mkdir(dir, { recursive: true });

  // Write with pretty formatting
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(sanitizedPath, content, "utf-8");
}

/**
 * Read tasks.json
 */
export async function readTasksJson(projectRoot?: string | null): Promise<TasksJson> {
  const filePath = path.join(getAutoCodingDir(projectRoot), "tasks.json");
  return readJsonFile<TasksJson>(filePath, projectRoot);
}

/**
 * Write tasks.json
 */
export async function writeTasksJson(data: TasksJson, projectRoot?: string | null): Promise<void> {
  const filePath = path.join(getAutoCodingDir(projectRoot), "tasks.json");
  await writeJsonFile(filePath, data, projectRoot);
}

/**
 * Read progress.txt
 */
export async function readProgressTxt(projectRoot?: string | null): Promise<string> {
  const filePath = path.join(getAutoCodingDir(projectRoot), "progress.txt");
  const sanitizedPath = sanitizePath(filePath, projectRoot);

  try {
    return await fs.readFile(sanitizedPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

/**
 * Append to progress.txt
 */
export async function appendToProgressTxt(
  content: string,
  projectRoot?: string | null
): Promise<void> {
  const filePath = path.join(getAutoCodingDir(projectRoot), "progress.txt");
  const sanitizedPath = sanitizePath(filePath, projectRoot);

  // Ensure directory exists
  const dir = path.dirname(sanitizedPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.appendFile(sanitizedPath, content, "utf-8");
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string, projectRoot?: string | null): Promise<boolean> {
  const sanitizedPath = sanitizePath(filePath, projectRoot);

  try {
    await fs.access(sanitizedPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete file safely
 */
export async function deleteFile(filePath: string, projectRoot?: string | null): Promise<void> {
  const sanitizedPath = sanitizePath(filePath, projectRoot);
  await fs.unlink(sanitizedPath);
}

/**
 * List files in directory
 */
export async function listFiles(dirPath: string, projectRoot?: string | null): Promise<string[]> {
  const sanitizedPath = sanitizePath(dirPath, projectRoot);

  try {
    const files = await fs.readdir(sanitizedPath);
    return files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
