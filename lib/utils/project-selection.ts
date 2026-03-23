import {
  PROJECT_ROOT_COOKIE_KEY,
  PROJECT_ROOT_LOCAL_STORAGE_KEY,
} from "@/lib/constants/project-context";

export function buildProjectNavigationPath(
  pathname: string | null | undefined,
  projectRoot: string,
  search = ""
) {
  const basePath = pathname && pathname.trim() ? pathname : "/dashboard";
  const params = new URLSearchParams(search);
  params.set("project", projectRoot);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildProjectScopedPath(
  path: string,
  projectRoot: string | null | undefined
): string {
  const [basePath = "", search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  const trimmedProjectRoot = projectRoot?.trim();

  if (trimmedProjectRoot) {
    params.set("project", trimmedProjectRoot);
  } else {
    params.delete("project");
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function persistProjectSelection(projectRoot: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROJECT_ROOT_LOCAL_STORAGE_KEY, projectRoot);
  }

  if (typeof document !== "undefined") {
    document.cookie = `${PROJECT_ROOT_COOKIE_KEY}=${encodeURIComponent(projectRoot)}; path=/; max-age=31536000; samesite=lax`;
  }
}
