---
name: TaskFlow
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d2c4b8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9b8f84'
  outline-variant: '#4f453c'
  surface-tint: '#e6c098'
  primary: '#e6c098'
  on-primary: '#432c0f'
  primary-container: '#ae8c68'
  on-primary-container: '#3d260a'
  inverse-primary: '#765939'
  secondary: '#c9c5c7'
  on-secondary: '#313032'
  secondary-container: '#484648'
  on-secondary-container: '#b8b4b6'
  tertiary: '#e4c098'
  on-tertiary: '#422c0f'
  tertiary-container: '#ad8d68'
  on-tertiary-container: '#3c270b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddba'
  primary-fixed-dim: '#e6c098'
  on-primary-fixed: '#2b1701'
  on-primary-fixed-variant: '#5c4223'
  secondary-fixed: '#e6e1e3'
  secondary-fixed-dim: '#c9c5c7'
  on-secondary-fixed: '#1c1b1d'
  on-secondary-fixed-variant: '#484648'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#e4c098'
  on-tertiary-fixed: '#2a1701'
  on-tertiary-fixed-variant: '#5b4223'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is anchored in a high-end, monochromatic aesthetic designed for high-focus task management. The brand personality is sophisticated, disciplined, and calm, evoking the feeling of a premium physical atelier rather than a cluttered digital workspace. 

The visual style is a fusion of **Minimalism** and **Glassmorphism**. By prioritizing heavy whitespace and a restricted color palette, the UI recedes to let the user’s work take center stage. Subtle frosted-glass layers and translucent surfaces are used sparingly to create a sense of physical depth and modern refinement, ensuring the interface feels airy despite its dark-mode foundation.

## Colors

The palette is built on a dark, "ink-pool" foundation to reduce eye strain and promote deep work. 

- **Primary (Bronze):** Used for key actions, progress indicators, and highlights. It provides a warm, luxury contrast to the cool grays.
- **Secondary (Charcoal):** Used for structural elements, non-critical buttons, and secondary navigation.
- **Tertiary (Muted Gold):** Reserved for warning states or high-priority markers, maintaining the warm metallic theme.
- **Neutral/Surface:** The background is a true dark charcoal (#121212), while surfaces use a slightly lifted gray (#1E1E1E) to define hierarchy without harsh lines.

## Typography

The design system utilizes **Inter** exclusively to maintain a clean, systematic feel. The typographic scale relies on subtle weight changes and generous line heights to ensure legibility. 

Display and headline levels use tighter letter spacing and semi-bold weights for an authoritative, "editorial" look. Body text is kept open and rhythmic to facilitate scanning long lists of tasks. Labels and small metadata use increased letter spacing and occasionally uppercase styling to create clear visual distinctions between "content" and "UI controls."

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for desktop to prevent content from becoming overly stretched on ultra-wide monitors, maintaining a "focused" column for task management. 

- **Grid:** A 12-column grid with 24px gutters.
- **Margins:** Desktop margins are generous (40px) to enhance the "airy" feel. On mobile, these contract to 16px.
- **Rhythm:** An 8px linear scale governs all padding and margins. Use larger increments (32px, 48px, 64px) to separate major sections, creating a sense of luxury through "wasted" space.
- **Reflow:** On mobile, sidebars collapse into a bottom navigation bar or a full-screen modal overlay to keep the workspace uncluttered.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Glassmorphism** rather than traditional heavy shadows.

- **Background:** The lowest layer (#121212).
- **Surface:** Modal backgrounds and card containers use #1E1E1E.
- **Glassmorphism:** Navigation bars and floating action panels use a backdrop-filter (blur: 12px) with a 60% opacity fill of the surface color.
- **Outlines:** Instead of shadows, use 1px "ghost borders" (Secondary color at 20% opacity) to define element edges. This keeps the UI looking crisp and architectural. 
- **Shadows:** When necessary for high-intensity overlays, use long, soft ambient shadows with 0% spread and very low opacity (10-15%) tinted with the Primary bronze color to add warmth.

## Shapes

The shape language is defined by a "Rounded" (Level 2) approach, leaning into a modern, friendly but professional appearance. 

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Large Containers:** Cards and modals use a 1rem (16px) or 1.5rem (24px) radius to create a soft, protective feel for user content.
- **Interactive States:** Hover states should not change the border radius but may subtly increase the stroke weight of the ghost borders.

## Components

### Buttons
- **Primary:** Solid Bronze (#ae8c68) with dark text. No shadows.
- **Secondary:** Deep Charcoal (#4a484a) with white text and a subtle 1px border.
- **Ghost:** Transparent background with Primary color text, used for low-emphasis actions.

### Cards
Cards are the primary container for tasks. They should feature a subtle 1px border (#4a484a at 30% opacity). For premium dashboards, cards utilize a glassmorphic background blur to create depth over background gradients or blurred images.

### Input Fields
Inputs are minimalist: a simple bottom-border or a very subtle filled container with no top or side borders. On focus, the bottom border transitions to the Primary Bronze.

### Chips & Tags
Used for task categories. These should be small, semi-transparent charcoal capsules with 12px labels. Active tags utilize a low-opacity Bronze fill with high-opacity Bronze text.

### Icons
Use **Minimalist Line Icons** (1.5px stroke width). Icons should always be the same color as the text they accompany. Avoid filled icons unless indicating an "active" or "selected" state.

### Checkboxes
Custom-styled squares with a 4px radius. When checked, they fill with the Primary color and show a minimalist white checkmark. The task text associated with a checked box should transition to a 50% opacity strikethrough.