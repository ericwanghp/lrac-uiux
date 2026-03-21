# Architecture Design: Auto-Coding Framework Management Frontend

**Document Type**: Architecture Design Document
**Project**: lrac-uiux
**Phase**: 3 - Architecture Design
**Created**: 2026-03-14
**Status**: Draft
**Architecture**: Next.js 14 App Router + React 18 + Tailwind CSS + shadcn/ui

---

## 1. Executive Summary

### 1.1 Architecture Overview

The Auto-Coding Framework Management Frontend is a **local-first, file-based web application** that provides a visual interface layer over the existing Auto-Coding Framework. The architecture prioritizes:

- **Zero-config local deployment**: Works without cloud services
- **Direct file system integration**: Reads/writes `.auto-coding/` files
- **Real-time synchronization**: WebSocket + file watching for live updates
- **Hybrid interaction model**: Web for interaction, CLI for execution

### 1.2 Technology Stack

| Layer                  | Technology                   | Rationale                                    |
| ---------------------- | ---------------------------- | -------------------------------------------- |
| **Frontend Framework** | Next.js 14 (App Router)      | Server components, SSG, file-based routing   |
| **UI Library**         | React 18                     | Component-based, hooks, concurrent rendering |
| **Styling**            | Tailwind CSS + shadcn/ui     | Utility-first + component library            |
| **State Management**   | React Context + SWR          | Server state (SWR), UI state (Context)       |
| **Real-time**          | WebSocket + chokidar         | Live file updates                            |
| **Backend API**        | Next.js API Routes           | File system operations, WebSocket server     |
| **Data Storage**       | File-based (`.auto-coding/`) | Framework compatibility                      |

### 1.3 Key Architectural Decisions

| Decision              | Choice                                | Rationale                                   |
| --------------------- | ------------------------------------- | ------------------------------------------- |
| **SSG vs SSR**        | SSG (Static Site Generation)          | Fast performance, local-first, no database  |
| **Authentication**    | None (single-user MVP)                | Simplicity, local deployment                |
| **Database**          | File-based (tasks.json, progress.txt) | Framework compatibility, no migration       |
| **Component Library** | shadcn/ui                             | Customizable, Radix UI primitives, Tailwind |
| **Real-time Updates** | WebSocket (critical) + Polling (logs) | Hybrid approach for efficiency              |
| **Deployment**        | Local Next.js server (port 3000)      | Development simplicity, localhost access    |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │  Phase Views │  │  Terminal    │          │
│  │  (SSG)       │  │  (SSG)       │  │  (WebSocket) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  App Router  │  │  API Routes  │  │  WebSocket   │          │
│  │  (Pages)     │  │  (Backend)   │  │  Server      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                     File System Integration Layer                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  File Watcher│  │  File Reader │  │  File Writer │          │
│  │  (chokidar)  │  │  (fs-extra)  │  │  (fs-extra)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    Auto-Coding Framework Files                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  tasks.json  │  │  progress.txt│  │  docs/       │          │
│  │  qa-sessions/│  │  .stitch/    │  │  architecture│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

#### 2.2.1 Frontend Component Hierarchy

```
app/
├── layout.tsx                 # Root layout (theme, providers)
├── page.tsx                   # Dashboard (SSG)
├── projects/
│   ├── [id]/
│   │   ├── page.tsx           # Project detail
│   │   ├── qa/
│   │   │   └── page.tsx       # Phase 1-2 Q&A
│   │   ├── design/
│   │   │   └── page.tsx       # Phase 2.5 Design Viewer
│   │   ├── architecture/
│   │   │   └── page.tsx       # Phase 3 Architecture Review
│   │   ├── tasks/
│   │   │   └── page.tsx       # Phase 4 Task Breakdown
│   │   ├── monitor/
│   │   │   └── page.tsx       # Phase 5-7 Execution Monitor
│   │   └── pm/
│   │       └── page.tsx       # Phase 8 PM Dashboard
├── settings/
│   └── page.tsx               # Settings
└── api/
    ├── projects/
    │   ├── route.ts           # GET /api/projects
    │   └── [id]/
    │       └── route.ts       # GET /api/projects/:id
    ├── qa/
    │   └── route.ts           # POST /api/qa (save answers)
    ├── approval/
    │   └── route.ts           # POST /api/approval
    └── ws/
        └── route.ts           # WebSocket endpoint
```

#### 2.2.2 Shared Component Library

```
components/
├── ui/                        # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   └── ...
├── layout/
│   ├── sidebar.tsx            # Left navigation sidebar
│   ├── header.tsx             # Top bar with search
│   └── phase-indicator.tsx    # 8-phase visual indicator
├── dashboard/
│   ├── project-card.tsx       # Project overview card
│   ├── stat-card.tsx          # Metric display card
│   └── progress-bar.tsx       # Gradient progress bar
├── qa/
│   ├── question-card.tsx      # Individual Q&A card
│   ├── answer-input.tsx       # Answer input component
│   └── qa-progress.tsx        # Q&A progress indicator
├── design/
│   ├── design-viewer.tsx      # Stitch design viewer
│   ├── annotation-marker.tsx  # Design annotation
│   └── version-selector.tsx   # Design version selector
├── terminal/
│   ├── terminal-output.tsx    # Terminal display
│   ├── log-line.tsx           # Individual log line
│   └── syntax-highlighter.tsx # Code syntax highlighting
├── approval/
│   ├── approval-card.tsx      # Approval workflow card
│   ├── comment-thread.tsx     # Comment discussion
│   └── action-buttons.tsx     # Approve/Reject buttons
└── shared/
    ├── status-badge.tsx       # Semantic status badge
    ├── loading-skeleton.tsx   # Loading placeholder
    └── error-boundary.tsx     # Error handling
```

---

## 3. Data Architecture

### 3.1 File System Structure

The application directly reads/writes to the Auto-Coding Framework's file structure:

```
project-root/
├── .auto-coding/
│   ├── tasks.json             # Feature list (v3.0)
│   ├── progress.txt           # Session history
│   ├── progress-summary.md    # Lightweight summary
│   ├── qa-sessions/           # Q&A session records
│   │   ├── session-001.json
│   │   └── session-002.json
│   └── config/
│       ├── mcp.json           # MCP server config
│       └── test-strategy.json # Test configuration
├── .stitch/
│   ├── metadata.json          # Stitch project metadata
│   ├── DESIGN.md              # Design system
│   ├── SITE.md                # Site planning
│   ├── next-prompt.md         # Stitch prompt baton
│   └── designs/
│       ├── dashboard.png
│       ├── qa-interface.png
│       └── ...
├── docs/
│   ├── brd/
│   │   └── BRD-*.md
│   ├── prd/
│   │   └── PRD-*.md
│   ├── architecture/
│   │   └── ARCH-*.md
│   └── design/
│       ├── UI-SPEC-*.md
│       └── DESIGN-*.md
└── .claude/
    ├── CLAUDE.md              # Framework rules
    ├── agents/                # Agent definitions
    ├── rules/                 # Development rules
    └── context/               # Phase context
```

### 3.2 Data Models

#### 3.2.1 tasks.json Schema (v3.0)

```typescript
interface TasksFile {
  version: "3.0";
  project: string;
  parallelGroups: Record<string, ParallelGroup>;
  features: Feature[];
}

interface ParallelGroup {
  name: string;
  features: string[]; // Feature IDs
  canStartWhen: string[]; // Feature IDs that must complete first
  status: "pending" | "in_progress" | "completed" | "blocked";
}

interface Feature {
  id: string;
  title: string;
  summary: string;
  ownerRole: string;
  priority: "low" | "medium" | "high" | "critical";
  taskBreakdown: {
    dependencies: string[];
    parallelGroup: string | null;
  };
  acceptanceCriteria: {
    criteria: string[];
  };
  timeline: {
    createdAt: string; // ISO 8601
    startedAt: string | null;
    completedAt: string | null;
  };
  status: {
    status: "pending" | "in_progress" | "completed" | "blocked";
    passes: boolean;
    blockReason: BlockReason | null;
    resumeContext: ResumeContext | null;
  };
  executionHistory: ExecutionRecord[];
}
```

#### 3.2.2 Q&A Session Schema

```typescript
interface QASession {
  id: string;
  projectId: string;
  phase: 1 | 2;
  questions: Question[];
  answers: Answer[];
  status: "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: string;
  text: string;
  type: "text" | "textarea" | "choice" | "multi" | "file" | "rich_text";
  options?: string[]; // For choice/multi types
  required: boolean;
  helpText?: string;
}

interface Answer {
  questionId: string;
  value: string | string[] | FileReference;
  timestamp: string;
}
```

#### 3.2.3 Approval Record Schema

```typescript
interface ApprovalRecord {
  documentType: "brd" | "prd" | "architecture" | "design";
  documentPath: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  comments: Comment[];
  approvals: Approval[];
  rejections: Rejection[];
  requestedChanges: ChangeRequest[];
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  userId: string;
  text: string;
  section?: string; // Section reference
  timestamp: string;
  resolved: boolean;
}

interface Approval {
  userId: string;
  timestamp: string;
  notes?: string;
}
```

### 3.3 State Management Strategy

#### 3.3.1 Server State (SWR)

Use SWR for data fetching and caching:

```typescript
// hooks/use-projects.ts
import useSWR from "swr";

export function useProjects() {
  const { data, error, mutate } = useSWR("/api/projects", fetcher);
  return {
    projects: data,
    isLoading: !error && !data,
    isError: error,
    mutate, // For optimistic updates
  };
}

// hooks/use-tasks.ts
export function useTasks(projectId: string) {
  const { data, error, mutate } = useSWR(
    `/api/projects/${projectId}/tasks`,
    fetcher,
    { refreshInterval: 5000 } // Poll every 5s
  );
  return { tasks: data, mutate };
}
```

#### 3.3.2 UI State (React Context)

Use Context for global UI state:

```typescript
// contexts/theme-context.tsx
const ThemeContext = createContext<{
  theme: "dark" | "light";
  toggleTheme: () => void;
}>({});

// contexts/sidebar-context.tsx
const SidebarContext = createContext<{
  isCollapsed: boolean;
  toggleSidebar: () => void;
}>({});

// contexts/qa-context.tsx
const QAContext = createContext<{
  currentQuestion: number;
  answers: Record<string, any>;
  setCurrentQuestion: (n: number) => void;
  setAnswer: (id: string, value: any) => void;
}>({});
```

---

## 4. API Architecture

### 4.1 RESTful API Endpoints

#### 4.1.1 Project Management

```typescript
// GET /api/projects
Response: {
  projects: Project[]
}

// GET /api/projects/:id
Response: {
  project: Project
  tasks: Feature[]
  currentPhase: number
  progress: number
}

// POST /api/projects
Request: {
  name: string
  description: string
}
Response: {
  projectId: string
}
```

#### 4.1.2 Task Management

```typescript
// GET /api/projects/:id/tasks
Response: {
  tasks: Feature[]
  parallelGroups: ParallelGroup[]
}

// PATCH /api/projects/:id/tasks/:taskId
Request: {
  status: {
    status: "in_progress" | "completed" | "blocked"
    passes?: boolean
  }
}
Response: {
  task: Feature
}
```

#### 4.1.3 Q&A Sessions

```typescript
// GET /api/projects/:id/qa
Response: {
  sessions: QASession[]
}

// POST /api/projects/:id/qa
Request: {
  phase: 1 | 2
  questions: Question[]
}
Response: {
  sessionId: string
}

// PATCH /api/projects/:id/qa/:sessionId
Request: {
  answers: Answer[]
}
Response: {
  session: QASession
}
```

#### 4.1.4 Document Approval

```typescript
// GET /api/projects/:id/approval?type=brd
Response: {
  approval: ApprovalRecord
}

// POST /api/projects/:id/approval
Request: {
  documentType: "brd" | "prd" | "architecture"
  action: "approve" | "reject" | "request_changes"
  notes?: string
  comments?: Comment[]
}
Response: {
  approval: ApprovalRecord
}
```

### 4.2 WebSocket API

#### 4.2.1 WebSocket Connection

```typescript
// Client connection
const ws = new WebSocket("ws://localhost:3000/api/ws");

// Connection handshake
ws.send(
  JSON.stringify({
    type: "subscribe",
    projectId: "project-123",
  })
);

// Server acknowledgment
ws.onmessage((event) => {
  const message = JSON.parse(event.data);
  // Handle message types
});
```

#### 4.2.2 Message Types

```typescript
// File change notification
{
  type: 'file_changed',
  payload: {
    path: '.auto-coding/tasks.json',
    changeType: 'modified'
  }
}

// Task status update
{
  type: 'task_updated',
  payload: {
    taskId: 'FEAT-001',
    status: 'completed',
    passes: true
  }
}

// Terminal output
{
  type: 'terminal_output',
  payload: {
    taskId: 'FEAT-005',
    output: 'npm run test\n✓ 42 tests passed',
    timestamp: '2026-03-14T10:30:00Z'
  }
}

// Phase transition
{
  type: 'phase_changed',
  payload: {
    projectId: 'project-123',
    fromPhase: 4,
    toPhase: 5,
    timestamp: '2026-03-14T11:00:00Z'
  }
}
```

---

## 5. Real-time Architecture

### 5.1 File Watching Strategy

Use **chokidar** for file system watching:

```typescript
// lib/file-watcher.ts
import chokidar from "chokidar";
import { WebSocketServer } from "ws";

export function setupFileWatcher(wss: WebSocketServer, projectRoot: string) {
  const watcher = chokidar.watch(
    [`${projectRoot}/.auto-coding/**/*`, `${projectRoot}/docs/**/*`, `${projectRoot}/.stitch/**/*`],
    {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
    }
  );

  watcher.on("change", (path) => {
    // Notify connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "file_changed",
            payload: { path, changeType: "modified" },
          })
        );
      }
    });
  });

  return watcher;
}
```

### 5.2 WebSocket Server Setup

```typescript
// pages/api/ws/route.ts
import { WebSocketServer } from "ws";
import { setupFileWatcher } from "@/lib/file-watcher";

let wss: WebSocketServer;

export default function handler(req, res) {
  if (!wss) {
    wss = new WebSocketServer({ port: 3001 });

    wss.on("connection", (ws) => {
      ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "subscribe") {
          ws.projectId = data.projectId;
        }
      });
    });

    setupFileWatcher(wss, process.cwd());
  }

  res.status(200).json({ status: "WebSocket server running" });
}
```

### 5.3 Polling Strategy (for Logs)

For high-frequency terminal output, use polling instead of WebSocket:

```typescript
// hooks/use-terminal-output.ts
import useSWR from "swr";

export function useTerminalOutput(taskId: string) {
  const { data, mutate } = useSWR(`/api/tasks/${taskId}/output`, fetcher, {
    refreshInterval: 1000, // Poll every 1s
    revalidateOnFocus: false,
  });

  return { output: data?.output || [] };
}
```

---

## 6. Component Design Patterns

### 6.1 Server Components vs Client Components

**Server Components** (default):

- Static content (dashboard cards, phase indicators)
- SEO-optimized pages (document viewers)
- No client-side interactivity

**Client Components** (use 'use client'):

- Interactive forms (Q&A, approval)
- Real-time displays (terminal, task status)
- Event handlers (click, hover, drag)

```typescript
// ✅ Server Component (default)
// app/projects/[id]/page.tsx
import { ProjectCard } from '@/components/dashboard/project-card'

export default async function ProjectPage({ params }) {
  const project = await getProject(params.id)  // Server-side fetch
  return <ProjectCard project={project} />
}

// ✅ Client Component
// components/qa/question-card.tsx
'use client'

import { useState } from 'react'

export function QuestionCard({ question }) {
  const [answer, setAnswer] = useState('')
  return (
    <input
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
    />
  )
}
```

### 6.2 Optimistic Updates

For immediate UI feedback:

```typescript
// hooks/use-task-update.ts
import { useMutation } from "swr/mutation";

export function useTaskUpdate(projectId: string, taskId: string) {
  const { trigger, isMutating } = useMutation(
    `/api/projects/${projectId}/tasks/${taskId}`,
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "PATCH",
        body: JSON.stringify(arg),
      });
      return res.json();
    }
  );

  const updateTask = async (status: string) => {
    // Optimistic update
    await trigger(
      { status: { status, passes: true } },
      { optimisticData: (current) => ({ ...current, status: { status, passes: true } }) }
    );
  };

  return { updateTask, isMutating };
}
```

### 6.3 Error Boundaries

```typescript
// components/shared/error-boundary.tsx
'use client'

export class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />
    }
    return this.props.children
  }
}
```

---

## 7. Security Considerations

### 7.1 File System Security

**Principle**: Web app runs with same permissions as CLI user

**Constraints**:

- ✅ Can only read/write files user has access to
- ✅ No elevated privileges
- ✅ Sandbox to project root directory

**Implementation**:

```typescript
// lib/file-utils.ts
import path from "path";

const PROJECT_ROOT = process.cwd();

export function sanitizePath(userPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, userPath);

  // Ensure path is within project root
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error("Path traversal attempt detected");
  }

  return resolved;
}

export async function readFile(relativePath: string): Promise<string> {
  const safePath = sanitizePath(relativePath);
  return fs.readFile(safePath, "utf-8");
}
```

### 7.2 Input Validation

```typescript
// lib/validation.ts
import { z } from "zod";

export const TaskUpdateSchema = z.object({
  status: z.object({
    status: z.enum(["pending", "in_progress", "completed", "blocked"]),
    passes: z.boolean().optional(),
  }),
});

export const QAAnswerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
});

// API route usage
export async function PATCH(req: Request) {
  const body = await req.json();
  const validated = TaskUpdateSchema.parse(body); // Throws if invalid
  // ... process validated data
}
```

### 7.3 WebSocket Security

```typescript
// Only accept connections from localhost
wss.on("connection", (ws, req) => {
  const origin = req.headers.origin;

  if (origin !== "http://localhost:3000") {
    ws.close();
    return;
  }

  // Rest of connection logic
});
```

---

## 8. Performance Optimization

### 8.1 Static Generation (SSG)

Pre-render static pages at build time:

```typescript
// app/projects/[id]/page.tsx
export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((p) => ({ id: p.id }));
}

export const revalidate = 60; // Revalidate every 60s (ISR)
```

### 8.2 Code Splitting

Lazy load heavy components:

```typescript
// Lazy load terminal component
const TerminalOutput = dynamic(
  () => import('@/components/terminal/terminal-output'),
  {
    loading: () => <TerminalSkeleton />,
    ssr: false  // No SSR for terminal
  }
)
```

### 8.3 Virtualization

For long lists (terminal output, task tables):

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedTerminal({ lines }: { lines: string[] }) {
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20,  // Line height
    overscan: 10
  })

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <LogLine key={virtualRow.key} line={lines[virtualRow.index]} />
      ))}
    </div>
  )
}
```

### 8.4 Image Optimization

```typescript
import Image from 'next/image'

export function DesignViewer({ designUrl }: { designUrl: string }) {
  return (
    <Image
      src={designUrl}
      alt="Design preview"
      width={1200}
      height={800}
      loading="lazy"
      placeholder="blur"
      blurDataURL={shimmerDataUrl}
    />
  )
}
```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

| Test Type             | Coverage | Tools                         |
| --------------------- | -------- | ----------------------------- |
| **Unit Tests**        | 70%      | Vitest, React Testing Library |
| **Integration Tests** | 20%      | Playwright, Supertest         |
| **E2E Tests**         | 10%      | Playwright                    |

### 9.2 Component Testing

```typescript
// __tests__/components/dashboard/project-card.test.tsx
import { render, screen } from '@testing-library/react'
import { ProjectCard } from '@/components/dashboard/project-card'

describe('ProjectCard', () => {
  it('displays project name and phase', () => {
    render(<ProjectCard project={mockProject} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Phase 5')).toBeInTheDocument()
  })

  it('shows status badge with correct color', () => {
    render(<ProjectCard project={mockProject} />)

    const badge = screen.getByText('In Progress')
    expect(badge).toHaveClass('text-blue-500')
  })
})
```

### 9.3 API Integration Testing

```typescript
// __tests__/api/projects.test.ts
import { createMocks } from "node-mocks-http";
import handler from "@/pages/api/projects";

describe("/api/projects", () => {
  it("returns list of projects", async () => {
    const { req, res } = createMocks({ method: "GET" });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.projects).toBeInstanceOf(Array);
  });
});
```

### 9.4 E2E Testing

```typescript
// e2e/qa-flow.spec.ts
import { test, expect } from "@playwright/test";

test("user can complete Q&A flow", async ({ page }) => {
  await page.goto("/projects/test-project/qa");

  // Answer first question
  await page.fill('input[name="question-1"]', "Test answer");
  await page.click('button:has-text("Next")');

  // Verify progress indicator
  await expect(page.locator('[data-testid="qa-progress"]')).toHaveText("2 of 10");

  // Submit and verify
  await page.click('button:has-text("Submit")');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

---

## 10. Deployment Architecture

### 10.1 Local Development

```bash
# Development server
npm run dev

# File structure
.next/           # Build output
node_modules/    # Dependencies
.env.local       # Local environment variables
```

### 10.2 Production Deployment

**Option 1: Standalone Server**

```bash
# Build
npm run build

# Start production server
npm run start
# Accessible at http://localhost:3000
```

**Option 2: Docker Container**

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t lrac-uiux .
docker run -p 3000:3000 -v $(pwd):/app lrac-uiux
```

### 10.3 Environment Variables

```env
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:3001
PROJECT_ROOT=/Users/eric/code/lrac
NODE_ENV=development
```

---

## 11. Integration Points

### 11.1 Auto-Coding Framework Integration

| Component           | Integration Method | File Path                                |
| ------------------- | ------------------ | ---------------------------------------- |
| **Task Management** | Read/write         | `.auto-coding/tasks.json`                |
| **Session History** | Read/write         | `.auto-coding/progress.txt`              |
| **Q&A Sessions**    | Write              | `.auto-coding/qa-sessions/*.json`        |
| **BRD/PRD**         | Read               | `docs/brd/BRD-*.md`, `docs/prd/PRD-*.md` |
| **Architecture**    | Read               | `docs/architecture/ARCH-*.md`            |
| **Stitch Designs**  | Read               | `.stitch/designs/*.png`                  |
| **Design System**   | Read               | `.stitch/DESIGN.md`                      |

### 11.2 File Watching Events

```typescript
// File change → WebSocket broadcast
fileChanged(path) → wss.broadcast({
  type: 'file_changed',
  path
}) → client.refetch()
```

### 11.3 CLI ↔ Web Coordination

| Action               | CLI                                   | Web                          |
| -------------------- | ------------------------------------- | ---------------------------- |
| **Start Phase 1**    | `brainstorming` skill                 | Web displays Q&A interface   |
| **Complete Q&A**     | CLI reads `.auto-coding/qa-sessions/` | Web writes answers to JSON   |
| **Approve BRD**      | CLI checks approval status            | Web writes approval to JSON  |
| **Execute Tasks**    | CLI runs agents                       | Web displays terminal output |
| **Phase Transition** | CLI updates `tasks.json`              | Web revalidates via SWR      |

---

## 12. Migration Path

### 12.1 Phase 1: MVP (Weeks 1-2)

**Features**:

- ✅ Project dashboard
- ✅ 8-phase visualization
- ✅ Basic Q&A interface (Phase 1-2)
- ✅ Document viewer (BRD/PRD)
- ✅ Terminal output display

**Tech Stack**:

- Next.js 14 App Router
- shadcn/ui components
- File system read/write
- Basic WebSocket

### 12.2 Phase 2: Enhanced Features (Weeks 3-4)

**Features**:

- ✅ Stitch design viewer
- ✅ Approval workflow
- ✅ Real-time file watching
- ✅ Keyboard navigation (Cmd+K)
- ✅ Settings page

**Enhancements**:

- Optimistic updates
- Error boundaries
- Performance optimization

### 12.3 Phase 3: Production Ready (Months 2-3)

**Features**:

- Multi-user collaboration (optional)
- Cloud sync (optional)
- Plugin system (optional)

**Infrastructure**:

- Docker deployment
- CI/CD pipeline
- Monitoring and analytics

---

## 13. Architectural Risks & Mitigations

| Risk                           | Probability | Impact | Mitigation                              |
| ------------------------------ | ----------- | ------ | --------------------------------------- |
| **File system performance**    | Medium      | High   | Virtualization, pagination, caching     |
| **WebSocket connection drops** | Medium      | Medium | Reconnection logic, fallback to polling |
| **Large task lists**           | Medium      | Medium | Lazy loading, search/filter             |
| **Stitch design rendering**    | Low         | Low    | Image optimization, lazy loading        |
| **Browser compatibility**      | Low         | Low    | Transpilation, polyfills                |

---

## 14. Appendix

### 14.1 Technology Rationale

**Why Next.js 14?**

- App Router for modern routing
- Server Components for performance
- Built-in API routes
- SSG for local-first deployment

**Why shadcn/ui?**

- Radix UI primitives (accessibility)
- Full customization (not npm package)
- Tailwind CSS integration
- Matches Stitch design output

**Why SWR over React Query?**

- Simpler API
- Smaller bundle size
- Built-in polling
- WebSocket-friendly

**Why WebSocket over Server-Sent Events?**

- Bidirectional communication
- Better error handling
- Wider browser support
- Binary data support

### 14.2 Alternative Architectures Considered

**Alternative 1: SPA (React + Express)**

- ❌ No SSG benefits
- ❌ Separate backend server
- ❌ More complex deployment

**Alternative 2: Database-backed (PostgreSQL)**

- ❌ Requires data migration
- ❌ Breaks framework compatibility
- ❌ Overkill for single-user MVP

**Alternative 3: Cloud-first (Vercel)**

- ❌ No local file access
- ❌ Requires cloud storage
- ❌ Against local-first principle

### 14.3 Performance Benchmarks

| Metric                           | Target  | Measurement Method |
| -------------------------------- | ------- | ------------------ |
| **Time to First Byte (TTFB)**    | < 200ms | Lighthouse         |
| **First Contentful Paint (FCP)** | < 1s    | Lighthouse         |
| **Time to Interactive (TTI)**    | < 2s    | Lighthouse         |
| **Dashboard load**               | < 1s    | Custom timing      |
| **Terminal scroll FPS**          | 60 FPS  | Chrome DevTools    |
| **File watch latency**           | < 100ms | Custom metrics     |

---

**Document Status**: Draft - Awaiting Architect Reviewer Approval
**Next Action**: Architect reviewer sign-off → Proceed to Phase 4 (Task Breakdown)
