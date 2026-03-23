import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";

vi.mock("fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

import { discoverWorkspaceProjects } from "@/lib/utils/project-discovery";

function createDirectoryEntry(name: string) {
  return {
    name,
    isDirectory: () => true,
  };
}

describe("discoverWorkspaceProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists current project and sibling projects that contain .auto-coding/tasks.json", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      createDirectoryEntry("lrac-uiux"),
      createDirectoryEntry("alpha"),
      createDirectoryEntry("notes"),
    ] as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      if (
        typeof filePath === "string" &&
        (filePath.includes("/lrac-uiux/.auto-coding/tasks.json") ||
          filePath.includes("/alpha/.auto-coding/tasks.json"))
      ) {
        return;
      }
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath !== "string") {
        return "";
      }
      if (filePath.includes("/alpha/.auto-coding/tasks.json")) {
        return JSON.stringify({ project: "Alpha Project" });
      }
      if (filePath.includes("/lrac-uiux/.auto-coding/tasks.json")) {
        return JSON.stringify({ project: "LRAC Console" });
      }
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    const projects = await discoverWorkspaceProjects("/workspace/lrac-uiux");

    expect(projects).toEqual([
      {
        root: "/workspace/lrac-uiux",
        name: "LRAC Console",
      },
      {
        root: "/workspace/alpha",
        name: "Alpha Project",
      },
    ]);
  });

  it("falls back to the current project when sibling discovery fails", async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error("permission denied"));
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ project: "LRAC Console" }));

    const projects = await discoverWorkspaceProjects("/workspace/lrac-uiux");

    expect(projects).toEqual([
      {
        root: "/workspace/lrac-uiux",
        name: "LRAC Console",
      },
    ]);
  });

  it("includes sibling repos discovered by broader project markers when tasks.json is absent", async () => {
    vi.mocked(fs.readdir).mockImplementation(async (targetPath) => {
      if (targetPath === "/workspace") {
        return [
          createDirectoryEntry("lrac-uiux"),
          createDirectoryEntry("claude-code-scaffold"),
          createDirectoryEntry("notes"),
        ] as Awaited<ReturnType<typeof fs.readdir>>;
      }

      if (targetPath === "/workspace/claude-code-scaffold/docs") {
        return [] as Awaited<ReturnType<typeof fs.readdir>>;
      }

      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      if (typeof filePath !== "string") {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }

      if (
        filePath.includes("/lrac-uiux/.auto-coding/tasks.json") ||
        filePath.includes("/claude-code-scaffold/package.json") ||
        filePath.includes("/claude-code-scaffold/CLAUDE.md") ||
        filePath.includes("/claude-code-scaffold/docs")
      ) {
        return;
      }

      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath !== "string") {
        return "";
      }
      if (filePath.includes("/lrac-uiux/.auto-coding/tasks.json")) {
        return JSON.stringify({ project: "LRAC Console" });
      }
      if (filePath.includes("/claude-code-scaffold/package.json")) {
        return JSON.stringify({ name: "claude-code-scaffold" });
      }
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    const projects = await discoverWorkspaceProjects("/workspace/lrac-uiux");

    expect(projects).toEqual([
      {
        root: "/workspace/lrac-uiux",
        name: "LRAC Console",
      },
      {
        root: "/workspace/claude-code-scaffold",
        name: "claude-code-scaffold",
      },
    ]);
  });

  it("normalizes non-string project metadata before sorting", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      createDirectoryEntry("lrac-uiux"),
      createDirectoryEntry("lRAC-bak"),
    ] as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      if (
        typeof filePath === "string" &&
        (filePath.includes("/lrac-uiux/.auto-coding/tasks.json") ||
          filePath.includes("/lRAC-bak/.auto-coding/tasks.json"))
      ) {
        return;
      }
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath !== "string") {
        return "";
      }
      if (filePath.includes("/lrac-uiux/.auto-coding/tasks.json")) {
        return JSON.stringify({ project: "LRAC Console" });
      }
      if (filePath.includes("/lRAC-bak/.auto-coding/tasks.json")) {
        return JSON.stringify({
          project: {
            name: "news-aggregator",
          },
        });
      }
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    const projects = await discoverWorkspaceProjects("/workspace/lrac-uiux");

    expect(projects).toEqual([
      {
        root: "/workspace/lrac-uiux",
        name: "LRAC Console",
      },
      {
        root: "/workspace/lRAC-bak",
        name: "news-aggregator",
      },
    ]);
  });
});
