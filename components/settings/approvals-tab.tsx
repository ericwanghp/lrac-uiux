"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "@/lib/types/settings";
import {
  panelClassName,
  TEAM_ROLE_STYLES,
  getRoleLabel,
} from "@/components/settings/settings-types";

interface ApprovalsTabProps {
  settings: UserSettings;
  availableRoles: string[];
  updateCommunicationSettings: (
    updater: (communication: UserSettings["communication"]) => UserSettings["communication"]
  ) => void;
  togglePhaseApprover: (phase: string, memberId: string) => void;
  togglePhaseRequiredRole: (phase: string, role: string) => void;
}

export function ApprovalsTab({
  settings,
  availableRoles,
  updateCommunicationSettings,
  togglePhaseApprover,
  togglePhaseRequiredRole,
}: ApprovalsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Phase Approvers</CardTitle>
          <CardDescription>
            Assign which shared team members must approve each phase across all projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.communication.phaseApprovals.map((policy) => (
            <div
              key={policy.phase}
              className="rounded-2xl border border-border/80 bg-secondary/60 p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    Phase {policy.phase} &middot; {policy.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Colored role chips are required reviewers for this phase. Click to toggle.
                  </p>
                </div>
                <Switch
                  checked={policy.enabled}
                  onCheckedChange={(checked) =>
                    updateCommunicationSettings((communication) => ({
                      ...communication,
                      phaseApprovals: communication.phaseApprovals.map((entry) =>
                        entry.phase === policy.phase
                          ? { ...entry, enabled: checked }
                          : entry
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Required Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => {
                    const selected = policy.requiredRoles.includes(role);
                    const roleStyle = TEAM_ROLE_STYLES[role];
                    return (
                      <button
                        key={`${policy.phase}-${role}`}
                        type="button"
                        onClick={() => togglePhaseRequiredRole(policy.phase, role)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          selected
                            ? `${roleStyle?.selectedClassName ?? "border-primary/30 bg-primary/12 text-primary"} shadow-sm`
                            : "border-border/70 bg-background/75 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                        }`}
                        aria-pressed={selected}
                        title={
                          selected
                            ? `Remove ${getRoleLabel(role)}`
                            : `Require ${getRoleLabel(role)}`
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
              <div className="space-y-2">
                <Label>Assigned Approvers</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.communication.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Add team members first.
                    </p>
                  ) : (
                    settings.communication.members.map((member) => {
                      const selected = policy.approverIds.includes(member.id);
                      const memberRoles = member.roles
                        .map((role) => getRoleLabel(role))
                        .join(", ");
                      return (
                        <button
                          key={`${policy.phase}-${member.id}`}
                          type="button"
                          onClick={() =>
                            togglePhaseApprover(policy.phase, member.id)
                          }
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            selected
                              ? "border-primary/30 bg-primary/12 text-primary shadow-sm"
                              : "border-border/70 bg-background/75 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                          }`}
                          aria-pressed={selected}
                          title={
                            selected
                              ? `Remove ${member.name} as approver`
                              : `Add ${member.name} as approver`
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
                          <span>{member.name}</span>
                          {memberRoles ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] ${
                                selected
                                  ? "bg-current/10 text-current/80"
                                  : "bg-secondary/80 text-muted-foreground"
                              }`}
                            >
                              {memberRoles}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
