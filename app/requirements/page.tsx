import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequirementsIntakeDialog } from "@/components/requirements/requirements-intake-dialog";
import {
  readArtifacts,
  loadProgressSessions,
  readExplicitArtifacts,
  readTaskLogsByPhase,
} from "@/lib/utils/phase-view-data";
import { MarkdownArtifactCard } from "@/components/shared/markdown-artifact-card";
import { readRequirementsIntake } from "@/lib/utils/requirements-intake";

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

  const phaseSessions = sessions.filter((session) =>
    ["business-analyst", "product-manager"].includes(session.role)
  );
  const phaseCompleted = brdFiles.length > 0 && prdFiles.length > 0;
  const hasSavedIntake =
    intakeRecord.description.trim().length > 0 || intakeRecord.references.length > 0;
  const shouldAutoOpenIntake = intakeRequested || (!phaseCompleted && !hasSavedIntake);

  return (
    <div className="admin-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="admin-kicker mb-2">Discovery Workspace</p>
          <h1 className="text-3xl font-bold tracking-tight">Phase 1-2 Requirements</h1>
          <p className="text-muted-foreground mt-1">
            展示需求阶段执行日志、AI Coding/IDE日志与产出物
          </p>
        </div>
        <Badge variant={phaseCompleted ? "success" : "secondary"}>
          {phaseCompleted ? "已完成" : "进行中"}
        </Badge>
      </div>

      <Card className="admin-panel border-border/80 bg-card/90">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Requirements Intake</CardTitle>
              <CardDescription>
                收集项目需求描述、上传参考文档，并生成可复用的 requirements brief
              </CardDescription>
            </div>
            <RequirementsIntakeDialog
              autoOpen={shouldAutoOpenIntake}
              phaseCompleted={phaseCompleted}
              initialIntake={intakeRecord}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Requirement Description
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
              {intakeRecord.description || "尚未提交需求描述。点击右上角按钮，打开需求收集页。"}
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Reference Files</p>
              <div className="mt-3 space-y-2">
                {intakeRecord.references.length > 0 ? (
                  intakeRecord.references.map((reference) => (
                    <div
                      key={`${reference.relativePath}-${reference.uploadedAt}`}
                      className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-foreground">{reference.name}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                        {reference.relativePath}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                    尚未上传参考文档。
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Generated Brief</p>
              <div className="mt-3 space-y-3">
                {intakeArtifacts.length > 0 ? (
                  intakeArtifacts.map((file) => (
                    <MarkdownArtifactCard
                      key={file.absolutePath}
                      artifact={{
                        name: file.name,
                        relativePath: file.relativePath,
                        excerpt: file.excerpt || "暂无摘要",
                        updatedAt: file.updatedAt,
                      }}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                    提交需求后会自动生成 `docs/requirements/INPUT-REQUIREMENTS.md`
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-sm text-muted-foreground">暂无需求阶段会话日志</p>
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
                        {session.executionItems.slice(0, 6).map((item, index) => (
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
        <Card className="admin-panel border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>BRD 产出物</CardTitle>
            <CardDescription>阶段完成后自动展示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {brdFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无 BRD 产出物</p>
            ) : (
              brdFiles.map((file) => (
                <MarkdownArtifactCard
                  key={file.absolutePath}
                  artifact={{
                    name: file.name,
                    relativePath: file.relativePath,
                    excerpt: file.excerpt || "暂无摘要",
                    updatedAt: file.updatedAt,
                  }}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>PRD 产出物</CardTitle>
            <CardDescription>阶段完成后自动展示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {prdFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无 PRD 产出物</p>
            ) : (
              prdFiles.map((file) => (
                <MarkdownArtifactCard
                  key={file.absolutePath}
                  artifact={{
                    name: file.name,
                    relativePath: file.relativePath,
                    excerpt: file.excerpt || "暂无摘要",
                    updatedAt: file.updatedAt,
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
