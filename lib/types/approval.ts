/**
 * TypeScript types for approval records
 * Used in Phase 3 (Architecture Design) reviews
 */

export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs_revision";
export type ApprovalType =
  | "requirements"
  | "product"
  | "architecture"
  | "design"
  | "code"
  | "deployment";

export interface ApprovalComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  role: string;
}

export interface ApprovalRecord {
  id: string;
  featureId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  requester: string;
  requesterRole: string;
  documentPath: string;
  documentType: string;
  comments: ApprovalComment[];
  approvers: string[];
  approvedBy: string[];
  rejectedBy: string[];
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
}

export interface ApprovalCreateInput {
  featureId: string;
  type: ApprovalType;
  requester: string;
  requesterRole: string;
  documentPath: string;
  documentType: string;
  approvers: string[];
}

export interface ApprovalUpdateInput {
  approvalId: string;
  status?: ApprovalStatus;
  comment?: ApprovalComment;
  approvedBy?: string;
  rejectedBy?: string;
}

export interface ApprovalJson {
  version: "1.0";
  approvals: ApprovalRecord[];
}
