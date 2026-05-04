export type ThemeMode = "dark" | "light";
export type NotificationLevel = "all" | "important" | "critical";
export type PhaseId = "1" | "2" | "2.5" | "3" | "4" | "5" | "6" | "7" | "8";
export type StakeholderKind = "internal" | "external";
export type CommunicationChannelType = "generic-webhook" | "slack-webhook" | "email";

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

export interface StakeholderContact {
  id: string;
  name: string;
  role: string;
  kind: StakeholderKind;
  email?: string;
  webhookUrl?: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  active: boolean;
}

export interface CommunicationChannelConfig {
  id: string;
  label: string;
  type: CommunicationChannelType;
  enabled: boolean;
  webhookUrl?: string;
  recipient?: string;
  secret?: string;
}

export interface PhaseApprovalPolicy {
  phase: PhaseId;
  label: string;
  enabled: boolean;
  requiredRoles: string[];
  approverIds: string[];
}

export interface CommunicationSettings {
  members: ProjectMember[];
  stakeholders: StakeholderContact[];
  channels: CommunicationChannelConfig[];
  phaseApprovals: PhaseApprovalPolicy[];
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

export const DEFAULT_PHASE_APPROVAL_POLICIES: PhaseApprovalPolicy[] = [
  { phase: "1", label: "Requirements Analysis", enabled: true, requiredRoles: ["business-owner"], approverIds: [] },
  { phase: "2", label: "Product Design", enabled: true, requiredRoles: ["product-manager"], approverIds: [] },
  { phase: "2.5", label: "UI/UX Design", enabled: true, requiredRoles: ["design-reviewer"], approverIds: [] },
  { phase: "3", label: "Architecture Design", enabled: true, requiredRoles: ["architect-reviewer"], approverIds: [] },
  { phase: "4", label: "Task Breakdown", enabled: false, requiredRoles: ["project-manager"], approverIds: [] },
  { phase: "5", label: "Development & Unit Tests", enabled: true, requiredRoles: ["qa-lead"], approverIds: [] },
  { phase: "6", label: "Integration & Regression Testing", enabled: true, requiredRoles: ["qa-lead"], approverIds: [] },
  { phase: "7", label: "Deploy & UAT", enabled: true, requiredRoles: ["ops-reviewer"], approverIds: [] },
  { phase: "8", label: "Project Management", enabled: false, requiredRoles: ["project-sponsor"], approverIds: [] },
];

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  members: [],
  stakeholders: [],
  channels: [
    {
      id: "default-webhook",
      label: "Default Webhook",
      type: "generic-webhook",
      enabled: false,
      webhookUrl: "",
      secret: "",
    },
  ],
  phaseApprovals: DEFAULT_PHASE_APPROVAL_POLICIES,
};

export function normalizeCommunicationSettings(
  communication?: Partial<CommunicationSettings>
): CommunicationSettings {
  const policyByPhase = new Map(
    (communication?.phaseApprovals ?? []).map((policy) => [policy.phase, policy])
  );

  return {
    members: Array.isArray(communication?.members) ? communication.members : [],
    stakeholders: Array.isArray(communication?.stakeholders) ? communication.stakeholders : [],
    channels:
      Array.isArray(communication?.channels) && communication.channels.length > 0
        ? communication.channels
        : DEFAULT_COMMUNICATION_SETTINGS.channels,
    phaseApprovals: DEFAULT_PHASE_APPROVAL_POLICIES.map((policy) => {
      const override = policyByPhase.get(policy.phase);
      return override
        ? {
            ...policy,
            ...override,
            requiredRoles: Array.isArray(override.requiredRoles)
              ? override.requiredRoles
              : policy.requiredRoles,
            approverIds: Array.isArray(override.approverIds) ? override.approverIds : policy.approverIds,
          }
        : policy;
    }),
  };
}

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
  communication: CommunicationSettings;
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
  communication: DEFAULT_COMMUNICATION_SETTINGS,
};
