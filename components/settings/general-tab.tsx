"use client";

import { Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "@/lib/types/settings";
import type { TaskIdSchemaData } from "@/components/settings/settings-types";
import { codeSurfaceClassName, panelClassName, rowClassName } from "@/components/settings/settings-types";

interface GeneralTabProps {
  settings: UserSettings;
  taskIdSchema: TaskIdSchemaData | null;
  taskIdSchemaError: string | null;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function GeneralTab({ settings, taskIdSchema, taskIdSchemaError, updateSetting }: GeneralTabProps) {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure your general preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={rowClassName}>
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                <Save className="h-4 w-4" />
                Auto-save
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically save changes as you work
              </p>
            </div>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(checked) => updateSetting("autoSave", checked)}
            />
          </div>

          {settings.autoSave ? (
            <div className="border-b border-border/80 py-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-foreground">Auto-save Interval</Label>
                <span className="text-sm font-medium text-primary">
                  {settings.autoSaveInterval} seconds
                </span>
              </div>
              <Slider
                value={[settings.autoSaveInterval]}
                onValueChange={(value) => {
                  if (value[0]) {
                    updateSetting("autoSaveInterval", value[0]);
                  }
                }}
                min={10}
                max={120}
                step={10}
                className="w-full"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Task ID Schema</CardTitle>
          <CardDescription>
            Naming convention shared by tasks.json, templates, and IMAC tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taskIdSchemaError ? (
            <p className="text-sm text-destructive">{taskIdSchemaError}</p>
          ) : !taskIdSchema ? (
            <p className="text-sm text-muted-foreground">Loading schema...</p>
          ) : (
            <>
              <div className={codeSurfaceClassName}>
                <p className="text-xs text-muted-foreground">Format</p>
                <p className="font-mono text-sm text-primary">{taskIdSchema.format}</p>
              </div>
              <div className={codeSurfaceClassName}>
                <p className="text-xs text-muted-foreground">First Iteration</p>
                <p className="font-mono text-sm text-foreground">
                  {taskIdSchema.firstIteration}
                </p>
              </div>
              <div className={codeSurfaceClassName}>
                <p className="text-xs text-muted-foreground">Regex</p>
                <p className="font-mono text-xs text-foreground break-all">
                  /{taskIdSchema.regex}/
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Phase Symbols</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(taskIdSchema.phaseSymbolMap).map(([symbol, phase]) => (
                    <div
                      key={symbol}
                      className={`${codeSurfaceClassName} flex items-center justify-between`}
                    >
                      <span className="font-mono text-xs text-primary">{symbol}</span>
                      <span className="text-xs text-muted-foreground">Phase {phase}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Examples</p>
                <div className="space-y-1">
                  {taskIdSchema.examples.map((example) => (
                    <p
                      key={example}
                      className="rounded-lg border border-border/80 bg-secondary/70 px-2 py-1 font-mono text-xs text-muted-foreground"
                    >
                      {example}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
