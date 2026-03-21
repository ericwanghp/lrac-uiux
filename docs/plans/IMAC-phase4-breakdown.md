# IMAC Phase 4 Breakdown: CLI Terminal Orchestration

## 1. 目标

将 IMAC ADD 的 PRD/设计/架构成果拆解为可执行开发任务，形成从 Phase 5 到 Phase 8 的实施路径、依赖关系与验收标准。

## 2. 拆解原则

1. 每个任务单一目标，可独立验收
2. 先打通主干链路，再补增强能力
3. 前后端任务并行但通过接口契约解耦
4. 所有关键节点可通过 session/event 回放验证

## 3. WBS（按阶段）

## Phase 5 - Development

### P5-Core

- `p5d-001` Terminal Session/Event API
- `p5d-002` Claude CLI Runner
- `p5d-003` Frontend Terminal Workspace

### P5-Interaction

- `p5d-004` Enhanced Q&A Card 事件接入
- `p5d-005` Enhanced Approval Card 事件接入

### P5-Orchestration

- `p5d-006` PM 主终端 + 并行子终端
- `p5d-007` Human Routing Adapter Interface

## Phase 6 - Testing

- `p6t-001` E2E 与稳定性验证（并行终端、事件顺序、断线回放）

## Phase 7 - Deployment

- `p7d-001` 可观测性上线（日志、指标、告警）与回滚方案

## Phase 8 - Project Management

- `p8m-001` 运行手册、SLA、RACI、跨角色演练

## 4. 依赖图

```text
p2p -> (p25d, p3a) -> p4b
p4b -> p5d-001 -> (p5d-002, p5d-003)
p5d-003 -> (p5d-004, p5d-005)
(p5d-002 + p5d-004 + p5d-005) -> p5d-006 -> p5d-007 -> p6t-001 -> p7d-001 -> p8m-001
```

## 5. 交付件映射

| Task | Deliverable |
| ---- | ----------- |
| p5d-001 | `/api/terminal/sessions*` 与 `/api/interactions*` 基础接口 |
| p5d-002 | CLI runner 服务与执行生命周期事件 |
| p5d-003 | 前端终端输入/输出/回放/过滤 |
| p5d-004 | Q&A 卡片弹出与回答回写 |
| p5d-005 | Approval 卡片弹出与决策回写 |
| p5d-006 | PM 主终端聚合 + 子终端钻取 |
| p5d-007 | 人工路由适配接口与 ticket 模型 |
| p6t-001 | E2E 用例与稳定性报告 |
| p7d-001 | 部署清单与监控告警配置 |
| p8m-001 | 操作手册与 PM 运行机制 |

## 6. 风险与缓解

1. **命令执行安全风险**：引入命令策略网关（allowlist/denylist）
2. **高频输出性能风险**：虚拟滚动 + 分页回放 + 增量拉取
3. **并发丢事件风险**：`session_id + seq_no` 强顺序与补拉机制
4. **沟通平台耦合风险**：先实现统一 Adapter 接口

## 7. 完成标准（Phase 4 DoD）

- [x] Phase 5-8 任务拆解完成并写入 tasks.json
- [x] 任务依赖关系清晰且无循环
- [x] 每个任务定义 ownerRole 与 acceptanceCriteria
- [x] 与 PRD/设计/架构文档保持一致
