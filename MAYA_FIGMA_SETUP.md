# Maya - Landing & Calendar Design System
## Complete Figma Setup Guide

### File Structure Overview

This design system creates a complete Figma file with 4 pages for Maya's landing page and calendar application.

---

## Pages Created

### 1. **Landing Page - Desktop** (1440px width)
Responsive desktop layout with the following sections:
- **Hero Section** - Large title "Maya" with tagline
- **Don't Have To Section** - Value proposition messaging
- **Meet Maya Section** - Product introduction
- **Why Features** - 3 feature cards (Personalized Missions, Community Challenges, AI-Powered Insights)
- **Benefits Section** - 3 metrics (92% Completion Rate, 1.5M+ Missions Completed, 50K+ Active Users)
- **Perks Section** - Leaderboard preview and Prize showcase
- **Marquee Section** - Animated text section with key messages
- **Manifesto Section** - Mission statement on dark background
- **Footer Section** - Call-to-action button with start journey message

**Dimensions:** 1440px × 3600px

### 2. **Landing Page - Mobile** (375px width)
Mobile-optimized responsive version with same sections but:
- Single column layout
- Optimized typography sizes
- Touch-friendly spacing
- Adapted for vertical scrolling

**Dimensions:** 375px × 4500px

### 3. **Calendar Page - Desktop** (1200px width)
Dual-panel dashboard layout:
- **Left Panel (600px)** - Trail Map visualization
  - "Your Trail" heading
  - Day nodes showing progress (7 days visible)
  - Current day indicator (purple node)
  - Completed days (gold nodes)
- **Right Panel (600px)** - Mission Cards
  - "Today's Missions" heading
  - Mission card grid with 3 mission items
  - Each card shows mission name and completion status

**Dimensions:** 1200px × 800px

### 4. **Calendar Page - Mobile** (375px width)
Mobile dashboard with stacked layout:
- **Trail Map Section** (375px × 400px) - Compact 5-day trail visualization
- **Missions Section** (375px × 350px) - 2 mission cards stacked
- **Bottom Navigation** (375px × 150px) - Mobile navigation bar with Home, Trail, Leaderboard, Profile
- **Maya Bubble Dialog** (300px × 200px) - AI assistant encouragement message

**Dimensions:** 375px × 1200px

---

## Color Palette

| Color | RGB Values | Hex Code | Usage |
|-------|-----------|----------|-------|
| **Cream** | (239, 228, 210) | #EFE4D2 | Primary background, light text areas |
| **Ink** | (31, 24, 20) | #1F1814 | Primary text, dark sections |
| **Purple** | (91, 71, 224) | #5B47E0 | Accent color, primary UI, current day indicator |
| **Gold** | (204, 170, 51) | #CCAA33 | Success states, completed tasks, rewards |
| **Navy** | (26, 51, 102) | #1A3366 | Dark sections, footer, navigation |

---

## Typography System

### Font Families
1. **DM Serif Display** - Headlines, hero text (elegant serif)
2. **Geist** - Body text, UI copy (clean sans-serif)
3. **Geist Mono** - Code blocks, data display (monospace)
4. **Instrument Serif** - Feature titles, secondary headers (serif)

### Suggested Sizing
- **Hero Title:** 80px (DM Serif Display)
- **Section Headers:** 48px (DM Serif Display)
- **Card Titles:** 20px (Geist Bold)
- **Body Text:** 16-18px (Geist Regular)
- **Small Text:** 14px (Geist Regular)

---

## Component Structure

### Landing Page Components

#### Section Container
- White/Cream background frames
- 1440px width (desktop) / 375px width (mobile)
- Consistent padding: 60px (desktop) / 20px (mobile)
- Auto-layout with vertical stacking

#### Feature Cards (Why Section)
- Dimensions: 300px × 200px (desktop)
- Purple background with transparency (opacity 0.15)
- Centered text content
- Hover state: Increase opacity to 0.25

#### Metric Cards (Benefits Section)
- Dimensions: 320px × 150px (desktop)
- Light purple background (opacity 0.1)
- Value in large purple text (40px)
- Label below in regular ink color

#### CTA Button
- Dimensions: 300px × 60px
- Purple background with white/cream text
- Hover state: Darken purple or add drop shadow

### Calendar Page Components

#### Trail Node
- Circular element (35-40px diameter)
- Purple for current/active day
- Gold for completed days
- Gray/transparent for future days
- Positioned in horizontal line

#### Mission Card
- Dimensions: 500px × 100px (desktop) / 330px × 70px (mobile)
- Light purple background with transparency
- Card shadow on desktop
- Stack vertically with 20px gap

#### Bottom Navigation Bar
- Full width (375px mobile)
- Navy/dark background
- 4 equal-width nav items
- Icons recommended above text labels

---

## Setup Instructions

### Method 1: Using the Provided Script

1. **Open Figma**
2. **Create a new file** named "Maya - Landing & Calendar Design System"
3. **Open the Developer Console** (Ctrl+Shift+J on Windows/Linux, Cmd+Shift+J on Mac)
4. **Copy and paste** the contents of `maya-figma-setup.js`
5. **Press Enter** to execute
6. The script will create all 4 pages with their content

### Method 2: Manual Setup

1. **Create File:** "Maya - Landing & Calendar Design System"
2. **Create Pages:** Create 4 pages with exact names listed above
3. **Set Page Sizes:**
   - Landing Desktop: 1440 × 3600
   - Landing Mobile: 375 × 4500
   - Calendar Desktop: 1200 × 800
   - Calendar Mobile: 375 × 1200
4. **Create Color Styles:**
   - Add each color from the palette above as a color style
   - Make them available to all layers
5. **Create Frames for Sections:**
   - Create frames for each section as described above
   - Use consistent naming convention: "[Section Name] - [Page Type]"
6. **Add Text Content:**
   - Use typography guidelines provided
   - Apply color styles to text
7. **Build Components:**
   - Convert repeated elements (cards, buttons) into components
   - Create variants for different states

---

## Design Tokens & Variables (Recommended)

Create design variables in Figma for:

### Colors (Collection: "Maya Colors")
- **Cream** - Primary Background
- **Ink** - Primary Text
- **Purple** - Accent / Primary Actions
- **Gold** - Success / Rewards
- **Navy** - Dark Sections / Navigation

### Spacing (Collection: "Maya Spacing")
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 48px
- **xxl:** 60px

### Sizing (Collection: "Maya Sizing")
- **sm:** 300px
- **md:** 375px
- **lg:** 600px
- **xl:** 1200px
- **full:** 1440px

---

## Editing & Customization

### Adding New Sections
1. Duplicate an existing section frame
2. Update the content and naming
3. Adjust positioning if needed
4. Apply consistent styling from design tokens

### Updating Colors
1. Use Color Styles consistently
2. Update the style definition to change everywhere
3. Or use Design Variables for more dynamic control

### Responsive Adjustments
1. Desktop sections can use fixed widths (1440px, 1200px)
2. Mobile sections constrained to 375px
3. Use auto-layout for flexible content
4. Stack items vertically on mobile instead of horizontal grids

### Adding Interactions (Prototyping)
1. Connect button elements to screens
2. Add transitions between pages
3. Prototype mobile navigation flows
4. Test scroll behavior on long pages

---

## Best Practices

1. **Use Components** - Convert repeated elements into components with variants
2. **Organize Layers** - Use descriptive naming and group related elements
3. **Maintain Consistency** - Always use defined colors, fonts, and spacing
4. **Version Control** - Save major iterations with timestamps or version numbers
5. **Document Changes** - Add notes about design decisions in file comments
6. **Test Responsiveness** - Verify all pages display correctly at stated dimensions
7. **Performance** - Keep file size manageable by cleaning up unused elements

---

## File Access & Sharing

Once created, the file will be located in your Figma workspace:
- **File Name:** Maya - Landing & Calendar Design System
- **Team:** [Your Team]
- **Access:** Shareable via link or team permissions
- **Collaboration:** Enable comments and version history

---

## Next Steps

1. ✅ Create the file using provided script or manual setup
2. ⬜ Add detailed content to each section
3. ⬜ Create high-fidelity mockups and wireframes
4. ⬜ Build interactive prototypes
5. ⬜ Export assets for development
6. ⬜ Establish design handoff documentation
7. ⬜ Set up Code Connect for component mapping

---

## Resources

- **Figma Documentation:** https://help.figma.com
- **Design System Best Practices:** https://www.designsystems.com
- **Typography Resources:** https://fonts.google.com
- **Color Theory:** https://www.interaction-design.org/literature/article/color-theory

---

## Support

For questions or issues with this design system:
1. Check the Figma file for inline comments
2. Review this documentation
3. Test with provided script
4. Export design specs for stakeholder review

---

**Last Updated:** 2026-06-07
**Version:** 1.0
**Status:** Complete Framework Ready for Content Implementation
