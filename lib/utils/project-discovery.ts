import fs from "fs/promises";
import path from "path";
import type { ProjectDescriptor, ProjectOption, ProjectSignal } from "@/lib/types/project";
import { isPathWithinWorkspaceRoot, resolveProjectCreationPath } from "@/lib/utils/project-selection";

async function readJsonField(
  filePath: string,
  field: "project" | "name",
  fallbackValue: string
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as { project?: unknown; name?: unknown };
    const value = parsed[field];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (
      value &&
      typeof value === "object" &&
      "name" in value &&
      typeof value.name === "string" &&
      value.name.trim()
    ) {
      return value.name;
    }

    return fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function sortProjects(projects: ProjectOption[], currentProjectRoot: string): ProjectOption[] {
  return [...projects].sort((a, b) => {
    if (a.root === currentProjectRoot) return -1;
    if (b.root === currentProjectRoot) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function describeProjectRoot(projectRoot: string): Promise<ProjectDescriptor> {
  const defaultName = path.basename(projectRoot);
  const tasksPath = path.join(projectRoot, ".auto-coding", "tasks.json");
  const packageJsonPath = path.join(projectRoot, "package.json");

  const signalChecks: Array<[ProjectSignal, string]> = [
    [".auto-coding/tasks.json", tasksPath],
    [".auto-coding", path.join(projectRoot, ".auto-coding")],
    ["package.json", packageJsonPath],
    ["CLAUDE.md", path.join(projectRoot, "CLAUDE.md")],
    ["AGENTS.md", path.join(projectRoot, "AGENTS.md")],
    ["docs", path.join(projectRoot, "docs")],
    [".stitch", path.join(projectRoot, ".stitch")],
  ];

  const signalStates = await Promise.all(
    signalChecks.map(
      async ([signal, targetPath]) => [signal, await pathExists(targetPath)] as const
    )
  );

  const signals = signalStates.filter(([, exists]) => exists).map(([signal]) => signal);
  const hasTasksJson = signals.includes(".auto-coding/tasks.json");

  let name = defaultName;
  if (hasTasksJson) {
    name = await readJsonField(tasksPath, "project", defaultName);
  } else if (signals.includes("package.json")) {
    name = await readJsonField(packageJsonPath, "name", defaultName);
  }

  return {
    root: projectRoot,
    name,
    signals,
    hasTasksJson,
  };
}

function shouldIncludeProject(descriptor: ProjectDescriptor, currentProjectRoot: string): boolean {
  if (descriptor.root === currentProjectRoot) {
    return true;
  }

  return descriptor.signals.length > 0;
}

export async function discoverWorkspaceProjects(
  currentProjectRoot: string
): Promise<ProjectOption[]> {
  const workspaceRoot = path.dirname(currentProjectRoot);
  const fallbackProject = await describeProjectRoot(currentProjectRoot);

  try {
    const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
    const discovered = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => describeProjectRoot(path.join(workspaceRoot, entry.name)))
    );

    const projects = discovered
      .filter((project) => shouldIncludeProject(project, currentProjectRoot))
      .map(({ root, name }) => ({ root, name }));
    if (!projects.some((project) => project.root === currentProjectRoot)) {
      projects.unshift({ root: fallbackProject.root, name: fallbackProject.name });
    }

    return sortProjects(projects, currentProjectRoot);
  } catch {
    return [{ root: fallbackProject.root, name: fallbackProject.name }];
  }
}

export async function createWorkspaceProject(
  projectPathInput: string,
  currentProjectRoot: string
): Promise<ProjectDescriptor> {
  const workspaceRoot = path.dirname(currentProjectRoot);
  const targetProjectRoot = resolveProjectCreationPath(projectPathInput, workspaceRoot);

  if (!isPathWithinWorkspaceRoot(targetProjectRoot, workspaceRoot)) {
    throw new Error(`Project path must stay under ${workspaceRoot}`);
  }

  try {
    const existing = await fs.stat(targetProjectRoot);
    if (existing.isDirectory()) {
      throw new Error(`Project path already exists: ${targetProjectRoot}`);
    }
    throw new Error(`Project path is not a directory: ${targetProjectRoot}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(targetProjectRoot, { recursive: true });
  await Promise.all([
    fs.mkdir(path.join(targetProjectRoot, ".auto-coding"), { recursive: true }),
    fs.mkdir(path.join(targetProjectRoot, "docs"), { recursive: true }),
    fs.mkdir(path.join(targetProjectRoot, ".stitch"), { recursive: true }),
  ]);

  return describeProjectRoot(targetProjectRoot);
}
