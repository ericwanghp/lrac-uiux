---
page: pm-dashboard
---

# PM Dashboard - Project Management & Team Coordination

A comprehensive project management dashboard for coordinating team workflows, tracking progress, and managing agent teams.

**DESIGN SYSTEM (REQUIRED):**

**Color Palette**:

- Primary Background: #121826 (deep navy-black)
- Secondary Background: #1E2532 (sidebar, navigation)
- Card Background: #1A1A1A (dark navy)
- Input Background: #0A0A0A (deepest black)
- Text Primary: #FFFFFF (white)
- Text Secondary: #A0A0A0 (light gray)
- Text Muted: #6B7280 (medium gray)
- Primary Accent: #3B82F6 (blue)
- Secondary Accent: #8B5CF6 (purple)
- Success: #10B981 (green)
- Error: #EF4444 (red)
- Warning: #F59E0B (orange)

**Typography**:

- Font Family: Inter, -apple-system, BlinkMacSystemFont
- H1: 2.25rem (36px), Inter 700
- H2: 1.5rem (24px), Inter 600
- Body: 1rem (16px), Inter 400
- Small: 0.875rem (14px), Inter 400

**Spacing**:

- Base Unit: 4px
- Page Margins: 32px
- Card Padding: 20px

**Border Radius**:

- Large: 8px - Cards, buttons
- Medium: 6px - Inputs

---

## Page Structure

### 1. Header Section

- Page title: "Project Management"
- Current project selector dropdown
- Date range picker
- "New Task" button (primary gradient)

### 2. Main Layout (Grid)

#### Top Row: Metrics Cards (4 columns)

**Metrics**:

1. **Active Tasks** - Count with trend arrow
2. **Completed This Week** - Progress vs target
3. **Team Velocity** - Tasks per day average
4. **Blockers** - Critical issues count

#### Middle Row: Two Columns

**Left Column (60%): Task Board**

- Kanban-style board with columns:
  - Backlog (gray header)
  - In Progress (blue header)
  - Review (purple header)
  - Done (green header)
- Each task card shows:
  - Task ID: "FEAT-001"
  - Title
  - Priority badge (High/Medium/Low)
  - Assignee avatar
  - Due date

**Right Column (40%): Team Activity**

- "Active Agents" section
- Agent cards showing:
  - Agent name/role: "frontend-dev"
  - Current task
  - Status: Working/Idle/Blocked
  - Progress bar
- Activity timeline:
  - Recent actions
  - Timestamps
  - User/agent icons

#### Bottom Row: Two Columns

**Left: Phase Progress**

- 8-phase progress visualization
- Current phase highlighted
- Completion percentage per phase
- Clickable phase indicators

**Right: Upcoming Milestones**

- Timeline view
- Milestone cards:
  - Title
  - Due date
  - Status (On Track/At Risk/Delayed)
  - Related tasks count

### 3. Sidebar (Collapsible)

- Quick filters
- Team member list
- Notification bell
- Settings access

---

## Visual Details

- Dark theme throughout
- Card-based layout with clear separation
- Color-coded status badges
- Avatar circles for assignees
- Progress bars with gradient fills
- Smooth hover animations

## Responsive Behavior

- Desktop: Full grid layout
- Tablet: Stacked columns
- Mobile: Single column scroll
