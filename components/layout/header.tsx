"use client";

import { useRouter } from "next/navigation";
import { Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MemberAuthPanel } from "@/components/layout/member-auth-panel";
import { ClaudeCliLauncher } from "@/components/claude-cli/claude-cli-launcher";
import { ShellLauncher } from "@/components/shell/shell-launcher";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { GlobalProjectSwitcher } from "@/components/shared/global-project-switcher";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import { useProjectRealtimeStatus } from "@/components/providers/project-realtime-status-provider";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const projectRoot = useProjectQueryParam();
  const { snapshot } = useProjectRealtimeStatus();
  const phaseText = `Phase ${Math.min(snapshot.currentPhase, 7)}: ${snapshot.currentPhaseLabel}`;

  return (
    <header
      className="admin-topbar sticky top-0 z-30 h-14 lg:h-16 border-b border-border/60 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2"
      role="banner"
    >
      <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 h-9 w-9"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search - hidden on small screens */}
        <div className="hidden sm:block flex-1 max-w-md min-w-0">
          <label htmlFor="header-search" className="sr-only">
            Search features, tasks, or docs
          </label>
          <Input
            id="header-search"
            type="search"
            placeholder="Search features, tasks, or docs..."
            className="admin-input h-9 w-full border-border/60 bg-background/80 text-sm"
            aria-label="Search features, tasks, or docs"
          />
        </div>

        <div className="hidden sm:block">
          <GlobalProjectSwitcher />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4" role="group" aria-label="Header actions">
        <ClaudeCliLauncher projectRoot={projectRoot} />
        <ShellLauncher projectRoot={projectRoot} />

        {/* Phase Indicator */}
        <Badge
          variant="default"
          className="hidden md:flex text-xs"
          aria-label={`Current phase: ${phaseText}`}
        >
          {phaseText}
        </Badge>

        <MemberAuthPanel />

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={() => router.push(buildProjectScopedPath("/settings", projectRoot))}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 w-9"
        >
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
