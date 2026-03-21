# UI Specification: PM Dashboard Components

## Overview

Project management and team dashboard with charts, tables, and team management interfaces.

## Design File

- `pm-team-dashboard.png`

## shadcn/ui Components

### Data Display

| Component     | Usage                   | Customization |
| ------------- | ----------------------- | ------------- |
| `Table`       | Task tables, team lists | -             |
| `TableHeader` | Table header            | -             |
| `TableBody`   | Table body              | -             |
| `TableRow`    | Table row               | -             |
| `TableHead`   | Column header           | -             |
| `TableCell`   | Cell content            | -             |
| `Card`        | Stat cards, panels      | -             |
| `CardHeader`  | Card headers            | -             |
| `CardContent` | Card body               | -             |
| `CardFooter`  | Card footer             | -             |
| `Badge`       | Status badges           | Custom colors |
| `Avatar`      | User avatars            | -             |
| `AvatarGroup` | Multiple avatars        | -             |
| `Progress`    | Progress bars           | Gradient      |

### Charts (Using Recharts or similar)

| Component   | Usage                 |
| ----------- | --------------------- |
| `BarChart`  | Task completion stats |
| `LineChart` | Progress over time    |
| `PieChart`  | Status distribution   |
| `AreaChart` | Velocity trends       |

### Navigation

| Component    | Usage              |
| ------------ | ------------------ |
| `Tabs`       | Dashboard sections |
| `Breadcrumb` | Navigation path    |
| `Pagination` | Table pagination   |

### Interactive

| Component      | Usage          |
| -------------- | -------------- |
| `Button`       | Action buttons |
| `DropdownMenu` | Row actions    |
| `Checkbox`     | Bulk selection |
| `Select`       | Filters        |

---

## Component Specifications

### Stat Cards

```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-[#A1A1AA]">
        Total Tasks
      </CardTitle>
      <ClipboardList className="h-4 w-4 text-[#71717A]" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">124</div>
      <p className="text-xs text-[#10B981]">+12 this week</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-[#A1A1AA]">
        In Progress
      </Title>
      <Clock className="h-4 w-4 text-[#3B82F6]" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">18</div>
      <p className="text-xs text-[#3B82F6]">32% of total</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-[#A1A1AA]">
        Completed
      </CardTitle>
      <CheckCircle className="h-4 w-4 text-[#10B981]" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">89</div>
      <p className="text-xs text-[#10B981]">+8 this week</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-[#A1A1AA]">
        Blocked
      </CardTitle>
      <AlertCircle className="h-4 w-4 text-[#EF4444]" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">3</div>
      <p className="text-xs text-[#EF4444]">Needs attention</p>
    </CardContent>
  </Card>
</div>
```

### Task Table

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Tasks</CardTitle>
      <div className="flex gap-2">
        <Select defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow className="border-[#334155] hover:bg-transparent">
          <TableHead className="w-[50px]">
            <Checkbox />
          </TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id} className="border-[#334155]">
            <TableCell>
              <Checkbox checked={task.selected} />
            </TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-[#71717A]">{task.id}</p>
              </div>
            </TableCell>
            <TableCell>
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar} />
                <AvatarFallback>{task.assignee.initials}</AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell>
              <Badge className={statusColors[task.status]}>{task.status}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
            </TableCell>
            <TableCell className="text-[#A1A1AA]">{task.dueDate}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Assign</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### Team Members

```tsx
<div className="flex items-center justify-between py-3">
  <div className="flex items-center gap-3">
    <Avatar>
      <AvatarImage src={member.avatar} />
      <AvatarFallback>{member.initials}</AvatarFallback>
    </Avatar>
    <div>
      <p className="font-medium">{member.name}</p>
      <p className="text-sm text-[#71717A]">{member.role}</p>
    </div>
  </div>
  <AvatarGroup max={3}>
    {member.tasks.map((task) => (
      <Avatar key={task.id} className="h-6 w-6 border-0">
        <AvatarImage src={task.assignee.avatar} />
      </Avatar>
    ))}
  </AvatarGroup>
</div>
```

### Progress by Phase Chart

```tsx
<Card>
  <CardHeader>
    <CardTitle>Progress by Phase</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {phases.map((phase) => (
        <div key={phase.name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A1A1AA]">{phase.name}</span>
            <span className="text-white">
              {phase.completed}/{phase.total}
            </span>
          </div>
          <Progress value={(phase.completed / phase.total) * 100} className="h-2 bg-white/10" />
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Status Badge Colors

```tsx
const statusColors = {
  pending: "bg-gray-500/15 text-gray-400 border-gray-500",
  in_progress: "bg-blue-500/15 text-blue-500 border-blue-500",
  completed: "bg-green-500/15 text-green-500 border-green-500",
  blocked: "bg-red-500/15 text-red-500 border-red-500",
};

const priorityColors = {
  low: "border-l-2 border-l-green-500",
  medium: "border-l-2 border-l-amber-500",
  high: "border-l-2 border-l-red-500",
};
```

---

## Dashboard Sections

### Overview Stats

- Total tasks count
- In progress count
- Completed count
- Blocked count
- Velocity (tasks/week)

### Progress Charts

- Tasks by phase (bar chart)
- Completion trend (line chart)
- Status distribution (pie chart)

### Task Table

- Sortable columns
- Filterable by status
- Bulk actions
- Pagination

### Team

- Member list
- Tasks per member
- Workload distribution

---

## Styling Tokens

### From DESIGN.md

| Token                | Value   |
| -------------------- | ------- |
| `--bg-card`          | #1A1A1A |
| `--accent-primary`   | #3B82F6 |
| `--accent-secondary` | #8B5CF6 |
| `--accent-success`   | #10B981 |
| `--accent-warning`   | #F59E0B |
| `--accent-error`     | #EF4444 |
| `--text-primary`     | #FFFFFF |
| `--text-secondary`   | #A1A1AA |
| `--text-muted`       | #71717A |
| `--border-default`   | #334155 |

---

## Acceptance Criteria

- [ ] Stat cards display with correct icons and colors
- [ ] Task table renders with all columns
- [ ] Status badges use correct semantic colors
- [ ] Table sorting works
- [ ] Table filtering by status works
- [ ] Bulk selection works
- [ ] Dropdown menu shows row actions
- [ ] Pagination controls work
- [ ] Charts display with gradient colors
- [ ] Team members show with avatars
- [ ] Responsive layout on smaller screens
