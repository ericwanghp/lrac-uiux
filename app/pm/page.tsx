"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Cell } from "recharts";
import type { ApprovalRecord } from "@/lib/types/approval";
import type { Feature } from "@/lib/types";
import type { ActivityFeed } from "@/lib/types/activity-feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProgressBar, StatCard } from "@/components/shared";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Search,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deriveBlockerQueue,
  deriveWaitingInbox,
  type WaitingInboxItem,
} from "@/lib/utils/control-plane";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import { useWebSocket } from "@/lib/websocket/useWebSocket";
import { getPhaseFromParallelGroup, getPhaseFromTaskId } from "@/lib/constants/task-id";

// Dynamic import for recharts to reduce initial bundle size
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });

// Enable SSG for static pages
export const dynamicParams = true;

// Types
interface Task {
  id: string;
  title: string;
  assignee: {
    name: string;
    initials: string;
    role?: string;
    avatar?: string;
  };
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
  phase: number;
  optional?: boolean;
  milestoneTrackKey: string;
  milestoneTrackLabel: string;
  timelineStartAt: string;
  timelineEndAt: string;
  timelineStartMs: number;
  timelineEndMs: number;
}

interface TeamMember {
  name: string;
  role: string;
  initials: string;
  tasksCompleted: number;
  tasksInProgress: number;
  avatar?: string;
}

interface PhaseProgress {
  name: string;
  completed: number;
  total: number;
}

const ownerRoleMeta: Record<string, { name: string; role: string; initials: string }> = {
  "project-manager": { name: "Project Manager", role: "Project Manager", initials: "PM" },
  "product-manager": { name: "Product Manager", role: "Product Manager", initials: "PO" },
  "frontend-dev": { name: "Frontend Dev", role: "Frontend Developer", initials: "FE" },
  "backend-dev": { name: "Backend Dev", role: "Backend Developer", initials: "BE" },
  "fullstack-dev": { name: "Fullstack Dev", role: "Fullstack Developer", initials: "FS" },
  "qa-engineer": { name: "QA Engineer", role: "QA Engineer", initials: "QA" },
  "devops-engineer": { name: "DevOps Engineer", role: "DevOps Engineer", initials: "DO" },
  "ui-ux-designer": { name: "UI/UX Designer", role: "UI/UX Designer", initials: "UX" },
};

function derivePhase(feature: Feature): number {
  const fromTaskId = getPhaseFromTaskId(feature.id);
  if (fromTaskId) return fromTaskId;
  const fromGroup = getPhaseFromParallelGroup(feature.taskBreakdown.parallelGroup);
  if (fromGroup) return fromGroup;
  return 4;
}

function deriveDueDate(feature: Feature): string {
  const rawDate =
    feature.timeline?.completedAt || feature.timeline?.startedAt || feature.timeline?.createdAt;
  if (!rawDate) return new Date().toISOString().slice(0, 10);
  return rawDate.slice(0, 10);
}

function getImacProgramKey(featureId: string): string {
  const matched = featureId.match(/^(imac-[a-z0-9-]+)-p\d+[a-z]+-\d+$/i);
  if (matched?.[1]) return matched[1];
  return "imac";
}

function deriveMilestoneTrack(feature: Feature): { key: string; label: string } {
  if (!feature.id.startsWith("imac-")) {
    return { key: "initial", label: "Initial Track" };
  }

  const programKey = getImacProgramKey(feature.id);
  if (programKey === "imac") {
    return { key: "imac", label: "IMAC" };
  }

  const label = `IMAC ${programKey.replace(/^imac-/, "").replace(/-/g, " ")}`;
  return { key: programKey, label };
}

function toTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function deriveTimelineWindow(feature: Feature): {
  startAt: string;
  endAt: string;
  startMs: number;
  endMs: number;
} {
  const historyMs = feature.executionHistory
    .map((entry) => toTimestampMs(entry.timestamp))
    .filter((value): value is number => value !== null);
  const createdMs = toTimestampMs(feature.timeline.createdAt);
  const startedMs = toTimestampMs(feature.timeline.startedAt);
  const completedMs = toTimestampMs(feature.timeline.completedAt);

  const startCandidates = [createdMs, startedMs, ...historyMs].filter(
    (value): value is number => value !== null
  );
  const endCandidates = [completedMs, startedMs, createdMs, ...historyMs].filter(
    (value): value is number => value !== null
  );

  const fallback = Date.now();
  const startMs = startCandidates.length > 0 ? Math.min(...startCandidates) : fallback;
  const endMsRaw = endCandidates.length > 0 ? Math.max(...endCandidates) : startMs;
  const endMs = Math.max(endMsRaw, startMs);

  return {
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    startMs,
    endMs,
  };
}

function formatTimelineTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

// Status badge colors
const statusColors = {
  pending: "border-border/80 bg-secondary text-muted-foreground",
  in_progress: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-success/30 bg-success/10 text-success",
  blocked: "border-destructive/30 bg-destructive/10 text-destructive",
};

const swimlaneOrder: Task["status"][] = ["blocked", "pending", "in_progress", "completed"];

const swimlaneLabels: Record<Task["status"], string> = {
  blocked: "Blocked",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const priorityColors = {
  low: "border-l-2 border-l-green-500",
  medium: "border-l-2 border-l-amber-500",
  high: "border-l-2 border-l-orange-500",
  critical: "border-l-2 border-l-red-500",
};

const timelineBarColors: Record<Task["status"], string> = {
  blocked: "bg-destructive",
  pending: "bg-muted-foreground/45",
  in_progress: "bg-primary",
  completed: "bg-success",
};

const panelClassName = "admin-panel border-border/80 bg-card/90";
const softPanelClassName = "rounded-2xl border border-border/80 bg-secondary/70";
const nestedPanelClassName = "rounded-2xl border border-border/80 bg-background/80";
const chartGridColor = "hsl(var(--border))";
const chartAxisColor = "hsl(var(--muted-foreground))";
const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "16px",
  boxShadow: "0 24px 48px -36px hsl(var(--foreground) / 0.18)",
};

function getActionQueueHref(item: WaitingInboxItem, projectRoot: string): string {
  if (item.kind === "approval") {
    return buildProjectScopedPath("/approval", projectRoot);
  }
  if (item.kind === "question") {
    const base = item.featureId
      ? `/tasks-log?feature=${encodeURIComponent(item.featureId)}`
      : "/tasks-log";
    return buildProjectScopedPath(base, projectRoot);
  }
  const base = item.featureId ? `/pm?feature=${encodeURIComponent(item.featureId)}` : "/pm";
  return buildProjectScopedPath(base, projectRoot);
}

function getActionTypeLabel(kind: WaitingInboxItem["kind"]): string {
  if (kind === "approval") return "approval";
  if (kind === "question") return "question";
  return "human";
}

export default function PMDashboardPage() {
  const searchParams = useSearchParams();
  const projectRoot = (searchParams.get("project") || "").trim();
  const scopedPath = useCallback(
    (path: string) => buildProjectScopedPath(path, projectRoot),
    [projectRoot]
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawFeatures, setRawFeatures] = useState<Feature[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const [milestoneTrackFilter, setMilestoneTrackFilter] = useState("all");
  const [activityFeeds, setActivityFeeds] = useState<ActivityFeed[]>([]);

  const loadTasks = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) {
          setLoading(true);
          setLoadError(null);
        }
        const endpoints = ["/api/tasks", "/api/features", "/api/features/"];
        let payload: {
          success: boolean;
          data?: { features?: Feature[] };
          error?: string;
        } | null = null;
        let lastError = "Failed to load tasks";
        for (const endpoint of endpoints.map(scopedPath)) {
          const response = await fetch(endpoint, { cache: "no-store" });
          if (!response.ok) {
            lastError = `${endpoint} returned ${response.status}`;
            continue;
          }
          const data = await response.json();
          if (!data?.success) {
            lastError = data?.error || `${endpoint} failed`;
            continue;
          }
          payload = data;
          break;
        }
        if (!payload?.success) {
          throw new Error(lastError);
        }
        const features = (payload.data?.features || []) as Feature[];
        const mappedTasks = features.map((feature) => {
          const owner = ownerRoleMeta[feature.ownerRole] || {
            name: feature.ownerRole,
            role: feature.ownerRole,
            initials: feature.ownerRole.slice(0, 2).toUpperCase(),
          };
          const milestoneTrack = deriveMilestoneTrack(feature);
          const timelineWindow = deriveTimelineWindow(feature);
          return {
            id: feature.id,
            title: feature.title,
            assignee: { name: owner.name, role: owner.role, initials: owner.initials },
            status: feature.status.status,
            priority: feature.priority,
            dueDate: deriveDueDate(feature),
            phase: derivePhase(feature),
            optional: Boolean(feature.metadata?.optional),
            milestoneTrackKey: milestoneTrack.key,
            milestoneTrackLabel: milestoneTrack.label,
            timelineStartAt: timelineWindow.startAt,
            timelineEndAt: timelineWindow.endAt,
            timelineStartMs: timelineWindow.startMs,
            timelineEndMs: timelineWindow.endMs,
          } satisfies Task;
        });
        setRawFeatures(features);
        setTasks(mappedTasks);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "加载任务失败");
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [scopedPath]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const loadApprovals = useCallback(async () => {
    try {
      const response = await fetch(scopedPath("/api/approvals"), { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.success) return;
      setApprovals((payload.data?.approvals || []) as ApprovalRecord[]);
    } catch {}
  }, [scopedPath]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const loadActivityFeeds = useCallback(async () => {
    try {
      const response = await fetch(scopedPath("/api/activity-feeds"), { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.success) return;
      setActivityFeeds((payload.data?.sessions || []) as ActivityFeed[]);
    } catch {}
  }, [scopedPath]);

  useEffect(() => {
    loadActivityFeeds();
  }, [loadActivityFeeds]);

  useWebSocket({
    projectId: projectRoot || undefined,
    channels: ["task_updated", "file_changed", "phase_changed"],
    onTaskUpdated: () => {
      loadTasks(true);
      loadApprovals();
      loadActivityFeeds();
    },
    onFileChanged: (payload) => {
      if (payload.path.includes("tasks.json")) {
        loadTasks(true);
      }
      if (payload.path.includes("approvals") || payload.path.includes("/docs/")) {
        loadApprovals();
      }
      loadActivityFeeds();
    },
    onPhaseChanged: () => {
      loadTasks(true);
      loadApprovals();
      loadActivityFeeds();
    },
  });

  useEffect(() => {
    const handleProjectChanged = () => {
      loadTasks();
      loadApprovals();
      loadActivityFeeds();
    };

    window.addEventListener("lrac:project-changed", handleProjectChanged);
    return () => window.removeEventListener("lrac:project-changed", handleProjectChanged);
  }, [loadActivityFeeds, loadApprovals, loadTasks]);

  const globallyFilteredTasks = useMemo(
    () =>
      milestoneTrackFilter === "all"
        ? tasks
        : tasks.filter((task) => task.milestoneTrackKey === milestoneTrackFilter),
    [milestoneTrackFilter, tasks]
  );

  const filteredFeatureIds = useMemo(
    () => new Set(globallyFilteredTasks.map((task) => task.id)),
    [globallyFilteredTasks]
  );

  const globallyFilteredFeatures = useMemo(
    () =>
      milestoneTrackFilter === "all"
        ? rawFeatures
        : rawFeatures.filter((feature) => filteredFeatureIds.has(feature.id)),
    [filteredFeatureIds, milestoneTrackFilter, rawFeatures]
  );

  // Calculate stats
  const stats = {
    total: globallyFilteredTasks.length,
    inProgress: globallyFilteredTasks.filter((t) => t.status === "in_progress").length,
    completed: globallyFilteredTasks.filter((t) => t.status === "completed").length,
    blocked: globallyFilteredTasks.filter((t) => t.status === "blocked").length,
  };
  const topStatCards = [
    {
      title: "Total Tasks",
      value: stats.total,
      description: loading ? "Loading..." : "From tasks.json",
      variant: "default" as const,
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      description: `${stats.total > 0 ? ((stats.inProgress / stats.total) * 100).toFixed(0) : 0}% of total`,
      variant: "primary" as const,
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: "Completed",
      value: stats.completed,
      description: `${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}% completion`,
      variant: "success" as const,
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      title: "Blocked",
      value: stats.blocked,
      description: loadError ? "Load error" : "Needs attention",
      variant: "error" as const,
      icon: <AlertCircle className="h-5 w-5" />,
    },
  ];

  // Filter tasks (local task search within global milestone filter)
  const filteredTasks = globallyFilteredTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const milestoneTrackOptions = useMemo(
    () =>
      Array.from(
        tasks.reduce((map, task) => {
          map.set(task.milestoneTrackKey, task.milestoneTrackLabel);
          return map;
        }, new Map<string, string>())
      )
        .map(([key, label]) => ({ key, label }))
        .sort((left, right) => {
          if (left.key === "initial") return -1;
          if (right.key === "initial") return 1;
          return left.label.localeCompare(right.label);
        }),
    [tasks]
  );

  const visibleSwimlanes = useMemo<Task["status"][]>(
    () => (statusFilter === "all" ? swimlaneOrder : [statusFilter]),
    [statusFilter]
  );

  const phaseSwimlanes = useMemo(() => {
    const groupedByPhase = new Map<number, Task[]>();
    filteredTasks.forEach((task) => {
      const phaseTasks = groupedByPhase.get(task.phase) || [];
      phaseTasks.push(task);
      groupedByPhase.set(task.phase, phaseTasks);
    });

    return Array.from(groupedByPhase.entries())
      .sort(([left], [right]) => left - right)
      .map(([phase, phaseTasks]) => {
        const lanes: Record<Task["status"], Task[]> = {
          blocked: [],
          pending: [],
          in_progress: [],
          completed: [],
        };

        phaseTasks.forEach((task) => {
          lanes[task.status].push(task);
        });

        swimlaneOrder.forEach((status) => {
          lanes[status].sort((left, right) => {
            const dueDateCompare = left.dueDate.localeCompare(right.dueDate);
            if (dueDateCompare !== 0) return dueDateCompare;
            return left.id.localeCompare(right.id);
          });
        });

        return {
          phase,
          total: phaseTasks.length,
          lanes,
        };
      });
  }, [filteredTasks]);

  const timelineTasks = useMemo(
    () =>
      statusFilter === "all"
        ? globallyFilteredTasks
        : globallyFilteredTasks.filter((task) => task.status === statusFilter),
    [globallyFilteredTasks, statusFilter]
  );

  const timelineDomain = useMemo(() => {
    if (timelineTasks.length === 0) return null;
    const minStart = Math.min(...timelineTasks.map((task) => task.timelineStartMs));
    const maxEnd = Math.max(...timelineTasks.map((task) => task.timelineEndMs));
    if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) return null;
    if (maxEnd <= minStart) {
      return { startMs: minStart, endMs: minStart + 60 * 60 * 1000 };
    }
    return { startMs: minStart, endMs: maxEnd };
  }, [timelineTasks]);

  const timelineTracks = useMemo(() => {
    const tracks = timelineTasks.reduce((map, task) => {
      const existing = map.get(task.milestoneTrackKey) || {
        key: task.milestoneTrackKey,
        label: task.milestoneTrackLabel,
        phases: new Map<number, Task[]>(),
        total: 0,
      };
      const phaseTasks = existing.phases.get(task.phase) || [];
      phaseTasks.push(task);
      existing.phases.set(task.phase, phaseTasks);
      existing.total += 1;
      map.set(task.milestoneTrackKey, existing);
      return map;
    }, new Map<string, { key: string; label: string; phases: Map<number, Task[]>; total: number }>());

    return Array.from(tracks.values())
      .map((track) => {
        const phases = Array.from(track.phases.entries())
          .sort(([left], [right]) => left - right)
          .map(([phase, phaseTasks]) => {
            const sortedTasks = [...phaseTasks].sort((left, right) => {
              const dueDateCompare = left.dueDate.localeCompare(right.dueDate);
              if (dueDateCompare !== 0) return dueDateCompare;
              return left.id.localeCompare(right.id);
            });
            const phaseStartMs = Math.min(...sortedTasks.map((task) => task.timelineStartMs));
            const phaseEndMs = Math.max(...sortedTasks.map((task) => task.timelineEndMs));
            return {
              phase,
              startMs: phaseStartMs,
              endMs: phaseEndMs,
              tasks: sortedTasks,
            };
          });

        const trackStartMs = Math.min(...phases.map((phase) => phase.startMs));
        const trackEndMs = Math.max(...phases.map((phase) => phase.endMs));
        return {
          key: track.key,
          label: track.label,
          total: track.total,
          startMs: trackStartMs,
          endMs: trackEndMs,
          phases,
        };
      })
      .sort((left, right) => {
        if (left.key === "initial") return -1;
        if (right.key === "initial") return 1;
        return left.label.localeCompare(right.label);
      });
  }, [timelineTasks]);

  const getTimelineBarStyle = useCallback(
    (startMs: number, endMs: number) => {
      if (!timelineDomain) {
        return { left: "0%", width: "100%" };
      }
      const total = Math.max(timelineDomain.endMs - timelineDomain.startMs, 1);
      const safeStart = Math.min(Math.max(startMs, timelineDomain.startMs), timelineDomain.endMs);
      const safeEnd = Math.min(Math.max(endMs, safeStart), timelineDomain.endMs);
      const left = ((safeStart - timelineDomain.startMs) / total) * 100;
      const width = Math.max(((safeEnd - safeStart) / total) * 100, 1.5);
      return {
        left: `${left}%`,
        width: `${Math.min(width, 100 - left)}%`,
      };
    },
    [timelineDomain]
  );

  // Chart data
  const pieData = [
    { name: "Completed", value: stats.completed, fill: "hsl(var(--success))" },
    { name: "In Progress", value: stats.inProgress, fill: "hsl(var(--primary))" },
    {
      name: "Pending",
      value: Math.max(0, stats.total - stats.completed - stats.inProgress - stats.blocked),
      fill: "hsl(var(--muted-foreground))",
    },
    { name: "Blocked", value: stats.blocked, fill: "hsl(var(--destructive))" },
  ];
  const pieChartData = pieData.filter((item) => item.value > 0);

  const phaseProgress = useMemo<PhaseProgress[]>(() => {
    const allPhases = new Set<number>([1, 2, 2.5, 3, 4, 5, 6, 7, 8]);
    globallyFilteredTasks.forEach((task) => allPhases.add(task.phase));
    return Array.from(allPhases)
      .sort((a, b) => a - b)
      .map((phase) => {
        const inPhase = globallyFilteredTasks.filter((task) => task.phase === phase);
        const requiredInPhase = inPhase.filter((task) => !task.optional);
        return {
          name: `Phase ${phase}`,
          completed: requiredInPhase.filter((task) => task.status === "completed").length,
          total: requiredInPhase.length,
        };
      });
  }, [globallyFilteredTasks]);

  const teamMembers = useMemo<TeamMember[]>(() => {
    const memberMap = new Map<string, TeamMember>();
    globallyFilteredTasks.forEach((task) => {
      const key = `${task.assignee.name}:${task.assignee.role || "Unknown"}`;
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          name: task.assignee.name,
          role: task.assignee.role || "Unknown",
          initials: task.assignee.initials,
          tasksCompleted: 0,
          tasksInProgress: 0,
        });
      }
      const member = memberMap.get(key)!;
      if (task.status === "completed") member.tasksCompleted += 1;
      if (task.status === "in_progress") member.tasksInProgress += 1;
    });
    return Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [globallyFilteredTasks]);

  const barData = phaseProgress.map((phase: PhaseProgress) => ({
    name: phase.name,
    completed: phase.completed,
    remaining: phase.total - phase.completed,
  }));
  const waitingInbox = useMemo(
    () =>
      deriveWaitingInbox({
        features: globallyFilteredFeatures,
        approvals,
        sessions: activityFeeds,
      })
        .filter((item) => !item.featureId || filteredFeatureIds.has(item.featureId))
        .slice(0, 8),
    [activityFeeds, approvals, filteredFeatureIds, globallyFilteredFeatures]
  );
  const blockerQueue = useMemo(
    () => deriveBlockerQueue(globallyFilteredFeatures).slice(0, 8),
    [globallyFilteredFeatures]
  );

  return (
    <div className="admin-page min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="admin-kicker mb-2">Program Coordination</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">PM Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Project management and team overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={milestoneTrackFilter} onValueChange={setMilestoneTrackFilter}>
            <SelectTrigger className="admin-input w-[240px] border-border/80 bg-background/80 shadow-sm">
              <SelectValue placeholder="Milestone Track" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value="all">All Milestone Tracks</SelectItem>
              {milestoneTrackOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gradient-primary text-white shadow-lg shadow-primary/20">
            <Users className="mr-2 h-4 w-4" />
            Manage Team
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div>
        <p className="admin-kicker mb-3">Program Metrics</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topStatCards.map((stat) => (
            <StatCard key={stat.title} {...stat} className="min-h-[156px]" />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div>
        <p className="admin-kicker mb-3">Visual Insights</p>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Progress by Phase Chart */}
          <Card className={panelClassName}>
            <CardHeader className="pb-3">
              <CardTitle>Progress by Phase</CardTitle>
              <CardDescription>Task completion across development phases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="admin-panel-soft rounded-2xl p-3">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="name" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="completed" stackId="a" fill="hsl(var(--success))" />
                    <Bar dataKey="remaining" stackId="a" fill="hsl(var(--border))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Task Distribution Pie Chart */}
          <Card className={panelClassName}>
            <CardHeader className="pb-3">
              <CardTitle>Task Distribution</CardTitle>
              <CardDescription>Status breakdown of all tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="admin-panel-soft rounded-2xl p-3">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData.length > 0 ? pieChartData : pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      innerRadius={48}
                      outerRadius={86}
                      paddingAngle={2}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {(pieChartData.length > 0 ? pieChartData : pieData).map((entry, index) => (
                        <Cell key={`pie-color-${entry.name}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value ?? 0} tasks`, String(name)]}
                      contentStyle={chartTooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    className={softPanelClassName + " flex items-center justify-between px-2 py-1"}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Swimlanes */}
      <Card className={panelClassName}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                Grouped by phase with swimlanes ordered as Blocked, Pending, In Progress, Completed
              </CardDescription>
              {loadError ? <p className="mt-1 text-xs text-destructive">{loadError}</p> : null}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-input w-[250px] border-border/80 bg-background/80 pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | Task["status"])}
              >
                <SelectTrigger className="admin-input w-[150px] border-border/80 bg-background/80">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phaseSwimlanes.length === 0 ? (
              <p className="admin-empty-state admin-empty-state-md">No tasks in current filter</p>
            ) : (
              phaseSwimlanes.map((phaseGroup) => (
                <details key={`phase-${phaseGroup.phase}`} className={`${softPanelClassName} p-4`}>
                  <summary className="cursor-pointer list-none">
                    <p className="text-sm font-semibold text-foreground">
                      Phase {phaseGroup.phase}
                    </p>
                    <div
                      className="mt-2 grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${visibleSwimlanes.length + 1}, minmax(0, 1fr))`,
                      }}
                    >
                      {visibleSwimlanes.map((status) => (
                        <div
                          key={`phase-${phaseGroup.phase}-summary-${status}`}
                          className={`${nestedPanelClassName} px-2 py-1 text-center`}
                        >
                          <p className="text-[11px] text-muted-foreground">
                            {swimlaneLabels[status]}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {phaseGroup.lanes[status].length}
                          </p>
                        </div>
                      ))}
                      <div className={`${nestedPanelClassName} px-2 py-1 text-center`}>
                        <p className="text-[11px] text-muted-foreground">Total</p>
                        <p className="text-sm font-semibold text-foreground">{phaseGroup.total}</p>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {visibleSwimlanes.map((status) => {
                      const laneTasks = phaseGroup.lanes[status];
                      return (
                        <div
                          key={`phase-${phaseGroup.phase}-${status}`}
                          className={`${nestedPanelClassName} p-3`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {swimlaneLabels[status]}
                            </p>
                            <Badge className={statusColors[status]}>{laneTasks.length}</Badge>
                          </div>
                          <div className="mt-2 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {laneTasks.length === 0 ? (
                              <p className="admin-empty-state admin-empty-state-sm">No tasks</p>
                            ) : (
                              laneTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className={`rounded-xl border border-border/80 bg-background/90 p-2 ${
                                    priorityColors[task.priority]
                                  }`}
                                >
                                  <p className="text-sm font-medium text-foreground leading-5">
                                    {task.title}
                                  </p>
                                  <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                                    {task.id}
                                  </p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="gradient-primary text-[10px] text-white">
                                        {task.assignee.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-[11px] text-muted-foreground">
                                      {task.assignee.name}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-muted-foreground">
                                      {task.dueDate}
                                    </span>
                                    {task.optional ? (
                                      <Badge
                                        variant="outline"
                                        className="border-primary/30 text-[10px] text-primary"
                                      >
                                        Optional
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Overview */}
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>Workload distribution across team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {teamMembers.map((member) => (
              <div key={member.name} className={`${softPanelClassName} p-3`}>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="gradient-primary text-white">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-success">
                      {member.tasksCompleted} completed
                    </p>
                    <p className="text-xs text-primary">{member.tasksInProgress} in progress</p>
                  </div>
                  <Badge variant="outline" className="border-border/80 text-muted-foreground">
                    {member.tasksCompleted + member.tasksInProgress} total
                  </Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={
                      member.tasksCompleted + member.tasksInProgress > 0
                        ? (member.tasksCompleted /
                            (member.tasksCompleted + member.tasksInProgress)) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline View (Simplified Gantt) */}
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>Full task timeline grouped by Milestone Track and Phase</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineTracks.length === 0 ? (
            <p className="admin-empty-state admin-empty-state-md">No tasks in current filter</p>
          ) : (
            <div className="space-y-3">
              {timelineDomain ? (
                <div className={`${softPanelClassName} p-3`}>
                  <div className="relative h-2 rounded bg-background/90">
                    <div className="absolute inset-y-0 left-0 w-px bg-border" />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div className="absolute inset-y-0 right-0 w-px bg-border" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatTimelineTimestamp(timelineDomain.startMs)}</span>
                    <span>
                      {formatTimelineTimestamp(
                        Math.round((timelineDomain.startMs + timelineDomain.endMs) / 2)
                      )}
                    </span>
                    <span>{formatTimelineTimestamp(timelineDomain.endMs)}</span>
                  </div>
                </div>
              ) : null}
              {timelineTracks.map((track) => (
                <details key={track.key} className={`${softPanelClassName} p-3`}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{track.label}</p>
                      <Badge variant="outline" className="border-border/80 text-muted-foreground">
                        {track.total} tasks
                      </Badge>
                    </div>
                    <div className={`${nestedPanelClassName} mt-2 p-2`}>
                      <div className="relative h-2 rounded bg-background/90">
                        <div
                          className="absolute inset-y-0 rounded bg-primary/75"
                          style={getTimelineBarStyle(track.startMs, track.endMs)}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatTimelineTimestamp(track.startMs)}</span>
                        <span>{formatTimelineTimestamp(track.endMs)}</span>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {track.phases.map((phaseGroup) => (
                      <details
                        key={`${track.key}-phase-${phaseGroup.phase}`}
                        className={`${nestedPanelClassName} p-3`}
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">
                              Phase {phaseGroup.phase}
                            </p>
                            <Badge
                              variant="outline"
                              className="border-border/80 text-muted-foreground"
                            >
                              {phaseGroup.tasks.length} tasks
                            </Badge>
                          </div>
                          <div className={`${softPanelClassName} mt-2 p-2`}>
                            <div className="relative h-2 rounded bg-background/90">
                              <div
                                className="absolute inset-y-0 rounded bg-success/80"
                                style={getTimelineBarStyle(phaseGroup.startMs, phaseGroup.endMs)}
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{formatTimelineTimestamp(phaseGroup.startMs)}</span>
                              <span>{formatTimelineTimestamp(phaseGroup.endMs)}</span>
                            </div>
                          </div>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {phaseGroup.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="grid grid-cols-1 gap-2 rounded-2xl border border-border/80 bg-background/85 p-2 lg:grid-cols-[minmax(0,260px)_1fr_auto]"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground leading-5">
                                  {task.title}
                                </p>
                                <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                                  {task.id}
                                </p>
                              </div>
                              <div className="relative h-7 rounded bg-secondary/90">
                                <div
                                  className={`absolute inset-y-0 left-0 rounded ${timelineBarColors[task.status]}`}
                                  style={getTimelineBarStyle(
                                    task.timelineStartMs,
                                    task.timelineEndMs
                                  )}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 lg:w-[280px] lg:justify-end">
                                <div className="text-right">
                                  <p className="text-[11px] text-muted-foreground">
                                    Start: {formatTimelineTimestamp(task.timelineStartMs)}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    End: {formatTimelineTimestamp(task.timelineEndMs)}
                                  </p>
                                </div>
                                <Badge className={statusColors[task.status]}>
                                  {task.status.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className={panelClassName}>
          <CardHeader>
            <CardTitle>Action Queue</CardTitle>
            <CardDescription>Approvals, questions, and human-required items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {waitingInbox.length === 0 ? (
                <p className="admin-empty-state admin-empty-state-md">No pending inbox items</p>
              ) : (
                waitingInbox.map((item) => (
                  <Link
                    key={item.id}
                    href={getActionQueueHref(item, projectRoot)}
                    className={`${softPanelClassName} block px-3 py-3 transition-all duration-150 hover:border-primary/25 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            item.kind === "blocked" ? statusColors.blocked : statusColors.pending
                          }
                        >
                          {item.kind === "blocked" ? "blocked" : "pending"}
                        </Badge>
                        <Badge variant="outline" className="border-border/80 text-muted-foreground">
                          {getActionTypeLabel(item.kind)}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {item.featureId || item.sessionId || "project"} ·{" "}
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={panelClassName}>
          <CardHeader>
            <CardTitle>Blocker Queue</CardTitle>
            <CardDescription>Blocked work sorted by intervention urgency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockerQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active blockers</p>
              ) : (
                blockerQueue.map((item) => (
                  <div key={item.featureId} className={`${softPanelClassName} px-3 py-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">{item.featureId}</p>
                      </div>
                      <Badge
                        className={
                          item.needsHumanIntervention
                            ? statusColors.blocked
                            : "border-border/80 bg-secondary text-muted-foreground"
                        }
                      >
                        {item.needsHumanIntervention ? "human" : "queued"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {item.ownerRole} · {item.reportedBy} ·{" "}
                      {new Date(item.reportedAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
