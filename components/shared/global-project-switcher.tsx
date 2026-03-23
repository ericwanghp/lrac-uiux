"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectOption, ProjectOverview } from "@/lib/types";
import {
  buildProjectNavigationPath,
  buildProjectScopedPath,
  persistProjectSelection,
} from "@/lib/utils/project-selection";

type ProjectsApiResponse = {
  success: boolean;
  data: ProjectOverview;
  error?: string;
};

export function GlobalProjectSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectFromQuery = searchParams.get("project") || "";
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [currentProjectRoot, setCurrentProjectRoot] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isCancelled = false;

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(buildProjectScopedPath("/api/projects", projectFromQuery), {
          cache: "no-store",
        });
        const payload = (await response.json()) as ProjectsApiResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load project context");
        }

        if (!isCancelled) {
          setProjects(payload.data.availableProjects || []);
          setCurrentProjectRoot(payload.data.currentProjectRoot || "");
        }
      } catch {
        if (!isCancelled) {
          setProjects([]);
          setCurrentProjectRoot("");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isCancelled = true;
    };
  }, [projectFromQuery]);

  const handleProjectChange = React.useCallback(
    (projectRoot: string) => {
      if (!projectRoot || projectRoot === currentProjectRoot) {
        return;
      }

      setCurrentProjectRoot(projectRoot);
      persistProjectSelection(projectRoot);
      const nextPath = buildProjectNavigationPath(pathname, projectRoot, searchParams.toString());
      router.replace(nextPath);
      router.refresh();

      // Broadcast project change so client-only pages can refresh instantly.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lrac:project-changed", { detail: { projectRoot: projectRoot } })
        );
      }
    },
    [currentProjectRoot, pathname, router, searchParams]
  );

  if (!isLoading && projects.length <= 1) {
    return null;
  }

  return (
    <div className="min-w-0 w-[180px] sm:w-[220px]">
      <Select
        value={currentProjectRoot || undefined}
        onValueChange={handleProjectChange}
        disabled={isLoading || projects.length === 0}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={isLoading ? "Loading projects..." : "Select project"} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.root} value={project.root}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
