import Link from "next/link";
import { GitBranch, ClipboardList, BarChart3, ShieldAlert, UserRoundCheck, LockKeyhole } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatusBadge, ProgressBar, ProjectCard } from "@/components/shared";
import { PhaseIndicator } from "@/components/indicators/phase-indicator";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import type { DashboardData, MilestoneTrack, BranchSnapshot } from "./data";
import { getRelativeTime, getActionQueueHref, getActionTypeLabel } from "./data";
import type { PhaseGateSummary } from "@/lib/utils/phase-gate-summary";

/* ─── Stats Grid ──────────────────────────────────────────── */
export function DashboardStats({ data }: { data: DashboardData }) {
  const phaseLabel = `Phase ${data.currentPhase}`;
  const pendingGateSummaries = data.phaseGateSummaries.filter((s) => s.status === "pending");
  const waitingApproversCount = pendingGateSummaries.reduce((s, g) => s + g.pendingApprovers.length, 0);
  const blockedByApprovalCount = pendingGateSummaries.reduce((s, g) => s + g.blockedFeaturesCount, 0);

  const stats = [
    { title: "Tasks Completed", value: `${data.completedFeatures}/${data.totalFeatures}`, description: "From .auto-coding/tasks.json", variant: "success" as const, icon: <ClipboardList className="h-5 w-5" /> },
    { title: "Current Phase", value: phaseLabel, description: `${data.pendingFeatures} pending · ${data.inProgressFeatures} in progress · ${data.blockedFeatures} blocked`, variant: "primary" as const, icon: <GitBranch className="h-5 w-5" /> },
    { title: "Progress", value: `${data.overallProgress}%`, description: "Overall completion", variant: "default" as const, icon: <BarChart3 className="h-5 w-5" /> },
    { title: "Pending Gates", value: pendingGateSummaries.length, description: pendingGateSummaries.length > 0 ? "Phase approvals blocking continuation" : "No blocking gates", variant: pendingGateSummaries.length > 0 ? ("warning" as const) : ("success" as const), icon: <ShieldAlert className="h-5 w-5" /> },
    { title: "Approvers Waiting", value: waitingApproversCount, description: waitingApproversCount > 0 ? "Outstanding reviewer actions" : "No approver action waiting", variant: waitingApproversCount > 0 ? ("warning" as const) : ("success" as const), icon: <UserRoundCheck className="h-5 w-5" /> },
    { title: "Blocked By Approval", value: blockedByApprovalCount, description: blockedByApprovalCount > 0 ? "Tasks waiting for gate decisions" : "No tasks blocked by approvals", variant: blockedByApprovalCount > 0 ? ("error" as const) : ("success" as const), icon: <LockKeyhole className="h-5 w-5" /> },
  ];

  return (
    <div>
      <p className="admin-kicker mb-3">Project Metrics</p>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, i) => (
          <div key={stat.title} className={`animate-fade-in-up stagger-${i + 1}`}>
            <StatCard {...stat} className="min-h-[140px] hover-lift" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Milestone Tracks ────────────────────────────────────── */
function getTrackBg(track: MilestoneTrack) {
  if (track.key === "initial") return "bg-background/40";
  if (track.currentPhase <= 2) return "bg-warning/10 border-warning/40";
  if (track.currentPhase <= 4) return "bg-primary/10 border-primary/35";
  if (track.currentPhase === 5) return "bg-primary/10 border-primary/45";
  if (track.currentPhase === 6) return "bg-success/10 border-success/40";
  return "bg-secondary/70 border-border/80";
}

export function MilestoneTracks({ tracks }: { tracks: MilestoneTrack[] }) {
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Development Progress</CardTitle>
        <CardDescription>Current phase is inferred from persisted project state</CardDescription>
      </CardHeader>
      <CardContent>
        <details open className="admin-panel-soft rounded-xl p-3">
          <summary className="cursor-pointer list-none flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Milestone Tracks ({tracks.length})</span>
            </div>
            <span className="text-xs text-muted-foreground">collapse / expand</span>
          </summary>
          <div className="mt-3 space-y-3">
            {tracks.map((track) => (
              <details key={track.key} open={track.key === "initial"} className={`rounded-lg border px-3 py-2 ${getTrackBg(track)}`}>
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{track.label}</span>
                    <span className="text-[11px] text-muted-foreground">Phase {Math.min(track.currentPhase, 7)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{track.completed}/{track.total}</span>
                </summary>
                <div className="mt-3">
                  <PhaseIndicator currentPhase={track.currentPhase} completedPhases={track.completedPhases} includePMPhase={false} minVisiblePhase={track.minVisiblePhase} />
                </div>
              </details>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

/* ─── Project Context ─────────────────────────────────────── */
export function ProjectContext({ data }: { data: DashboardData }) {
  const project = {
    title: data.projectName,
    description: data.projectRoot,
    status: data.pendingFeatures === 0 && data.inProgressFeatures === 0 && data.blockedFeatures === 0 ? ("completed" as const) : data.inProgressFeatures > 0 ? ("active" as const) : ("pending" as const),
    progress: data.overallProgress,
    phase: `Phase ${data.currentPhase}`,
    tasksCompleted: data.completedFeatures,
    tasksTotal: data.totalFeatures,
  };

  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Context</CardTitle>
            <CardDescription>Frontend mounted from backend persistence</CardDescription>
          </div>
          <Button variant="outline" size="sm">Refresh</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProjectCard {...project} />
        <BranchTopology branches={data.branches} hasImacBranch={data.hasImacBranch} />
      </CardContent>
    </Card>
  );
}

function BranchTopology({ branches, hasImacBranch }: { branches: BranchSnapshot[]; hasImacBranch: boolean }) {
  return (
    <div className="admin-panel-soft rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Task Branch Topology</p>
        </div>
        <StatusBadge status={hasImacBranch ? "active" : "pending"} size="sm" label={hasImacBranch ? "Branch Split" : "Single Track"} />
      </div>
      <div className="space-y-2">
        {branches.map((branch) => (
          <div key={branch.key} className="rounded-xl border border-border/60 bg-background/60 px-2.5 py-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium">{branch.label}</p>
              <p className="text-[11px] text-muted-foreground">{branch.completed}/{branch.total} completed · {branch.inProgress} in progress</p>
            </div>
            <div className="w-24">
              <ProgressBar value={branch.total > 0 ? Math.round((branch.completed / branch.total) * 100) : 0} variant={branch.key === "imac" ? "gradient" : "default"} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Persistence Snapshot ────────────────────────────────── */
export function PersistenceSnapshot({ data }: { data: DashboardData }) {
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Persistence Snapshot</CardTitle>
        <CardDescription>docs and .auto-coding analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SnapshotRow label="Project Root" badge="Resolved" badgeStatus="active"><p className="text-xs text-muted-foreground break-all">{data.projectRoot}</p></SnapshotRow>
        <SnapshotRow label="docs Path" badge="Active" badgeStatus="completed"><p className="text-xs text-muted-foreground break-all">{data.docsRoot}</p></SnapshotRow>
        <SnapshotRow label=".auto-coding Path" badge="Active" badgeStatus="completed"><p className="text-xs text-muted-foreground break-all">{data.autoCodingPath}</p></SnapshotRow>
        <div className="admin-panel-soft rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Docs Coverage</span>
            <span className="text-xs text-muted-foreground">{data.totalDocs} files</span>
          </div>
          <ProgressBar value={Math.min(100, data.totalDocs > 0 ? data.totalDocs * 10 : 0)} variant="gradient" size="md" />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
            {data.docs.map((doc) => (
              <div key={doc.dir} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/50 px-2 py-1">
                <span>{doc.dir}</span><span className="font-medium">{doc.markdownCount}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-panel-soft rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Process Persistence</span>
            <span className="text-xs text-muted-foreground">{data.qaSessionCount} QA · {data.progressSessions} progress</span>
          </div>
          <ProgressBar value={Math.min(100, data.progressSessions * 5 + data.qaSessionCount * 10 + data.completedFeatures * 2)} variant="success" size="md" />
        </div>
        <div className="admin-panel-soft rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pending Features</span>
            <span className="text-xs text-muted-foreground">{data.pendingFeatures} remaining</span>
          </div>
          {data.pendingFeatureIds.length === 0 ? (
            <p className="admin-empty-state admin-empty-state-sm">No pending features</p>
          ) : (
            <p className="text-xs text-muted-foreground">{data.pendingFeatureIds.join(", ")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SnapshotRow({ label, badge, badgeStatus, children }: { label: string; badge: string; badgeStatus: "active" | "completed"; children: React.ReactNode }) {
  return (
    <div className="admin-panel-soft rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <StatusBadge status={badgeStatus} size="sm" label={badge} />
      </div>
      {children}
    </div>
  );
}

/* ─── Action Queue ────────────────────────────────────────── */
export function ActionQueue({ data }: { data: DashboardData }) {
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Action Queue</CardTitle>
        <CardDescription>Items needing human or PM attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.waitingInbox.length === 0 ? (
            <p className="admin-empty-state admin-empty-state-md">No pending inbox items</p>
          ) : (
            data.waitingInbox.map((item) => (
              <Link key={item.id} href={getActionQueueHref(item, data.projectRoot)} className="admin-panel-soft block rounded-xl p-3 transition-all hover:border-primary/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={item.kind === "blocked" ? "blocked" : "pending"} size="sm" label={item.kind === "blocked" ? "blocked" : "pending"} />
                    <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">{getActionTypeLabel(item.kind)}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{item.featureId || item.sessionId || "project"} · {getRelativeTime(item.timestamp)}</p>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Approval Gates ──────────────────────────────────────── */
export function ApprovalGates({ summaries, projectRoot }: { summaries: PhaseGateSummary[]; projectRoot: string }) {
  const pending = summaries.filter((s) => s.status === "pending");
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Approval Gates</CardTitle>
        <CardDescription>Pending gates block the next phase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending phase approval gates.</p>
        ) : (
          pending.slice(0, 6).map((summary) => (
            <div key={summary.id} className="rounded-xl border border-border/60 bg-secondary/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Phase {summary.phase} · {summary.phaseLabel}</p>
                <StatusBadge status="pending" size="sm" label="Pending" />
              </div>
              <p className="text-xs text-muted-foreground">Waiting: {summary.pendingApprovers.length > 0 ? summary.pendingApprovers.map((a) => `${a.name} (${a.role})`).join(", ") : "No approver assigned"}</p>
              <p className="text-xs text-muted-foreground">Blocked tasks: {summary.blockedFeaturesCount}</p>
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link href={buildProjectScopedPath(summary.approvalUrl, projectRoot)}>Open Gate</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Blocker Queue ───────────────────────────────────────── */
export function BlockerQueue({ data }: { data: DashboardData }) {
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Blocker Queue</CardTitle>
        <CardDescription>Blocked tasks prioritized for intervention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.blockerQueue.length === 0 ? (
            <p className="admin-empty-state admin-empty-state-md">No active blockers</p>
          ) : (
            data.blockerQueue.map((item) => (
              <div key={item.featureId} className="admin-panel-soft rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <StatusBadge status={item.needsHumanIntervention ? "blocked" : "pending"} size="sm" label={item.needsHumanIntervention ? "human" : "queued"} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{item.featureId} · {item.reportedBy} · {getRelativeTime(item.reportedAt)}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Recent Activity ─────────────────────────────────────── */
export function RecentActivity({ activities }: { activities: { action: string; item: string; time: string }[] }) {
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates and completions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="admin-empty-state admin-empty-state-md">No workflow history found</p>
          ) : (
            activities.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 animate-fade-in-up stagger-${i + 1}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-medium">{a.action}</span> <span className="text-muted-foreground">{a.item}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Quick Actions ───────────────────────────────────────── */
export function QuickActions() {
  const actions = [
    { icon: <ClipboardList className="mr-2 h-4 w-4" />, label: "View Tasks", href: "/tasks-log" },
    { icon: <BarChart3 className="mr-2 h-4 w-4" />, label: "View Reports", href: "/pm" },
    { icon: <ShieldAlert className="mr-2 h-4 w-4" />, label: "Settings", href: "/settings" },
    { icon: <LockKeyhole className="mr-2 h-4 w-4" />, label: "Documentation", href: "/requirements" },
  ];
  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {actions.map((action) => (
          <Button key={action.label} asChild variant="outline" className="w-full justify-start hover-lift">
            <Link href={action.href}>{action.icon}{action.label}</Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
