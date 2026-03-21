"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Copy,
  Download,
  MessageSquare,
  Pause,
  Play,
  Search,
  SendHorizontal,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { List, ListImperativeAPI } from "react-window";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/lib/websocket/useWebSocket";
import { PROJECT_ROOT_COOKIE_KEY } from "@/lib/constants/project-context";

// Enable SSG for static pages

type ContentType = "stdout" | "stderr" | "system";
type LogLevel = "all" | "error" | "warning" | "info" | "debug";
type DiffField =
  | "status"
  | "priority"
  | "passes"
  | "blockReason"
  | "startedAt"
  | "completedAt"
  | "title"
  | "summary";

interface LogLine {
  id: string;
  content: string;
  type: ContentType;
  timestamp: string;
  level: "error" | "warning" | "info" | "debug";
  source?: "history" | "runtime" | "diff";
  diff?: {
    field: DiffField;
    oldValue: string;
    newValue: string;
  };
}

interface FeatureFromApi {
  id: string;
  title: string;
  summary: string;
  ownerRole: string;
  priority: "low" | "medium" | "high" | "critical";
  acceptanceCriteria?: {
    criteria?: string[];
  };
  timeline?: {
    createdAt?: string;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  status: {
    status: "pending" | "in_progress" | "completed" | "blocked";
    passes?: boolean;
    blockReason?: string | null;
  };
  executionHistory?: Array<{
    timestamp: string;
    action: string;
    details: string;
  }>;
}

interface FeatureSnapshot {
  status: string;
  priority: string;
  passes: string;
  blockReason: string;
  startedAt: string;
  completedAt: string;
  title: string;
  summary: string;
}

interface InteractionQuestionCard {
  eventId: string;
  title: string;
  description: string;
}

interface InteractionApprovalCard {
  eventId: string;
  title: string;
  summary: string;
}

// Color mapping for different log types
const syntaxColors = {
  string: "text-[#10B981]",
  number: "text-[#F59E0B]",
  keyword: "text-[#8B5CF6]",
  function: "text-[#3B82F6]",
  comment: "text-[#71717A] italic",
  error: "text-[#EF4444]",
  warning: "text-[#F97316]",
  info: "text-[#06B6D4]",
  debug: "text-[#A0A0A0]",
  timestamp: "text-[#52525B]",
  default: "text-[#FFFFFF]",
};

const contentTypeStyles = {
  stdout: {
    bg: "transparent",
    text: "text-[#FFFFFF]",
  },
  stderr: {
    bg: "bg-[rgba(239,68,68,0.1)]",
    text: "text-[#EF4444]",
  },
  system: {
    bg: "bg-[rgba(6,182,212,0.1)]",
    text: "text-[#06B6D4]",
  },
};

const getLineColor = (line: LogLine): string => {
  const content = line.content;

  if (content.startsWith("ERROR") || line.level === "error") return syntaxColors.error;
  if (content.startsWith("WARN") || line.level === "warning") return syntaxColors.warning;
  if (content.startsWith("INFO") || line.level === "info") return syntaxColors.info;
  if (content.startsWith("DEBUG") || line.level === "debug") return syntaxColors.debug;
  if (content.match(/^\d{4}-\d{2}-\d{2}/)) return syntaxColors.timestamp;
  if (content.match(/".*"/)) return syntaxColors.string;

  return syntaxColors.default;
};

const parseTime = (value?: string | null): string => {
  if (!value) return "--:--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 19) || "--:--:--";
  return date.toISOString().slice(11, 19);
};

const classifyLine = (content: string): Pick<LogLine, "type" | "level"> => {
  const lower = content.toLowerCase();
  if (lower.includes("error") || lower.includes("failed")) {
    return { type: "stderr", level: "error" };
  }
  if (lower.includes("warn")) return { type: "stderr", level: "warning" };
  if (lower.includes("debug")) return { type: "stdout", level: "debug" };
  if (lower.includes("system") || lower.includes("initialized") || lower.includes("completed")) {
    return { type: "system", level: "info" };
  }
  return { type: "stdout", level: "info" };
};

const splitDetailsToLines = (details: string): string[] => {
  const byNewline = details
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  return details
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const toSnapshotValue = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const buildFeatureSnapshot = (feature: FeatureFromApi): FeatureSnapshot => ({
  status: feature.status.status,
  priority: feature.priority,
  passes: toSnapshotValue(feature.status.passes),
  blockReason: toSnapshotValue(feature.status.blockReason),
  startedAt: toSnapshotValue(feature.timeline?.startedAt),
  completedAt: toSnapshotValue(feature.timeline?.completedAt),
  title: feature.title,
  summary: feature.summary,
});

function getTerminalSessionStorageKey() {
  if (typeof document === "undefined") {
    return "imac-terminal-session-id";
  }

  const cookieEntry = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${PROJECT_ROOT_COOKIE_KEY}=`));
  const projectRoot = cookieEntry
    ? decodeURIComponent(cookieEntry.split("=").slice(1).join("="))
    : "";
  return projectRoot ? `imac-terminal-session-id:${projectRoot}` : "imac-terminal-session-id";
}

export default function TerminalOutputDisplay() {
  const [activeTab, setActiveTab] = useState<"all" | ContentType>("all");
  const [logLevel, setLogLevel] = useState<LogLevel>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [changesOnly, setChangesOnly] = useState(false);
  const [features, setFeatures] = useState<FeatureFromApi[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runtimeLogsByFeature, setRuntimeLogsByFeature] = useState<Record<string, LogLine[]>>({});
  const [displayedLogs, setDisplayedLogs] = useState<LogLine[]>([]);
  const [terminalSessionId, setTerminalSessionId] = useState<string>("");
  const [lastEventSeq, setLastEventSeq] = useState(0);
  const [commandInput, setCommandInput] = useState("");
  const [isCommandSubmitting, setIsCommandSubmitting] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<InteractionQuestionCard | null>(null);
  const [pendingApproval, setPendingApproval] = useState<InteractionApprovalCard | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [routingAssignee, setRoutingAssignee] = useState("");
  const [routingChannel, setRoutingChannel] = useState("slack");
  const [routingMessage, setRoutingMessage] = useState("");
  const [isInteractionSubmitting, setIsInteractionSubmitting] = useState(false);
  const listRef = useRef<ListImperativeAPI | null>(null);
  const historyCursorRef = useRef<Record<string, number>>({});
  const snapshotRef = useRef<Record<string, FeatureSnapshot>>({});
  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedFeatureId) || null,
    [features, selectedFeatureId]
  );
  const runtimeLogs = useMemo(
    () => (selectedFeatureId ? runtimeLogsByFeature[selectedFeatureId] || [] : []),
    [runtimeLogsByFeature, selectedFeatureId]
  );
  const sessionStorageKey = useMemo(() => getTerminalSessionStorageKey(), []);

  const appendRuntimeLog = useCallback(
    (
      featureId: string,
      content: string,
      type: ContentType = "system",
      level: LogLine["level"] = "info",
      timestamp = new Date().toISOString()
    ) => {
      if (!featureId) return;
      setRuntimeLogsByFeature((prev) => {
        const existing = prev[featureId] || [];
        const nextLog: LogLine = {
          id: `${featureId}-rt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          content,
          type,
          level,
          timestamp: parseTime(timestamp),
          source: "runtime",
        };
        return {
          ...prev,
          [featureId]: [...existing, nextLog],
        };
      });
    },
    []
  );

  const appendDiffLog = useCallback(
    (
      featureId: string,
      field: DiffField,
      oldValue: string,
      newValue: string,
      timestamp = new Date().toISOString()
    ) => {
      if (!featureId || oldValue === newValue) return;
      setRuntimeLogsByFeature((prev) => {
        const existing = prev[featureId] || [];
        const nextLog: LogLine = {
          id: `${featureId}-diff-${field}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          content: `[DIFF] ${field}: ${oldValue} → ${newValue}`,
          type: "system",
          level: "info",
          timestamp: parseTime(timestamp),
          source: "diff",
          diff: { field, oldValue, newValue },
        };
        return {
          ...prev,
          [featureId]: [...existing, nextLog],
        };
      });
    },
    []
  );

  const logs = useMemo<LogLine[]>(() => {
    if (!selectedFeature) return [];
    const items: LogLine[] = [];
    items.push({
      id: `${selectedFeature.id}-intro`,
      content: `Feature ${selectedFeature.id}: ${selectedFeature.title}`,
      timestamp: parseTime(selectedFeature.timeline?.createdAt),
      type: "system",
      level: "info",
    });
    if (selectedFeature.summary) {
      items.push({
        id: `${selectedFeature.id}-summary`,
        content: selectedFeature.summary,
        timestamp: parseTime(selectedFeature.timeline?.createdAt),
        type: "stdout",
        level: "info",
      });
    }
    const criteria = selectedFeature.acceptanceCriteria?.criteria || [];
    criteria.forEach((criterion, index) => {
      items.push({
        id: `${selectedFeature.id}-criterion-${index}`,
        content: `Acceptance ${index + 1}: ${criterion}`,
        timestamp: parseTime(selectedFeature.timeline?.createdAt),
        type: "system",
        level: "info",
      });
    });
    const history = selectedFeature.executionHistory || [];
    history.forEach((entry, entryIndex) => {
      const headerContent = `${entry.action}: ${entry.details.split("\n")[0] || entry.details}`;
      const headerType = classifyLine(headerContent);
      items.push({
        id: `${selectedFeature.id}-history-header-${entryIndex}`,
        content: headerContent,
        timestamp: parseTime(entry.timestamp),
        type: headerType.type,
        level: headerType.level,
        source: "history",
      });
      splitDetailsToLines(entry.details).forEach((line, lineIndex) => {
        const meta = classifyLine(line);
        items.push({
          id: `${selectedFeature.id}-history-${entryIndex}-${lineIndex}`,
          content: line,
          timestamp: parseTime(entry.timestamp),
          type: meta.type,
          level: meta.level,
          source: "history",
        });
      });
    });
    return [...items, ...runtimeLogs];
  }, [selectedFeature, runtimeLogs]);

  const isStreaming = selectedFeature?.status.status === "in_progress";

  const mapTerminalEventToLog = useCallback(
    (event: {
      eventType: string;
      streamType?: string;
      timestamp: string;
      payload?: Record<string, unknown>;
    }) => {
      if (event.eventType === "terminal.output.appended") {
        return {
          content: String(event.payload?.content || ""),
          type:
            event.streamType === "stderr"
              ? "stderr"
              : event.streamType === "stdout"
                ? "stdout"
                : "system",
          level: event.streamType === "stderr" ? "error" : "info",
        } as const;
      }
      if (event.eventType === "terminal.command.submitted") {
        return {
          content: `[CMD] ${String(event.payload?.command || "")}`,
          type: "system",
          level: "debug",
        } as const;
      }
      if (event.eventType === "terminal.command.finished") {
        return {
          content: `[DONE] code=${String(event.payload?.code ?? 0)} durationMs=${String(event.payload?.durationMs ?? "n/a")}`,
          type: "system",
          level: "info",
        } as const;
      }
      if (event.eventType === "interaction.question.raised") {
        return { content: "[Q&A] Question raised", type: "system", level: "warning" } as const;
      }
      if (event.eventType === "interaction.approval.requested") {
        return {
          content: "[APPROVAL] Approval requested",
          type: "system",
          level: "warning",
        } as const;
      }
      return {
        content: `[EVENT] ${event.eventType}`,
        type: "system",
        level: "debug",
      } as const;
    },
    []
  );

  const loadFeatures = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
          setLoadError(null);
        }
        const response = await fetch("/api/tasks", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load tasks");
        }
        const fetchedFeatures = (payload.data?.features || []) as FeatureFromApi[];
        fetchedFeatures.forEach((feature) => {
          const currentSnapshot = buildFeatureSnapshot(feature);
          const previousSnapshot = snapshotRef.current[feature.id];
          if (silent && previousSnapshot) {
            const fields: DiffField[] = [
              "status",
              "priority",
              "passes",
              "blockReason",
              "startedAt",
              "completedAt",
              "title",
              "summary",
            ];
            fields.forEach((field) => {
              if (previousSnapshot[field] !== currentSnapshot[field]) {
                appendDiffLog(feature.id, field, previousSnapshot[field], currentSnapshot[field]);
              }
            });
          }
          const historyLength = feature.executionHistory?.length || 0;
          const previousCursor = historyCursorRef.current[feature.id] || 0;
          if (silent && historyLength > previousCursor) {
            const newEntries = (feature.executionHistory || []).slice(previousCursor);
            newEntries.forEach((entry) => {
              appendRuntimeLog(
                feature.id,
                `${entry.action}: ${entry.details}`,
                "system",
                "info",
                entry.timestamp
              );
            });
          }
          historyCursorRef.current[feature.id] = historyLength;
          snapshotRef.current[feature.id] = currentSnapshot;
        });
        setFeatures(fetchedFeatures);
        setSelectedFeatureId((current) => {
          if (current && fetchedFeatures.some((feature) => feature.id === current)) {
            return current;
          }
          const preferred =
            fetchedFeatures.find((feature) => feature.id === "inital-p5d-014") ||
            fetchedFeatures[0];
          return preferred?.id || "";
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load tasks");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [appendDiffLog, appendRuntimeLog]
  );

  const { isConnected, isConnecting } = useWebSocket({
    channels: ["task_updated", "file_changed", "phase_changed"],
    onMessage: (message) => {
      if (message.type === "file_changed") {
        const payload = message.payload as { path?: string; event?: string };
        const targetFeatureId = selectedFeatureId || "inital-p5d-014";
        appendRuntimeLog(
          targetFeatureId,
          `[WS][file_changed] ${payload.path || "unknown"} (${payload.event || "change"})`,
          "system",
          "debug",
          message.timestamp
        );
        if (payload.path?.includes("tasks.json")) {
          loadFeatures(true);
        }
      }
      if (message.type === "task_updated") {
        const payload = message.payload as {
          taskId?: string;
          changes?: Array<{ field?: string; oldValue?: unknown; newValue?: unknown }>;
        };
        const targetFeatureId = payload.taskId || selectedFeatureId || "inital-p5d-014";
        const changedFields = (payload.changes || []).map((change) => change.field).filter(Boolean);
        appendRuntimeLog(
          targetFeatureId,
          `[WS][task_updated] ${targetFeatureId}${changedFields.length ? ` fields=${changedFields.join(",")}` : ""}`,
          "system",
          "info",
          message.timestamp
        );
        (payload.changes || []).forEach((change) => {
          if (!change.field) return;
          const allowedFields: DiffField[] = [
            "status",
            "priority",
            "passes",
            "blockReason",
            "startedAt",
            "completedAt",
            "title",
            "summary",
          ];
          if (!allowedFields.includes(change.field as DiffField)) return;
          appendDiffLog(
            targetFeatureId,
            change.field as DiffField,
            toSnapshotValue(change.oldValue),
            toSnapshotValue(change.newValue),
            message.timestamp
          );
        });
        loadFeatures(true);
      }
      if (message.type === "phase_changed") {
        const payload = message.payload as { phaseName?: string; currentPhase?: number };
        const targetFeatureId = selectedFeatureId || "inital-p5d-014";
        appendRuntimeLog(
          targetFeatureId,
          `[WS][phase_changed] ${payload.phaseName || "phase"} -> ${payload.currentPhase || "n/a"}`,
          "system",
          "info",
          message.timestamp
        );
      }
    },
  });

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  useEffect(() => {
    if (isConnected) return;
    const timer = setInterval(() => {
      loadFeatures(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [isConnected, loadFeatures]);

  useEffect(() => {
    const ensureSession = async () => {
      try {
        let sessionId = localStorage.getItem(sessionStorageKey) || "";
        if (sessionId) {
          const detailResponse = await fetch(`/api/terminal/sessions/${sessionId}`, {
            cache: "no-store",
          });
          if (!detailResponse.ok) {
            sessionId = "";
          }
        }
        if (!sessionId) {
          const createResponse = await fetch("/api/terminal/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: "pm_main", featureId: selectedFeatureId || null }),
          });
          const createPayload = await createResponse.json();
          if (!createResponse.ok || !createPayload?.success) {
            throw new Error(createPayload?.error || "Failed to create terminal session");
          }
          sessionId = createPayload.data.id as string;
          localStorage.setItem(sessionStorageKey, sessionId);
        }
        setTerminalSessionId(sessionId);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to initialize terminal session"
        );
      }
    };
    if (typeof window !== "undefined") {
      ensureSession();
    }
  }, [selectedFeatureId, sessionStorageKey]);

  useEffect(() => {
    if (!terminalSessionId || isPaused) return;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/terminal/sessions/${terminalSessionId}/events?afterSeq=${lastEventSeq}`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        const targetFeatureId = selectedFeatureId || "inital-p5d-014";
        const events = payload.data?.events || [];
        events.forEach(
          (event: {
            id?: string;
            eventType: string;
            streamType?: string;
            timestamp: string;
            payload?: Record<string, unknown>;
          }) => {
            const mapped = mapTerminalEventToLog(event);
            appendRuntimeLog(
              targetFeatureId,
              mapped.content,
              mapped.type,
              mapped.level,
              event.timestamp
            );
            if (event.eventType === "interaction.question.raised") {
              setPendingQuestion({
                eventId: event.id || `question-${Date.now()}`,
                title: String(event.payload?.title || "Question requires response"),
                description: String(
                  event.payload?.question || event.payload?.description || "Please provide answer"
                ),
              });
            }
            if (event.eventType === "interaction.approval.requested") {
              setPendingApproval({
                eventId: event.id || `approval-${Date.now()}`,
                title: String(event.payload?.title || "Approval required"),
                summary: String(
                  event.payload?.summary || event.payload?.request || "Review and decide"
                ),
              });
            }
          }
        );
        setLastEventSeq((prev) => Math.max(prev, Number(payload.data?.nextSeqNo || prev + 1) - 1));
      } catch {}
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 1200);
    return () => clearInterval(timer);
  }, [
    appendRuntimeLog,
    isPaused,
    lastEventSeq,
    mapTerminalEventToLog,
    selectedFeatureId,
    terminalSessionId,
  ]);

  const handleSubmitCommand = async () => {
    if (!terminalSessionId || !commandInput.trim() || isCommandSubmitting) return;
    try {
      setIsCommandSubmitting(true);
      const response = await fetch(`/api/terminal/sessions/${terminalSessionId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: commandInput }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to submit command");
      }
      setCommandInput("");
    } catch (error) {
      const targetFeatureId = selectedFeatureId || "inital-p5d-014";
      appendRuntimeLog(
        targetFeatureId,
        `[ERROR] ${error instanceof Error ? error.message : "Failed to submit command"}`,
        "stderr",
        "error"
      );
    } finally {
      setIsCommandSubmitting(false);
    }
  };

  const handleQuestionAnswerSubmit = async () => {
    if (!pendingQuestion || !terminalSessionId || !questionAnswer.trim() || isInteractionSubmitting)
      return;
    try {
      setIsInteractionSubmitting(true);
      const response = await fetch(`/api/interactions/question/${pendingQuestion.eventId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: terminalSessionId, answer: questionAnswer }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to submit question answer");
      }
      appendRuntimeLog(
        selectedFeatureId || "inital-p5d-014",
        `[Q&A] Answer submitted for ${pendingQuestion.eventId}`,
        "system",
        "info"
      );
      setPendingQuestion(null);
      setQuestionAnswer("");
    } catch (error) {
      appendRuntimeLog(
        selectedFeatureId || "inital-p5d-014",
        `[Q&A][ERROR] ${error instanceof Error ? error.message : "Submit failed"}`,
        "stderr",
        "error"
      );
    } finally {
      setIsInteractionSubmitting(false);
    }
  };

  const handleApprovalDecision = async (decision: "approve" | "reject") => {
    if (!pendingApproval || !terminalSessionId || isInteractionSubmitting) return;
    if (decision === "reject" && !approvalComment.trim()) return;
    try {
      setIsInteractionSubmitting(true);
      const endpoint =
        decision === "approve"
          ? `/api/interactions/approval/${pendingApproval.eventId}/approve`
          : `/api/interactions/approval/${pendingApproval.eventId}/reject`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: terminalSessionId,
          comment: approvalComment,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to submit approval decision");
      }
      appendRuntimeLog(
        selectedFeatureId || "inital-p5d-014",
        `[APPROVAL] ${decision === "approve" ? "Approved" : "Rejected"} ${pendingApproval.eventId}`,
        "system",
        "info"
      );
      setPendingApproval(null);
      setApprovalComment("");
    } catch (error) {
      appendRuntimeLog(
        selectedFeatureId || "inital-p5d-014",
        `[APPROVAL][ERROR] ${error instanceof Error ? error.message : "Decision failed"}`,
        "stderr",
        "error"
      );
    } finally {
      setIsInteractionSubmitting(false);
    }
  };

  const handleRouteToHuman = async (eventId: string) => {
    if (
      !terminalSessionId ||
      !routingAssignee.trim() ||
      !routingMessage.trim() ||
      isInteractionSubmitting
    )
      return;
    try {
      setIsInteractionSubmitting(true);
      const response = await fetch(`/api/interactions/${eventId}/route-human`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: terminalSessionId,
          assignee: routingAssignee,
          channel: routingChannel,
          message: routingMessage,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to route to human");
      }
      appendRuntimeLog(
        selectedFeatureId || "inital-p5d-014",
        `[ROUTING] Routed ${eventId} to ${routingAssignee} via ${routingChannel}`,
        "system",
        "warning"
      );
      setRoutingMessage("");
      setRoutingAssignee("");
      setPendingQuestion(null);
      setPendingApproval(null);
    } catch (error) {
      appendRuntimeLog(
        selectedFeatureId || "inital-p5d-014",
        `[ROUTING][ERROR] ${error instanceof Error ? error.message : "Route failed"}`,
        "stderr",
        "error"
      );
    } finally {
      setIsInteractionSubmitting(false);
    }
  };

  // Filter logs by tab, level, and search query
  useEffect(() => {
    let filtered = logs;

    // Filter by content type (tab)
    if (activeTab !== "all") {
      filtered = filtered.filter((log) => log.type === activeTab);
    }

    // Filter by log level
    if (logLevel !== "all") {
      filtered = filtered.filter((log) => log.level === logLevel);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => log.content.toLowerCase().includes(query));
    }

    if (changesOnly) {
      filtered = filtered.filter((log) => log.source === "diff");
    }

    setDisplayedLogs(filtered);
  }, [logs, activeTab, logLevel, searchQuery, changesOnly]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!isPaused && listRef.current) {
      listRef.current.scrollToRow({ index: displayedLogs.length - 1, align: "end" });
    }
  }, [displayedLogs.length, isPaused]);

  const handleCopy = async () => {
    const text = displayedLogs.map((log) => log.content).join("\n");
    await navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    const text = displayedLogs.map((log) => log.content).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal-output-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!selectedFeatureId) return;
    setRuntimeLogsByFeature((prev) => ({
      ...prev,
      [selectedFeatureId]: [],
    }));
  };

  // Virtual list row renderer
  const Row = useCallback(
    ({
      index,
      style,
      ariaAttributes,
    }: {
      index: number;
      style: React.CSSProperties;
      ariaAttributes?: { "aria-posinset": number; "aria-setsize": number; role: "listitem" };
    }) => {
      const log = displayedLogs[index];
      if (!log) return null;

      const lineNumber = index + 1;
      const isHighlighted =
        searchQuery && log.content.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        <div
          style={style}
          className={cn(
            "flex items-start font-mono text-sm px-4 py-1",
            contentTypeStyles[log.type].bg,
            isHighlighted && "bg-[rgba(59,130,246,0.2)]"
          )}
          {...ariaAttributes}
        >
          <span className="text-[#52525B] w-10 text-right mr-4 select-none flex-shrink-0">
            {lineNumber}
          </span>
          {log.source === "diff" && log.diff ? (
            <div className="flex-1 min-w-0 rounded border border-[#334155] bg-[#0F172A]/40 px-2 py-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[#3B82F6]/40 h-5 px-1.5 text-[10px]">
                  Δ {log.diff.field}
                </Badge>
                <span className="text-[10px] text-[#64748B]">STRUCTURED CHANGE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] leading-4">
                <div className="rounded border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 min-w-0">
                  <div className="text-[10px] text-[#FCA5A5]">OLD</div>
                  <div className="text-[#FECACA] truncate">{log.diff.oldValue}</div>
                </div>
                <div className="rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-1 min-w-0">
                  <div className="text-[10px] text-[#6EE7B7]">NEW</div>
                  <div className="text-[#A7F3D0] truncate">{log.diff.newValue}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className={cn("flex-1 truncate", getLineColor(log))}>{log.content}</span>
            </div>
          )}
        </div>
      );
    },
    [displayedLogs, searchQuery]
  );

  const getStatusBadge = () => {
    if (isPaused) {
      return <Badge className="bg-[rgba(245,158,11,0.1)] text-[#F59E0B] font-mono">PAUSED</Badge>;
    }
    if (isConnecting) {
      return (
        <Badge className="bg-[rgba(59,130,246,0.1)] text-[#3B82F6] font-mono">CONNECTING</Badge>
      );
    }
    if (isConnected) {
      return <Badge className="bg-[rgba(16,185,129,0.1)] text-[#10B981] font-mono">LIVE</Badge>;
    }
    if (isStreaming) {
      return (
        <Badge className="bg-[rgba(16,185,129,0.1)] text-[#10B981] font-mono">STREAMING</Badge>
      );
    }
    return <Badge className="bg-[rgba(239,68,68,0.1)] text-[#EF4444] font-mono">OFFLINE</Badge>;
  };

  return (
    <Card className="bg-[#0A0A0A] border-[#334155] font-mono h-full relative">
      <CardHeader className="border-b border-[#334155] p-0">
        {/* Header with window controls */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
            </div>
            <span className="text-sm text-[#A1A1AA] ml-2">terminal</span>
            <Badge className="bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border-[#3B82F6]/30 font-mono ml-2">
              {selectedFeatureId || "No feature selected"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Badge className="bg-[rgba(59,130,246,0.1)] text-[#60A5FA] border-[#3B82F6]/30">
              Δ {runtimeLogs.filter((log) => log.source === "diff").length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChangesOnly((prev) => !prev)}
              className={cn(
                "h-8 text-xs text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]",
                changesOnly && "text-[#60A5FA]"
              )}
            >
              {changesOnly ? "Show All" : "Changes Only"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 w-8 text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-4 py-3 border-t border-[#334155]">
          <Select value={selectedFeatureId} onValueChange={setSelectedFeatureId}>
            <SelectTrigger className="bg-[#0A0A0A] border-[#334155] text-[#A1A1AA]">
              <SelectValue placeholder="Select feature" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#334155] max-h-72">
              {features.map((feature) => (
                <SelectItem key={feature.id} value={feature.id}>
                  {feature.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-2 rounded-md border border-[#334155] bg-[#0A0A0A] px-3 py-2">
            <p className="text-xs text-[#71717A] truncate">
              {selectedFeature?.title || "No feature title available"}
            </p>
            <p className="text-xs text-[#A1A1AA] mt-1 truncate">
              {selectedFeature?.executionHistory?.[selectedFeature.executionHistory.length - 1]
                ?.details || "No execution details recorded"}
            </p>
            {!isConnected && (
              <p className="text-[11px] text-[#EF4444] mt-1">
                WebSocket offline. Start realtime stream with npm run ws:start
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-[#334155]">
          <Input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmitCommand();
              }
            }}
            placeholder="Run command in Claude CLI session..."
            className="bg-[#0A0A0A] border-[#334155] text-[#FFFFFF] placeholder-[#6B7280]"
          />
          <Button
            variant="outline"
            onClick={handleSubmitCommand}
            disabled={!commandInput.trim() || isCommandSubmitting || !terminalSessionId}
            className="bg-transparent border-[#334155] text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
          >
            <SendHorizontal className="h-4 w-4 mr-2" />
            {isCommandSubmitting ? "Submitting" : "Run"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-b border-[#334155]">
          <Select
            value={logLevel}
            onValueChange={(value: string) => setLogLevel(value as LogLevel)}
          >
            <SelectTrigger className="w-[150px] bg-[#0A0A0A] border-[#334155] text-[#A1A1AA]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#334155]">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0A0A0A] border-[#334155] text-[#FFFFFF] placeholder-[#6B7280]"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="h-10 w-10 bg-transparent border-[#334155] text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs
          value={activeTab}
          onValueChange={(value: string) => setActiveTab(value as "all" | ContentType)}
          className="w-full"
        >
          <TabsList className="bg-transparent border-b border-[#334155] rounded-none px-4 h-10">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-transparent data-[state=active]:text-[#FFFFFF] text-[#A1A1AA]"
            >
              all
            </TabsTrigger>
            <TabsTrigger
              value="stdout"
              className="data-[state=active]:bg-transparent data-[state=active]:text-[#3B82F6] text-[#A1A1AA]"
            >
              stdout
            </TabsTrigger>
            <TabsTrigger
              value="stderr"
              className="data-[state=active]:bg-transparent data-[state=active]:text-[#EF4444] text-[#A1A1AA]"
            >
              stderr
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-transparent data-[state=active]:text-[#06B6D4] text-[#A1A1AA]"
            >
              system
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <div className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-[#6B7280] text-sm">
                  Loading terminal output...
                </div>
              ) : loadError ? (
                <div className="flex items-center justify-center h-full text-[#EF4444] text-sm">
                  {loadError}
                </div>
              ) : null}
              {displayedLogs.length > 0 ? (
                <List
                  listRef={listRef}
                  rowComponent={Row}
                  rowCount={displayedLogs.length}
                  rowHeight={56}
                  rowProps={{} as never}
                  style={{ height: 500 }}
                  className="scrollbar-thin scrollbar-thumb-[#334155] scrollbar-track-transparent"
                />
              ) : !loading && !loadError ? (
                <div className="flex items-center justify-center h-full text-[#6B7280] text-sm">
                  No logs to display
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      {pendingQuestion ? (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[#334155] bg-[#0B1220] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#3B82F6]" />
                  <h3 className="text-[#FFFFFF] font-semibold">Enhanced Q&A Card</h3>
                </div>
                <p className="text-sm text-[#A1A1AA] mt-1">{pendingQuestion.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPendingQuestion(null)}
                className="text-[#A1A1AA] hover:text-[#FFFFFF]"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 rounded border border-[#334155] bg-[#020617] p-3 text-sm text-[#CBD5E1]">
              {pendingQuestion.description}
            </div>
            <Textarea
              value={questionAnswer}
              onChange={(e) => setQuestionAnswer(e.target.value)}
              placeholder="Write structured answer for Claude workflow..."
              className="mt-3 min-h-[110px] bg-[#020617] border-[#334155] text-[#FFFFFF]"
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[180px_160px_1fr] gap-2">
              <Input
                value={routingAssignee}
                onChange={(e) => setRoutingAssignee(e.target.value)}
                placeholder="Assignee"
                className="bg-[#020617] border-[#334155] text-[#FFFFFF]"
              />
              <Select value={routingChannel} onValueChange={setRoutingChannel}>
                <SelectTrigger className="bg-[#020617] border-[#334155] text-[#A1A1AA]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-[#334155]">
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="feishu">Feishu</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={routingMessage}
                onChange={(e) => setRoutingMessage(e.target.value)}
                placeholder="Routing message for external responder"
                className="bg-[#020617] border-[#334155] text-[#FFFFFF]"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void handleRouteToHuman(pendingQuestion.eventId)}
                disabled={
                  !routingAssignee.trim() || !routingMessage.trim() || isInteractionSubmitting
                }
                className="border-[#334155] text-[#A1A1AA] hover:text-[#FFFFFF]"
              >
                <UserRound className="h-4 w-4 mr-2" />
                Route Human
              </Button>
              <Button
                onClick={handleQuestionAnswerSubmit}
                disabled={!questionAnswer.trim() || isInteractionSubmitting}
                className="bg-[#2563EB] hover:bg-[#1D4ED8]"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Answer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingApproval ? (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[#334155] bg-[#111827] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                  <h3 className="text-[#FFFFFF] font-semibold">Enhanced Approval Card</h3>
                </div>
                <p className="text-sm text-[#A1A1AA] mt-1">{pendingApproval.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPendingApproval(null)}
                className="text-[#A1A1AA] hover:text-[#FFFFFF]"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 rounded border border-[#334155] bg-[#020617] p-3 text-sm text-[#CBD5E1]">
              {pendingApproval.summary}
            </div>
            <Textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Approval comment or change request..."
              className="mt-3 min-h-[100px] bg-[#020617] border-[#334155] text-[#FFFFFF]"
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[180px_160px_1fr] gap-2">
              <Input
                value={routingAssignee}
                onChange={(e) => setRoutingAssignee(e.target.value)}
                placeholder="Assignee"
                className="bg-[#020617] border-[#334155] text-[#FFFFFF]"
              />
              <Select value={routingChannel} onValueChange={setRoutingChannel}>
                <SelectTrigger className="bg-[#020617] border-[#334155] text-[#A1A1AA]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-[#334155]">
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="feishu">Feishu</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={routingMessage}
                onChange={(e) => setRoutingMessage(e.target.value)}
                placeholder="Routing message for approval owner"
                className="bg-[#020617] border-[#334155] text-[#FFFFFF]"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void handleRouteToHuman(pendingApproval.eventId)}
                disabled={
                  !routingAssignee.trim() || !routingMessage.trim() || isInteractionSubmitting
                }
                className="border-[#334155] text-[#A1A1AA] hover:text-[#FFFFFF]"
              >
                <UserRound className="h-4 w-4 mr-2" />
                Route Human
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleApprovalDecision("reject")}
                disabled={!approvalComment.trim() || isInteractionSubmitting}
                className="border-[#7F1D1D] text-[#FCA5A5] hover:text-[#FECACA]"
              >
                Reject
              </Button>
              <Button
                onClick={() => void handleApprovalDecision("approve")}
                disabled={isInteractionSubmitting}
                className="bg-[#16A34A] hover:bg-[#15803D]"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
