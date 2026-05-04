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
      const response = await fetch(buildProjectScopedPath("/api/inbox", projectRoot), {
        cache: "no-store",
      });
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

  React.useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const updateMessage = async (
    messageId: string,
    action: "read" | "approve" | "reject" | "needs_revision"
  ) => {
    try {
      const response = await fetch(buildProjectScopedPath(`/api/inbox/${messageId}`, projectRoot), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: commentByMessage[messageId] || "",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to update inbox message");
      }
      await loadInbox();
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update inbox message");
    }
  };

  if (!member && !isLoading) {
    return (
      <div className="admin-page">
        <Card className="admin-panel border-border/80 bg-card/90">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold text-foreground">Sign in to open your inbox</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the member sign-in menu in the top-right corner to review approvals.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page min-h-screen">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="admin-kicker mb-2">Team Inbox</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inbox</h1>
          <p className="mt-1 text-muted-foreground">
            {member ? `${member.name} · ${member.role}` : "Loading member context..."}
          </p>
        </div>
        <Badge variant="secondary">{messages.filter((item) => item.status !== "resolved").length} active</Badge>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <Card className="admin-panel border-border/80 bg-card/90">
            <CardContent className="py-12 text-center text-muted-foreground">Loading inbox...</CardContent>
          </Card>
        ) : messages.length === 0 ? (
          <Card className="admin-panel border-border/80 bg-card/90">
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">No messages</p>
              <p className="mt-2 text-sm text-muted-foreground">New approval requests will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="admin-panel border-border/80 bg-card/90">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{message.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{message.summary}</p>
                    {message.approvalUrl ? (
                      <p className="mt-2 text-xs text-muted-foreground">{message.approvalUrl}</p>
                    ) : null}
                  </div>
                  <Badge variant={message.status === "resolved" ? "success" : "secondary"}>
                    {message.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Optional approval comment..."
                  value={commentByMessage[message.id] || ""}
                  onChange={(event) =>
                    setCommentByMessage((current) => ({
                      ...current,
                      [message.id]: event.target.value,
                    }))
                  }
                  className="min-h-[100px] border-border/80 bg-background/80"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateMessage(message.id, "read")}>
                    Mark Read
                  </Button>
                  <Button
                    className="gradient-primary text-white"
                    onClick={() => void updateMessage(message.id, "approve")}
                    disabled={message.status === "resolved"}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void updateMessage(message.id, "needs_revision")}
                    disabled={message.status === "resolved"}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Request Revisions
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void updateMessage(message.id, "reject")}
                    disabled={message.status === "resolved"}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
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
