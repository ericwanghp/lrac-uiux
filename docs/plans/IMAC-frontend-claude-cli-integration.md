# IMAC 方案：前端与 Claude CLI 联动（MAC 阶段交付）

## 0. 范围与目标

本文聚焦你提出的目标：在前端提供 Claude 终端交互能力，并将提问式交互、审批请求、并行任务终端输出统一编排和可追溯记录，为未来接入企业沟通系统（指派到具体责任人答复）预留接口。

核心目标：

1. 前端有可输入 CLI 指令的终端面板，能实时接收输出
2. 终端输出流水完整落库，可回放、检索、审计
3. 检测到提问/审批事件时，自动弹出 Enhanced Q&A Card / Enhanced Approval Card
4. 支持 PM 主终端 + 多并行任务子终端
5. 未来可无缝对接 Slack/飞书/Teams 等沟通系统做“人答复闭环”

---

## 1. 现状基线（As-Is）

### 1.1 已有能力

- 已有 `/terminal` 页面，支持日志筛选、搜索、下载、变更 diff 展示
- 已有 WebSocket 通道（`file_changed / task_updated / phase_changed`）
- 已有 Q&A 页面（问题卡）和 Approval 页面（审批卡）的前端基础页面
- 已有任务元数据体系（`tasks.json` + executionHistory + status）

### 1.2 当前差距

- CLI 输入到真实进程执行链路未打通（当前更偏任务历史展示）
- 没有“结构化交互事件协议”（question/approval/human-response-request）
- 缺少“会话级持久化模型”（session、stream、event、checkpoint）
- 并行任务终端缺少主从编排视图与统一追踪 ID

---

## 2. MAC 阶段交付

## M 阶段（Model）— 业务模型与交互模型

### M1. 统一概念模型

定义 6 个一等实体：

1. `TerminalSession`：一次会话（PM 主会话或任务子会话）
2. `TerminalStream`：会话中的输出流（stdout/stderr/system）
3. `InteractionEvent`：结构化事件（question/approval/info/command/result）
4. `TaskContext`：会话绑定任务上下文（featureId、phase、ownerRole）
5. `HumanRoutingTicket`：需要人工响应的路由单（未来对接沟通系统）
6. `ApprovalDecision`：审批决定与意见快照

### M2. 事件协议（前后端统一）

推荐事件类型：

- `terminal.command.submitted`
- `terminal.output.appended`
- `terminal.command.finished`
- `interaction.question.raised`
- `interaction.question.answered`
- `interaction.approval.requested`
- `interaction.approval.decided`
- `interaction.human.routing.created`
- `session.child.spawned`
- `session.child.closed`

统一 Envelope：

```json
{
  "eventId": "evt_xxx",
  "eventType": "interaction.question.raised",
  "sessionId": "sess_pm_001",
  "featureId": "inital-p5d-014",
  "timestamp": "2026-03-15T12:00:00.000Z",
  "actor": { "type": "agent", "id": "claude-cli" },
  "payload": {}
}
```

### M3. 交互判定规则

前端根据事件类型而不是字符串猜测来弹卡：

- `interaction.question.raised` → Enhanced Q&A Card
- `interaction.approval.requested` → Enhanced Approval Card
- `interaction.human.routing.created` → 显示“已分派给某人”状态

---

## A 阶段（Architecture）— 技术架构与系统边界

### A1. 推荐总体架构

```text
Frontend Terminal UI
   │ (HTTP + WS)
Gateway API (Next.js Route Handlers)
   │
Session Orchestrator (Node service)
   ├─ Claude CLI Runner (pty/child_process)
   ├─ Event Normalizer
   ├─ Policy Guard (审批/提问规则)
   └─ Router Adapter (Slack/Feishu/Teams)
   │
Persistence
   ├─ session_store
   ├─ event_store
   └─ artifact_store
```

### A2. PM 主终端与并行子终端

会话拓扑：

- `pm-main-session`（主编排）
  - `child-session-{featureId}`（每个并行任务一个子终端）

主终端职责：

1. 展示全局编排状态（运行中、待答复、待审批、阻塞）
2. 能 drill-down 到任意子终端
3. 聚合所有高优先级事件（question/approval/error）

子终端职责：

1. 承载单任务 CLI 输入输出
2. 绑定单一 `featureId`
3. 保留完整事件流水与快照

### A3. 持久化设计（最小可行）

建议最小表结构：

- `terminal_sessions`
  - id, parent_session_id, session_type(pm_main|task_child), feature_id, status, created_at, closed_at
- `terminal_events`
  - id, session_id, event_type, stream_type, payload_json, seq_no, created_at
- `interaction_tickets`
  - id, session_id, ticket_type(question|approval), assignee, status, due_at, resolved_at

关键设计：

- 事件按 `session_id + seq_no` 追加写入，保证回放顺序
- UI 断线重连后按 `last_seq_no` 增量拉取
- 每次审批/问答动作必须写审计事件

### A4. Claude CLI 接入策略

运行方式建议：

1. 后端通过 `pty`/`child_process` 启动 CLI（不要直接在浏览器执行）
2. stdout/stderr 行级采集并转 `terminal.output.appended`
3. CLI 退出码和结束时间转 `terminal.command.finished`
4. 注入 `sessionId/featureId` 到执行上下文，保证可追踪

---

## C 阶段（Construction）— 实施路径与任务拆解

## C1. 里程碑

### Milestone 1：单会话可用（1-2 周）

- 前端 Terminal 输入框 + 输出流实时显示
- 后端 CLI Runner 可执行命令并回传
- 事件持久化与页面回放

验收：

- 可输入命令并看到返回
- 刷新页面后可恢复历史输出

### Milestone 2：结构化交互事件（1 周）

- 引入 question/approval 事件协议
- 自动弹出 Enhanced Q&A Card / Enhanced Approval Card
- 审批与回答动作写入事件流

验收：

- 能稳定触发弹卡
- 卡片交互结果可审计追踪

### Milestone 3：PM 主终端 + 并行任务终端（1-2 周）

- 主从会话拓扑
- 子终端列表与状态聚合
- 跨终端统一检索与过滤

验收：

- 同时运行 3+ 子任务终端
- PM 视图能看到每个子任务关键事件

### Milestone 4：沟通系统适配层（1 周）

- HumanRoutingTicket
- Slack/飞书/Teams Adapter 抽象
- 人工答复回流事件

验收：

- 能将问题分派到指定人
- 回答可回写到原 session

## C2. 前后端任务分工

前端：

1. Terminal Workspace（主终端 + 子终端标签/树）
2. Enhanced Q&A Card 容器与状态机
3. Enhanced Approval Card 容器与状态机
4. 时间线回放、过滤、全文检索

后端：

1. CLI Runner 服务
2. Session/Event API + WebSocket 推送
3. 事件协议标准化与版本管理
4. 沟通系统适配器接口

---

## 3. API 草案（V1）

### 3.1 Session API

- `POST /api/terminal/sessions`
- `POST /api/terminal/sessions/{id}/commands`
- `GET /api/terminal/sessions/{id}/events?afterSeq=123`
- `POST /api/terminal/sessions/{id}/close`

### 3.2 Interaction API

- `POST /api/interactions/question/{eventId}/answer`
- `POST /api/interactions/approval/{eventId}/approve`
- `POST /api/interactions/approval/{eventId}/reject`
- `POST /api/interactions/{eventId}/route-human`

### 3.3 WebSocket Topic

- `terminal.session.{sessionId}`
- `terminal.pm.{pmSessionId}.children`
- `interaction.pending`

---

## 4. 风险与治理

## R1. 安全风险

- 任意 CLI 执行风险：必须白名单命令或策略网关
- 凭据泄露风险：输出脱敏（token/key/url）
- 多租户隔离：session 与 project 强绑定

## R2. 工程风险

- 输出量过大导致前端卡顿：虚拟列表 + 分页回放
- 并发会话丢消息：按 seq_no 重放机制
- 事件协议演进困难：`eventType@version` 机制

## R3. 组织风险

- 沟通系统接入后责任不清：ticket owner + SLA + escalations
- 审批链路过长：分级审批策略（critical 强审批、low 自动通过）

---

## 5. 你现在可以立刻推进的“必要阶段”

1. 锁定事件协议（M2）并在前后端共享类型
2. 先做 Milestone 1 + 2（单会话 + 弹卡）
3. 以 PM 主终端作为 Milestone 3 的入口容器
4. 沟通系统仅先做 Adapter Interface，不急着绑定单一平台

---

## 6. 对齐现有页面的落地映射

- `/terminal`：升级为 Terminal Workspace（主入口）
- `/qa`：抽出 Enhanced Q&A Card 组件并支持嵌入式弹层
- `/approval`：抽出 Enhanced Approval Card 组件并支持嵌入式弹层
- `/pm`：承载 PM 主终端聚合视图（子终端状态、待处理事件、阻塞清单）

---

## 7. 完成定义（DoD）

满足以下条件即认为本轮 IMAC-MAC 方案可进入开发：

1. 事件协议冻结并发布 v1
2. Session/Event 数据模型通过评审
3. PM 主终端与子终端信息架构通过评审
4. Q&A/Approval 弹卡触发规则可测试
5. 沟通系统适配接口已定义且与平台无耦合
