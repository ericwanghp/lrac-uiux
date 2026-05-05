import type {
  CommunicationChannelConfig,
  CommunicationSettings,
  StakeholderContact,
} from "@/lib/types/settings";
import type { PhaseGateRecord } from "@/lib/types";

type NotificationResult = {
  channelId: string;
  channelLabel: string;
  status: "sent" | "failed" | "skipped";
  sentAt: string;
  error?: string;
};

function matchesStakeholder(channel: CommunicationChannelConfig, stakeholder: StakeholderContact): boolean {
  if (channel.type === "email") {
    return Boolean(channel.recipient && stakeholder.email && channel.recipient === stakeholder.email);
  }
  if (channel.type === "generic-webhook" || channel.type === "slack-webhook") {
    return Boolean(channel.webhookUrl);
  }
  return false;
}

export async function notifyPhaseGateCreated(input: {
  communication: CommunicationSettings;
  gate: PhaseGateRecord;
}): Promise<NotificationResult[]> {
  const now = new Date().toISOString();
  const stakeholders = input.communication.stakeholders.filter((stakeholder) =>
    input.gate.requestedStakeholderIds.includes(stakeholder.id)
  );

  const results = await Promise.all(
    input.communication.channels.map(async (channel) => {
      if (!channel.enabled) {
        return {
          channelId: channel.id,
          channelLabel: channel.label,
          status: "skipped" as const,
          sentAt: now,
          error: "Channel disabled",
        };
      }

      const recipients = stakeholders.filter((stakeholder) => matchesStakeholder(channel, stakeholder));
      if (channel.type === "email") {
        return {
          channelId: channel.id,
          channelLabel: channel.label,
          status: "skipped" as const,
          sentAt: now,
          error: "Email delivery is not implemented yet",
        };
      }

      if (!channel.webhookUrl) {
        return {
          channelId: channel.id,
          channelLabel: channel.label,
          status: "skipped" as const,
          sentAt: now,
          error: "Missing webhook URL",
        };
      }

      try {
        const response = await fetch(channel.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(channel.secret ? { "X-LRAC-Signature": channel.secret } : {}),
          },
          body: JSON.stringify({
            event: "phase.approval.requested",
            gate: {
              id: input.gate.id,
              phase: input.gate.phase,
              phaseLabel: input.gate.phaseLabel,
              projectRoot: input.gate.projectRoot,
              projectName: input.gate.projectName,
              approvalUrl: input.gate.approvalUrl,
              requiredRoles: input.gate.requiredRoles,
            },
            recipients: recipients.map((recipient) => ({
              id: recipient.id,
              name: recipient.name,
              role: Array.isArray(recipient.role) ? recipient.role.join(", ") : recipient.role,
              kind: recipient.kind,
              email: recipient.email ?? null,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook responded with ${response.status}`);
        }

        return {
          channelId: channel.id,
          channelLabel: channel.label,
          status: "sent" as const,
          sentAt: now,
        };
      } catch (error) {
        return {
          channelId: channel.id,
          channelLabel: channel.label,
          status: "failed" as const,
          sentAt: now,
          error: error instanceof Error ? error.message : "Failed to send notification",
        };
      }
    })
  );

  return results;
}
