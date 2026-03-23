import fs from "fs/promises";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadProgressSessions,
  readArtifacts,
  readTaskLogsByPhase,
} from "@/lib/utils/phase-view-data";
import type { TasksJson } from "@/lib/types";

async function createTempProject() {
  const tempParent = path.join(process.cwd(), ".tmp-phase-data");
  await fs.mkdir(tempParent, { recursive: true });
  const root = await fs.mkdtemp(path.join(tempParent, "project-"));
  await fs.mkdir(path.join(root, ".auto-coding"), { recursive: true });
  await fs.mkdir(path.join(root, "docs", "design"), { recursive: true });

  const tasks: TasksJson = {
    version: "3.0",
    project: "tmp-project",
    parallelGroups: {},
    features: [
      {
        id: "inital-p25d-001",
        title: "Design system",
        summary: "Create design system",
        ownerRole: "ui-ux-designer",
        priority: "high",
        taskBreakdown: {
          dependencies: [],
          parallelGroup: null,
        },
        acceptanceCriteria: {
          criteria: ["Design system exists"],
        },
        timeline: {
          createdAt: "2026-03-21T10:00:00.000Z",
          startedAt: "2026-03-21T10:05:00.000Z",
          completedAt: null,
        },
        status: {
          status: "in_progress",
          passes: false,
          blockReason: null,
          resumeContext: null,
        },
        executionHistory: [
          {
            timestamp: "2026-03-21T10:15:00.000Z",
            action: "Updated design prompt",
            details: "Refined the design prompt for the control plane.",
          },
        ],
      },
      {
        id: "inital-p5d-001",
        title: "Build dashboard",
        summary: "Ship dashboard page",
        ownerRole: "frontend-dev",
        priority: "high",
        taskBreakdown: {
          dependencies: [],
          parallelGroup: null,
        },
        acceptanceCriteria: {
          criteria: ["Dashboard exists"],
        },
        timeline: {
          createdAt: "2026-03-21T11:00:00.000Z",
          startedAt: null,
          completedAt: null,
        },
        status: {
          status: "pending",
          passes: false,
          blockReason: null,
          resumeContext: null,
        },
        executionHistory: [
          {
            timestamp: "2026-03-21T11:20:00.000Z",
            action: "Implemented dashboard shell",
            details: "Added dashboard layout and cards.",
          },
        ],
      },
    ],
  };

  await fs.writeFile(
    path.join(root, ".auto-coding", "tasks.json"),
    JSON.stringify(tasks, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(root, ".auto-coding", "progress.txt"),
    [
      "# Session: Design Pass | Timestamp: 2026-03-21T12:00:00.000Z | Role: ui-ux-designer",
      "",
      "## Execution Content",
      "1. Reviewed design system",
      "",
      "## Ending State",
      "1. Ready for implementation",
      "",
      "## Next Steps",
      "1. Build UI",
    ].join("\n"),
    "utf-8"
  );
  await fs.writeFile(
    path.join(root, "docs", "design", "UI-SPEC-control-plane.md"),
    "# Control Plane\n\nLong-running agent design notes.",
    "utf-8"
  );

  return root;
}

describe("phase view data", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempRoots.map(async (root) => {
        await fs.rm(root, { recursive: true, force: true });
      })
    );
    tempRoots.length = 0;
  });

  it("reads artifacts from the selected project root", async () => {
    const root = await createTempProject();
    tempRoots.push(root);

    const artifacts = await readArtifacts("design", root);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.relativePath).toBe("docs/design/UI-SPEC-control-plane.md");
  });

  it("derives task logs from phase numbers instead of hardcoded feature ids", async () => {
    const root = await createTempProject();
    tempRoots.push(root);

    const logs = await readTaskLogsByPhase([2.5], root);

    expect(logs).toHaveLength(1);
    expect(logs[0]?.featureId).toBe("inital-p25d-001");
    expect(logs[0]?.action).toContain("design prompt");
  });

  it("loads progress sessions from the selected project root", async () => {
    const root = await createTempProject();
    tempRoots.push(root);

    const sessions = await loadProgressSessions(root);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.role).toBe("ui-ux-designer");
  });
});
