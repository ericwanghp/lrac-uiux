import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Feature, PhaseGateDecision, PhaseGateRecord, PhaseGatesJson } from "@/lib/types";
import { notifyPhaseGateCreated } from "@/lib/services/phase-gate-notifier";
import type { CommunicationSettings, PhaseId } from "@/lib/types/settings";
import { getCurrentProjectRoot, readTasksJson, writeTasksJson } from "@/lib/utils/file-operations";
import {
  deliverPhaseGateInboxMessages,
  resolveInboxMessageForRecipient,
  resolveInboxMessagesForGate,
} from "@/lib/utils/inbox-operations";
import { readProjectSettings } from "@/lib/utils/project-settings-operations";
import { getPhaseFromParallelGroup, getPhaseFromTaskId } from "@/lib/constants/task-id";

const PHASE_LABELS: Record<PhaseId, string> = {
  "1": "Requirements Analysis",
  "2": "Product Design",
  "2.5": "UI/UX Design",
  "3": "Architecture Design",
  "4": "Task Breakdown",
  "5": "Development & Unit Tests",
  "6": "Integration & Regression Testing",
  "7": "Deploy & UAT",
  "8": "Project Management",
};

function createEmptyPhaseGatesJson(): PhaseGatesJson {
  return { version: "1.0", gates: [] };
}

async function getPhaseGatesFile(projectRoot?: string | null): Promise<string> {
  return path.join(await getCurrentProjectRoot(projectRoot), ".auto-coding", "phase-gates.json");
}

export async function readPhaseGatesFile(projectRoot?: string | null): Promise<PhaseGatesJson> {
  const filePath = await getPhaseGatesFile(projectRoot);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as PhaseGatesJson;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyPhaseGatesJson();
    }
    throw error;
  }
}

export async function writePhaseGatesFile(
  data: PhaseGatesJson,
  projectRoot?: string | null
): Promise<void> {
  const filePath = await getPhaseGatesFile(projectRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function toPhaseId(phase: number | undefined): PhaseId | null {
  if (!phase) return null;
  if (phase === 2.5) return "2.5";
  if (phase >= 1 && phase <= 8) return String(phase) as PhaseId;
  return null;
}

export function inferFeaturePhaseId(feature: Pick<Feature, "id" | "taskBreakdown">): PhaseId | null {
  return toPhaseId(
    getPhaseFromParallelGroup(feature.taskBreakdown?.parallelGroup) || getPhaseFromTaskId(feature.id)
  );
}

function buildApprovalUrl(projectRoot: string, gateId: string): string {
  const params = new URLSearchParams({
    project: projectRoot,
    gateId,
  });
  return `/approval?${params.toString()}`;
}

function createGateId(projectRoot: string, phase: PhaseId): string {
  const digest = crypto.createHash("sha1").update(`${projectRoot}:${phase}`).digest("hex").slice(0, 10);
  return `gate-${phase.replace(".", "-")}-${digest}`;
}

function getPhaseApprovalPolicy(communication: CommunicationSettings, phase: PhaseId) {
  return communication.phaseApprovals.find((entry) => entry.phase === phase) ?? null;
}

function getStakeholdersForRoles(communication: CommunicationSettings, roles: string[]): string[] {
  const roleSet = new Set(roles);
  const memberMatches = communication.members
    .filter((member) => member.active && (member.roles ?? []).some((r) => roleSet.has(r)))
    .map((member) => member.id);
  const stakeholderMatches = communication.stakeholders
    .filter((stakeholder) => roleSet.has(stakeholder.role))
    .map((stakeholder) => stakeholder.id);
  return [...new Set([...memberMatches, ...stakeholderMatches])];
}

function isFeatureCompleted(feature: Feature): boolean {
  return feature.status.status === "completed" && feature.status.passes;
}

export async function ensurePhaseGateForCompletedPhase(input: {
  projectRoot?: string | null;
  phase: PhaseId;
}): Promise<PhaseGateRecord | null> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const [tasksData, settingsEnvelope, phaseGates] = await Promise.all([
    readTasksJson(projectRoot),
    readProjectSettings(projectRoot),
    readPhaseGatesFile(projectRoot),
  ]);
  const phaseFeatures = tasksData.features.filter(
    (feature: Feature) => inferFeaturePhaseId(feature) === input.phase
  );
  if (phaseFeatures.length === 0 || !phaseFeatures.every(isFeatureCompleted)) {
    return null;
  }

  const policy = getPhaseApprovalPolicy(settingsEnvelope.settings.communication, input.phase);
  if (!policy || !policy.enabled || policy.requiredRoles.length === 0) {
    return null;
  }

  const existingGate = phaseGates.gates.find((gate: PhaseGateRecord) => gate.phase === input.phase);
  if (existingGate) {
    return existingGate;
  }

  const now = new Date().toISOString();
  const gateId = createGateId(projectRoot, input.phase);
  const gate: PhaseGateRecord = {
    id: gateId,
    phase: input.phase,
    phaseLabel: policy.label || PHASE_LABELS[input.phase],
    status: "pending",
    projectRoot,
    projectName: tasksData.project || path.basename(projectRoot),
    triggeredByFeatureIds: phaseFeatures.map((feature: Feature) => feature.id),
    requiredRoles: policy.requiredRoles,
    requestedStakeholderIds:
      policy.approverIds.length > 0
        ? policy.approverIds
        : getStakeholdersForRoles(settingsEnvelope.settings.communication, policy.requiredRoles),
    approvalUrl: buildApprovalUrl(projectRoot, gateId),
    createdAt: now,
    updatedAt: now,
    decidedAt: null,
    notifications: [],
    decisions: [],
  };

  phaseGates.gates.push(gate);
  await deliverPhaseGateInboxMessages({
    projectRoot,
    gate,
  });
  gate.notifications = await notifyPhaseGateCreated({
    communication: settingsEnvelope.settings.communication,
    gate,
  });
  await writePhaseGatesFile(phaseGates, projectRoot);
  await blockNextPhaseFeatures(input.phase, gate.id, projectRoot);
  return gate;
}

async function blockNextPhaseFeatures(
  currentPhase: PhaseId,
  gateId: string,
  projectRoot?: string | null
) {
  const phaseOrder: PhaseId[] = ["1", "2", "2.5", "3", "4", "5", "6", "7", "8"];
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const nextPhase = currentIndex === -1 ? null : phaseOrder[currentIndex + 1] ?? null;
  if (!nextPhase) {
    return;
  }

  const tasksData = await readTasksJson(projectRoot);
  let changed = false;
  tasksData.features.forEach((feature) => {
    if (inferFeaturePhaseId(feature) !== nextPhase) {
      return;
    }
    if (feature.status.status === "completed") {
      return;
    }
    feature.status.status = "blocked";
    feature.status.blockReason = {
      type: "phase_approval_required",
      gateId,
      blockedPhase: nextPhase,
      description: `Phase ${currentPhase} requires approval before Phase ${nextPhase} can continue.`,
      reportedAt: new Date().toISOString(),
      reportedBy: "phase-gate",
      resolution: null,
      needsHumanIntervention: true,
    };
    changed = true;
  });

  if (changed) {
    await writeTasksJson(tasksData, projectRoot);
  }
}

export async function applyPhaseGateDecision(input: {
  projectRoot?: string | null;
  gateId: string;
  decision: PhaseGateDecision;
}): Promise<PhaseGateRecord> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const [phaseGates, tasksData] = await Promise.all([
    readPhaseGatesFile(projectRoot),
    readTasksJson(projectRoot),
  ]);
  const gateIndex = phaseGates.gates.findIndex((gate: PhaseGateRecord) => gate.id === input.gateId);
  if (gateIndex === -1) {
    throw new Error(`Phase gate "${input.gateId}" not found`);
  }

  const now = new Date().toISOString();
  const existingGate = phaseGates.gates[gateIndex];
  if (!existingGate) {
    throw new Error(`Phase gate "${input.gateId}" not found`);
  }

  const nextDecisions = [...existingGate.decisions, input.decision];
  const requiredApprovers = new Set(existingGate.requestedStakeholderIds);
  const approvedBy = new Set(
    nextDecisions
      .filter((decision) => decision.decision === "approved")
      .map((decision) => decision.actorId)
      .filter((actorId) => requiredApprovers.has(actorId))
  );
  const hasBlockingDecision = nextDecisions.some(
    (decision) => decision.decision === "rejected" || decision.decision === "needs_revision"
  );

  const nextStatus: PhaseGateRecord["status"] = hasBlockingDecision
    ? input.decision.decision === "rejected"
      ? "rejected"
      : "needs_revision"
    : requiredApprovers.size > 0 && approvedBy.size < requiredApprovers.size
      ? "pending"
      : "approved";

  const nextGate: PhaseGateRecord = {
    ...existingGate,
    status: nextStatus,
    decisions: nextDecisions,
    updatedAt: now,
    decidedAt: nextStatus === "pending" ? null : now,
  };
  phaseGates.gates[gateIndex] = nextGate;
  await writePhaseGatesFile(phaseGates, projectRoot);
  await resolveInboxMessageForRecipient({
    projectRoot,
    gateId: input.gateId,
    recipientMemberId: input.decision.actorId,
  });
  if (nextStatus !== "pending") {
    await resolveInboxMessagesForGate({
      projectRoot,
      gateId: input.gateId,
    });
  }

  if (nextStatus === "approved") {
    let changed = false;
    tasksData.features.forEach((feature: Feature) => {
      if (feature.status.blockReason?.gateId !== input.gateId) {
        return;
      }
      if (feature.status.status === "blocked") {
        feature.status.status = "pending";
        feature.status.blockReason = null;
        changed = true;
      }
    });
    if (changed) {
      await writeTasksJson(tasksData, projectRoot);
    }
  }

  return nextGate;
}
