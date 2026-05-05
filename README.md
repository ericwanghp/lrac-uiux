**Language Switch:** [English](README.md) | [中文](README.zh.md)

# LRAC UIUX Console

> The operating surface for the [LRAC Long-Running Auto-Coding Framework](https://github.com/ericwanghp/LRAC).

[![Framework hero](docs/design/readme-assets/framework-hero.svg)](https://github.com/ericwanghp/LRAC)

LRAC defines **how** long-running AI delivery should work. This repository defines **how humans and agents actually operate it** — through structured pages, role-oriented workflows, and runtime-backed APIs.

## Screenshots

### Landing Page

![Landing page interface showing a hero section, feature overview cards, and call to action buttons within the LRAC console environment](landing-phase.png)

### Dashboard — Mission Control

![Dashboard interface displaying mission control metrics, phase progress, and project status panels in a console layout](screenshot-dashboard.png)

### PM / Delivery Operations

![PM operations page showing delivery task lists, approvals, and collaboration widgets in a project coordination environment](screenshot-pm.png)

### Claude Code Workspace

![Claude code workspace with code editor panels and workspace navigation in a design and development environment](docs/design/readme-assets/Claude-Code-Worksapce.png)

## What This Console Solves

Typical pain in long-running AI delivery:

| Pain | What the console does |
|------|-----------------------|
| State is hidden in scattered files and chat history | Dashboard-first visibility with live `.auto-coding` data |
| PM / QA / engineering views are disconnected | Role-oriented pages that share the same project context |
| Approvals, blockers, terminal actions are hard to audit | Dedicated `/approval`, `/terminal`, `/inbox` pages |
| Cross-project navigation is weak | Global project switcher with persistent context |

## Frontend Navigation Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Landing Page (/)                            │
│   Hero → Features → How It Works → Screenshots → CTA              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────────┐
              ▼             ▼                  ▼
     ┌────────────┐  ┌───────────┐   ┌──────────────┐
     │ Dashboard  │  │  Settings │   │    Inbox     │
     │ /dashboard │  │ /settings │   │   /inbox     │
     └─────┬──────┘  └───────────┘   └──────────────┘
           │
     ┌─────┴──────────────────────────────────────────────┐
     │              Phase Track Pages                      │
     │  ┌──────────────┐  ┌───────────────┐               │
     │  │ Requirements │  │    Design     │               │
     │  │ /requirements│  │    /design    │               │
     │  └──────────────┘  └───────────────┘               │
     │  ┌──────────────┐  ┌───────────────┐               │
     │  │ Architecture │  │  Development  │               │
     │  │ /architecture│  │ /development  │               │
     │  └──────────────┘  └───────────────┘               │
     │  ┌──────────────┐  ┌───────────────┐               │
     │  │   Testing    │  │  Deployment   │               │
     │  │   /testing   │  │  /deployment  │               │
     │  └──────────────┘  └───────────────┘               │
     └─────────────────────────────────────────────────────┘
           │
     ┌─────┴──────────────────────────────────────────────┐
     │           Operations & Coordination                 │
     │  ┌──────────────┐  ┌───────────────┐               │
     │  │   PM View    │  │   Approval    │               │
     │  │     /pm      │  │   /approval   │               │
     │  └──────────────┘  └───────────────┘               │
     │  ┌──────────────┐  ┌───────────────┐               │
     │  │   Terminal   │  │      QA       │               │
     │  │   /terminal  │  │      /qa      │               │
     │  └──────────────┘  └───────────────┘               │
     │  ┌──────────────┐                                   │
     │  │  Tasks Log   │                                   │
     │  │  /tasks-log  │                                   │
     │  └──────────────┘                                   │
     └─────────────────────────────────────────────────────┘
```

## Core Experiences

### 1) Dashboard as Mission Control

- Phase progress bars, completion ratio, active blockers, branch context
- Project switcher with global project context persistence
- Project memory snapshots from `tasks.json` / `progress.txt` / session data

### 2) Phase Track Pages

These pages map the LRAC 8-phase delivery model to operable workflows:

| Route | Phase | Purpose |
|-------|-------|---------|
| `/requirements` | Phase 1-2 | BRD / PRD viewer and editor |
| `/design` | Phase 2.5 | Stitch design viewer and asset browser |
| `/architecture` | Phase 3 | Architecture document viewer |
| `/development` | Phase 5 | Code tracking and task execution |
| `/testing` | Phase 6 | Test strategy and results |
| `/deployment` | Phase 7 | Deploy status and UAT verification |
| `/qa` | Phase 6-7 | QA session management |


## Positioning

LRAC has two cores:

| Core | Repo | Focus |
|------|------|-------|
| **Framework** | [ericwanghp/LRAC](https://github.com/ericwanghp/LRAC) | Rules, phases, agents, memory, governance |
| **UIUX (this repo)** | [ericwanghp/LRAC-UIUX](https://github.com/ericwanghp/LRAC-UIUX) | Information architecture, interaction workflows, operational pages |

## Architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js SSR)                      │
├───────────┬───────────┬───────────┬───────────┬───────────────────┤
│ Landing   │ Dashboard │  Phase    │  Ops      │  Settings         │
│ /         │ /dashboard│  Pages    │  Pages    │  /settings        │
│           │           │           │  /pm      │                   │
│           │           │           │  /approval│                   │
│           │           │           │  /terminal│                   │
├───────────┴───────────┴───────────┴───────────┴───────────────────┤
│                       API Routes (/api/*)                         │
├───────────────────────────────────────────────────────────────────┤
│                    lib/ Domain Layer                               │
│            File ops · Validation · Types · Helpers                │
├───────────────────────────────────────────────────────────────────┤
│                    .auto-coding/ Runtime State                     │
│          tasks.json · progress.txt · config · docs                │
└───────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Claude Code CLI** — This project relies on the local Claude Code CLI as the runtime for multi-agent orchestration, phase execution, and hook enforcement. Install via [claude.ai/code](https://claude.ai/code).

## Quick Start

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000` — Landing page
- `http://localhost:3000/dashboard` — Mission control
- `http://localhost:3000/pm` — PM operations

### Quality Commands

```bash
npm run lint
npm run typecheck
```


## Related

- [LRAC Framework](https://github.com/ericwanghp/LRAC) — The framework this console operates
- [CLAUDE.md](CLAUDE.md) — Full framework specification for AI agents
- [AGENTS.md](.claude/agents/AGENTS.md) — Agent catalog and role definitions
