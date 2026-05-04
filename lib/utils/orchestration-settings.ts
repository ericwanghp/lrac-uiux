import fs from "fs/promises";
import path from "path";
import {
  DEFAULT_ORCHESTRATION_SETTINGS,
  DEFAULT_PHASE_DISPATCH,
  type ManagedToolConfig,
  type OrchestrationCatalog,
  type OrchestrationCatalogEntry,
  type OrchestrationSettings,
  type PhaseDispatchEntry,
  type PhaseId,
} from "@/lib/types/settings";

const AGENTS_DIR = ".claude/agents";
const SKILLS_DIR = ".claude/skills";

function titleFromId(id: string): string {
  return id
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function mergeToolConfigs(
  defaults: ManagedToolConfig[],
  existing: ManagedToolConfig[] | undefined,
  discoveredIds: string[]
): ManagedToolConfig[] {
  const ids = unique([...defaults.map((item) => item.id), ...discoveredIds, ...(existing ?? []).map((item) => item.id)]);

  return ids.map((id) => {
    const existingEntry = existing?.find((item) => item.id === id);
    const defaultEntry = defaults.find((item) => item.id === id);

    return {
      id,
      enabled: existingEntry?.enabled ?? defaultEntry?.enabled ?? discoveredIds.includes(id),
    };
  });
}

function mergePhaseDispatch(existing: PhaseDispatchEntry[] | undefined): PhaseDispatchEntry[] {
  const existingMap = new Map((existing ?? []).map((entry) => [entry.phase, entry]));

  return DEFAULT_PHASE_DISPATCH.map((defaultEntry) => {
    const current = existingMap.get(defaultEntry.phase);

    return {
      phase: defaultEntry.phase,
      label: current?.label || defaultEntry.label,
      requiredAgents: unique(current?.requiredAgents ?? defaultEntry.requiredAgents),
      requiredSkills: unique(current?.requiredSkills ?? defaultEntry.requiredSkills),
      optionalSkills: unique(current?.optionalSkills ?? defaultEntry.optionalSkills),
    };
  });
}

export function normalizeOrchestrationSettings(
  orchestration: Partial<OrchestrationSettings> | undefined,
  catalog?: OrchestrationCatalog
): OrchestrationSettings {
  const discoveredAgentIds = catalog?.agents.map((item) => item.id) ?? [];
  const discoveredSkillIds = catalog?.skills.map((item) => item.id) ?? [];

  return {
    agentConfigs: mergeToolConfigs(
      DEFAULT_ORCHESTRATION_SETTINGS.agentConfigs,
      orchestration?.agentConfigs,
      discoveredAgentIds
    ),
    skillConfigs: mergeToolConfigs(
      DEFAULT_ORCHESTRATION_SETTINGS.skillConfigs,
      orchestration?.skillConfigs,
      discoveredSkillIds
    ),
    phaseDispatch: mergePhaseDispatch(orchestration?.phaseDispatch),
  };
}

async function discoverAgentCatalogEntries(projectRoot: string): Promise<OrchestrationCatalogEntry[]> {
  const agentsRoot = path.join(projectRoot, AGENTS_DIR);

  try {
    const categories = await fs.readdir(agentsRoot, { withFileTypes: true });
    const files = await Promise.all(
      categories
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
        .map(async (category) => {
          const categoryPath = path.join(agentsRoot, category.name);
          const entries = await fs.readdir(categoryPath, { withFileTypes: true });
          return entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .map((entry) => {
              const id = entry.name.replace(/\.md$/i, "");
              return {
                id,
                title: titleFromId(id),
                group: category.name,
                filePath: path.join(categoryPath, entry.name),
              };
            });
        })
    );

    return files.flat().sort((left, right) => left.title.localeCompare(right.title));
  } catch {
    return [];
  }
}

async function discoverSkillCatalogEntries(projectRoot: string): Promise<OrchestrationCatalogEntry[]> {
  const skillsRoot = path.join(projectRoot, SKILLS_DIR);

  try {
    const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        id: entry.name,
        title: titleFromId(entry.name),
        group: "skills",
        filePath: path.join(skillsRoot, entry.name, "SKILL.md"),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  } catch {
    return [];
  }
}

export async function discoverOrchestrationCatalog(projectRoot: string): Promise<OrchestrationCatalog> {
  const [agents, skills] = await Promise.all([
    discoverAgentCatalogEntries(projectRoot),
    discoverSkillCatalogEntries(projectRoot),
  ]);

  return { agents, skills };
}

export const PHASE_ORDER: PhaseId[] = DEFAULT_PHASE_DISPATCH.map((entry) => entry.phase);
