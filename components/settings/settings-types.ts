import type { OrchestrationCatalog, ProjectMember, UserSettings } from "@/lib/types/settings";

export interface TaskIdSchemaData {
  format: string;
  firstIteration: string;
  regex: string;
  phaseSymbolMap: Record<string, number>;
  examples: string[];
}

export interface KeyboardShortcut {
  action: string;
  keys: string[];
  category: string;
}

export interface SettingsApiResponse {
  settings: UserSettings;
  version: string;
  updatedAt: string;
  catalog: OrchestrationCatalog;
}

export type SettingsPageState = {
  settings: UserSettings;
  catalog: OrchestrationCatalog;
  taskIdSchema: TaskIdSchemaData | null;
  taskIdSchemaError: string | null;
  passwordDrafts: Record<string, string>;
  availableRoles: string[];
};

export type SettingsPageActions = {
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateCommunicationSettings: (
    updater: (communication: UserSettings["communication"]) => UserSettings["communication"]
  ) => void;
  addMember: () => void;
  updateMember: (memberId: string, patch: Partial<ProjectMember>) => void;
  removeMember: (memberId: string) => void;
  togglePhaseApprover: (phase: string, memberId: string) => void;
  togglePhaseRequiredRole: (phase: string, role: string) => void;
  setMemberPassword: (memberId: string) => Promise<void>;
  setPasswordDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  persistSettings: (nextSettings: UserSettings) => Promise<void>;
};

export const TEAM_ROLE_STYLES: Record<string, { label: string; selectedClassName: string }> = {
  "business-owner": {
    label: "Business Owner",
    selectedClassName: "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-200",
  },
  "product-manager": {
    label: "Product Manager",
    selectedClassName: "border-violet-500/30 bg-violet-500/12 text-violet-700 dark:text-violet-200",
  },
  "design-reviewer": {
    label: "Design Reviewer",
    selectedClassName: "border-pink-500/30 bg-pink-500/12 text-pink-700 dark:text-pink-200",
  },
  "architect-reviewer": {
    label: "Architect Reviewer",
    selectedClassName: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-200",
  },
  "project-manager": {
    label: "Project Manager",
    selectedClassName: "border-indigo-500/30 bg-indigo-500/12 text-indigo-700 dark:text-indigo-200",
  },
  "qa-lead": {
    label: "QA Lead",
    selectedClassName: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
  },
  "ops-reviewer": {
    label: "Ops Reviewer",
    selectedClassName: "border-cyan-500/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200",
  },
  "project-sponsor": {
    label: "Project Sponsor",
    selectedClassName: "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-200",
  },
  reviewer: {
    label: "Reviewer",
    selectedClassName: "border-primary/30 bg-primary/12 text-primary",
  },
};

export function getRoleLabel(role: string): string {
  return TEAM_ROLE_STYLES[role]?.label ?? role;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { action: "Open global search", keys: ["Cmd", "K"], category: "Global" },
  { action: "Save current form", keys: ["Cmd", "S"], category: "Global" },
  { action: "Close modals", keys: ["Esc"], category: "Global" },
  { action: "Navigate between elements", keys: ["Tab"], category: "Global" },
  { action: "Activate buttons", keys: ["Enter", "Space"], category: "Global" },
  { action: "Navigate lists", keys: ["↑", "↓"], category: "Global" },
  { action: "New project", keys: ["Cmd", "N"], category: "Actions" },
  { action: "Open project", keys: ["Cmd", "O"], category: "Actions" },
  { action: "Toggle sidebar", keys: ["Cmd", "B"], category: "Actions" },
  { action: "Open settings", keys: ["Cmd", ","], category: "Actions" },
  { action: "Find in page", keys: ["Cmd", "F"], category: "Search" },
  { action: "Find and replace", keys: ["Cmd", "H"], category: "Search" },
  { action: "Next search result", keys: ["Cmd", "G"], category: "Search" },
  { action: "Previous search result", keys: ["Shift", "Cmd", "G"], category: "Search" },
];

export const panelClassName = "admin-panel border-border/80 bg-card/90";
export const triggerClassName =
  "justify-start rounded-2xl px-4 py-3 w-full text-muted-foreground transition-all hover:bg-accent/70 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/15";
export const rowClassName = "flex items-center justify-between gap-4 py-4 border-b border-border/80";
export const codeSurfaceClassName = "rounded-xl border border-border/80 bg-secondary/70 px-3 py-2";
