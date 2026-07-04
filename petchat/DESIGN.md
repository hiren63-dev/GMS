# BuddyDesk GMS — Design System

**Mode:** `crm-app` (daily-use internal tool)  
**Reference:** Linear (primary, ~85%) + Attio (secondary, ~15% CRM-record patterns)  
**Paradigm:** Restraint doctrine — nothing above 300ms, keyboard-triggered actions animate near-instantly, optimistic UI everywhere

---

## 1. Color Palette

All colors are CSS custom properties, computed once at the `:root` level and inherited throughout. Dark mode is **generative** (not hand-picked) — computed from the text color at specific opacity levels.

### Light Mode
- `--bg`: #FFFFFF (page background)
- `--surface`: #FAFAF9 (cards, surfaces)
- `--surface2`: #F5F5F4 (secondary surface, input backgrounds)
- `--text`: #1F2937 (primary text)
- `--text-muted`: #6B7280 (secondary text, 55% opacity of text-rgb)
- `--text-faint`: #D1D5DB (tertiary text, lightest)
- `--border`: rgba(31, 41, 55, 0.08) (text-tinted, 8% opacity)
- `--text-rgb`: 31, 41, 55 (used to derive all opacity-based colors)

### Dark Mode
- `--bg`: #0F0F0E (page background)
- `--surface`: #1A1A19 (cards, surfaces)
- `--surface2`: #272726 (secondary surface, input backgrounds)
- `--text`: #F3F4F6 (primary text)
- `--text-muted`: #9CA3AF (secondary text, 55% opacity of text-rgb)
- `--text-faint`: #4B5563 (tertiary text, lighter than background but subdued)
- `--border`: rgba(239, 239, 239, 0.10) (text-tinted, 10% opacity)
- `--text-rgb`: 239, 239, 239 (used to derive all opacity-based colors)

### Accent Colors (One Job Each)
- **Blue** (#2563EB): Primary actions, links, selected states
- **Purple** (#7C3AED): OKR/strategic features, secondary CTA
- **Green** (#16A34A): Success, completed states, positive signals
- **Red** (#DC2626): Destructive actions, errors, warnings
- **Amber** (#CA8A04): Caution, in-progress states

### Exceptions
- **founder-gradient**: `linear-gradient(135deg, #7C3AED, #2563EB)` — single sanctioned two-hue exception, used for founder dashboard hero text only

## 2. Typography

**Font Family Stack:**
- **Body text**: `'Inter Variable'` (Google Fonts, optical sizing via font-variation-settings)
- **Headings**: `'Inter Display'` (Google Fonts, intentional secondary typeface for hierarchy separation)
- **Data / Monospace**: `'JetBrains Mono'` (Google Fonts, 10–12px for passwords, IDs, timestamps)

**Scale (modular, ~1.25 ratio):**
- **Heading 1**: 28px, 700 weight, line-height 1.2
- **Heading 2**: 24px, 700 weight, line-height 1.2
- **Heading 3**: 18px, 600 weight, line-height 1.3
- **Body**: 14px, 400 weight, line-height 1.5
- **Caption / Label**: 12px, 500 weight, line-height 1.4
- **Monospace**: 11–12px, 400 weight, line-height 1.4

**Hierarchy Rules:**
- Use **size + color** for hierarchy, never bold body text
- Bold only headings and labels
- Font-weight restraint: 400 (regular), 500 (labels), 600 (subheadings), 700 (headings only)

## 3. Spacing & Layout

**8pt Scale (4px base unit):**
- 4px — icon gaps, tight spacing
- 8px — input padding vertical, small margins
- 12px — input padding horizontal, component padding
- 16px — card padding, section margins
- 20px — large card padding
- 24px — page padding, major section spacing
- 32px — between major sections
- 48px — hero/page-top spacing

**Actual Adjustments Applied:**
- **stat-card**: `16px 20px` padding (was 16px 18px)
- **input**: `8px 12px` padding (was 9px 14px)
- **toast**: `8px 20px` padding (was 10px 20px)

**Grid & Layout:**
- Use CSS Grid for multi-column layouts (e.g., dashboard stats 2–4 columns responsive)
- Flex for component composition (row, wrap, gap-based)
- Max-width: none on page containers (full bleed into 24px page padding)

## 4. Components

### Buttons
- **Primary**: Blue background, white text, 8px radius
- **Secondary**: surface2 background, text-muted, 8px radius
- **Hover state**: 10% darker background, subtle scale (no transform)
- **Disabled**: 50% opacity
- **Size**: 36–40px height (input-compatible)

### Cards
- **Border**: 1px solid var(--border)
- **Radius**: 12px (was 10px, updated to 6/12/full ratio)
- **Padding**: 16px–20px
- **Hover**: optional background: var(--bg) on light backgrounds only
- **Box-shadow**: none (reserved for true overlays/modals only)

### Inputs / Textareas
- **Border**: 1px solid var(--border)
- **Radius**: 6px (6/12/full ratio — smallest for inputs)
- **Padding**: 8px 12px
- **Background**: var(--surface2)
- **Focus**: border-color #2563EB, no box-shadow (restraint)
- **Disabled**: opacity 0.5, cursor not-allowed

### Badges
- **Radius**: 9999px (pill shape, fullness)
- **Padding**: 2px 8px (tight, label-sized)
- **Background**: surface2 or color-tinted (e.g., text-blue-400 for blue badges)
- **Font-size**: 11px, font-weight 600

### Modals
- **Backdrop**: rgba(0, 0, 0, 0.4) fixed overlay
- **Position**: fixed, inset 0, zIndex 300
- **Card**: background var(--surface), border 1px var(--border), radius 12px, padding 24–28px
- **Width**: 400–560px depending on content density
- **Max-height**: 85vh with overflowY: auto for long forms
- **Box-shadow**: `0 20px 60px rgba(0,0,0,0.2)` (only overlay gets shadow)
- **Animation**: `fadeIn 150ms ease` on entry (one-shot, no loop)

### Tables
- **Header**: background var(--bg), border-bottom 1px var(--border)
- **Rows**: border-bottom 1px var(--border), hover: background var(--bg) (optional)
- **Font-size**: 13px body, 11px headers (uppercase, small caps optional)
- **Padding**: 10–14px per cell

## 5. Motion & Animation

**Timing Scale:**
- **150ms**: modal/panel entry (fadeIn)
- **300ms**: hover states, transitions (max for CRM restraint)
- **600ms**: progress bars, multi-value updates
- **never**: infinite loops, scroll-triggered animations, WebGL

**Easing:**
- **ease** (cubic-bezier(0.25, 0.46, 0.45, 0.94)): default
- **ease-in-out**: smooth, natural feel

**Implementation:**
- Use **explicit-property transitions** (background-color, border-color, box-shadow, transform) — never `transition: all`
- Button hover: `background-color 300ms ease`
- Input focus: `border-color 300ms ease`
- Progress bar: `width 600ms ease-in-out`

**Accessibility:**
- Respect `prefers-reduced-motion: reduce` globally — disable all animations if flag set
- Recording/mic pulse animation guarded by prefers-reduced-motion check

## 6. Voice & Tone

**Persona:** Warm, professional, clarifying (not assuming)

**Terminology:**
- "Tasks" not "to-dos"
- "Objectives" (OKRs) not "goals"
- "Check-in" (daily accountability) not "standup"
- "Screentime" not "work hours" (less judgmental)
- "Key Results" not "milestones"

**Copy Style:**
- Clear, action-oriented labels ("Post Announcement" not "Send")
- Confirm destructive actions ("Remove X from the team?")
- Clarify ambiguous voice input (ask for options, don't guess)
- Use person's nickname if they have one (from team-context.json persona)

## 7. Brand Identity

### Logo
- Monogram "B" (18px, white on blue gradient background) in top-left
- Full logo "BuddyDesk" on auth screens
- No logo on every page (restraint)

### Iconography
- **Icon set**: Lucide (stroke-based, 15px, 2px stroke)
- **Never mix**: Lucide + emoji in the same UI chrome
- **Emoji usage**: Limited to section headers and mood/sentiment (⚡ Live Activity, 🎯 OKRs, etc.)
- **Avatars**: Dark background (#111) with white initials, status dot (online/idle/offline)

### Color Usage in Icons
- Icons inherit `currentColor` (text color by default)
- Active state: #2563EB (blue)
- Hover state: var(--text) (primary text)
- Disabled: var(--text-muted) (secondary text)

## 8. Anti-Patterns

❌ **Never:**
- WebGL, GSAP scroll-hijacking, custom shaders (this is a daily-use tool, not a portfolio)
- Infinite/looping animations (play once, settle)
- `transition: all` (use explicit properties only)
- More than one accent color per action (one job per color)
- Hand-picked light + dark palettes (compute dark from text color)
- Font-weight for body-text hierarchy (use size + color)
- Shadows on every card (shadow reserved for true overlays/modals)
- Two competing states shown at once (modal replaces inline, not stacks on top)
- Animations for keyboard-triggered actions (happen instantly or not at all)

## 9. Implementation Notes

**Tech Stack:**
- Vite + React 18
- Tailwind CSS (utility-first, extended with custom tokens in `petchat/src/index.css`)
- CSS custom properties (--var naming) for all tokens

**Token Location:**
- Primary: `petchat/src/index.css` (imported in App.tsx)
- Fallback: inline style props where Tailwind doesn't cover (modal overlays, absolute positioning)

**Component Import Pattern:**
- Pre-built Tailwind classes for common patterns (cards, buttons, inputs)
- Inline styles for color/spacing tokens (ensures consistency across all pages)
- Example: `style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}`

**Testing the System:**
- Preview via `npm run dev` in petchat/ (port 5173, autoPort fallback)
- Verify dark mode with browser's prefers-color-scheme toggle
- Check 300ms max animation speed via DevTools throttle
- Lighthouse Core Web Vitals should remain green (no 300ms+ animations on repeated actions)

---

## Design Decisions & Rationale

### Why Text-Tinted Borders?
Linear's approach: borders derive from text color at low opacity. This keeps the visual hierarchy consistent — darker text = darker borders, lighter text = lighter borders, without needing a separate "border" color. Computed at `:root`, inherited everywhere.

### Why 6/12/full Radius Ratio?
- **6px**: inputs, small components (fast, snappy feel)
- **12px**: cards, modals, standard surfaces (friendly, open)
- **9999px**: pills, badges (friendly accent)
This three-value system beats a single "8px everywhere" — each size serves a purpose.

### Why Modal Instead of Inline Stack?
Inline stacking (form above content) creates cognitive load: two competing visual hierarchies. A fixed-position modal is modal — it replaces the background, focuses attention, and feels decisive. Users don't scroll past a form mid-list; the form is *not* in the list.

### Why No Box-Shadow on Cards?
Shadows imply depth, which signals "floating" or "overlay." Cards are part of the content plane; they belong. Borders (via text-tinted color) are enough to separate them. Shadows are reserved for true overlays (modals, dropdowns) that float above content.

### Why Explicit-Property Transitions?
`transition: all` is slow to parse and can animate unexpected properties (e.g., font-size, padding on width-change). Explicit properties (background-color, border-color, transform) are fast and intentional.

---

## What This System Delivers

✅ **Consistency**: One token file, inherited everywhere  
✅ **Restraint**: Nothing above 300ms, no WebGL, no scroll-hijacking  
✅ **Warmth**: Typography pairs + generous spacing + calm color  
✅ **Accessibility**: Respects prefers-reduced-motion, high contrast borders, clear focus states  
✅ **Efficiency**: Pre-built patterns (modal, card, button) speed up feature work  
✅ **Dark mode**: Computed, not hand-picked — scales with theme

---

**Last Updated:** 2026-07-04  
**Version:** 1.0 (Discipline applied, live on Vercel)
