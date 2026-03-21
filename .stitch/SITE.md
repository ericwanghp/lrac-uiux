# Auto-Coding Framework Management Frontend

## 1. Project Vision

**Purpose**: Modern web-based management frontend for the Auto-Coding Framework that transforms CLI-based interactions into an intuitive visual experience.

**Target Users**: Single developer/product manager using Auto-Coding Framework

**Core Value**:

- Interactive requirement confirmation (Phase 1-2)
- Real-time execution monitoring (Phase 5-7)
- Comprehensive project lifecycle management across all 8 phases
- Stitch design integration for UI/UX workflow

## 2. Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, Tailwind CSS
- **Components**: shadcn/ui
- **Data Storage**: File-based (.auto-coding/tasks.json, progress.txt)
- **Real-time**: WebSocket (critical updates) + Polling (logs)
- **Design**: Google Stitch for UI generation

## 3. Design Direction

**Option C: Hybrid Professional Platform**

Combining:

- **Linear**: Dark theme, polished components, excellent UX
- **Flowise**: Visual process flow
- **AgentGPT**: Tech aesthetics, simplicity

**Visual Identity**:

- Deep purple-black backgrounds (#0A0A0A, #1A1A1A)
- Purple-blue gradient accents (#5E6AD0 to #8B5CF6)
- Inter font family, JetBrains Mono for code
- Content-type based terminal styling

## 4. Sitemap

### Core Pages

- [x] **Dashboard** (`/`) - Project overview, phase tracking, quick actions
- [x] **Phase 1-2: Interactive Q&A** (`/qa`) - Requirement collection interface
- [x] **Phase 2.5: Design Viewer** (`/design`) - Stitch design review and approval
- [x] **Phase 5-7: Execution Monitor** (`/monitor`) - Real-time terminal output and task tracking

### Additional Pages (Future)

- [ ] **Phase 3: Architecture Review** (`/architecture`) - Document review and approval
- [ ] **Phase 8: PM Dashboard** (`/pm`) - Project coordination and team management
- [ ] **Settings** (`/settings`) - User preferences, theme configuration

## 5. Roadmap

### Phase 2.5 (Current) - UI Generation

**Priority 1: Core Pages**

1. ✅ Dashboard - Project cards, phase navigation, global search
2. ✅ Phase 1-2 Q&A - Interactive question-answer interface
3. ✅ Phase 2.5 Design Viewer - Stitch design preview and approval
4. ✅ Phase 5-7 Monitor - Terminal output with content-type styling

**Priority 2: Documentation**

- Document design system in DESIGN.md
- Create component specifications
- Map to shadcn/ui components

### Phase 3 (Next) - Architecture

- Technical architecture document
- API design
- Data flow specifications
- Integration with Auto-Coding Framework files

### Phase 4 - Task Breakdown

- Feature breakdown in tasks.json
- Dependency mapping
- Parallel group identification

### Phase 5-7 - Implementation

- Frontend development
- Backend API development
- Testing
- Deployment

## 6. Creative Freedom

**Future Enhancements**:

- AI-assisted input suggestions
- Advanced document diff viewer
- Real-time collaboration features
- Mobile app companion
- Plugin system for custom phases

## 7. Integration Points

**Read from Framework**:

- `.auto-coding/tasks.json` - Feature status
- `.auto-coding/progress.txt` - Session history
- `docs/brd/` - Business requirements
- `docs/prd/` - Product requirements
- `docs/architecture/` - Technical design
- `.stitch/designs/` - Generated UI designs

**Write to Framework**:

- `.auto-coding/qa-sessions/` - Q&A session records
- Document approvals and feedback
- Design approvals

## 8. Success Metrics

- User migration from CLI to Web: >80% within 3 months
- Requirement confirmation time: <10 minutes (vs 30+ min in CLI)
- Design confirmation rate: 100% (vs 70% in CLI)
- Cross-session context retrieval: >95% success
- User satisfaction (NPS): >8/10

## 9. Notes

**Stitch Project ID**: 682648262469521919
**Design System**: See .stitch/DESIGN.md
**Generated Designs**: .stitch/designs/\*.png (9 screens completed)

### Current Design Files

| File                       | Page                    | Description                          |
| -------------------------- | ----------------------- | ------------------------------------ |
| dashboard.png              | Dashboard               | Main project overview                |
| qa-interface.png           | Phase 1-2 Q&A           | Requirement collection interface     |
| enhanced-qa-card.png       | Q&A Cards               | Question and answer card components  |
| design-viewer.png          | Phase 2.5 Design Viewer | Stitch design preview                |
| enhanced-approval-card.png | Approval Cards          | Approval and comment card components |
| execution-monitor-v2.png   | Phase 5-7 Monitor       | Real-time terminal output (V2)       |
| settings-page.png          | Settings                | User preferences page                |
| pm-team-dashboard.png      | PM Dashboard            | Project management dashboard         |
| qa-question-card.png       | Question Cards          | Additional Q&A component             |
