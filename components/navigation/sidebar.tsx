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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useProjectRealtimeStatus } from "@/components/providers/project-realtime-status-provider";

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
    name: "Terminal",
    href: "/terminal",
    icon: TerminalSquare,
    description: "Execution Monitor",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { snapshot, isConnected } = useProjectRealtimeStatus();
  const phaseLabel = `P${Math.min(snapshot.currentPhase, 7)}`;

  return (
    <nav
      className="flex h-full w-64 flex-col bg-secondary border-r border-border"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link
          href="/"
          className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label="LRAC Home"
        >
          <div
            className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold"
            aria-hidden="true"
          >
            L
          </div>
          <span className="text-xl font-bold">LRAC</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1 px-3 py-4 overflow-y-auto" role="navigation">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.description ? `${item.name}: ${item.description}` : item.name}
            >
              <Icon className="mr-3 h-4 w-4" aria-hidden="true" />
              <div className="flex-1">
                <div>{item.name}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Version 0.1.0</span>
          <Badge variant="secondary">{isConnected ? "Live" : "Syncing"}</Badge>
        </div>
        <div className="rounded border border-border px-2 py-2 bg-background/60">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{phaseLabel}</span>
            <span>
              {snapshot.completed}/{snapshot.total}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${snapshot.overallProgress}%` }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
