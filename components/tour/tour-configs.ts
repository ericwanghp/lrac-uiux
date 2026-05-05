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
      target: "[data-tour='approval-gates']",
      title: "Approval Gates",
      content: "Pending phase approval gates appear here. Approve or reject to unblock the next phase.",
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
    {
      target: "[data-tour='sidebar-requirements']",
      title: "Phase 1-2: Requirements & Product",
      content: "Start creating and managing project requirements.",
      placement: "right",
    },
  ],
};

const tourMap: Record<string, TourConfig> = {
  "/dashboard": dashboardTour,
};

export function getTourForPath(pathname: string): TourConfig | null {
  return tourMap[pathname] ?? null;
}

export function getAllTourConfigs(): TourConfig[] {
  return Object.values(tourMap);
}
