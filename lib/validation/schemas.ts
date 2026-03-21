/**
 * Zod validation schemas for API inputs
 */

import { z } from "zod";
import { TASK_ID_REGEX } from "@/lib/constants/task-id";

const TaskIdSchema = z
  .string()
  .regex(TASK_ID_REGEX, "Task ID must be {iteration}-{phaseSymbol}-{NNN}");

// Feature status enum
export const FeatureStatusSchema = z.enum(["pending", "in_progress", "completed", "blocked"]);

// Feature priority enum
export const FeaturePrioritySchema = z.enum(["critical", "high", "medium", "low"]);

// Task breakdown schema
export const TaskBreakdownSchema = z.object({
  dependencies: z.array(z.string()),
  parallelGroup: z.string().nullable(),
});

// Acceptance criteria schema
export const AcceptanceCriteriaSchema = z.object({
  criteria: z.array(z.string()).min(1, "At least one criterion is required"),
});

// Block reason schema
export const BlockReasonSchema = z.object({
  type: z.string(),
  description: z.string().min(1, "Description is required"),
  reportedAt: z.string().datetime(),
  reportedBy: z.string(),
  resolution: z.string().nullable(),
  needsHumanIntervention: z.boolean(),
});

// Resume context schema
export const ResumeContextSchema = z.object({
  lastStep: z.string(),
  nextStep: z.string(),
  partialWork: z.string(),
  filesModified: z.array(z.string()),
  suggestedActions: z.array(z.string()),
});

// Execution history entry schema
export const ExecutionHistoryEntrySchema = z.object({
  timestamp: z.string().datetime(),
  action: z.string(),
  details: z.string(),
});

// Timeline schema
export const TimelineSchema = z.object({
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

// Feature status info schema
export const FeatureStatusInfoSchema = z.object({
  status: FeatureStatusSchema,
  passes: z.boolean(),
  blockReason: BlockReasonSchema.nullable(),
  resumeContext: ResumeContextSchema.nullable(),
});

// Feature schema
export const FeatureSchema = z.object({
  id: TaskIdSchema,
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required"),
  ownerRole: z.string(),
  priority: FeaturePrioritySchema,
  taskBreakdown: TaskBreakdownSchema,
  acceptanceCriteria: AcceptanceCriteriaSchema,
  timeline: TimelineSchema,
  status: FeatureStatusInfoSchema,
  metadata: z
    .object({
      optional: z.boolean().optional(),
    })
    .optional(),
  executionHistory: z.array(ExecutionHistoryEntrySchema),
});

// Parallel group schema
export const ParallelGroupSchema = z.object({
  name: z.string(),
  features: z.array(z.string()),
  canStartWhen: z.array(z.string()),
  status: z.enum(["pending", "ready", "in_progress", "completed"]),
  completedFeatures: z.array(z.string()).optional(),
  remainingFeatures: z.array(z.string()).optional(),
});

// Tasks.json schema
export const TasksJsonSchema = z.object({
  version: z.literal("3.0"),
  project: z.string(),
  parallelGroups: z.record(z.string(), ParallelGroupSchema),
  features: z.array(FeatureSchema),
});

// API input schemas

// Create feature input
export const CreateFeatureInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required"),
  ownerRole: z.string(),
  priority: FeaturePrioritySchema,
  dependencies: z.array(z.string()).default([]),
  parallelGroup: z.string().nullable().default(null),
  acceptanceCriteria: z.array(z.string()).min(1, "At least one criterion is required"),
});

// Update feature status input
export const UpdateFeatureStatusInputSchema = z.object({
  featureId: TaskIdSchema,
  status: FeatureStatusSchema,
  passes: z.boolean(),
  blockReason: BlockReasonSchema.nullable().optional(),
  resumeContext: ResumeContextSchema.nullable().optional(),
});

// Add execution history input
export const AddExecutionHistoryInputSchema = z.object({
  featureId: TaskIdSchema,
  action: z.string(),
  details: z.string(),
});

// Get feature input
export const GetFeatureInputSchema = z.object({
  featureId: TaskIdSchema,
});

// List features input
export const ListFeaturesInputSchema = z.object({
  status: FeatureStatusSchema.optional(),
  priority: FeaturePrioritySchema.optional(),
  parallelGroup: z.string().optional(),
});

// Export types
export type CreateFeatureInput = z.infer<typeof CreateFeatureInputSchema>;
export type UpdateFeatureStatusInput = z.infer<typeof UpdateFeatureStatusInputSchema>;
export type AddExecutionHistoryInput = z.infer<typeof AddExecutionHistoryInputSchema>;
export type GetFeatureInput = z.infer<typeof GetFeatureInputSchema>;
export type ListFeaturesInput = z.infer<typeof ListFeaturesInputSchema>;

// ============================================
// Q&A Session Schemas
// ============================================

// Q&A Session status enum
export const QASessionStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
export const QuestionInputTypeSchema = z.enum(["text", "textarea", "choice", "multi-select"]);
export const QuestionOptionSchema = z.object({
  value: z.string().min(1, "Option value is required"),
  label: z.string().min(1, "Option label is required"),
});

// Question schema
export const QuestionSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  question: z.string().min(1, "Question text is required"),
  timestamp: z.string().datetime(),
  asker: z.string().min(1, "Asker is required"),
  type: QuestionInputTypeSchema.optional(),
  options: z.array(QuestionOptionSchema).optional(),
  helpText: z.string().optional(),
});

// Answer schema
export const AnswerSchema = z.object({
  id: z.string().min(1, "Answer ID is required"),
  questionId: z.string().min(1, "Question ID is required"),
  answer: z.string().min(1, "Answer text is required"),
  timestamp: z.string().datetime(),
  responder: z.string().min(1, "Responder is required"),
});

// Q&A Session schema
export const QASessionSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
  projectId: z.string().min(1, "Project ID is required"),
  phase: z.number().int().min(1).max(8),
  status: QASessionStatusSchema,
  questions: z.array(QuestionSchema),
  answers: z.array(AnswerSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

// Create Q&A Session input schema
export const SeedQuestionSchema = z.object({
  id: z.string().min(1).optional(),
  question: z.string().min(1, "Question text is required"),
  asker: z.string().min(1).optional(),
  type: QuestionInputTypeSchema.optional(),
  options: z.array(QuestionOptionSchema).optional(),
  helpText: z.string().optional(),
});

export const CreateQASessionInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  phase: z.number().int().min(1).max(8),
  initialQuestions: z.array(z.union([z.string().min(1), SeedQuestionSchema])).optional(),
});

// Update Q&A Session input schema
export const UpdateQASessionInputSchema = z.object({
  status: QASessionStatusSchema.optional(),
  questions: z.array(QuestionSchema).optional(),
  answers: z.array(AnswerSchema).optional(),
});

// List Q&A Sessions input schema
export const ListQASessionsInputSchema = z.object({
  projectId: z.string().optional(),
  phase: z.number().int().min(1).max(8).optional(),
  status: QASessionStatusSchema.optional(),
});

// Export Q&A types
export type Question = z.infer<typeof QuestionSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type QASession = z.infer<typeof QASessionSchema>;
export type CreateQASessionInput = z.infer<typeof CreateQASessionInputSchema>;
export type UpdateQASessionInput = z.infer<typeof UpdateQASessionInputSchema>;
export type ListQASessionsInput = z.infer<typeof ListQASessionsInputSchema>;
export type SeedQuestion = z.infer<typeof SeedQuestionSchema>;

// ============================================
// Approval Schemas
// ============================================

export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "needs_revision"]);
export const ApprovalTypeSchema = z.enum([
  "requirements",
  "product",
  "architecture",
  "design",
  "code",
  "deployment",
]);

export const ApprovalCommentSchema = z.object({
  id: z.string().min(1, "Comment ID is required"),
  author: z.string().min(1, "Author is required"),
  content: z.string().min(1, "Comment content is required"),
  timestamp: z.string().datetime(),
  role: z.string().min(1, "Role is required"),
});

export const ApprovalRecordSchema = z.object({
  id: z.string().min(1, "Approval ID is required"),
  featureId: z.string().min(1, "Feature ID is required"),
  type: ApprovalTypeSchema,
  status: ApprovalStatusSchema,
  requester: z.string().min(1, "Requester is required"),
  requesterRole: z.string().min(1, "Requester role is required"),
  documentPath: z.string().min(1, "Document path is required"),
  documentType: z.string().min(1, "Document type is required"),
  comments: z.array(ApprovalCommentSchema),
  approvers: z.array(z.string()),
  approvedBy: z.array(z.string()),
  rejectedBy: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  decidedAt: z.string().datetime().nullable(),
});

export const CreateApprovalInputSchema = z.object({
  featureId: z.string().min(1, "Feature ID is required"),
  type: ApprovalTypeSchema,
  requester: z.string().min(1, "Requester is required"),
  requesterRole: z.string().min(1, "Requester role is required"),
  documentPath: z.string().min(1, "Document path is required"),
  documentType: z.string().min(1, "Document type is required"),
  approvers: z.array(z.string()).default([]),
});

export const UpdateApprovalInputSchema = z.object({
  status: ApprovalStatusSchema.optional(),
  comment: ApprovalCommentSchema.optional(),
  actor: z.string().min(1).optional(),
});

export type ApprovalComment = z.infer<typeof ApprovalCommentSchema>;
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;
export type CreateApprovalInput = z.infer<typeof CreateApprovalInputSchema>;
export type UpdateApprovalInput = z.infer<typeof UpdateApprovalInputSchema>;

// ============================================
// User Settings Schemas
// ============================================

export const ThemeModeSchema = z.enum(["dark", "light"]);
export const NotificationLevelSchema = z.enum(["all", "important", "critical"]);

export const UserSettingsSchema = z.object({
  theme: ThemeModeSchema,
  fontSize: z.number().int().min(12).max(20),
  autoSave: z.boolean(),
  autoSaveInterval: z.number().int().min(10).max(120),
  desktopNotifications: z.boolean(),
  soundEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  notificationLevel: NotificationLevelSchema,
  compactMode: z.boolean(),
  showLineNumbers: z.boolean(),
});

export const UpdateUserSettingsInputSchema = UserSettingsSchema.partial();

export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsInputSchema>;
