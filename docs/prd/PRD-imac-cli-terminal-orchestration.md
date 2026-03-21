# PRD: IMAC ADD - Claude CLI Frontend Orchestration

**Document Type**: Product Requirements Document  
**Project**: lrac-uiux  
**Iteration**: imac-cli-terminal-orchestration  
**Phase**: 2 - Product Design (IMAC ADD)  
**Created**: 2026-03-16  
**Status**: Draft

---

## 1. Product Overview

### 1.1 Vision

Build a production-ready frontend execution workspace that can drive Claude CLI commands, stream terminal output in real time, persist full event logs, and escalate structured interaction events (Q&A and approval) to embedded cards and future human communication systems.

### 1.2 Goals

1. Provide a browser-based Claude terminal with input + streaming output
2. Persist command/output/event timeline for replay and audit
3. Trigger Enhanced Q&A Card and Enhanced Approval Card from structured events
4. Provide PM Main Terminal with multi-task child terminal aggregation
5. Support future human routing (Slack/Feishu/Teams) through adapter interfaces

### 1.3 Non-goals

- Replacing Claude CLI itself
- Building full enterprise IAM in this iteration
- Implementing all communication platform adapters in this iteration

---

## 2. Functional Requirements

### 2.1 Terminal Workspace

- FR-1.1: User can submit CLI command from frontend input
- FR-1.2: Frontend receives stdout/stderr/system streams with timestamps
- FR-1.3: Command lifecycle is visible (submitted/running/finished/exit_code)
- FR-1.4: Session can replay historical logs after page reload
- FR-1.5: Support filtering/search/export for terminal timeline

### 2.2 Structured Interaction Events

- FR-2.1: System emits canonical event envelope for terminal + interaction events
- FR-2.2: `interaction.question.raised` opens Enhanced Q&A Card
- FR-2.3: `interaction.approval.requested` opens Enhanced Approval Card
- FR-2.4: User response and decision are written back as immutable events
- FR-2.5: Event timeline supports sequence-ordered replay and incremental fetch

### 2.3 PM Main Terminal + Parallel Task Terminals

- FR-3.1: PM Main Terminal shows global queue and high-priority pending events
- FR-3.2: Each parallel task has child terminal session bound to featureId
- FR-3.3: PM can drill down into any child session and return to aggregated view
- FR-3.4: Session tree supports parent-child relationship and session status

### 2.4 Human Routing Readiness

- FR-4.1: `interaction.human.routing.created` event type is supported
- FR-4.2: Routing ticket stores assignee, due time, status, and resolution
- FR-4.3: External communication adapters use abstract interface and callback model

---

## 3. Data & API Requirements

### 3.1 Data Entities

- `terminal_sessions`
- `terminal_events`
- `interaction_tickets`

### 3.2 API Surface (V1)

- `POST /api/terminal/sessions`
- `POST /api/terminal/sessions/{id}/commands`
- `GET /api/terminal/sessions/{id}/events?afterSeq=`
- `POST /api/interactions/question/{eventId}/answer`
- `POST /api/interactions/approval/{eventId}/approve`
- `POST /api/interactions/approval/{eventId}/reject`
- `POST /api/interactions/{eventId}/route-human`

### 3.3 Event Contract

- Required envelope fields: `eventId`, `eventType`, `sessionId`, `timestamp`, `actor`, `payload`
- Required ordering: `session_id + seq_no` monotonic append

---

## 4. UX Requirements

- UX-1: Terminal remains responsive under high-frequency output
- UX-2: Diff/structured updates are visually distinguishable from normal logs
- UX-3: Q&A/Approval cards can be used inline without leaving terminal context
- UX-4: PM overview can identify blockers within 10 seconds

---

## 5. Acceptance Criteria

- AC-1: End-to-end command execution from frontend input to CLI output works
- AC-2: Reload preserves terminal history and interaction events
- AC-3: Question and approval events trigger enhanced cards deterministically
- AC-4: PM Main Terminal shows all active child terminals and statuses
- AC-5: At least one routed human-response ticket can round-trip back to session timeline

---

## 6. Risks

- Security risk from unrestricted command execution
- Event loss risk under high-concurrency stream
- UI performance degradation with long-running sessions

Mitigation:

- Command policy guard + allowlist
- Sequence-based replay and backfill
- Virtualized timeline + incremental fetch
