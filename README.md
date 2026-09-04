# scroll-3d-world

Build immersive **3D scroll-scrubbed "fly through the world"** landing pages: a
continuous low-poly clay-diorama world in Three.js that a camera flies through
as the visitor scrolls — dive into each scene, dwell on the copy, glide to the
next. **No AI generation, no video, no credits, no GPU, no seams.**

The free alternative to the Higgsfield `scroll-world` pipeline: instead of
chained AI-video clips that must be frame-locked at every seam, this uses ONE
continuous camera path through ONE live Three.js scene — so the seam problem
physically cannot exist, and every pixel renders crisp at any resolution.

- Agent Skills format — works with OpenCode, Claude Code, Cursor, Codex,
  Copilot, Gemini CLI, and any [Agent Skills](https://agentskills.io) host.
- Engine (`references/engine.js`): self-contained ES module, depends only on
  `three`. Camera path, scroll→arc mapping with per-section dwell, copy
  panels, route rail, progress bar, particles, reduced-motion + touch
  hardening, QA debug hook.
- Template (`references/index-template.html`): complete working 4-section
  coffee-world (hills → roastery → cart → hero cup) with `build()` functions
  for every diorama archetype.
- Diorama kit (`references/diorama-kit.md`): clay-style recipes per scene
  type, palette/light rules, Blender + AI-backdrop guidance.
- `demo/`: runnable example (open `index.html` through any static server).

## Install

```bash
npx skills add instax-dutta/scroll-3d-world
```

## Quick start

1. Copy `references/engine.js` next to your page.
2. Copy `references/index-template.html` and edit the config — the subject,
   sections, pod positions, copy, and palette.
3. Serve (any static server) and scroll.

```js
import { mountScrollWorld } from './engine.js';
mountScrollWorld(document.getElementById('world'), {
  brand: { name: 'Acme', href: '#' },
  hint: 'scroll to fly in',
  world: {
    sky: '#F2EAD9',
    fog: { color: '#E8DCC8', near: 30, far: 120 },
    ground: { color: '#E7DCC8' },
    sections: [
      {
        id: 'hero', label: 'The Roastery', accent: '#B0703C',
        eyebrow: 'Fire, air, patience', title: 'Small batches.',
        body: 'A sentence of plain-spoken copy.',
        scroll: 1.6, linger: 0.3,
        pod: { pos: [0, 0, 0], radius: 5, height: 3.5 },
        build(world) {
          const { cyl, sphere, box, blob, ground } = world;
          ground(5, '#DCCEB6');
          blob(0, 0, 4.5);
          cyl('#6B4A32', 0.85, 0.85, 1.2, { x: 0, y: 1.6, z: 0 });
        },
      },
    ],
  },
});
```

## How it works

Scroll position maps to progress along a single CatmullRom camera path through
the section pods. Each section's scroll band is arc-length parameterized with a
monotone "dwell warp" near its settle point: the camera rests while the section
copy peaks, then the smooth exponential camera-follow carries the user gently
to the next pod. Scroll up and it plays in reverse — seamless both ways.

## More agent skills by me

- [flash-compare](https://github.com/instax-dutta/flash-compare) - Flash-style top-1% product comparisons, exactly how flash.co works
- [master-pitcher](https://github.com/instax-dutta/master-pitcher) - Audit, draft, or roast pitch decks with an 18-check VC framework
- [brand-vibes](https://github.com/instax-dutta/brand-vibes) - Apply any company's design language while vibecoding, 66 brand profiles
- [roadmap-tutor](https://github.com/instax-dutta/roadmap-tutor) - Learn any roadmap.sh roadmap one topic at a time, tracked across sessions
- [market-validator](https://github.com/instax-dutta/market-validator) - Validate SaaS ideas with real user complaints across 10+ platforms
- [google-code-review](https://github.com/instax-dutta/google-code-review) - Google's code review best practices as an agent skill