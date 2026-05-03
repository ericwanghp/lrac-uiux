"use client";

import * as React from "react";

function readProjectFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("project");
}

export function useProjectQueryParam(): string | null {
  const [projectRoot, setProjectRoot] = React.useState<string | null>(readProjectFromLocation);

  React.useEffect(() => {
    const syncProjectRoot = () => {
      setProjectRoot(readProjectFromLocation());
    };

    syncProjectRoot();

    window.addEventListener("popstate", syncProjectRoot);
    window.addEventListener("lrac:project-changed", syncProjectRoot as EventListener);

    return () => {
      window.removeEventListener("popstate", syncProjectRoot);
      window.removeEventListener("lrac:project-changed", syncProjectRoot as EventListener);
    };
  }, []);

  return projectRoot;
}
