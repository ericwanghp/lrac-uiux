"use client";

import * as React from "react";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/navigation/sidebar";
import { CurrentMemberProvider } from "@/components/providers/current-member-provider";
import { ProjectRealtimeStatusProvider } from "@/components/providers/project-realtime-status-provider";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import { CommandPalette } from "@/components/ui/command-palette";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <UiSettingsProvider>
      <CurrentMemberProvider>
        <ProjectRealtimeStatusProvider>
          <a href="#main-content" className="skip-link focus-indicator">
            Skip to main content
          </a>

          <div className="admin-shell flex h-screen overflow-hidden">
            <Suspense fallback={<div className="admin-sidebar h-full w-72 border-r border-border/80 bg-card/70" />}>
              <Sidebar />
            </Suspense>

            <div className="flex-1 flex flex-col overflow-hidden">
              <Suspense fallback={<div className="admin-topbar h-16 border-b border-border/80" />}>
                <Header />
              </Suspense>
              <main
                id="main-content"
                className="admin-main flex-1 overflow-y-auto bg-transparent"
                tabIndex={-1}
              >
                {children}
              </main>
            </div>
          </div>

          <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        </ProjectRealtimeStatusProvider>
      </CurrentMemberProvider>
    </UiSettingsProvider>
  );
}
