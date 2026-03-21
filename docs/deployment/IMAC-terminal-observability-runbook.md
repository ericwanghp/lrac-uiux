# IMAC Terminal Deployment & Observability Runbook

## Scope

覆盖 IMAC terminal orchestration 的部署、监控、告警与回滚流程。

## Deployment Checklist

1. 部署 API 路由：
   - `/api/terminal/sessions*`
   - `/api/interactions/*`
2. 确认 `.auto-coding/terminal-sessions/` 目录具备写权限
3. 配置运行参数：
   - command execution timeout
   - max session count
   - max events per session fetch

## Key Metrics

- `terminal.sessions.active.count`
- `terminal.commands.submitted.count`
- `terminal.commands.failed.count`
- `terminal.events.append.rate`
- `interaction.pending.question.count`
- `interaction.pending.approval.count`

## Alerts

- 高优先级：`terminal.commands.failed.count > threshold`
- 高优先级：`terminal.events.append.rate == 0` 且存在 active session
- 中优先级：`interaction.pending.approval.count` 超 SLA

## Rollback Strategy

1. 停止新命令提交入口
2. 切换 API 到前一版本
3. 保留现有 sessions.json 作为恢复依据
4. 执行健康检查：
   - `GET /api/terminal/sessions`
   - `GET /api/tasks`

## Post-Deployment Validation

1. 创建 session 成功
2. 提交命令后能看到 command submitted/output/finished 事件
3. Q&A/Approval/Route-human 接口可回写事件
4. PM 页面可看到主终端与子终端统计
