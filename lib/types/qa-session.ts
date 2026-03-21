/**
 * TypeScript types for Q&A sessions
 * Used in Phase 1-2 (Requirements Analysis)
 */

export type QASessionStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type QuestionInputType = "text" | "textarea" | "choice" | "multi-select";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  question: string;
  timestamp: string;
  asker: string;
  type?: QuestionInputType;
  options?: QuestionOption[];
  helpText?: string;
}

export interface Answer {
  id: string;
  questionId: string;
  answer: string;
  timestamp: string;
  responder: string;
}

export interface QASession {
  id: string;
  projectId: string;
  phase: number;
  status: QASessionStatus;
  questions: Question[];
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface QASessionCreateInput {
  projectId: string;
  phase: number;
  initialQuestions?: Array<
    | string
    | {
        id?: string;
        question: string;
        asker?: string;
        type?: QuestionInputType;
        options?: QuestionOption[];
        helpText?: string;
      }
  >;
}

export interface QASessionUpdateInput {
  sessionId: string;
  questions?: Question[];
  answers?: Answer[];
  status?: QASessionStatus;
}

export interface QASessionJson {
  version: "1.0";
  sessions: QASession[];
}
