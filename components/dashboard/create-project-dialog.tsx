"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, FolderRoot, Loader2, Sparkles, TriangleAlert } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildProjectNavigationPath,
  isPathWithinWorkspaceRoot,
  persistProjectSelection,
  resolveProjectCreationPath,
} from "@/lib/utils/project-selection";

interface CreateProjectDialogProps {
  workspaceRoot: string;
}

interface CreateProjectResponse {
  success: boolean;
  data?: {
    project: string;
    root: string;
    signals: string[];
  };
  error?: string;
}

export function CreateProjectDialog({ workspaceRoot }: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [projectPath, setProjectPath] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resolvedPath = React.useMemo(
    () => resolveProjectCreationPath(projectPath, workspaceRoot),
    [projectPath, workspaceRoot]
  );
  const isPathValid =
    projectPath.trim().length > 0 && isPathWithinWorkspaceRoot(resolvedPath, workspaceRoot);

  const resetState = React.useCallback(() => {
    setProjectPath("");
    setErrorMessage(null);
    setIsSubmitting(false);
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

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectPath }),
      });
      const payload = (await response.json()) as CreateProjectResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "创建项目失败。");
      }

      persistProjectSelection(payload.data.root);
      setOpen(false);
      resetState();
      router.push(buildProjectNavigationPath("/dashboard", payload.data.root));
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建项目失败。");
      setIsSubmitting(false);
    }
  }, [isPathValid, projectPath, resetState, router, workspaceRoot]);

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
              <AlertDialogTitle className="text-2xl">Create a project inside this workspace</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 max-w-xl text-sm leading-6">
                输入新的项目路径。可以填绝对路径，也可以填相对于当前 workspace 的子路径；系统只允许在当前项目的上层目录中创建。
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="mt-6 space-y-5">
            <div className="rounded-[1.25rem] border border-border/80 bg-secondary/45 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-primary/15 bg-primary/10 p-2 text-primary">
                  <FolderRoot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Allowed workspace root
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-foreground">{workspaceRoot}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="create-project-path" className="text-sm font-medium text-foreground">
                Project path
              </label>
              <Input
                id="create-project-path"
                value={projectPath}
                onChange={(event) => setProjectPath(event.target.value)}
                placeholder={`${workspaceRoot}/my-next-project`}
                className="h-12 border-border/80 bg-background/85 font-mono text-sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                例如 `my-app`、`agents/demo-app` 或完整路径 `{workspaceRoot}/my-app`
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-border/80 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resolved path</p>
              <p className="mt-2 break-all font-mono text-sm text-foreground">{resolvedPath}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {projectPath.trim().length === 0
                  ? "输入路径后会在这里预览最终创建目录。"
                  : isPathValid
                    ? "路径有效，提交后会自动创建项目目录、.auto-coding、docs 和 .stitch。"
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

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !projectPath.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
              Create Project
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
