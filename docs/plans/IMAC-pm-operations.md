# IMAC PM Operations Guide

## Purpose

定义 IMAC 终端协同能力在 PM 维度的运行机制、SLA、RACI 与演练步骤。

## Operating Model

1. PM 通过主终端查看并行子终端状态
2. 对 pending question/approval 做优先级分发
3. 对需要人工答复的问题创建 routing ticket
4. 每日同步阻塞项与升级路径

## SLA

- Question first response: 30 minutes
- Approval decision: 60 minutes
- Human routing assignment: 15 minutes
- Critical incident escalation: 10 minutes

## RACI

- PM：Responsible for triage and escalation
- Frontend Dev：Responsible for UI/interaction fixes
- Backend Dev：Responsible for API/event pipeline fixes
- QA：Responsible for regression and release quality gates
- DevOps：Responsible for deployment reliability

## Daily Checklist

1. 检查 active child sessions 与 blocked tasks
2. 检查 pending approvals 是否超时
3. 检查 routed tickets 是否有 owner
4. 导出日志快照用于复盘

## Drill Script

1. 创建并行 3 个子终端会话
2. 触发 1 个 question + 1 个 approval + 1 个 route-human
3. 完成响应闭环并验证事件回写顺序
4. 记录问题并更新改进项
