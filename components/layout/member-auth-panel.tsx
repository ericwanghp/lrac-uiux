"use client";

import * as React from "react";
import { Bell, LogIn, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectMember, UserSettings } from "@/lib/types";
import { useCurrentMember } from "@/components/providers/current-member-provider";
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

type SettingsResponse = {
  success: boolean;
  data?: {
    settings: UserSettings;
  };
  error?: string;
};

export function MemberAuthPanel() {
  const router = useRouter();
  const projectRoot = useProjectQueryParam();
  const { member, unreadCount, signOut, refresh } = useCurrentMember();
  const [open, setOpen] = React.useState(false);
  const [members, setMembers] = React.useState<ProjectMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open || member) {
      return;
    }

    void (async () => {
      const response = await fetch("/api/settings", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as SettingsResponse | null;
      if (!response.ok || !payload?.success || !payload.data?.settings) {
        setMembers([]);
        return;
      }
      const nextMembers = payload.data.settings.communication.members.filter((entry) => entry.active);
      setMembers(nextMembers);
      setSelectedMemberId((current) => current || nextMembers[0]?.id || "");
    })();
  }, [member, open, projectRoot]);

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          password,
          projectRoot,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to sign in");
      }
      setPassword("");
      setOpen(false);
      await refresh();
      window.dispatchEvent(new CustomEvent("lrac:auth-updated"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {member ? (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(buildProjectScopedPath("/inbox", projectRoot))}
            className="relative"
          >
            <Bell className="mr-2 h-4 w-4" />
            Inbox
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            ) : null}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen((current) => !current)}>
            <UserRound className="mr-2 h-4 w-4" />
            {member.name}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen((current) => !current)}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      )}

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur">
          {member ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(buildProjectScopedPath("/inbox", projectRoot))}
              >
                <Bell className="mr-2 h-4 w-4" />
                Open Inbox
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  void signOut();
                  setOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Member Sign In</p>
                <p className="text-xs text-muted-foreground">
                  Use a shared team account to process approvals across projects.
                </p>
              </div>
              <div className="space-y-2">
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name} · {entry.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button
                className="w-full"
                onClick={() => void handleLogin()}
                disabled={isSubmitting || !selectedMemberId || password.trim().length === 0}
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
