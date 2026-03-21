import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  loadProgressSessions,
  readArtifacts,
  readTaskLogsByFeatureIds,
} from "@/lib/utils/phase-view-data";
import { MarkdownArtifactCard } from "@/components/shared/markdown-artifact-card";

export const dynamic = "force-dynamic";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ArchitecturePage() {
  const [archFiles, sessions, taskLogs] = await Promise.all([
    readArtifacts("architecture"),
    loadProgressSessions(),
    readTaskLogsByFeatureIds([
      "inital-p5d-005",
      "inital-p5d-007",
      "inital-p5d-008",
      "inital-p5d-013",
      "inital-p5d-014",
      "inital-p5d-015",
    ]),
  ]);

  const phaseSessions = sessions.filter((session) => ["architect"].includes(session.role));
  const phaseCompleted = archFiles.length > 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Phase 3-4 Architecture</h1>
          <p className="text-muted-foreground mt-1">展示架构阶段日志、工具日志与架构产出物</p>
        </div>
        <Badge variant={phaseCompleted ? "success" : "secondary"}>
          {phaseCompleted ? "已完成" : "进行中"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>阶段执行日志</CardTitle>
            <CardDescription>来源：.auto-coding/progress.txt</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-4">
                {phaseSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无架构阶段会话日志</p>
                ) : (
                  phaseSessions.map((session) => (
                    <div
                      key={`${session.name}-${session.timestamp}`}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{session.name}</p>
                        <Badge variant="outline">{session.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(session.timestamp)}
                      </p>
                      <ul className="text-sm space-y-1">
                        {session.executionItems.slice(0, 8).map((item, index) => (
                          <li key={`${session.name}-exec-${index}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Coding / IDE 日志</CardTitle>
            <CardDescription>来源：tasks.json executionHistory</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-3">
                {taskLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无开发日志</p>
                ) : (
                  taskLogs.map((log, index) => (
                    <div
                      key={`${log.featureId}-${log.timestamp}-${index}`}
                      className="rounded-md border p-3"
                    >
                      <p className="text-sm font-medium">{log.featureId}</p>
                      <p className="text-xs text-muted-foreground">{log.featureTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(log.timestamp)}
                      </p>
                      <p className="text-sm mt-2">{log.action}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Architecture 产出物</CardTitle>
          <CardDescription>阶段完成后自动展示</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {archFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无架构文档产出物</p>
          ) : (
            archFiles.map((file) => (
              <MarkdownArtifactCard
                key={file.absolutePath}
                artifact={{
                  name: file.name,
                  relativePath: file.relativePath,
                  excerpt: file.excerpt || "暂无摘要",
                  updatedAt: file.updatedAt,
                }}
                className="rounded-md border p-4 space-y-2"
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
