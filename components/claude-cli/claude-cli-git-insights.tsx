"use client";

import * as React from "react";
import {
  CircleDot,
  ChevronDown,
  ChevronRight,
  FolderTree,
  GitBranch,
  FileCode2,
  RefreshCw,
  Search,
  SplitSquareVertical,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import type { GitInsightsData } from "@/lib/utils/git-insights";
import { cn } from "@/lib/utils";
import { ClaudeCliBranchGraph } from "@/components/claude-cli/claude-cli-branch-graph";

interface ClaudeCliGitInsightsProps {
  projectRoot: string | null;
  className?: string;
}

type GitInsightsResponse = {
  success: boolean;
  data?: GitInsightsData;
  error?: string;
};

type DiffMode = "working" | "staged";
type WorkingTreeFile = GitInsightsData["files"][number];
type WorkingTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "directory" | "file";
  children: WorkingTreeNode[];
  file?: WorkingTreeFile;
};
type SplitDiffRow =
  | {
      kind: "pair";
      left: { lineNumber: number | null; content: string; type: "del" | "context" | null };
      right: { lineNumber: number | null; content: string; type: "add" | "context" | null };
    }
  | {
      kind: "single";
      left: { lineNumber: number | null; content: string; type: "del" | "context" | null };
      right: { lineNumber: number | null; content: string; type: "add" | "context" | null };
    };

const statBadgeClassName =
  "rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground";

function buildWorkingTree(files: WorkingTreeFile[]): WorkingTreeNode[] {
  const root: WorkingTreeNode = {
    id: "root",
    name: "root",
    path: "",
    type: "directory",
    children: [],
  };

  files
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path))
    .forEach((file) => {
      const segments = file.path.split("/").filter(Boolean);
      let current = root;

      segments.forEach((segment, index) => {
        const currentPath = segments.slice(0, index + 1).join("/");
        const isFile = index === segments.length - 1;
        let next = current.children.find((entry) => entry.name === segment && entry.type === (isFile ? "file" : "directory"));

        if (!next) {
          next = {
            id: currentPath,
            name: segment,
            path: currentPath,
            type: isFile ? "file" : "directory",
            children: [],
            file: isFile ? file : undefined,
          };
          current.children.push(next);
          current.children.sort((left, right) => {
            if (left.type !== right.type) {
              return left.type === "directory" ? -1 : 1;
            }
            return left.name.localeCompare(right.name);
          });
        }

        current = next;
      });
    });

  return root.children;
}

function getFileStatusToken(file: GitInsightsData["files"][number]) {
  if (file.status === "??") {
    return {
      label: "U",
      name: "Untracked",
      className: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    };
  }
  if (file.status.includes("U")) {
    return {
      label: "C",
      name: "Conflict",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }
  if (file.status.includes("A")) {
    return {
      label: "A",
      name: "Added",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (file.status.includes("D")) {
    return {
      label: "D",
      name: "Deleted",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }
  return {
    label: "M",
    name: "Modified",
    className: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  };
}

function filterWorkingTree(nodes: WorkingTreeNode[], query: string): WorkingTreeNode[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return nodes;
  }

  return nodes
    .map((node) => {
      if (node.type === "file") {
        return node.path.toLowerCase().includes(normalized) ? node : null;
      }

      const nextChildren = filterWorkingTree(node.children, normalized);
      if (nextChildren.length > 0 || node.path.toLowerCase().includes(normalized)) {
        return {
          ...node,
          children: nextChildren,
        };
      }
      return null;
    })
    .filter((node): node is WorkingTreeNode => Boolean(node));
}

function buildSplitDiffRows(hunk: GitInsightsData["diffFiles"][number]["hunks"][number]): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let index = 0;

  while (index < hunk.lines.length) {
    const line = hunk.lines[index];
    if (!line) {
      break;
    }

    if (line.type === "context") {
      rows.push({
        kind: "single",
        left: { lineNumber: line.oldLine, content: line.content, type: "context" },
        right: { lineNumber: line.newLine, content: line.content, type: "context" },
      });
      index += 1;
      continue;
    }

    if (line.type === "del") {
      const nextLine = hunk.lines[index + 1];
      if (nextLine?.type === "add") {
        rows.push({
          kind: "pair",
          left: { lineNumber: line.oldLine, content: line.content, type: "del" },
          right: { lineNumber: nextLine.newLine, content: nextLine.content, type: "add" },
        });
        index += 2;
        continue;
      }

      rows.push({
        kind: "single",
        left: { lineNumber: line.oldLine, content: line.content, type: "del" },
        right: { lineNumber: null, content: "", type: null },
      });
      index += 1;
      continue;
    }

    rows.push({
      kind: "single",
      left: { lineNumber: null, content: "", type: null },
      right: { lineNumber: line.newLine, content: line.content, type: "add" },
    });
    index += 1;
  }

  return rows;
}

export function ClaudeCliGitInsights({ projectRoot, className }: ClaudeCliGitInsightsProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<GitInsightsData | null>(null);
  const [diffMode, setDiffMode] = React.useState<DiffMode>("working");
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null);
  const [isWorkingTreeExpanded, setIsWorkingTreeExpanded] = React.useState(true);
  const [collapsedPaths, setCollapsedPaths] = React.useState<Record<string, boolean>>({});
  const [treeQuery, setTreeQuery] = React.useState("");
  const diffScrollRef = React.useRef<HTMLDivElement | null>(null);
  const diffFileRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const loadInsights = React.useCallback(async () => {
    if (!projectRoot) {
      setInsights(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestPath = buildProjectScopedPath("/api/git/insights", projectRoot);
      const requestUrl = new URL(requestPath, window.location.origin);
      if (selectedFilePath) {
        requestUrl.searchParams.set("focusPath", selectedFilePath);
      }

      const response = await fetch(requestUrl.toString(), {
        cache: "no-store",
      });
      const payload = (await response.json()) as GitInsightsResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to load git insights");
      }

      setInsights(payload.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load git insights");
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot, selectedFilePath]);

  React.useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  React.useEffect(() => {
    if (!projectRoot) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadInsights();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadInsights, projectRoot]);

  const diffText =
    diffMode === "working"
      ? insights?.diffFiles || []
      : insights?.stagedDiffFiles || [];
  const focusedDiffFile =
    diffMode === "working"
      ? insights?.focusedWorkingDiffFile || null
      : insights?.focusedStagedDiffFile || null;
  const selectedDiffFile = selectedFilePath
    ? diffText.find(
        (file) =>
          file.path === selectedFilePath ||
          file.oldPath === selectedFilePath ||
          file.newPath === selectedFilePath
      ) || null
    : null;
  const resolvedFocusedDiffFile =
    selectedDiffFile ||
    (selectedFilePath &&
    focusedDiffFile &&
    (focusedDiffFile.path === selectedFilePath ||
      focusedDiffFile.oldPath === selectedFilePath ||
      focusedDiffFile.newPath === selectedFilePath)
      ? focusedDiffFile
      : null);
  const visibleDiffFiles = resolvedFocusedDiffFile ? [resolvedFocusedDiffFile] : diffText;
  const workingTree = React.useMemo(
    () => buildWorkingTree(insights?.files || []),
    [insights?.files]
  );
  const filteredWorkingTree = React.useMemo(
    () => filterWorkingTree(workingTree, treeQuery),
    [treeQuery, workingTree]
  );

  React.useEffect(() => {
    if (!selectedFilePath) {
      return;
    }

    const existsInAnyView =
      (insights?.diffFiles || []).some(
        (file) =>
          file.path === selectedFilePath ||
          file.oldPath === selectedFilePath ||
          file.newPath === selectedFilePath
      ) ||
      (insights?.stagedDiffFiles || []).some(
        (file) =>
          file.path === selectedFilePath ||
          file.oldPath === selectedFilePath ||
          file.newPath === selectedFilePath
      );

    if (!existsInAnyView) {
      setSelectedFilePath(null);
    }
  }, [insights, selectedFilePath]);

  React.useEffect(() => {
    if (!selectedFilePath) {
      return;
    }

    const existsInWorkingDiff =
      (insights?.diffFiles || []).some(
        (file) =>
          file.path === selectedFilePath ||
          file.oldPath === selectedFilePath ||
          file.newPath === selectedFilePath
      ) ||
      insights?.focusedWorkingDiffFile?.path === selectedFilePath ||
      insights?.focusedWorkingDiffFile?.oldPath === selectedFilePath ||
      insights?.focusedWorkingDiffFile?.newPath === selectedFilePath;
    const existsInStagedDiff =
      (insights?.stagedDiffFiles || []).some(
        (file) =>
          file.path === selectedFilePath ||
          file.oldPath === selectedFilePath ||
          file.newPath === selectedFilePath
      ) ||
      insights?.focusedStagedDiffFile?.path === selectedFilePath ||
      insights?.focusedStagedDiffFile?.oldPath === selectedFilePath ||
      insights?.focusedStagedDiffFile?.newPath === selectedFilePath;

    if (diffMode === "working" && !existsInWorkingDiff && existsInStagedDiff) {
      setDiffMode("staged");
      return;
    }

    if (diffMode === "staged" && !existsInStagedDiff && existsInWorkingDiff) {
      setDiffMode("working");
    }
  }, [diffMode, insights, selectedFilePath]);

  React.useEffect(() => {
    if (workingTree.length === 0) {
      return;
    }

    const visitDirectories = (nodes: WorkingTreeNode[], acc: string[]) => {
      nodes.forEach((node) => {
        if (node.type === "directory") {
          acc.push(node.path);
          visitDirectories(node.children, acc);
        }
      });
    };

    const directoryPaths: string[] = [];
    visitDirectories(workingTree, directoryPaths);

    setCollapsedPaths((current) => {
      const next = { ...current };
      let changed = false;

      directoryPaths.forEach((directoryPath) => {
        if (!(directoryPath in next)) {
          next[directoryPath] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [workingTree]);

  React.useEffect(() => {
    if (!resolvedFocusedDiffFile) {
      return;
    }

    const target = diffFileRefs.current[resolvedFocusedDiffFile.path];
    if (!target) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [resolvedFocusedDiffFile, diffMode]);

  return (
    <aside
      className={cn(
        "hidden min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/72 xl:flex",
        className
      )}
    >
      <div className="border-b border-border/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Git Insights
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Diff stream and branch topology for the attached workspace project.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void loadInsights()}
            disabled={isLoading}
            aria-label="Refresh git insights"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading ? "animate-spin" : "")} />
          </Button>
        </div>
        {insights ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={statBadgeClassName}>
              <span className="mr-1 inline-flex align-middle">
                <GitBranch className="h-3.5 w-3.5" />
              </span>
              {insights.currentBranch || "detached"}
            </span>
            {insights.headShortSha ? <span className={statBadgeClassName}>{insights.headShortSha}</span> : null}
            <span className={statBadgeClassName}>+{insights.statusSummary.ahead}</span>
            <span className={statBadgeClassName}>-{insights.statusSummary.behind}</span>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!projectRoot ? (
          <EmptyPanel
            title="No project selected"
            description="Open a workspace project to inspect its git activity."
          />
        ) : error ? (
          <EmptyPanel title="Git insights unavailable" description={error} tone="error" />
        ) : isLoading && !insights ? (
          <EmptyPanel title="Loading git view" description="Reading working tree and branch history..." />
        ) : !insights?.isGitRepository ? (
          <EmptyPanel
            title="No git repository"
            description="This project path does not contain a git repository yet."
          />
        ) : (
          <div className="space-y-4">
            <section className="rounded-[1.25rem] border border-border/75 bg-background/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Working Tree</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Repository: {insights.repositoryRoot}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border/70 bg-card/80">
                    {insights.files.length} files
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-2"
                    onClick={() => setIsWorkingTreeExpanded((current) => !current)}
                    aria-expanded={isWorkingTreeExpanded}
                    aria-label={isWorkingTreeExpanded ? "Collapse working tree" : "Expand working tree"}
                  >
                    {isWorkingTreeExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <MiniStat label="Modified" value={insights.statusSummary.modified} />
                <MiniStat label="Staged" value={insights.statusSummary.staged} />
                <MiniStat label="Untracked" value={insights.statusSummary.untracked} />
                <MiniStat label="Conflicts" value={insights.statusSummary.conflicted} tone="warning" />
              </div>
              {isWorkingTreeExpanded ? (
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={treeQuery}
                      onChange={(event) => setTreeQuery(event.target.value)}
                      placeholder="Filter files..."
                      className="h-9 w-full rounded-xl border border-border/70 bg-background/80 pl-9 pr-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary/35"
                    />
                  </div>
                  {insights.files.length === 0 ? (
                    <p className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3 text-xs text-muted-foreground">
                      Working tree clean.
                    </p>
                  ) : filteredWorkingTree.length === 0 ? (
                    <p className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3 text-xs text-muted-foreground">
                      No files match "{treeQuery}".
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-card/60 px-2 py-2">
                      <WorkingTreeNodes
                        nodes={filteredWorkingTree}
                        depth={0}
                        selectedFilePath={selectedFilePath}
                        collapsedPaths={collapsedPaths}
                        forceExpanded={Boolean(treeQuery.trim())}
                        onToggleDirectory={(directoryPath) =>
                          setCollapsedPaths((current) => ({
                            ...current,
                            [directoryPath]: !(current[directoryPath] ?? false),
                          }))
                        }
                        onSelectFile={(filePath) =>
                          setSelectedFilePath((current) => (current === filePath ? null : filePath))
                        }
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-[1.25rem] border border-border/75 bg-background/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Diff Preview</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {resolvedFocusedDiffFile
                      ? `Focused on ${resolvedFocusedDiffFile.path}`
                      : selectedFilePath
                        ? `No ${diffMode} diff for ${selectedFilePath}`
                        : insights.diffStat}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFilePath ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setSelectedFilePath(null)}
                    >
                      Clear File Focus
                    </Button>
                  ) : null}
                  <div className="inline-flex rounded-full border border-border/70 bg-card/75 p-1">
                    {(["working", "staged"] as DiffMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDiffMode(mode)}
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                          diffMode === mode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode === "working" ? "Working" : "Staged"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-border/75 bg-background/95">
                <div className="flex items-center gap-2 border-b border-border/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>{diffMode === "working" ? "Unstaged Diff" : "Staged Diff"}</span>
                </div>
                  {visibleDiffFiles.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">No changes.</div>
                ) : (
                  <div ref={diffScrollRef} className="max-h-[360px] overflow-auto px-3 py-3">
                    <div className="space-y-3">
                      {visibleDiffFiles.slice(0, selectedDiffFile ? 1 : 8).map((file) => (
                        <div
                          key={`${file.path}:${file.hunks.length}`}
                          ref={(node) => {
                            diffFileRefs.current[file.path] = node;
                          }}
                          className={cn(
                            "rounded-2xl border border-border/75 bg-card/70 transition-colors",
                            resolvedFocusedDiffFile?.path === file.path && "border-primary/35 bg-primary/5"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-border/75 px-3 py-2">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {file.path}
                            </p>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-300">
                                +{file.additions}
                              </span>
                              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-300">
                                -{file.deletions}
                              </span>
                            </div>
                          </div>
                          <div className="divide-y divide-border/75">
                            {file.hunks.slice(0, resolvedFocusedDiffFile?.path === file.path ? 5 : 2).map((hunk) => (
                              <div key={hunk.header} className="px-2 py-2">
                                <p className="mb-2 font-mono text-[10px] text-muted-foreground">
                                  {hunk.header}
                                </p>
                                <div className="overflow-hidden rounded-xl border border-border/65">
                                  <div className="grid grid-cols-2 border-b border-border/65 bg-muted/40 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                    <div className="border-r border-border/65 px-3 py-2">Before</div>
                                    <div className="px-3 py-2">After</div>
                                  </div>
                                  <div className="font-mono text-[11px] leading-5">
                                    {buildSplitDiffRows(hunk)
                                      .slice(0, 18)
                                      .map((row, idx) => (
                                        <div
                                          key={`${hunk.header}:${idx}`}
                                          className="grid grid-cols-2 divide-x divide-border/65"
                                        >
                                          <SplitDiffCell side="left" line={row.left} />
                                          <SplitDiffCell side="right" line={row.right} />
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!resolvedFocusedDiffFile && visibleDiffFiles.length > 8 ? (
                        <p className="text-[10px] text-muted-foreground">
                          Showing first 8 changed files. Refresh or narrow changes to inspect more.
                        </p>
                      ) : null}
                      {selectedFilePath &&
                      !selectedDiffFile &&
                      resolvedFocusedDiffFile &&
                      ((diffMode === "working" && insights?.diffTruncated) ||
                        (diffMode === "staged" && insights?.stagedDiffTruncated)) ? (
                        <p className="text-[10px] text-muted-foreground">
                          Loaded focused diff for {selectedFilePath} because the full {diffMode} diff is truncated.
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[1.25rem] border border-border/75 bg-background/80 p-3">
              <div className="flex items-center gap-2">
                <SplitSquareVertical className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Branch Topology</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Graphical commit DAG across local and remote refs
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ClaudeCliBranchGraph
                  commits={insights.commits}
                  currentBranch={insights.currentBranch}
                />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Updated {new Date(insights.lastUpdated).toLocaleTimeString()}
              </p>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "warning"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-border/70 bg-card/75 text-muted-foreground"
      )}
    >
      {label}: {value}
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[420px] flex-col items-center justify-center rounded-[1.4rem] border px-6 text-center",
        tone === "error"
          ? "border-rose-500/25 bg-rose-500/10 text-rose-700"
          : "border-border/75 bg-background/80 text-muted-foreground"
      )}
    >
      <TriangleAlert className="mb-4 h-10 w-10 text-primary/70" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function WorkingTreeNodes({
  nodes,
  depth,
  selectedFilePath,
  collapsedPaths,
  forceExpanded = false,
  onToggleDirectory,
  onSelectFile,
}: {
  nodes: WorkingTreeNode[];
  depth: number;
  selectedFilePath: string | null;
  collapsedPaths: Record<string, boolean>;
  forceExpanded?: boolean;
  onToggleDirectory: (directoryPath: string) => void;
  onSelectFile: (filePath: string) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        if (node.type === "directory") {
          const isCollapsed = forceExpanded ? false : (collapsedPaths[node.path] ?? false);
          return (
            <div key={node.id}>
              <button
                type="button"
                onClick={() => onToggleDirectory(node.path)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-accent/25"
                aria-expanded={!isCollapsed}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <FolderTree className="h-4 w-4 text-primary/80" />
                  <span className="truncate text-xs font-semibold text-foreground">{node.name}</span>
                </div>
                <Badge variant="outline" className="border-border/70 bg-background/80 text-[10px]">
                  {countLeafFiles(node)}
                </Badge>
              </button>
              {!isCollapsed ? (
                <WorkingTreeNodes
                  nodes={node.children}
                  depth={depth + 1}
                  selectedFilePath={selectedFilePath}
                  collapsedPaths={collapsedPaths}
                  forceExpanded={forceExpanded}
                  onToggleDirectory={onToggleDirectory}
                  onSelectFile={onSelectFile}
                />
              ) : null}
            </div>
          );
        }

        const file = node.file;
        if (!file) {
          return null;
        }

        const isSelected = selectedFilePath === file.path;
        const statusToken = getFileStatusToken(file);

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelectFile(file.path)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
              isSelected
                ? "border-primary/30 bg-primary/10"
                : "border-border/60 bg-background/70 hover:border-primary/20 hover:bg-accent/35"
            )}
            aria-pressed={isSelected}
            style={{ marginLeft: `${depth * 14}px` }}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                  statusToken.className
                )}
                title={statusToken.name}
              >
                {statusToken.label}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{node.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {file.path}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSelected ? <CircleDot className="h-4 w-4 text-primary" /> : null}
              <Badge variant="outline" className="border-border/70 bg-background/80 text-[10px]">
                {file.status}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function countLeafFiles(node: WorkingTreeNode): number {
  if (node.type === "file") {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countLeafFiles(child), 0);
}

function SplitDiffCell({
  side,
  line,
}: {
  side: "left" | "right";
  line: {
    lineNumber: number | null;
    content: string;
    type: "del" | "context" | "add" | null;
  };
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[42px_minmax(0,1fr)] gap-2 px-2 py-1",
        line.type === "add" &&
          (side === "right"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
            : "bg-muted/20 text-muted-foreground"),
        line.type === "del" &&
          (side === "left"
            ? "bg-rose-500/10 text-rose-700 dark:text-rose-200"
            : "bg-muted/20 text-muted-foreground"),
        line.type === "context" && "text-foreground",
        line.type === null && "bg-muted/15 text-muted-foreground"
      )}
    >
      <span className="text-right text-[10px] text-muted-foreground">
        {line.lineNumber ?? ""}
      </span>
      <span className="min-w-0 whitespace-pre-wrap break-words">{line.content}</span>
    </div>
  );
}
