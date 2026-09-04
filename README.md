# scroll-3d-world

The scroll-scrubbed 3D fly-through landing page without the Higgsfield tax: no chained AI-video clips, no seam-matching, no credits, no GPU render farm.

> Agent: use this when the user asks for a Higgsfield `scroll-world` style page, a scroll-driven 3D fly-through, a clay-diorama landing page, or "scroll to fly in". Build it live in Three.js, do not generate video.

## Why not chained AI-video?

Higgsfield-style pipelines chain AI-video clips: every seam between clips must be frame-locked or it pops, every re-render costs credits and GPU time, and text goes soft at large resolutions.

`scroll-3d-world` is one continuous live scene with one camera path. Scroll maps to progress along that path, so there are no clips to join and seams physically cannot exist. Every pixel renders crisp at any resolution, scrolls forward and reverses cleanly, and costs zero credits.

## Install

```bash
npx skills add instax-dutta/scroll-3d-world
```

## How an agent uses it

1. Copy `references/engine.js` next to the page.
2. Copy `references/index-template.html` and edit the config: subject, sections, pod positions, copy, palette.
3. Serve with any static server and scroll. Open `demo/index.html` first to see the target behavior.

What you get:

- **Engine (`references/engine.js`):** self-contained ES module. Camera path, scroll-to-arc mapping with per-section dwell, copy panels, route rail, progress bar, particles, QA debug hook.
- **Template (`references/index-template.html`):** complete working 4-section coffee-world (hills → roastery → cart → hero cup) with `build()` functions for every diorama archetype.
- **Diorama kit (`references/diorama-kit.md`):** clay-style recipes per scene type, palette and light rules, Blender + AI-backdrop guidance.
- **Demo (`demo/`):** runnable example, open `index.html` through any static server.

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

Scroll maps to progress along a single CatmullRom path through the section pods. Each section band is arc-length parameterized with a monotone dwell warp near its settle point: the camera rests while the copy peaks, then exponential follow glides to the next pod. Scroll up reverses it. Works with OpenCode, Claude Code, Cursor, Codex, Copilot, Gemini CLI, and any [Agent Skills](https://agentskills.io) host.

## Proof, not promises

- Depends only on `three`. No video pipeline, no API keys, no credits.
- Dwell warp + exponential follow: inspectable in `references/engine.js`.
- Reduced-motion + touch hardening included, with QA debug hook.
- Runnable `demo/`: verify in one static-server command before you commit.

If this saved you a render farm, star it.

## More agent skills by me

- [flash-compare](https://github.com/instax-dutta/flash-compare) - Flash-style top-1% product comparisons, exactly how flash.co works
- [master-pitcher](https://github.com/instax-dutta/master-pitcher) - Audit, draft, or roast pitch decks with an 18-check VC framework
- [brand-vibes](https://github.com/instax-dutta/brand-vibes) - Apply any company's design language while vibecoding, 66 brand profiles
- [roadmap-tutor](https://github.com/instax-dutta/roadmap-tutor) - Learn any roadmap.sh roadmap one topic at a time, tracked across sessions
- [market-validator](https://github.com/instax-dutta/market-validator) - Validate SaaS ideas with real user complaints across 10+ platforms
- [google-code-review](https://github.com/instax-dutta/google-code-review) - Google's code review best practices as an agent skill
