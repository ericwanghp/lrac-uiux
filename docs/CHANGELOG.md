# Changelog

## 2026-05-06

### IMAC: IMAC Management Feature — Create New IMAC Button, Git Worktree, Session Tracking

- Request summary: Add "Create New IMAC" button next to "Create New Project" on dashboard. Click to open a wizard for creating isolated change cycles with description and attachments. Each IMAC creates a git worktree for isolated development, with independent session management until merged back to main.
- Detected start phase: Phase 3 (Architecture) — git worktree integration and session persistence require architectural design
- Impact scope:
  - `lib/services/imac-session-manager.ts` — new session manager service
  - `app/api/imac/` — 5 new API routes (CRUD + worktree + merge + abort)
  - `components/dashboard/create-imac-dialog.tsx` — new IMAC creation wizard
  - `components/dashboard/imac-list.tsx` — new IMAC list component
  - `app/imac/[id]/` — new IMAC detail page
  - `app/dashboard/page.tsx` — updated with IMAC button and list
  - `components/dashboard/data.ts` — added imacSessions to DashboardData
- Key decisions:
  - File-based storage in `.auto-coding/imac-sessions/sessions.json`
  - Git worktree operations via direct `execFile("git", ...)` (not terminal API)
  - Attachment storage per session in `.auto-coding/imac-sessions/{id}/attachments/`
  - Status lifecycle: created → in-progress → merged / aborted
- Iteration ID: `imac-mgmt`
- Tasks: imac-mgmt-p3a-001 through imac-mgmt-p5d-003

## 2026-05-05

### IMAC: Full Visual Overhaul & Responsive Redesign

- Request summary: Comprehensive frontend visual and interaction optimization across all pages. Full visual overhaul with refined warm theme, responsive mobile support, component decomposition, interaction polish.
- Detected start phase: Phase 2.5 (Design) — visual direction, interaction patterns, responsive strategy all require design decisions.
- Impact scope: globals.css, all page components, AppShell, Sidebar, Header, shared components, new Toast/Skeleton/ErrorBoundary components
- Key decisions:
  - Refine existing warm orange-primary theme to premium quality
  - Add full responsive design with mobile sidebar drawer
  - Decompose monolithic page components (Dashboard 892 lines, Settings 1073 lines)
  - Add data visualization, skeleton loading, toast notifications, error boundaries
  - Differentiate phase pages visually instead of shared template
- Iteration ID: `imac-visual-redesign`
- 6 planned iterations covering design system, shell, dashboard, phase pages, settings/approval, interaction polish

## 2026-03-21

### IMAC: Dashboard Project Switcher — Path Input + Persistence

- Request summary: `/IMAC` Dashboard 的 Project Switcher 可选择具体路径，支持手动输入并自动发现项目，同时持久化最后一次选择。
- Detected start phase: Phase 5 (Implementation) — pure UI enhancement, no upstream requirement/design changes.
- Impact scope:
  - `components/shared/project-switcher-form.tsx` — new Client Component
  - `components/shared/index.ts` — new export
  - `app/dashboard/page.tsx` — use ProjectSwitcherForm in Project Switcher card
- Key decisions:
  - Path input field + Go button with `FolderOpen` icon prefix
  - Auto-validation against `availableProjects`: green `CheckCircle2` for valid, red `AlertCircle` for invalid
  - Enter key and button click both trigger navigation
  - Last selected path persisted in `localStorage` key `lrac-last-project-path`, restored on next visit
  - Existing project name buttons preserved below the input as shortcuts
- Changed files:
  - `components/shared/project-switcher-form.tsx` (new)
  - `components/shared/index.ts`
  - `app/dashboard/page.tsx`
  - `.auto-coding/tasks.json`
  - `.auto-coding/progress.txt`
  - `docs/CHANGELOG.md`
- Verification results:
  - `npx tsc --noEmit` passed with no errors.
  - `npm run lint` passed.
- Follow-up actions:
  - Visual test at `http://localhost:3000/dashboard` — confirm input renders, validation icons toggle, localStorage persists.


## 2026-03-15

### IMAC: Dashboard Persistence Binding

- Request summary: `/IMAC` bind dashboard frontend to backend persistence and resolve project path.
- Detected start phase: Phase 3 (Architecture).
- Impact scope: frontend data loading flow, persistence aggregation, runtime state rendering.
- Key decisions:
  - Switch dashboard to runtime loading mode.
  - Load persisted sources from `docs/` and `.auto-coding/`.
  - Keep robust fallbacks for missing files using settled async reads.
- Changed files:
  - `app/dashboard/page.tsx`
  - `.auto-coding/progress.txt`
  - `docs/CHANGELOG.md`
- Verification results:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
- Follow-up actions:
  - Validate `http://localhost:3000/dashboard` visually against expected persistence metrics.
