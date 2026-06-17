# Maya Design System - Quick Reference Guide

## Color Quick Reference

```
Cream:   #EFE4D2  RGB(239, 228, 210)  [Background, Light Areas]
Ink:     #1F1814  RGB(31, 24, 20)     [Text, Dark Areas]
Purple:  #5B47E0  RGB(91, 71, 224)    [Accent, Actions, Primary]
Gold:    #CCAA33  RGB(204, 170, 51)   [Success, Completed, Rewards]
Navy:    #1A3366  RGB(26, 51, 102)    [Footer, Navigation, Dark Sections]
```

## Page Dimensions Quick Reference

| Page | Width | Height | Use Case |
|------|-------|--------|----------|
| Landing Desktop | 1440px | 3600px | Full-width desktop browser |
| Landing Mobile | 375px | 4500px | Mobile phone (iPhone 12/13) |
| Calendar Desktop | 1200px | 800px | Dashboard view |
| Calendar Mobile | 375px | 1200px | Mobile app view |

## Font Sizes

```
Hero Title:        80px (DM Serif Display)
Section Headers:   48px (DM Serif Display)
Subheaders:        32px (DM Serif Display)
Card Titles:       20px (Geist Bold)
Body Text:         18px (Geist Regular)
Small Text:        16px (Geist Regular)
Caption:           14px (Geist Regular)
Code/Mono:         14px (Geist Mono)
```

## Layout Spacing

```
Section Padding:      60px (desktop) / 20px (mobile)
Card Gap:             20px
Element Margin:       16px
Small Gap:            8px
Micro Gap:            4px
```

## Component Sizes

**Feature Cards:**
- Desktop: 300px × 200px
- Mobile: 340px × 150px

**Metric Cards:**
- Desktop: 320px × 150px
- Mobile: 330px × 100px

**Mission Cards:**
- Desktop: 500px × 100px
- Mobile: 330px × 70px

**Trail Nodes:**
- Desktop: 40px diameter
- Mobile: 35px diameter

**Buttons:**
- Standard CTA: 300px × 60px
- Mobile Nav: 375px ÷ 4 width

## Section Order (Landing Page)

1. Hero Section
2. Don't Have To Section
3. Meet Maya Section
4. Why Features Section (3 cards)
5. Benefits Section (3 metrics)
6. Perks Section (Leaderboard + Prize)
7. Marquee Section
8. Manifesto Section
9. Footer Section

## Calendar Components

**Desktop Layout:**
- Left Panel (600px): Trail Map with 7-day visualization
- Right Panel (600px): Today's Missions (3 cards)

**Mobile Layout:**
- Trail Map Section (400px height)
- Missions Section (350px height)
- Bottom Navigation (150px height)
- Maya Bubble Dialog (floating, 200px height)

## State Colors

```
Active/Current:    Purple (#5B47E0)
Completed:         Gold (#CCAA33)
Pending:           Light Purple (opacity 0.15)
Disabled:          Gray (opacity 0.5)
Success:           Gold (#CCAA33)
Error:             Red (recommend #E74C3C)
Info:              Navy (#1A3366)
```

## Typography Pairing Examples

**Headlines:**
- DM Serif Display Bold, 48px, Ink color

**Subheaders:**
- Instrument Serif Regular, 32px, Ink color

**Body Copy:**
- Geist Regular, 18px, Ink color

**Call-to-Action:**
- Geist Bold, 18px, Cream on Purple background

**Card Titles:**
- Geist Bold, 20px, Ink color

**Labels:**
- Geist Regular, 14px, Ink color (opacity 0.7)

## Layer Organization Template

```
Page
├── Canvas Background
├── [Section Name]
│   ├── Section Background
│   ├── [Component 1]
│   │   ├── Background
│   │   ├── Icon
│   │   └── Text
│   ├── [Component 2]
│   └── [Component N]
└── [Next Section]
```

## Naming Convention

**Frames:** `[Page Name] - [Section Name] - [Component Type]`
- ✅ Landing Desktop - Hero - Title
- ✅ Calendar Mobile - Trail Map - Day Node
- ✅ Landing Desktop - Features - Card

**Text Layers:** `Text - [Description]`
- ✅ Text - Hero Title
- ✅ Text - Card Description
- ✅ Text - CTA Button

**Shapes:** `Shape - [Description]`
- ✅ Shape - Background Rectangle
- ✅ Shape - Day Node Circle
- ✅ Shape - Divider Line

## Common Interactions (Prototyping)

1. **Button Hover:** Scale 105% or change opacity
2. **Card Hover:** Add drop shadow or lift effect
3. **Navigation:** Slide or fade between pages
4. **Mission Completion:** Toggle gold fill on node
5. **Dialog:** Fade in/out over page

## Export Settings

**For Web:**
- Format: SVG or PNG
- Scale: 2x for high DPI
- Export all components individually

**For Mobile:**
- Format: PNG
- Scale: 3x for mobile devices
- Include transparent backgrounds

**For Development:**
- Format: SVG (vector)
- Scale: 1x
- Remove all Figma-specific data

## Accessibility Checklist

- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Text contrast ratio ≥ 3:1 (large text)
- [ ] Button size ≥ 44×44px (mobile touch target)
- [ ] Color not sole indicator of information
- [ ] Font size ≥ 14px for body text
- [ ] Line height ≥ 1.5 for readability
- [ ] Focus states clearly visible
- [ ] Semantic heading structure (H1 → H2 → H3)

## Performance Tips

- Keep component count reasonable (< 200 active)
- Archive unused versions
- Use symbols/components for repeated elements
- Minimize transparent/blurred effects
- Use consistent naming for easy searching
- Regularly clean up unused colors/styles

## File Size Management

- **Target:** < 50MB
- Remove unused assets regularly
- Archive old prototype versions
- Compress imported images
- Clean up unused layers and components

## Testing Checklist

Before handoff to development:
- [ ] All text is readable (check for overlaps)
- [ ] Colors match specification
- [ ] Spacing is consistent
- [ ] Components are properly grouped
- [ ] Naming is clear and organized
- [ ] Responsive layouts work on both sizes
- [ ] No broken links or missing assets
- [ ] All fonts are available/embedded

## Quick Links for Development

**Color Values:**
```css
--color-cream: #EFE4D2;
--color-ink: #1F1814;
--color-purple: #5B47E0;
--color-gold: #CCAA33;
--color-navy: #1A3366;
```

**Spacing Scale:**
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 48px;
--spacing-xxl: 60px;
```

**Breakpoints:**
```css
--breakpoint-mobile: 375px;
--breakpoint-tablet: 768px;
--breakpoint-desktop: 1200px;
--breakpoint-wide: 1440px;
```

## Collaboration Notes

1. **Comments:** Add design decisions and rationale
2. **Versions:** Maintain clear version history
3. **Sharing:** Use public/team links for feedback
4. **Handoff:** Export detailed specs for development
5. **Iteration:** Archive previous versions before major changes

---

**Created:** 2026-06-07
**Status:** Ready for Implementation
