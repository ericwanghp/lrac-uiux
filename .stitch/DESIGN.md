# Design System: Auto-Coding Framework Management Frontend

> **Version**: 2.0
> **Last Updated**: 2026-03-14
> **Theme**: Linear-inspired Dark Mode
> **Primary Device**: Desktop (2560px width)
> **Designs Analyzed**: 9 screens (Dashboard, Q&A Interface, Design Viewer, Execution Monitor V2, Settings, PM Dashboard, Enhanced Q&A Card, Enhanced Approval Card, Question Card)

---

## 1. Visual Identity

**Brand Personality**:

- **Professional & Modern**: Clean, developer-focused aesthetic with sophisticated dark theme
- **Efficient & Clear**: Information-dense but organized, prioritizing quick scanning and status recognition
- **Trustworthy**: Established tech company feel with attention to detail
- **Innovative**: AI-powered development platform with cutting-edge visual language

**Emotional Tone**:

- Confident and capable
- Focused and productive
- Technologically sophisticated
- Calm under complexity

---

## 2. Color System

### 2.1 Background Colors

**Primary Background**:

- Deep navy/black (#121826) - Main application background
- Purpose: Creates depth and reduces eye strain for long coding sessions
- Usage: Main viewport, page backgrounds

**Secondary Background**:

- Slightly lighter dark (#1E2532) - Sidebar, navigation panels
- Purpose: Creates subtle elevation hierarchy
- Usage: Left sidebar, secondary panels

**Card Background**:

- Dark navy (#1A1A1A) - Individual card surfaces
- Purpose: Elevates content from base background
- Usage: Project cards, modal surfaces, input fields

**Input Background**:

- Deepest black (#0A0A0A) - Text input fields
- Purpose: Recedes from card surfaces, indicates editability
- Usage: Text inputs, textareas, dropdowns

### 2.2 Text Colors

**Primary Text**:

- Pure white (#FFFFFF) - Headlines, project names, important labels
- Purpose: Maximum contrast for critical information
- Usage: H1, H2 headings, project titles, primary actions

**Secondary Text**:

- Light gray (#A0A0A0) - Body text, descriptions, secondary labels
- Purpose: Readable but not competing with primary content
- Usage: Paragraphs, descriptions, helper text, phase names

**Muted Text**:

- Medium gray (#6B7280) - Hints, placeholders, tertiary information
- Purpose: Indicates optional or less important content
- Usage: Placeholders, timestamps, hints, disabled states

### 2.3 Accent Colors

**Primary Accent - Blue**:

- Vivid blue (#3B82F6) - Primary interactive elements
- Purpose: Draws attention to clickable elements and primary actions
- Usage: Primary buttons, active navigation items, links, focus states

**Secondary Accent - Purple**:

- Vibrant purple (#8B5CF6) - Secondary interactive elements, progress indicators
- Purpose: Adds visual interest and variety while maintaining cohesion
- Usage: Secondary buttons, progress bar fills, gradient endpoints

**Tertiary Accent - Orange**:

- Warm orange (#F97316) - Tertiary accents, warnings
- Purpose: Creates visual variety and draws attention to specific elements
- Usage: Tertiary buttons, warning states, special highlights

**Gradient Accent**:

- Purple-to-blue gradient (#8B5CF6 → #3B82F6) - Premium interactive elements
- Purpose: Adds depth and sophistication to primary actions
- Usage: Primary CTA buttons, progress bars, brand highlights

### 2.4 Semantic Colors

**Success - Green**:

- Bright green (#10B981) - Completed, active, positive states
- Purpose: Instantly communicates success and completion
- Usage: Active badges, success messages, completed checkmarks, progress indicators

**Error - Red**:

- Alert red (#EF4444) - Errors, blockers, critical issues
- Purpose: Draws immediate attention to problems
- Usage: Error badges, blocked states, error messages, delete confirmations

**Warning - Orange**:

- Warning orange (#F59E0B) - Caution, attention needed
- Purpose: Indicates potential issues without urgency of errors
- Usage: Warning badges, attention states, warning messages

**Info - Blue**:

- Info blue (#3B82F6) - Information, neutral states
- Purpose: Provides context without emotional weight
- Usage: Info badges, informational messages, neutral indicators

---

## 3. Typography System

### 3.1 Font Family

**Primary Font Stack**:

```
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

**Characteristics**:

- Clean and modern
- Excellent legibility at all sizes
- Open-source and widely available
- Optimized for screen rendering

**Monospace Font Stack**:

```
JetBrains Mono, "Fira Code", "Cascadia Code", Consolas, monospace
```

**Characteristics**:

- Developer-focused
- Excellent for code snippets
- Clear distinction between similar characters
- Optimized for terminal output

### 3.2 Font Sizes

**Display - H1**:

- Size: 2.25rem (36px)
- Weight: 700 (bold)
- Usage: Main page titles, hero headings
- Line-height: 1.2

**Display - H2**:

- Size: 1.875rem (30px)
- Weight: 600 (semibold)
- Usage: Section headings, modal titles
- Line-height: 1.3

**Display - H3**:

- Size: 1.5rem (24px)
- Weight: 600 (semibold)
- Usage: Card titles, subsection headings
- Line-height: 1.4

**Body - Large**:

- Size: 1rem (16px)
- Weight: 400 (normal)
- Usage: Primary body text, descriptions
- Line-height: 1.5

**Body - Small**:

- Size: 0.875rem (14px)
- Weight: 400 (normal)
- Usage: Secondary text, helper text, metadata
- Line-height: 1.5

**Caption**:

- Size: 0.75rem (12px)
- Weight: 500 (medium)
- Usage: Labels, badges, timestamps, very small text
- Line-height: 1.3

**Code**:

- Size: 0.875rem (14px)
- Weight: 400 (normal)
- Usage: Code snippets, terminal output, technical text
- Line-height: 1.6

### 3.3 Font Weights

**Light**: 300 - Rarely used, only for subtle hints
**Regular**: 400 - Body text, descriptions, general content
**Medium**: 500 - Emphasized body text, captions, small headings
**Semibold**: 600 - Section headings, card titles, important labels
**Bold**: 700 - Page titles, hero text, critical information

---

## 4. Spacing System

### 4.1 Base Unit

**Base spacing unit**: 4px

All spacing values are multiples of 4px for consistent rhythm.

### 4.2 Spacing Scale

**xs**: 4px - Minimal spacing, tight gaps
**sm**: 8px - Small spacing, component internal padding
**md**: 12px - Medium spacing, card internal padding
**lg**: 16px - Large spacing, section padding
**xl**: 20px - Extra large spacing, major section gaps
**2xl**: 24px - Double extra large, page section margins
**3xl**: 32px - Triple extra large, major page divisions

### 4.3 Layout Spacing

**Page margins**: 32px (3xl) - Edge spacing around main content
**Section gaps**: 24px (2xl) - Vertical space between major sections
**Card gutters**: 20px (xl) - Horizontal space between grid cards
**Component gaps**: 16px (lg) - Space between related components
**Element spacing**: 12px (md) - Space between elements within components
**Tight spacing**: 8px (sm) - Internal component padding
**Minimal spacing**: 4px (xs) - Icon spacing, tight groupings

### 4.4 Component Padding

**Cards**:

- Padding: 16px (lg) all sides
- Creates breathing room for card content

**Buttons**:

- Padding: 12px (md) vertical, 24px (2xl) horizontal
- Generous horizontal padding for comfortable click targets

**Inputs**:

- Padding: 12px (md) horizontal, 12px (md) vertical
- Comfortable typing area with clear boundaries

**Badges**:

- Padding: 4px (xs) vertical, 8px (sm) horizontal
- Compact for inline display

**Navigation items**:

- Padding: 12px (md) all sides
- Comfortable hover and click targets

---

## 5. Border Radius System

### 5.1 Radius Scale

**Small (sm)**: 4px - Badges, tags, small indicators
**Medium (md)**: 6px - Inputs, small buttons, compact cards
**Large (lg)**: 8px - Cards, buttons, modals, primary surfaces
**Extra Large (xl)**: 12px - Large cards, hero sections, prominent surfaces
**Full (full)**: 9999px - Perfect circles (avatars, icons), pill shapes

### 5.2 Component Radius

**Cards**: 8px (lg) - Friendly but professional
**Buttons**: 8px (lg) - Matches card roundness
**Inputs**: 6px (md) - Slightly sharper for editability
**Badges**: 4px (sm) - Crisp and compact
**Modals**: 12px (xl) - Softer, more prominent
**Avatars**: full - Circular for profile images
**Icon buttons**: 6px (md) - Slightly rounded square
**Pills**: full - Fully rounded for badges and chips

---

## 6. Shadow & Elevation System

### 6.1 Dark Theme Elevation Strategy

In dark themes, shadows are less visible. Instead, we use:

1. **Background lightness** - Lighter backgrounds create elevation
2. **Subtle borders** - Thin borders define surfaces
3. **Soft glows** - Accent-colored glows for interactive elements

### 6.2 Elevation Levels

**Level 0 - Base**:

- Background: #0A0A0A
- Purpose: Base layer, deepest level
- Usage: Page background, input field background

**Level 1 - Surface**:

- Background: #1A1A1A
- Purpose: Primary content surfaces
- Usage: Cards, panels, main content areas

**Level 2 - Elevated**:

- Background: #1E2532
- Purpose: Navigation, secondary panels
- Usage: Sidebars, navigation bars, secondary panels

**Level 3 - Modal**:

- Background: #242424
- Purpose: Top-level overlays
- Usage: Modals, dropdowns, tooltips, popovers

### 6.3 Border Strategy

**Subtle Border**:

- Border: 1px solid rgba(255, 255, 255, 0.05)
- Purpose: Minimal surface definition
- Usage: Card borders, subtle separations

**Medium Border**:

- Border: 1px solid rgba(255, 255, 255, 0.1)
- Purpose: Clear surface definition
- Usage: Input borders, panel borders

**Strong Border**:

- Border: 1px solid rgba(255, 255, 255, 0.2)
- Purpose: Prominent surface definition
- Usage: Modal borders, dropdown borders

**Accent Border**:

- Border: 2px solid #3B82F6 (primary accent)
- Purpose: Interactive focus, active states
- Usage: Focus states, active navigation items, selected items

### 6.4 Glow Effects

**Accent Glow**:

- Box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15)
- Purpose: Subtle focus indicator
- Usage: Input focus, button hover, interactive element focus

**Success Glow**:

- Box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.15)
- Purpose: Positive feedback
- Usage: Success states, completed items

**Error Glow**:

- Box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.15)
- Purpose: Error feedback
- Usage: Error states, blocked items

---

## 7. Component Library

### 7.1 Buttons

**Primary Button**:

- Background: Linear gradient (#8B5CF6 → #3B82F6)
- Text: White (#FFFFFF), Inter 600, 16px
- Padding: 12px vertical, 24px horizontal
- Border-radius: 8px (lg)
- Hover: Accent glow, transform: translateY(-1px)
- Active: Transform: translateY(0)
- Transition: 150ms ease

**Secondary Button**:

- Background: Transparent
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Text: Primary text (#FFFFFF), Inter 500, 16px
- Padding: 12px vertical, 24px horizontal
- Border-radius: 8px (lg)
- Hover: Background rgba(255, 255, 255, 0.05), border accent
- Transition: 150ms ease

**Ghost Button**:

- Background: Transparent
- Border: None
- Text: Secondary text (#A0A0A0), Inter 400, 16px
- Padding: 12px vertical, 24px horizontal
- Border-radius: 8px (lg)
- Hover: Background rgba(255, 255, 255, 0.05)
- Transition: 150ms ease

**Icon Button**:

- Size: 36px × 36px
- Background: Transparent
- Border-radius: 6px (md)
- Hover: Background rgba(255, 255, 255, 0.05)
- Icon: 20px, secondary text color
- Transition: 150ms ease

### 1.2 Input Fields

**Text Input**:

- Height: 40px
- Background: #0A0A0A
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Border-radius: 6px (md)
- Padding: 0 12px
- Text: Primary text (#FFFFFF), Inter 400, 16px
- Placeholder: Muted text (#6B7280), Inter 400, 16px
- Focus: Border accent (#3B82F6), accent glow
- Transition: 200ms ease

**Textarea**:

- Min-height: 120px
- Background: #0A0A0A
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Border-radius: 6px (md)
- Padding: 12px
- Text: Primary text (#FFFFFF), Inter 400, 16px
- Placeholder: Muted text (#6B7280), Inter 400, 16px
- Resize: Vertical
- Focus: Border accent (#3B82F6), accent glow
- Transition: 200ms ease

**Select/Dropdown**:

- Height: 40px
- Background: #0A0A0A
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Border-radius: 6px (md)
- Padding: 0 12px
- Icon: Chevron down, secondary text color
- Focus: Border accent (#3B82F6), accent glow
- Transition: 200ms ease

### 1.3 Cards

**Basic Card**:

- Background: #1A1A1A
- Border: 1px solid rgba(255, 255, 255, 0.05)
- Border-radius: 8px (lg)
- Padding: 16px (lg)
- Hover: Border accent glow, transform: translateY(-2px)
- Transition: 200ms ease

**Interactive Card**:

- Same as Basic Card +
- Cursor: pointer
- Active: Transform: scale(0.98)
- Usage: Project cards, clickable items

**Project Card**:

- Size: 280px × 180px (fixed dimensions for grid consistency)
- Background: #1A1A1A
- Border: 1px solid rgba(255, 255, 255, 0.05)
- Border-radius: 8px (lg)
- Padding: 16px (lg)
- Layout:
  - Header: Project name (Inter 600, 18px), status badge (top-right)
  - Body: Current phase, progress bar (4px height), last updated
  - Footer: Quick stats, open button
- Hover: Border accent glow, transform: translateY(-2px)
- Transition: 200ms ease

### 1.4 Badges

**Status Badge**:

- Padding: 4px vertical, 8px horizontal
- Border-radius: 4px (sm)
- Font-size: 12px (caption)
- Font-weight: 500 (medium)
- Text-transform: Uppercase

**Variants**:

- **Active**: Background rgba(16, 185, 129, 0.1), text #10B981
- **Completed**: Background rgba(59, 130, 246, 0.1), text #3B82F6
- **Blocked**: Background rgba(239, 68, 68, 0.1), text #EF4444
- **Pending**: Background rgba(107, 114, 128, 0.1), text #6B7280

### 1.5 Progress Indicators

**Linear Progress Bar**:

- Height: 4px
- Background: rgba(255, 255, 255, 0.1)
- Fill: Linear gradient (#8B5CF6 → #3B82F6)
- Border-radius: 2px
- Transition: width 300ms ease

**Circular Progress**:

- Size: 40px
- Stroke-width: 3px
- Track: rgba(255, 255, 255, 0.1)
- Fill: Linear gradient (#8B5CF6 → #3B82F6)
- Rotation: -90deg (starts from top)

### 1.6 Navigation

**Sidebar Navigation Item**:

- Padding: 12px (md)
- Border-radius: 6px (md)
- Icon: 20px, secondary text color
- Text: Inter 400, 14px, secondary text color
- Hover: Background rgba(255, 255, 255, 0.05)
- Active: Background rgba(59, 130, 246, 0.1), border-left 2px solid #3B82F6, text white
- Transition: 150ms ease

**Sidebar Section Header**:

- Text: Inter 600, 12px, uppercase, muted text color
- Padding: 8px (sm) vertical, 12px (md) horizontal
- Letter-spacing: 0.05em

---

## 8. Animation & Transitions

### 8.1 Timing

**Fast**: 150ms ease - Micro-interactions, hover effects
**Medium**: 200ms ease - Component state changes
**Slow**: 300ms ease - Page transitions, significant changes
**Very Slow**: 500ms ease - Complex animations, loading states

### 8.2 Easing Functions

**ease**: Standard easing for most transitions
**ease-in**: Faster start, slower end
**ease-out**: Slower start, faster end
**ease-in-out**: Smooth acceleration and deceleration

### 8.3 Transition Examples

**Card Hover**:

- transform: translateY(-2px)
- border-color: accent
- box-shadow: accent glow
- duration: 200ms ease

**Button Hover**:

- transform: translateY(-1px)
- box-shadow: accent glow
- duration: 150ms ease

**Page Transition**:

- opacity: 0 → 1
- transform: translateY(8px) → translateY(0)
- duration: 300ms ease-in-out

**Modal Open**:

- opacity: 0 → 1
- transform: scale(0.95) → scale(1)
- duration: 200ms ease-out

### 8.4 Loading States

**Skeleton Loader**:

- Background: rgba(255, 255, 255, 0.05)
- Animation: Shimmer effect (gradient moving across)
- Border-radius: Match component

**Spinner**:

- Size: 20px, 32px, 48px
- Color: Linear gradient (#8B5CF6 → #3B82F6)
- Animation: rotate 360deg in 1s, linear

---

## 9. Responsive Behavior

### 9.1 Breakpoints

**Mobile**: < 768px
**Tablet**: 768px - 1024px
**Desktop**: > 1024px

### 9.2 Layout Changes

**Mobile (<768px)**:

- Sidebar: Bottom navigation bar (fixed bottom, 64px height)
- Header: Hamburger menu instead of full navigation
- Cards: Full-width single column
- Font sizes: Reduced (H1: 1.875rem)
- Grid: 1 column

**Tablet (768px - 1024px)**:

- Sidebar: Collapsible (hamburger toggle)
- Default state: Collapsed (icons only)
- Cards: 2-column grid
- Grid: 2 columns

**Desktop (>1024px)**:

- Sidebar: Full width (240px)
- Cards: 3+ column grid
- All features: visible
- Grid: 3+ columns

---

## 10. Accessibility Features

### 10.1 Keyboard Navigation

**Global Shortcuts**:

- Cmd+K: Open global search
- Cmd+S: Save current form
- Escape: Close modals
- Tab: Navigate between elements
- Enter/Space: Activate buttons
- Arrow keys: Navigate lists

**Focus Indicators**:

- Outline: 2px solid #3B82F6
- Offset: 2px
- Border-radius: Match element

### 10.2 Screen Reader Support

**Required ARIA Attributes**:

- All images: alt text
- All buttons: aria-label
- All forms: aria-describedby for errors
- All modals: aria-modal, aria-labelledby
- All inputs: aria-label

### 10.3 Color Contrast

**Text Contrast**:

- Primary text on > 4.5:1
- Secondary text: > 3:1
- Interactive elements: > 3:1

---

## 11. Icon System

**Navigation Icons** (20px, stroke-width 2):

- Document (file-text) - Phase 1
- File-text - Phase 2
- Palette - Phase 2.5
- Sitemap - Phase 3
- List-checks - Phase 4
- Code - Phase 5
- Test-tube - Phase 6
- Rocket - Phase 7
- Users - Phase 8

**Action Icons** (16px, stroke-width 2):

- Plus - Add new
- Arrow-right - Open/Next
- Check - Confirm/Complete
- X - Delete/Close
- Edit - Modify
- Search - Search

**Status Icons** (16px, stroke-width 2):

- Checkmark - Completed
- Circle - In progress
- Alert-triangle - Warning
- X-circle - Error

---

## 12. Design System Notes for Stitch Generation

When generating new screens with Stitch, include this exact section at your prompt to ensure visual consistency.

```

**DESIGN SYSTEM (REQUIRED):**

**Color Palette**:
- Primary Background: #121826 (deep navy-black) - Main application background
- Secondary Background: #1E2532 (slightly lighter dark) - Sidebar, navigation panels
- Card Background: #1A1A1A (dark navy) - Cards, panels, surfaces
- Input Background: #0A0A0A (deepest black) - Input fields, edit areas

**Text Colors**:
- Text Primary: #FFFFFF (pure white) - Headlines, project names
- Text Secondary: #A0A0A0 (light gray) - Body text, descriptions
- Text Muted: #6B7280 (medium gray) - Hints, placeholders

**Accent Colors**:
- Primary Accent: #3B82F6 (vivid blue) - Buttons, links, primary actions
- Secondary Accent: #8B5CF6 (vibrant purple) - Progress bars, gradient endpoints
- Tertiary Accent: #F97316 (warm orange) - Special highlights
- Gradient Accent: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%) - Premium CTAs

**Semantic Colors**:
- Success: #10B981 (bright green) - Completed, active states
- Error: #EF4444 (alert red) - Errors, blockers
- Warning: #F59E0B (warning orange) - Caution states
- Info: #3B82F6 (info blue) - Informational states

**Typography**:
- Font Family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- H1: 2.25rem (36px), Inter 700 - Page titles
- H2: 1.875rem (30px), Inter 600 - Section headings
- H3: 1.5rem (24px), Inter 600 - Card titles
- Body: 1rem (16px), Inter 400 - Primary body text
- Small: 0.875rem (14px), Inter 400 - Secondary text
- Caption: 0.75rem (12px), Inter 500 - Labels, badges

**Spacing**:
- Base Unit: 4px
- Page Margins: 32px (3xl)
- Section Gaps: 24px (2xl)
- Card Gutters: 20px (xl)
- Component Gaps: 16px (lg)
- Element Spacing: 12px (md)
- Tight Spacing: 8px (sm)
- Minimal Spacing: 4px (xs)

**Border Radius**:
- Small: 4px (sm) - Badges, tags
- Medium: 6px (md) - Inputs, small buttons
- Large: 8px (lg) - Cards, buttons, modals
- Extra Large: 12px (xl) - Large surfaces
- Full: 9999px (full) - Circles, pills

**Component Styles**:
- Cards: Background #1A1A1A, border-radius 8px, padding 16px
- Buttons: Gradient or solid background, border-radius 8px, padding 12px vertical, 24px horizontal
- Inputs: Background #0A0A0A, border-radius 6px, padding 12px
- Badges: Solid background colors, border-radius 4px, padding 4px vertical, 8px horizontal
- Progress Bars: Height 4px, gradient fill, border-radius 2px

**Animation Timing**:
- Fast: 150ms ease - Hover effects
- Medium: 200ms ease - State changes
- Slow: 300ms ease - Page transitions

```

This design system documentation provides all the tokens needed for generating consistent screens in the same visual language.
