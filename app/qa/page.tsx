"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Answer, QASession, Question } from "@/lib/types/qa-session";

interface TaskIdSchemaData {
  format: string;
  firstIteration: string;
  phaseSymbolMap: Record<string, number>;
  examples: string[];
}

type AnswerValue = string | string[];

const seedQuestions: Question[] = [
  {
    id: "project-goal",
    question: "What is the primary goal of your project?",
    type: "textarea",
    helpText: "Describe the main objective and what success looks like.",
    timestamp: "",
    asker: "system",
  },
  {
    id: "target-audience",
    question: "What is the target audience for this product?",
    type: "textarea",
    helpText: "Who will be using this product and what problem are we solving for them?",
    timestamp: "",
    asker: "system",
  },
  {
    id: "technology-stack",
    question: "What is your preferred technology stack?",
    type: "choice",
    options: [
      { value: "nextjs", label: "Next.js + React" },
      { value: "vue", label: "Vue + Nuxt" },
      { value: "svelte", label: "Svelte + SvelteKit" },
      { value: "angular", label: "Angular" },
    ],
    timestamp: "",
    asker: "system",
  },
  {
    id: "key-features",
    question: "Which features are most important to you?",
    type: "multi-select",
    options: [
      { value: "auth", label: "User Authentication" },
      { value: "realtime", label: "Real-time Updates" },
      { value: "api", label: "REST API" },
      { value: "graphql", label: "GraphQL API" },
      { value: "payments", label: "Payment Integration" },
    ],
    helpText: "Choose every feature that should be treated as first-class in the initial scope.",
    timestamp: "",
    asker: "system",
  },
];

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload.data as T;
}

function decodeAnswerValue(question: Question, value: string): AnswerValue {
  if (question.type !== "multi-select") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function encodeAnswerValue(value: AnswerValue): string {
  return Array.isArray(value) ? JSON.stringify(value) : value;
}

function hydrateAnswers(session: QASession): Record<string, AnswerValue> {
  return session.answers.reduce<Record<string, AnswerValue>>((accumulator, answer) => {
    const question = session.questions.find((candidate) => candidate.id === answer.questionId);

    if (!question) {
      return accumulator;
    }

    accumulator[answer.questionId] = decodeAnswerValue(question, answer.answer);
    return accumulator;
  }, {});
}

function validateAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (question.type === "multi-select") {
    return Array.isArray(value) && value.length > 0 ? null : "Please select at least one option.";
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return null;
  }

  return "This field is required.";
}

function getStatusBadgeVariant(status: QASession["status"]) {
  switch (status) {
    case "completed":
      return "bg-success/15 text-success border-success/30";
    case "in_progress":
      return "bg-primary/15 text-primary border-primary/30";
    case "cancelled":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-warning/15 text-warning border-warning/30";
  }
}

function getLatestSession(sessions: QASession[]): QASession | null {
  if (sessions.length === 0) {
    return null;
  }

  const sortedSessions = [...sessions].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );

  return (
    sortedSessions.find(
      (session) => session.status === "in_progress" || session.status === "pending"
    ) ||
    sortedSessions[0] ||
    null
  );
}

export default function QAPage() {
  const [session, setSession] = useState<QASession | null>(null);
  const [projectId, setProjectId] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [taskIdSchema, setTaskIdSchema] = useState<TaskIdSchemaData | null>(null);

  const questions = session?.questions.length ? session.questions : seedQuestions;
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((question) => {
    const value = answers[question.id];
    return question.type === "multi-select"
      ? Array.isArray(value) && value.length > 0
      : typeof value === "string" && value.trim().length > 0;
  }).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  useEffect(() => {
    const timer = feedback ? window.setTimeout(() => setFeedback(null), 2500) : null;
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [feedback]);

  useEffect(() => {
    const loadTaskIdSchema = async () => {
      try {
        const payload = await fetchJson<TaskIdSchemaData>("/api/meta/task-id-schema");
        setTaskIdSchema(payload);
      } catch {
        setTaskIdSchema(null);
      }
    };

    void loadTaskIdSchema();
  }, []);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const projectData = await fetchJson<{ project: string }>("/api/projects");
        const resolvedProjectId = projectData.project || "current-project";
        setProjectId(resolvedProjectId);

        const sessionData = await fetchJson<{ sessions: QASession[] }>(
          `/api/qa/sessions?projectId=${encodeURIComponent(resolvedProjectId)}&phase=1`
        );
        const existingSession = getLatestSession(sessionData.sessions);

        if (existingSession) {
          setSession(existingSession);
          setAnswers(hydrateAnswers(existingSession));
          return;
        }

        const createdSession = await fetchJson<QASession>("/api/qa/sessions", {
          method: "POST",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            phase: 1,
            initialQuestions: seedQuestions.map((question) => ({
              id: question.id,
              question: question.question,
              asker: question.asker,
              type: question.type,
              options: question.options,
              helpText: question.helpText,
            })),
          }),
        });

        setSession(createdSession);
        setAnswers({});
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load Q&A session");
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapSession();
  }, []);

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));

    if (errors[questionId]) {
      setErrors((previous) => {
        const next = { ...previous };
        delete next[questionId];
        return next;
      });
    }
  };

  const persistSession = async (statusOverride?: QASession["status"]) => {
    if (!session) {
      return;
    }

    setIsSaving(true);

    try {
      const nextAnswers: Answer[] = questions.flatMap((question) => {
        const value = answers[question.id];
        const hasValue =
          question.type === "multi-select"
            ? Array.isArray(value) && value.length > 0
            : typeof value === "string" && value.trim().length > 0;

        if (!hasValue || value === undefined) {
          return [];
        }

        return [
          {
            id: `answer-${question.id}`,
            questionId: question.id,
            answer: encodeAnswerValue(value),
            timestamp: new Date().toISOString(),
            responder: "frontend-user",
          },
        ];
      });

      const nextStatus =
        statusOverride ||
        (nextAnswers.length === 0
          ? "pending"
          : nextAnswers.length === questions.length
            ? "completed"
            : "in_progress");

      const updatedSession = await fetchJson<QASession>(`/api/qa/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          questions,
          answers: nextAnswers,
          status: nextStatus,
        }),
      });

      setSession(updatedSession);
      setFeedback(nextStatus === "completed" ? "Q&A session completed." : "Progress saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (statusOverride?: QASession["status"]) => {
    if (!currentQuestion) {
      return;
    }

    if (statusOverride === "completed") {
      const completionErrors = questions.reduce<Record<string, string>>((accumulator, question) => {
        const validationMessage = validateAnswer(question, answers[question.id]);
        if (validationMessage) {
          accumulator[question.id] = validationMessage;
        }
        return accumulator;
      }, {});

      if (Object.keys(completionErrors).length > 0) {
        setErrors((previous) => ({ ...previous, ...completionErrors }));
        const firstIncompleteIndex = questions.findIndex((question) =>
          Boolean(completionErrors[question.id])
        );
        if (firstIncompleteIndex >= 0) {
          setCurrentQuestionIndex(firstIncompleteIndex);
        }
        return;
      }
    }

    const error = validateAnswer(currentQuestion, answers[currentQuestion.id]);
    if (error) {
      setErrors((previous) => ({ ...previous, [currentQuestion.id]: error }));
      return;
    }

    try {
      await persistSession(statusOverride);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to save Q&A session.");
    }
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    const error = validateAnswer(currentQuestion, answers[currentQuestion.id]);
    if (error) {
      setErrors((previous) => ({ ...previous, [currentQuestion.id]: error }));
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((previous) => previous + 1);
    }
  };

  const handleStartNewSession = async () => {
    if (!projectId) {
      return;
    }

    try {
      setIsLoading(true);
      const createdSession = await fetchJson<QASession>("/api/qa/sessions", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          phase: 1,
          initialQuestions: seedQuestions.map((question) => ({
            id: question.id,
            question: question.question,
            asker: question.asker,
            type: question.type,
            options: question.options,
            helpText: question.helpText,
          })),
        }),
      });

      setSession(createdSession);
      setAnswers({});
      setErrors({});
      setCurrentQuestionIndex(0);
      setFeedback("Started a fresh Q&A session.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to create a new session.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const currentValue = answers[question.id] || "";

    switch (question.type) {
      case "text":
        return (
          <Input
            value={currentValue as string}
            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
            placeholder="Enter your answer..."
            className="border-border/80 bg-background/80 focus-visible:ring-primary"
          />
        );

      case "choice":
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={currentValue === option.value}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  className="h-4 w-4 border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm transition-colors group-hover:text-primary">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case "multi-select":
        return (
          <div className="space-y-3">
            {question.options?.map((option) => {
              const selectedValues = Array.isArray(currentValue) ? currentValue : [];

              return (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={(event) => {
                      const nextValues = event.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter((value) => value !== option.value);
                      handleAnswerChange(question.id, nextValues);
                    }}
                    className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm transition-colors group-hover:text-primary">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        );

      case "textarea":
      default:
        return (
          <textarea
            value={currentValue as string}
            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
            placeholder="Describe your requirements..."
            className="min-h-[120px] w-full rounded-md border border-border/80 bg-background/80 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-muted-foreground">Loading Q&A session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !currentQuestion) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-10 space-y-4">
            <p className="text-center text-destructive">{loadError || "No questions available."}</p>
            <div className="flex justify-center">
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="admin-kicker mb-2">Intake Workspace</p>
          <h1 className="text-3xl font-bold tracking-tight">Q&A Session</h1>
          <p className="text-muted-foreground mt-1">
            Capture project requirements in a persisted Phase 1 intake session.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session ? (
            <Badge className={getStatusBadgeVariant(session.status)}>
              {session.status.replace("_", " ")}
            </Badge>
          ) : null}
          {projectId ? <Badge variant="outline">{projectId}</Badge> : null}
          <Button variant="outline" onClick={() => void handleStartNewSession()}>
            Start New Session
          </Button>
        </div>
      </div>

      {taskIdSchema ? (
        <Card className="admin-panel border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle className="text-base">IMAC Task Naming Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              New follow-up tasks should use{" "}
              <span className="font-mono text-primary">{taskIdSchema.format}</span> and the first
              iteration remains{" "}
              <span className="font-mono text-primary">{taskIdSchema.firstIteration}</span>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(taskIdSchema.phaseSymbolMap).map(([symbol, phase]) => (
                <div
                  key={symbol}
                  className="rounded-xl border border-border/80 bg-secondary/70 px-2 py-1 flex items-center justify-between"
                >
                  <span className="font-mono text-xs text-primary">{symbol}</span>
                  <span className="text-xs text-muted-foreground">Phase {phase}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {taskIdSchema.examples.map((example) => (
                <p key={example} className="font-mono text-xs text-muted-foreground">
                  {example}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="admin-panel border-border/80 bg-card/90">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary">
                {answeredCount}/{totalQuestions} answered
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary/90">
              <div
                className="gradient-progress h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {feedback ? <p className="text-xs text-primary">{feedback}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="admin-panel border-border/80 border-l-4 border-l-primary bg-card/90">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              Q{currentQuestionIndex + 1}
            </Badge>
            <CardTitle className="text-base">{currentQuestion.question}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderQuestionInput(currentQuestion)}

          {currentQuestion.helpText ? (
            <p className="text-xs text-muted-foreground">{currentQuestion.helpText}</p>
          ) : null}

          {errors[currentQuestion.id] ? (
            <p className="text-xs text-destructive">{errors[currentQuestion.id]}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentQuestionIndex((previous) => Math.max(0, previous - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>

          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button onClick={handleNext}>Next Question</Button>
          ) : (
            <Button onClick={() => void handleSave("completed")} disabled={isSaving}>
              Complete Session
            </Button>
          )}
        </div>
      </div>

      <Card className="admin-panel border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle className="text-sm">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((question, index) => {
              const value = answers[question.id];
              const isAnswered =
                question.type === "multi-select"
                  ? Array.isArray(value) && value.length > 0
                  : typeof value === "string" && value.trim().length > 0;
              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={
                    isCurrent
                      ? "h-10 w-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-all shadow-lg shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      : isAnswered
                        ? "h-10 w-10 rounded-lg border border-success/30 bg-success/10 text-sm font-medium text-success transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        : "h-10 w-10 rounded-lg border border-border/80 bg-secondary/70 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
