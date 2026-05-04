"use client";

import * as React from "react";
import { Bot, RotateCcw, Sparkles, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_ORCHESTRATION_SETTINGS,
  type ManagedToolConfig,
  type OrchestrationCatalog,
  type OrchestrationCatalogEntry,
  type OrchestrationSettings,
  type PhaseDispatchEntry,
  type UserSettings,
} from "@/lib/types/settings";
import { cn } from "@/lib/utils";

interface OrchestrationSettingsPanelProps {
  settings: UserSettings;
  catalog: OrchestrationCatalog;
  onChange: (nextOrchestration: OrchestrationSettings) => void;
}

interface CatalogEntryView extends OrchestrationCatalogEntry {
  enabled: boolean;
}

function buildCatalogView(
  discovered: OrchestrationCatalogEntry[],
  configs: ManagedToolConfig[]
): CatalogEntryView[] {
  const discoveredMap = new Map(discovered.map((entry) => [entry.id, entry]));
  const ids = Array.from(new Set([...discovered.map((entry) => entry.id), ...configs.map((config) => config.id)]));

  return ids
    .map((id) => {
      const config = configs.find((entry) => entry.id === id);
      const item = discoveredMap.get(id);

      return {
        id,
        title: item?.title || id,
        group: item?.group || "custom",
        filePath: item?.filePath || "Custom override",
        enabled: config?.enabled ?? false,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

function toggleSelection(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((entry) => entry !== id) : [...values, id];
}

export function OrchestrationSettingsPanel({
  settings,
  catalog,
  onChange,
}: OrchestrationSettingsPanelProps) {
  const orchestration = settings.orchestration;
  const [activePhase, setActivePhase] = React.useState(orchestration.phaseDispatch[0]?.phase ?? "1");

  React.useEffect(() => {
    if (!orchestration.phaseDispatch.some((entry) => entry.phase === activePhase)) {
      setActivePhase(orchestration.phaseDispatch[0]?.phase ?? "1");
    }
  }, [activePhase, orchestration.phaseDispatch]);

  const agentCatalog = React.useMemo(
    () => buildCatalogView(catalog.agents, orchestration.agentConfigs),
    [catalog.agents, orchestration.agentConfigs]
  );
  const skillCatalog = React.useMemo(
    () => buildCatalogView(catalog.skills, orchestration.skillConfigs),
    [catalog.skills, orchestration.skillConfigs]
  );
  const enabledAgents = agentCatalog.filter((entry) => entry.enabled);
  const enabledSkills = skillCatalog.filter((entry) => entry.enabled);
  const activePhaseEntry =
    orchestration.phaseDispatch.find((entry) => entry.phase === activePhase) ?? orchestration.phaseDispatch[0];

  const updateConfigList = React.useCallback(
    (
      listKey: "agentConfigs" | "skillConfigs",
      id: string,
      enabled: boolean
    ) => {
      const nextList = (() => {
        const currentList = orchestration[listKey];
        const existing = currentList.find((entry) => entry.id === id);
        if (existing) {
          return currentList.map((entry) => (entry.id === id ? { ...entry, enabled } : entry));
        }

        return [...currentList, { id, enabled }];
      })();

      const nextPhaseDispatch = enabled
        ? orchestration.phaseDispatch
        : orchestration.phaseDispatch.map((entry) => ({
            ...entry,
            requiredAgents:
              listKey === "agentConfigs"
                ? entry.requiredAgents.filter((value) => value !== id)
                : entry.requiredAgents,
            requiredSkills:
              listKey === "skillConfigs"
                ? entry.requiredSkills.filter((value) => value !== id)
                : entry.requiredSkills,
            optionalSkills:
              listKey === "skillConfigs"
                ? entry.optionalSkills.filter((value) => value !== id)
                : entry.optionalSkills,
          }));

      onChange({
        ...orchestration,
        [listKey]: nextList,
        phaseDispatch: nextPhaseDispatch,
      });
    },
    [onChange, orchestration]
  );

  const updatePhaseDispatch = React.useCallback(
    (
      phase: PhaseDispatchEntry["phase"],
      field: "requiredAgents" | "requiredSkills" | "optionalSkills",
      id: string
    ) => {
      const nextPhaseDispatch = orchestration.phaseDispatch.map((entry) =>
        entry.phase === phase
          ? {
              ...entry,
              [field]: toggleSelection(entry[field], id),
            }
          : entry
      );

      onChange({
        ...orchestration,
        phaseDispatch: nextPhaseDispatch,
      });
    },
    [onChange, orchestration]
  );

  const resetPhaseDispatch = React.useCallback(() => {
    onChange({
      ...orchestration,
      phaseDispatch: DEFAULT_ORCHESTRATION_SETTINGS.phaseDispatch,
    });
  }, [onChange, orchestration]);

  return (
    <div className="space-y-6">
      <Card className="admin-panel border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Orchestration Control Center
          </CardTitle>
          <CardDescription>
            Manage available agents, skills, and the Phase Dispatch Matrix from Settings instead of hard-coding
            every phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-secondary/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Enabled agents</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{enabledAgents.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{agentCatalog.length} discovered or configured</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-secondary/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Enabled skills</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{enabledSkills.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{skillCatalog.length} discovered or configured</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-secondary/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Phase coverage</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{orchestration.phaseDispatch.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Dispatch entries persisted to project settings</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ToolRegistryCard
          title="Agents Registry"
          description="Enable or disable discovered agents before assigning them to phases."
          icon={<Bot className="h-5 w-5 text-primary" />}
          items={agentCatalog}
          onToggle={(id, enabled) => updateConfigList("agentConfigs", id, enabled)}
        />
        <ToolRegistryCard
          title="Skills Registry"
          description="Control which skills are available for required and optional phase dispatch."
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          items={skillCatalog}
          onToggle={(id, enabled) => updateConfigList("skillConfigs", id, enabled)}
        />
      </div>

      <Card className="admin-panel border-border/80 bg-card/90">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Phase Dispatch Matrix</CardTitle>
            <CardDescription>
              Assign required agents, required skills, and optional skills for every lifecycle phase.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetPhaseDispatch}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Matrix
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {orchestration.phaseDispatch.map((entry) => (
              <Button
                key={entry.phase}
                type="button"
                size="sm"
                variant={entry.phase === activePhase ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setActivePhase(entry.phase)}
              >
                Phase {entry.phase}
              </Button>
            ))}
          </div>

          {activePhaseEntry ? (
            <div className="space-y-5 rounded-[1.5rem] border border-border/80 bg-secondary/40 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Selected phase</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    Phase {activePhaseEntry.phase}: {activePhaseEntry.label}
                  </h3>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {activePhaseEntry.requiredAgents.length} required agents
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {activePhaseEntry.requiredSkills.length} required skills
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {activePhaseEntry.optionalSkills.length} optional skills
                </Badge>
              </div>

              <PhaseBucketEditor
                title="Required Agents"
                description="These agents are mandatory when the phase is entered."
                items={enabledAgents}
                selectedIds={activePhaseEntry.requiredAgents}
                onToggle={(id) => updatePhaseDispatch(activePhaseEntry.phase, "requiredAgents", id)}
              />

              <PhaseBucketEditor
                title="Required Skills"
                description="These skills must be invoked for the phase before execution continues."
                items={enabledSkills}
                selectedIds={activePhaseEntry.requiredSkills}
                onToggle={(id) => updatePhaseDispatch(activePhaseEntry.phase, "requiredSkills", id)}
              />

              <PhaseBucketEditor
                title="Optional Skills"
                description="These skills remain available when trigger conditions are met."
                items={enabledSkills}
                selectedIds={activePhaseEntry.optionalSkills}
                onToggle={(id) => updatePhaseDispatch(activePhaseEntry.phase, "optionalSkills", id)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ToolRegistryCard({
  title,
  description,
  icon,
  items,
  onToggle,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: CatalogEntryView[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <Card className="admin-panel border-border/80 bg-card/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] pr-3">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/80 bg-secondary/50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">{item.title}</p>
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                        {item.group}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-primary">{item.id}</p>
                    <p className="mt-2 truncate text-xs text-muted-foreground">{item.filePath}</p>
                  </div>
                  <Switch checked={item.enabled} onCheckedChange={(checked) => onToggle(item.id, checked)} />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PhaseBucketEditor({
  title,
  description,
  items,
  selectedIds,
  onToggle,
}: {
  title: string;
  description: string;
  items: CatalogEntryView[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm transition-colors",
                  selected
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border/80 bg-background/80 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                )}
              >
                <span className="font-medium">{item.title}</span>
                <span className="ml-2 text-xs opacity-80">{item.id}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          No enabled items available. Enable entries from the registry first.
        </div>
      )}
    </div>
  );
}
