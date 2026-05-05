"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  FolderRoot,
  Loader2,
  Sparkles,
  TerminalSquare,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  buildProjectNavigationPath,
  isPathWithinWorkspaceRoot,
  persistProjectSelection,
  resolveProjectCreationPath,
} from "@/lib/utils/project-selection";

interface CreateProjectDialogProps {
  workspaceRoot: string;
  setupScriptPath: string;
}

interface CreateProjectResponse {
  success: boolean;
  data?: {
    project: string;
    root: string;
    signals: string[];
    command: string;
    output: string[];
    generatedPaths: string[];
  };
  error?: string;
}

type WizardStep = "path" | "options" | "result";

interface InitOptions {
  copyLessonsTemplate: boolean;
  runDependencyCheck: boolean;
}

interface InitResult {
  project: string;
  root: string;
  signals: string[];
  command: string;
  output: string[];
  generatedPaths: string[];
}

interface StreamEventPayloadMap {
  start: {
    projectPath: string;
    options: InitOptions;
  };
  log: {
    line: string;
  };
  done: InitResult;
  error: {
    error: string;
  };
}

const GENERATED_PATH_LABELS = [
  ".claude agents / rules / skills",
  ".auto-coding tasks + progress",
  "docs workspace folders",
  ".stitch design workspace",
  "README.md / setup.sh / init.sh",
];

const DEFAULT_CONFIGURATION_ITEMS = [
  "tasks.json initialized from the framework template",
  "progress.txt created for long-running notes",
  "README / CLAUDE / setup / init scripts scaffolded",
  "non-interactive bootstrap skips dependency checks during API creation",
];

export function CreateProjectDialog({ workspaceRoot, setupScriptPath }: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<WizardStep>("path");
  const [projectPath, setProjectPath] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<InitResult | null>(null);
  const [liveLogs, setLiveLogs] = React.useState<string[]>([]);
  const [options, setOptions] = React.useState<InitOptions>({
    copyLessonsTemplate: false,
    runDependencyCheck: false,
  });

  const resolvedPath = React.useMemo(
    () => resolveProjectCreationPath(projectPath, workspaceRoot),
    [projectPath, workspaceRoot]
  );
  const setupCommandPreview = React.useMemo(
    () => `bash ${setupScriptPath} new ${resolvedPath}`,
    [resolvedPath, setupScriptPath]
  );
  const isPathValid =
    projectPath.trim().length > 0 && isPathWithinWorkspaceRoot(resolvedPath, workspaceRoot);

  const resetState = React.useCallback(() => {
    setStep("path");
    setProjectPath("");
    setErrorMessage(null);
    setIsSubmitting(false);
    setResult(null);
    setLiveLogs([]);
    setOptions({
      copyLessonsTemplate: false,
      runDependencyCheck: false,
    });
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetState();
      }
    },
    [resetState]
  );

  const handleSubmit = React.useCallback(async () => {
    if (!projectPath.trim()) {
      setErrorMessage("请输入项目路径。");
      return;
    }

    if (!isPathValid) {
      setErrorMessage(`项目路径必须位于 ${workspaceRoot} 下。`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStep("result");
    setResult({
      project: "",
      root: resolvedPath,
      signals: [],
      command: setupCommandPreview,
      output: [],
      generatedPaths: [],
    });
    setLiveLogs(["[wizard] Preparing initialization..."]);

    try {
      const response = await fetch("/api/projects?stream=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectPath, options }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as CreateProjectResponse | null;
        throw new Error(payload?.error || "创建项目失败。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;

      const handleEvent = (eventName: keyof StreamEventPayloadMap, payload: unknown) => {
        if (eventName === "start") {
          setLiveLogs((current) => [...current, "[wizard] Setup process started..."]);
          return;
        }

        if (eventName === "log") {
          const data = payload as StreamEventPayloadMap["log"];
          setLiveLogs((current) => [...current, data.line]);
          return;
        }

        if (eventName === "done") {
          const data = payload as StreamEventPayloadMap["done"];
          setResult(data);
          setLiveLogs(data.output.length > 0 ? data.output : ["[wizard] Initialization complete."]);
          setIsSubmitting(false);
          return;
        }

        if (eventName === "error") {
          const data = payload as StreamEventPayloadMap["error"];
          streamError = data.error;
          setLiveLogs((current) => [...current, `[error] ${data.error}`]);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const lines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          const eventLine = lines.find((line) => line.startsWith("event:"));
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventName = eventLine.replace("event:", "").trim() as keyof StreamEventPayloadMap;
          const payload = JSON.parse(dataLine.replace("data:", "").trim()) as unknown;
          handleEvent(eventName, payload);
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }
    } catch (error) {
      setStep("options");
      setErrorMessage(error instanceof Error ? error.message : "创建项目失败。");
      setIsSubmitting(false);
    }
  }, [
    isPathValid,
    options,
    projectPath,
    resolvedPath,
    setupCommandPreview,
    workspaceRoot,
  ]);

  const handleOpenProject = React.useCallback(() => {
    if (!result) return;
    persistProjectSelection(result.root);
    setOpen(false);
    resetState();
    router.push(buildProjectNavigationPath("/dashboard", result.root));
    router.refresh();
  }, [resetState, result, router]);

  const handleCreateRequirementsNow = React.useCallback(() => {
    if (!result) return;
    persistProjectSelection(result.root);
    setOpen(false);
    resetState();
    router.push(buildProjectNavigationPath("/requirements", result.root, "intake=1"));
    router.refresh();
  }, [resetState, result, router]);

  const handleNextStep = React.useCallback(() => {
    if (!projectPath.trim()) {
      setErrorMessage("请输入项目路径。");
      return;
    }
    if (!isPathValid) {
      setErrorMessage(`项目路径必须位于 ${workspaceRoot} 下。`);
      return;
    }
    setErrorMessage(null);
    setStep("options");
  }, [isPathValid, projectPath, workspaceRoot]);

  const handlePreviousStep = React.useCallback(() => {
    setErrorMessage(null);
    setStep("path");
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="mr-2 h-4 w-4" />
          Create New Project
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-2xl p-0">
        <div className="rounded-[1.5rem] border border-white/50 bg-card/95 p-6">
          <AlertDialogHeader className="space-y-4 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Project Bootstrap
            </div>
            <div>
              <AlertDialogTitle className="text-2xl">Project Initialization Wizard</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 max-w-xl text-sm leading-6">
                输入新的项目路径后，向导会通过 `setup.sh new` 创建项目目录，并生成基础脚手架与默认配置。路径既可以是绝对路径，也可以是相对于当前 workspace 的子路径。
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: "path", label: "1. Path" },
              { id: "options", label: "2. Options" },
              { id: "result", label: "3. Result" },
            ].map((item) => (
              <Badge
                key={item.id}
                variant={
                  item.id === step
                    ? "default"
                    : step === "result" || (step === "options" && item.id === "path")
                      ? "secondary"
                      : "outline"
                }
                className="rounded-full px-3 py-1"
              >
                {item.label}
              </Badge>
            ))}
          </div>

          {step === "path" ? (
            <div className="mt-6 space-y-5">
            <div className="rounded-[1.25rem] border-2 border-primary/40 bg-primary/5 p-4 ring-2 ring-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <FolderRoot className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Project path</p>
              </div>
              <Input
                id="create-project-path"
                value={projectPath}
                onChange={(event) => setProjectPath(event.target.value)}
                placeholder={`${workspaceRoot}/my-next-project`}
                className="h-12 border-primary/30 bg-background/85 font-mono text-sm focus:border-primary focus:ring-primary/20"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleNextStep();
                  }
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                例如 `my-app`、`agents/demo-app` 或完整路径 `{workspaceRoot}/my-app`
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-4">
                <div className="flex items-center gap-2">
                  <WandSparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Initialization plan</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    Validate path
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    Run setup.sh
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    Generate scaffold
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    Switch project
                  </Badge>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {DEFAULT_CONFIGURATION_ITEMS.map((item) => (
                    <li key={item} className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Bootstrap command</p>
                </div>
                <Textarea
                  readOnly
                  value={setupCommandPreview}
                  className="mt-4 min-h-[132px] resize-none border-border/80 bg-background/90 font-mono text-xs leading-6"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  后端会以非交互模式执行该命令，并跳过依赖检查，避免 API 请求卡在 shell prompt。
                </p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-2">
                  <FolderRoot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Allowed workspace root
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-foreground">{workspaceRoot}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Will generate</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GENERATED_PATH_LABELS.map((item) => (
                  <Badge key={item} variant="outline" className="rounded-full border-border/80 bg-background/80">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resolved path</p>
              <p className="mt-2 break-all font-mono text-sm text-foreground">{resolvedPath}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {projectPath.trim().length === 0
                  ? "输入路径后会在这里预览最终创建目录。"
                  : isPathValid
                    ? "路径有效，提交后会通过 setup.sh 生成项目目录、框架脚手架和默认配置。"
                    : "路径无效，必须保持在当前 workspace root 内。"}
              </p>
            </div>

            {errorMessage ? (
              <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
            </div>
          ) : null}

          {step === "options" ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Target project</p>
                <p className="mt-2 break-all font-mono text-sm text-foreground">{resolvedPath}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  选择初始化选项，然后执行 `setup.sh new`。这些选项会通过非交互环境变量传给脚本。
                </p>
              </div>

              <div className="space-y-3 rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-secondary/35 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Copy LESSONS_LEARNED template</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      启用后会复制 `.auto-coding/LESSONS_LEARNED.md` 模板；关闭则跳过。
                    </p>
                  </div>
                  <Switch
                    checked={options.copyLessonsTemplate}
                    onCheckedChange={(checked) =>
                      setOptions((current) => ({ ...current, copyLessonsTemplate: checked }))
                    }
                    aria-label="Copy lessons learned template"
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-secondary/35 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Run dependency checks</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      启用后执行 `check-skills.js` / `check-mcp.js`；关闭则更快完成初始化。
                    </p>
                  </div>
                  <Switch
                    checked={options.runDependencyCheck}
                    onCheckedChange={(checked) =>
                      setOptions((current) => ({ ...current, runDependencyCheck: checked }))
                    }
                    aria-label="Run dependency checks"
                  />
                </div>
              </div>

              {errorMessage ? (
                <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "result" && result ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-[1.25rem] border border-success/25 bg-success/10 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-success" />
                  <p className="text-sm font-semibold text-foreground">Project initialized successfully</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.project} 已完成脚手架初始化。你现在可以打开它进入 dashboard。
                </p>
                <p className="mt-3 break-all font-mono text-xs text-foreground">{result.root}</p>
              </div>

              <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Executed command</p>
                <Textarea
                  readOnly
                  value={result.command || setupCommandPreview}
                  className="mt-3 min-h-[68px] resize-none border-border/80 bg-background/90 font-mono text-xs"
                />
              </div>

              <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Generated paths</p>
                <div className="mt-3 max-h-44 space-y-2 overflow-auto">
                  {result.generatedPaths.length > 0 ? (
                    result.generatedPaths.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 font-mono text-xs text-foreground"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                      初始化完成后会列出生成的关键路径。
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Setup output</p>
                <Textarea
                  readOnly
                  value={liveLogs.join("\n")}
                  className="mt-3 min-h-[220px] resize-none border-border/80 bg-background/90 font-mono text-xs leading-6"
                />
              </div>

              {!isSubmitting ? (
                <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Next Recommended Step</p>
                  <p className="mt-2 text-sm text-foreground">
                    项目脚手架已经创建完成。你可以立刻进入需求收集页，填写需求描述、上传参考文档，并开始生成项目。
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <AlertDialogFooter className="mt-6">
            {step === "path" ? <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel> : null}
            {step === "options" ? (
              <Button variant="outline" onClick={handlePreviousStep} disabled={isSubmitting}>
                Back
              </Button>
            ) : null}
            {step === "result" ? (
              <Button variant="outline" onClick={resetState}>
                Create Another
              </Button>
            ) : null}

            {step === "path" ? (
              <Button onClick={handleNextStep} disabled={!projectPath.trim()}>
                Continue
              </Button>
            ) : null}
            {step === "options" ? (
              <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !projectPath.trim()}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Initializing Project" : "Initialize Project"}
              </Button>
            ) : null}
            {step === "result" ? (
              <Button variant="outline" onClick={handleCreateRequirementsNow} disabled={isSubmitting}>
                Create Requirements Now
              </Button>
            ) : null}
            {step === "result" ? (
              <Button onClick={handleOpenProject}>
                Open New Project
              </Button>
            ) : null}
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
