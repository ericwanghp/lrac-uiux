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
  pending: "bg-amber-500/15 text-amber-500 border-amber-500",
  approved: "bg-green-500/15 text-green-500 border-green-500",
  rejected: "bg-red-500/15 text-red-500 border-red-500",
  needs_revision: "bg-blue-500/15 text-blue-500 border-blue-500",
};

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
      <div className="min-h-screen bg-[#121826] p-8">
        <Card className="border-[#334155] bg-[#1A1A1A]">
          <CardContent className="py-12">
            <p className="text-center text-[#A0A0A0]">Loading approval queue...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedApproval) {
    return (
      <div className="min-h-screen bg-[#121826] p-8">
        <Card className="border-[#334155] bg-[#1A1A1A]">
          <CardContent className="py-12 space-y-3">
            <h1 className="text-2xl font-bold text-white text-center">Approval Review</h1>
            <p className="text-center text-[#A0A0A0]">
              No approval-ready markdown documents were found under `docs/`.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121826] p-8 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Approval Review</h1>
          <p className="text-[#A0A0A0]">
            Review real project documents and persist approval decisions in the admin backend.
          </p>
        </div>
        {feedback ? (
          <div className="rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-[#A0A0A0]">
            {feedback}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedApproval.documentType}
                  </h2>
                  <p className="text-sm text-[#A0A0A0]">{selectedApproval.documentPath}</p>
                </div>
                <Badge className={statusColors[selectedApproval.status]}>
                  {selectedApproval.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[#A0A0A0]">
                <span>Requested by {selectedApproval.requester}</span>
                <span>Approvers: {selectedApproval.approvers.length}</span>
                <span>Updated {formatDate(selectedApproval.updatedAt)}</span>
              </div>
            </CardHeader>

            <CardContent>
              <article className="prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match;

                      return isInline ? (
                        <code
                          className="px-1.5 py-0.5 bg-[#0A0A0A] rounded text-[#8B5CF6] text-sm"
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
                      <h1 className="text-3xl font-bold text-white mt-8 mb-4">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-semibold text-white mt-6 mb-3">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-[#A0A0A0] leading-relaxed mb-4">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-[#A0A0A0] space-y-2 mb-4">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-[#A0A0A0] space-y-2 mb-4">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-[#A0A0A0]">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#8B5CF6] pl-4 my-4 text-[#A0A0A0] italic">
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
                className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:opacity-90"
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
                className="border-[#334155] hover:bg-[#0A0A0A]"
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
                <AlertDialogContent className="bg-[#1A1A1A] border-[#334155]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">
                      Reject this document?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#A0A0A0]">
                      Please provide a reason so the owner can act on it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Reason for rejection..."
                    value={decisionComment}
                    onChange={(event) => setDecisionComment(event.target.value)}
                    className="bg-[#0A0A0A] border-[#334155] text-white min-h-[100px]"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[#0A0A0A] border-[#334155] text-white hover:bg-[#1E2532]">
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
                      className="bg-red-500 hover:bg-red-600"
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
          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Approval Queue</h2>
              <p className="text-sm text-[#A0A0A0]">{approvals.length} document(s) available</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {approvals.map((approval) => {
                const isActive = approval.id === selectedApproval.id;

                return (
                  <button
                    key={approval.id}
                    onClick={() => setSelectedApprovalId(approval.id)}
                    className={
                      isActive
                        ? "w-full rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 p-3 text-left"
                        : "w-full rounded-lg border border-white/10 bg-[#0F1117] p-3 text-left hover:border-white/20"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{approval.documentType}</p>
                        <p className="text-xs text-[#A0A0A0] truncate">{approval.documentPath}</p>
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

          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Comments</h2>
              <p className="text-sm text-[#A0A0A0]">
                {selectedApproval.comments.length} discussion
                {selectedApproval.comments.length !== 1 ? "s" : ""}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ScrollArea className="h-[320px] pr-4">
                {selectedApproval.comments.length === 0 ? (
                  <p className="text-sm text-[#A0A0A0]">No comments yet for this document.</p>
                ) : (
                  selectedApproval.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 mb-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#8B5CF6] text-white text-xs">
                          {getInitials(comment.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{comment.author}</span>
                          <span className="text-xs text-[#6B7280]">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-[#A0A0A0]">{comment.content}</p>
                        <Badge
                          variant="outline"
                          className="text-xs border-[#334155] text-[#A0A0A0]"
                        >
                          {comment.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>

              <div className="h-px bg-[#334155]" />

              <div className="space-y-3">
                <Textarea
                  placeholder="Add a reviewer comment..."
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  className="min-h-[100px] bg-[#0A0A0A] border-[#334155] text-white resize-none"
                />
                <Button
                  onClick={() =>
                    void submitApprovalUpdate({
                      commentContent: newComment,
                      successMessage: "Comment added.",
                    })
                  }
                  disabled={isSubmitting || !newComment.trim()}
                  className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]"
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
