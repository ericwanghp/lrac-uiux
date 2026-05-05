import type { Feature, PhaseGateDecision, PhaseGateRecord, ProjectMember, StakeholderContact } from "@/lib/types";
import { readTasksJson } from "@/lib/utils/file-operations";
import { readPhaseGatesFile } from "@/lib/utils/phase-gate-operations";
import { readProjectSettings } from "@/lib/utils/project-settings-operations";

export interface PhaseGateSummary {
  id: string;
  phase: string;
  phaseLabel: string;
  status: PhaseGateRecord["status"];
  approvalUrl: string;
  createdAt: string;
  updatedAt: string;
  pendingApprovers: Array<{ id: string; name: string; role: string }>;
  decidedApprovers: Array<{
    actorId: string;
    actorName: string;
    role: string;
    decision: PhaseGateDecision["decision"];
    timestamp: string;
  }>;
  blockedFeaturesCount: number;
  blockedFeatureTitles: string[];
}

function toStakeholderMap(
  members: ProjectMember[],
  stakeholders: StakeholderContact[]
): Map<string, { id: string; name: string; role: string }> {
  const map = new Map<string, { id: string; name: string; role: string }>();
  members.forEach((member) => {
    map.set(member.id, {
      id: member.id,
      name: member.name,
      role: (member.roles ?? []).join(", "),
    });
  });
  stakeholders.forEach((stakeholder) => {
    if (!map.has(stakeholder.id)) {
      map.set(stakeholder.id, {
        id: stakeholder.id,
        name: stakeholder.name,
        role: stakeholder.role,
      });
    }
  });
  return map;
}

function buildBlockedFeaturesByGate(features: Feature[]): Map<string, Feature[]> {
  const map = new Map<string, Feature[]>();
  features.forEach((feature) => {
    const gateId = feature.status.blockReason?.gateId;
    if (!gateId) {
      return;
    }
    const current = map.get(gateId) || [];
    current.push(feature);
    map.set(gateId, current);
  });
  return map;
}

export async function readPhaseGateSummaries(projectRoot?: string | null): Promise<PhaseGateSummary[]> {
  const [phaseGates, tasksData, settingsEnvelope] = await Promise.all([
    readPhaseGatesFile(projectRoot),
    readTasksJson(projectRoot),
    readProjectSettings(projectRoot),
  ]);

  const stakeholderMap = toStakeholderMap(
    settingsEnvelope.settings.communication.members,
    settingsEnvelope.settings.communication.stakeholders
  );
  const blockedByGate = buildBlockedFeaturesByGate(tasksData.features);

  return phaseGates.gates
    .map((gate: PhaseGateRecord) => {
      const blockedFeatures = blockedByGate.get(gate.id) || [];
      const approvedActorIds = new Set(
        gate.decisions
          .filter((decision: PhaseGateDecision) => decision.decision === "approved")
          .map((decision: PhaseGateDecision) => decision.actorId)
      );
      const pendingApprovers = gate.requestedStakeholderIds
        .filter((stakeholderId: string) => !approvedActorIds.has(stakeholderId))
        .map((stakeholderId: string) => stakeholderMap.get(stakeholderId))
        .filter(
          (
            entry: { id: string; name: string; role: string } | undefined
          ): entry is { id: string; name: string; role: string } => Boolean(entry)
        );

      return {
        id: gate.id,
        phase: gate.phase,
        phaseLabel: gate.phaseLabel,
        status: gate.status,
        approvalUrl: gate.approvalUrl,
        createdAt: gate.createdAt,
        updatedAt: gate.updatedAt,
        pendingApprovers,
        decidedApprovers: gate.decisions.map((decision: PhaseGateDecision) => ({
          actorId: decision.actorId,
          actorName: decision.actorName,
          role: decision.role,
          decision: decision.decision,
          timestamp: decision.timestamp,
        })),
        blockedFeaturesCount: blockedFeatures.length,
        blockedFeatureTitles: blockedFeatures.map((feature) => feature.title),
      } satisfies PhaseGateSummary;
    })
    .sort(
      (left: PhaseGateSummary, right: PhaseGateSummary) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
}
