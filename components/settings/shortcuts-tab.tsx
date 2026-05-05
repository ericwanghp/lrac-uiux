"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { panelClassName } from "@/components/settings/settings-types";
import { KEYBOARD_SHORTCUTS } from "@/components/settings/settings-types";

export function ShortcutsTab() {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>View all available keyboard shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          {Array.from(new Set(KEYBOARD_SHORTCUTS.map((shortcut) => shortcut.category))).map(
            (category) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS.filter((shortcut) => shortcut.category === category).map(
                    (shortcut) => (
                      <div
                        key={`${shortcut.category}-${shortcut.action}`}
                        className="flex items-center justify-between border-b border-border/80 py-2 last:border-0"
                      >
                        <span className="text-sm text-foreground">{shortcut.action}</span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key) => (
                            <kbd
                              key={`${shortcut.action}-${key}`}
                              className="rounded-lg border border-border/80 bg-secondary/70 px-2 py-1 text-xs font-mono text-muted-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
