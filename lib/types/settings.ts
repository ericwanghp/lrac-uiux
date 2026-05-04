export type ThemeMode = "dark" | "light";
export type NotificationLevel = "all" | "important" | "critical";
export type PhaseId = "1" | "2" | "2.5" | "3" | "4" | "5" | "6" | "7" | "8";

export interface ManagedToolConfig {
  id: string;
  enabled: boolean;
}

export interface PhaseDispatchEntry {
  phase: PhaseId;
  label: string;
  requiredAgents: string[];
  requiredSkills: string[];
  optionalSkills: string[];
}

export interface OrchestrationCatalogEntry {
  id: string;
  title: string;
  group: string;
  filePath: string;
}

export interface OrchestrationCatalog {
  agents: OrchestrationCatalogEntry[];
  skills: OrchestrationCatalogEntry[];
}

export interface OrchestrationSettings {
  agentConfigs: ManagedToolConfig[];
  skillConfigs: ManagedToolConfig[];
  phaseDispatch: PhaseDispatchEntry[];
}

export const DEFAULT_PHASE_DISPATCH: PhaseDispatchEntry[] = [
  {
    phase: "1",
    label: "Requirements Analysis",
    requiredAgents: ["business-analyst", "market-researcher"],
    requiredSkills: ["brainstorming"],
    optionalSkills: ["competitive-analysis"],
  },
  {
    phase: "2",
    label: "Product Design",
    requiredAgents: ["product-manager", "ux-designer"],
    requiredSkills: ["brainstorming"],
    optionalSkills: ["competitive-analysis"],
  },
  {
    phase: "2.5",
    label: "UI/UX Design",
    requiredAgents: ["ux-designer", "frontend-dev"],
    requiredSkills: ["ui-ux-pro-max", "enhance-prompt", "stitch-loop", "design-md"],
    optionalSkills: ["shadcn-ui"],
  },
  {
    phase: "3",
    label: "Architecture Design",
    requiredAgents: ["architect", "researcher", "architect-reviewer"],
    requiredSkills: ["writing-plans"],
    optionalSkills: [],
  },
  {
    phase: "4",
    label: "Task Breakdown",
    requiredAgents: ["architect"],
    requiredSkills: ["writing-plans"],
    optionalSkills: [],
  },
  {
    phase: "5",
    label: "Development & Unit Tests",
    requiredAgents: ["fullstack-dev", "code-reviewer"],
    requiredSkills: ["executing-plans", "tdd-enforcement", "verification-before-completion"],
    optionalSkills: ["systematic-debugging", "fix", "dispatching-parallel-agents"],
  },
  {
    phase: "6",
    label: "Integration & Regression Testing",
    requiredAgents: ["test-engineer", "test-automator"],
    requiredSkills: ["verification-before-completion"],
    optionalSkills: ["systematic-debugging", "dispatching-parallel-agents"],
  },
  {
    phase: "7",
    label: "Deploy & UAT",
    requiredAgents: ["devops-engineer", "product-manager"],
    requiredSkills: ["finishing-development-branch", "verification-before-completion"],
    optionalSkills: ["dispatching-parallel-agents"],
  },
  {
    phase: "8",
    label: "Project Management",
    requiredAgents: ["project-manager"],
    requiredSkills: ["dispatching-parallel-agents"],
    optionalSkills: ["toolchain-audit"],
  },
];

const DEFAULT_AGENT_CONFIGS = Array.from(
  new Set(DEFAULT_PHASE_DISPATCH.flatMap((entry) => entry.requiredAgents))
).map((id) => ({
  id,
  enabled: true,
}));

const DEFAULT_SKILL_CONFIGS = Array.from(
  new Set(
    DEFAULT_PHASE_DISPATCH.flatMap((entry) => [...entry.requiredSkills, ...entry.optionalSkills])
  )
).map((id) => ({
  id,
  enabled: true,
}));

export const DEFAULT_ORCHESTRATION_SETTINGS: OrchestrationSettings = {
  agentConfigs: DEFAULT_AGENT_CONFIGS,
  skillConfigs: DEFAULT_SKILL_CONFIGS,
  phaseDispatch: DEFAULT_PHASE_DISPATCH,
};

export interface UserSettings {
  theme: ThemeMode;
  fontSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  notificationLevel: NotificationLevel;
  compactMode: boolean;
  showLineNumbers: boolean;
  orchestration: OrchestrationSettings;
}

export interface UserSettingsEnvelope {
  version: "1.0";
  settings: UserSettings;
  updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "light",
  fontSize: 14,
  autoSave: true,
  autoSaveInterval: 30,
  desktopNotifications: true,
  soundEnabled: false,
  emailNotifications: false,
  notificationLevel: "important",
  compactMode: false,
  showLineNumbers: true,
  orchestration: DEFAULT_ORCHESTRATION_SETTINGS,
};
