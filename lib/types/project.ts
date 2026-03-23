export type ProjectOption = {
  root: string;
  name: string;
};

export type ProjectSignal =
  | ".auto-coding/tasks.json"
  | ".auto-coding"
  | "package.json"
  | "CLAUDE.md"
  | "AGENTS.md"
  | "docs"
  | ".stitch";

export type ProjectDescriptor = ProjectOption & {
  signals: ProjectSignal[];
  hasTasksJson: boolean;
};

export type ProjectStatistics = {
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  pendingFeatures: number;
  blockedFeatures: number;
  overallProgress: number;
};

export type ProjectParallelGroupSummary = {
  name: string;
  total: number;
  completed: number;
  status: string;
};

export type ProjectOverview = {
  project: string;
  version: string;
  currentProjectRoot: string;
  availableProjects: ProjectOption[];
  statistics: ProjectStatistics;
  currentPhase: string;
  parallelGroups: ProjectParallelGroupSummary[];
};
