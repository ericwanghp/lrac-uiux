# UI Specification: Approval Components

## Overview

Design approval and review interface with approval cards, comment threads, and action buttons.

## Design Files

- `enhanced-approval-card.png`

## shadcn/ui Components

### Action Components

| Component      | Usage                   | Customization                        |
| -------------- | ----------------------- | ------------------------------------ |
| `Button`       | Approve/Reject actions  | Gradient for primary, red for reject |
| `ButtonGroup`  | Grouped action buttons  | -                                    |
| `DropdownMenu` | More options menu       | -                                    |
| `Toggle`       | Toggle states           | -                                    |
| `ToggleGroup`  | Multiple toggle options | -                                    |

### Feedback Components

| Component     | Usage                       |
| ------------- | --------------------------- |
| `Toast`       | Success/error notifications |
| `AlertDialog` | Confirmation dialogs        |
| `Sonar`       | Loading states              |

### Content Display

| Component        | Usage            |
| ---------------- | ---------------- |
| `Avatar`         | User avatars     |
| `AvatarImage`    | Avatar picture   |
| `AvatarFallback` | Initials         |
| `Badge`          | Status badges    |
| `Card`           | Approval cards   |
| `Separator`      | Section dividers |

### Comment Components

| Component    | Usage               |
| ------------ | ------------------- |
| `ScrollArea` | Scrollable comments |
| `Textarea`   | Comment input       |
| `Button`     | Submit comment      |

---

## Component Specifications

### Approval Card

```tsx
<Card className="border-[#334155]">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={designer.avatar} />
          <AvatarFallback>{designer.initials}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{designName}</CardTitle>
          <p className="text-sm text-[#A1A1AA]">by {designer.name}</p>
        </div>
      </div>
      <Badge className={statusColors[status]}>{status}</Badge>
    </div>
  </CardHeader>

  <CardContent>
    {/* Design Preview */}
    <div className="aspect-video rounded-lg overflow-hidden bg-[#0A0A0A] mb-4">
      <img src={previewUrl} alt={designName} className="w-full h-full object-cover" />
    </div>

    {/* Metadata */}
    <div className="flex gap-4 text-sm text-[#A1A1AA]">
      <span>Created: {createdAt}</span>
      <span>Version: {version}</span>
    </div>
  </CardContent>

  <CardFooter className="gap-2">
    <Button
      variant="default"
      className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]"
      onClick={handleApprove}
    >
      <Check className="mr-2 h-4 w-4" />
      Approve
    </Button>
    <Button variant="outline" onClick={handleRequestChanges}>
      <MessageSquare className="mr-2 h-4 w-4" />
      Request Changes
    </Button>
    <Button variant="destructive" onClick={handleReject}>
      <X className="mr-2 h-4 w-4" />
      Reject
    </Button>
  </CardFooter>
</Card>
```

### Comment Thread

```tsx
<ScrollArea className="h-[300px]">
  {comments.map((comment) => (
    <div key={comment.id} className="flex gap-3 mb-4">
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.user.avatar} />
        <AvatarFallback>{comment.user.initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{comment.user.name}</span>
          <span className="text-xs text-[#71717A]">{comment.timestamp}</span>
        </div>
        <p className="text-sm text-[#A1A1AA]">{comment.text}</p>
        {comment.annotations && (
          <div className="mt-2 p-2 bg-[#0A0A0A] rounded border border-[#334155]">
            <p className="text-xs text-[#8B5CF6]">📍 {comment.annotation}</p>
          </div>
        )}
      </div>
    </div>
  ))}
</ScrollArea>
```

### Add Comment Form

```tsx
<div className="flex gap-2">
  <Textarea
    placeholder="Add a comment..."
    value={newComment}
    onChange={(e) => setNewComment(e.target.value)}
    className="min-h-[80px] bg-[#0A0A0A] border-[#334155] resize-none"
  />
  <div className="flex flex-col gap-2">
    <Button size="icon" variant="ghost">
      <ImageIcon className="h-4 w-4" />
    </Button>
    <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
      Send
    </Button>
  </div>
</div>
```

### Approval Status Badges

```tsx
const statusColors = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500",
  approved: "bg-green-500/15 text-green-500 border-green-500",
  changes_requested: "bg-blue-500/15 text-blue-500 border-blue-500",
  rejected: "bg-red-500/15 text-red-500 border-red-500",
};
```

### Confirmation Dialog

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Reject Design</Button>
  </AlertDialogTrigger>
  <AlertDialogContent className="bg-[#1A1A1A] border-[#334155]">
    <AlertDialogHeader>
      <AlertDialogTitle>Reject this design?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. Please provide a reason for rejection.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <Textarea placeholder="Reason for rejection..." className="bg-[#0A0A0A] border-[#334155]" />
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleReject} className="bg-red-500 hover:bg-red-600">
        Reject
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## User Interactions

### Approval Flow

1. User views design preview
2. User reads comments (if any)
3. User clicks: Approve / Request Changes / Reject
4. Confirmation dialog appears (for reject)
5. Optional: Add comment
6. Toast notification confirms action
7. Card status updates

### Comment Flow

1. User clicks "Add comment"
2. Types in textarea
3. Optional: Add annotation (click on design)
4. Clicks "Send"
5. Comment appears in thread
6. Timestamp updates

---

## Styling Tokens

### From DESIGN.md

| Token                | Value   |
| -------------------- | ------- |
| `--accent-primary`   | #3B82F6 |
| `--accent-secondary` | #8B5CF6 |
| `--accent-success`   | #10B981 |
| `--accent-error`     | #EF4444 |
| `--accent-warning`   | #F59E0B |
| `--bg-card`          | #1A1A1A |
| `--bg-input`         | #0A0A0A |

---

## Acceptance Criteria

- [ ] Design preview displays correctly
- [ ] All three approval actions work (Approve, Request Changes, Reject)
- [ ] Confirmation dialog appears for Reject
- [ ] Comments can be added and displayed
- [ ] Status badge updates after action
- [ ] Toast notifications show feedback
- [ ] Responsive on tablet/mobile
