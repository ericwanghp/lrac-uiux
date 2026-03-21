"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressBar } from "@/components/shared/progress-bar";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowUpDown,
  Search,
  Filter,
  SendHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface TerminalSessionSummary {
  id: string;
  parentSessionId: string | null;
  sessionType: "pm_main" | "task_child";
  featureId: string | null;
  status: "active" | "closed";
  createdAt: string;
  updatedAt: string;
}

interface TerminalEventPreview {
  id: string;
  timestamp: string;
  text: string;
}

type FeatureFromApi = {
  id: string;
  title: string;
  ownerRole: string;
  priority: "low" | "medium" | "high" | "critical";
  taskBreakdown: { parallelGroup: string | null };
  metadata?: { optional?: boolean };
  timeline?: { createdAt?: string; startedAt?: string; completedAt?: string };
  status: { status: "pending" | "in_progress" | "completed" | "blocked" };
};

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

function derivePhase(feature: FeatureFromApi): number {
  const fromTaskId = getPhaseFromTaskId(feature.id);
  if (fromTaskId) return fromTaskId;
  const fromGroup = getPhaseFromParallelGroup(feature.taskBreakdown.parallelGroup);
  if (fromGroup) return fromGroup;
  return 4;
}

function deriveDueDate(feature: FeatureFromApi): string {
  const rawDate =
    feature.timeline?.completedAt || feature.timeline?.startedAt || feature.timeline?.createdAt;
  if (!rawDate) return new Date().toISOString().slice(0, 10);
  return rawDate.slice(0, 10);
}

// Status badge colors
const statusColors = {
  pending: "bg-gray-500/15 text-gray-400 border-gray-500",
  in_progress: "bg-blue-500/15 text-blue-500 border-blue-500",
  completed: "bg-green-500/15 text-green-500 border-green-500",
  blocked: "bg-red-500/15 text-red-500 border-red-500",
};

const priorityColors = {
  low: "border-l-2 border-l-green-500",
  medium: "border-l-2 border-l-amber-500",
  high: "border-l-2 border-l-orange-500",
  critical: "border-l-2 border-l-red-500",
};

export default function PMDashboardPage() {
  type SortableField = "id" | "dueDate";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortableField>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [terminalSessions, setTerminalSessions] = useState<TerminalSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [pmCommandInput, setPmCommandInput] = useState("");
  const [pmCommandSubmitting, setPmCommandSubmitting] = useState(false);
  const [pmEventPreview, setPmEventPreview] = useState<TerminalEventPreview[]>([]);
  const [pmCommandError, setPmCommandError] = useState<string | null>(null);
  const pmAfterSeqRef = useRef(0);

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
          data?: { features?: FeatureFromApi[] };
          error?: string;
        } | null = null;
        let lastError = "Failed to load tasks";
        for (const endpoint of endpoints) {
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
        const features = (payload.data?.features || []) as FeatureFromApi[];
        const mappedTasks = features.map((feature) => {
          const owner = ownerRoleMeta[feature.ownerRole] || {
            name: feature.ownerRole,
            role: feature.ownerRole,
            initials: feature.ownerRole.slice(0, 2).toUpperCase(),
          };
          return {
            id: feature.id,
            title: feature.title,
            assignee: { name: owner.name, role: owner.role, initials: owner.initials },
            status: feature.status.status,
            priority: feature.priority,
            dueDate: deriveDueDate(feature),
            phase: derivePhase(feature),
            optional: Boolean(feature.metadata?.optional),
          } satisfies Task;
        });
        setTasks(mappedTasks);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "加载任务失败");
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [setTasks]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const loadTerminalSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/terminal/sessions", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.success) return;
      setTerminalSessions((payload.data?.sessions || []) as TerminalSessionSummary[]);
    } catch {}
  }, []);

  useEffect(() => {
    loadTerminalSessions();
  }, [loadTerminalSessions]);

  useWebSocket({
    channels: ["task_updated", "file_changed", "phase_changed"],
    onTaskUpdated: () => {
      loadTasks(true);
      loadTerminalSessions();
    },
    onFileChanged: (payload) => {
      if (payload.path.includes("tasks.json")) {
        loadTasks(true);
        loadTerminalSessions();
      }
    },
    onPhaseChanged: () => {
      loadTasks(true);
      loadTerminalSessions();
    },
  });

  // Calculate stats
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Chart data
  const pieData = [
    { name: "Completed", value: stats.completed, fill: "#10B981" },
    { name: "In Progress", value: stats.inProgress, fill: "#3B82F6" },
    {
      name: "Pending",
      value: Math.max(0, stats.total - stats.completed - stats.inProgress - stats.blocked),
      fill: "#6B7280",
    },
    { name: "Blocked", value: stats.blocked, fill: "#EF4444" },
  ];
  const pieChartData = pieData.filter((item) => item.value > 0);

  const phaseProgress = useMemo<PhaseProgress[]>(() => {
    const allPhases = new Set<number>([1, 2, 2.5, 3, 4, 5, 6, 7, 8]);
    tasks.forEach((task) => allPhases.add(task.phase));
    return Array.from(allPhases)
      .sort((a, b) => a - b)
      .map((phase) => {
        const inPhase = tasks.filter((task) => task.phase === phase);
        const requiredInPhase = inPhase.filter((task) => !task.optional);
        return {
          name: `Phase ${phase}`,
          completed: requiredInPhase.filter((task) => task.status === "completed").length,
          total: requiredInPhase.length,
        };
      });
  }, [tasks]);

  const teamMembers = useMemo<TeamMember[]>(() => {
    const memberMap = new Map<string, TeamMember>();
    tasks.forEach((task) => {
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
  }, [tasks]);

  const barData = phaseProgress.map((phase: PhaseProgress) => ({
    name: phase.name,
    completed: phase.completed,
    remaining: phase.total - phase.completed,
  }));
  const pmMainSessions = terminalSessions.filter((session) => session.sessionType === "pm_main");
  const childSessions = terminalSessions.filter((session) => session.sessionType === "task_child");
  const activeChildSessions = childSessions.filter((session) => session.status === "active");
  const sessionOptions = pmMainSessions.length > 0 ? pmMainSessions : terminalSessions;

  useEffect(() => {
    if (sessionOptions.length === 0) {
      setSelectedSessionId("");
      return;
    }
    const fallbackSessionId = sessionOptions[0]?.id || "";
    setSelectedSessionId((prev) =>
      prev && sessionOptions.some((session) => session.id === prev) ? prev : fallbackSessionId
    );
  }, [sessionOptions]);

  useEffect(() => {
    pmAfterSeqRef.current = 0;
    setPmEventPreview([]);
  }, [selectedSessionId]);

  const mapEventPreviewText = useCallback(
    (event: { eventType: string; payload?: Record<string, unknown> }) => {
      if (event.eventType === "terminal.output.appended") {
        return String(event.payload?.content || "");
      }
      if (event.eventType === "terminal.command.submitted") {
        return `[CMD] ${String(event.payload?.command || "")}`;
      }
      if (event.eventType === "terminal.command.finished") {
        return `[DONE] code=${String(event.payload?.code ?? 0)} durationMs=${String(event.payload?.durationMs ?? "n/a")}`;
      }
      return `[EVENT] ${event.eventType}`;
    },
    []
  );

  useEffect(() => {
    if (!selectedSessionId) return;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/terminal/sessions/${selectedSessionId}/events?afterSeq=${pmAfterSeqRef.current}`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        const events = payload.data?.events || [];
        if (events.length > 0) {
          setPmEventPreview((prev) => {
            const next = [...prev];
            events.forEach(
              (event: {
                id: string;
                timestamp: string;
                eventType: string;
                payload?: Record<string, unknown>;
              }) => {
                next.push({
                  id: event.id,
                  timestamp: event.timestamp,
                  text: mapEventPreviewText(event),
                });
              }
            );
            return next.slice(-12);
          });
        }
        pmAfterSeqRef.current = Math.max(
          pmAfterSeqRef.current,
          Number(payload.data?.nextSeqNo || pmAfterSeqRef.current + 1) - 1
        );
      } catch {}
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 1200);
    return () => clearInterval(timer);
  }, [mapEventPreviewText, selectedSessionId]);

  const handleSubmitPmCommand = async () => {
    if (!selectedSessionId || !pmCommandInput.trim() || pmCommandSubmitting) return;
    try {
      setPmCommandError(null);
      setPmCommandSubmitting(true);
      const response = await fetch(`/api/terminal/sessions/${selectedSessionId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: pmCommandInput }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to submit PM command");
      }
      setPmCommandInput("");
    } catch (error) {
      setPmCommandError(error instanceof Error ? error.message : "Failed to submit PM command");
    } finally {
      setPmCommandSubmitting(false);
    }
  };

  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#121826] min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">PM Dashboard</h1>
          <p className="text-[#A0A0A0] mt-1">Project management and team overview</p>
        </div>
        <Button className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]">
          <Users className="mr-2 h-4 w-4" />
          Manage Team
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#1A1A1A] border-[#334155]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-[#71717A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-[#10B981]">{loading ? "Loading..." : "From tasks.json"}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#334155]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-[#3B82F6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
            <p className="text-xs text-[#3B82F6]">
              {stats.total > 0 ? ((stats.inProgress / stats.total) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#334155]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-[#10B981]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.completed}</div>
            <p className="text-xs text-[#10B981]">
              {phaseProgress[0]?.completed || 0} in earliest phase
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#334155]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-[#EF4444]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.blocked}</div>
            <p className="text-xs text-[#EF4444]">{loadError ? "Load error" : "Needs attention"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1A1A1A] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white">PM Main Terminal Orchestration</CardTitle>
          <CardDescription className="text-[#A0A0A0]">
            Main sessions and parallel task terminal status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded border border-[#334155] px-3 py-2">
              <div className="text-xs text-[#A0A0A0]">PM Main Sessions</div>
              <div className="text-xl font-semibold text-white">{pmMainSessions.length}</div>
            </div>
            <div className="rounded border border-[#334155] px-3 py-2">
              <div className="text-xs text-[#A0A0A0]">Task Child Sessions</div>
              <div className="text-xl font-semibold text-white">{childSessions.length}</div>
            </div>
            <div className="rounded border border-[#334155] px-3 py-2">
              <div className="text-xs text-[#A0A0A0]">Active Child Sessions</div>
              <div className="text-xl font-semibold text-[#3B82F6]">
                {activeChildSessions.length}
              </div>
            </div>
          </div>
          <div className="rounded border border-[#334155] p-3 mb-4 bg-[#0F172A]/30">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-2 items-center mb-2">
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#334155] text-white">
                  <SelectValue placeholder="Choose PM session" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#334155]">
                  {sessionOptions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.sessionType} · {session.id.slice(0, 12)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={pmCommandInput}
                onChange={(e) => setPmCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmitPmCommand();
                  }
                }}
                placeholder="Run command from PM main terminal..."
                className="bg-[#0A0A0A] border-[#334155] text-white"
                disabled={!selectedSessionId}
              />
              <Button
                onClick={handleSubmitPmCommand}
                disabled={!selectedSessionId || !pmCommandInput.trim() || pmCommandSubmitting}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF]"
              >
                <SendHorizontal className="h-4 w-4 mr-2" />
                {pmCommandSubmitting ? "Submitting" : "Run"}
              </Button>
            </div>
            <div className="h-[120px] overflow-y-auto rounded border border-[#334155] bg-[#020617] px-2 py-2 font-mono text-[11px]">
              {pmEventPreview.length === 0 ? (
                <p className="text-[#64748B]">No session events yet</p>
              ) : (
                pmEventPreview.map((item) => (
                  <p key={item.id} className="text-[#E2E8F0] leading-5 truncate">
                    <span className="text-[#64748B] mr-2">
                      [{new Date(item.timestamp).toLocaleTimeString()}]
                    </span>
                    {item.text}
                  </p>
                ))
              )}
            </div>
            {pmCommandError ? (
              <p className="text-xs text-[#EF4444] mt-2">{pmCommandError}</p>
            ) : null}
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {terminalSessions.slice(0, 8).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded border border-[#334155] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{session.id}</p>
                  <p className="text-[11px] text-[#71717A] truncate">
                    {session.sessionType} · {session.featureId || "no-feature"}
                  </p>
                </div>
                <Badge
                  className={
                    session.status === "active" ? statusColors.in_progress : statusColors.completed
                  }
                >
                  {session.status}
                </Badge>
              </div>
            ))}
            {terminalSessions.length === 0 ? (
              <p className="text-xs text-[#71717A]">No terminal sessions yet</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Progress by Phase Chart */}
        <Card className="bg-[#1A1A1A] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white">Progress by Phase</CardTitle>
            <CardDescription className="text-[#A0A0A0]">
              Task completion across development phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#A0A0A0" />
                <YAxis stroke="#A0A0A0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="completed" stackId="a" fill="#10B981" />
                <Bar dataKey="remaining" stackId="a" fill="#334155" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution Pie Chart */}
        <Card className="bg-[#1A1A1A] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white">Task Distribution</CardTitle>
            <CardDescription className="text-[#A0A0A0]">
              Status breakdown of all tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  stroke="#0F172A"
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
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {pieData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded border border-[#334155] px-2 py-1"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-xs text-[#A0A0A0]">{item.name}</span>
                  </div>
                  <span className="text-xs font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Table */}
      <Card className="bg-[#1A1A1A] border-[#334155]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Tasks</CardTitle>
            {loadError ? <p className="text-xs text-[#EF4444]">{loadError}</p> : null}
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#71717A]" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[250px] bg-[#0A0A0A] border-[#334155] text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-[#0A0A0A] border-[#334155] text-white">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#334155]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#334155] hover:bg-transparent">
                <TableHead className="text-[#A0A0A0] w-[100px]">
                  <button
                    onClick={() => handleSort("id")}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    ID
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-[#A0A0A0]">Task</TableHead>
                <TableHead className="text-[#A0A0A0]">Assignee</TableHead>
                <TableHead className="text-[#A0A0A0]">Status</TableHead>
                <TableHead className="text-[#A0A0A0]">Priority</TableHead>
                <TableHead className="text-[#A0A0A0]">
                  <button
                    onClick={() => handleSort("dueDate")}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Due Date
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={`border-[#334155] ${priorityColors[task.priority]}`}
                >
                  <TableCell className="text-[#A0A0A0] font-mono">{task.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[#71717A]">Phase {task.phase}</p>
                        {task.optional ? (
                          <Badge
                            variant="outline"
                            className="border-[#3B82F6] text-[#60A5FA] text-[10px]"
                          >
                            Optional
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-[#3B82F6] text-white text-xs">
                          {task.assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[#A0A0A0]">{task.assignee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[task.status]}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-[#334155] text-[#A0A0A0]">
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#A0A0A0]">{task.dueDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team Overview */}
      <Card className="bg-[#1A1A1A] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white">Team Overview</CardTitle>
          <CardDescription className="text-[#A0A0A0]">
            Workload distribution across team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between py-3 border-b border-[#334155] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{member.name}</p>
                    <p className="text-sm text-[#71717A]">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#10B981]">
                      {member.tasksCompleted} completed
                    </p>
                    <p className="text-xs text-[#3B82F6]">{member.tasksInProgress} in progress</p>
                  </div>
                  <div className="w-32">
                    <ProgressBar
                      value={
                        (member.tasksCompleted / (member.tasksCompleted + member.tasksInProgress)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline View (Simplified Gantt) */}
      <Card className="bg-[#1A1A1A] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white">Project Timeline</CardTitle>
          <CardDescription className="text-[#A0A0A0]">
            Visual timeline of task schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-4">
                <div className="w-32 text-sm text-[#A0A0A0] font-mono">{task.id}</div>
                <div className="flex-1 relative h-8 bg-[#0A0A0A] rounded">
                  <div
                    className={`absolute h-full rounded ${
                      task.status === "completed"
                        ? "bg-[#10B981]"
                        : task.status === "in_progress"
                          ? "bg-[#3B82F6]"
                          : task.status === "blocked"
                            ? "bg-[#EF4444]"
                            : "bg-[#6B7280]"
                    }`}
                    style={{
                      left: `${Math.random() * 20}%`,
                      width: `${30 + Math.random() * 40}%`,
                    }}
                  />
                </div>
                <div className="w-24 text-sm text-[#A0A0A0]">{task.dueDate}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
