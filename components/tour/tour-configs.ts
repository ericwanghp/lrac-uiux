import type { TourConfig } from "./types";

export const dashboardTour: TourConfig = {
  tourId: "dashboard",
  steps: [
    {
      target: "[data-tour='create-project']",
      title: "Create New Project",
      content: "Create a new project scaffold — generates the directory structure, configuration files, and auto-coding setup to get started.",
      placement: "bottom",
    },
    {
      target: "[data-tour='project-switcher']",
      title: "Project Switcher",
      content:
        "Switch between workspace projects here. Enter a project path or click one of the discovered project buttons.",
      placement: "bottom",
    },
    {
      target: "[data-tour='milestone-tracks']",
      title: "Milestone Tracks",
      content: "Track overall development progress across all phases with visual milestone markers.",
      placement: "bottom",
    },
    {
      target: "[data-tour='project-metrics']",
      title: "Project Metrics",
      content:
        "Key metrics at a glance: tasks completed, current phase, overall progress, pending gates, and approval status.",
      placement: "bottom",
    },
    {
      target: "[data-tour='project-context']",
      title: "Project Context",
      content: "View the current project's root path, phase, and task completion details.",
      placement: "right",
    },
    {
      target: "[data-tour='approval-gates']",
      title: "Approval Gates",
      content: "Pending phase approval gates appear here. Approve or reject to unblock the next phase.",
      placement: "left",
    },
    {
      target: "[data-tour='recent-activity']",
      title: "Recent Activity",
      content: "Latest updates and completions from the development workflow.",
      placement: "left",
    },
    {
      target: "[data-tour='sidebar']",
      title: "Navigation Sidebar",
      content: "Navigate between all phases and features: Requirements, Design, Architecture, Development, Testing, Deployment, and more.",
      placement: "right",
    },
    {
      target: "[data-tour='header-actions']",
      title: "Quick Actions",
      content: "Access Claude Code terminal, shell, member sign-in, and settings from the top bar.",
      placement: "bottom",
    },
  ],
};

export const requirementsTour: TourConfig = {
  tourId: "requirements",
  steps: [
    {
      target: "[data-tour='phase-header']",
      title: "Phase 1-2: Requirements & Product",
      content:
        "This page covers business requirements (BRD) and product requirements (PRD). The phase status badge shows completion state.",
      placement: "bottom",
    },
    {
      target: "[data-tour='phase-sessions']",
      title: "Session Logs",
      content: "Review past requirement-gathering sessions with execution details and timestamps.",
      placement: "bottom",
    },
    {
      target: "[data-tour='phase-artifacts']",
      title: "Requirement Artifacts",
      content: "Generated BRD, PRD, and research documents are listed here for review.",
      placement: "bottom",
    },
  ],
};

export const designTour: TourConfig = {
  tourId: "design",
  steps: [
    {
      target: "[data-tour='design-viewer']",
      title: "Design Preview",
      content: "Preview generated UI designs from Stitch. Navigate between versions with arrows or the dropdown selector.",
      placement: "bottom",
    },
    {
      target: "[data-tour='design-logs']",
      title: "Design Phase Logs",
      content: "Session logs and tool execution records from the UI/UX design phase.",
      placement: "bottom",
    },
    {
      target: "[data-tour='design-artifacts']",
      title: "Design Artifacts",
      content: "Design documents, design system specs, and prototype files produced during Phase 2.5.",
      placement: "bottom",
    },
  ],
};

export const architectureTour: TourConfig = {
  tourId: "architecture",
  steps: [
    {
      target: "[data-tour='phase-header']",
      title: "Phase 3-4: Architecture & Planning",
      content:
        "Technical architecture documents and task breakdown live here. Architecture must be reviewed before proceeding to development.",
      placement: "bottom",
    },
    {
      target: "[data-tour='phase-artifacts']",
      title: "Architecture Artifacts",
      content: "Architecture docs and task breakdown documents for developer reference.",
      placement: "bottom",
    },
  ],
};

export const developmentTour: TourConfig = {
  tourId: "development",
  steps: [
    {
      target: "[data-tour='phase-header']",
      title: "Phase 5: Development",
      content: "Active development tasks, code execution logs, and feature completion tracking.",
      placement: "bottom",
    },
    {
      target: "[data-tour='phase-logs']",
      title: "Development Logs",
      content: "Real-time logs from AI coding agents and IDE interactions during development.",
      placement: "bottom",
    },
  ],
};

export const testingTour: TourConfig = {
  tourId: "testing",
  steps: [
    {
      target: "[data-tour='phase-header']",
      title: "Phase 6: Testing",
      content: "Integration tests, regression suites, and quality gate results are tracked here.",
      placement: "bottom",
    },
  ],
};

export const deploymentTour: TourConfig = {
  tourId: "deployment",
  steps: [
    {
      target: "[data-tour='phase-header']",
      title: "Phase 7: Deployment & UAT",
      content: "Deployment status, UAT verification results, and rollback controls.",
      placement: "bottom",
    },
  ],
};

export const inboxTour: TourConfig = {
  tourId: "inbox",
  steps: [
    {
      target: "[data-tour='inbox-header']",
      title: "Team Inbox",
      content: "Approval requests from AI agents appear here. Review and respond to keep the workflow moving.",
      placement: "bottom",
    },
    {
      target: "[data-tour='inbox-message']",
      title: "Message Actions",
      content: "Each message supports: Mark Read, Approve, Request Revision, or Reject. Add optional comments before acting.",
      placement: "bottom",
    },
  ],
};

export const settingsTour: TourConfig = {
  tourId: "settings",
  steps: [
    {
      target: "[data-tour='settings-tabs']",
      title: "Settings Tabs",
      content: "Configure general preferences, appearance, notifications, team roles, approval rules, and integrations.",
      placement: "bottom",
    },
    {
      target: "[data-tour='settings-replay-tours']",
      title: "Replay Tours",
      content: "Use this option to replay all onboarding tours if you want a refresher on system features.",
      placement: "bottom",
    },
  ],
}

const tourMap: Record<string, TourConfig> = {
  "/dashboard": dashboardTour,
  "/requirements": requirementsTour,
  "/design": designTour,
  "/architecture": architectureTour,
  "/development": developmentTour,
  "/testing": testingTour,
  "/deployment": deploymentTour,
  "/inbox": inboxTour,
  "/settings": settingsTour,
};

export function getTourForPath(pathname: string): TourConfig | null {
  return tourMap[pathname] ?? null;
}

export function getAllTourConfigs(): TourConfig[] {
  return Object.values(tourMap);
}
