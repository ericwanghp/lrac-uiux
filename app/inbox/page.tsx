"use client";

import * as React from "react";
import { Bell, Check, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { useCurrentMember } from "@/components/providers/current-member-provider";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import { SkeletonPage } from "@/components/shared/skeleton";
import type { InboxMessage, ProjectMember } from "@/lib/types";

type InboxResponse = {
  success: boolean;
  data?: {
    member: ProjectMember;
    messages: InboxMessage[];
    unread: number;
  };
  error?: string;
};

export default function InboxPage() {
  const projectRoot = useProjectQueryParam();
  const { member, refresh } = useCurrentMember();
  const [messages, setMessages] = React.useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [commentByMessage, setCommentByMessage] = React.useState<Record<string, string>>({});

  const loadInbox = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(buildProjectScopedPath("/api/inbox", projectRoot), { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as InboxResponse | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || "Failed to load inbox");
      }
      setMessages(payload.data.messages);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load inbox");
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot]);

  React.useEffect(() => { void loadInbox(); }, [loadInbox]);

  const updateMessage = async (messageId: string, action: "read" | "approve" | "reject" | "needs_revision") => {
    try {
      const response = await fetch(buildProjectScopedPath(`/api/inbox/${messageId}`, projectRoot), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: commentByMessage[messageId] || "" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Failed to update");
      await loadInbox();
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update");
    }
  };

  if (!member && !isLoading) {
    return (
      <div className="admin-page">
        <Card className="admin-panel border-border/60 bg-card/90">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">Sign in to open your inbox</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the team sign-in menu in the top-right corner to review approvals.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCount = messages.filter((m) => m.status !== "resolved").length;

  return (
    <div className="admin-page">
      <div data-tour="inbox-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <p className="admin-kicker mb-1">Team Inbox</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {member ? `${member.name} · ${member.roles.join(", ") || "reviewer"}` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{activeCount} active</Badge>
          <Button variant="outline" size="sm" onClick={() => void loadInbox()}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/8 px-4 py-3 text-sm text-error animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <SkeletonPage />
        ) : messages.length === 0 ? (
          <Card className="admin-panel border-border/60 bg-card/90">
            <CardContent className="py-16 text-center">
              <div className="admin-icon-surface h-14 w-14 mx-auto mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">No messages</p>
              <p className="mt-2 text-sm text-muted-foreground">
                New approval requests will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message, i) => (
            <Card key={message.id} data-tour="inbox-message" className={`admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{message.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{message.summary}</p>
                  </div>
                  <Badge variant={message.status === "resolved" ? "success" : "secondary"} className="shrink-0 text-[10px]">
                    {message.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Optional comment..."
                  value={commentByMessage[message.id] || ""}
                  onChange={(e) => setCommentByMessage((c) => ({ ...c, [message.id]: e.target.value }))}
                  className="min-h-[80px] admin-input text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void updateMessage(message.id, "read")}>Mark Read</Button>
                  <Button size="sm" className="gradient-primary text-white" onClick={() => void updateMessage(message.id, "approve")} disabled={message.status === "resolved"}>
                    <Check className="mr-1.5 h-3.5 w-3.5" />Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void updateMessage(message.id, "needs_revision")} disabled={message.status === "resolved"}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />Revise
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => void updateMessage(message.id, "reject")} disabled={message.status === "resolved"}>
                    <X className="mr-1.5 h-3.5 w-3.5" />Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
