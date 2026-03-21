# UI Specification: Execution Monitor

## Overview

Phase 5-7 real-time terminal output and task execution monitoring with syntax highlighting.

## Design File

- `execution-monitor-v2.png`

## shadcn/ui Components

### Terminal Components

| Component    | Usage                  | Customization       |
| ------------ | ---------------------- | ------------------- |
| `ScrollArea` | Terminal output scroll | Custom scrollbar    |
| `Pre`        | Code/terminal block    | Monospace font      |
| `Code`       | Inline code            | Syntax highlighting |

### Status Components

| Component  | Usage              |
| ---------- | ------------------ |
| `Badge`    | Status indicators  |
| `Progress` | Progress bars      |
| `Spinner`  | Loading indicators |
| `Skeleton` | Loading states     |

### Interactive Components

| Component     | Usage                       |
| ------------- | --------------------------- |
| `Button`      | Action buttons              |
| `Tabs`        | Output tabs (stdout/stderr) |
| `ToggleGroup` | Output filters              |
| `Select`      | Log level filter            |
| `Input`       | Search in logs              |

### Layout Components

| Component        | Usage              |
| ---------------- | ------------------ |
| `Card`           | Terminal container |
| `ResizablePanel` | Resizable panels   |
| `ScrollArea`     | Scrollable logs    |

---

## Component Specifications

### Terminal Container

```tsx
<Card className="bg-[#0A0A0A] border-[#334155] font-mono">
  <CardHeader className="border-b border-[#334155]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-sm text-[#A1A1AA] ml-2">terminal</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant} className="font-mono">
          {status}
        </Badge>
        <Button variant="ghost" size="icon">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-0">
    <Tabs defaultValue="stdout" className="w-full">
      <TabsList className="bg-transparent border-b border-[#334155] rounded-none px-4">
        <TabsTrigger value="stdout" className="data-[state=active]:bg-transparent">
          stdout
        </TabsTrigger>
        <TabsTrigger value="stderr" className="data-[state=active]:bg-transparent">
          stderr
        </TabsTrigger>
        <TabsTrigger value="system" className="data-[state=active]:bg-transparent">
          system
        </TabsTrigger>
      </TabsList>

      <TabsContent value="stdout">
        <ScrollArea className="h-[400px]">
          <Pre className="bg-transparent border-0 p-4 text-sm">
            <code>
              {output.map((line, i) => (
                <div key={i} className="flex">
                  <span className="text-[#52525B] w-10 text-right mr-4 select-none">{i + 1}</span>
                  <span className={getLineColor(line)}>{line}</span>
                </div>
              ))}
            </code>
          </Pre>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

### Syntax Highlighting

```tsx
// Color mapping for different log types
const syntaxColors = {
  // Strings - Green
  string: "text-[#10B981]",
  // Numbers - Amber
  number: "text-[#F59E0B]",
  // Keywords - Purple
  keyword: "text-[#8B5CF6]",
  // Functions - Blue
  function: "text-[#3B82F6]",
  // Comments - Gray
  comment: "text-[#71717A] italic",
  // Errors - Red
  error: "text-[#EF4444]",
  // Warnings - Orange
  warning: "text-[#F97316]",
  // Info - Cyan
  info: "text-[#06B6D4]",
  // Timestamps - Muted
  timestamp: "text-[#52525B]",
  // Default - White
  default: "text-[#FFFFFF]",
};

// Apply to log line
const getLineColor = (line: string) => {
  if (line.startsWith("ERROR")) return syntaxColors.error;
  if (line.startsWith("WARN")) return syntaxColors.warning;
  if (line.startsWith("INFO")) return syntaxColors.info;
  if (line.match(/^\d{4}-\d{2}-\d{2}/)) return syntaxColors.timestamp;
  if (line.match(/".*"/)) return syntaxColors.string;
  return syntaxColors.default;
};
```

### Progress Section

```tsx
<div className="space-y-4 p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Spinner className="h-4 w-4" />
      <span className="text-sm text-[#A1A1AA]">Executing...</span>
    </div>
    <span className="text-sm text-[#3B82F6]">{progress}%</span>
  </div>

  <Progress
    value={progress}
    className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#8B5CF6] [&>div]:to-[#3B82F6]"
  />

  <div className="flex gap-4 text-xs text-[#71717A]">
    <span>Elapsed: {elapsedTime}</span>
    <span>ETA: {eta}</span>
    <span>Memory: {memoryUsage}</span>
  </div>
</div>
```

### Log Filters

```tsx
<div className="flex items-center gap-2 p-4 border-b border-[#334155]">
  <Select defaultValue="all">
    <SelectTrigger className="w-[150px] bg-[#0A0A0A] border-[#334155]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Levels</SelectItem>
      <SelectItem value="error">Errors</SelectItem>
      <SelectItem value="warning">Warnings</SelectItem>
      <SelectItem value="info">Info</SelectItem>
      <SelectItem value="debug">Debug</SelectItem>
    </SelectContent>
  </Select>

  <Input
    placeholder="Search logs..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="flex-1 bg-[#0A0A0A] border-[#334155]"
  />

  <Button variant="outline" size="icon">
    <Download className="h-4 w-4" />
  </Button>

  <Button variant="outline" size="icon">
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

### Task List

```tsx
<div className="space-y-2">
  {tasks.map((task) => (
    <div
      key={task.id}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        task.status === "running" && "border-[#3B82F6] bg-[#3B82F6]/5",
        task.status === "completed" && "border-[#10B981] bg-[#10B981]/5",
        task.status === "failed" && "border-[#EF4444] bg-[#EF4444]/5",
        task.status === "pending" && "border-[#334155] bg-transparent"
      )}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          task.status === "running" && "bg-[#3B82F6] animate-pulse",
          task.status === "completed" && "bg-[#10B981]",
          task.status === "failed" && "bg-[#EF4444]",
          task.status === "pending" && "bg-[#334155]"
        )}
      />
      <span className="flex-1 text-sm">{task.name}</span>
      <Badge variant="outline" className="font-mono text-xs">
        {task.duration}
      </Badge>
    </div>
  ))}
</div>
```

---

## Content Type Styling

| Type    | Background              | Text Color |
| ------- | ----------------------- | ---------- |
| stdout  | transparent             | #FFFFFF    |
| stderr  | rgba(239, 68, 68, 0.1)  | #EF4444    |
| system  | rgba(6, 182, 212, 0.1)  | #06B6D4    |
| success | rgba(16, 185, 129, 0.1) | #10B981    |
| command | rgba(139, 92, 246, 0.1) | #8B5CF6    |

---

## Styling Tokens

### From DESIGN.md

| Token                | Value          |
| -------------------- | -------------- |
| `--bg-primary`       | #0A0A0A        |
| `--bg-card`          | #1A1A1A        |
| `--accent-primary`   | #3B82F6        |
| `--accent-secondary` | #8B5CF6        |
| `--accent-success`   | #10B981        |
| `--accent-error`     | #EF4444        |
| `--accent-warning`   | #F59E0B        |
| `--accent-info`      | #06B6D4        |
| `--text-primary`     | #FFFFFF        |
| `--text-secondary`   | #A1A1AA        |
| `--text-muted`       | #71717A        |
| `--text-tertiary`    | #52525B        |
| `--border-default`   | #334155        |
| `--font-mono`        | JetBrains Mono |

---

## Acceptance Criteria

- [ ] Terminal displays with dark background (#0A0A0A)
- [ ] Line numbers display correctly
- [ ] Syntax highlighting applies to log types
- [ ] Tabs switch between stdout/stderr/system
- [ ] Log filtering by level works
- [ ] Search in logs highlights matches
- [ ] Progress bar shows gradient fill
- [ ] Task list shows status with colored indicators
- [ ] Copy button copies terminal content
- [ ] Auto-scroll follows new output
- [ ] Manual scroll disables auto-scroll
