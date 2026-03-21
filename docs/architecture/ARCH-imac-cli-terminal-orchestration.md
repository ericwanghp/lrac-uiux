# Architecture: IMAC Claude CLI Terminal Orchestration

## 1. Purpose

定义 IMAC ADD 的执行架构：前端终端、Claude CLI 执行层、事件总线、交互卡片触发机制、主从终端会话编排与可审计存储。

## 2. System Context

```text
Browser Terminal Workspace
  -> Next.js API Gateway
    -> Session Orchestrator
      -> Claude CLI Runner
      -> Event Normalizer
      -> Interaction Router
      -> Human Routing Adapter
    -> Event Store / Session Store
```

## 3. Core Modules

### 3.1 Terminal Workspace (Frontend)

- PM 主终端视图
- 子终端视图（按 featureId）
- 事件时间线（过滤/检索/回放）
- 嵌入式 Enhanced Q&A / Approval 卡片

### 3.2 Session Orchestrator (Backend)

- 创建/关闭 session
- 分发命令到 CLI Runner
- 管理 parent-child session 拓扑
- 聚合关键交互事件

### 3.3 Claude CLI Runner

- 使用 `pty` 或 `child_process` 启动 Claude CLI
- 采集 stdout/stderr/system
- 产出命令生命周期事件
- 负责进程回收与异常恢复

### 3.4 Event Normalizer

- 将原始日志与交互消息统一到标准事件协议
- 附带 `sessionId`, `featureId`, `seqNo`, `timestamp`
- 保证写入顺序一致

### 3.5 Interaction Router

- 识别并处理：
  - `interaction.question.raised`
  - `interaction.approval.requested`
  - `interaction.human.routing.created`
- 驱动前端弹卡和状态更新

## 4. Data Model

### 4.1 terminal_sessions

- `id`
- `parent_session_id`
- `session_type` (`pm_main` | `task_child`)
- `feature_id`
- `status`
- `created_at`
- `closed_at`

### 4.2 terminal_events

- `id`
- `session_id`
- `seq_no`
- `event_type`
- `stream_type`
- `payload_json`
- `created_at`

### 4.3 interaction_tickets

- `id`
- `session_id`
- `ticket_type` (`question` | `approval` | `human_routing`)
- `assignee`
- `status`
- `due_at`
- `resolved_at`

## 5. Event Contract

```json
{
  "eventId": "evt_001",
  "eventType": "terminal.output.appended",
  "sessionId": "sess_task_001",
  "featureId": "imac-cli-terminal-orchestration-p5d-003",
  "seqNo": 128,
  "timestamp": "2026-03-16T10:00:00.000Z",
  "actor": { "type": "agent", "id": "claude-cli" },
  "payload": { "stream": "stdout", "content": "..." }
}
```

## 6. API Design (V1)

- `POST /api/terminal/sessions`
- `POST /api/terminal/sessions/{id}/commands`
- `GET /api/terminal/sessions/{id}/events?afterSeq=`
- `POST /api/terminal/sessions/{id}/close`
- `POST /api/interactions/question/{eventId}/answer`
- `POST /api/interactions/approval/{eventId}/approve`
- `POST /api/interactions/approval/{eventId}/reject`
- `POST /api/interactions/{eventId}/route-human`

## 7. Main + Child Session Orchestration

1. PM 创建 `pm_main` 会话
2. 每个并行任务创建 `task_child` 会话，并关联 featureId
3. 子会话将关键事件上报主会话聚合流
4. PM 可从聚合流跳转到子会话精确位置

## 8. Reliability

- 事件写入失败重试（指数退避）
- WebSocket 断线后按 `afterSeq` 回补
- 长会话分页加载，避免前端内存膨胀
- 子会话崩溃不影响主会话可用性

## 9. Security

- 命令策略控制（allowlist + denylist）
- 输出脱敏（token/key/url）
- session 与 project 强绑定
- 关键交互事件审计不可变

## 10. Rollout

1. 先上线单会话命令链路
2. 再上线交互事件弹卡
3. 再上线 PM 主从终端
4. 最后接入人答复路由适配层
