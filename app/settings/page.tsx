"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  Keyboard,
  Mail,
  Monitor,
  Moon,
  Palette,
  Plug,
  Save,
  Settings,
  Smartphone,
  Sun,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_USER_SETTINGS } from "@/lib/types/settings";
import type { UserSettings } from "@/lib/types/settings";
import { applyDocumentUiSettings } from "@/lib/utils/theme";

interface TaskIdSchemaData {
  format: string;
  firstIteration: string;
  regex: string;
  phaseSymbolMap: Record<string, number>;
  examples: string[];
}

interface KeyboardShortcut {
  action: string;
  keys: string[];
  category: string;
}

const keyboardShortcuts: KeyboardShortcut[] = [
  { action: "Open global search", keys: ["Cmd", "K"], category: "Global" },
  { action: "Save current form", keys: ["Cmd", "S"], category: "Global" },
  { action: "Close modals", keys: ["Esc"], category: "Global" },
  { action: "Navigate between elements", keys: ["Tab"], category: "Global" },
  { action: "Activate buttons", keys: ["Enter"], category: "Global" },
  { action: "Activate buttons", keys: ["Space"], category: "Global" },
  { action: "Navigate lists", keys: ["↑"], category: "Global" },
  { action: "Navigate lists", keys: ["↓"], category: "Global" },
  { action: "New project", keys: ["Cmd", "N"], category: "Actions" },
  { action: "Open project", keys: ["Cmd", "O"], category: "Actions" },
  { action: "Toggle sidebar", keys: ["Cmd", "B"], category: "Actions" },
  { action: "Open settings", keys: ["Cmd", ","], category: "Actions" },
  { action: "Find in page", keys: ["Cmd", "F"], category: "Search" },
  { action: "Find and replace", keys: ["Cmd", "H"], category: "Search" },
  { action: "Next search result", keys: ["Cmd", "G"], category: "Search" },
  { action: "Previous search result", keys: ["Shift", "Cmd", "G"], category: "Search" },
];

const panelClassName = "admin-panel border-border/80 bg-card/90";
const triggerClassName =
  "justify-start rounded-2xl px-4 py-3 w-full text-muted-foreground transition-all hover:bg-accent/70 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/15";
const rowClassName = "flex items-center justify-between gap-4 py-4 border-b border-border/80";
const codeSurfaceClassName = "rounded-xl border border-border/80 bg-secondary/70 px-3 py-2";

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload.data as T;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [taskIdSchema, setTaskIdSchema] = useState<TaskIdSchemaData | null>(null);
  const [taskIdSchemaError, setTaskIdSchemaError] = useState<string | null>(null);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setIsLoading(true);
        const [settingsData, taskIdData] = await Promise.all([
          fetchJson<{ settings: UserSettings }>("/api/settings"),
          fetchJson<TaskIdSchemaData>("/api/meta/task-id-schema"),
        ]);

        setSettings(settingsData.settings);
        setTaskIdSchema(taskIdData);
        setTaskIdSchemaError(null);
      } catch (error) {
        setTaskIdSchemaError(error instanceof Error ? error.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPageData();
  }, []);

  useEffect(() => {
    applyDocumentUiSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (saveStatus === "idle") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSaveStatus("idle");
      setSaveMessage(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const persistSettings = async (nextSettings: UserSettings) => {
    setSaveStatus("saving");
    setSaveMessage("Saving...");
    setSettings(nextSettings);

    try {
      const payload = await fetchJson<{ settings: UserSettings }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(nextSettings),
      });
      setSettings(payload.settings);
      applyDocumentUiSettings(payload.settings);
      window.dispatchEvent(
        new CustomEvent("lrac:settings-updated", {
          detail: payload.settings,
        })
      );
      setSaveStatus("saved");
      setSaveMessage("Settings saved");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "Failed to save settings");
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    void persistSettings({ ...settings, [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="admin-page min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="admin-kicker mb-2">Workspace Preferences</p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Project-scoped preferences are now persisted through the admin backend.
            </p>
          </div>
          {saveMessage ? (
            <div
              className={
                saveStatus === "error"
                  ? "rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
                  : "rounded-xl border border-border/80 bg-card/90 px-4 py-2 text-sm text-muted-foreground shadow-sm"
              }
            >
              {saveMessage}
            </div>
          ) : null}
        </div>

        <Tabs defaultValue="general" orientation="vertical" className="flex gap-6">
          <TabsList className="flex h-auto w-64 flex-col gap-1 bg-transparent">
            <TabsTrigger value="general" className={triggerClassName}>
              <Settings className="mr-3 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className={triggerClassName}>
              <Palette className="mr-3 h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className={triggerClassName}>
              <Bell className="mr-3 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className={triggerClassName}>
              <Keyboard className="mr-3 h-4 w-4" />
              Shortcuts
            </TabsTrigger>
            <TabsTrigger value="integrations" className={triggerClassName}>
              <Plug className="mr-3 h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <div className="flex-1">
            <TabsContent value="general" className="space-y-6">
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
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={rowClassName}>
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-foreground">
                        {settings.theme === "dark" ? (
                          <Moon className="h-4 w-4" />
                        ) : (
                          <Sun className="h-4 w-4" />
                        )}
                        Theme
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Choose the default shell theme for the full admin console
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={settings.theme === "dark" ? "default" : "outline"}
                        onClick={() => updateSetting("theme", "dark")}
                        className="min-w-24"
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        size="sm"
                        variant={settings.theme === "light" ? "default" : "outline"}
                        onClick={() => updateSetting("theme", "light")}
                        className="min-w-24"
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                    </div>
                  </div>

                  <div className="border-b border-border/80 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-foreground">Terminal Font Size</Label>
                      <span className="text-sm font-medium text-primary">
                        {settings.fontSize}px
                      </span>
                    </div>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={(value) => {
                        if (value[0]) {
                          updateSetting("fontSize", value[0]);
                        }
                      }}
                      min={12}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className={rowClassName}>
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Monitor className="h-4 w-4" />
                        Compact Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Reduce spacing for denser information display
                      </p>
                    </div>
                    <Switch
                      checked={settings.compactMode}
                      onCheckedChange={(checked) => updateSetting("compactMode", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Smartphone className="h-4 w-4" />
                        Show Line Numbers
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Display line numbers in code editors
                      </p>
                    </div>
                    <Switch
                      checked={settings.showLineNumbers}
                      onCheckedChange={(checked) => updateSetting("showLineNumbers", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={rowClassName}>
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Monitor className="h-4 w-4" />
                        Desktop Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Show desktop notifications for important events
                      </p>
                    </div>
                    <Switch
                      checked={settings.desktopNotifications}
                      onCheckedChange={(checked) => updateSetting("desktopNotifications", checked)}
                    />
                  </div>

                  <div className={rowClassName}>
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Volume2 className="h-4 w-4" />
                        Sound
                      </Label>
                      <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                    </div>
                    <Switch
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
                    />
                  </div>

                  <div className={rowClassName}>
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates for critical events
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                    />
                  </div>

                  <div className="py-4">
                    <Label className="mb-3 block text-foreground">Notification Level</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["all", "important", "critical"] as const).map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={settings.notificationLevel === level ? "default" : "outline"}
                          onClick={() => updateSetting("notificationLevel", level)}
                          className="capitalize"
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {settings.notificationLevel === "all" && "Receive all notifications"}
                      {settings.notificationLevel === "important" && "Only important notifications"}
                      {settings.notificationLevel === "critical" && "Only critical notifications"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shortcuts" className="space-y-6">
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Keyboard Shortcuts</CardTitle>
                  <CardDescription>View all available keyboard shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.from(new Set(keyboardShortcuts.map((shortcut) => shortcut.category))).map(
                    (category) => (
                      <div key={category} className="mb-6 last:mb-0">
                        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {keyboardShortcuts
                            .filter((shortcut) => shortcut.category === category)
                            .map((shortcut) => (
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
                            ))}
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>Manage third-party integrations and connections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={rowClassName}>
                    <div className="flex items-center gap-4">
                      <div className="admin-icon-surface h-12 w-12">
                        <svg
                          className="h-6 w-6 text-foreground"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">GitHub</p>
                        <p className="text-sm text-muted-foreground">
                          Connect to GitHub repositories
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Connect
                    </Button>
                  </div>

                  <div className={rowClassName}>
                    <div className="flex items-center gap-4">
                      <div className="admin-icon-surface h-12 w-12">
                        <svg
                          className="h-6 w-6 text-primary"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-8.46 7.75-3.684-2.804a1.498 1.498 0 0 0-1.925.09L.273 8.477A1.5 1.5 0 0 0 0 9.611v4.778a1.5 1.5 0 0 0 .273.876l2.162 2.235a1.5 1.5 0 0 0 1.925.09l3.684-2.804 8.46 7.75a1.494 1.494 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 18.56V5.44a1.5 1.5 0 0 0-.85-1.353zM9 15.586L3 11.59V8.41l6-3.997v11.173zm6-3.998l3-2.002v2.828l-3 2.002v-2.828zm0-6.001l3 2.002v2.828l-3-2.002V5.587z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">VS Code</p>
                        <p className="text-sm text-muted-foreground">Connect to VS Code editor</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Connect
                    </Button>
                  </div>

                  <div className="py-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="admin-icon-surface h-12 w-12">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">API Keys</p>
                        <p className="text-sm text-muted-foreground">
                          Manage API keys for integrations
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="gradient-primary text-white">
                      Manage API Keys
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
