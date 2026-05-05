import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  inferFeaturePhase,
  loadProgressSessions,
  readTaskLogsByPhase,
} from "@/lib/utils/phase-view-data";
import { readTasksJson } from "@/lib/utils/file-operations";
import { PhasePageLayout, formatTime } from "@/components/phase-pages/phase-page-layout";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage() {
  const [sessions, taskLogs, tasksData] = await Promise.all([
    loadProgressSessions(),
    readTaskLogsByPhase([5]),
    readTasksJson(),
  ]);

  const phaseSessions = sessions.filter((session) =>
    ["fullstack-dev", "frontend-dev", "backend-dev"].includes(session.role)
  );
  const developmentFeatures = tasksData.features.filter(
    (feature) => inferFeaturePhase(feature) === 5
  );
  const completedFeatures = developmentFeatures.filter(
    (feature) => feature.status.status === "completed" && feature.status.passes
  );
  const pendingFeatures = developmentFeatures.filter(
    (feature) => feature.status.status !== "completed"
  );
  const phaseCompleted = pendingFeatures.length === 0 && developmentFeatures.length > 0;

  return (
    <PhasePageLayout
      phaseKey="5"
      kicker="Execution Workspace"
      title="Phase 5 Development"
      description="Development execution logs, AI coding logs, and delivery artifacts"
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
                  <p className="text-sm text-muted-foreground py-8 text-center">No development sessions recorded</p>
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
            <CardTitle className="text-base">Completed Deliverables</CardTitle>
            <CardDescription>Source: tasks.json completed features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No completed deliverables yet</p>
            ) : (
              completedFeatures.map((feature) => (
                <div key={feature.id} className="rounded-lg border border-border/50 p-2.5 space-y-1">
                  <p className="font-medium text-sm">{feature.id} · {feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.summary}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-4">
          <CardHeader>
            <CardTitle className="text-base">Pending Items</CardTitle>
            <CardDescription>Quickly locate current blockers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending items</p>
            ) : (
              pendingFeatures.map((feature) => (
                <div key={feature.id} className="rounded-lg border border-border/50 p-2.5 space-y-1">
                  <p className="font-medium text-sm">{feature.id} · {feature.title}</p>
                  <p className="text-xs text-muted-foreground">Status: {feature.status.status}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PhasePageLayout>
  );
}
