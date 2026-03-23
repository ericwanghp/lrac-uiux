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

  const phaseSessions = sessions.filter((session) => ["devops-engineer"].includes(session.role));
  const deploymentFeatures = tasksData.features.filter(
    (feature) => inferFeaturePhase(feature) === 7
  );
  const pendingFeatures = deploymentFeatures.filter(
    (feature) => feature.status.status !== "completed"
  );
  const phaseCompleted = pendingFeatures.length === 0 && deploymentFeatures.length > 0;

  return (
    <div className="admin-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="admin-kicker mb-2">Launch Workspace</p>
          <h1 className="text-3xl font-bold tracking-tight">Phase 7 Deployment</h1>
          <p className="text-muted-foreground mt-1">展示部署阶段日志、工具日志与交付产出物</p>
        </div>
        <Badge variant={phaseCompleted ? "success" : "secondary"}>
          {phaseCompleted ? "已完成" : "进行中"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="admin-panel border-border/80 bg-card/90 lg:col-span-2">
          <CardHeader>
            <CardTitle>阶段执行日志</CardTitle>
            <CardDescription>来源：.auto-coding/progress.txt</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-4">
                {phaseSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无部署阶段会话日志</p>
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

        <Card className="admin-panel border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>AI Coding / IDE 日志</CardTitle>
            <CardDescription>来源：tasks.json executionHistory</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-3">
                {taskLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无部署日志</p>
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
        <Card className="admin-panel border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>部署文档产出物</CardTitle>
            <CardDescription>docs/deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deploymentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无部署文档产出</p>
            ) : (
              deploymentDocs.map((artifact) => (
                <MarkdownArtifactCard
                  key={artifact.absolutePath}
                  artifact={{
                    name: artifact.name,
                    relativePath: artifact.relativePath,
                    excerpt: artifact.excerpt || "暂无摘要",
                    updatedAt: artifact.updatedAt,
                  }}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>部署配置产出物</CardTitle>
            <CardDescription>Docker / CI / Env 配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deploymentArtifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无部署配置产出</p>
            ) : (
              deploymentArtifacts.map((artifact) => (
                <MarkdownArtifactCard
                  key={artifact.absolutePath}
                  artifact={{
                    name: artifact.name,
                    relativePath: artifact.relativePath,
                    excerpt: artifact.excerpt,
                    updatedAt: artifact.updatedAt,
                  }}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
