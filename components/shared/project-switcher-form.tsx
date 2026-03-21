"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { PROJECT_ROOT_COOKIE_KEY } from "@/lib/constants/project-context";

type ProjectOption = {
  root: string;
  name: string;
};

const LOCALSTORAGE_KEY = "lrac-last-project-path";

type ValidationState = "idle" | "valid" | "invalid";

interface ProjectSwitcherFormProps {
  availableProjects: ProjectOption[];
  currentProjectRoot: string;
}

export function ProjectSwitcherForm({
  availableProjects,
  currentProjectRoot,
}: ProjectSwitcherFormProps) {
  const router = useRouter();
  const [pathValue, setPathValue] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const persistProjectSelection = useCallback((projectRoot: string) => {
    localStorage.setItem(LOCALSTORAGE_KEY, projectRoot);
    document.cookie = `${PROJECT_ROOT_COOKIE_KEY}=${encodeURIComponent(projectRoot)}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  // Restore last saved path on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) {
      setPathValue(saved);
    }
  }, []);

  // Validate path against available projects
  const validatePath = useCallback(
    (path: string): boolean => {
      if (!path.trim()) return false;
      return availableProjects.some((p) => p.root === path || p.root.startsWith(path + "/"));
    },
    [availableProjects]
  );

  // Auto-validate when path changes
  useEffect(() => {
    if (!pathValue.trim()) {
      setValidationState("idle");
      return;
    }
    setValidationState(validatePath(pathValue) ? "valid" : "invalid");
  }, [pathValue, validatePath]);

  const handleNavigate = useCallback(() => {
    const trimmed = pathValue.trim();
    if (!trimmed) return;
    if (validationState === "valid" || validationState === "idle") {
      // Find the best matching project root
      const matched = availableProjects.find((p) => p.root === trimmed);
      if (matched) {
        persistProjectSelection(matched.root);
        router.push("/dashboard");
        router.refresh();
      } else {
        // Try prefix match — find project root that starts with this path
        const prefixMatch = availableProjects.find((p) => p.root.startsWith(trimmed + "/"));
        if (prefixMatch) {
          persistProjectSelection(prefixMatch.root);
          router.push("/dashboard");
          router.refresh();
        }
      }
    }
  }, [pathValue, validationState, availableProjects, persistProjectSelection, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNavigate();
    }
  };

  const handleProjectSelect = (root: string) => {
    persistProjectSelection(root);
    router.push("/dashboard");
    router.refresh();
  };

  const ValidationIcon =
    validationState === "valid" ? CheckCircle2 : validationState === "invalid" ? AlertCircle : null;

  return (
    <div className="space-y-3">
      {/* Path input row */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Enter or select a project path…"
            value={pathValue}
            onChange={(e) => setPathValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-8 font-mono text-sm"
            aria-label="Project path input"
          />
          {ValidationIcon && (
            <ValidationIcon
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
                validationState === "valid" ? "text-green-500" : "text-destructive"
              }`}
            />
          )}
        </div>
        <Button onClick={handleNavigate} size="sm" disabled={!pathValue.trim()}>
          Go
        </Button>
      </div>

      {/* Validation hint */}
      {validationState === "invalid" && (
        <p className="text-xs text-destructive">
          Path not found in discovered projects. Try an exact project path.
        </p>
      )}

      {/* Existing project buttons */}
      <div className="flex flex-wrap gap-2">
        {availableProjects.map((project) => (
          <Button
            key={project.root}
            size="sm"
            variant={project.root === currentProjectRoot ? "default" : "outline"}
            onClick={() => handleProjectSelect(project.root)}
          >
            {project.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
