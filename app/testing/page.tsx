import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  inferFeaturePhase,
  loadProgressSessions,
  readArtifacts,
  readCodeArtifacts,
  readExplicitArtifacts,
  readTaskLogsByPhase,
} from "@/lib/utils/phase-view-data";
import { readTasksJson } from "@/lib/utils/file-operations";
import { MarkdownArtifactCard } from "@/components/shared/markdown-artifact-card";
import { PhasePageLayout, formatTime } from "@/components/phase-pages/phase-page-layout";

export const dynamic = "force-dynamic";

export default async function TestingPage() {
  const [sessions, taskLogs, tasksData, docArtifacts, testCodeArtifacts, configArtifacts] =
    await Promise.all([
      loadProgressSessions(),
      readTaskLogsByPhase([6]),
      readTasksJson(),
      readArtifacts("test"),
      readCodeArtifacts(
        "tests",
        (name) => name.includes(".test.") || name.endsWith(".spec.ts"),
        40
      ),
      readExplicitArtifacts(["vitest.config.ts", "playwright.config.ts"]),
    ]);

  const phaseSessions = sessions.filter((session) =>
    ["test-engineer", "test-automator"].includes(session.role)
  );
  const testingFeatures = tasksData.features.filter((feature) => inferFeaturePhase(feature) === 6);
  const pendingFeatures = testingFeatures.filter(
    (feature) => feature.status.status !== "completed"
  );
  const phaseCompleted = pendingFeatures.length === 0 && testingFeatures.length > 0;

  return (
    <PhasePageLayout
      phaseKey="6"
      kicker="Validation Workspace"
      title="Phase 6 Testing"
      description="Testing sessions, task logs, test documents, and test code artifacts"
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
                  <p className="text-sm text-muted-foreground py-8 text-center">No testing sessions recorded</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="admin-panel border-border/60 bg-card/90 hover-glow animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle className="text-base">Test Documents</CardTitle>
            <CardDescription>docs/test and config artifacts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...docArtifacts, ...configArtifacts].length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No test documents yet</p>
            ) : (
              [...docArtifacts, ...configArtifacts].map((file) => (
                <MarkdownArtifactCard
                  key={file.absolutePath}
                  artifact={{ name: file.name, relativePath: file.relativePath, excerpt: file.excerpt || "No excerpt", updatedAt: file.updatedAt }}
                  className="rounded-xl border border-border/50 p-3 space-y-1.5"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/60 bg-card/90 lg:col-span-2 hover-glow animate-fade-in-up stagger-4">
          <CardHeader>
            <CardTitle className="text-base">Test Code Artifacts</CardTitle>
            <CardDescription>Test and spec files from tests directory</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-2">
                {testCodeArtifacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No test code yet</p>
                ) : (
                  testCodeArtifacts.map((file) => (
                    <MarkdownArtifactCard
                      key={file.absolutePath}
                      artifact={{ name: file.name, relativePath: file.relativePath, excerpt: file.excerpt || "No excerpt", updatedAt: file.updatedAt }}
                      className="rounded-xl border border-border/50 p-3 space-y-1.5"
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PhasePageLayout>
  );
}
