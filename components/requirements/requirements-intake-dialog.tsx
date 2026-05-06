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
import { PROJECT_ROOT_LOCAL_STORAGE_KEY } from "@/lib/constants/project-context";
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

  React.useEffect(() => {
    if (!open) {
      setDescription(initialIntake.description);
      setReferences(initialIntake.references);
      setSelectedFiles([]);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [open, initialIntake.description, initialIntake.references]);

  const handleSubmit = React.useCallback(async () => {
    if (!description.trim()) {
      setErrorMessage("Please enter a requirement description.");
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
        throw new Error(payload.error || "Failed to save requirements intake.");
      }

      setReferences(payload.data.references);
      setSelectedFiles([]);

      const resolvedProjectRoot = projectRoot
        || (typeof window !== "undefined" ? window.localStorage.getItem(PROJECT_ROOT_LOCAL_STORAGE_KEY) : null)
        || undefined;

      queueClaudeCliLaunchIntent({
        projectRoot: resolvedProjectRoot,
        activePanel: "current",
        autoStart: true,
        launchOptions: {
          defaultPrompt: phaseCompleted ? "" : buildClaudeRequirementsPrompt(description, payload.data.references),
          continueWithRecentContext: phaseCompleted,
        },
      });
      setSuccessMessage("Requirements saved. Claude Code workspace has been pre-filled with requirements context for the current project.");
      setOpen(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("intake");
        const nextQuery = url.searchParams.toString();
        router.replace(nextQuery ? `${url.pathname}?${nextQuery}` : url.pathname);
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save requirements intake.");
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
          <AlertDialogContent className="max-w-5xl p-0">
            <div className="rounded-[1.5rem] border border-white/50 bg-card/95 p-6">
              <AlertDialogHeader className="space-y-4 text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Requirements Intake
                </div>
                <div>
                  <AlertDialogTitle className="text-2xl">Collect Product Requirements</AlertDialogTitle>
                  <AlertDialogDescription className="mt-2 max-w-2xl text-sm leading-6">
                    Enter business goals, core user scenarios, and constraints, then upload reference documents. After submission, a project requirements brief will be generated for downstream BRD / PRD / Claude CLI workflows.
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>

              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,25fr)_minmax(180px,0.85fr)]">
                <div className="flex flex-col">
                  <div className="flex flex-1 flex-col rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Requirement Description
                    </p>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe project goals, target users, core workflows, key features, technical constraints, and priorities..."
                      className="mt-3 min-h-[200px] flex-1 resize-none border-border/80 bg-background/90 text-sm leading-6"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Reference Documents</p>
                    <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 px-5 py-8 text-center transition hover:border-primary/40 hover:bg-primary/5">
                      <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Upload reference files</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Supports PDF, DOCX, PNG, JPG, TXT, MD and other common reference formats
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
                          No new reference documents selected.
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
                          No saved reference documents yet.
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
