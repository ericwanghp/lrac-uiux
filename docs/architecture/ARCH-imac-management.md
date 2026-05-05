# Architecture: IMAC Management Feature

## Overview

Add IMAC (Install, Modify, And Change) management to the dashboard, enabling users to create isolated change cycles with git worktree isolation and independent session management.

## Data Model

### IMAC Session (`imac-sessions.json`)

```json
{
  "version": "1.0",
  "sessions": [
    {
      "id": "imac-mgmt-p5d-001",
      "abbreviation": "mgmt",
      "title": "Add IMAC Management",
      "description": "User-provided description...",
      "projectRoot": "/path/to/project",
      "attachments": [
        {
          "id": "att-001",
          "originalName": "screenshot.png",
          "storedName": "20260506-screenshot.png",
          "relativePath": ".auto-coding/imac-sessions/imac-mgmt-001/attachments/20260506-screenshot.png",
          "size": 12345,
          "uploadedAt": "2026-05-06T10:00:00Z"
        }
      ],
      "worktree": {
        "branch": "imac/mgmt",
        "path": null,
        "createdAt": null
      },
      "status": "created",
      "createdAt": "2026-05-06T10:00:00Z",
      "updatedAt": "2026-05-06T10:00:00Z",
      "mergedAt": null,
      "abortedAt": null
    }
  ]
}
```

### Status Lifecycle

```
created → in-progress → merged
                      → aborted
```

- `created`: Session created, worktree not yet initialized
- `in-progress`: Worktree created and active
- `merged`: Worktree merged back to main, branch cleaned up
- `aborted`: Worktree discarded without merging

## API Design

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/imac` | Create IMAC session (with description + attachments) |
| GET | `/api/imac` | List all IMAC sessions for project |
| GET | `/api/imac/[id]` | Get single IMAC session |
| POST | `/api/imac/[id]/worktree` | Create git worktree for IMAC |
| POST | `/api/imac/[id]/merge` | Merge worktree back to main |
| POST | `/api/imac/[id]/abort` | Abort IMAC and remove worktree |

### Create IMAC (POST /api/imac)

- Accepts `multipart/form-data`
- Fields: `title`, `abbreviation`, `description`, `referenceFiles[]`
- Stores attachments to `.auto-coding/imac-sessions/{id}/attachments/`
- Returns created session object

### Create Worktree (POST /api/imac/[id]/worktree)

- Executes: `git worktree add .auto-coding/worktrees/{abbr} -b imac/{abbr}`
- Updates session status to `in-progress`
- Returns worktree path

### Merge Worktree (POST /api/imac/[id]/merge)

- Executes:
  1. `git checkout main`
  2. `git merge imac/{abbr}`
  3. `git worktree remove .auto-coding/worktrees/{abbr}`
  4. `git branch -d imac/{abbr}`
- Updates session status to `merged`
- Returns merge result

### Abort IMAC (POST /api/imac/[id]/abort)

- Executes:
  1. `git worktree remove .auto-coding/worktrees/{abbr} --force`
  2. `git branch -D imac/{abbr}`
- Updates session status to `aborted`

## Storage

| Data | Location |
|------|----------|
| Session metadata | `.auto-coding/imac-sessions/sessions.json` |
| Attachments | `.auto-coding/imac-sessions/{id}/attachments/` |
| Git worktrees | `.auto-coding/worktrees/{abbr}/` |

## UI Components

### 1. Create IMAC Dialog (`components/dashboard/create-imac-dialog.tsx`)

- Triggered by "Create New IMAC" button next to "Create New Project"
- 2-step wizard:
  - Step 1: Title + abbreviation + description
  - Step 2: File attachments (drag & drop)
- On submit: Creates session via API, optionally creates worktree

### 2. IMAC List (`components/dashboard/imac-list.tsx`)

- Card component showing active and recent IMAC sessions
- Status badges with color coding
- Quick actions: View detail, Merge, Abort

### 3. IMAC Detail Page (`app/imac/[id]/page.tsx`)

- Full IMAC session details
- Attachment list with download links
- Status timeline
- Actions: Start worktree, Merge, Abort
- Worktree path display for Claude Code session reference

## Integration Points

### Existing Terminal API

Git worktree operations are executed via the terminal command runner:
- `git worktree add` — allowed (git is in SAFE_EXECUTABLES)
- `git worktree remove` — allowed
- `git merge` — allowed
- `git branch` — allowed
- `git checkout` — allowed

No changes needed to `terminal-command-policy.ts`.

### Existing File Upload

Reuses the `multipart/form-data` pattern from `requirements/intake`:
- Files extracted from `formData.getAll("referenceFiles")`
- Stored with timestamp-prefixed sanitized names
- Metadata tracked in session JSON

### Dashboard Integration

- Button placed in header alongside "Create New Project"
- IMAC list rendered as a new card section below milestone tracks
