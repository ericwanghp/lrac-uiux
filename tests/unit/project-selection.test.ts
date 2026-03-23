import { describe, expect, it } from "vitest";
import { buildProjectNavigationPath, buildProjectScopedPath } from "@/lib/utils/project-selection";

describe("buildProjectNavigationPath", () => {
  it("adds the project query to dashboard routes", () => {
    expect(buildProjectNavigationPath("/dashboard", "/Users/ericwang/code/lrac-test")).toBe(
      "/dashboard?project=%2FUsers%2Fericwang%2Fcode%2Flrac-test"
    );
  });

  it("preserves existing query params while replacing the project param", () => {
    expect(
      buildProjectNavigationPath(
        "/dashboard",
        "/Users/ericwang/code/LRAC",
        "?tab=overview&project=old"
      )
    ).toBe("/dashboard?tab=overview&project=%2FUsers%2Fericwang%2Fcode%2FLRAC");
  });

  it("defaults to dashboard when pathname is empty", () => {
    expect(buildProjectNavigationPath("", "/Users/ericwang/code/lrac-test")).toBe(
      "/dashboard?project=%2FUsers%2Fericwang%2Fcode%2Flrac-test"
    );
  });
});

describe("buildProjectScopedPath", () => {
  it("adds project to api paths", () => {
    expect(buildProjectScopedPath("/api/tasks", "/Users/ericwang/code/lrac-test")).toBe(
      "/api/tasks?project=%2FUsers%2Fericwang%2Fcode%2Flrac-test"
    );
  });

  it("keeps existing params and overwrites project", () => {
    expect(
      buildProjectScopedPath(
        "/api/terminal/sessions/1/events?afterSeq=2&project=old",
        "/Users/ericwang/code/LRAC"
      )
    ).toBe(
      "/api/terminal/sessions/1/events?afterSeq=2&project=%2FUsers%2Fericwang%2Fcode%2FLRAC"
    );
  });
});
