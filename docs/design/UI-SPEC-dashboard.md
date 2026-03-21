# UI Specification: Dashboard Components

## Overview

Main dashboard page with project overview, phase tracking, and navigation.

## Design File

- `dashboard.png`

## shadcn/ui Components

### Required Components

| Component        | Usage                           | Customization                                       |
| ---------------- | ------------------------------- | --------------------------------------------------- |
| `Card`           | Project cards, stat cards       | Dark background (#1A1A1A), gradient border on hover |
| `CardHeader`     | Card titles, project names      | -                                                   |
| `CardContent`    | Card body content               | -                                                   |
| `CardFooter`     | Card actions, timestamps        | -                                                   |
| `Button`         | Primary/secondary actions       | Gradient variant (blue→purple)                      |
| `Avatar`         | User avatars                    | -                                                   |
| `AvatarImage`    | Avatar picture                  | -                                                   |
| `AvatarFallback` | Initials fallback               | -                                                   |
| `Badge`          | Status badges, phase indicators | Custom semantic colors                              |
| `Progress`       | Progress bars                   | Gradient fill (purple→blue)                         |
| `Input`          | Search input                    | Dark background (#0A0A0A)                           |
| `ScrollArea`     | Scrollable content areas        | -                                                   |
| `Separator`      | Section dividers                | -                                                   |

### Navigation Components

| Component          | Usage                       |
| ------------------ | --------------------------- |
| `NavigationMenu`   | Main sidebar navigation     |
| `Sidebar` (custom) | Left sidebar with nav items |
| `Command`          | Global search (Cmd+K)       |

### Data Display

| Component  | Usage                      |
| ---------- | -------------------------- |
| `Table`    | Feature lists, task tables |
| `Skeleton` | Loading states             |

---

## Component Specifications

### Project Card

```tsx
// Card with hover gradient border
<Card className="hover:border-[#3B82F6] transition-all duration-200">
  <CardHeader>
    <div className="flex justify-between items-start">
      <CardTitle>{projectName}</CardTitle>
      <Badge variant={statusVariant}>{status}</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-[#A1A1AA]">{description}</p>
    <Progress value={progress} className="mt-4" />
    <p className="text-xs text-[#71717A] mt-2">Phase {currentPhase}</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">
      Open
    </Button>
  </CardFooter>
</Card>
```

### Status Badge Variants

```tsx
// Success (completed)
<Badge className="bg-green-500/15 text-green-500 border-green-500">Completed</Badge>

// Warning (in progress)
<Badge className="bg-amber-500/15 text-amber-500 border-amber-500">In Progress</Badge>

// Error (blocked)
<Badge className="bg-red-500/15 text-red-500 border-red-500">Blocked</Badge>

// Info (pending)
<Badge className="bg-blue-500/15 text-blue-500 border-blue-500">Pending</Badge>
```

### Progress Bar

```tsx
<Progress
  value={65}
  className="h-1 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#8B5CF6] [&>div]:to-[#3B82F6]"
/>
```

---

## Styling Tokens

### From DESIGN.md

| Token                | Value   |
| -------------------- | ------- |
| `--bg-card`          | #1A1A1A |
| `--bg-input`         | #0A0A0A |
| `--accent-primary`   | #3B82F6 |
| `--accent-secondary` | #8B5CF6 |
| `--text-primary`     | #FFFFFF |
| `--text-secondary`   | #A1A1AA |
| `--text-muted`       | #71717A |
| `--border-default`   | #334155 |

---

## Acceptance Criteria

- [ ] Project cards display with dark theme
- [ ] Status badges use semantic colors
- [ ] Progress bars show gradient fill
- [ ] Hover states show blue border
- [ ] Navigation sidebar is functional
- [ ] Global search (Cmd+K) works
- [ ] Responsive layout on tablet/mobile
