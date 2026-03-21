# UI Component Specifications Index

> Comprehensive shadcn/ui component mapping for Auto-Coding Framework Management Frontend

---

## Overview

This directory contains detailed UI specifications for each major page/component of the Auto-Coding Framework Management Frontend. Each specification maps design elements to shadcn/ui components with implementation code snippets.

---

## Specifications

| File                                                         | Page/Feature      | Description                            |
| ------------------------------------------------------------ | ----------------- | -------------------------------------- |
| [UI-SPEC-dashboard.md](UI-SPEC-dashboard.md)                 | Dashboard         | Project overview, cards, navigation    |
| [UI-SPEC-qa.md](UI-SPEC-qa.md)                               | Q&A Interface     | Question forms, answer types, progress |
| [UI-SPEC-approval.md](UI-SPEC-approval.md)                   | Approval Cards    | Design approval, comments, actions     |
| [UI-SPEC-execution-monitor.md](UI-SPEC-execution-monitor.md) | Execution Monitor | Terminal output, logs, status          |
| [UI-SPEC-settings.md](UI-SPEC-settings.md)                   | Settings Page     | User preferences, forms, toggles       |
| [UI-SPEC-pm-dashboard.md](UI-SPEC-pm-dashboard.md)           | PM Dashboard      | Stats, tables, charts, team            |
| [UI-SPEC-design-viewer.md](UI-SPEC-design-viewer.md)         | Design Viewer     | Image preview, annotations, zoom       |

---

## Design System Reference

All specifications reference the design tokens from [../.stitch/DESIGN.md](../.stitch/DESIGN.md):

### Color Palette

| Token                | Hex     | Usage                   |
| -------------------- | ------- | ----------------------- |
| `--bg-primary`       | #0A0A0A | Main background, inputs |
| `--bg-secondary`     | #121826 | Sidebar, panels         |
| `--bg-card`          | #1A1A1A | Card surfaces           |
| `--accent-primary`   | #3B82F6 | Primary actions, links  |
| `--accent-secondary` | #8B5CF6 | Gradients, highlights   |
| `--accent-success`   | #10B981 | Completed, success      |
| `--accent-warning`   | #F59E0B | In progress, warning    |
| `--accent-error`     | #EF4444 | Errors, blocked         |
| `--text-primary`     | #FFFFFF | Headlines               |
| `--text-secondary`   | #A1A1AA | Body text               |
| `--text-muted`       | #71717A | Hints, placeholders     |
| `--border-default`   | #334155 | Borders, dividers       |

### Typography

- **UI Font**: Inter
- **Code Font**: JetBrains Mono
- **Scale**: 12px, 14px, 16px, 18px, 24px

### Components Used

**Form**

- Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage
- Input, Textarea, Select, RadioGroup, Checkbox, Switch, Slider

**Layout**

- Card, CardHeader, CardContent, CardFooter
- Tabs, TabList, TabTrigger, TabContent
- Accordion, AccordionItem
- ScrollArea, Separator

**Display**

- Badge, Avatar, AvatarGroup
- Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- Progress, Skeleton

**Actions**

- Button (default, outline, ghost, destructive)
- DropdownMenu, DropdownMenuTrigger, DropdownMenuContent
- Toggle, ToggleGroup
- Toast, AlertDialog

---

## Common Patterns

### Dark Theme Card

```tsx
<Card className="bg-[#1A1A1A] border-[#334155]">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Dark Theme Input

```tsx
<Input className="bg-[#0A0A0A] border-[#334155] focus:border-[#3B82F6]" />
```

### Gradient Button

```tsx
<Button className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]">Action</Button>
```

### Status Badge

```tsx
<Badge className="bg-[color]/15 text-[color] border-[color]">Status</Badge>
```

### Progress Bar Gradient

```tsx
<Progress className="h-1 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#8B5CF6] [&>div]:to-[#3B82F6]" />
```

---

## Implementation Notes

1. All components use Tailwind CSS with custom colors from DESIGN.md
2. Form components wrap with React Hook Form
3. Dark theme is default (no light mode support yet)
4. All interactive elements have visible focus states
5. Accessibility: ARIA labels, keyboard navigation

---

## Next Steps

After implementation:

1. Run `npx shadcn@latest init` to set up project
2. Add required components via `npx shadcn@latest add [component]`
3. Implement each UI-SPEC file
4. Test responsive behavior
5. Verify accessibility

---

**Last Updated**: 2026-03-14
**Version**: 1.0
