import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { ApprovalJson, ApprovalRecord, ApprovalType } from "@/lib/types/approval";
import { PROJECT_ROOT, getCurrentProjectRoot } from "@/lib/utils/file-operations";

type ApprovalDocumentConfig = {
  directory: string;
  type: ApprovalType;
  documentType: string;
  requester: string;
  requesterRole: string;
  approvers: string[];
};

type ApprovalDocumentSeed = ApprovalDocumentConfig & {
  documentPath: string;
};

const APPROVAL_DOCUMENTS: ApprovalDocumentConfig[] = [
  {
    directory: "brd",
    type: "requirements",
    documentType: "Business Requirements Document",
    requester: "Business Analyst",
    requesterRole: "business-analyst",
    approvers: ["Project Sponsor"],
  },
  {
    directory: "prd",
    type: "product",
    documentType: "Product Requirements Document",
    requester: "Product Manager",
    requesterRole: "product-manager",
    approvers: ["Product Reviewer"],
  },
  {
    directory: "architecture",
    type: "architecture",
    documentType: "Architecture Design",
    requester: "Architect",
    requesterRole: "architect",
    approvers: ["Architecture Reviewer"],
  },
  {
    directory: "design",
    type: "design",
    documentType: "Design Specification",
    requester: "Designer",
    requesterRole: "designer",
    approvers: ["Design Reviewer"],
  },
];

function getApprovalsDir(projectRoot?: string | null): string {
  return path.join(getCurrentProjectRoot(projectRoot), ".auto-coding", "approvals");
}

function getApprovalsFile(projectRoot?: string | null): string {
  return path.join(getApprovalsDir(projectRoot), "records.json");
}

export const APPROVALS_FILE = getApprovalsFile(PROJECT_ROOT);

function createEmptyApprovalJson(): ApprovalJson {
  return {
    version: "1.0",
    approvals: [],
  };
}

function toRelativeDocumentPath(projectRoot: string, fullPath: string): string {
  return path.relative(projectRoot, fullPath).split(path.sep).join("/");
}

function createApprovalId(documentPath: string): string {
  const digest = crypto.createHash("sha1").update(documentPath).digest("hex").slice(0, 10);
  return `approval-${digest}`;
}

function createFeatureId(documentPath: string): string {
  const normalized = documentPath
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `doc-${normalized}`;
}

function createApprovalRecord(seed: ApprovalDocumentSeed): ApprovalRecord {
  const now = new Date().toISOString();

  return {
    id: createApprovalId(seed.documentPath),
    featureId: createFeatureId(seed.documentPath),
    type: seed.type,
    status: "pending",
    requester: seed.requester,
    requesterRole: seed.requesterRole,
    documentPath: seed.documentPath,
    documentType: seed.documentType,
    comments: [],
    approvers: seed.approvers,
    approvedBy: [],
    rejectedBy: [],
    createdAt: now,
    updatedAt: now,
    decidedAt: null,
  };
}

async function readDocumentDirectory(
  config: ApprovalDocumentConfig,
  projectRoot: string
): Promise<ApprovalDocumentSeed[]> {
  const targetDir = path.join(projectRoot, "docs", config.directory);

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => ({
        ...config,
        documentPath: toRelativeDocumentPath(projectRoot, path.join(targetDir, entry.name)),
      }))
      .sort((left, right) => left.documentPath.localeCompare(right.documentPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function initializeApprovals(projectRoot?: string | null): Promise<void> {
  const approvalsDir = getApprovalsDir(projectRoot);
  await fs.mkdir(approvalsDir, { recursive: true });
  await fs.writeFile(
    getApprovalsFile(projectRoot),
    JSON.stringify(createEmptyApprovalJson(), null, 2)
  );
}

export async function readApprovalsFile(projectRoot?: string | null): Promise<ApprovalJson> {
  const approvalsFile = getApprovalsFile(projectRoot);

  try {
    await fs.access(approvalsFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await initializeApprovals(projectRoot);
      return createEmptyApprovalJson();
    }
    throw error;
  }

  const content = await fs.readFile(approvalsFile, "utf-8");
  return JSON.parse(content) as ApprovalJson;
}

export async function writeApprovalsFile(
  data: ApprovalJson,
  projectRoot?: string | null
): Promise<void> {
  const approvalsDir = getApprovalsDir(projectRoot);
  await fs.mkdir(approvalsDir, { recursive: true });
  await fs.writeFile(getApprovalsFile(projectRoot), JSON.stringify(data, null, 2), "utf-8");
}

export async function discoverApprovalDocuments(
  projectRoot?: string | null
): Promise<ApprovalDocumentSeed[]> {
  const resolvedProjectRoot = getCurrentProjectRoot(projectRoot);
  const discovered = await Promise.all(
    APPROVAL_DOCUMENTS.map((config) => readDocumentDirectory(config, resolvedProjectRoot))
  );

  return discovered.flat();
}

export async function syncApprovalsWithProject(
  projectRoot?: string | null
): Promise<ApprovalRecord[]> {
  const approvalsData = await readApprovalsFile(projectRoot);
  const discoveredDocuments = await discoverApprovalDocuments(projectRoot);
  const nextApprovals = new Map<string, ApprovalRecord>();

  approvalsData.approvals.forEach((approval) => {
    nextApprovals.set(approval.documentPath, approval);
  });

  discoveredDocuments.forEach((documentSeed) => {
    if (!nextApprovals.has(documentSeed.documentPath)) {
      nextApprovals.set(documentSeed.documentPath, createApprovalRecord(documentSeed));
    }
  });

  const approvals = Array.from(nextApprovals.values()).sort((left, right) =>
    left.documentPath.localeCompare(right.documentPath)
  );

  if (approvals.length !== approvalsData.approvals.length) {
    await writeApprovalsFile(
      {
        version: "1.0",
        approvals,
      },
      projectRoot
    );
  }

  return approvals;
}
