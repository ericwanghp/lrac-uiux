---
page: design-approval-card
---

# Design Approval Card with Comments - Enhanced Version

A comprehensive design review and approval interface with integrated commenting system and approval workflow.

**DESIGN SYSTEM (REQUIRED):**

**color Palette**:

- Primary Background: #121826 (deep navy-black) - Main application background
- Secondary Background: #1E2532 (slightly lighter dark) - Sidebar, navigation panels
- Card Background: #1a1a1a (dark navy) - Cards, panels, surfaces
- Input Background: #0a0a0a (deepest black) - Input fields, edit areas
- Text Primary: #FFFFFF (pure white) - Headlines, titles
- Text Secondary: #a0a0a0 (light gray) - Body text, descriptions
- Text Muted: #6B7280 (medium gray) - Hints, timestamps
- Primary Accent: #3B82F6 (vivid blue) - Buttons, links, primary actions
- Secondary Accent: #8B5CF6 (vibrant purple) - Progress indicators, secondary elements
- Success: #10B981 (bright green) - Approved states, success badges
- Warning: #F59E0B (warning orange) - Request changes states
- Error: #EF4444 (alert red) - Rejected states, errors

**Typography**:

- Font Family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- H1: 2.25rem (36px), Inter 700 - Page titles
- H2: 1.875rem (30px), Inter 600 - Section headings
- H3: 1.5rem (24px), Inter 600 - Card titles
- Body: 1rem (16px), Inter 400 - Primary body text
- Small: 0.875rem (14px), Inter 400 - Secondary text
- Caption: 0.75rem (12px), Inter 500 - Labels, timestamps

**Spacing**:

- Base Unit: 4px
- Page Margins: 32px
- Section Gaps: 24px
- Card Gutters: 20px
- Component Gaps: 16px
- Element Spacing: 12px

**Border Radius**:

- Small: 4px - Badges, tags
- Medium: 6px - Inputs, small buttons
- Large: 8px - Cards, buttons, modals
- Extra Large: 12px - Large surfaces

**Component Styles**:

- Cards: Background #1a1a1a, border-radius 8px, padding 16px, subtle shadow
- Buttons: Gradient or solid background, border-radius 8px, padding 12px vertical, 24px horizontal
- Inputs: Background #0a0a0a, border-radius 6px, padding 12px
- Badges: Solid background colors, border-radius 4px, padding 4px vertical, 8px horizontal

---

## Component Structure

A full-featured design approval interface with three-column layout (design preview, approval controls, comment history).

### 1. Left Column: Design Preview (60%)

**Design Preview Card**:

- Background: #1a1a1a (dark navy card)
- Border-radius: 12px (xl)
- Padding: 20px
- Aspect ratio: 16:9 desktop preview

**Preview Header**:

- File name: Bold, 18px, white
- File info: Size, dimensions, format in gray
- Actions: Download, fullscreen buttons (ghost style)

**Preview Area**:

- Screenshot/HTML render area
- Border-radius: 8px
- Background: #0a0a0a
- Loading state with spinner

**File Metadata**:

- Created date, last modified, version
- Designer name with avatar
- Status badge (Draft/Ready for Review/Approved)

### 2. Middle Column: Approval Controls (20%)

**Approval Status Card**:

- Background: #1a1a1a
- Border-radius: 8px
- Padding: 16px

**Status Badge**:

- Large badge showing current status
- Pending: Gray background
- Approved: Green background (#10B981)
- Changes Requested: Orange background (#F59E0B)
- Rejected: Red background (#EF4444)

**Approval Actions**:

- Three primary buttons (vertical stack):
  - **Approve**: Green gradient button, white checkmark icon
  - **Request Changes**: Orange solid button, white edit icon
  - **Reject**: Red solid button, white X icon
- Button styling: Full-width, border-radius 6px, padding 12px

**Approver Selection** (if not assigned):

- Dropdown with team member avatars
- Shows: "Assign reviewer..." placeholder

**Assigned Reviewer** (if assigned):

- Avatar + name
- Approval deadline indicator
- "Assigned to @username 2 days ago"

### 3. Right Column: Comments & History (20%)

**Comment Input Card**:

- Background: #1a1a1a
- Border-radius: 8px
- Padding: 16px

**Comment Input**:

- Textarea with placeholder: "Add a comment... (Markdown supported)"
- Background: #0a0a0a
- Border-radius: 6px
- Min-height: 80px
- Character counter: "0 / 1000"

**Comment Actions**:

- Cancel button (ghost style)
- Submit button (primary gradient)
- Markdown help link

**Comment List** (scrollable):

- Individual comment cards
- Background: #1e2532 (lighter)
- Border-radius: 6px
- Padding: 12px
- Margin-bottom: 8px

**Each Comment**:

- Author avatar (32px circle)
- Author name: Bold, 14px, white
- Timestamp: 12px, gray, "2 hours ago"
- Comment text: 14px, secondary text
- Markdown rendering support
- @mention highlighting in blue
- Action buttons: Edit, Delete (on hover)

**Approval History Timeline**:

- Vertical timeline with status changes
- Each entry: status icon + timestamp + user
- Connecting line between entries
- Status icons: colored dots

**History Entry**:

- Icon: Status-colored dot
- Text: "Approved by @username"
- Timestamp: "Mar 14, 2026, 10:30 AM"
- Avatar: 24px circle

---

## Visual Hierarchy

1. **Highest**: Design preview, approval buttons (bright colors, large)
2. **High**: Status badges, comments (medium emphasis)
3. **Medium**: Metadata, file info (secondary text)
4. **Low**: Timestamps, help text (muted text)

## Interaction Details

- **Real-time preview**: Design loads immediately
- **Status changes**: Instant badge updates with animation
- **Comment submission**: Smooth append with timestamp
- **@mention autocomplete**: Dropdown appears when typing @
- **Markdown preview**: Live preview in comment input
- **Keyboard shortcuts**:
  - Ctrl+Enter to submit comment
  - Escape to cancel
- **Accessibility**: Screen reader support, keyboard navigation

## Responsive Behavior

- Desktop: Three-column layout (60-20-20)
- Tablet: Two-column layout (preview full-width, controls/comments stacked)
- Mobile: Single-column stack (all sections full-width)
