"use client";

import * as React from "react";
import {
  GitBranch,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
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
import { Textarea } from "@/components/ui/textarea";

interface ImacSessionData {
  id: string;
  abbreviation: string;
  title: string;
  description: string;
  status: string;
  worktree: { branch: string; path: string | null };
  createdAt: string;
}

type WizardStep = "details" | "attachments";

export function CreateImacDialog() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<WizardStep>("details");
  const [title, setTitle] = React.useState("");
  const [abbreviation, setAbbreviation] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [createdSession, setCreatedSession] = React.useState<ImacSessionData | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetState = React.useCallback(() => {
    setStep("details");
    setTitle("");
    setAbbreviation("");
    setDescription("");
    setFiles([]);
    setIsSubmitting(false);
    setErrorMessage(null);
    setCreatedSession(null);
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) resetState();
    },
    [resetState]
  );

  const handleTitleChange = React.useCallback((value: string) => {
    setTitle(value);
    const abbr = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word) => word.slice(0, 3))
      .join("-")
      .slice(0, 20);
    setAbbreviation(abbr);
  }, []);

  const handleAddFiles = React.useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  }, []);

  const handleRemoveFile = React.useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!title.trim() || !abbreviation.trim()) {
      setErrorMessage("Title and abbreviation are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("abbreviation", abbreviation.trim());
      formData.append("description", description.trim());
      files.forEach((file) => formData.append("referenceFiles", file));

      const response = await fetch("/api/imac", { method: "POST", body: formData });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create IMAC session");
      }

      setCreatedSession(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create IMAC session");
      setIsSubmitting(false);
    }
  }, [title, abbreviation, description, files]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <GitBranch className="mr-2 h-4 w-4" />
          Create New IMAC
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-2xl p-0">
        <div className="rounded-[1.5rem] border border-white/50 bg-card/95 p-6">
          <AlertDialogHeader className="space-y-4 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              IMAC Cycle
            </div>
            <div>
              <AlertDialogTitle className="text-2xl">Create New IMAC</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 max-w-xl text-sm leading-6">
                Start an isolated change cycle with a git worktree. Describe what you want to change, attach reference files, and manage the cycle independently.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: "details", label: "1. Details" },
              { id: "attachments", label: "2. Attachments" },
            ].map((item) => (
              <Badge
                key={item.id}
                variant={
                  item.id === step
                    ? "default"
                    : step === "attachments" && item.id === "details"
                      ? "secondary"
                      : "outline"
                }
                className="rounded-full px-3 py-1"
              >
                {item.label}
              </Badge>
            ))}
          </div>

          {!createdSession ? (
            <>
              {step === "details" && (
                <div className="mt-6 space-y-5">
                  <div className="rounded-[1.25rem] border-2 border-primary/40 bg-primary/5 p-4 ring-2 ring-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Plus className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-primary">IMAC Details</p>
                    </div>
                    <Input
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. Add Authentication Module"
                      className="h-12 border-primary/30 bg-background/85 text-sm focus:border-primary focus:ring-primary/20"
                      autoFocus
                    />
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Abbreviation (auto-generated, editable)</p>
                      <Input
                        value={abbreviation}
                        onChange={(e) => setAbbreviation(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                        placeholder="auto-generated"
                        className="h-10 border-border/80 bg-background/85 font-mono text-xs"
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Branch will be: <code className="text-primary">imac/{abbreviation || "..."}</code>
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">Description</p>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the changes you want to make..."
                      className="min-h-[120px] border-border/80 bg-background/90 text-sm"
                    />
                  </div>

                  {errorMessage && (
                    <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {step === "attachments" && (
                <div className="mt-6 space-y-5">
                  <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">Reference Files</p>
                    <div
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-background/60 p-8 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag files here</p>
                      <p className="text-xs text-muted-foreground mt-1">Screenshots, documents, or reference files</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddFiles(e.target.files)}
                    />

                    {files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="text-xs truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="shrink-0 ml-2 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Title:</span> {title}</p>
                      <p><span className="text-muted-foreground">Branch:</span> <code className="text-primary">imac/{abbreviation}</code></p>
                      <p><span className="text-muted-foreground">Attachments:</span> {files.length} file(s)</p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-[1.25rem] border border-success/25 bg-success/10 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-success" />
                  <p className="text-sm font-semibold text-foreground">IMAC session created</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your IMAC cycle <strong>{createdSession.title}</strong> has been created. Create a worktree to start working in isolation.
                </p>
                <div className="mt-3 space-y-1 text-xs font-mono text-foreground">
                  <p>ID: {createdSession.id}</p>
                  <p>Branch: imac/{createdSession.abbreviation}</p>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="mt-6">
            {!createdSession && step === "details" && (
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            )}
            {!createdSession && step === "attachments" && (
              <Button variant="outline" onClick={() => setStep("details")} disabled={isSubmitting}>
                Back
              </Button>
            )}
            {!createdSession && step === "details" && (
              <Button onClick={() => setStep("attachments")} disabled={!title.trim()}>
                Continue
              </Button>
            )}
            {!createdSession && step === "attachments" && (
              <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Creating..." : "Create IMAC"}
              </Button>
            )}
            {createdSession && (
              <Button onClick={() => void handleOpenChange(false)}>Done</Button>
            )}
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
