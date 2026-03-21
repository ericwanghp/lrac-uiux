**语言切换:** [English](README.md) | [中文](README.zh.md)

# LRAC UIUX 控制台

> 面向 LRAC 长周期交付框架的 UI/UX 优先操作台。

这个仓库不是通用展示站点，而是 LRAC 的产品化界面层，用于：
- 可视化项目状态，
- 操作化阶段流程，
- 可追溯协作过程。

## 项目定位

LRAC 有两个核心：
- **框架核心**：规则、阶段、任务、记忆、治理
- **UIUX 核心（本仓库）**：信息架构、交互流程、运营页面

本项目重点在第二个核心。

## 这个 UIUX 产品解决什么问题

在长周期 AI 交付中，常见问题是：
- 状态分散在文件和聊天记录中
- PM / QA / 工程视角割裂
- 审批、阻塞、终端动作难审计
- 跨项目导航弱

本控制台将这些问题产品化为统一体验：
- **Dashboard 优先可见性**
- **角色导向页面**
- **基于 `.auto-coding` 的持久运行态**
- **可操作的 PM / QA / Terminal / Approval 工作流 API**

## 核心体验

### 1）Dashboard 作为任务总控台
- 阶段进度、完成率、阻塞状态、分支上下文
- 项目切换器（全局项目上下文）
- 从 tasks/progress/session 数据提取的项目记忆快照

### 2）PM / 交付运营视图
- `/pm`：项目交付总览与执行协同
- `/approval`：决策队列与人机审批流程
- `/terminal`：命令/会话时间线，追踪运行时执行

### 3）工程轨道页面
- `/requirements`
- `/design`
- `/architecture`
- `/development`
- `/testing`
- `/deployment`
- `/qa`
- `/settings`

这些页面把 LRAC 阶段模型落成可操作工作流，而不只是静态文档。

### 4）运行态驱动 API 层
代表性 API 路由：
- `/api/tasks`
- `/api/progress`
- `/api/features`
- `/api/approvals`
- `/api/qa/sessions`
- `/api/terminal/sessions`
- `/api/markdown`
- `/api/design-assets`

它们把界面交互与项目状态持久化文件连接起来。

## 技术栈

- **Next.js 14**（App Router）
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui 风格组件模式**
- `.auto-coding` 文件系统持久化

## 快速开始

```bash
npm install
npm run dev
```

打开：
- `http://localhost:3000/dashboard`
- `http://localhost:3000/pm`

### 质量校验命令

```bash
npm run lint
npm run typecheck
```

## 仓库结构

```text
app/                   # 路由页面 + API 路由
components/            # 通用与页面级 UI 组件
lib/                   # 领域逻辑、文件操作、校验、类型
docs/                  # 产品/设计/框架文档
.auto-coding/          # LRAC 持久项目记忆（运行态 + 配置）
.claude/               # Agents、命令与规则
```

## 项目上下文模型

该 UIUX 控制台支持多项目操作：
- 选中的项目根路径会被持久化为全局上下文
- 上下文在 dashboard 及其他页面/API 一致生效
- 运行态读写按当前激活项目根路径解析

## 这个仓库的价值

如果 LRAC 定义的是长周期 AI 交付“该怎么做”，这个仓库定义的是“人和 Agent 怎么真正把它跑起来”。

它是 LRAC 的 UIUX 操作层。

## 相关文档

- [README.md](README.md)
- [CLAUDE.md](CLAUDE.md)
- [AGENTS.md](AGENTS.md)
- [.claude/agents/AGENTS.md](.claude/agents/AGENTS.md)
