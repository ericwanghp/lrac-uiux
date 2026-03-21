# UI Specification: IMAC Terminal Orchestration

## Overview

IMAC ADD 的终端协同界面规范，覆盖 PM 主终端、并行任务子终端、Enhanced Q&A Card 与 Enhanced Approval Card 的嵌入式交互。

## Design Goals

1. 单屏完成「发命令 → 看输出 → 回答问题 → 做审批」
2. 并行任务不丢上下文，主终端可聚合风险与待处理项
3. 所有动作都能回放，且可追溯到 session/event

## Information Architecture

### A. PM Main Terminal（主视图）

- **左侧**：子终端列表（按优先级 + 状态排序）
- **中间**：主时间线（系统事件、聚合告警、路由状态）
- **右侧**：待处理交互队列（Q&A / Approval / Human Routing）

### B. Task Child Terminal（子视图）

- **顶部**：featureId、owner、phase、连接状态
- **中部**：终端输出区（stdout/stderr/system + diff）
- **底部**：CLI 输入框（支持快捷键执行）
- **浮层**：Enhanced Q&A Card / Enhanced Approval Card

## Component Mapping

| Region           | Component                                          | Notes |
| ---------------- | -------------------------------------------------- | ----- |
| Main Header      | `Card`, `Badge`, `Button`, `Select`               | 会话筛选与状态标识 |
| Session Tree     | `Card`, `ScrollArea`, `Badge`, `Button`           | 主从会话导航 |
| Timeline         | `Card`, `Tabs`, `Input`, `Badge`, `Separator`     | 过滤、检索、回放 |
| CLI Input        | `Input`, `Button`                                 | 回车执行，Ctrl/Cmd+Enter 强制执行 |
| Question Overlay | `Card`, `Textarea`, `RadioGroup`, `Checkbox`, `Button` | Enhanced Q&A |
| Approval Overlay | `Card`, `Textarea`, `Button`, `AlertDialog`       | Enhanced Approval |
| Routing Panel    | `Card`, `Select`, `Input`, `Badge`, `Button`      | 人工路由与 SLA |

## Interaction Rules

### Terminal Execution

1. 用户输入命令并提交
2. UI 立即追加 `command.submitted` 行
3. 输出逐行流式进入时间线
4. 命令结束后显示 exit code 与耗时

### Question Trigger

- 事件：`interaction.question.raised`
- 行为：在当前子终端弹出 Enhanced Q&A Card
- 提交：写入 `interaction.question.answered` 并关闭卡片

### Approval Trigger

- 事件：`interaction.approval.requested`
- 行为：在当前子终端弹出 Enhanced Approval Card
- 提交：写入 `interaction.approval.decided`

### PM Aggregation

- 子终端出现 `error / approval pending / question pending` 时，主终端新增高优先级聚合条目
- 主终端点击条目自动跳转对应子终端并定位事件

## States

### Session State

- `connecting`
- `live`
- `offline`
- `paused`

### Task State Badge

- `pending`
- `in_progress`
- `blocked`
- `completed`

### Card State

- `raised`
- `in_progress`
- `submitted`
- `resolved`

## Accessibility & Keyboard

- 主终端列表支持方向键选择与 Enter 打开
- CLI 输入框支持历史命令上下切换
- 所有卡片支持 Esc 关闭（未提交需二次确认）
- 色彩之外必须有文字状态，满足对比度要求

## Acceptance Checklist

- [ ] PM 主终端与子终端可切换
- [ ] 命令执行过程有实时反馈
- [ ] Q&A 卡片触发与提交闭环
- [ ] Approval 卡片触发与提交闭环
- [ ] 聚合告警可跳转定位
- [ ] 输出回放与搜索可用
