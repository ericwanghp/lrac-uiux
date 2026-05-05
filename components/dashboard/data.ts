import fs from "fs/promises";
import path from "path";
import { getPhaseFromParallelGroup, getPhaseFromTaskId } from "@/lib/constants/task-id";
import { discoverWorkspaceProjects } from "@/lib/utils/project-discovery";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { readActivityFeedsFile } from "@/lib/utils/activity-feed-operations";
import { syncApprovalsWithProject } from "@/lib/utils/approval-operations";
import { readPhaseGateSummaries, type PhaseGateSummary } from "@/lib/utils/phase-gate-summary";
import { deriveBlockerQueue, deriveWaitingInbox, type WaitingInboxItem } from "@/lib/utils/control-plane";
import type { TasksJson } from "@/lib/types";
import type { QASessionJson } from "@/lib/types/qa-session";

export const DOC_DIRS = ["brd", "prd", "architecture", "design", "test", "research", "plans", "file"];

export type DocStat = { dir: string; markdownCount: number };

export type Activity = { action: string; item: string; time: string };

export type BranchSnapshot = {
  key: "initial" | "imac";
  label: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
};

export type MilestoneTrack = {
  key: string;
  label: string;
  total: number;
  completed: number;
  currentPhase: number;
  completedPhases: number[];
  minVisiblePhase: number;
};

export type DashboardData = {
  projectRoot: string;
  workspaceRoot: string;
  setupScriptPath: string;
  docsRoot: string;
  autoCodingPath: string;
  docs: DocStat[];
  totalDocs: number;
  progressSessions: number;
  qaSessionCount: number;
  projectName: string;
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  pendingFeatures: number;
  blockedFeatures: number;
  pendingFeatureIds: string[];
  overallProgress: number;
  currentPhase: number;
  completedPhases: number[];
  activity: Activity[];
  waitingInbox: WaitingInboxItem[];
  blockerQueue: ReturnType<typeof deriveBlockerQueue>;
  phaseGateSummaries: PhaseGateSummary[];
  branches: BranchSnapshot[];
  hasImacBranch: boolean;
  milestoneTracks: MilestoneTrack[];
  availableProjects: { root: string; name: string }[];
};

export function getRelativeTime(isoTime: string): string {
  const diff = Date.now() - new Date(isoTime).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getActionQueueHref(item: WaitingInboxItem, projectRoot: string): string {
  const { buildProjectScopedPath } = require("@/lib/utils/project-selection");
  if (item.kind === "approval") return buildProjectScopedPath("/approval", projectRoot);
  if (item.kind === "question") {
    const base = item.featureId ? `/tasks-log?feature=${encodeURIComponent(item.featureId)}` : "/tasks-log";
    return buildProjectScopedPath(base, projectRoot);
  }
  const base = item.featureId ? `/pm?feature=${encodeURIComponent(item.featureId)}` : "/pm";
  return buildProjectScopedPath(base, projectRoot);
}

export function getActionTypeLabel(kind: WaitingInboxItem["kind"]): string {
  if (kind === "approval") return "approval";
  if (kind === "question") return "question";
  return "human";
}

export function inferPhaseFromFeature(featureId: string, parallelGroup: string | null | undefined): number {
  const fromGroup = getPhaseFromParallelGroup(parallelGroup);
  if (fromGroup) return fromGroup;
  const fromTaskId = getPhaseFromTaskId(featureId);
  if (fromTaskId) return fromTaskId;
  return 5;
}

export function getImacProgramKey(featureId: string): string {
  const matched = featureId.match(/^(imac-[a-z0-9-]+)-p\d+[a-z]+-\d+$/i);
  if (matched?.[1]) return matched[1];
  return "imac";
}

async function readJsonSafely<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch { return fallback; }
}

async function readTextSafely(filePath: string, fallback: string): Promise<string> {
  try { return await fs.readFile(filePath, "utf-8"); }
  catch { return fallback; }
}

export async function loadDashboardData(projectParam: string | undefined): Promise<DashboardData> {
  const projectRoot = await getCurrentProjectRoot(projectParam);
  const docsRoot = path.join(projectRoot, "docs");
  const autoCodingPath = path.join(projectRoot, ".auto-coding");
  const tasksPath = path.join(autoCodingPath, "tasks.json");
  const progressPath = path.join(autoCodingPath, "progress.txt");
  const qaSessionsPath = path.join(autoCodingPath, "qa-sessions", "sessions.json");

  const [tasksResult, progressResult, qaResult, docStats, projectOptionsResult] = await Promise.allSettled([
    readJsonSafely<TasksJson | null>(tasksPath, null),
    readTextSafely(progressPath, ""),
    readJsonSafely<QASessionJson>(qaSessionsPath, { version: "1.0", sessions: [] }),
    Promise.all(DOC_DIRS.map(async (dir) => {
      const fullPath = path.join(docsRoot, dir);
      try {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        return { dir, markdownCount: entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md")).length };
      } catch { return { dir, markdownCount: 0 }; }
    })),
    discoverWorkspaceProjects(projectRoot),
  ]);

  const tasksData = tasksResult.status === "fulfilled" ? tasksResult.value : null;
  const progressText = progressResult.status === "fulfilled" ? progressResult.value : "";
  const qaSessions = qaResult.status === "fulfilled" ? qaResult.value.sessions : [];
  const docs = docStats.status === "fulfilled" ? docStats.value : [];
  const availableProjects = projectOptionsResult.status === "fulfilled"
    ? projectOptionsResult.value
    : [{ root: projectRoot, name: tasksData?.project || path.basename(projectRoot) }];

  const [approvalsResult, activityFeedsResult] = await Promise.allSettled([
    syncApprovalsWithProject(projectRoot),
    readActivityFeedsFile(projectRoot),
  ]);
  const phaseGateSummaries = await readPhaseGateSummaries(projectRoot);
  const features = tasksData?.features ?? [];
  const approvals = approvalsResult.status === "fulfilled" ? approvalsResult.value : [];
  const activityFeeds = activityFeedsResult.status === "fulfilled" ? activityFeedsResult.value.sessions : [];
  const totalFeatures = features.length;
  const completedFeatures = features.filter((f) => f.status.status === "completed" && f.status.passes).length;
  const inProgressFeatures = features.filter((f) => f.status.status === "in_progress").length;
  const pendingFeatures = features.filter((f) => f.status.status === "pending").length;
  const blockedFeatures = features.filter((f) => f.status.status === "blocked").length;
  const pendingFeatureIds = features.filter((f) => f.status.status === "pending").map((f) => f.id);
  const overallProgress = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;
  const imacFeatures = features.filter((f) => f.id.startsWith("imac-"));
  const initialFeatures = features.filter((f) => !f.id.startsWith("imac-"));

  const buildBranchSnapshot = (key: "initial" | "imac", label: string, bf: typeof features): BranchSnapshot => ({
    key, label, total: bf.length,
    completed: bf.filter((f) => f.status.status === "completed").length,
    inProgress: bf.filter((f) => f.status.status === "in_progress").length,
    pending: bf.filter((f) => f.status.status === "pending").length,
    blocked: bf.filter((f) => f.status.status === "blocked").length,
  });
  const branches: BranchSnapshot[] = [
    buildBranchSnapshot("initial", "Initial Track", initialFeatures),
    buildBranchSnapshot("imac", "IMAC Branch", imacFeatures),
  ].filter((b) => b.total > 0);
  const hasImacBranch = imacFeatures.length > 0;
  const completedPhases = pendingFeatures === 0 && inProgressFeatures === 0 && blockedFeatures === 0
    ? [1, 2, 2.5, 3, 4, 5, 6, 7, 8]
    : Array.from(new Set(features.filter((f) => f.status.status === "completed").map((f) => inferPhaseFromFeature(f.id, f.taskBreakdown?.parallelGroup)).filter((p) => p >= 1 && p <= 8))).sort((a, b) => a - b);

  const getTrackCurrentPhase = (tf: typeof features): number => {
    if (tf.length === 0) return 1;
    const ip = tf.find((f) => f.status.status === "in_progress");
    if (ip) return inferPhaseFromFeature(ip.id, ip.taskBreakdown?.parallelGroup);
    const p = tf.find((f) => f.status.status === "pending");
    if (p) return inferPhaseFromFeature(p.id, p.taskBreakdown?.parallelGroup);
    return 8;
  };
  const buildTrack = (key: string, label: string, tf: typeof features): MilestoneTrack => {
    const allPhases = tf.map((f) => inferPhaseFromFeature(f.id, f.taskBreakdown?.parallelGroup)).filter((p) => p >= 1 && p <= 8);
    const completedTP = Array.from(new Set(tf.filter((f) => f.status.status === "completed").map((f) => inferPhaseFromFeature(f.id, f.taskBreakdown?.parallelGroup)))).sort((a, b) => a - b);
    return { key, label, total: tf.length, completed: tf.filter((f) => f.status.status === "completed").length, currentPhase: getTrackCurrentPhase(tf), completedPhases: completedTP, minVisiblePhase: allPhases.length > 0 ? Math.min(...allPhases) : 1 };
  };
  const initialTrack = buildTrack("initial", "Initial Track", initialFeatures);
  const imacTracksByProgram = Array.from(new Set(imacFeatures.map((f) => getImacProgramKey(f.id)))).map((pk) => {
    const pf = imacFeatures.filter((f) => getImacProgramKey(f.id) === pk);
    return buildTrack(pk, pk === "imac" ? "IMAC" : `IMAC ${pk.replace(/^imac-/, "").replace(/-/g, " ")}`, pf);
  });
  const milestoneTracks = [initialTrack, ...imacTracksByProgram].filter((t) => t.total > 0);
  const currentPhase = (() => {
    const map = new Map(docs.map((d) => [d.dir, d.markdownCount]));
    if (totalFeatures > 0 && pendingFeatures === 0 && inProgressFeatures === 0 && blockedFeatures === 0) return 8;
    if (totalFeatures > 0) return 5;
    if ((map.get("architecture") || 0) > 0) return 4;
    if ((map.get("design") || 0) > 0) return 3;
    if ((map.get("prd") || 0) > 0) return 2.5;
    if ((map.get("brd") || 0) > 0) return 2;
    return 1;
  })();

  const progressSessions = (progressText.match(/^# Session:/gm) || []).length;
  const totalDocs = docs.reduce((s, d) => s + d.markdownCount, 0);
  const activity: Activity[] = features.flatMap((f) => f.executionHistory.map((h) => ({ action: h.action, item: `${f.id}: ${f.title}`, time: getRelativeTime(h.timestamp), timestamp: h.timestamp }))).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6).map(({ action, item, time }) => ({ action, item, time }));
  const waitingInbox = deriveWaitingInbox({ features, approvals, sessions: activityFeeds }).slice(0, 6);
  const blockerQueue = deriveBlockerQueue(features).slice(0, 6);

  return {
    projectRoot, workspaceRoot: path.dirname(projectRoot), setupScriptPath: path.join(process.cwd(), "setup.sh"),
    docsRoot, autoCodingPath, docs, totalDocs, progressSessions, qaSessionCount: qaSessions.length,
    projectName: tasksData?.project || path.basename(projectRoot),
    totalFeatures, completedFeatures, inProgressFeatures, pendingFeatures, blockedFeatures,
    pendingFeatureIds, overallProgress, currentPhase, completedPhases,
    activity, waitingInbox, blockerQueue, phaseGateSummaries, branches, hasImacBranch,
    milestoneTracks, availableProjects,
  };
}
