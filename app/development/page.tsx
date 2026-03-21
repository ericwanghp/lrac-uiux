import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadProgressSessions, readTaskLogsByFeatureIds } from "@/lib/utils/phase-view-data";
import { readTasksJson } from "@/lib/utils/file-operations";

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

const DEVELOPMENT_FEATURE_IDS = [
  "inital-p5d-012",
  "inital-p5d-013",
  "inital-p5d-014",
  "inital-p5d-015",
  "inital-p5d-016",
  "inital-p5d-017",
];

export default async function DevelopmentPage() {
  const [sessions, taskLogs, tasksData] = await Promise.all([
    loadProgressSessions(),
    readTaskLogsByFeatureIds(DEVELOPMENT_FEATURE_IDS),
    readTasksJson(),
  ]);

  const phaseSessions = sessions.filter((session) =>
    ["frontend-dev", "backend-dev", "fullstack-dev"].includes(session.role)
  );
  const developmentFeatures = tasksData.features.filter((feature) =>
    DEVELOPMENT_FEATURE_IDS.includes(feature.id)
  );
  const completedFeatures = developmentFeatures.filter(
    (feature) => feature.status.status === "completed" && feature.status.passes
  );
  const pendingFeatures = developmentFeatures.filter(
    (feature) => feature.status.status !== "completed"
  );
  const phaseCompleted = pendingFeatures.length === 0 && developmentFeatures.length > 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Phase 5 Development</h1>
          <p className="text-muted-foreground mt-1">
            展示开发阶段执行日志、AI Coding日志与交付产出
          </p>
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
                  <p className="text-sm text-muted-foreground">暂无开发阶段会话日志</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>开发阶段产出物（已完成）</CardTitle>
            <CardDescription>来源：tasks.json completed features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无已完成交付</p>
            ) : (
              completedFeatures.map((feature) => (
                <div key={feature.id} className="rounded-md border p-3 space-y-1">
                  <p className="font-medium">
                    {feature.id} · {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{feature.summary}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>未完成项</CardTitle>
            <CardDescription>用于快速定位当前阻塞</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">无未完成项</p>
            ) : (
              pendingFeatures.map((feature) => (
                <div key={feature.id} className="rounded-md border p-3 space-y-1">
                  <p className="font-medium">
                    {feature.id} · {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground">状态：{feature.status.status}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
