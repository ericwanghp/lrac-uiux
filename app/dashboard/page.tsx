import fs from "fs/promises";
import path from "path";
import { ClipboardList, BarChart3, Settings, BookOpen, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ProjectCard,
  StatCard,
  StatusBadge,
  ProgressBar,
  ProjectSwitcherForm,
} from "@/components/shared";
import { PhaseIndicator } from "@/components/indicators/phase-indicator";
import { PROJECT_ROOT, getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { getPhaseFromParallelGroup, getPhaseFromTaskId } from "@/lib/constants/task-id";
import type { TasksJson } from "@/lib/types";
import type { QASessionJson } from "@/lib/types/qa-session";

export const dynamic = "force-dynamic";

const DOC_DIRS = ["brd", "prd", "architecture", "design", "test", "research", "plans", "file"];

type DocStat = {
  dir: string;
  markdownCount: number;
};

type Activity = {
  action: string;
  item: string;
  time: string;
};

type BranchSnapshot = {
  key: "initial" | "imac";
  label: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
};

type MilestoneTrack = {
  key: string;
  label: string;
  total: number;
  completed: number;
  currentPhase: number;
  completedPhases: number[];
  minVisiblePhase: number;
};

type ProjectOption = {
  root: string;
  name: string;
};

function inferPhaseFromFeature(
  featureId: string,
  parallelGroup: string | null | undefined
): number {
  const fromGroup = getPhaseFromParallelGroup(parallelGroup);
  if (fromGroup) return fromGroup;
  const fromTaskId = getPhaseFromTaskId(featureId);
  if (fromTaskId) return fromTaskId;
  return 5;
}

function getCurrentPhase(
  docStats: DocStat[],
  totalFeatures: number,
  inProgressCount: number,
  pendingCount: number,
  blockedCount: number
): number {
  const map = new Map(docStats.map((d) => [d.dir, d.markdownCount]));
  if (totalFeatures > 0 && pendingCount === 0 && inProgressCount === 0 && blockedCount === 0) {
    return 8;
  }
  if (totalFeatures > 0) return 5;
  if ((map.get("architecture") || 0) > 0) return 4;
  if ((map.get("design") || 0) > 0) return 3;
  if ((map.get("prd") || 0) > 0) return 2.5;
  if ((map.get("brd") || 0) > 0) return 2;
  return 1;
}

function getRelativeTime(isoTime: string): string {
  const diff = Date.now() - new Date(isoTime).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function getImacProgramKey(featureId: string): string {
  const matched = featureId.match(/^(imac-[a-z0-9-]+)-p\d+[a-z]+-\d+$/i);
  if (matched?.[1]) return matched[1];
  return "imac";
}

async function readJsonSafely<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function readTextSafely(filePath: string, fallback: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return fallback;
  }
}

async function discoverProjectOptions(currentProjectRoot: string): Promise<ProjectOption[]> {
  const workspaceRoot = path.dirname(PROJECT_ROOT);
  const options: ProjectOption[] = [];
  try {
    const dirs = await fs.readdir(workspaceRoot, { withFileTypes: true });
    const directoryNames = dirs.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const discovered = await Promise.all(
      directoryNames.map(async (dirName) => {
        const candidateRoot = path.join(workspaceRoot, dirName);
        const tasksPath = path.join(candidateRoot, ".auto-coding", "tasks.json");
        try {
          await fs.access(tasksPath);
          const tasksData = await readJsonSafely<{ project?: string } | null>(tasksPath, null);
          return {
            root: candidateRoot,
            name: tasksData?.project || dirName,
          };
        } catch {
          return null;
        }
      })
    );
    options.push(...discovered.filter((option): option is ProjectOption => Boolean(option)));
  } catch {
    options.push({
      root: currentProjectRoot,
      name: path.basename(currentProjectRoot),
    });
  }
  const hasCurrent = options.some((option) => option.root === currentProjectRoot);
  if (!hasCurrent) {
    options.unshift({
      root: currentProjectRoot,
      name: path.basename(currentProjectRoot),
    });
  }
  return options.sort((a, b) => {
    if (a.root === currentProjectRoot) return -1;
    if (b.root === currentProjectRoot) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function loadDashboardData(projectParam: string | undefined) {
  const projectRoot = getCurrentProjectRoot(projectParam);
  const docsRoot = path.join(projectRoot, "docs");
  const autoCodingPath = path.join(projectRoot, ".auto-coding");
  const tasksPath = path.join(autoCodingPath, "tasks.json");
  const progressPath = path.join(autoCodingPath, "progress.txt");
  const qaSessionsPath = path.join(autoCodingPath, "qa-sessions", "sessions.json");
  const [tasksResult, progressResult, qaResult, docStats, projectOptionsResult] =
    await Promise.allSettled([
      readJsonSafely<TasksJson | null>(tasksPath, null),
      readTextSafely(progressPath, ""),
      readJsonSafely<QASessionJson>(qaSessionsPath, { version: "1.0", sessions: [] }),
      Promise.all(
        DOC_DIRS.map(async (dir) => {
          const fullPath = path.join(docsRoot, dir);
          try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const markdownCount = entries.filter(
              (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md")
            ).length;
            return { dir, markdownCount };
          } catch {
            return { dir, markdownCount: 0 };
          }
        })
      ),
      discoverProjectOptions(projectRoot),
    ]);

  const tasksData = tasksResult.status === "fulfilled" ? tasksResult.value : null;
  const progressText = progressResult.status === "fulfilled" ? progressResult.value : "";
  const qaSessions = qaResult.status === "fulfilled" ? qaResult.value.sessions : [];
  const docs = docStats.status === "fulfilled" ? docStats.value : [];
  const availableProjects =
    projectOptionsResult.status === "fulfilled"
      ? projectOptionsResult.value
      : [
          {
            root: projectRoot,
            name: tasksData?.project || path.basename(projectRoot),
          },
        ];

  const features = tasksData?.features ?? [];
  const totalFeatures = features.length;
  const completedFeatures = features.filter(
    (f) => f.status.status === "completed" && f.status.passes
  ).length;
  const inProgressFeatures = features.filter((f) => f.status.status === "in_progress").length;
  const pendingFeatures = features.filter((f) => f.status.status === "pending").length;
  const blockedFeatures = features.filter((f) => f.status.status === "blocked").length;
  const pendingFeatureIds = features.filter((f) => f.status.status === "pending").map((f) => f.id);
  const overallProgress =
    totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;
  const imacFeatures = features.filter((feature) => feature.id.startsWith("imac-"));
  const initialFeatures = features.filter((feature) => !feature.id.startsWith("imac-"));
  const buildBranchSnapshot = (
    key: "initial" | "imac",
    label: string,
    branchFeatures: typeof features
  ): BranchSnapshot => ({
    key,
    label,
    total: branchFeatures.length,
    completed: branchFeatures.filter((feature) => feature.status.status === "completed").length,
    inProgress: branchFeatures.filter((feature) => feature.status.status === "in_progress").length,
    pending: branchFeatures.filter((feature) => feature.status.status === "pending").length,
    blocked: branchFeatures.filter((feature) => feature.status.status === "blocked").length,
  });
  const branches: BranchSnapshot[] = [
    buildBranchSnapshot("initial", "Initial Track", initialFeatures),
    buildBranchSnapshot("imac", "IMAC Branch", imacFeatures),
  ].filter((branch) => branch.total > 0);
  const hasImacBranch = imacFeatures.length > 0;
  const completedPhases =
    pendingFeatures === 0 && inProgressFeatures === 0 && blockedFeatures === 0
      ? [1, 2, 2.5, 3, 4, 5, 6, 7, 8]
      : Array.from(
          new Set(
            features
              .filter((f) => f.status.status === "completed")
              .map((f) => inferPhaseFromFeature(f.id, f.taskBreakdown?.parallelGroup))
              .filter((phase) => phase >= 1 && phase <= 8)
          )
        ).sort((a, b) => a - b);
  const getTrackCurrentPhase = (trackFeatures: typeof features): number => {
    if (trackFeatures.length === 0) return 1;
    const inProgress = trackFeatures.find((feature) => feature.status.status === "in_progress");
    if (inProgress) {
      return inferPhaseFromFeature(inProgress.id, inProgress.taskBreakdown?.parallelGroup);
    }
    const pending = trackFeatures.find((feature) => feature.status.status === "pending");
    if (pending) {
      return inferPhaseFromFeature(pending.id, pending.taskBreakdown?.parallelGroup);
    }
    return 8;
  };
  const buildTrack = (
    key: string,
    label: string,
    trackFeatures: typeof features
  ): MilestoneTrack => {
    const allTrackPhases = trackFeatures
      .map((feature) => inferPhaseFromFeature(feature.id, feature.taskBreakdown?.parallelGroup))
      .filter((phase) => phase >= 1 && phase <= 8);
    const completedTrackPhases = Array.from(
      new Set(
        trackFeatures
          .filter((feature) => feature.status.status === "completed")
          .map((feature) => inferPhaseFromFeature(feature.id, feature.taskBreakdown?.parallelGroup))
      )
    ).sort((a, b) => a - b);
    return {
      key,
      label,
      total: trackFeatures.length,
      completed: trackFeatures.filter((feature) => feature.status.status === "completed").length,
      currentPhase: getTrackCurrentPhase(trackFeatures),
      completedPhases: completedTrackPhases,
      minVisiblePhase: allTrackPhases.length > 0 ? Math.min(...allTrackPhases) : 1,
    };
  };
  const initialTrack = buildTrack("initial", "Initial Track", initialFeatures);
  const imacTracksByProgram = Array.from(
    new Set(imacFeatures.map((feature) => getImacProgramKey(feature.id)))
  ).map((programKey) => {
    const programFeatures = imacFeatures.filter(
      (feature) => getImacProgramKey(feature.id) === programKey
    );
    const label =
      programKey === "imac"
        ? "IMAC"
        : `IMAC ${programKey.replace(/^imac-/, "").replace(/-/g, " ")}`;
    return buildTrack(programKey, label, programFeatures);
  });
  const milestoneTracks = [initialTrack, ...imacTracksByProgram].filter((track) => track.total > 0);
  const currentPhase = getCurrentPhase(
    docs,
    totalFeatures,
    inProgressFeatures,
    pendingFeatures,
    blockedFeatures
  );
  const progressSessions = (progressText.match(/^# Session:/gm) || []).length;
  const totalDocs = docs.reduce((sum, d) => sum + d.markdownCount, 0);

  const activity: Activity[] = features
    .flatMap((feature) =>
      feature.executionHistory.map((history) => ({
        action: history.action,
        item: `${feature.id}: ${feature.title}`,
        time: getRelativeTime(history.timestamp),
        timestamp: history.timestamp,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)
    .map(({ action, item, time }) => ({ action, item, time }));

  return {
    projectRoot,
    docsRoot,
    autoCodingPath,
    docs,
    totalDocs,
    progressSessions,
    qaSessionCount: qaSessions.length,
    projectName: tasksData?.project || path.basename(projectRoot),
    totalFeatures,
    completedFeatures,
    inProgressFeatures,
    pendingFeatures,
    blockedFeatures,
    pendingFeatureIds,
    overallProgress,
    currentPhase,
    completedPhases,
    activity,
    branches,
    hasImacBranch,
    milestoneTracks,
    availableProjects,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { project?: string };
}) {
  const data = await loadDashboardData(searchParams?.project);
  const phaseLabel = `Phase ${data.currentPhase}`;
  const phaseDescription =
    data.currentPhase === 8
      ? "All features completed"
      : `${data.pendingFeatures} pending · ${data.inProgressFeatures} in progress · ${data.blockedFeatures} blocked`;
  const stats = [
    {
      title: "Tasks Completed",
      value: `${data.completedFeatures}/${data.totalFeatures}`,
      description: "From .auto-coding/tasks.json",
      variant: "success" as const,
    },
    {
      title: "Current Phase",
      value: phaseLabel,
      description: phaseDescription,
      variant: "primary" as const,
    },
    {
      title: "Progress",
      value: `${data.overallProgress}%`,
      description: "Overall completion",
      variant: "default" as const,
    },
    {
      title: "Branch Topology",
      value: data.hasImacBranch ? "Split" : "Single",
      description: data.hasImacBranch
        ? `Initial ${data.branches.find((branch) => branch.key === "initial")?.total || 0} · IMAC ${data.branches.find((branch) => branch.key === "imac")?.total || 0}`
        : "Only initial task track",
      variant: data.hasImacBranch ? ("primary" as const) : ("default" as const),
    },
  ];

  const projects = [
    {
      title: data.projectName,
      description: data.projectRoot,
      status:
        data.pendingFeatures === 0 && data.inProgressFeatures === 0 && data.blockedFeatures === 0
          ? ("completed" as const)
          : data.inProgressFeatures > 0
            ? ("active" as const)
            : ("pending" as const),
      progress: data.overallProgress,
      phase: phaseLabel,
      tasksCompleted: data.completedFeatures,
      tasksTotal: data.totalFeatures,
    },
  ];
  const getTrackBackgroundClass = (track: MilestoneTrack) => {
    if (track.key === "initial") return "bg-background/40";
    if (track.currentPhase <= 2) return "bg-amber-500/10 border-amber-500/40";
    if (track.currentPhase <= 4) return "bg-cyan-500/10 border-cyan-500/40";
    if (track.currentPhase === 5) return "bg-indigo-500/10 border-indigo-500/40";
    if (track.currentPhase === 6) return "bg-emerald-500/10 border-emerald-500/40";
    return "bg-violet-500/10 border-violet-500/40";
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Project path resolved and persistence loaded from docs/.auto-coding
          </p>
        </div>
        <Button variant="outline" disabled>
          Open Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Switcher</CardTitle>
          <CardDescription>
            Current: {data.projectName} · {data.projectRoot}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSwitcherForm
            availableProjects={data.availableProjects}
            currentProjectRoot={data.projectRoot}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Development Progress</CardTitle>
          <CardDescription>Current phase is inferred from persisted project state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <details open className="rounded-lg border p-3 bg-muted/20">
            <summary className="cursor-pointer list-none flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Milestone Tracks ({data.milestoneTracks.length})
                </span>
              </div>
              <span className="text-xs text-muted-foreground">collapse / expand</span>
            </summary>
            <div className="mt-3 space-y-4">
              {data.milestoneTracks.map((track) => (
                <details
                  key={track.key}
                  open={track.key === "initial"}
                  className={`rounded border px-3 py-2 ${getTrackBackgroundClass(track)}`}
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{track.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Phase {Math.min(track.currentPhase, 7)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {track.completed}/{track.total} completed
                    </span>
                  </summary>
                  <div className="mt-3">
                    <PhaseIndicator
                      currentPhase={track.currentPhase}
                      completedPhases={track.completedPhases}
                      includePMPhase={false}
                      minVisiblePhase={track.minVisiblePhase}
                    />
                  </div>
                </details>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Context</CardTitle>
                  <CardDescription>
                    Frontend is now mounted from backend persistence
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {projects.map((project, index) => (
                <ProjectCard key={index} {...project} />
              ))}
              <div className="rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Task Branch Topology</p>
                  </div>
                  <StatusBadge
                    status={data.hasImacBranch ? "active" : "pending"}
                    size="sm"
                    label={data.hasImacBranch ? "Branch Split" : "Single Track"}
                  />
                </div>
                <div className="space-y-2">
                  {data.branches.map((branch) => (
                    <div
                      key={branch.key}
                      className="rounded border px-2 py-2 bg-background/40 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-medium">{branch.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {branch.completed}/{branch.total} completed · {branch.inProgress} in
                          progress
                        </p>
                      </div>
                      <div className="w-28">
                        <ProgressBar
                          value={
                            branch.total > 0
                              ? Math.round((branch.completed / branch.total) * 100)
                              : 0
                          }
                          variant={branch.key === "imac" ? "gradient" : "default"}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Persistence Snapshot</CardTitle>
              <CardDescription>docs and .auto-coding analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Project Root</span>
                  <StatusBadge status="active" size="sm" label="Resolved" />
                </div>
                <p className="text-xs text-muted-foreground break-all">{data.projectRoot}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">docs Path</span>
                  <StatusBadge status="completed" size="sm" />
                </div>
                <p className="text-xs text-muted-foreground break-all">{data.docsRoot}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">.auto-coding Path</span>
                  <StatusBadge status="completed" size="sm" />
                </div>
                <p className="text-xs text-muted-foreground break-all">{data.autoCodingPath}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Docs Coverage</span>
                  <span className="text-xs text-muted-foreground">
                    {data.totalDocs} markdown files
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, data.totalDocs > 0 ? data.totalDocs * 10 : 0)}
                  variant="gradient"
                  size="md"
                />
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {data.docs.map((doc) => (
                    <div
                      key={doc.dir}
                      className="flex items-center justify-between rounded border px-2 py-1"
                    >
                      <span>{doc.dir}</span>
                      <span>{doc.markdownCount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Runtime Persistence</span>
                  <span className="text-xs text-muted-foreground">
                    {data.qaSessionCount} QA sessions · {data.progressSessions} progress sessions
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(
                    100,
                    data.progressSessions * 5 +
                      data.qaSessionCount * 10 +
                      data.completedFeatures * 2
                  )}
                  variant="success"
                  size="md"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pending Features</span>
                  <span className="text-xs text-muted-foreground">
                    {data.pendingFeatures} remaining
                  </span>
                </div>
                {data.pendingFeatureIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending features</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {data.pendingFeatureIds.join(", ")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and completions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No execution history found in tasks.json
                  </p>
                ) : (
                  data.activity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action}</span>{" "}
                          <span className="text-muted-foreground">{activity.item}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="mr-2 h-4 w-4" />
                View Tasks
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                Documentation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
