"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Palette,
  Building2,
  Code2,
  FlaskConical,
  Rocket,
  Users,
  TerminalSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useProjectRealtimeStatus } from "@/components/providers/project-realtime-status-provider";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Phase 1-2",
    href: "/requirements",
    icon: ClipboardList,
    description: "Requirements & Product",
  },
  {
    name: "Phase 2.5",
    href: "/design",
    icon: Palette,
    description: "UI/UX Design",
  },
  {
    name: "Phase 3-4",
    href: "/architecture",
    icon: Building2,
    description: "Architecture & Planning",
  },
  {
    name: "Phase 5",
    href: "/development",
    icon: Code2,
    description: "Development",
  },
  {
    name: "Phase 6",
    href: "/testing",
    icon: FlaskConical,
    description: "Testing",
  },
  {
    name: "Phase 7",
    href: "/deployment",
    icon: Rocket,
    description: "Deployment",
  },
  {
    name: "Phase 8",
    href: "/pm",
    icon: Users,
    description: "Project Management",
  },
  {
    name: "Tasks Log",
    href: "/tasks-log",
    icon: TerminalSquare,
    description: "Status Monitor & Logs",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectRoot = searchParams.get("project");
  const { snapshot, isConnected } = useProjectRealtimeStatus();
  const phaseLabel = `P${Math.min(snapshot.currentPhase, 7)}`;

  return (
    <nav className="admin-sidebar flex h-full w-72 flex-col" aria-label="Main navigation">
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-border/80 px-6">
        <Link
          href={buildProjectScopedPath("/", projectRoot)}
          className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label="LRAC Home"
        >
          <div
            className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30"
            aria-hidden="true"
          >
            L
          </div>
          <div>
            <p className="admin-kicker">AI Requirement Studio</p>
            <span className="text-xl font-bold tracking-tight">LRAC Console</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1 px-4 py-5 overflow-y-auto" role="navigation">
        {navigation.map((item) => {
          const targetHref = buildProjectScopedPath(item.href, projectRoot);
          const isActive =
            pathname === item.href || (item.href === "/tasks-log" && pathname === "/terminal");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={targetHref}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary/25 bg-gradient-to-r from-primary/20 via-primary/14 to-accent/30 text-foreground shadow-lg shadow-primary/15"
                  : "border-transparent text-foreground/90 hover:border-border/80 hover:bg-card/60 hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.description ? `${item.name}: ${item.description}` : item.name}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div>{item.name}</div>
                {item.description && (
                  <div
                    className={cn(
                      "text-xs",
                      isActive ? "text-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </div>
                )}
              </div>
              {isActive ? (
                <span
                  className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.16)]"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border/80 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Version 0.1.0</span>
          <Badge variant="secondary">{isConnected ? "Live" : "Syncing"}</Badge>
        </div>
        <div className="admin-panel-soft rounded-2xl px-3 py-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{phaseLabel}</span>
            <span>
              {snapshot.completed}/{snapshot.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
            <div
              className="gradient-progress h-full transition-all duration-500"
              style={{ width: `${snapshot.overallProgress}%` }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
