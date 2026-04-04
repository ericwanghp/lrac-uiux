import fs from "fs/promises";
import path from "path";
import { getPhaseFromParallelGroup, getPhaseFromTaskId } from "@/lib/constants/task-id";
import type { Feature } from "@/lib/types";
import { getCurrentProjectRoot, readProgressTxt, readTasksJson } from "@/lib/utils/file-operations";

export type Artifact = {
  name: string;
  absolutePath: string;
  relativePath: string;
  updatedAt: string;
  excerpt: string;
};

export type ProgressSession = {
  name: string;
  timestamp: string;
  role: string;
  executionItems: string[];
  endingItems: string[];
};

type TaskLog = {
  featureId: string;
  featureTitle: string;
  timestamp: string;
  action: string;
};

async function resolveProjectRoot(projectRoot?: string | null): Promise<string> {
  return getCurrentProjectRoot(projectRoot);
}

export function inferFeaturePhase(
  feature: Pick<Feature, "id" | "taskBreakdown">
): number | undefined {
  return (
    getPhaseFromParallelGroup(feature.taskBreakdown?.parallelGroup) ||
    getPhaseFromTaskId(feature.id)
  );
}

function matchesPhase(feature: Pick<Feature, "id" | "taskBreakdown">, phases: number[]): boolean {
  const phase = inferFeaturePhase(feature);
  return phase !== undefined && phases.includes(phase);
}

function toExcerpt(content: string, includeMarkdownHeadings = false): string {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && (includeMarkdownHeadings || !line.startsWith("#")))
    .slice(0, 3)
    .join(" ")
    .slice(0, 260);
}

export async function readArtifacts(
  subdir: string,
  projectRoot?: string | null
): Promise<Artifact[]> {
  const resolvedProjectRoot = await resolveProjectRoot(projectRoot);
  const dir = path.join(resolvedProjectRoot, "docs", subdir);

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries.filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md")
    );
    const artifacts = await Promise.all(
      files.map(async (file) => {
        const absolutePath = path.join(dir, file.name);
        const stat = await fs.stat(absolutePath);
        const content = await fs.readFile(absolutePath, "utf-8");
        return {
          name: file.name,
          absolutePath,
          relativePath: path.relative(resolvedProjectRoot, absolutePath),
          updatedAt: stat.mtime.toISOString(),
          excerpt: toExcerpt(content),
        };
      })
    );
    return artifacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function parseProgressSessions(progressText: string): ProgressSession[] {
  const chunks = progressText.split("\n---\n").map((chunk) => chunk.trim());
  const sessions: ProgressSession[] = [];

  for (const chunk of chunks) {
    const sessionLine = chunk
      .split("\n")
      .find((line) => line.trim().startsWith("# Session:") && line.includes("| Role:"));
    if (!sessionLine) continue;

    const sessionMatch = sessionLine.match(
      /^# Session:\s*(.*?)\s*\|\s*Timestamp:\s*(.*?)\s*\|\s*Role:\s*(.*)$/
    );
    if (!sessionMatch) continue;

    const [, rawName, rawTimestamp, rawRole] = sessionMatch;
    const name = rawName?.trim();
    const timestamp = rawTimestamp?.trim();
    const role = rawRole?.trim();
    if (!name || !timestamp || !role) continue;
    const executionItems = collectSectionItems(chunk, "## Execution Content", "## Ending State");
    const endingItems = collectSectionItems(chunk, "## Ending State", "## Next Steps");

    sessions.push({
      name,
      timestamp,
      role,
      executionItems,
      endingItems,
    });
  }

  return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function collectSectionItems(chunk: string, startTitle: string, endTitle: string): string[] {
  const start = chunk.indexOf(startTitle);
  if (start === -1) return [];
  const end = chunk.indexOf(endTitle, start);
  const body =
    end === -1
      ? chunk.slice(start + startTitle.length)
      : chunk.slice(start + startTitle.length, end);
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line) || /^- /.test(line))
    .map((line) =>
      line
        .replace(/^\d+\.\s*/, "")
        .replace(/^- /, "")
        .trim()
    );
}

export async function readTaskLogsByFeatureIds(
  featureIds: string[],
  projectRoot?: string | null
): Promise<TaskLog[]> {
  const tasks = await readTasksJson(projectRoot);
  const logs = tasks.features
    .filter((feature) => featureIds.includes(feature.id))
    .flatMap((feature) =>
      feature.executionHistory.map((history) => ({
        featureId: feature.id,
        featureTitle: feature.title,
        timestamp: history.timestamp,
        action: history.action,
      }))
    );
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function readTaskLogsByPhase(
  phases: number[],
  projectRoot?: string | null
): Promise<TaskLog[]> {
  const tasks = await readTasksJson(projectRoot);
  const logs = tasks.features
    .filter((feature) => matchesPhase(feature, phases))
    .flatMap((feature) =>
      feature.executionHistory.map((history) => ({
        featureId: feature.id,
        featureTitle: feature.title,
        timestamp: history.timestamp,
        action: history.action,
      }))
    );
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function loadProgressSessions(
  projectRoot?: string | null
): Promise<ProgressSession[]> {
  const progressText = await readProgressTxt(projectRoot);
  return parseProgressSessions(progressText);
}

export async function readExplicitArtifacts(
  relativePaths: string[],
  projectRoot?: string | null
): Promise<Artifact[]> {
  const resolvedProjectRoot = await resolveProjectRoot(projectRoot);
  const artifacts = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = path.join(resolvedProjectRoot, relativePath);
      try {
        const stat = await fs.stat(absolutePath);
        if (!stat.isFile()) return null;
        const content = await fs.readFile(absolutePath, "utf-8");
        return {
          name: path.basename(absolutePath),
          absolutePath,
          relativePath,
          updatedAt: stat.mtime.toISOString(),
          excerpt: toExcerpt(content, true),
        };
      } catch {
        return null;
      }
    })
  );
  return artifacts
    .filter((artifact): artifact is Artifact => artifact !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readCodeArtifacts(
  relativeDir: string,
  matcher: (fileName: string) => boolean,
  limit = 30,
  projectRoot?: string | null
): Promise<Artifact[]> {
  const resolvedProjectRoot = await resolveProjectRoot(projectRoot);
  const rootDir = path.join(resolvedProjectRoot, relativeDir);
  const filePaths = await collectFiles(rootDir);
  const filtered = filePaths.filter((filePath) => matcher(path.basename(filePath))).slice(0, limit);
  const artifacts = await Promise.all(
    filtered.map(async (absolutePath) => {
      const stat = await fs.stat(absolutePath);
      const content = await fs.readFile(absolutePath, "utf-8");
      return {
        name: path.basename(absolutePath),
        absolutePath,
        relativePath: path.relative(resolvedProjectRoot, absolutePath),
        updatedAt: stat.mtime.toISOString(),
        excerpt: toExcerpt(content, true),
      };
    })
  );
  return artifacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function collectFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectFiles(fullPath);
        if (entry.isFile()) return [fullPath];
        return [];
      })
    );
    return nested.flat();
  } catch {
    return [];
  }
}
