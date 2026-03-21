/**
 * TypeScript types for tasks.json v3.0
 * Based on architecture specification
 */

export type FeatureStatus = "pending" | "in_progress" | "completed" | "blocked";
export type FeaturePriority = "critical" | "high" | "medium" | "low";

export interface TaskBreakdown {
  dependencies: string[];
  parallelGroup: string | null;
}

export interface AcceptanceCriteria {
  criteria: string[];
}

export interface BlockReason {
  type: string;
  description: string;
  reportedAt: string;
  reportedBy: string;
  resolution: string | null;
  needsHumanIntervention: boolean;
}

export interface ResumeContext {
  lastStep: string;
  nextStep: string;
  partialWork: string;
  filesModified: string[];
  suggestedActions: string[];
}

export interface ExecutionHistoryEntry {
  timestamp: string;
  action: string;
  details: string;
}

export interface Timeline {
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface FeatureStatusInfo {
  status: FeatureStatus;
  passes: boolean;
  blockReason: BlockReason | null;
  resumeContext: ResumeContext | null;
}

export interface Feature {
  id: string;
  title: string;
  summary: string;
  ownerRole: string;
  priority: FeaturePriority;
  taskBreakdown: TaskBreakdown;
  acceptanceCriteria: AcceptanceCriteria;
  timeline: Timeline;
  status: FeatureStatusInfo;
  metadata?: {
    optional?: boolean;
  };
  executionHistory: ExecutionHistoryEntry[];
}

export interface ParallelGroup {
  name: string;
  features: string[];
  canStartWhen: string[];
  status: "pending" | "ready" | "in_progress" | "completed";
  completedFeatures?: string[];
  remainingFeatures?: string[];
}

export interface TasksJson {
  version: "3.0";
  project: string;
  parallelGroups: Record<string, ParallelGroup>;
  features: Feature[];
}
