"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCurrentMember } from "@/components/providers/current-member-provider";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { useProjectRealtimeStatus } from "@/components/providers/project-realtime-status-provider";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
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
    name: "Inbox",
    href: "/inbox",
    icon: Bell,
    description: "Approvals & Messages",
  },
  {
    name: "Tasks Log",
    href: "/tasks-log",
    icon: TerminalSquare,
    description: "Status Monitor & Logs",
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const projectRoot = useProjectQueryParam();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const { member, unreadCount } = useCurrentMember();
  const { snapshot, isConnected } = useProjectRealtimeStatus();
  const phaseLabel = `P${Math.min(snapshot.currentPhase, 7)}`;

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navigationProjectRoot = isHydrated ? projectRoot : null;

  return (
    <nav
      className="admin-sidebar flex h-full w-72 flex-col"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex h-16 lg:h-20 items-center border-b border-border/60 px-4 lg:px-6">
        <Link
          href={buildProjectScopedPath("/dashboard", navigationProjectRoot)}
          onClick={onNavigate}
          className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label="LRAC Home"
        >
          <div
            className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl lg:rounded-2xl gradient-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/25"
            aria-hidden="true"
          >
            L
          </div>
          <div>
            <p className="admin-kicker text-[10px]">AI Requirement Studio</p>
            <span className="text-lg lg:text-xl font-bold tracking-tight">LRAC Console</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto" role="navigation">
        {navigation.map((item) => {
          const targetHref = buildProjectScopedPath(
            item.href,
            navigationProjectRoot
          );
          const isActive =
            pathname === item.href ||
            (item.href === "/tasks-log" && pathname === "/terminal");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={targetHref}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary/20 bg-gradient-to-r from-primary/16 via-primary/10 to-accent/24 text-foreground shadow-md shadow-primary/10"
                  : "border-transparent text-foreground/85 hover:border-border/60 hover:bg-card/50 hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={
                item.description
                  ? `${item.name}: ${item.description}`
                  : item.name
              }
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-primary"
                )}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.name}</div>
                {item.description && (
                  <div
                    className={cn(
                      "text-[11px] truncate",
                      isActive
                        ? "text-foreground/60"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </div>
                )}
              </div>
              {item.href === "/inbox" && member && unreadCount > 0 ? (
                <Badge variant="default" className="shrink-0 text-[10px]">
                  {unreadCount}
                </Badge>
              ) : null}
              {isActive ? (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)] shrink-0"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 p-3 lg:p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">v0.2.0</span>
          <Badge
            variant="secondary"
            className="gap-1.5 text-[10px]"
            title={isConnected ? "WebSocket live" : "Polling"}
            aria-label={`${isConnected ? "Live" : "Polling"}`}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isConnected
                  ? "bg-success shadow-[0_0_0_2px_hsl(var(--success)/0.16)]"
                  : "bg-warning"
              )}
              aria-hidden="true"
            />
            {isConnected ? "Live" : "Polling"}
          </Badge>
        </div>
        <div className="admin-panel-soft rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{phaseLabel}</span>
            <span>
              {snapshot.completed}/{snapshot.total}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background/70">
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
