# Changelog

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
