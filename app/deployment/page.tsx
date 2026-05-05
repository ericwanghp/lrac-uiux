import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  inferFeaturePhase,
  loadProgressSessions,
  readArtifacts,
  readExplicitArtifacts,
  readTaskLogsByPhase,
} from "@/lib/utils/phase-view-data";
import { readTasksJson } from "@/lib/utils/file-operations";
import { MarkdownArtifactCard } from "@/components/shared/markdown-artifact-card";
import { PhasePageLayout, formatTime } from "@/components/phase-pages/phase-page-layout";

export const dynamic = "force-dynamic";

export default async function DeploymentPage() {
  const [sessions, taskLogs, tasksData, deploymentDocs, deploymentArtifacts] = await Promise.all([
    loadProgressSessions(),
    readTaskLogsByPhase([7]),
    readTasksJson(),
    readArtifacts("deployment"),
    readExplicitArtifacts([
      "Dockerfile",
      "docker-compose.yml",
      "nginx.conf",
      ".env.example",
      ".github/workflows/deploy.yml",
    ]),
  ]);

  const phaseSessions = sessions.filter((s) => s.role === "devops-engineer");
  const deploymentFeatures = tasksData.features.filter(
    (feature) => inferFeaturePhase(feature) === 7
  );
  const pendingFeatures = deploymentFeatures.filter(
    (feature) => feature.status.status !== "completed"
  );
  const phaseCompleted = pendingFeatures.length === 0 && deploymentFeatures.length > 0;

  return (
    <PhasePageLayout
      phaseKey="7"
      kicker="Launch Workspace"
      title="Phase 7 Deployment"
      description="Deployment phase logs, task logs, and delivery artifacts"
      completed={phaseCompleted}
    >
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
                  <p className="text-sm text-muted-foreground py-8 text-center">No deployment sessions recorded</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle className="text-base">Deployment Documents</CardTitle>
            <CardDescription>docs/deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deploymentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No deployment documents yet</p>
            ) : (
              deploymentDocs.map((artifact) => (
                <MarkdownArtifactCard
                  key={artifact.absolutePath}
                  artifact={{ name: artifact.name, relativePath: artifact.relativePath, excerpt: artifact.excerpt || "No excerpt", updatedAt: artifact.updatedAt }}
                  className="rounded-xl border border-border/50 p-3 space-y-1.5"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-4">
          <CardHeader>
            <CardTitle className="text-base">Deployment Config Artifacts</CardTitle>
            <CardDescription>Docker / CI / Env configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deploymentArtifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No deployment config artifacts yet</p>
            ) : (
              deploymentArtifacts.map((artifact) => (
                <MarkdownArtifactCard
                  key={artifact.absolutePath}
                  artifact={{ name: artifact.name, relativePath: artifact.relativePath, excerpt: artifact.excerpt, updatedAt: artifact.updatedAt }}
                  className="rounded-xl border border-border/50 p-3 space-y-1.5"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PhasePageLayout>
  );
}
