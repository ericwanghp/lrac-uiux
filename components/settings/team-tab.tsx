"use client";

import { Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "@/lib/types/settings";
import {
  panelClassName,
  TEAM_ROLE_STYLES,
  getRoleLabel,
} from "@/components/settings/settings-types";

interface TeamTabProps {
  settings: UserSettings;
  passwordDrafts: Record<string, string>;
  availableRoles: string[];
  addMember: () => void;
  updateMember: (memberId: string, patch: Partial<import("@/lib/types/settings").ProjectMember>) => void;
  removeMember: (memberId: string) => void;
  setMemberPassword: (memberId: string) => Promise<void>;
  setPasswordDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function TeamTab({
  settings,
  passwordDrafts,
  availableRoles,
  addMember,
  updateMember,
  removeMember,
  setMemberPassword,
  setPasswordDrafts,
}: TeamTabProps) {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage shared member accounts used across all project inbox approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={addMember}>
              Add Member
            </Button>
          </div>
          {settings.communication.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members configured yet.</p>
          ) : (
            settings.communication.members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-border/80 bg-secondary/60 p-4 space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={member.name}
                      onChange={(event) =>
                        updateMember(member.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={member.email || ""}
                      onChange={(event) =>
                        updateMember(member.id, { email: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Roles</Label>
                  <p className="text-xs text-muted-foreground">
                    Colored roles are enabled for this member. Click any role chip to toggle it.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((role) => {
                      const selected = (member.roles ?? []).includes(role);
                      const roleStyle = TEAM_ROLE_STYLES[role];
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            updateMember(member.id, {
                              roles: selected
                                ? (member.roles ?? []).filter((r) => r !== role)
                                : [...(member.roles ?? []), role],
                            })
                          }
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            selected
                              ? `${roleStyle?.selectedClassName ?? "border-primary/30 bg-primary/12 text-primary"} shadow-sm`
                              : "border-border/70 bg-background/75 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                          }`}
                          aria-pressed={selected}
                          title={
                            selected
                              ? `Remove ${getRoleLabel(role)}`
                              : `Add ${getRoleLabel(role)}`
                          }
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                              selected
                                ? "border-current/25 bg-current/10"
                                : "border-border/70 bg-background/80 text-muted-foreground"
                            }`}
                            aria-hidden="true"
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span>{getRoleLabel(role)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-foreground">
                      <UserRound className="h-4 w-4" />
                      Active
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Only active members can sign in and receive inbox approvals.
                    </p>
                  </div>
                  <Switch
                    checked={member.active}
                    onCheckedChange={(checked) =>
                      updateMember(member.id, { active: checked })
                    }
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={passwordDrafts[member.id] || ""}
                      onChange={(event) =>
                        setPasswordDrafts((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                      placeholder="Set or rotate password"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button size="sm" onClick={() => void setMemberPassword(member.id)}>
                      Set Password
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeMember(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
