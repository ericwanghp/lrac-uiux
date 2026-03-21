**Language Switch:** [English](README.md) | [中文](README.zh.md)

# LRAC UIUX Console

> A UI/UX-first control surface for operating the LRAC long-running delivery framework.

This repository is not a generic demo site. It is the productized interface layer for LRAC:
- making project state visible,
- making phase execution operable,
- making multi-role collaboration traceable.

## Positioning

LRAC has two cores:
- **Framework core**: rules, phases, tasks, memory, governance
- **UIUX core (this repo)**: information architecture, interaction workflows, operational pages

This project focuses on the second one.

## What This UIUX Product Solves

Typical pain in long-running AI delivery:
- state is hidden in scattered files or chat history
- PM/QA/engineering views are disconnected
- approvals, blockers, and terminal actions are hard to audit
- cross-project navigation is weak

This console turns those into structured experiences:
- **Dashboard-first visibility**
- **Role-oriented pages**
- **Durable runtime state from `.auto-coding`**
- **Actionable APIs for PM/QA/Terminal/Approval workflows**

## Core Experiences

### 1) Dashboard as Mission Control
- phase progress, completion ratio, blockers, and branch context
- project switcher (global project context)
- project memory snapshots from tasks/progress/session data

### 2) PM/Delivery Operations
- `/pm`: project delivery overview and execution coordination
- `/approval`: decision queues and human-in-the-loop workflow
- `/terminal`: command/session timeline for runtime execution tracking

### 3) Engineering Track Pages
- `/requirements`
- `/design`
- `/architecture`
- `/development`
- `/testing`
- `/deployment`
- `/qa`
- `/settings`

These pages reflect the LRAC phase model as product workflows, not just static docs.

### 4) Runtime-backed API Layer
Representative API routes:
- `/api/tasks`
- `/api/progress`
- `/api/features`
- `/api/approvals`
- `/api/qa/sessions`
- `/api/terminal/sessions`
- `/api/markdown`
- `/api/design-assets`

They bridge UI interactions with durable project-state files.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** style component patterns
- File-system backed persistence under `.auto-coding`

## Quick Start

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000/dashboard`
- `http://localhost:3000/pm`

### Quality Commands

```bash
npm run lint
npm run typecheck
```

## Repository Structure

```text
app/                   # Route pages + API routes
components/            # Shared and page-level UI components
lib/                   # Domain logic, file operations, validation, types
docs/                  # Product/design/framework docs
.auto-coding/          # LRAC durable project memory (runtime state + config)
.claude/               # Agents, commands, and rules
```

## Project Context Model

This UIUX console supports multi-project operation:
- selected project root is persisted as global context
- context applies across dashboard + other pages/APIs
- runtime reads/writes resolve against the active project root

## Why This Repo Matters

If LRAC defines **how** long-running AI delivery should work, this repository defines **how humans and agents actually operate it**.

It is the UIUX operating layer of LRAC.

## Related Docs

- [README.zh.md](README.zh.md)
- [CLAUDE.md](CLAUDE.md)
- [AGENTS.md](AGENTS.md)
- [.claude/agents/AGENTS.md](.claude/agents/AGENTS.md)
