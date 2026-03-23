"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useWebSocket } from "@/lib/websocket/useWebSocket";
import { getPhaseFromTaskId } from "@/lib/constants/task-id";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

type FeatureStatus = "pending" | "in_progress" | "completed" | "blocked";

type FeatureFromApi = {
  id: string;
  status: { status: FeatureStatus };
};

type ProjectRealtimeSnapshot = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  overallProgress: number;
  currentPhase: number;
  currentPhaseLabel: string;
  lastUpdated: string | null;
};

type ProjectRealtimeStatusContextValue = {
  snapshot: ProjectRealtimeSnapshot;
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  refresh: () => Promise<void>;
};

const PHASE_LABELS: Record<number, string> = {
  1: "Requirements",
  2: "Product",
  2.5: "Design",
  3: "Architecture",
  4: "Breakdown",
  5: "Development",
  6: "Testing",
  7: "Deployment",
  8: "PM",
};

const DEFAULT_SNAPSHOT: ProjectRealtimeSnapshot = {
  total: 0,
  completed: 0,
  inProgress: 0,
  pending: 0,
  blocked: 0,
  overallProgress: 0,
  currentPhase: 1,
  currentPhaseLabel: PHASE_LABELS[1] || "Requirements",
  lastUpdated: null,
};

const ProjectRealtimeStatusContext = React.createContext<ProjectRealtimeStatusContextValue>({
  snapshot: DEFAULT_SNAPSHOT,
  isConnected: false,
  isConnecting: false,
  reconnectAttempts: 0,
  refresh: async () => undefined,
});

function inferCurrentPhase(features: FeatureFromApi[]): number {
  if (features.length === 0) return 1;
  const phaseFor = (feature: FeatureFromApi) => getPhaseFromTaskId(feature.id) || 5;
  const blocked = features.filter((feature) => feature.status.status === "blocked");
  if (blocked.length > 0) return Math.min(...blocked.map(phaseFor));
  const inProgress = features.filter((feature) => feature.status.status === "in_progress");
  if (inProgress.length > 0) return Math.min(...inProgress.map(phaseFor));
  const pending = features.filter((feature) => feature.status.status === "pending");
  if (pending.length > 0) return Math.min(...pending.map(phaseFor));
  return 7;
}

function buildSnapshot(features: FeatureFromApi[]): ProjectRealtimeSnapshot {
  const total = features.length;
  const completed = features.filter((feature) => feature.status.status === "completed").length;
  const inProgress = features.filter((feature) => feature.status.status === "in_progress").length;
  const pending = features.filter((feature) => feature.status.status === "pending").length;
  const blocked = features.filter((feature) => feature.status.status === "blocked").length;
  const currentPhase = inferCurrentPhase(features);
  return {
    total,
    completed,
    inProgress,
    pending,
    blocked,
    overallProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
    currentPhase,
    currentPhaseLabel: PHASE_LABELS[currentPhase] || "Unknown",
    lastUpdated: new Date().toISOString(),
  };
}

export function ProjectRealtimeStatusProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const projectRoot = searchParams.get("project");
  const [snapshot, setSnapshot] = React.useState<ProjectRealtimeSnapshot>(DEFAULT_SNAPSHOT);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch(buildProjectScopedPath("/api/tasks", projectRoot), {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) return;
      const features = (payload.data?.features || []) as FeatureFromApi[];
      setSnapshot(buildSnapshot(features));
    } catch {}
  }, [projectRoot]);

  const { isConnected, isConnecting, reconnectAttempts } = useWebSocket({
    projectId: projectRoot || undefined,
    channels: ["task_updated", "phase_changed", "file_changed"],
    onTaskUpdated: () => {
      void refresh();
    },
    onPhaseChanged: () => {
      void refresh();
    },
    onFileChanged: (payload) => {
      if (payload.path?.includes("tasks.json") || payload.path?.includes("progress.txt")) {
        void refresh();
      }
    },
  });

  React.useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [refresh, projectRoot]);

  const contextValue = React.useMemo(
    () => ({
      snapshot,
      isConnected,
      isConnecting,
      reconnectAttempts,
      refresh,
    }),
    [snapshot, isConnected, isConnecting, reconnectAttempts, refresh]
  );

  return (
    <ProjectRealtimeStatusContext.Provider value={contextValue}>
      {children}
    </ProjectRealtimeStatusContext.Provider>
  );
}

export function useProjectRealtimeStatus() {
  return React.useContext(ProjectRealtimeStatusContext);
}
