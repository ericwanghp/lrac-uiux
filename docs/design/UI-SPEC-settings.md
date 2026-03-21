# UI Specification: Settings Page

## Overview

User preferences and configuration page with form inputs, toggles, and settings sections.

## Design File

- `settings-page.png`

## shadcn/ui Components

### Form Components

| Component         | Usage                   | Customization   |
| ----------------- | ----------------------- | --------------- |
| `Form`            | React Hook Form wrapper | -               |
| `FormField`       | Individual form fields  | -               |
| `FormItem`        | Form field container    | -               |
| `FormLabel`       | Field labels            | -               |
| `FormControl`     | Input wrapper           | -               |
| `FormDescription` | Helper text             | -               |
| `FormMessage`     | Error messages          | -               |
| `Input`           | Text inputs             | Dark background |
| `InputOTP`        | OTP input               | -               |
| `Textarea`        | Textarea                | Dark background |
| `Select`          | Dropdown selections     | -               |
| `Slider`          | Range sliders           | Custom colors   |
| `Switch`          | Toggle switches         | Custom colors   |

### Layout Components

| Component    | Usage               |
| ------------ | ------------------- |
| `Accordion`  | Settings sections   |
| `Tabs`       | Settings categories |
| `Card`       | Settings groups     |
| `Separator`  | Section dividers    |
| `ScrollArea` | Scrollable areas    |

### Feedback Components

| Component | Usage              |
| --------- | ------------------ |
| `Toast`   | Save notifications |
| `Alert`   | Warnings/info      |
| `Button`  | Action buttons     |
| `Spinner` | Loading states     |

---

## Component Specifications

### Settings Layout

```tsx
<div className="flex gap-6">
  {/* Settings Navigation */}
  <Tabs defaultValue="general" orientation="vertical" className="w-64">
    <TabsList className="flex flex-col w-full bg-transparent h-auto">
      <TabsTrigger
        value="general"
        className="justify-start px-4 data-[state=active]:bg-[#3B82F6]/10 data-[state=active]:text-[#3B82F6]"
      >
        <Settings className="mr-2 h-4 w-4" />
        General
      </TabsTrigger>
      <TabsTrigger
        value="appearance"
        className="justify-start px-4 data-[state=active]:bg-[#3B82F6]/10"
      >
        <Palette className="mr-2 h-4 w-4" />
        Appearance
      </TabsTrigger>
      <TabsTrigger
        value="notifications"
        className="justify-start px-4 data-[state=active]:bg-[#3B82F6]/10"
      >
        <Bell className="mr-2 h-4 w-4" />
        Notifications
      </TabsTrigger>
      <TabsTrigger
        value="shortcuts"
        className="justify-start px-4 data-[state=active]:bg-[#3B82F6]/10"
      >
        <Keyboard className="mr-2 h-4 w-4" />
        Shortcuts
      </TabsTrigger>
      <TabsTrigger
        value="integrations"
        className="justify-start px-4 data-[state=active]:bg-[#3B82F6]/10"
      >
        <Plug className="mr-2 h-4 w-4" />
        Integrations
      </TabsTrigger>
    </TabsList>
  </Tabs>

  {/* Settings Content */}
  <div className="flex-1 space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Configure your general preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{/* Settings fields */}</CardContent>
    </Card>
  </div>
</div>
```

### Text Input Setting

```tsx
<FormField
  control={form.control}
  name="projectName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Project Name</FormLabel>
      <FormControl>
        <Input {...field} className="bg-[#0A0A0A] border-[#334155]" />
      </FormControl>
      <FormDescription>This name will be displayed in the dashboard</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Toggle Switch Setting

```tsx
<div className="flex items-center justify-between py-4">
  <div className="space-y-0.5">
    <Label>Auto-save</Label>
    <p className="text-sm text-[#A1A1AA]">Automatically save changes</p>
  </div>
  <Switch checked={settings.autoSave} onCheckedChange={setSettings} />
</div>
```

### Slider Setting

```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>Terminal Font Size</Label>
    <span className="text-sm text-[#3B82F6]">{fontSize}px</span>
  </div>
  <Slider
    value={[fontSize]}
    onValueChange={([value]) => setFontSize(value)}
    min={10}
    max={24}
    step={1}
    className="[&>.relative>span]:bg-gradient-to-r [&>.relative>span]:from-[#8B5CF6] [&>.relative>span]:to-[#3B82F6]"
  />
</div>
```

### Select Setting

```tsx
<FormField
  control={form.control}
  name="timezone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Timezone</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger className="bg-[#0A0A0A] border-[#334155]">
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="utc">UTC</SelectItem>
          <SelectItem value="local">Local Time</SelectItem>
          <SelectItem value="America/New_York">Eastern Time</SelectItem>
          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Danger Zone

```tsx
<Card className="border-red-500/20">
  <CardHeader>
    <CardTitle className="text-red-500">Danger Zone</CardTitle>
    <CardDescription>Irreversible actions - proceed with caution</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">Delete all data</p>
        <p className="text-sm text-[#A1A1AA]">Permanently delete all projects and settings</p>
      </div>
      <Button variant="destructive">Delete</Button>
    </div>
  </CardContent>
</Card>
```

### Keyboard Shortcuts

```tsx
<div className="space-y-2">
  {shortcuts.map((shortcut) => (
    <div key={shortcut.action} className="flex items-center justify-between py-2">
      <span className="text-sm">{shortcut.action}</span>
      <div className="flex gap-1">
        {shortcut.keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 text-xs font-mono bg-[#0A0A0A] border border-[#334155] rounded"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  ))}
</div>
```

---

## Settings Sections

### General

- Project name
- Default phase
- Auto-save interval
- Data directory

### Appearance

- Theme (dark only for now)
- Font size (slider)
- Compact mode toggle
- Show line numbers toggle

### Notifications

- Desktop notifications toggle
- Sound toggle
- Email notifications toggle
- Notification level (Select)

### Integrations

- GitHub connection
- VS Code connection
- API keys management

---

## Styling Tokens

### From DESIGN.md

| Token                | Value   |
| -------------------- | ------- |
| `--bg-card`          | #1A1A1A |
| `--bg-input`         | #0A0A0A |
| `--accent-primary`   | #3B82F6 |
| `--accent-secondary` | #8B5CF6 |
| `--accent-error`     | #EF4444 |
| `--text-primary`     | #FFFFFF |
| `--text-secondary`   | #A1A1AA |
| `--text-muted`       | #71717A |
| `--border-default`   | #334155 |

---

## Acceptance Criteria

- [ ] Settings navigation sidebar works
- [ ] All form inputs render with dark theme
- [ ] Toggle switches animate correctly
- [ ] Sliders show current value
- [ ] Select dropdowns open properly
- [ ] Save button shows toast notification
- [ ] Danger zone is visually distinct
- [ ] Keyboard shortcuts display correctly
- [ ] Form validation shows error states
- [ ] Loading states show spinners
