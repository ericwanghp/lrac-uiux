"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Keyboard,
  KeyRound,
  Palette,
  Plug,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import { OrchestrationSettingsPanel } from "@/components/settings/orchestration-settings-panel";
import { AppearanceTab } from "@/components/settings/appearance-tab";
import { ApprovalsTab } from "@/components/settings/approvals-tab";
import { GeneralTab } from "@/components/settings/general-tab";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { ShortcutsTab } from "@/components/settings/shortcuts-tab";
import { TeamTab } from "@/components/settings/team-tab";
import {
  getAvailableRoles,
  getRoleLabel,
  type SettingsApiResponse,
  type TaskIdSchemaData,
  triggerClassName,
} from "@/components/settings/settings-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_USER_SETTINGS } from "@/lib/types/settings";
import type { OrchestrationCatalog, ProjectMember, UserSettings } from "@/lib/types/settings";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import { applyDocumentUiSettings } from "@/lib/utils/theme";

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

        <Tabs defaultValue="general" orientation="vertical" className="flex items-start gap-6" data-tour="settings-tabs">
          <TabsList className="sticky top-24 hidden h-auto w-64 shrink-0 flex-col gap-1 self-start bg-transparent lg:flex">
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

          {/* Mobile horizontal tab list */}
          <div className="sticky top-0 z-10 mb-4 w-full overflow-x-auto lg:hidden">
            <TabsList className="flex h-auto w-max min-w-full flex-row gap-1 bg-transparent p-1">
              <TabsTrigger value="general" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                General
              </TabsTrigger>
              <TabsTrigger value="appearance" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Palette className="mr-1.5 h-3.5 w-3.5" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="mr-1.5 h-3.5 w-3.5" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="team" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Team
              </TabsTrigger>
              <TabsTrigger value="approvals" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                Approvals
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Keyboard className="mr-1.5 h-3.5 w-3.5" />
                Shortcuts
              </TabsTrigger>
              <TabsTrigger value="integrations" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Plug className="mr-1.5 h-3.5 w-3.5" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="orchestration" className="rounded-2xl px-3 py-2 text-xs text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Workflow className="mr-1.5 h-3.5 w-3.5" />
                Orchestration
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-w-0">
            <TabsContent value="general">
              <GeneralTab
                settings={settings}
                taskIdSchema={taskIdSchema}
                taskIdSchemaError={taskIdSchemaError}
                updateSetting={updateSetting}
              />
            </TabsContent>

            <TabsContent value="appearance">
              <AppearanceTab
                settings={settings}
                updateSetting={updateSetting}
              />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsTab
                settings={settings}
                updateSetting={updateSetting}
              />
            </TabsContent>

            <TabsContent value="team">
              <TeamTab
                settings={settings}
                passwordDrafts={passwordDrafts}
                availableRoles={availableRoles}
                addMember={addMember}
                updateMember={updateMember}
                removeMember={removeMember}
                setMemberPassword={setMemberPassword}
                setPasswordDrafts={setPasswordDrafts}
              />
            </TabsContent>

            <TabsContent value="approvals">
              <ApprovalsTab
                settings={settings}
                availableRoles={availableRoles}
                updateCommunicationSettings={updateCommunicationSettings}
                togglePhaseApprover={togglePhaseApprover}
                togglePhaseRequiredRole={togglePhaseRequiredRole}
              />
            </TabsContent>

            <TabsContent value="shortcuts">
              <ShortcutsTab />
            </TabsContent>

            <TabsContent value="integrations">
              <IntegrationsTab />
            </TabsContent>

            <TabsContent value="orchestration" className="animate-fade-in-up p-4 sm:p-6 space-y-6">
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
