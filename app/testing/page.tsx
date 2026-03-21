import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  loadProgressSessions,
  readArtifacts,
  readCodeArtifacts,
  readExplicitArtifacts,
  readTaskLogsByFeatureIds,
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

const TESTING_FEATURE_IDS = ["inital-p6t-001", "inital-p6t-002"];

export default async function TestingPage() {
  const [sessions, taskLogs, tasksData, docArtifacts, testCodeArtifacts, configArtifacts] =
    await Promise.all([
      loadProgressSessions(),
      readTaskLogsByFeatureIds(TESTING_FEATURE_IDS),
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
    ["test-engineer", "frontend-dev"].includes(session.role)
  );
  const testingFeatures = tasksData.features.filter((feature) =>
    TESTING_FEATURE_IDS.includes(feature.id)
  );
  const pendingFeatures = testingFeatures.filter(
    (feature) => feature.status.status !== "completed"
  );
  const phaseCompleted = pendingFeatures.length === 0 && testingFeatures.length > 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Phase 6 Testing</h1>
          <p className="text-muted-foreground mt-1">展示测试阶段日志、工具日志与测试产出物</p>
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
                  <p className="text-sm text-muted-foreground">暂无测试阶段会话日志</p>
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
                  <p className="text-sm text-muted-foreground">暂无测试日志</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>测试文档产出物</CardTitle>
            <CardDescription>docs/test 与显式配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...docArtifacts, ...configArtifacts].length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无测试文档产出</p>
            ) : (
              [...docArtifacts, ...configArtifacts].map((artifact) => (
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>测试代码产出物</CardTitle>
            <CardDescription>tests 目录中的 test/spec 文件</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-3">
                {testCodeArtifacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无测试代码产出</p>
                ) : (
                  testCodeArtifacts.map((artifact) => (
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
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
