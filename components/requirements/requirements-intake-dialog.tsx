"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Sparkles, TriangleAlert } from "lucide-react";
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
import { useProjectQueryParam } from "@/components/providers/use-project-query-param";
import { Textarea } from "@/components/ui/textarea";
import { queueClaudeCliLaunchIntent } from "@/lib/utils/claude-cli-launch-intent";
import type { RequirementsIntakeRecord } from "@/lib/utils/requirements-intake";

interface RequirementsIntakeDialogProps {
  autoOpen: boolean;
  phaseCompleted: boolean;
  initialIntake: RequirementsIntakeRecord;
}

interface RequirementsIntakeResponse {
  success: boolean;
  data?: RequirementsIntakeRecord;
  error?: string;
}

function buildClaudeRequirementsPrompt(
  description: string,
  references: RequirementsIntakeRecord["references"]
) {
  const referenceSection =
    references.length > 0
      ? references.map((reference) => `- ${reference.relativePath}`).join("\n")
      : "- No extra reference files uploaded";

  return [
    "Primary requirement description:",
    description.trim(),
    "",
    "Read and use these project files before taking action:",
    "- docs/requirements/INPUT-REQUIREMENTS.md",
    referenceSection,
    "",
    "Then prepare the project for execution by reviewing the requirements, summarizing the scope, and waiting for the next explicit user instruction before generating or modifying code.",
  ].join("\n");
}

export function RequirementsIntakeDialog({
  autoOpen,
  phaseCompleted,
  initialIntake,
}: RequirementsIntakeDialogProps) {
  const router = useRouter();
  const projectRoot = useProjectQueryParam();
  const [open, setOpen] = React.useState(autoOpen);
  const [description, setDescription] = React.useState(initialIntake.description);
  const [references, setReferences] = React.useState(initialIntake.references);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setOpen(autoOpen);
  }, [autoOpen]);

  const handleSubmit = React.useCallback(async () => {
    if (!description.trim()) {
      setErrorMessage("请先填写需求描述。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("description", description);
      selectedFiles.forEach((file) => {
        formData.append("referenceFiles", file);
      });

      const response = await fetch("/api/requirements/intake", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as RequirementsIntakeResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "需求收集保存失败。");
      }

      setReferences(payload.data.references);
      setSelectedFiles([]);
      queueClaudeCliLaunchIntent({
        projectRoot,
        activePanel: "current",
        launchOptions: {
          defaultPrompt: buildClaudeRequirementsPrompt(description, payload.data.references),
        },
      });
      setSuccessMessage("需求已保存，Claude Code workspace 已为当前项目预填 requirements 上下文。");
      setOpen(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("intake");
        const nextQuery = url.searchParams.toString();
        router.replace(nextQuery ? `${url.pathname}?${nextQuery}` : url.pathname);
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "需求收集保存失败。");
    } finally {
      setIsSubmitting(false);
    }
  }, [description, projectRoot, router, selectedFiles]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              {phaseCompleted ? "Update Requirements Intake" : "Open Requirements Intake"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-3xl p-0">
            <div className="rounded-[1.5rem] border border-white/50 bg-card/95 p-6">
              <AlertDialogHeader className="space-y-4 text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Requirements Intake
                </div>
                <div>
                  <AlertDialogTitle className="text-2xl">Collect Product Requirements</AlertDialogTitle>
                  <AlertDialogDescription className="mt-2 max-w-2xl text-sm leading-6">
                    输入业务目标、核心用户场景、约束条件，并上传参考文档。提交后会生成项目需求 brief，供后续 BRD / PRD / Claude CLI 工作流使用。
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>

              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="space-y-5">
                  <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Requirement Description
                    </p>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="请描述项目目标、目标用户、核心流程、关键功能、技术约束和优先级..."
                      className="mt-3 min-h-[260px] resize-none border-border/80 bg-background/90 text-sm leading-6"
                    />
                  </div>

                  <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Reference Documents
                    </p>
                    <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 px-5 py-8 text-center transition hover:border-primary/40 hover:bg-primary/5">
                      <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Upload reference files</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          支持 PDF、DOCX、PNG、JPG、TXT、MD 等常见参考文档
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          const nextFiles = Array.from(event.target.files ?? []);
                          setSelectedFiles(nextFiles);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">What happens next</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
                        Save the description to a persisted intake record
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
                        Upload references into `docs/requirements/references`
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
                        Generate `docs/requirements/INPUT-REQUIREMENTS.md`
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Selected files</p>
                    <div className="mt-3 space-y-2">
                      {selectedFiles.length > 0 ? (
                        selectedFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="rounded-2xl border border-border/70 bg-secondary/35 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.max(1, Math.round(file.size / 1024))} KB
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                          尚未选择新的参考文档。
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Saved references</p>
                    <div className="mt-3 space-y-2">
                      {references.length > 0 ? (
                        references.map((reference) => (
                          <div
                            key={`${reference.relativePath}-${reference.uploadedAt}`}
                            className="rounded-2xl border border-border/70 bg-secondary/35 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-foreground">{reference.name}</p>
                            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                              {reference.relativePath}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                          还没有已保存的参考文档。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel disabled={isSubmitting}>Close</AlertDialogCancel>
                <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !description.trim()}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "Saving Intake" : "Start Generating Project"}
                </Button>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {!phaseCompleted ? (
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Requirements not completed
          </Badge>
        ) : null}
      </div>

      {successMessage ? (
        <div className="rounded-[1.25rem] border border-success/25 bg-success/10 px-4 py-3 text-sm text-foreground">
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}
