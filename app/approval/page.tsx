"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, MessageSquare, Send, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ApprovalComment, ApprovalRecord, ApprovalStatus } from "@/lib/types/approval";

const statusColors: Record<ApprovalStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  needs_revision: "bg-primary/15 text-primary border-primary/40",
};

const panelClassName = "admin-panel border-border/80 bg-card/90";

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function upsertApproval(approvals: ApprovalRecord[], updatedApproval: ApprovalRecord) {
  return approvals.map((approval) =>
    approval.id === updatedApproval.id ? updatedApproval : approval
  );
}

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [newComment, setNewComment] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedApproval =
    approvals.find((approval) => approval.id === selectedApprovalId) || approvals[0] || null;

  useEffect(() => {
    const timer = feedback ? window.setTimeout(() => setFeedback(null), 2500) : null;
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [feedback]);

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const payload = await fetchJson<{ approvals: ApprovalRecord[] }>("/api/approvals");
        setApprovals(payload.approvals);
        setSelectedApprovalId((currentId) => currentId || payload.approvals[0]?.id || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load approvals");
      } finally {
        setIsLoading(false);
      }
    };

    void loadApprovals();
  }, []);

  useEffect(() => {
    const loadMarkdown = async () => {
      if (!selectedApproval) {
        setMarkdown("");
        return;
      }

      try {
        setError(null);
        const payload = await fetchJson<{ relativePath: string; content: string }>(
          `/api/markdown-file?relativePath=${encodeURIComponent(selectedApproval.documentPath)}`
        );
        setMarkdown(payload.content);
      } catch (loadError) {
        setMarkdown("");
        setError(loadError instanceof Error ? loadError.message : "Failed to load document");
      }
    };

    void loadMarkdown();
  }, [selectedApproval]);

  const submitApprovalUpdate = async ({
    status,
    commentContent,
    successMessage,
  }: {
    status?: ApprovalStatus;
    commentContent?: string;
    successMessage: string;
  }) => {
    if (!selectedApproval) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const trimmedComment = commentContent?.trim();
      const comment: ApprovalComment | undefined = trimmedComment
        ? {
            id: `comment-${Date.now()}`,
            author: "Current Reviewer",
            content: trimmedComment,
            timestamp: new Date().toISOString(),
            role: "reviewer",
          }
        : undefined;

      const updatedApproval = await fetchJson<ApprovalRecord>(
        `/api/approvals/${selectedApproval.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            comment,
            actor: "frontend-user",
          }),
        }
      );

      setApprovals((previous) => upsertApproval(previous, updatedApproval));
      setSelectedApprovalId(updatedApproval.id);
      setNewComment("");
      setDecisionComment("");
      setFeedback(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page min-h-screen">
        <Card className={panelClassName}>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading approval queue...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedApproval) {
    return (
      <div className="admin-page min-h-screen">
        <Card className={panelClassName}>
          <CardContent className="py-12 space-y-3">
            <h1 className="text-center text-2xl font-bold text-foreground">Approval Review</h1>
            <p className="admin-empty-state admin-empty-state-md">
              No approval-ready markdown documents were found under `docs/`.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page min-h-screen">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="admin-kicker mb-2">Review Workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Approval Review</h1>
          <p className="text-muted-foreground">
            Review real project documents and persist approval decisions in the admin backend.
          </p>
        </div>
        {feedback ? (
          <div className="rounded-xl border border-border/80 bg-card/90 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            {feedback}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className={panelClassName}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="mb-2 text-2xl font-bold text-foreground">
                    {selectedApproval.documentType}
                  </h2>
                  <p className="text-sm text-muted-foreground">{selectedApproval.documentPath}</p>
                </div>
                <Badge className={statusColors[selectedApproval.status]}>
                  {selectedApproval.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Requested by {selectedApproval.requester}</span>
                <span>Approvers: {selectedApproval.approvers.length}</span>
                <span>Updated {formatDate(selectedApproval.updatedAt)}</span>
              </div>
            </CardHeader>

            <CardContent>
              <article className="prose prose-slate max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match;

                      return isInline ? (
                        <code
                          className="rounded bg-secondary/80 px-1.5 py-0.5 text-sm text-primary"
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-lg overflow-hidden"
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      );
                    },
                    h1: ({ children }) => (
                      <h1 className="mb-4 mt-8 text-3xl font-bold text-foreground">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-6 text-2xl font-semibold text-foreground">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-4 text-xl font-semibold text-foreground">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 list-inside list-decimal space-y-2 text-muted-foreground">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="my-4 border-l-4 border-primary pl-4 italic text-muted-foreground">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {markdown || "This document is empty."}
                </ReactMarkdown>
              </article>
            </CardContent>

            <CardFooter className="gap-2 flex-wrap">
              <Button
                variant="default"
                className="gradient-primary text-white hover:opacity-90"
                onClick={() =>
                  void submitApprovalUpdate({
                    status: "approved",
                    successMessage: "Document approved.",
                  })
                }
                disabled={isSubmitting || selectedApproval.status === "approved"}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="border-border/80 bg-background/80"
                onClick={() =>
                  void submitApprovalUpdate({
                    status: "needs_revision",
                    commentContent: newComment,
                    successMessage: "Change request sent.",
                  })
                }
                disabled={isSubmitting || selectedApproval.status === "needs_revision"}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Changes
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isSubmitting || selectedApproval.status === "rejected"}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-border/80 bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject this document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please provide a reason so the owner can act on it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Reason for rejection..."
                    value={decisionComment}
                    onChange={(event) => setDecisionComment(event.target.value)}
                    className="min-h-[100px] border-border/80 bg-background/80"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border/80 bg-background/80">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        void submitApprovalUpdate({
                          status: "rejected",
                          commentContent: decisionComment,
                          successMessage: "Document rejected.",
                        })
                      }
                      disabled={!decisionComment.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={panelClassName}>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Approval Queue</h2>
              <p className="text-sm text-muted-foreground">
                {approvals.length} document(s) available
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {approvals.map((approval) => {
                const isActive = approval.id === selectedApproval.id;

                return (
                  <button
                    key={approval.id}
                    type="button"
                    onClick={() => setSelectedApprovalId(approval.id)}
                    className={
                      isActive
                        ? "w-full rounded-2xl border border-primary/30 bg-primary/10 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        : "w-full rounded-2xl border border-border/80 bg-secondary/70 p-3 text-left hover:border-primary/20 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {approval.documentType}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {approval.documentPath}
                        </p>
                      </div>
                      <Badge className={statusColors[approval.status]}>
                        {approval.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Comments</h2>
              <p className="text-sm text-muted-foreground">
                {selectedApproval.comments.length} discussion
                {selectedApproval.comments.length !== 1 ? "s" : ""}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ScrollArea className="h-[320px] pr-4">
                {selectedApproval.comments.length === 0 ? (
                  <p className="admin-empty-state admin-empty-state-md">
                    No comments yet for this document.
                  </p>
                ) : (
                  selectedApproval.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 mb-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="gradient-primary text-xs text-white">
                          {getInitials(comment.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {comment.author}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                        <Badge
                          variant="outline"
                          className="border-border/80 text-xs text-muted-foreground"
                        >
                          {comment.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <Textarea
                  placeholder="Add a reviewer comment..."
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  className="min-h-[100px] resize-none border-border/80 bg-background/80"
                />
                <Button
                  onClick={() =>
                    void submitApprovalUpdate({
                      commentContent: newComment,
                      successMessage: "Comment added.",
                    })
                  }
                  disabled={isSubmitting || !newComment.trim()}
                  className="gradient-primary w-full text-white"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
