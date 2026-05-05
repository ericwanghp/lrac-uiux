import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 8000;
const MAX_DIFF_LENGTH = 24000;
const MAX_GRAPH_LENGTH = 12000;

export interface GitInsightFileEntry {
  path: string;
  status: string;
  stagedStatus: string;
  unstagedStatus: string;
}

export type GitDiffLineType = "add" | "del" | "context";

export interface GitDiffLine {
  type: GitDiffLineType;
  oldLine: number | null;
  newLine: number | null;
  content: string;
}

export interface GitDiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffFile {
  path: string;
  oldPath: string | null;
  newPath: string | null;
  isNewFile: boolean;
  isDeletedFile: boolean;
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
}

export interface GitCommitNode {
  sha: string;
  shortSha: string;
  parents: string[];
  subject: string;
  refs: string[];
  timestamp: string;
}

export interface GitInsightsData {
  repositoryRoot: string;
  isGitRepository: boolean;
  currentBranch: string | null;
  headShortSha: string | null;
  statusSummary: {
    modified: number;
    staged: number;
    untracked: number;
    conflicted: number;
    ahead: number;
    behind: number;
  };
  files: GitInsightFileEntry[];
  diffStat: string;
  branchGraph: string;
  commits: GitCommitNode[];
  diffFiles: GitDiffFile[];
  stagedDiffFiles: GitDiffFile[];
  focusedWorkingDiffFile?: GitDiffFile | null;
  focusedStagedDiffFile?: GitDiffFile | null;
  diffTruncated: boolean;
  stagedDiffTruncated: boolean;
  lastUpdated: string;
}

async function runGit(projectRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: projectRoot,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 1024 * 1024 * 4,
  });

  return stdout.trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n... output truncated ...`;
}

function parseStatusSummary(branchLine: string) {
  const aheadMatch = branchLine.match(/ahead (\d+)/);
  const behindMatch = branchLine.match(/behind (\d+)/);

  return {
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0,
  };
}

function parseStatusEntries(lines: string[]) {
  const files: GitInsightFileEntry[] = [];
  let modified = 0;
  let staged = 0;
  let untracked = 0;
  let conflicted = 0;

  lines.forEach((line) => {
    if (!line || line.startsWith("##")) {
      return;
    }

    const status = line.slice(0, 2);
    const stagedStatus = status[0] || " ";
    const unstagedStatus = status[1] || " ";
    const rawPath = line.slice(3).trim();
    const path = rawPath.includes("->") ? rawPath.split("->").at(-1)?.trim() || rawPath : rawPath;

    if (status === "??") {
      untracked += 1;
    } else {
      if (stagedStatus !== " ") {
        staged += 1;
      }
      if (unstagedStatus !== " ") {
        modified += 1;
      }
      if (status.includes("U")) {
        conflicted += 1;
      }
    }

    files.push({
      path,
      status,
      stagedStatus,
      unstagedStatus,
    });
  });

  return {
    files,
    counts: {
      modified,
      staged,
      untracked,
      conflicted,
    },
  };
}

function parseDecorations(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function parseCommitLogLines(value: string): GitCommitNode[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha = "", parentsRaw = "", subjectRaw = "", decorateRaw = "", timestampRaw = ""] =
        line.split("\u001f");
      const parents = parentsRaw
        .split(" ")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const unixSeconds = Number(timestampRaw);
      const timestamp = Number.isFinite(unixSeconds)
        ? new Date(unixSeconds * 1000).toISOString()
        : new Date().toISOString();

      return {
        sha,
        shortSha: sha.slice(0, 7),
        parents,
        subject: subjectRaw || "",
        refs: parseDecorations(decorateRaw),
        timestamp,
      } satisfies GitCommitNode;
    })
    .filter((commit) => commit.sha.length > 0);
}

function parseUnifiedDiff(value: string): GitDiffFile[] {
  const files: GitDiffFile[] = [];
  const lines = value.split("\n");
  let currentFile: GitDiffFile | null = null;
  let currentHunk: GitDiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  const finalizeHunk = () => {
    if (currentFile && currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    currentHunk = null;
  };

  const finalizeFile = () => {
    if (currentFile) {
      finalizeHunk();
      files.push(currentFile);
    }
    currentFile = null;
  };

  const parseHunkHeader = (header: string) => {
    // @@ -a,b +c,d @@ optional section header
    const match = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    const oldStart = match ? Number(match[1]) : 0;
    const oldLines = match && match[2] ? Number(match[2]) : 1;
    const newStart = match ? Number(match[3]) : 0;
    const newLines = match && match[4] ? Number(match[4]) : 1;
    return { oldStart, oldLines, newStart, newLines };
  };

  const bumpCounts = (file: GitDiffFile, type: GitDiffLineType) => {
    if (type === "add") file.additions += 1;
    if (type === "del") file.deletions += 1;
  };

  for (const rawLine of lines) {
    const line = rawLine ?? "";

    if (line.startsWith("diff --git ")) {
      finalizeFile();
      const parts = line.split(" ");
      const oldPath = parts[2]?.replace(/^a\//, "") || null;
      const newPath = parts[3]?.replace(/^b\//, "") || null;
      const path = newPath || oldPath || "unknown";
      currentFile = {
        path,
        oldPath,
        newPath,
        isNewFile: false,
        isDeletedFile: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith("new file mode")) {
      currentFile.isNewFile = true;
      continue;
    }
    if (line.startsWith("deleted file mode")) {
      currentFile.isDeletedFile = true;
      continue;
    }
    if (line.startsWith("--- ")) {
      const path = line.replace(/^---\s+/, "").trim();
      if (path === "/dev/null") {
        currentFile.oldPath = null;
      } else {
        currentFile.oldPath = path.replace(/^a\//, "");
      }
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = line.replace(/^\+\+\+\s+/, "").trim();
      if (path === "/dev/null") {
        currentFile.newPath = null;
      } else {
        currentFile.newPath = path.replace(/^b\//, "");
        currentFile.path = currentFile.newPath;
      }
      continue;
    }

    if (line.startsWith("@@")) {
      finalizeHunk();
      const parsed = parseHunkHeader(line);
      oldLine = parsed.oldStart;
      newLine = parsed.newStart;
      currentHunk = {
        header: line,
        oldStart: parsed.oldStart,
        oldLines: parsed.oldLines,
        newStart: parsed.newStart,
        newLines: parsed.newLines,
        lines: [],
      };
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const entry: GitDiffLine = { type: "add", oldLine: null, newLine, content: line.slice(1) };
      currentHunk.lines.push(entry);
      bumpCounts(currentFile, "add");
      newLine += 1;
      continue;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      const entry: GitDiffLine = { type: "del", oldLine, newLine: null, content: line.slice(1) };
      currentHunk.lines.push(entry);
      bumpCounts(currentFile, "del");
      oldLine += 1;
      continue;
    }
    if (line.startsWith(" ")) {
      const entry: GitDiffLine = { type: "context", oldLine, newLine, content: line.slice(1) };
      currentHunk.lines.push(entry);
      oldLine += 1;
      newLine += 1;
      continue;
    }
  }

  finalizeFile();
  return files;
}

async function readFocusedDiffFile(
  projectRoot: string,
  path: string,
  mode: "working" | "staged"
): Promise<GitDiffFile | null> {
  if (!path.trim()) {
    return null;
  }

  const args =
    mode === "staged"
      ? ["diff", "--cached", "--no-color", "--unified=2", "--", path]
      : ["diff", "--no-color", "--unified=2", "--", path];

  const diffText = await runGit(projectRoot, args).catch(() => "");
  if (!diffText.trim()) {
    return null;
  }

  return parseUnifiedDiff(diffText)[0] ?? null;
}

export async function readGitInsights(
  projectRoot: string,
  options?: { focusPath?: string | null }
): Promise<GitInsightsData> {
  const now = new Date().toISOString();
  const focusPath = options?.focusPath?.trim() || null;

  try {
    const repositoryRoot = await runGit(projectRoot, ["rev-parse", "--show-toplevel"]);
    const [
      currentBranch,
      headShortSha,
      statusOutput,
      diffStat,
      diffText,
      stagedDiffText,
      branchGraph,
      commitLog,
      focusedWorkingDiffFile,
      focusedStagedDiffFile,
    ] = await Promise.all([
      runGit(projectRoot, ["branch", "--show-current"]).catch(() => ""),
      runGit(projectRoot, ["rev-parse", "--short", "HEAD"]).catch(() => ""),
      runGit(projectRoot, ["status", "--porcelain=v1", "--branch"]),
      runGit(projectRoot, ["diff", "--stat", "--no-color"]).catch(() => ""),
      runGit(projectRoot, ["diff", "--no-color", "--unified=2", "--"]).catch(() => ""),
      runGit(projectRoot, ["diff", "--cached", "--no-color", "--unified=2", "--"]).catch(() => ""),
      runGit(projectRoot, ["log", "--graph", "--decorate", "--oneline", "--all", "-n", "28", "--color=never"]).catch(
        () => ""
      ),
      runGit(projectRoot, [
        "log",
        "--all",
        "--date-order",
        "--decorate=short",
        "-n",
        "48",
        "--pretty=format:%H%x1f%P%x1f%s%x1f%D%x1f%ct",
      ]).catch(() => ""),
      focusPath ? readFocusedDiffFile(projectRoot, focusPath, "working") : Promise.resolve(null),
      focusPath ? readFocusedDiffFile(projectRoot, focusPath, "staged") : Promise.resolve(null),
    ]);

    const statusLines = statusOutput.split("\n").filter(Boolean);
    const branchLine = statusLines[0] || "";
    const branchSummary = parseStatusSummary(branchLine);
    const statusEntries = parseStatusEntries(statusLines.slice(1));

    return {
      repositoryRoot,
      isGitRepository: true,
      currentBranch: currentBranch || null,
      headShortSha: headShortSha || null,
      statusSummary: {
        ...statusEntries.counts,
        ahead: branchSummary.ahead,
        behind: branchSummary.behind,
      },
      files: statusEntries.files,
      diffStat: diffStat || "Working tree clean.",
      branchGraph: truncateText(branchGraph || "No branch history available.", MAX_GRAPH_LENGTH),
      commits: parseCommitLogLines(commitLog),
      diffFiles: parseUnifiedDiff(truncateText(diffText || "", MAX_DIFF_LENGTH)),
      stagedDiffFiles: parseUnifiedDiff(truncateText(stagedDiffText || "", MAX_DIFF_LENGTH)),
      focusedWorkingDiffFile,
      focusedStagedDiffFile,
      diffTruncated: (diffText || "").length > MAX_DIFF_LENGTH,
      stagedDiffTruncated: (stagedDiffText || "").length > MAX_DIFF_LENGTH,
      lastUpdated: now,
    };
  } catch {
    return {
      repositoryRoot: projectRoot,
      isGitRepository: false,
      currentBranch: null,
      headShortSha: null,
      statusSummary: {
        modified: 0,
        staged: 0,
        untracked: 0,
        conflicted: 0,
        ahead: 0,
        behind: 0,
      },
      files: [],
      diffStat: "Git repository not detected.",
      branchGraph: "No branch topology available.",
      commits: [],
      diffFiles: [],
      stagedDiffFiles: [],
      focusedWorkingDiffFile: null,
      focusedStagedDiffFile: null,
      diffTruncated: false,
      stagedDiffTruncated: false,
      lastUpdated: now,
    };
  }
}
