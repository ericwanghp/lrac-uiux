# UI Specification: Design Viewer

## Overview

Phase 2.5 Stitch design preview and approval interface with image viewer and annotations.

## Design File

- `design-viewer.png`

## shadcn/ui Components

### Viewer Components

| Component       | Usage              | Customization |
| --------------- | ------------------ | ------------- |
| `Card`          | Viewer container   | -             |
| `ScrollArea`    | Scrollable content | -             |
| `AspectRatio`   | Image container    | -             |
| `Zoom` (custom) | Zoom controls      | -             |

### Navigation

| Component    | Usage              |
| ------------ | ------------------ |
| `Tabs`       | View modes         |
| `Breadcrumb` | Navigation path    |
| `Button`     | Navigation buttons |

### Actions

| Component      | Usage          |
| -------------- | -------------- |
| `Button`       | Action buttons |
| `DropdownMenu` | More options   |
| `Toggle`       | View toggles   |
| `Slider`       | Zoom slider    |

### Annotations

| Component  | Usage              |
| ---------- | ------------------ |
| `Popover`  | Annotation details |
| `Badge`    | Annotation markers |
| `Textarea` | Comment input      |

---

## Component Specifications

### Design Viewer Container

```tsx
<Card className="h-full">
  <CardHeader className="border-b border-[#334155]">
    <div className="flex items-center justify-between">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/design">Designs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{designName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* View Controls */}
      <div className="flex items-center gap-2">
        <Toggle pressed={showGrid} onPressedChange={setShowGrid} aria-label="Toggle grid">
          <Grid className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={showAnnotations}
          onPressedChange={setShowAnnotations}
          aria-label="Toggle annotations"
        >
          <MessageSquare className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button variant="default" className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]">
          <Check className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-0">
    <div className="flex h-[calc(100vh-200px)]">
      {/* Main Viewer */}
      <div className="flex-1 bg-[#0A0A0A] overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="relative" style={{ transform: `scale(${zoom})` }}>
            <img
              src={designUrl}
              alt={designName}
              className={cn("max-w-none transition-transform", showGrid && "bg-[url('/grid.png')]")}
            />

            {/* Annotation Markers */}
            {showAnnotations &&
              annotations.map((annotation) => (
                <Button
                  key={annotation.id}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute w-6 h-6 rounded-full text-xs font-bold",
                    annotation.resolved
                      ? "bg-green-500/20 text-green-500"
                      : "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80"
                  )}
                  style={{
                    left: annotation.x,
                    top: annotation.y,
                  }}
                  onClick={() => setSelectedAnnotation(annotation)}
                >
                  {annotation.number}
                </Button>
              ))}
          </div>
        </ScrollArea>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#1A1A1A] rounded-lg border border-[#334155] p-2">
          <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Slider
            value={[zoom]}
            onValueChange={([value]) => setZoom(value)}
            min={0.25}
            max={2}
            step={0.25}
            className="w-[100px]"
          />
          <span className="text-xs text-[#A1A1AA] w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(2, zoom + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Annotations Sidebar */}
      <ScrollArea className="w-80 border-l border-[#334155]">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Annotations</h3>
            <Badge variant="outline">{annotations.filter((a) => !a.resolved).length} open</Badge>
          </div>

          {annotations.map((annotation) => (
            <Card
              key={annotation.id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedAnnotation?.id === annotation.id
                  ? "border-[#3B82F6] bg-[#3B82F6]/5"
                  : "border-[#334155]"
              )}
              onClick={() => setSelectedAnnotation(annotation)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                    {annotation.number}
                  </Badge>
                  <CardTitle className="text-sm">{annotation.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-[#A1A1AA]">{annotation.description}</p>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-[#71717A]">{annotation.author}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveAnnotation(annotation.id);
                    }}
                  >
                    {annotation.resolved ? "Reopen" : "Resolve"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  </CardContent>
</Card>
```

### Add Annotation

```tsx
<Popover open={isAnnotating} onOpenChange={setIsAnnotating}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className="fixed bottom-4 right-4"
      onClick={() => setIsAnnotating(true)}
    >
      <MessageSquarePlus className="mr-2 h-4 w-4" />
      Add Annotation
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          placeholder="Annotation title"
          value={newAnnotation.title}
          onChange={(e) => setNewAnnotation({ ...newAnnotation, title: e.target.value })}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          placeholder="Describe the issue or feedback..."
          value={newAnnotation.description}
          onChange={(e) => setNewAnnotation({ ...newAnnotation, description: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsAnnotating(false)}>
          Cancel
        </Button>
        <Button onClick={handleAddAnnotation}>Add Annotation</Button>
      </div>
    </div>
  </PopoverContent>
</Popover>
```

### Version Selector

```tsx
<Select value={selectedVersion} onValueChange={setSelectedVersion}>
  <SelectTrigger className="w-[150px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {versions.map((version) => (
      <SelectItem key={version.id} value={version.id}>
        <div className="flex items-center gap-2">
          <span>v{version.number}</span>
          {version.current && (
            <Badge variant="outline" className="text-xs">
              Current
            </Badge>
          )}
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Viewer Features

### Zoom Controls

- Slider for continuous zoom (25% - 200%)
- +/- buttons for step zoom
- Fit to screen button
- Current zoom percentage display

### View Modes

- Single page view
- Grid view (for multiple designs)
- Annotations overlay toggle
- Grid overlay toggle

### Annotation System

- Click to add annotation
- Numbered markers on image
- Sidebar with all annotations
- Resolve/reopen annotations
- Filter by status

### Navigation

- Previous/next design
- Version selector
- Breadcrumb navigation

---

## Styling Tokens

### From DESIGN.md

| Token                | Value   |
| -------------------- | ------- |
| `--bg-primary`       | #0A0A0A |
| `--bg-card`          | #1A1A1A |
| `--accent-primary`   | #3B82F6 |
| `--accent-secondary` | #8B5CF6 |
| `--accent-success`   | #10B981 |
| `--text-primary`     | #FFFFFF |
| `--text-secondary`   | #A1A1AA |
| `--text-muted`       | #71717A |
| `--border-default`   | #334155 |

---

## Acceptance Criteria

- [ ] Image displays in viewer
- [ ] Zoom controls work (slider and buttons)
- [ ] Pan/scroll works when zoomed in
- [ ] Annotations display as numbered markers
- [ ] Clicking annotation highlights in sidebar
- [ ] Annotations can be added via popover
- [ ] Annotations can be resolved/reopened
- [ ] Sidebar scrolls independently
- [ ] Download button works
- [ ] Version selector shows all versions
- [ ] Responsive on tablet (sidebar collapses)
- [ ] Keyboard navigation for accessibility
