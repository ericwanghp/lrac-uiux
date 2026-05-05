# Current System Model

**Purpose**: describe the current production-oriented model of `lrac-uiux` after the global Team/Settings refactor.

---

## 1. Core Rule

The system is split into two layers:

1. **Workspace-wide global layer**
   - Shared across every project in the workspace
   - Owns `Settings`, `Team`, `Approval policy`, member credentials, and auth sessions
2. **Project-scoped runtime layer**
   - Bound to the currently selected `project`
   - Owns tasks, inbox messages, approval gates, approvals, task execution state, and project documents

This is the most important boundary in the current system.

---

## 2. Global Layer

### 2.1 What belongs here

- UI settings
- Theme and appearance defaults
- Orchestration catalog selections
- Team members
- Phase approver policy
- Member password credentials
- Auth sessions

### 2.2 Source of truth

Workspace-wide data is stored under the app workspace:

```text
lrac-uiux/
  .auto-coding/
    config/
      ui-settings.json
      member-credentials.json
      auth-sessions.json
```

### 2.3 Main APIs

- `GET /api/settings`
- `PATCH /api/settings`
- `POST /api/members/password`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

### 2.4 Main UI surfaces

- `/settings`
- Header member auth panel
- Shared Team identity shown in `Inbox` and `Approval`

---

## 3. Project Layer

### 3.1 What belongs here

- `tasks.json` task state
- `progress.txt` session history
- inbox messages
- approval records
- phase gates
- runtime Claude / Shell / PM / Tasks Log state
- BRD / PRD / Architecture / design artifacts

### 3.2 Source of truth

Project runtime data stays inside the selected project root:

```text
project-root/
  .auto-coding/
    tasks.json
    progress.txt
    inbox.json
    approvals/
      records.json
    phase-gates/
      gates.json
    qa-sessions/
  docs/
  .stitch/
  .claude/
```

### 3.3 Main APIs

- `GET /api/tasks?project=...`
- `PATCH /api/features/:id/status?project=...`
- `GET /api/inbox?project=...`
- `PATCH /api/inbox/:id?project=...`
- `GET /api/phase-gates?project=...`
- `GET /api/phase-gates/summary?project=...`
- Claude CLI / Shell / bootstrap APIs with `project`

### 3.4 Main UI surfaces

- `/dashboard?project=...`
- `/pm?project=...`
- `/inbox?project=...`
- `/approval?project=...`
- `/tasks-log?project=...`
- Claude Code workspace
- Shell workspace

---

## 4. How They Work Together

### 4.1 Example: approval flow

1. Shared Team member signs in once
2. User opens a selected project
3. Project task completion triggers a project phase gate
4. Inbox message is created inside that project
5. Shared Team reviewer processes the approval
6. Decision updates project gate state and unblocks project tasks

### 4.2 Example: project switch

1. User changes the global project selector
2. URL `project` query param changes
3. Project-scoped pages reload runtime data for the new project
4. Workspace-wide `Settings` and `Team` remain unchanged
5. Logged-in member identity remains valid across projects

---

## 5. Migration Compatibility

The current implementation includes compatibility logic for older project-scoped settings:

- Legacy project `ui-settings.json` can be migrated into workspace-wide `ui-settings.json`
- Legacy project `member-credentials.json` can be migrated into workspace-wide credentials

The current write target is always the workspace-wide config store.

---

## 6. Practical Guidance

### 6.1 If you are changing Settings or Team

Treat it as **global**:

- update global config files
- avoid binding behavior to a specific project
- keep wording consistent with shared workspace scope

### 6.2 If you are changing approval, inbox, tasks, or phase flow

Treat it as **project runtime**:

- require `project`
- preserve `project` in navigation and deep links
- avoid writing workflow state into global settings

### 6.3 If you are unsure

Ask one question:

`Does this concept stay the same when the user switches project?`

- If `yes`, it probably belongs to the global layer
- If `no`, it probably belongs to the project layer

---

## 7. Related Documents

- [ARCH-lrac-uiux.md](./ARCH-lrac-uiux.md)
- [ARCH-imac-cli-terminal-orchestration.md](./ARCH-imac-cli-terminal-orchestration.md)
- [BRD-lrac-uiux.md](../brd/BRD-lrac-uiux.md)
- [PRD-lrac-uiux.md](../prd/PRD-lrac-uiux.md)
- [BRD-imac-cli-terminal-orchestration.md](../brd/BRD-imac-cli-terminal-orchestration.md)
- [PRD-imac-cli-terminal-orchestration.md](../prd/PRD-imac-cli-terminal-orchestration.md)
