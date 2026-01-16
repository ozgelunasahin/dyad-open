# Best Practices Research: Canvas, Wikilinks, Cards, Iframes, Progressive Disclosure, Spatial UIs

This document compiles industry best practices, authoritative documentation, and implementation guidance for building modern spatial web interfaces.

---

## 1. Canvas-Based Web Interfaces

### Modern Approaches

Canvas-based interfaces are the foundation for infinite canvas applications like Figma, tldraw, Excalidraw, Miro, and similar tools.

#### Rendering Technology Choices

| Technology | Best For | Performance | Complexity |
|------------|----------|-------------|------------|
| Canvas 2D | Medium complexity, familiar API | Good | Low |
| SVG | Small element counts, accessibility | Moderate | Low |
| WebGL | High-performance, large datasets | Excellent | High |
| WebGPU | Future-proof, GPU acceleration | Best | Highest |

**Recommended approach**: Start with Canvas 2D or SVG for prototyping, move to WebGL for production performance.

> "While tldraw, excalidraw, and others generally use more user-friendly technologies like Canvas2D/SVG, Figma uses a tile-based rendering engine written in C++, compiled into WASM and then calls WebGL and WebGPU for rendering." - [Infinite Canvas Tutorial](https://github.com/xiaoiver/infinite-canvas-tutorial)

### Performance Best Practices

#### 1. Layering Strategy
Split your canvas into multiple layers:
- **Background layer**: Static content, rarely redrawn
- **Content layer**: Main interactive elements
- **UI layer**: Overlays, selection handles, cursors

```javascript
// Example: Multi-layer canvas architecture
const backgroundCanvas = document.getElementById('background');
const contentCanvas = document.getElementById('content');
const uiCanvas = document.getElementById('ui');
```

> "Drawing too many pixels to the same canvas at the same time will cause your frame rate to fall through the floor." - [MDN Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

#### 2. Batch Rendering
Group draw operations to minimize state changes:
- Track dirty regions and only redraw what changed
- Minimize `save()` and `restore()` calls
- Batch similar operations together

#### 3. OffscreenCanvas for Background Work
```javascript
const offscreen = new OffscreenCanvas(256, 256);
const ctx = offscreen.getContext('2d');
// Render complex elements once, then use as image
```

#### 4. Use requestAnimationFrame
```javascript
function render() {
  // Clear and redraw
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
```

### Library Recommendations

#### Konva.js (Recommended for 2D Canvas)
- **Documentation**: https://konvajs.org/
- **Context7 Library ID**: `/konvajs/site`
- High-performance 2D canvas with object model
- Built-in drag-and-drop, events, layering

```javascript
import Konva from 'konva';

const stage = new Konva.Stage({
  container: 'container',
  width: window.innerWidth,
  height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

const card = new Konva.Rect({
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fill: '#fff',
  stroke: '#ccc',
  strokeWidth: 1,
  draggable: true,
  cornerRadius: 8,
});

layer.add(card);
```

#### tldraw SDK (Recommended for Infinite Canvas)
- **Documentation**: https://tldraw.dev/
- **GitHub**: https://github.com/tldraw/tldraw
- React-based infinite canvas SDK
- "Normal React components all the way down"
- Multiplayer-ready architecture

#### Fabric.js
- **Documentation**: http://fabricjs.com/
- **Context7 Library ID**: `/websites/fabricjs`
- Object model for canvas
- SVG parsing and export

#### Three.js (For 2.5D/3D Spatial)
- **Documentation**: https://threejs.org/
- **Context7 Library ID**: `/mrdoob/three.js`
- Orthographic camera for 2D-like rendering with depth

```javascript
// Orthographic camera for 2D canvas-like rendering
const camera = new THREE.OrthographicCamera(
  0, window.innerWidth,
  window.innerHeight, 0,
  1, 2
);
camera.position.z = 1;
```

### Infinite Canvas Architecture

Key techniques from production apps:

1. **Virtual viewport**: Only render visible elements
2. **Spatial indexing**: Use quadtrees or R-trees for hit detection
3. **Level of detail (LOD)**: Simplify elements when zoomed out
4. **Tile-based rendering**: Pre-render tiles for background content

> "The infinite canvas showcases numerous examples ranging from design tools to creative boards, including Figma, Modyfi, Motiff, rnote, tldraw, excalidraw." - [Infinite Canvas Tutorial](https://github.com/xiaoiver/infinite-canvas-tutorial)

### Sources
- [MDN Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [AG-Grid Canvas Best Practices](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/)
- [HTML5 Canvas Tips GitHub Gist](https://gist.github.com/jaredwilli/5469626)
- [Infinite Canvas Tutorial](https://github.com/xiaoiver/infinite-canvas-tutorial)
- [Konva.js Documentation](https://konvajs.org/)
- [tldraw SDK](https://tldraw.dev/)
- [When to Use Canvas - LogRocket](https://blog.logrocket.com/when-to-use-html5s-canvas-ce992b100ee8/)

---

## 2. Wikilink Navigation Systems

### Bidirectional Links Implementation

Bidirectional links create a web of interconnected content where links work both ways automatically.

#### Historical Context

> "The concept dates back to 1945, when Vannevar Bush envisioned the Memex machine. Ted Nelson expanded on this in the 1960s, coining the term 'hypertext' and designing Project Xanadu." - [Maggie Appleton: A Short History of Bidirectional Links](https://maggieappleton.com/bidirectionals)

#### Why Single-Author Sites Can Use Bidirectionals

> "Most design issues with adding bidirectional links to the global web were related to moderation and permissions. However, adding them within the bounds of a single website with one author sidesteps that problem." - [Maggie Appleton](https://maggieappleton.com/bidirectionals)

### Implementation Approaches

#### 1. Build-Time Index Generation
Parse all content files and generate a backlinks index:

```javascript
// Build-time backlinks generation
const backlinksIndex = {};

function parseWikilinks(content, sourceFile) {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const target = match[1];
    if (!backlinksIndex[target]) {
      backlinksIndex[target] = [];
    }
    backlinksIndex[target].push(sourceFile);
  }
}
```

#### 2. Obsidian-Style Approach
- **Wikilinks**: `[[page-name]]` or `[[page-name|display text]]`
- **Backlinks pane**: Shows all pages linking to current page
- **Unlinked mentions**: Suggests potential links based on text matches

> "When you link Note A to Note B, Note B automatically shows a backlink to Note A. This feature is invaluable for creating a dynamic, interconnected knowledge base." - [Obsidian Help](https://help.obsidian.md/links)

#### 3. WikiRefs Library
- **GitHub**: https://github.com/wikibonsai/wikirefs
- Parse, process, and edit `[[wikirefs]]`
- Convert between wikilinks and markdown links

### Data Structure for Backlinks

```typescript
interface LinkIndex {
  // Forward links: page -> pages it links to
  outgoing: Map<string, Set<string>>;

  // Backlinks: page -> pages that link to it
  incoming: Map<string, Set<string>>;

  // Unlinked mentions: page -> pages mentioning it without linking
  mentions: Map<string, Set<string>>;
}
```

### WebMentions for Cross-Site Linking
For linking beyond a single site, WebMentions provide an opt-in protocol:
- W3C recommendation since 2017
- Notifications when your content is mentioned elsewhere
- Can display external backlinks on your pages

### Sources
- [Maggie Appleton: A Short History of Bidirectional Links](https://maggieappleton.com/bidirectionals)
- [WikiBonsai/Wikirefs](https://github.com/wikibonsai/wikirefs)
- [Obsidian Internal Links](https://help.obsidian.md/links)
- [W3C: Hypertext Design Issues](https://www.w3.org/DesignIssues/Topology.html)
- [Wikipedia: Towards Bidirectional Links](https://dl.acm.org/doi/abs/10.1145/3372923.3404841)

---

## 3. Card-Based UIs with Physical Metaphors

### Design Philosophy

> "The resemblance of Cards to the physical world makes them a great conceptual metaphor for which we can easily relate all sorts of manipulations." - [UI Patterns: Cards](https://ui-patterns.com/patterns/cards)

Cards leverage our understanding of physical objects:
- **Stacking**: Z-axis layering, depth shadows
- **Dragging**: Pick up, move, drop
- **Flipping**: Reveal back content
- **Swiping**: Dismiss, navigate

### Physical Metaphor Best Practices

#### Visual Design
- **Rounded corners**: Mimics real cards
- **Drop shadows**: Indicates elevation and interactivity
- **Consistent proportions**: Cards should feel like they belong together

#### Interaction States
| State | Visual Treatment |
|-------|------------------|
| Default | Subtle shadow, flat |
| Hover | Slight elevation, cursor change |
| Dragging | Maximum elevation, scale 1.05-1.1 |
| Dropping | Snap animation, settle |

> "Elevation indicates that the item's state has now changed. Add shadows to make interaction obvious. Simulate a 'magnetic' effect that snaps objects into place." - [Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)

### Drag and Drop Implementation

#### dnd-kit (React - Recommended)
- **Documentation**: https://dndkit.com/
- **Context7 Library ID**: `/websites/next_dndkit`
- Modern, accessible, extensible

```jsx
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';

function SortableCard({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging
      ? '0 20px 40px rgba(0,0,0,0.2)'
      : '0 2px 8px rgba(0,0,0,0.1)',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
```

#### Motion/Framer Motion (Animation)
- **Documentation**: https://motion.dev/
- **Context7 Library ID**: `/websites/motion-dev-docs`
- Physics-based spring animations

```jsx
import { motion } from 'framer-motion';

<motion.div
  drag
  whileDrag={{ scale: 1.1, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  dragElastic={0.1}
  dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
/>
```

### Stack Patterns

Cards can be organized in stacks with:
- **Peek**: Show edges of cards beneath
- **Fan**: Spread cards for overview
- **Deck**: Hide all but top card

```css
.card-stack {
  position: relative;
}

.card-stack .card {
  position: absolute;
}

.card-stack .card:nth-child(2) {
  transform: translateY(4px) scale(0.98);
}

.card-stack .card:nth-child(3) {
  transform: translateY(8px) scale(0.96);
}
```

### Carousel Patterns

> "A carousel typically shows a series of images, product options, or promotional content that users can navigate manually or automatically. This allows designers to save screen space by stacking content in a compact but still accessible way." - [Eleken: Carousel UI](https://www.eleken.co/blog-posts/carousel-ui)

**Best uses for carousels**:
- User onboarding
- Step-by-step guides
- Related content previews
- Image galleries

**Avoid carousels for**:
- Critical content that all users must see
- Dense information that requires comparison
- Primary navigation

### Sources
- [NN/G: Cards Component](https://www.nngroup.com/articles/cards-component/)
- [Smashing Magazine: Card-Based UIs](https://www.smashingmagazine.com/2016/10/designing-card-based-user-interfaces/)
- [Mobbin: Card UI Design](https://mobbin.com/glossary/card)
- [Smart Interface Design Patterns: Drag and Drop](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [LogRocket: Drag and Drop UI](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/)
- [UI Patterns: Cards](https://ui-patterns.com/patterns/cards)
- [dnd-kit Documentation](https://dndkit.com/)
- [Motion Documentation](https://motion.dev/)

---

## 4. Iframe Container Architectures

### When to Use Iframes vs SPA Routing

#### Use Iframes When:

| Scenario | Reason |
|----------|--------|
| Integrating legacy systems | Different tech stacks coexist |
| Strong isolation needed | CSS/JS don't leak between contexts |
| Third-party content | Security sandboxing |
| Cross-domain content | Same-origin restrictions |
| Gradual migration | Can combine old and new apps |

> "If you're integrating a legacy system, an iframe-based approach might be ideal. In the scenario you may need to display server-rendered UI from legacy web applications built with .php, .jsp, and/or .asp." - [Medium: Micro Frontend Architecture](https://medium.com/@deepanshurtiwari/exploring-the-different-ways-to-implement-a-micro-frontend-architecture-from-iframes-to-api-b68b00d909d1)

#### Use SPA Routing When:

| Scenario | Reason |
|----------|--------|
| Seamless UX | Smooth transitions, no reloads |
| Shared state | Components need common data |
| SEO requirements | Better crawlability |
| Performance | No iframe overhead |
| Deep linking | URL routing works naturally |

### Iframe Limitations

> "The easy isolation tends to make them less flexible than other options. It can be difficult to build integrations between different parts of the application, so they make routing, history, and deep-linking more complicated." - [Martin Fowler: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html)

Problems with iframes:
- **UI testing**: Hard to automate across iframe boundaries
- **SEO**: Content in iframes poorly indexed
- **Accessibility**: Screen readers struggle with nested contexts
- **Performance**: Each iframe is a new document context
- **Responsive design**: Sizing iframes to content is complex

### Hybrid Approaches

#### Module Federation (Webpack 5)
Share code between independent applications at runtime:

```javascript
// webpack.config.js for host app
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        cardEditor: 'cardEditor@http://localhost:3001/remoteEntry.js',
      },
    }),
  ],
};
```

#### Single-SPA
Orchestrate multiple frameworks in one page:

> "Single SPA specializes in coexisting micro frontends, allowing you to use multiple frameworks in a single-page application." - [Single-SPA Documentation](https://single-spa.js.org/docs/microfrontends-concept/)

### Decision Framework

```
Is strong isolation critical?
├── Yes: Consider iframes
│   ├── Same domain? → Shared storage, postMessage
│   └── Cross domain? → Full sandbox
└── No: SPA routing preferred
    ├── Multiple teams/frameworks? → Module Federation or Single-SPA
    └── Single team? → Standard routing
```

### Sources
- [Martin Fowler: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html)
- [FreeCodeCamp: How Microfrontends Work](https://www.freecodecamp.org/news/how-microfrontends-work-iframes-to-module-federation/)
- [Single-SPA Documentation](https://single-spa.js.org/docs/microfrontends-concept/)
- [Medium: Micro Frontend Comparison](https://medium.com/outreach-prague/micro-frontends-comparing-leading-frameworks-cb54cd9f7a03)
- [XenonStack: Micro Frontend Architecture](https://www.xenonstack.com/insights/micro-frontend-architecture)

---

## 5. Landing Page Progressive Disclosure Patterns

### Core Principle

> "Progressive disclosure is one of the best ways to satisfy both user desires for power/features and simplicity. Initially, show users only a few of the most important options. Offer a larger set of specialized options upon request." - [NN/G: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

### Three Categories of Progressive Disclosure

| Type | Description | Example |
|------|-------------|---------|
| **Step-by-step** | Breaking tasks into stages | Multi-step forms, wizards |
| **Conditional** | Hidden until requested | Expandable sections, modals |
| **Contextual** | Based on user situation | Tooltips, contextual help |

### Implementation Patterns

#### 1. Scroll-Based Reveal
> "Sales landing pages often use this type of progressive disclosure to make a decision immediately or scroll for more information." - [UXPin: Progressive Disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)

```css
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}
```

#### 2. Expandable Sections / Accordions
Best for FAQ pages, feature lists, technical details.

```jsx
function Accordion({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {title}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}
```

#### 3. "Read More" Truncation
For content-heavy cards or previews:

```css
.truncated {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### 4. Tabbed Content
Organize related content without page reloads:

```jsx
function Tabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab, i) => (
          <button
            role="tab"
            aria-selected={activeTab === i}
            onClick={() => setActiveTab(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tabs[activeTab].content}
      </div>
    </div>
  );
}
```

#### 5. Multi-Step Forms
Break complex forms into digestible chunks:

> "Most e-commerce platforms display checkout forms using progressive disclosure. They may begin with a very short form requesting the highest-level data—your name, email, phone number—and you must select 'next' before another short form will be displayed." - [The Decision Lab](https://thedecisionlab.com/reference-guide/design/progressive-disclosure)

### Opt-In Text Pattern

For consent-based or spoiler content:

```jsx
function OptInReveal({ previewText, fullContent }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <p>{previewText}</p>
      {!revealed ? (
        <button onClick={() => setRevealed(true)}>
          Show full content
        </button>
      ) : (
        <div>{fullContent}</div>
      )}
    </div>
  );
}
```

### Key Design Considerations

> "One of the central challenges of progressive disclosure is how to hide content, but provide people enough 'scent of information' to help them find that hidden content." - [Webflow Blog](https://webflow.com/blog/the-art-of-progressive-disclosure-in-web-design)

**Information scent indicators**:
- Chevrons/arrows indicating expandability
- "+" icons for collapsible sections
- "Read more" or "Show details" links
- Preview text or thumbnails
- Progress indicators for multi-step flows

### Sources
- [NN/G: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [UXPin: What is Progressive Disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
- [IxDF: Progressive Disclosure](https://www.interaction-design.org/literature/topics/progressive-disclosure)
- [Webflow: Art of Progressive Disclosure](https://webflow.com/blog/the-art-of-progressive-disclosure-in-web-design)
- [The Decision Lab: Progressive Disclosure](https://thedecisionlab.com/reference-guide/design/progressive-disclosure)
- [Medium: Progressive Disclosure in Landing Pages](https://medium.com/@leenaguharoy/when-and-how-to-implement-progressive-disclosure-in-a-landing-page-9410bab914b1)

---

## 6. Spatial Web Interfaces

### 2D Positioning Patterns

#### Grid-Based Spatial Systems

> "Set up an 8px x 8px underlay for all interface design work. When positioning elements, have them 'snap' to this underlay." - [Eufemia Design System](https://eufemia.dnb.no/quickguide-designer/spatial-system/)

```css
:root {
  --grid-unit: 8px;
}

.card {
  /* All positioning snaps to 8px grid */
  margin: calc(var(--grid-unit) * 2);
  padding: calc(var(--grid-unit) * 3);
}
```

#### Free-Form Positioning
For infinite canvas apps, elements can be placed anywhere:

```typescript
interface SpatialElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
}
```

### Semantic Zoom / Multi-Scale Interfaces

> "A physical zoom changes the size and visible detail of objects, while a semantic zoom changes the type and meaning of information displayed by the object." - [InfoVis Wiki: Semantic Zoom](https://infovis-wiki.net/wiki/Semantic_Zoom)

**Implementation approach**:

```typescript
function getCardContent(zoomLevel: number) {
  if (zoomLevel < 0.3) {
    // Far out: just show colored dot
    return <Dot color={card.color} />;
  } else if (zoomLevel < 0.6) {
    // Medium: show title only
    return <TitleOnly title={card.title} />;
  } else if (zoomLevel < 1.0) {
    // Closer: show title and preview
    return <CardPreview card={card} />;
  } else {
    // Full zoom: show complete card
    return <FullCard card={card} />;
  }
}
```

> "For example, a growing dot will become a simple box, then a box with a one-word label, then a box with a longer label, then a rectangle filled with text and pictures. The goal is to give the most meaningful presentation at each size." - [Microsoft: Semantic Zoom](https://learn.microsoft.com/en-us/windows/apps/design/controls/semantic-zoom)

### Macro/Micro Viewing Paradigm

> "To help users navigate a complex system, provide a way for users to switch between macro and micro views. The map serves as a constant reminder of where you're currently at and where you're headed." - [I'd Rather Be Writing](https://idratherbewriting.com/simplifying-complexity/macro-micro.html)

**Shneiderman's Mantra**: "Overview first, zoom and filter, then details-on-demand"

```jsx
function SpatialViewer() {
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'focused'
  const [focusedItem, setFocusedItem] = useState(null);

  return (
    <div>
      {/* Always-visible minimap for context */}
      <Minimap
        items={items}
        focusedItem={focusedItem}
        onNavigate={setFocusedItem}
      />

      {/* Main viewport */}
      <Viewport
        viewMode={viewMode}
        focusedItem={focusedItem}
        onItemClick={(item) => {
          setFocusedItem(item);
          setViewMode('focused');
        }}
      />

      {/* Zoom controls */}
      <Controls
        onOverview={() => setViewMode('overview')}
        onZoomIn={() => setViewMode('focused')}
      />
    </div>
  );
}
```

### Spatial Layout Considerations

#### Ergonomic Zones (from AR/VR research, applicable to 2D)

> "The ideal horizontal placement for content is within 30 degrees off-center on either side. More than 30 degrees from the center is strenuous." - [Golden Flitch: Spatial UI Guidelines](https://www.goldenflitch.com/blog/guidelines-of-spatial-ui-design)

For 2D interfaces, this translates to:
- **Primary content**: Center of viewport
- **Secondary content**: Within easy scan distance
- **Tertiary content**: Periphery, requires scrolling/panning

#### Z-Index Management

```typescript
const Z_LAYERS = {
  background: 0,
  cards: 10,
  activeCard: 20,
  draggedCard: 100,
  modal: 200,
  tooltip: 300,
} as const;
```

### Sources
- [Golden Flitch: Spatial UI Design Guidelines](https://www.goldenflitch.com/blog/guidelines-of-spatial-ui-design)
- [IxDF: Spatial UI Design Tips](https://www.interaction-design.org/literature/article/spatial-ui-design-tips-and-best-practices)
- [Microsoft: Semantic Zoom](https://learn.microsoft.com/en-us/windows/apps/design/controls/semantic-zoom)
- [InfoVis Wiki: Semantic Zoom](https://infovis-wiki.net/wiki/Semantic_Zoom)
- [Scott Logic: Macro and Micro in Data Visualization](https://blog.scottlogic.com/2016/05/16/Data-visualisation-and-Scale-Leveraging-the-macro-and-the-micro.html)
- [I'd Rather Be Writing: Macro/Micro Views](https://idratherbewriting.com/simplifying-complexity/macro-micro.html)
- [Apple: Spatial Layout HIG](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)
- [W3C: WebSpatial API](https://www.w3.org/2025/11/10-webspatial-minutes.html)

---

## 7. Design Reference Analysis

### Editorial Web Design Dichotomy (Spector Books Style)

Spector Books represents a philosophy of treating "the book as medium turned into a stage, a site of encounter for productive exchange."

**Web application of this principle**:

| Zone | Characteristics | Content Type |
|------|----------------|--------------|
| **Static/Anchored** | Fixed position, persistent | Navigation, branding, context |
| **Live/Dynamic** | Scrollable, interactive | Main content, cards, spatial elements |

> "While you can delineate three columns, there are just two blocks. The first block includes navigation that is broken into two sections. It always stays static. And the second block shows the content, depending on the chosen option." - [Speckyboy: Split Screens](https://speckyboy.com/asymmetrical-split-screens-web-design/)

**Implementation pattern**:

```jsx
function DichotomyLayout() {
  return (
    <div className="dichotomy-container">
      {/* Static zone - always visible, fixed */}
      <aside className="static-zone">
        <Navigation />
        <ContextInfo />
      </aside>

      {/* Live zone - dynamic, scrollable, interactive */}
      <main className="live-zone">
        <InfiniteCanvas>
          <Cards />
        </InfiniteCanvas>
      </main>
    </div>
  );
}
```

```css
.dichotomy-container {
  display: grid;
  grid-template-columns: 300px 1fr;
  height: 100vh;
}

.static-zone {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.live-zone {
  overflow: auto;
}
```

### Physicality in Digital Interfaces

Drawing from physical metaphors:
- **Weight**: Heavier elements (larger, darker) sink; lighter elements float
- **Friction**: Dragging has resistance, settling has momentum
- **Depth**: Shadows indicate elevation and interactivity
- **Edges**: Elements have boundaries that interact with each other

### Spatial Carousel Pattern

A carousel that emphasizes spatial relationships:

```jsx
function SpatialCarousel({ items, mode }) {
  // mode: 'macro' (see all, small) or 'micro' (focus one, large)

  return (
    <div className={`carousel carousel--${mode}`}>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          className="carousel-item"
          layout
          animate={{
            scale: mode === 'micro' && item.isFocused ? 1 : 0.6,
            opacity: mode === 'micro' && !item.isFocused ? 0.3 : 1,
            x: calculatePosition(i, mode),
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      ))}
    </div>
  );
}
```

### Sources
- [Spector Books](https://www.spectorbooks.com/)
- [Vev Design: Editorial Websites](https://www.vev.design/blog/editorial-websites/)
- [Awwwards: Editorial Layout](https://www.awwwards.com/inspiration/editorial-layout)
- [Clay Design: Web Layout Anatomy](https://clay.global/blog/web-design-guide/web-layout)
- [Speckyboy: Asymmetrical Split Screens](https://speckyboy.com/asymmetrical-split-screens-web-design/)

---

## Summary: Key Recommendations

### Must Have
1. **Layered canvas architecture** for performance
2. **Build-time backlinks index** for wikilinks
3. **Physical metaphors** in card interactions (elevation, shadows, snap)
4. **Progressive disclosure** to manage complexity
5. **Semantic zoom** for macro/micro navigation

### Recommended
1. Use **Konva.js** or **tldraw SDK** for canvas interfaces
2. Use **dnd-kit** for drag-and-drop with **Motion** for physics animations
3. Implement **SPA routing** unless strong isolation is required
4. Design for **8px grid** spatial consistency
5. Create **static/live zone dichotomy** in layouts

### Tools and Libraries Summary

| Need | Recommended Tool | Documentation |
|------|------------------|---------------|
| 2D Canvas | Konva.js | https://konvajs.org/ |
| Infinite Canvas | tldraw SDK | https://tldraw.dev/ |
| Drag & Drop (React) | dnd-kit | https://dndkit.com/ |
| Animation | Motion (Framer Motion) | https://motion.dev/ |
| 3D/Spatial | Three.js | https://threejs.org/ |
| Wikilinks Parsing | wikirefs | https://github.com/wikibonsai/wikirefs |

---

*Research compiled January 2025*
