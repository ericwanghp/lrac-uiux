import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/utils/requirements-intake", () => ({
  readRequirementsIntake: vi.fn(),
  saveRequirementsIntake: vi.fn(),
  storeRequirementReferenceFiles: vi.fn(),
}));

import {
  readRequirementsIntake,
  saveRequirementsIntake,
  storeRequirementReferenceFiles,
} from "../../lib/utils/requirements-intake";
import { GET, POST } from "../../app/api/requirements/intake/route";

describe("requirements intake route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the persisted intake", async () => {
    vi.mocked(readRequirementsIntake).mockResolvedValue({
      description: "Build an AI coding workspace",
      references: [],
      updatedAt: "2026-05-04T00:00:00.000Z",
      submittedAt: "2026-05-04T00:00:00.000Z",
    });

    const response = await GET();
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.data.description).toContain("AI coding workspace");
  });

  it("stores description and uploaded references", async () => {
    vi.mocked(readRequirementsIntake).mockResolvedValue({
      description: "Existing intake",
      references: [
        {
          name: "brief.md",
          relativePath: "docs/requirements/references/brief.md",
          size: 100,
          uploadedAt: "2026-05-04T00:00:00.000Z",
        },
      ],
      updatedAt: "2026-05-04T00:00:00.000Z",
      submittedAt: "2026-05-04T00:00:00.000Z",
    });
    vi.mocked(storeRequirementReferenceFiles).mockResolvedValue([
      {
        name: "spec.pdf",
        relativePath: "docs/requirements/references/spec.pdf",
        size: 2048,
        uploadedAt: "2026-05-04T01:00:00.000Z",
      },
    ]);
    vi.mocked(saveRequirementsIntake).mockResolvedValue({
      description: "Need a product requirements intake flow",
      references: [
        {
          name: "brief.md",
          relativePath: "docs/requirements/references/brief.md",
          size: 100,
          uploadedAt: "2026-05-04T00:00:00.000Z",
        },
        {
          name: "spec.pdf",
          relativePath: "docs/requirements/references/spec.pdf",
          size: 2048,
          uploadedAt: "2026-05-04T01:00:00.000Z",
        },
      ],
      updatedAt: "2026-05-04T01:00:00.000Z",
      submittedAt: "2026-05-04T01:00:00.000Z",
    });

    const formData = new FormData();
    formData.append("description", "Need a product requirements intake flow");
    formData.append("referenceFiles", new File(["dummy"], "spec.pdf", { type: "application/pdf" }));

    const request = new Request("http://localhost/api/requirements/intake", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(storeRequirementReferenceFiles).toHaveBeenCalled();
    expect(saveRequirementsIntake).toHaveBeenCalledWith({
      description: "Need a product requirements intake flow",
      references: [
        {
          name: "brief.md",
          relativePath: "docs/requirements/references/brief.md",
          size: 100,
          uploadedAt: "2026-05-04T00:00:00.000Z",
        },
        {
          name: "spec.pdf",
          relativePath: "docs/requirements/references/spec.pdf",
          size: 2048,
          uploadedAt: "2026-05-04T01:00:00.000Z",
        },
      ],
    });
  });
});
