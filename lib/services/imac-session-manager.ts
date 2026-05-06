import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

const execFileAsync = promisify(execFile);

export type ImacStatus = "created" | "in-progress" | "merged" | "aborted";

export interface ImacAttachment {
  id: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

export interface ImacWorktree {
  branch: string;
  path: string | null;
  createdAt: string | null;
}

export interface ImacSession {
  id: string;
  abbreviation: string;
  title: string;
  description: string;
  projectRoot: string;
  attachments: ImacAttachment[];
  worktree: ImacWorktree;
  status: ImacStatus;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  abortedAt: string | null;
}

export interface ImacSessionsJson {
  version: "1.0";
  sessions: ImacSession[];
}

let mutationQueue: Promise<unknown> = Promise.resolve();

function getImacSessionsDir(projectRoot: string) {
  return path.join(projectRoot, ".auto-coding", "imac-sessions");
}

function getImacSessionsFile(projectRoot: string) {
  return path.join(getImacSessionsDir(projectRoot), "sessions.json");
}

function getImacAttachmentsDir(projectRoot: string, sessionId: string) {
  return path.join(getImacSessionsDir(projectRoot), sessionId, "attachments");
}

async function ensureSessionsFile(projectRoot: string): Promise<void> {
  const dir = getImacSessionsDir(projectRoot);
  const file = getImacSessionsFile(projectRoot);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify({ version: "1.0", sessions: [] }, null, 2), "utf-8");
  }
}

export async function readImacSessions(projectRoot?: string | null): Promise<ImacSessionsJson> {
  const root = await getCurrentProjectRoot(projectRoot);
  await ensureSessionsFile(root);
  const content = await fs.readFile(getImacSessionsFile(root), "utf-8");
  return JSON.parse(content) as ImacSessionsJson;
}

async function writeImacSessions(data: ImacSessionsJson, projectRoot: string): Promise<void> {
  await ensureSessionsFile(projectRoot);
  await fs.writeFile(getImacSessionsFile(projectRoot), JSON.stringify(data, null, 2), "utf-8");
}

function enqueueMutation<T>(fn: () => Promise<T>): Promise<T> {
  const next = mutationQueue.then(fn);
  mutationQueue = next.catch(() => {});
  return next;
}

export function generateImacId(abbreviation: string): string {
  return `imac-${abbreviation}-${Date.now().toString(36)}`;
}

export async function createImacSession(
  input: {
    abbreviation: string;
    title: string;
    description: string;
  },
  projectRoot?: string | null
): Promise<ImacSession> {
  const root = await getCurrentProjectRoot(projectRoot);
  const now = new Date().toISOString();
  const id = generateImacId(input.abbreviation);
  const branch = `imac/${input.abbreviation}`;

  const session: ImacSession = {
    id,
    abbreviation: input.abbreviation,
    title: input.title,
    description: input.description,
    projectRoot: root,
    attachments: [],
    worktree: { branch, path: null, createdAt: null },
    status: "created",
    createdAt: now,
    updatedAt: now,
    mergedAt: null,
    abortedAt: null,
  };

  return enqueueMutation(async () => {
    const data = await readImacSessions(root);
    data.sessions.push(session);
    await writeImacSessions(data, root);
    return session;
  });
}

export async function getImacSession(
  sessionId: string,
  projectRoot?: string | null
): Promise<ImacSession | null> {
  const root = await getCurrentProjectRoot(projectRoot);
  const data = await readImacSessions(root);
  return data.sessions.find((s) => s.id === sessionId) ?? null;
}

export async function listImacSessions(
  projectRoot?: string | null
): Promise<ImacSession[]> {
  const root = await getCurrentProjectRoot(projectRoot);
  const data = await readImacSessions(root);
  return data.sessions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function storeImacAttachments(
  sessionId: string,
  files: File[],
  projectRoot?: string | null
): Promise<ImacAttachment[]> {
  const root = await getCurrentProjectRoot(projectRoot);
  const attachmentsDir = getImacAttachmentsDir(root, sessionId);
  await fs.mkdir(attachmentsDir, { recursive: true });
  const uploadedAt = new Date().toISOString();

  const attachments: ImacAttachment[] = await Promise.all(
    files
      .filter((file) => file.size > 0)
      .map(async (file, index) => {
        const sanitizedName = file.name
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") || "attachment";
        const storedName = `${Date.now()}-${index}-${sanitizedName}`;
        const absolutePath = path.join(attachmentsDir, storedName);
        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));

        return {
          id: `att-${Date.now().toString(36)}-${index}`,
          originalName: file.name,
          storedName,
          relativePath: path.relative(root, absolutePath),
          size: file.size,
          uploadedAt,
        };
      })
  );

  return enqueueMutation(async () => {
    const data = await readImacSessions(root);
    const session = data.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`IMAC session not found: ${sessionId}`);
    session.attachments.push(...attachments);
    session.updatedAt = new Date().toISOString();
    await writeImacSessions(data, root);
    return attachments;
  });
}

async function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("git", args, { cwd, maxBuffer: 1024 * 1024 });
}

export async function createWorktree(
  sessionId: string,
  projectRoot?: string | null
): Promise<ImacSession> {
  const root = await getCurrentProjectRoot(projectRoot);
  const data = await readImacSessions(root);
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error(`IMAC session not found: ${sessionId}`);
  if (session.status !== "created") throw new Error(`IMAC session is in status '${session.status}', expected 'created'`);

  const worktreeDir = path.join(root, ".auto-coding", "worktrees", session.abbreviation);
  await fs.mkdir(path.dirname(worktreeDir), { recursive: true });

  await runGit(["worktree", "add", worktreeDir, "-b", session.worktree.branch], root);

  const now = new Date().toISOString();
  session.worktree.path = worktreeDir;
  session.worktree.createdAt = now;
  session.status = "in-progress";
  session.updatedAt = now;

  await writeImacSessions(data, root);
  return session;
}

export async function mergeWorktree(
  sessionId: string,
  projectRoot?: string | null
): Promise<ImacSession> {
  const root = await getCurrentProjectRoot(projectRoot);

  return enqueueMutation(async () => {
    const data = await readImacSessions(root);
    const session = data.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`IMAC session not found: ${sessionId}`);
    if (session.status !== "in-progress") throw new Error(`IMAC session is in status '${session.status}', expected 'in-progress'`);

    await runGit(["checkout", "main"], root);
    await runGit(["merge", session.worktree.branch], root);

    if (session.worktree.path) {
      await runGit(["worktree", "remove", session.worktree.path], root);
    }
    await runGit(["branch", "-d", session.worktree.branch], root);

    const now = new Date().toISOString();
    session.status = "merged";
    session.mergedAt = now;
    session.updatedAt = now;
    session.worktree.path = null;

    await writeImacSessions(data, root);
    return session;
  });
}

export async function abortImac(
  sessionId: string,
  projectRoot?: string | null
): Promise<ImacSession> {
  const root = await getCurrentProjectRoot(projectRoot);

  return enqueueMutation(async () => {
    const data = await readImacSessions(root);
    const session = data.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`IMAC session not found: ${sessionId}`);
    if (session.status !== "created" && session.status !== "in-progress") {
      throw new Error(`IMAC session is in status '${session.status}', cannot abort`);
    }

    if (session.worktree.path) {
      try {
        await runGit(["worktree", "remove", session.worktree.path, "--force"], root);
      } catch {
        // best effort cleanup
      }
    }

    try {
      await runGit(["branch", "-D", session.worktree.branch], root);
    } catch {
      // branch may not exist if worktree was never created
    }

    const now = new Date().toISOString();
    session.status = "aborted";
    session.abortedAt = now;
    session.updatedAt = now;
    session.worktree.path = null;

    await writeImacSessions(data, root);
    return session;
  });
}

export async function deleteImacSession(
  sessionId: string,
  projectRoot?: string | null
): Promise<void> {
  const root = await getCurrentProjectRoot(projectRoot);

  return enqueueMutation(async () => {
    const data = await readImacSessions(root);
    const session = data.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`IMAC session not found: ${sessionId}`);

    if (session.status === "in-progress") {
      throw new Error(`Cannot delete an in-progress IMAC session. Abort it first.`);
    }

    if (session.worktree.path) {
      try {
        await runGit(["worktree", "remove", session.worktree.path, "--force"], root);
      } catch {
        // best effort cleanup
      }
    }

    try {
      await runGit(["branch", "-D", session.worktree.branch], root);
    } catch {
      // branch may not exist
    }

    data.sessions = data.sessions.filter((s) => s.id !== sessionId);
    await writeImacSessions(data, root);
  });
}
