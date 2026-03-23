"use client";

import * as React from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/ui/command-palette";
import { ProjectRealtimeStatusProvider } from "@/components/providers/project-realtime-status-provider";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  // Global keyboard listener for Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <UiSettingsProvider>
          <ProjectRealtimeStatusProvider>
            <a href="#main-content" className="skip-link focus-indicator">
              Skip to main content
            </a>

            <div className="admin-shell flex h-screen overflow-hidden">
              <Sidebar />

              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main
                  id="main-content"
                  className="admin-main flex-1 overflow-y-auto bg-transparent"
                  tabIndex={-1}
                >
                  {children}
                </main>
              </div>
            </div>
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
            />
          </ProjectRealtimeStatusProvider>
        </UiSettingsProvider>
      </body>
    </html>
  );
}
