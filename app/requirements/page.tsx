import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequirementsIntakeDialog } from "@/components/requirements/requirements-intake-dialog";
import { readArtifacts, loadProgressSessions, readExplicitArtifacts, readTaskLogsByPhase } from "@/lib/utils/phase-view-data";
import { MarkdownArtifactCard } from "@/components/shared/markdown-artifact-card";
import { readRequirementsIntake } from "@/lib/utils/requirements-intake";
import { PhasePageLayout, formatTime } from "@/components/phase-pages/phase-page-layout";

export const dynamic = "force-dynamic";

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const intakeRequested = resolvedSearchParams?.intake === "1";

  const [brdFiles, prdFiles, sessions, taskLogs, intakeArtifacts, intakeRecord] = await Promise.all([
    readArtifacts("brd"),
    readArtifacts("prd"),
    loadProgressSessions(),
    readTaskLogsByPhase([1, 2]),
    readExplicitArtifacts(["docs/requirements/INPUT-REQUIREMENTS.md"]),
    readRequirementsIntake(),
  ]);

  const phaseSessions = sessions.filter((s) =>
    ["business-analyst", "product-manager"].includes(s.role)
  );
  const phaseCompleted = brdFiles.length > 0 && prdFiles.length > 0;
  const hasSavedIntake = intakeRecord.description.trim().length > 0 || intakeRecord.references.length > 0;
  const shouldAutoOpenIntake = intakeRequested || (!phaseCompleted && !hasSavedIntake);

  return (
    <PhasePageLayout
      phaseKey="1-2"
      kicker="Discovery Workspace"
      title="Phase 1-2 Requirements"
      description="Requirements gathering, business analysis, and product definition"
      completed={phaseCompleted}
      actions={
        <RequirementsIntakeDialog
          autoOpen={shouldAutoOpenIntake}
          phaseCompleted={phaseCompleted}
          initialIntake={intakeRecord}
        />
      }
    >
      {/* Intake Card */}
      <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Requirements Intake</CardTitle>
              <CardDescription>Collect project requirements and generate a brief</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
          <div className="rounded-xl border border-border/50 bg-background/60 p-4">
            <p className="admin-kicker">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {intakeRecord.description || "No requirements submitted yet. Click the button above to open the intake form."}
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
              <p className="admin-kicker">References</p>
              <div className="mt-2 space-y-1.5">
                {intakeRecord.references.length > 0 ? (
                  intakeRecord.references.map((ref) => (
                    <div key={`${ref.relativePath}-${ref.uploadedAt}`} className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5">
                      <p className="text-sm font-medium">{ref.name}</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{ref.relativePath}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No references uploaded</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
              <p className="admin-kicker">Generated Brief</p>
              <div className="mt-2 space-y-2">
                {intakeArtifacts.length > 0 ? (
                  intakeArtifacts.map((file) => (
                    <MarkdownArtifactCard key={file.absolutePath} artifact={{ name: file.name, relativePath: file.relativePath, excerpt: file.excerpt || "No excerpt", updatedAt: file.updatedAt }} />
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2">Brief will auto-generate after submission</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions + Task Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="admin-panel border-border/60 bg-card/90 lg:col-span-2 hover-glow animate-fade-in-up stagger-1">
          <CardHeader>
            <CardTitle className="text-base">Execution Log</CardTitle>
            <CardDescription>Source: .auto-coding/progress.txt</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[380px] sm:h-[420px] pr-3">
              <div className="space-y-3">
                {phaseSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No sessions recorded</p>
                ) : (
                  phaseSessions.map((session) => (
                    <div key={`${session.name}-${session.timestamp}`} className="rounded-xl border border-border/60 p-3 space-y-2 hover:bg-accent/20 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{session.name}</p>
                        <Badge variant="outline" className="text-[10px]">{session.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTime(session.timestamp)}</p>
                      <ul className="text-sm space-y-0.5">
                        {session.executionItems.slice(0, 6).map((item, i) => (
                          <li key={`${session.name}-exec-${i}`} className="text-muted-foreground">· {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-2">
          <CardHeader>
            <CardTitle className="text-base">Task Logs</CardTitle>
            <CardDescription>Source: tasks.json executionHistory</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[380px] sm:h-[420px] pr-3">
              <div className="space-y-2">
                {taskLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No task logs yet</p>
                ) : (
                  taskLogs.map((log, i) => (
                    <div key={`${log.featureId}-${log.timestamp}-${i}`} className="rounded-lg border border-border/50 p-2.5">
                      <p className="text-sm font-medium">{log.featureId}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.featureTitle}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatTime(log.timestamp)}</p>
                      <p className="text-sm mt-1.5">{log.action}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Artifacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle className="text-base">BRD Artifacts</CardTitle>
            <CardDescription>Business Requirements Documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {brdFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No BRD artifacts yet</p>
            ) : (
              brdFiles.map((file) => (
                <MarkdownArtifactCard key={file.absolutePath} artifact={{ name: file.name, relativePath: file.relativePath, excerpt: file.excerpt || "No excerpt", updatedAt: file.updatedAt }} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-4">
          <CardHeader>
            <CardTitle className="text-base">PRD Artifacts</CardTitle>
            <CardDescription>Product Requirements Documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {prdFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No PRD artifacts yet</p>
            ) : (
              prdFiles.map((file) => (
                <MarkdownArtifactCard key={file.absolutePath} artifact={{ name: file.name, relativePath: file.relativePath, excerpt: file.excerpt || "No excerpt", updatedAt: file.updatedAt }} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PhasePageLayout>
  );
}
