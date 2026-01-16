# Design Brief: Website Container for Canvas

## Overview

A website container architecture that holds the body and content of the site, using the existing canvas as the primary interactive experience. The landing experience should invite users into the content through wikilinks embedded in body text, with clear zones for static vs dynamic content.

---

## Design Principles (from Reference Analysis)

### 1. Dichotomy of Zones
**Source: Spector Books**

The site should have clearly defined zones where users understand:
- **Where things remain stable** - navigation, identity, context
- **Where to expect updates/activity** - the canvas, dynamic content

This prevents users from having to "search through a website to find something alive."

### 2. Physicality & Object Presence
**Source: FUPE, A Possible**

Content should feel like **real objects with weight and edges**:
- Photographs/images staged as physical artifacts
- Cards with shadows, depth, and believable materiality
- **Warning**: Don't break the metaphor (A Possible's z-index on hover breaks the physical stack illusion - avoid this)

### 3. Bounded Spatial Viewing
**Source: Whispers Game**

Users should be able to see the **totality of a collection** at once:
- Macro view (overview) → Micro view (detail)
- **No infinite scroll** - the bounded nature creates anticipation and understanding
- Chain/sequence context preserved when viewing detail

### 4. Selective Information Layers
**Source: Julijonas Urbonas**

Allow users to **control their stimulus level** without overwhelming customization:
- Toggle visibility of different content types (images, text, keywords)
- "Ordered chaos" - break expectations while remaining grounded
- Information hierarchy through typography variation

### 5. Immediate Content
**Source: Tank TV**

The landing IS the content - no splash pages:
- "Straight in there"
- Most recent/featured content immediately visible
- **No autoplay** (you noted this as a frustration)

### 6. Non-Trite Categories
**Source: A Possible, Tank TV**

Move away from standard website categories (About, Pricing, Join Us):
- Use meaningful, content-specific groupings
- Categories that reflect the actual nature of the work

---

---

## Landing Experience

### Opening State
1. **Visual opening** - A graphic (static or moving) as the entry point
2. **Short body of text** - The "invitation" to the content
3. **Wikilinks within body text** - Links to other parts appear as words in prose, not as a nav menu
4. **Opt-in to text** - Progressive disclosure, not information overload

### Example Landing Copy Structure
```
[Graphic/Visual]

Welcome to [project name]. This is a space for
[[slow-reading|reading slowly]], for exploring
connections between [[things]] and [[ideas]].

Here you'll find reflections on [[silence]],
[[attention]], and the way [[knowledge]] moves
through networks.

Click any linked word to begin.
```

### "Headline" Cards Discovery
Users shouldn't have to search through content to find key entry points:
- Navigation container provides quick access to featured/important cards
- These are the "stable" reference points (like Spector's team photo)
- Canvas contains the full interconnected content

---

## Card Behaviors

### Opening a Card
Cards can be opened in two modes:
1. **In-canvas** - Opens within the current canvas, linked to parent context (current behavior)
2. **Dedicated canvas** - Opens in its own page/canvas, standalone (new)

### Transition Quality
**From Whispers Game**: Transitions should not be "frantic"
- Smooth, predictable animations
- Always show context (where you came from, where you're going)
- Bounded viewing - see neighboring content

---

## Visual Design Direction

### Typography
From your references, favor:
- **Varied letter-spacing** for hierarchy (Urbonas)
- **Serif for body** (readability, existing MVP uses Georgia)
- **Bold sans for navigation/labels**

### Color
Based on existing MVP and references:
- Warm neutral backgrounds (#f5f3f0)
- Strong B/W contrast for dichotomy (Spector, FUPE)
- Color as accent/framing, not decoration

### Layout Principles
- **Dichotomy**: Split zones with clear purpose
- **Physicality**: Shadows, edges, depth
- **Bounded totality**: See the whole at overview level
- **Progressive disclosure**: Reveal detail on interaction

---

## What NOT to Do

1. **Don't break physical metaphors** - If cards stack, they stay stacked (no hover-to-front)
2. **Don't autoplay anything** - Respect user consent
3. **Don't use trite categories** - No "About/Contact/Services"
4. **Don't infinite scroll** - Keep collections bounded and comprehensible
5. **Don't over-customize** - Simple toggles, not preference overload
6. **Don't hide the canvas behind a landing page** - It should be visible immediately or one click away

---

## Existing MVP Assets to Leverage

The current codebase already has:
- **SVG canvas with D3 zoom/pan** (`Canvas.svelte`)
- **Card rendering with foreignObject** (`NoteCard.svelte`)
- **Wikilink parsing** (`markdown.ts`) with `[[target|display]]` syntax
- **Pathfinding for connection lines** (`pathfinding.ts`)
- **Chain navigation** (active chain model)
- **Two-click focus** (focus first, pan second)
- **PWA support** for offline access
- **Dark/light themes**

---

## Questions to Resolve

1. **Landing graphic** - What visual represents the project? Static image? Animation? Video?
2. **Headline cards** - Which notes are the "entry points" that should be easily discoverable?
3. **Dedicated canvas mode** - When should a card open in its own canvas vs in the shared canvas?
4. **Static zone content** - What goes in the "stable" part of the dichotomy? (Team? Mission? Contact?)
5. **Dynamic zone** - What signals "what's new since I was last here"?
6. **Geofencing** - Is the "Berlin-only results" idea still relevant? How to implement locality?

---

## Reference Sites Summary

| Site | Key Pattern | What We Like | What to Avoid |
|------|-------------|--------------|---------------|
| Spector Books | Dichotomy | Live vs static zones, clear update areas | - |
| FUPE | Physicality | Object presence, tactile feeling | - |
| Whispers Game | Spatial carousel | Bounded totality, smooth transitions | Frantic transitions |
| Urbonas | Selective filtering | Ordered chaos, info layers | Broken filters |
| A Possible | Card stacks | Physical metaphor, unique categories | Z-index breaking stack |
| Bauhaus Atlas | Light table | Dark + floating objects, faceted filters | Complex filter UI |
| Tank TV | Immediate content | Straight in, content is interface | Autoplay |
| Consumed Today | Pure data | Radical minimalism | (Just love it, no application) |

---

## Next Steps

1. [ ] Define the landing graphic/visual treatment
2. [ ] Identify 3-5 "headline" cards for easy discovery
3. [ ] Design the navigation container layout
4. [ ] Prototype the dichotomy (static/dynamic zones)
5. [ ] Add dedicated canvas mode for standalone card viewing
6. [ ] Implement "what's new" indicator

---

## Acceptance Criteria

### Landing Experience
- [ ] Opening graphic visible immediately
- [ ] Body text with wikilinks as navigation
- [ ] One-click access to headline cards
- [ ] Clear dichotomy between static and dynamic zones

### Navigation Container
- [ ] Always accessible navigation to key content
- [ ] Does not obscure canvas when open
- [ ] Shows "what's new" indicator if applicable

### Card Modes
- [ ] Cards can open in-canvas (existing)
- [ ] Cards can open in dedicated canvas (new)
- [ ] Transitions are smooth, not frantic

### MVP Quality Bar
- [ ] No autoplay on any media
- [ ] Physical metaphors maintained consistently
- [ ] Bounded collections (no infinite scroll)
- [ ] Progressive disclosure (opt-in to detail)
