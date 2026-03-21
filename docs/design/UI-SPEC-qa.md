# UI Specification: Q&A Components

## Overview

Phase 1-2 interactive requirement collection interface with question cards and answer forms.

## Design Files

- `qa-interface.png`
- `enhanced-qa-card.png`
- `qa-question-card.png`

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
| `Textarea`        | Long text answers       | Dark background |
| `Select`          | Dropdown selections     | -               |
| `RadioGroup`      | Single choice questions | -               |
| `Checkbox`        | Multi-choice questions  | -               |
| `Switch`          | Toggle options          | Custom colors   |

### Interactive Components

| Component     | Usage                        |
| ------------- | ---------------------------- |
| `Accordion`   | Expandable question sections |
| `Collapsible` | Collapsible content          |
| `Dialog`      | Modal for detailed views     |
| `Popover`     | Additional info popups       |
| `Tooltip`     | Help text tooltips           |

### Feedback Components

| Component     | Usage                       |
| ------------- | --------------------------- |
| `Toast`       | Success/error notifications |
| `Alert`       | Inline alerts               |
| `AlertDialog` | Confirmation dialogs        |
| `Skeleton`    | Loading states              |

---

## Component Specifications

### Question Card

```tsx
<Card className="border-l-4 border-l-[#3B82F6]">
  <CardHeader>
    <div className="flex items-center gap-2">
      <Badge variant="outline">Q{questionNumber}</Badge>
      <CardTitle className="text-base">{question}</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    <FormField
      control={form.control}
      name={`question-${id}`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Textarea
              {...field}
              placeholder="Enter your answer..."
              className="bg-[#0A0A0A] border-[#334155]"
            />
          </FormControl>
          <FormDescription>{helpText}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </CardContent>
</Card>
```

### Answer Types

#### Text Answer

```tsx
<Textarea
  placeholder="Describe your requirements..."
  className="min-h-[120px] bg-[#0A0A0A] border-[#334155] focus:border-[#3B82F6]"
/>
```

#### Single Choice (Radio)

```tsx
<RadioGroup onValueChange={field.onChange} className="flex flex-col gap-3">
  {options.map((option) => (
    <div key={option.value} className="flex items-center space-x-2">
      <RadioGroupItem value={option.value} id={option.value} />
      <Label htmlFor={option.value}>{option.label}</Label>
    </div>
  ))}
</RadioGroup>
```

#### Multi Choice (Checkbox)

```tsx
<div className="flex flex-col gap-3">
  {options.map((option) => (
    <div key={option.value} className="flex items-center space-x-2">
      <Checkbox
        id={option.value}
        checked={field.value?.includes(option.value)}
        onCheckedChange={(checked) => {
          return checked
            ? field.onChange([...field.value, option.value])
            : field.onChange(field.value?.filter((value) => value !== option.value));
        }}
      />
      <Label htmlFor={option.value}>{option.label}</Label>
    </div>
  ))}
</div>
```

#### Yes/No Toggle

```tsx
<Switch checked={field.value} onCheckedChange={field.onChange} />
```

### Progress Indicator

```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-[#A1A1AA]">Progress</span>
    <span className="text-[#3B82F6]">
      {answered}/{total} questions
    </span>
  </div>
  <Progress
    value={(answered / total) * 100}
    className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#8B5CF6] [&>div]:to-[#3B82F6]"
  />
</div>
```

---

## Question Card States

| State    | Visual Treatment                        |
| -------- | --------------------------------------- |
| Default  | Gray left border (#334155)              |
| Focused  | Blue left border (#3B82F6), subtle glow |
| Answered | Green checkmark indicator               |
| Skipped  | Amber indicator                         |
| Error    | Red border, error message               |

---

## Styling Tokens

### From DESIGN.md

| Token              | Value   |
| ------------------ | ------- |
| `--bg-card`        | #1A1A1A |
| `--bg-input`       | #0A0A0A |
| `--accent-primary` | #3B82F6 |
| `--accent-success` | #10B981 |
| `--accent-warning` | #F59E0B |
| `--accent-error`   | #EF4444 |
| `--text-primary`   | #FFFFFF |
| `--text-secondary` | #A1A1AA |
| `--border-default` | #334155 |

---

## Acceptance Criteria

- [ ] Questions display with number badges
- [ ] All answer types render correctly (text, radio, checkbox, switch)
- [ ] Form validation shows error states
- [ ] Progress indicator updates in real-time
- [ ] Keyboard navigation works
- [ ] Help tooltips display on hover
- [ ] Answered questions show completion indicator
