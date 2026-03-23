"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { List, ListImperativeAPI } from "react-window";
import type { ActivityFeed } from "@/lib/types/activity-feed";
import {
  applyInteractionEvent,
  dismissPendingInteraction,
  getActivePendingInteraction,
  resolveTrackedFeatureId,
  type PendingInteraction,
} from "@/lib/utils/tasks-log-display";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/lib/websocket/useWebSocket";
import { PROJECT_ROOT_COOKIE_KEY } from "@/lib/constants/project-context";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

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

// Color mapping for different log types
const syntaxColors = {
  string: "text-success",
  number: "text-warning",
  keyword: "text-primary",
  function: "text-primary",
  comment: "text-muted-foreground italic",
  error: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
  debug: "text-muted-foreground",
  timestamp: "text-muted-foreground",
  default: "text-foreground",
};

const contentTypeStyles = {
  stdout: {
    bg: "transparent",
    text: "text-foreground",
  },
  stderr: {
    bg: "bg-destructive/10",
    text: "text-destructive",
  },
  system: {
    bg: "bg-primary/10",
    text: "text-primary",
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

function getActivityFeedStorageKey(projectRootFromQuery?: string) {
  const preferredProjectRoot = projectRootFromQuery?.trim();
  if (preferredProjectRoot) {
    return `imac-terminal-session-id:${preferredProjectRoot}`;
  }

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

export default function TasksLogPage() {
  const searchParams = useSearchParams();
  const projectRoot = (searchParams.get("project") || "").trim();
  const scopedPath = useCallback(
    (path: string) => buildProjectScopedPath(path, projectRoot),
    [projectRoot]
  );

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
  const [activityFeeds, setActivityFeeds] = useState<ActivityFeed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string>("");
  const [lastEventSeq, setLastEventSeq] = useState(0);
  const [pendingInteractions, setPendingInteractions] = useState<PendingInteraction[]>([]);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [routingAssignee, setRoutingAssignee] = useState("");
  const [routingChannel, setRoutingChannel] = useState("slack");
  const [routingMessage, setRoutingMessage] = useState("");
  const [isInteractionSubmitting, setIsInteractionSubmitting] = useState(false);
  const listRef = useRef<ListImperativeAPI | null>(null);
  const executionHistoryCursorRef = useRef<Record<string, number>>({});
  const snapshotRef = useRef<Record<string, FeatureSnapshot>>({});
  const trackedFeatureId = useMemo(
    () => resolveTrackedFeatureId(selectedFeatureId, features),
    [features, selectedFeatureId]
  );
  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === trackedFeatureId) || null,
    [features, trackedFeatureId]
  );
  const runtimeLogs = useMemo(
    () => (trackedFeatureId ? runtimeLogsByFeature[trackedFeatureId] || [] : []),
    [runtimeLogsByFeature, trackedFeatureId]
  );
  const activePendingInteraction = useMemo(
    () => getActivePendingInteraction(pendingInteractions),
    [pendingInteractions]
  );
  const activeQuestion = useMemo(
    () => (activePendingInteraction?.kind === "question" ? activePendingInteraction : null),
    [activePendingInteraction]
  );
  const activeApproval = useMemo(
    () => (activePendingInteraction?.kind === "approval" ? activePendingInteraction : null),
    [activePendingInteraction]
  );
  const hasBlockingInteraction = Boolean(activePendingInteraction);
  const activityFeedStorageKey = useMemo(
    () => getActivityFeedStorageKey(projectRoot),
    [projectRoot]
  );

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
          content: `[ACTIVITY] ${String(event.payload?.command || "")}`,
          type: "system",
          level: "debug",
        } as const;
      }
      if (event.eventType === "terminal.command.finished") {
        return {
          content: `[CHECKPOINT] code=${String(event.payload?.code ?? 0)} durationMs=${String(event.payload?.durationMs ?? "n/a")}`,
          type: "system",
          level: "info",
        } as const;
      }
      if (event.eventType === "interaction.question.raised") {
        return { content: "[Q&A] Question raised", type: "system", level: "warning" } as const;
      }
      if (event.eventType === "interaction.question.answered") {
        return { content: "[Q&A] Question answered", type: "system", level: "info" } as const;
      }
      if (event.eventType === "interaction.approval.requested") {
        return {
          content: "[APPROVAL] Approval requested",
          type: "system",
          level: "warning",
        } as const;
      }
      if (event.eventType === "interaction.approval.decided") {
        return {
          content: `[APPROVAL] Decision: ${String(event.payload?.decision || "submitted")}`,
          type: "system",
          level: "info",
        } as const;
      }
      if (event.eventType === "interaction.human.routing.created") {
        return {
          content: "[ROUTING] Human routing created",
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
        const response = await fetch(scopedPath("/api/tasks"), { cache: "no-store" });
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
          const previousCursor = executionHistoryCursorRef.current[feature.id] || 0;
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
          executionHistoryCursorRef.current[feature.id] = historyLength;
          snapshotRef.current[feature.id] = currentSnapshot;
        });
        setFeatures(fetchedFeatures);
        setSelectedFeatureId((current) => resolveTrackedFeatureId(current, fetchedFeatures));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load tasks");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [appendDiffLog, appendRuntimeLog, scopedPath]
  );

  const loadActivityFeeds = useCallback(async () => {
    try {
      const response = await fetch(scopedPath("/api/activity-feeds"), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load terminal sessions");
      }
      const feeds = (payload.data?.sessions || []) as ActivityFeed[];
      setActivityFeeds(feeds);
    } catch {
      // Keep existing list when session fetch fails temporarily.
    }
  }, [scopedPath]);

  const { isConnected, isConnecting } = useWebSocket({
    projectId: projectRoot || undefined,
    channels: ["task_updated", "file_changed", "phase_changed"],
    onMessage: (message) => {
      if (message.type === "file_changed") {
        const payload = message.payload as { path?: string; event?: string };
        const targetFeatureId = resolveTrackedFeatureId(selectedFeatureId, features);
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
        const targetFeatureId =
          payload.taskId || resolveTrackedFeatureId(selectedFeatureId, features);
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
        const targetFeatureId = resolveTrackedFeatureId(selectedFeatureId, features);
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
    void loadActivityFeeds();
  }, [loadFeatures, loadActivityFeeds]);

  useEffect(() => {
    const handleProjectChanged = () => {
      setRuntimeLogsByFeature({});
      setDisplayedLogs([]);
      setLastEventSeq(0);
      setPendingInteractions([]);
      void loadFeatures();
      void loadActivityFeeds();
    };

    window.addEventListener("lrac:project-changed", handleProjectChanged);
    return () => window.removeEventListener("lrac:project-changed", handleProjectChanged);
  }, [loadFeatures, loadActivityFeeds]);

  useEffect(() => {
    if (isConnected) return;
    const timer = setInterval(() => {
      loadFeatures(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [isConnected, loadFeatures]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadActivityFeeds();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadActivityFeeds]);

  useEffect(() => {
    const ensureSession = async () => {
      try {
        let sessionId = localStorage.getItem(activityFeedStorageKey) || "";
        if (sessionId) {
          const detailResponse = await fetch(scopedPath(`/api/activity-feeds/${sessionId}`), {
            cache: "no-store",
          });
          if (!detailResponse.ok) {
            sessionId = "";
          }
        }
        if (!sessionId) {
          const createResponse = await fetch(scopedPath("/api/activity-feeds"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: "pm_main", featureId: trackedFeatureId || null }),
          });
          const createPayload = await createResponse.json();
          if (!createResponse.ok || !createPayload?.success) {
            throw new Error(createPayload?.error || "Failed to create terminal session");
          }
          sessionId = createPayload.data.id as string;
          localStorage.setItem(activityFeedStorageKey, sessionId);
        }
        setSelectedFeedId(sessionId);
        void loadActivityFeeds();
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to initialize terminal session"
        );
      }
    };
    if (typeof window !== "undefined") {
      ensureSession();
    }
  }, [activityFeedStorageKey, loadActivityFeeds, scopedPath, trackedFeatureId]);

  useEffect(() => {
    if (!selectedFeedId || isPaused) return;
    const poll = async () => {
      try {
        const response = await fetch(
          scopedPath(`/api/activity-feeds/${selectedFeedId}/events?afterSeq=${lastEventSeq}`),
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        const targetFeatureId = trackedFeatureId;
        const events = payload.data?.events || [];
        setPendingInteractions((currentQueue) =>
          events.reduce(
            (
              queue: PendingInteraction[],
              event: {
                id?: string;
                sessionId?: string;
                eventType: string;
                timestamp: string;
                payload?: Record<string, unknown>;
              }
            ) => applyInteractionEvent(queue, event),
            currentQueue
          )
        );
        events.forEach(
          (event: {
            id?: string;
            sessionId?: string;
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
    scopedPath,
    selectedFeedId,
    trackedFeatureId,
  ]);

  const handleQuestionAnswerSubmit = async () => {
    if (!activeQuestion || !selectedFeedId || !questionAnswer.trim() || isInteractionSubmitting)
      return;
    try {
      setIsInteractionSubmitting(true);
      const response = await fetch(
        scopedPath(`/api/interactions/question/${activeQuestion.eventId}/answer`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: selectedFeedId, answer: questionAnswer }),
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to submit question answer");
      }
      appendRuntimeLog(
        trackedFeatureId,
        `[Q&A] Answer submitted for ${activeQuestion.eventId}`,
        "system",
        "info"
      );
      setPendingInteractions((queue) => dismissPendingInteraction(queue, activeQuestion.eventId));
      setQuestionAnswer("");
    } catch (error) {
      appendRuntimeLog(
        trackedFeatureId,
        `[Q&A][ERROR] ${error instanceof Error ? error.message : "Submit failed"}`,
        "stderr",
        "error"
      );
    } finally {
      setIsInteractionSubmitting(false);
    }
  };

  const handleApprovalDecision = async (decision: "approve" | "reject") => {
    if (!activeApproval || !selectedFeedId || isInteractionSubmitting) return;
    if (decision === "reject" && !approvalComment.trim()) return;
    try {
      setIsInteractionSubmitting(true);
      const endpoint =
        decision === "approve"
          ? `/api/interactions/approval/${activeApproval.eventId}/approve`
          : `/api/interactions/approval/${activeApproval.eventId}/reject`;
      const response = await fetch(scopedPath(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedFeedId,
          comment: approvalComment,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to submit approval decision");
      }
      appendRuntimeLog(
        trackedFeatureId,
        `[APPROVAL] ${decision === "approve" ? "Approved" : "Rejected"} ${activeApproval.eventId}`,
        "system",
        "info"
      );
      setPendingInteractions((queue) => dismissPendingInteraction(queue, activeApproval.eventId));
      setApprovalComment("");
    } catch (error) {
      appendRuntimeLog(
        trackedFeatureId,
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
      !selectedFeedId ||
      !routingAssignee.trim() ||
      !routingMessage.trim() ||
      isInteractionSubmitting
    )
      return;
    try {
      setIsInteractionSubmitting(true);
      const response = await fetch(scopedPath(`/api/interactions/${eventId}/route-human`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedFeedId,
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
        trackedFeatureId,
        `[ROUTING] Routed ${eventId} to ${routingAssignee} via ${routingChannel}`,
        "system",
        "warning"
      );
      setRoutingMessage("");
      setRoutingAssignee("");
      setPendingInteractions((queue) => dismissPendingInteraction(queue, eventId));
    } catch (error) {
      appendRuntimeLog(
        trackedFeatureId,
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
    a.download = `tasks-log-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!trackedFeatureId) return;
    setRuntimeLogsByFeature((prev) => ({
      ...prev,
      [trackedFeatureId]: [],
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
            isHighlighted && "bg-primary/15"
          )}
          {...ariaAttributes}
        >
          <span className="mr-4 w-10 flex-shrink-0 select-none text-right text-muted-foreground">
            {lineNumber}
          </span>
          {log.source === "diff" && log.diff ? (
            <div className="flex-1 min-w-0 rounded border border-border/80 bg-secondary/70 px-2 py-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="h-5 border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary">
                  Δ {log.diff.field}
                </Badge>
                <span className="text-[10px] text-muted-foreground">STATE CHANGE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] leading-4">
                <div className="min-w-0 rounded border border-destructive/30 bg-destructive/10 px-2 py-1">
                  <div className="text-[10px] text-destructive">OLD</div>
                  <div className="truncate text-destructive">{log.diff.oldValue}</div>
                </div>
                <div className="min-w-0 rounded border border-success/30 bg-success/10 px-2 py-1">
                  <div className="text-[10px] text-success">NEW</div>
                  <div className="truncate text-success">{log.diff.newValue}</div>
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
    if (hasBlockingInteraction) {
      return <Badge className="bg-warning/15 text-warning">WAITING</Badge>;
    }
    if (isInteractionSubmitting) {
      return <Badge className="bg-primary/10 text-primary">SYNCING</Badge>;
    }
    if (isPaused) {
      return <Badge className="bg-warning/10 text-warning">PAUSED</Badge>;
    }
    if (isConnecting) {
      return <Badge className="border-primary/20 bg-primary/10 text-primary">CONNECTING</Badge>;
    }
    if (isConnected || selectedFeature?.status.status === "in_progress") {
      return <Badge className="border-success/20 bg-success/10 text-success">WATCHING</Badge>;
    }
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
        DISCONNECTED
      </Badge>
    );
  };

  return (
    <Card className="admin-panel h-full min-h-[760px] relative flex flex-col border-border/80 bg-card/90">
      <CardHeader className="border-b border-border/80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="admin-icon-surface flex h-9 w-9 items-center justify-center text-primary">
              TL
            </div>
            <div className="ml-2">
              <p className="text-sm text-foreground">Tasks Log</p>
              <p className="text-[11px] text-muted-foreground">
                Monitoring project activity, workflow decisions, and task artifacts
              </p>
            </div>
            <Badge className="ml-2 border-primary/20 bg-primary/10 text-primary">
              {trackedFeatureId || "No task selected"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              Δ {runtimeLogs.filter((log) => log.source === "diff").length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChangesOnly((prev) => !prev)}
              className={cn(
                "h-8 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                changesOnly && "text-primary"
              )}
            >
              {changesOnly ? "Show All" : "Changes Only"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 w-8 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-border/80 px-4 py-3 md:grid-cols-3">
          <Select value={selectedFeatureId} onValueChange={setSelectedFeatureId}>
            <SelectTrigger className="bg-background/80 border-border/80 text-muted-foreground">
              <SelectValue placeholder="Select feature" />
            </SelectTrigger>
            <SelectContent className="max-h-72 border-border bg-card">
              {features.map((feature) => (
                <SelectItem key={feature.id} value={feature.id}>
                  {feature.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2">
            <p className="truncate text-xs text-muted-foreground">
              {selectedFeature?.title || "No task selected"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {selectedFeature?.executionHistory?.[selectedFeature.executionHistory.length - 1]
                ?.details || "No execution details recorded"}
            </p>
            {!isConnected && (
              <p className="mt-1 text-[11px] text-destructive">
                WebSocket offline. Start realtime stream with npm run ws:start
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-secondary/70 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1 text-xs text-foreground">
                  {selectedFeature?.status.status || "untracked"}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-secondary/70 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Priority
                </p>
                <p className="mt-1 text-xs text-foreground">{selectedFeature?.priority || "--"}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-secondary/70 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Decision State
                </p>
                <p className="mt-1 text-xs text-foreground">
                  {hasBlockingInteraction
                    ? `${activePendingInteraction?.kind || "interaction"} pending`
                    : "clear"}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-secondary/70 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Current Risk
                </p>
                <p className="mt-1 truncate text-xs text-foreground">
                  {selectedFeature?.status.blockReason || "none"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-t border-border/80 px-4 py-3">
          <Select
            value={logLevel}
            onValueChange={(value: string) => setLogLevel(value as LogLevel)}
          >
            <SelectTrigger className="w-[150px] border-border/80 bg-background/80 text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search task activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border/80 bg-background/80 pl-9 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="h-10 w-10 border-border/80 bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px] h-full">
          <aside className="border-b border-border/80 bg-secondary/50 p-3 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Workstreams</p>
              <Badge className="border-border/80 bg-secondary text-muted-foreground">
                {features.length}
              </Badge>
            </div>
            <div className="mt-3 space-y-2 max-h-[220px] xl:max-h-[560px] overflow-y-auto pr-1">
              {features.length === 0 ? (
                <div className="admin-empty-state admin-empty-state-sm">
                  No tracked workstreams yet.
                </div>
              ) : (
                features.map((feature) => {
                  const isActive = feature.id === trackedFeatureId;
                  const hasFeed = activityFeeds.some((feed) => feed.featureId === feature.id);
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => setSelectedFeatureId(feature.id)}
                      className={cn(
                        "w-full rounded border px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "border-primary/30 bg-primary/10"
                          : "border-border/80 bg-background/80 hover:border-primary/20 hover:bg-accent/60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-foreground">{feature.id}</span>
                        <Badge
                          className={cn(
                            "h-5 px-1.5 text-[10px]",
                            feature.status.status === "blocked"
                              ? "bg-destructive/10 text-destructive"
                              : feature.status.status === "in_progress"
                                ? "bg-primary/10 text-primary"
                                : feature.status.status === "completed"
                                  ? "bg-success/10 text-success"
                                  : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {feature.status.status}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {hasFeed ? "activity feed ready" : "no feed yet"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={(value: string) => setActiveTab(value as "all" | ContentType)}
              className="w-full"
            >
              <TabsList className="h-10 rounded-none border-b border-border/80 bg-transparent px-4">
                <TabsTrigger
                  value="all"
                  className="text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                >
                  all
                </TabsTrigger>
                <TabsTrigger
                  value="stdout"
                  className="text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary"
                >
                  updates
                </TabsTrigger>
                <TabsTrigger
                  value="stderr"
                  className="text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive"
                >
                  issues
                </TabsTrigger>
                <TabsTrigger
                  value="system"
                  className="text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary"
                >
                  workflow
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <div className="h-[500px]">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Loading task logs...
                    </div>
                  ) : loadError ? (
                    <div className="flex h-full items-center justify-center text-sm text-destructive">
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
                      className="scrollbar-thin scrollbar-track-transparent"
                    />
                  ) : !loading && !loadError ? (
                    <div className="admin-empty-state admin-empty-state-md mx-4 my-6 flex h-[calc(100%-3rem)] items-center justify-center">
                      No task activity yet
                    </div>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="border-t border-border/80 bg-secondary/50 p-3 xl:border-l xl:border-t-0">
            <div className="rounded-xl border border-border/80 bg-background/90 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Flow State</p>
              <div className="mt-2">{getStatusBadge()}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {hasBlockingInteraction
                  ? "Human decision required before this task flow can continue."
                  : "Monitoring view is active for this project's task logs."}
              </p>
            </div>
            <div className="mt-3 rounded-xl border border-border/80 bg-background/90 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Action Queue
                </p>
                <Badge className="border-border/80 bg-secondary text-muted-foreground">
                  {pendingInteractions.length}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 max-h-[180px] xl:max-h-[380px] overflow-y-auto pr-1">
                {pendingInteractions.length === 0 ? (
                  <div className="admin-empty-state admin-empty-state-sm">No pending action.</div>
                ) : (
                  pendingInteractions.map((interaction) => (
                    <div
                      key={interaction.eventId}
                      className={cn(
                        "rounded border px-2 py-2",
                        activePendingInteraction?.eventId === interaction.eventId
                          ? "border-primary/30 bg-primary/10"
                          : "border-border/80 bg-secondary/70"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-foreground">
                          {interaction.title}
                        </span>
                        <Badge
                          className={cn(
                            "h-5 px-1.5 text-[10px]",
                            interaction.kind === "approval"
                              ? "bg-warning/10 text-warning"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {interaction.kind}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {interaction.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-border/80 bg-background/90 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Log Feed</p>
              <p className="mt-2 text-xs text-foreground">
                feed id: {selectedFeedId || "initializing"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                loaded: {activityFeeds.length} streams
              </p>
              {isInteractionSubmitting ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  syncing workflow state...
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </CardContent>
      {activeQuestion ? (
        <div className="admin-overlay-embedded">
          <div
            className="admin-modal-surface w-full max-w-2xl rounded-2xl p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Question Review Dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Enhanced Q&A Card</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{activeQuestion.title}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-border/80 bg-background/80 p-3 text-sm text-foreground">
              {activeQuestion.description}
            </div>
            <Textarea
              value={questionAnswer}
              onChange={(e) => setQuestionAnswer(e.target.value)}
              placeholder="Write structured answer for Claude workflow..."
              className="mt-3 min-h-[110px] border-border/80 bg-background/80 text-foreground"
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[180px_160px_1fr] gap-2">
              <Input
                value={routingAssignee}
                onChange={(e) => setRoutingAssignee(e.target.value)}
                placeholder="Assignee"
                className="border-border/80 bg-background/80 text-foreground"
              />
              <Select value={routingChannel} onValueChange={setRoutingChannel}>
                <SelectTrigger className="border-border/80 bg-background/80 text-muted-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="feishu">Feishu</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={routingMessage}
                onChange={(e) => setRoutingMessage(e.target.value)}
                placeholder="Routing message for external responder"
                className="border-border/80 bg-background/80 text-foreground"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void handleRouteToHuman(activeQuestion.eventId)}
                disabled={
                  !routingAssignee.trim() || !routingMessage.trim() || isInteractionSubmitting
                }
                className="border-border/80 text-muted-foreground hover:text-foreground"
              >
                <UserRound className="h-4 w-4 mr-2" />
                Route Human
              </Button>
              <Button
                onClick={handleQuestionAnswerSubmit}
                disabled={!questionAnswer.trim() || isInteractionSubmitting}
                className="gradient-primary text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Answer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {activeApproval ? (
        <div className="admin-overlay-embedded">
          <div
            className="admin-modal-surface w-full max-w-2xl rounded-2xl p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Approval Decision Dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-warning" />
                  <h3 className="font-semibold text-foreground">Enhanced Approval Card</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{activeApproval.title}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-border/80 bg-background/80 p-3 text-sm text-foreground">
              {activeApproval.description}
            </div>
            <Textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Approval comment or change request..."
              className="mt-3 min-h-[100px] border-border/80 bg-background/80 text-foreground"
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[180px_160px_1fr] gap-2">
              <Input
                value={routingAssignee}
                onChange={(e) => setRoutingAssignee(e.target.value)}
                placeholder="Assignee"
                className="border-border/80 bg-background/80 text-foreground"
              />
              <Select value={routingChannel} onValueChange={setRoutingChannel}>
                <SelectTrigger className="border-border/80 bg-background/80 text-muted-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="feishu">Feishu</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={routingMessage}
                onChange={(e) => setRoutingMessage(e.target.value)}
                placeholder="Routing message for approval owner"
                className="border-border/80 bg-background/80 text-foreground"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void handleRouteToHuman(activeApproval.eventId)}
                disabled={
                  !routingAssignee.trim() || !routingMessage.trim() || isInteractionSubmitting
                }
                className="border-border/80 text-muted-foreground hover:text-foreground"
              >
                <UserRound className="h-4 w-4 mr-2" />
                Route Human
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleApprovalDecision("reject")}
                disabled={!approvalComment.trim() || isInteractionSubmitting}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Reject
              </Button>
              <Button
                onClick={() => void handleApprovalDecision("approve")}
                disabled={isInteractionSubmitting}
                className="bg-success text-success-foreground hover:bg-success/90"
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
