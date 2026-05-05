"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Keyboard,
  KeyRound,
  Mail,
  Monitor,
  Moon,
  Palette,
  Plug,
  Save,
  Settings,
  Smartphone,
  Sun,
  UserRound,
  Users,
  Volume2,
  Workflow,
} from "lucide-react";
import { OrchestrationSettingsPanel } from "@/components/settings/orchestration-settings-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_USER_SETTINGS } from "@/lib/types/settings";
import type { OrchestrationCatalog, ProjectMember, UserSettings } from "@/lib/types/settings";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
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

interface SettingsApiResponse {
  settings: UserSettings;
  version: string;
  updatedAt: string;
  catalog: OrchestrationCatalog;
}

const keyboardShortcuts: KeyboardShortcut[] = [
  { action: "Open global search", keys: ["Cmd", "K"], category: "Global" },
  { action: "Save current form", keys: ["Cmd", "S"], category: "Global" },
  { action: "Close modals", keys: ["Esc"], category: "Global" },
  { action: "Navigate between elements", keys: ["Tab"], category: "Global" },
  { action: "Activate buttons", keys: ["Enter", "Space"], category: "Global" },
  { action: "Navigate lists", keys: ["↑", "↓"], category: "Global" },
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

const TEAM_ROLE_STYLES: Record<string, { label: string; selectedClassName: string }> = {
  "business-owner": {
    label: "Business Owner",
    selectedClassName: "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-200",
  },
  "product-manager": {
    label: "Product Manager",
    selectedClassName: "border-violet-500/30 bg-violet-500/12 text-violet-700 dark:text-violet-200",
  },
  "design-reviewer": {
    label: "Design Reviewer",
    selectedClassName: "border-pink-500/30 bg-pink-500/12 text-pink-700 dark:text-pink-200",
  },
  "architect-reviewer": {
    label: "Architect Reviewer",
    selectedClassName: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-200",
  },
  "project-manager": {
    label: "Project Manager",
    selectedClassName: "border-indigo-500/30 bg-indigo-500/12 text-indigo-700 dark:text-indigo-200",
  },
  "qa-lead": {
    label: "QA Lead",
    selectedClassName: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
  },
  "ops-reviewer": {
    label: "Ops Reviewer",
    selectedClassName: "border-cyan-500/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200",
  },
  "project-sponsor": {
    label: "Project Sponsor",
    selectedClassName: "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-200",
  },
  reviewer: {
    label: "Reviewer",
    selectedClassName: "border-primary/30 bg-primary/12 text-primary",
  },
};

function getRoleLabel(role: string) {
  return TEAM_ROLE_STYLES[role]?.label ?? role;
}

function getAvailableRoles(settings: UserSettings) {
  return Array.from(
    new Set([
      ...Object.keys(TEAM_ROLE_STYLES),
      ...settings.communication.members.flatMap((member) => member.roles ?? []),
      ...settings.communication.phaseApprovals.flatMap((policy) => policy.requiredRoles),
    ])
  ).sort((left, right) => getRoleLabel(left).localeCompare(getRoleLabel(right)));
}

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
  const projectRoot = useProjectQueryParam();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [catalog, setCatalog] = useState<OrchestrationCatalog>({ agents: [], skills: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [taskIdSchema, setTaskIdSchema] = useState<TaskIdSchemaData | null>(null);
  const [taskIdSchemaError, setTaskIdSchemaError] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const scopedPath = (path: string) => buildProjectScopedPath(path, projectRoot);
  const availableRoles = getAvailableRoles(settings);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setIsLoading(true);
        const [settingsData, taskIdData] = await Promise.all([
          fetchJson<SettingsApiResponse>(scopedPath("/api/settings")),
          fetchJson<TaskIdSchemaData>("/api/meta/task-id-schema"),
        ]);

        const migrated = settingsData.settings;
        migrated.communication.members = migrated.communication.members.map((m) => {
          const member = m as ProjectMember & { role?: string };
          return {
            ...member,
            roles: member.roles ?? (member.role ? [member.role] : []),
          };
        });
        setSettings(migrated);
        setCatalog(settingsData.catalog);
        setTaskIdSchema(taskIdData);
        setTaskIdSchemaError(null);
      } catch (error) {
        setTaskIdSchemaError(error instanceof Error ? error.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPageData();
  }, [projectRoot]);

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
      const payload = await fetchJson<SettingsApiResponse>(scopedPath("/api/settings"), {
        method: "PATCH",
        body: JSON.stringify(nextSettings),
      });
      setSettings(payload.settings);
      setCatalog(payload.catalog);
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

  const updateCommunicationSettings = (
    updater: (communication: UserSettings["communication"]) => UserSettings["communication"]
  ) => {
    void persistSettings({
      ...settings,
      communication: updater(settings.communication),
    });
  };

  const addMember = () => {
    const nextIndex = settings.communication.members.length + 1;
    const nextMember: ProjectMember = {
      id: `member-${nextIndex}`,
      name: `Member ${nextIndex}`,
      roles: ["reviewer"],
      email: "",
      active: true,
    };
    updateCommunicationSettings((communication) => ({
      ...communication,
      members: [...communication.members, nextMember],
    }));
  };

  const updateMember = (memberId: string, patch: Partial<ProjectMember>) => {
    updateCommunicationSettings((communication) => ({
      ...communication,
      members: communication.members.map((member) =>
        member.id === memberId ? { ...member, ...patch } : member
      ),
    }));
  };

  const removeMember = (memberId: string) => {
    updateCommunicationSettings((communication) => ({
      ...communication,
      members: communication.members.filter((member) => member.id !== memberId),
      phaseApprovals: communication.phaseApprovals.map((policy) => ({
        ...policy,
        approverIds: policy.approverIds.filter((id) => id !== memberId),
      })),
    }));
  };

  const togglePhaseApprover = (phase: string, memberId: string) => {
    updateCommunicationSettings((communication) => ({
      ...communication,
      phaseApprovals: communication.phaseApprovals.map((policy) => {
        if (policy.phase !== phase) {
          return policy;
        }
        const exists = policy.approverIds.includes(memberId);
        return {
          ...policy,
          approverIds: exists
            ? policy.approverIds.filter((id) => id !== memberId)
            : [...policy.approverIds, memberId],
        };
      }),
    }));
  };

  const togglePhaseRequiredRole = (phase: string, role: string) => {
    updateCommunicationSettings((communication) => ({
      ...communication,
      phaseApprovals: communication.phaseApprovals.map((policy) => {
        if (policy.phase !== phase) {
          return policy;
        }

        const selected = policy.requiredRoles.includes(role);
        return {
          ...policy,
          requiredRoles: selected
            ? policy.requiredRoles.filter((entry) => entry !== role)
            : [...policy.requiredRoles, role].sort((left, right) =>
                getRoleLabel(left).localeCompare(getRoleLabel(right))
              ),
        };
      }),
    }));
  };

  const setMemberPassword = async (memberId: string) => {
    const password = passwordDrafts[memberId] || "";
    if (password.trim().length < 6) {
      setSaveStatus("error");
      setSaveMessage("Password must be at least 6 characters");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("Updating member password...");
    try {
      await fetchJson(scopedPath("/api/members/password"), {
        method: "POST",
        body: JSON.stringify({
          memberId,
          password,
        }),
      });
      setPasswordDrafts((current) => ({ ...current, [memberId]: "" }));
      setSaveStatus("saved");
      setSaveMessage("Member password updated");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "Failed to update password");
    }
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
              Application-wide preferences shared across every project in this workspace.
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

        <Tabs defaultValue="general" orientation="vertical" className="flex items-start gap-6">
          <TabsList className="sticky top-24 flex h-auto w-64 shrink-0 flex-col gap-1 self-start bg-transparent">
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
            <TabsTrigger value="team" className={triggerClassName}>
              <Users className="mr-3 h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="approvals" className={triggerClassName}>
              <KeyRound className="mr-3 h-4 w-4" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className={triggerClassName}>
              <Keyboard className="mr-3 h-4 w-4" />
              Shortcuts
            </TabsTrigger>
            <TabsTrigger value="integrations" className={triggerClassName}>
              <Plug className="mr-3 h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="orchestration" className={triggerClassName}>
              <Workflow className="mr-3 h-4 w-4" />
              Orchestration
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

            <TabsContent value="team" className="space-y-6">
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage shared member accounts used across all project inbox approvals.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={addMember}>
                      Add Member
                    </Button>
                  </div>
                  {settings.communication.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members configured yet.</p>
                  ) : (
                    settings.communication.members.map((member) => (
                      <div key={member.id} className="rounded-2xl border border-border/80 bg-secondary/60 p-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={member.name} onChange={(event) => updateMember(member.id, { name: event.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={member.email || ""} onChange={(event) => updateMember(member.id, { email: event.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Roles</Label>
                          <p className="text-xs text-muted-foreground">
                            Colored roles are enabled for this member. Click any role chip to toggle it.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {availableRoles.map((role) => {
                              const selected = (member.roles ?? []).includes(role);
                              const roleStyle = TEAM_ROLE_STYLES[role];
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() =>
                                    updateMember(member.id, {
                                      roles: selected
                                        ? (member.roles ?? []).filter((r) => r !== role)
                                        : [...(member.roles ?? []), role],
                                    })
                                  }
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                    selected
                                      ? `${roleStyle?.selectedClassName ?? "border-primary/30 bg-primary/12 text-primary"} shadow-sm`
                                      : "border-border/70 bg-background/75 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                                  }`}
                                  aria-pressed={selected}
                                  title={selected ? `Remove ${getRoleLabel(role)}` : `Add ${getRoleLabel(role)}`}
                                >
                                  <span
                                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                      selected
                                        ? "border-current/25 bg-current/10"
                                        : "border-border/70 bg-background/80 text-muted-foreground"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {selected ? <Check className="h-3 w-3" /> : null}
                                  </span>
                                  <span>{getRoleLabel(role)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2 text-foreground">
                              <UserRound className="h-4 w-4" />
                              Active
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Only active members can sign in and receive inbox approvals.
                            </p>
                          </div>
                          <Switch checked={member.active} onCheckedChange={(checked) => updateMember(member.id, { active: checked })} />
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                          <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                              type="password"
                              value={passwordDrafts[member.id] || ""}
                              onChange={(event) =>
                                setPasswordDrafts((current) => ({ ...current, [member.id]: event.target.value }))
                              }
                              placeholder="Set or rotate password"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Button size="sm" onClick={() => void setMemberPassword(member.id)}>
                              Set Password
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => removeMember(member.id)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-6">
              <Card className={panelClassName}>
                <CardHeader>
                  <CardTitle>Phase Approvers</CardTitle>
                  <CardDescription>Assign which shared team members must approve each phase across all projects.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.communication.phaseApprovals.map((policy) => (
                    <div key={policy.phase} className="rounded-2xl border border-border/80 bg-secondary/60 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">
                            Phase {policy.phase} · {policy.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Colored role chips are required reviewers for this phase. Click to toggle.
                          </p>
                        </div>
                        <Switch
                          checked={policy.enabled}
                          onCheckedChange={(checked) =>
                            updateCommunicationSettings((communication) => ({
                              ...communication,
                              phaseApprovals: communication.phaseApprovals.map((entry) =>
                                entry.phase === policy.phase ? { ...entry, enabled: checked } : entry
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Required Roles</Label>
                        <div className="flex flex-wrap gap-2">
                          {availableRoles.map((role) => {
                            const selected = policy.requiredRoles.includes(role);
                            const roleStyle = TEAM_ROLE_STYLES[role];
                            return (
                              <button
                                key={`${policy.phase}-${role}`}
                                type="button"
                                onClick={() => togglePhaseRequiredRole(policy.phase, role)}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                  selected
                                    ? `${roleStyle?.selectedClassName ?? "border-primary/30 bg-primary/12 text-primary"} shadow-sm`
                                    : "border-border/70 bg-background/75 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                                }`}
                                aria-pressed={selected}
                                title={selected ? `Remove ${getRoleLabel(role)}` : `Require ${getRoleLabel(role)}`}
                              >
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                    selected
                                      ? "border-current/25 bg-current/10"
                                      : "border-border/70 bg-background/80 text-muted-foreground"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {selected ? <Check className="h-3 w-3" /> : null}
                                </span>
                                <span>{getRoleLabel(role)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Assigned Approvers</Label>
                        <div className="flex flex-wrap gap-2">
                        {settings.communication.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Add team members first.</p>
                        ) : (
                          settings.communication.members.map((member) => {
                            const selected = policy.approverIds.includes(member.id);
                            const memberRoles = member.roles.map((role) => getRoleLabel(role)).join(", ");
                            return (
                              <button
                                key={`${policy.phase}-${member.id}`}
                                type="button"
                                onClick={() => togglePhaseApprover(policy.phase, member.id)}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                  selected
                                    ? "border-primary/30 bg-primary/12 text-primary shadow-sm"
                                    : "border-border/70 bg-background/75 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                                }`}
                                aria-pressed={selected}
                                title={selected ? `Remove ${member.name} as approver` : `Add ${member.name} as approver`}
                              >
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                    selected
                                      ? "border-current/25 bg-current/10"
                                      : "border-border/70 bg-background/80 text-muted-foreground"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {selected ? <Check className="h-3 w-3" /> : null}
                                </span>
                                <span>{member.name}</span>
                                {memberRoles ? (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                                      selected
                                        ? "bg-current/10 text-current/80"
                                        : "bg-secondary/80 text-muted-foreground"
                                    }`}
                                  >
                                    {memberRoles}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })
                        )}
                        </div>
                      </div>
                    </div>
                  ))}
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

            <TabsContent value="orchestration" className="space-y-6">
              <OrchestrationSettingsPanel
                settings={settings}
                catalog={catalog}
                onChange={(nextOrchestration) =>
                  void persistSettings({
                    ...settings,
                    orchestration: nextOrchestration,
                  })
                }
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
