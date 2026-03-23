# BRD: Hybrid Claude Terminal Workbench

**Document Type**: Business Requirements Document  
**Project**: lrac-uiux  
**Iteration**: imac-cli-terminal-orchestration  
**Phase**: 1 - Requirements Analysis  
**Created**: 2026-03-22  
**Status**: Draft

---

## 1. Executive Summary

### 1.1 Product Vision

Build a project-scoped browser workbench that lets users continue AI software delivery as if they had opened `claude -c` locally, while upgrading terminal-native workflows with structured Q&A and approval interruptions, PM aggregation, and replayable audit trails.

### 1.2 Business Objectives

| Objective | Success Metric | Target |
| --- | --- | --- |
| Restore terminal trust | Users report the browser terminal feels like a real ongoing Claude session | > 8/10 internal validation |
| Reduce unblock time | Median time from `question raised` to answer submitted | < 2 minutes |
| Reduce approval friction | Median time from `approval requested` to decision | < 2 minutes |
| Improve PM supervision | PM can identify the blocked child session | < 10 seconds |
| Preserve delivery continuity | Session reload resumes active context without loss | > 95% successful restoration |

### 1.3 Target Users

#### Primary User

- Solo builder, PM, or technical lead running long-lived AI coding sessions

#### Secondary User

- Framework maintainer supervising multiple parallel task sessions

#### Pain Points

- Current terminal page does not feel like a real Claude terminal
- Human interruptions are visible but not operationally central
- It is hard to know who owns the next action
- PMs lack a clear, fast triage surface for blocked child sessions

### 1.4 Market Context

**Based on**: [Competitive Analysis](../research/COMPETITIVE-ANALYSIS-imac-cli-terminal-orchestration.md)

The market currently splits across three patterns:

- **Terminal-native authenticity**: Anthropic Claude Code
- **Agent orchestration and handoff**: Cursor
- **Hybrid terminal + agent interaction**: Warp

Our differentiation is to combine terminal authenticity with structured interruption handling designed specifically for long-running AI delivery workflows.

---

## 2. Business Requirements

### 2.1 Core Business Requirements

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| BR-001 | Real session continuity in browser terminal | Critical | Users want to continue work exactly where Claude left off |
| BR-002 | Blocking Q&A interruption workflow | Critical | Product answers must be fast and structured |
| BR-003 | Blocking approval interruption workflow | Critical | Risky actions need explicit human decision points |
| BR-004 | Unified audit trail for raw output and human decisions | Critical | Long-running delivery needs replayability and trust |
| BR-005 | PM main terminal with session tree and pending queue | High | Parallel tasks must be triaged quickly |
| BR-006 | Project-scoped session model | High | This system is becoming a general multi-project management console |
| BR-007 | Resilient reconnect and replay | High | Long-running agent work cannot be fragile across refreshes |
| BR-008 | Human routing readiness | Medium | Future communication system integration should remain possible |

### 2.2 User Stories

```
As a developer,
I want the browser terminal to behave like an active Claude coding session,
So that I can continue implementation without switching back to a local terminal window.

As a product owner,
I want questions to interrupt me through a focused card,
So that I can respond quickly without parsing logs.

As an approver,
I want approvals to pause the flow until I decide,
So that high-impact actions are explicitly controlled.

As a PM,
I want to see every blocked or waiting child session from one place,
So that I can keep long-running delivery moving.
```

### 2.3 Non-Goals

| Item | Reason |
| --- | --- |
| Replace Claude CLI itself | The browser should orchestrate and continue it, not reinvent it |
| Build a full code editor | The core need is execution continuity, not IDE parity |
| Support arbitrary shell access | Safety and product focus require a guarded execution model |
| Ship enterprise routing integrations now | Adapters can follow after the interruption model is stable |
| Multi-user collaborative session control | Single-user / local-first flow remains the current scope |

---

## 3. Stakeholders

| Stakeholder | Role | Interest | Influence |
| --- | --- | --- | --- |
| Product owner | Primary operator | Wants fast continuation and interruption handling | High |
| PM / tech lead | Supervisor | Wants visibility into blockers and approvals | High |
| Framework maintainer | Platform owner | Wants stable session/event architecture | High |
| Future reviewers / approvers | Decision makers | Want clear, low-friction approval UX | Medium |

---

## 4. Success Metrics

### 4.1 KPIs

| KPI | Current State | Target |
| --- | --- | --- |
| Perceived terminal authenticity | Low; replay monitor feel | High; session continuation feel |
| Time to answer pending question | Unclear / manual | < 2 minutes median |
| Time to approve pending request | Unclear / manual | < 2 minutes median |
| PM blocker discovery time | Fragmented | < 10 seconds |
| Session restoration after refresh | Partial | > 95% |

### 4.2 Success Criteria

- User can open `/terminal` and continue an existing project-scoped Claude session
- A question request freezes raw input and opens a structured answer flow
- An approval request freezes raw input and opens a structured decision flow
- PM can jump from pending queue to exact child session
- Refresh preserves the same terminal story and unresolved interruptions

---

## 5. Business Constraints

### 5.1 Technical Constraints

| Constraint | Impact |
| --- | --- |
| Next.js application architecture | Must fit App Router and existing API route model |
| Local-first project model | Session and project state must remain workspace-scoped |
| Existing event/log system | Redesign should evolve the event model instead of replacing it blindly |
| Policy-guarded execution | Session runner must remain server-side and controlled |

### 5.2 Product Constraints

| Constraint | Impact |
| --- | --- |
| Terminal must still feel authentic | Over-structuring the center pane would fail the core user expectation |
| Interruption UI must be faster than raw terminal reading | Cards must reduce, not increase, response friction |
| PM view must stay high-signal | Aggregation should emphasize blockers, pending items, and ownership |

---

## 6. Recommendation

Proceed with **Hybrid Mode C**:

- real Claude session as the primary interaction surface
- structured interruption overlays for Q&A and approval
- PM command-center framing around that session model

This direction best satisfies both user intent and observed market patterns.
