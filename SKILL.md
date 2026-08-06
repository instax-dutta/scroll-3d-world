---
name: scroll-3d-world
description: >
  Build an immersive 3D scroll-scrubbed "fly through the world" landing page —
  a continuous low-poly clay-diorama world in Three.js that a camera flies
  through as the visitor scrolls: dive into each scene, dwell on the copy,
  glide to the next. Zero AI generation, zero video, zero credits, zero seams.
  The free alternative to the Higgsfield scroll-world pipeline. Use this
  whenever the user wants a "3D world" / "browse-through-the-industry" hero, a
  scroll cinematic, a diorama landing page, an Emons-style isometric world, an
  Apple-style scroll-through page, a WebGL/Three.js/R3F landing page, or wants
  to turn a business into a scrollable world WITHOUT paying for AI video.
  Make sure to use this skill whenever the user mentions 3D scroll, scrollable
  world, diorama hero, fly-through landing page, scroll-scrubbed site, or asks
  for a free alternative to scroll-world / Higgsfield / Seedance — even if they
  don't explicitly say "skill".
allowed-tools: Bash, Read, Write, Edit, Skill
---

# scroll-3d-world

Produce a landing page where **scroll drives a camera** flying through ONE
continuous 3D world — from outside each scene into its interior, then on to the
next, with no cuts and no visible seams. Built entirely with **Three.js**: real
geometry, one real camera path, rendered live in the browser. **No AI
generation, no video files, no credits, no GPU required** — it runs on any
laptop (8 GB Macs included) and is free forever.

**Why this skill exists:** the scroll-world skill achieves the same effect with
paid Higgsfield AI-video credits and chained clips that must be frame-locked at
every seam. This skill replaces the whole paid pipeline with real 3D. Because
there is exactly **one continuous camera path**, the seam problem — the #1
failure mode of the video approach — **cannot exist here**. And because every
pixel renders live, the page is resolution-independent (crisp on any phone,
any screen), re-editable in seconds, and costs nothing to iterate.

The camera choreography, the pacing discipline, and the copy-first section
design carry over from the video approach; the asset pipeline (generate → seam
→ encode) is replaced by building dioramas with code.

**Do not assume a frontend framework.** The engine in `references/engine.js` is
a self-contained ES module that mounts into a container you give it — plain
HTML, Next.js, Vue, anything. The template ships a complete working example;
adapt it.

---

## Step 0 — Bootstrap

1. **three.js r160+.** The template uses an importmap with the unpkg CDN
   build. For a bundled project, `npm i three` and import normally — the
   engine's only import is `three`.
2. **No other dependencies.** The engine is one file; the dioramas are built
   with its kit helpers (procedural primitives). Blender/GLB and AI-texture
   backdrops are optional upgrades — see Step 3.
3. For QA you need a headless browser (Playwright/Puppeteer with a Chromium
   binary) — used only to screenshot and verify the flight. Not required to
   run the page itself.

## Step 1 — Interview the user

The **subject is the user's to state — ask it as an open question in plain
prose**, never a fabricated multiple-choice. A made-up list of industries
biases them. Let them answer in their own words (their real business, a
client's, or any idea). Capture:

1. **Subject** (ask openly) — "What should this world be about? Your business,
   a client's, or any idea — a word or a sentence is fine." Capture the
   industry/product + a one-line pitch (e.g. "a bubble tea company, from leaf
   to last sip"), and a brand name if they have one; otherwise propose one.
2. **Brand kit** — three paths, pick one:
   - The user hands you palette + name + tone directly.
   - You propose a palette + name and let them approve.
   - Import from a URL (only if they have a site): fetch it with your web
     tools and extract name/colours/tone yourself.
   Capture **4–6 named hex values**, a display name, and a tone word or two.
   These hexes become `world.palette` and the accent per section.
3. **Art direction** — default is "soft matte low-poly **clay diorama**,
   isometric, tilt-shift miniature, warm light". Offer alternatives (flat
   papercraft, glossy toy, neon night, frosted glass). The choice determines
   the material recipe (roughness, flatShading, light colour) — one recipe for
   the whole world, never mixed.
4. **The journey (sections)** — the ordered scenes the camera flies through.
   Propose a set derived from the subject's own value chain and let the user
   edit. 4–7 works well (fewer sections = more detail per scene). Boba
   example: farms → pearl kitchen → flagship shop → delivery → community plaza
   → the hero product. Each section needs: a short subject description (what's
   IN the diorama), an eyebrow, a headline, one line of body, and 0–3 tag
   pills. The last section is usually the hero product + the CTA.

**No mobile question is needed** — unlike the video approach, 3D is
resolution-independent: the same world renders sharp on any phone, and the
engine hardens the page for touch (DPR clamp, safe-area copy, height-only
resize ignored) by default. Tell the user this when they ask.

## Step 2 — World layout & camera choreography (the make-or-break step)

The feel of the page comes from the flight, not the geometry. Get this right
before building a single mesh.

**Layout — one world, one spine, pods per section.**

- Place the pods along a **line or gentle arc** in world space (a spine). Pods
  spaced 3–4 pod-radii apart read as a connected world; farther apart reads as
  empty air; closer reads as one blob. Default camera flies the spine in
  order, so order the pod positions along the spine in section order.
- Give each pod a `pos`, `radius` (scene footprint) and `height` (vertical
  scale of its tallest object — the engine derives camera waypoints from
  these two numbers).
- Vary pod y slightly (a raised plaza, a sunken garden) for terrain interest —
  the spine need not be flat.

**Camera grammar — the flight is the story.** The engine builds one
CatmullRom curve through [approach₀, settle₀, approach₁, settle₁, …] where the
*depart of each section is the next section's approach*. That one rule is what
makes the journey one continuous take. Per section the camera:

1. **Approaches** — high and outside the pod, looking down at it (the
   establishing shot). The engine default: `pod.pos + (0, height·2.1, radius·2.5)`.
2. **Settles** — descends to eye height in front of the subject: default
   `pod.pos + (0, height·0.85, radius·1.3)`, looking at the subject center
   (`pod.pos + (0, height·0.5, 0)`).
3. **Dwells** — the scroll warp holds the camera near the settle point while
   the section's copy peaks (that's the `linger` knob), then pushes in the
   last few percent.
4. **Departs** — pulls up and glides to the next pod's approach. Free air —
   never thread the camera through geometry.

**Pacing knobs (per section):** `scroll` = viewport-heights of scroll
consumed by that section (default 1.5; hero and finale get more, transit
sections less), and `linger` 0–0.4 (default ~0.3; how long the camera rests at
the settle). The copy peaks exactly while the camera rests — that's the
magic. Keep `linger ≤ 0.4`; bigger makes the page feel sticky.

**Scroll is a scrubber** — visitors scroll up, so the flight also plays in
reverse. That's free and expected: curves are reversible by construction and
the camera never teleports. It's one more reason to keep waypoints in free
air and pacing smooth (no per-section camera jumps, ever).

**Waypoint overrides:** a section may supply explicit `waypoints:
[{pos,look},{pos,look}]` (approach, settle) instead of the defaults — for a
hero product you want a slow orbit, give a settle that passes beside the
object; for a dramatic reveal, raise the approach. Keep the motion handoff
rule: the approach point of the NEXT section is the depart of the current, so
an override on one section changes the preceding flight too — look at the
pair, not just the section.

## Step 3 — Build the dioramas (the craft)

This is where the art happens. Default is **fully procedural** — primitives
composed with the engine's kit — so a world needs zero asset files. Full
recipes per scene archetype live in `references/diorama-kit.md`; the rules
that matter everywhere:

- **Palette discipline.** Limit each pod to 3–5 colours from the brand kit
  plus one light neutral (cream/white). Fewer colours reads as intentional
  "clay toy"; more reads as noise. One material recipe for the whole world
  (`roughness ~0.9`, `flatShading: true`, no metalness) — that is the
  "clay" look.
- **One light for the whole world.** The engine provides a warm key + cool
  hemisphere fill for everything. Never add per-pod lights; per-pod lights are
  how worlds lose cohesion.
- **Fog is your friend.** Set `fog.far` ≈ world scale so far pods fade in
  softly instead of popping. `fog.near` ≈ half of `far`.
- **Fake shadows by default.** The kit's `blob(x, z, radius)` drops a soft
  dark disc under every main object — cheap, deterministic, always looks
  right in a clay world. Real shadow maps (`world.shadows: true`) are the
  optional upgrade; budget for them (2048 maps, tight bounds) and skip on
  mobile.
- **Composition per scene.** Big simple shapes; the focal subject framed with
  clearance (it's the camera's target — check it from the settle waypoint);
  silhouette readable from the approach angle (tall things behind, low things
  in front); a foreground element or two for parallax depth.
- **Ground.** Every pod gets a kit `ground(radius, color)` disc; the world
  optionally gets one big ground plane. Match the ground tone to the fog tone
  so the world doesn't look like floating islands (unless floating islands
  ARE the concept).

**Three optional upgrades:**

- **Blender models (free).** For richer dioramas, model a pod in Blender,
  export GLB, and set `model: 'assets/scenes/shop.glb'` on the section — the
  engine loads, auto-scales to the pod radius, and grounds it. Keep PBR
  simple; the clay recipe applies to models too (rough, matte, flat palette).
- **AI stills as backdrops (free).** A user who misses the AI look can drop a
  free-generated isometric image behind a pod as a billboard or ground
  texture. The cohesion burden is on you: match the backdrop's palette and
  light to the world, and place it where the camera looks (behind the pod).
- **R3F (React Three Fiber)** if the user's stack is React — port the
  config/diorama code; the choreography rules are identical.

## Step 4 — Wire the engine

Copy `references/engine.js` (and `references/index-template.html` to see it
wired) into the project. Mount:

```js
import { mountScrollWorld } from './engine.js';
mountScrollWorld(document.getElementById('world'), { ...config });
```

Config: `brand`, `hint`, `world.{sky, fog, ground, palette, shadows,
sections[]}`. Each section: `{ id, label, accent, eyebrow, title, body, tags,
cta, scroll, linger, pod:{pos,radius,height}, waypoints?, build(world)?,
model? }`. The `build(world)` function receives the kit (`world.box/cyl/
sphere/cone/ring/torus/group/ground/blob/loadGLB`) — helpers auto-add to the
section's pod, so a build is a few lines:

```js
build(world) {
  const { cyl, sphere, box, blob, ground } = world;
  ground(5, '#E0D3BA');
  blob(0, 0, 4.5);
  cyl('#6B4A32', 0.85, 0.85, 1.2, { x: 0, y: 1.6, z: 0 });
  sphere('#E8A33D', 1.4, { x: 3, y: 3, z: -2 });
}
```

The engine handles: the one continuous camera path (CatmullRom, arc-length
parameterized), scroll→arc mapping with per-section dwell warps, copy panels
(fade in as the camera arrives, peak at the settle, fade on depart), route
rail, progress bar, drift particles, `prefers-reduced-motion` (static hero
settle frame + working CTA), touch hardening (DPR clamp, safe-area copy,
height-only resizes ignored), and a `window.__sw3d.last().debug()` hook for
QA. Theme the chrome with CSS variables (`--sw3-ink`, `--sw3-ink-soft`,
`--sw3-accent`, `--sw3-font`) — the world's sky/fog/palette are set in the
config, the page chrome stays quiet.

If the user's backend is non-JS (Python/Rails/static): serve `engine.js` +
three.js, drop the importmap and one module script into the rendered HTML.
Nothing about the engine is framework-specific.

## Step 5 — QA the flight (don't skip)

Drive the page in a headless browser (Playwright/Puppeteer + Chromium):

- **Frame check.** Screenshot at each section's settle (scroll fraction ≈
  cumulative scroll share; use `window.__sw3d.last()` to read the camera
  arc/position). The subject must be framed — visible, centered with
  clearance, nothing clipping the lens. If a pod's subject is off-frame or
  hidden behind another object, adjust waypoints/composition, not the scroll
  mapping.
- **Continuity.** Scroll the whole chain forward fast, then back. There are
  no seams, so the only failure is a *hitch*: a kink where the curve turns
  hard or a band where the warp is too aggressive (camera visibly stops or
  reverses). Smooth both ways = done.
- **Console clean.** No errors; `window.__sw3d.last().drawCalls` should be
  low (the reference demo runs 3–25 calls, a few thousand triangles — if
  you're over ~200 calls, you've added too many separate meshes; merge or
  reduce segments).
- **Mobile viewport.** Emulate a phone: copy clears the UI, no horizontal
  scroll, still smooth (DPR is auto-clamped). Landscape + portrait.
- **Reduced motion.** Emulate `prefers-reduced-motion: reduce`: page shows
  the hero settle frame statically with its copy and CTA; no particles, no
  scroll effect, no jump when toggled.
- **Perf sanity.** WebGL context count = 1; no layout thrash on scroll (the
  engine only touches transform/opacity of copy panels); resize mid-scroll
  doesn't reset the camera.

## Gotchas (hard-won)

- **Camera inside geometry** → waypoints must live in free air; the defaults
  always are. If a scene wants an interior moment, either make the opening
  generous, cut the building in cross-section, or fly to the entrance and
  settle outside it (eye height, close) — don't thread the path through a
  doorway the camera doesn't fit.
- **"The flight feels jerky"** → you overrode waypoints with sharp turns
  (CatmullRom smooths, but a 90° corner still reads), or `linger` is too big
  (the dwell reads as a stop). Reduce linger, spread the waypoints along the
  spine, and let the curve ease. The engine's exponential smoothing
  (`k≈11/s`) is deliberate — don't remove it.
- **"It looks empty"** → the fix is fog + big soft shapes + particle dust,
  not more geometry. Far pods popping in = `fog.far` too short. Flat sky =
  add a sun orb and a couple of cloud puffs.
- **Pods that don't match each other** → different material recipes or extra
  lights per pod. One recipe, one light, one palette — the whole world.
- **Shadows that flicker/z-fight** → fake blob shadows (`depthWrite:false`,
  polygon offset — the kit handles it); if using real shadows, check
  `shadow.bias` and tighten the shadow camera to the world bounds.
- **Slow on low-end phones** → real shadow maps off, DPR clamp (engine
  default 1.5 on coarse pointers), fewer segment counts (`seg` on kit
  helpers), no postprocessing. The reference world renders at a few thousand
  triangles — keep it that light.
- **Copy cut off on small screens** → the engine stacks copy at the bottom on
  ≤760px; keep headlines short (the example style works at any width).
- **"I want the AI-video look"** → that's the paid scroll-world skill. This
  skill is the free, live-3D route: same fly-through feel, every pixel crisp,
  nothing to generate. Say so plainly, offer the trade (deterministic style
  vs. AI painterliness), and build — don't upsell a paid pipeline.

## References

- `references/engine.js` — the engine: kit helpers, camera path, scroll
  mapping + dwell warps, copy/rail/progress, reduced-motion and touch
  hardening, QA debug hook.
- `references/index-template.html` — standalone page with a complete working
  4-section coffee-world (hills → roastery → cart → hero cup) — build
  functions for every archetype, ready to adapt.
- `references/diorama-kit.md` — clay-style recipes per scene archetype
  (farm/hills, kitchen/workshop, retail, plaza/city, product hero), palette +
  light rules, composition checklist, Blender/AI-backdrop guidance.
