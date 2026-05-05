import {
  PROJECT_ROOT_COOKIE_KEY,
  PROJECT_ROOT_LOCAL_STORAGE_KEY,
} from "@/lib/constants/project-context";

function normalizeAbsolutePath(input: string): string {
  const isAbsolute = input.startsWith("/");
  const segments = input
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".")
    .reduce<string[]>((acc, segment) => {
      if (segment === "..") {
        acc.pop();
        return acc;
      }
      acc.push(segment);
      return acc;
    }, []);

  if (!isAbsolute) {
    return segments.join("/");
  }

  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

export function resolveProjectCreationPath(input: string, workspaceRoot: string): string {
  const trimmedInput = input.trim();
  const normalizedWorkspaceRoot = normalizeAbsolutePath(workspaceRoot);

  if (!trimmedInput) {
    return normalizedWorkspaceRoot;
  }

  if (trimmedInput.startsWith("/")) {
    return normalizeAbsolutePath(trimmedInput);
  }

  return normalizeAbsolutePath(`${normalizedWorkspaceRoot}/${trimmedInput}`);
}

export function isPathWithinWorkspaceRoot(targetPath: string, workspaceRoot: string): boolean {
  const normalizedTargetPath = normalizeAbsolutePath(targetPath);
  const normalizedWorkspaceRoot = normalizeAbsolutePath(workspaceRoot);

  return (
    normalizedTargetPath !== normalizedWorkspaceRoot &&
    normalizedTargetPath.startsWith(`${normalizedWorkspaceRoot}/`)
  );
}

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
  const trimmedProjectRoot = projectRoot?.trim() || null;

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
