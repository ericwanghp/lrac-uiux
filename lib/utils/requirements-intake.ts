import fs from "fs/promises";
import path from "path";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

export interface RequirementsReference {
  name: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

export interface RequirementsIntakeRecord {
  description: string;
  references: RequirementsReference[];
  updatedAt: string | null;
  submittedAt: string | null;
}

export interface SaveRequirementsIntakeInput {
  description: string;
  references: RequirementsReference[];
}

function getRequirementsIntakeJsonPath(projectRoot: string) {
  return path.join(projectRoot, ".auto-coding", "requirements-intake.json");
}

function getRequirementsBriefMarkdownPath(projectRoot: string) {
  return path.join(projectRoot, "docs", "requirements", "INPUT-REQUIREMENTS.md");
}

function getRequirementsReferencesDir(projectRoot: string) {
  return path.join(projectRoot, "docs", "requirements", "references");
}

function createEmptyRequirementsIntake(): RequirementsIntakeRecord {
  return {
    description: "",
    references: [],
    updatedAt: null,
    submittedAt: null,
  };
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "reference";
}

function buildRequirementsBriefMarkdown(record: RequirementsIntakeRecord) {
  const referenceLines =
    record.references.length > 0
      ? record.references
          .map(
            (reference) =>
              `- ${reference.name} (${reference.relativePath}, ${Math.max(1, Math.round(reference.size / 1024))} KB)`
          )
          .join("\n")
      : "- None uploaded";

  return [
    "# Project Requirements Intake",
    "",
    `- Updated At: ${record.updatedAt ?? "n/a"}`,
    `- Submitted At: ${record.submittedAt ?? "n/a"}`,
    "",
    "## Requirement Description",
    "",
    record.description.trim() || "No description provided.",
    "",
    "## Reference Documents",
    "",
    referenceLines,
    "",
  ].join("\n");
}

export async function readRequirementsIntake(
  projectRoot?: string | null
): Promise<RequirementsIntakeRecord> {
  const resolvedProjectRoot = await getCurrentProjectRoot(projectRoot);
  const filePath = getRequirementsIntakeJsonPath(resolvedProjectRoot);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as RequirementsIntakeRecord;
    return {
      description: parsed.description ?? "",
      references: Array.isArray(parsed.references) ? parsed.references : [],
      updatedAt: parsed.updatedAt ?? null,
      submittedAt: parsed.submittedAt ?? null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyRequirementsIntake();
    }
    throw error;
  }
}

export async function saveRequirementsIntake(
  input: SaveRequirementsIntakeInput,
  projectRoot?: string | null
): Promise<RequirementsIntakeRecord> {
  const resolvedProjectRoot = await getCurrentProjectRoot(projectRoot);
  const now = new Date().toISOString();
  const record: RequirementsIntakeRecord = {
    description: input.description.trim(),
    references: input.references,
    updatedAt: now,
    submittedAt: now,
  };

  const jsonPath = getRequirementsIntakeJsonPath(resolvedProjectRoot);
  const markdownPath = getRequirementsBriefMarkdownPath(resolvedProjectRoot);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(record, null, 2), "utf-8");
  await fs.writeFile(markdownPath, buildRequirementsBriefMarkdown(record), "utf-8");

  return record;
}

export async function storeRequirementReferenceFiles(
  files: File[],
  projectRoot?: string | null
): Promise<RequirementsReference[]> {
  const resolvedProjectRoot = await getCurrentProjectRoot(projectRoot);
  const referencesDir = getRequirementsReferencesDir(resolvedProjectRoot);
  await fs.mkdir(referencesDir, { recursive: true });

  const uploadedAt = new Date().toISOString();

  return Promise.all(
    files
      .filter((file) => file.size > 0)
      .map(async (file, index) => {
        const sanitizedName = sanitizeFileName(file.name);
        const targetName = `${Date.now()}-${index}-${sanitizedName}`;
        const absolutePath = path.join(referencesDir, targetName);
        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));

        return {
          name: file.name,
          relativePath: path.relative(resolvedProjectRoot, absolutePath),
          size: file.size,
          uploadedAt,
        };
      })
  );
}
