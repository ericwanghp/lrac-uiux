import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { InboxEnvelope, InboxMessage, PhaseGateRecord } from "@/lib/types";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

function createEmptyInbox(): InboxEnvelope {
  return { version: "1.0", messages: [] };
}

async function getInboxFile(projectRoot?: string | null): Promise<string> {
  return path.join(await getCurrentProjectRoot(projectRoot), ".auto-coding", "inbox.json");
}

export async function readInboxFile(projectRoot?: string | null): Promise<InboxEnvelope> {
  const filePath = await getInboxFile(projectRoot);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as InboxEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyInbox();
    }
    throw error;
  }
}

export async function writeInboxFile(data: InboxEnvelope, projectRoot?: string | null): Promise<void> {
  const filePath = await getInboxFile(projectRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function deliverPhaseGateInboxMessages(input: {
  projectRoot?: string | null;
  gate: PhaseGateRecord;
}): Promise<InboxMessage[]> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const inbox = await readInboxFile(projectRoot);
  const createdAt = new Date().toISOString();
  const newMessages = input.gate.requestedStakeholderIds.map((recipientMemberId: string) => ({
    id: `msg-${crypto.randomUUID()}`,
    recipientMemberId,
    kind: "phase-gate-approval" as const,
    status: "unread" as const,
    title: `Approval required for Phase ${input.gate.phase}`,
    summary: `${input.gate.phaseLabel} requires your approval before the next phase can continue.`,
    projectRoot,
    gateId: input.gate.id,
    approvalUrl: input.gate.approvalUrl,
    createdAt,
    readAt: null,
    resolvedAt: null,
  }));

  inbox.messages.push(...newMessages);
  await writeInboxFile(inbox, projectRoot);
  return newMessages;
}

export async function markInboxMessageRead(input: {
  projectRoot?: string | null;
  messageId: string;
}): Promise<InboxMessage | null> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const inbox = await readInboxFile(projectRoot);
  const index = inbox.messages.findIndex((message: InboxMessage) => message.id === input.messageId);
  if (index === -1) return null;
  const existing = inbox.messages[index];
  if (!existing) return null;
  const nextMessage: InboxMessage = {
    ...existing,
    status: existing.status === "resolved" ? "resolved" : "read",
    readAt: existing.readAt || new Date().toISOString(),
  };
  inbox.messages[index] = nextMessage;
  await writeInboxFile(inbox, projectRoot);
  return nextMessage;
}

export async function resolveInboxMessagesForGate(input: {
  projectRoot?: string | null;
  gateId: string;
}): Promise<void> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const inbox = await readInboxFile(projectRoot);
  let changed = false;
  inbox.messages = inbox.messages.map((message: InboxMessage) => {
    if (message.gateId !== input.gateId) {
      return message;
    }
    changed = true;
    return {
      ...message,
      status: "resolved",
      readAt: message.readAt || new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    };
  });
  if (changed) {
    await writeInboxFile(inbox, projectRoot);
  }
}

export async function resolveInboxMessageForRecipient(input: {
  projectRoot?: string | null;
  gateId: string;
  recipientMemberId: string;
}): Promise<void> {
  const projectRoot = await getCurrentProjectRoot(input.projectRoot);
  const inbox = await readInboxFile(projectRoot);
  let changed = false;
  inbox.messages = inbox.messages.map((message: InboxMessage) => {
    if (message.gateId !== input.gateId || message.recipientMemberId !== input.recipientMemberId) {
      return message;
    }
    changed = true;
    return {
      ...message,
      status: "resolved",
      readAt: message.readAt || new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    };
  });
  if (changed) {
    await writeInboxFile(inbox, projectRoot);
  }
}
