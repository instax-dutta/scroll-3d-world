# Diorama Kit — clay-style recipes for scroll-3d-world

The kit in `engine.js` (`world.box/cyl/sphere/cone/ring/torus/group/ground/
blob`) is enough to build any pod. This file is the *craft*: what to build,
with what shapes, in what order — per scene archetype. Use the recipes as
starting points, not templates to copy verbatim; adapt scale and colour to the
pod and the brand.

## The clay recipe (the default art direction)

- **Material**: one recipe for the whole world —
  `MeshStandardMaterial`, `flatShading: true`, `roughness ≈ 0.92`,
  `metalness 0`. Set by the kit's `mat()` defaults — don't override per mesh
  unless the concept demands it (glossy toy = lower roughness everywhere).
- **Light**: warm directional key (default `#FFF1DC` from upper right) + cool
  hemisphere fill. Never per-pod lights. ACES tone mapping (engine default)
  gives the soft toy-camera look.
- **Palette**: 3–5 brand hexes + one light neutral (cream/ivory) per pod.
  Ground tones sit 1–2 steps darker than the fog tone so the world reads
  grounded.
- **Shadows**: kit `blob(x, z, radius)` under every object taller than ~1/3
  pod height. Blob under the main subject, smaller blobs under satellites.
- **Fog**: `fog.far` ≈ world spine length; `fog.near` ≈ half that. Far pods
  melt into the background instead of popping.
- **Composition order**: ground disc → back layer (hills/buildings/sky
  elements) → middle (the subject) → front (props, foreground parallax) →
  blobs last (they sit on top of ground discs).
- **Scale discipline**: pod height is the ruler. The subject occupies
  60–75% of pod height; props 15–40%; foreground elements 10–25% of pod
  radius at the front edge. Everything in a pod shares one visual "density" —
  don't mix chunky 3-unit blocks with fine 0.05-unit details (except tiny
  props like beans/berries, which read as detail).

## Recipes by archetype

### Farm / hills / nature (green)
- Rolling hills: 2–3 large squashed spheres (`seg` ~20, y ≈ −0.35·r) of two
  adjacent greens.
- Bushes/crops: small squashed spheres; tiny berry spheres (accent colour,
  radius 0.1–0.15) clustered on them.
- Trees: 0.1–0.2-radius cylinder trunk + 1–3 stacked/offset green spheres.
- Buildings: low box + wide pyramid roof (`cone seg:4`), door as a thin box
  on the face. Cream walls, terracotta roof.
- Sky interest: sun orb (accent, r ≈ 1.2–1.5) far to one side; 2–3 cloud
  puffs (white squashed spheres, grouped, opacity 0.85).
- Ground: grass tone slightly lighter than the hills.

### Kitchen / workshop / industrial
- The machine is the subject: big box body (2–3 pod-height/2) + a horizontal
  drum (`cyl` rotated `rx: π/2`) as the focal cylinder + a chimney/vent
  (thin tall cylinder) for silhouette.
- Glow detail: a small emissive box on the machine face (warm accent) —
  emissive is the one sanctioned material override; it sells "process".
- Props: 2–3 burlap sacks (squashed spheres, adjacent beige tones), a crate
  stack (2–3 boxes, heights staggered), pipes (thin cylinders, elbows
  approximated by two joined segments).
- Steam: 2–3 small white spheres, opacity 0.3–0.5, rising along a line.

### Retail / shop / cart / storefront
- The structure: counter-height box (light neutral) + counter lip + a
  barrel-roof awning (`cyl` rotated along its length, radius ≈ counter
  width/2, sitting on the counter) or a flat canopy (thin wide box on posts).
- Sign band: a thin box on the awning front, accent-coloured.
- Wheels (carts): `torus` at each corner, rotated `ry: π/2`.
- Merchandise: 2–4 small cylinders (cups) on the counter, each with a tiny
  accent cylinder on top (the drink); steam wisps over them.
- Neighbourhood dressing: a stool (cylinder stack), a street tree, a bench
  (box + 2 stub boxes). Keeps the shop from floating in void.

### Plaza / community / city
- Ground is the subject: larger ground disc with a centerpiece — fountain
  (wide short cylinder + inner cylinder + ring), monument (stacked
  shrinking cylinders), or a big tree (fat trunk + giant green sphere).
- Ring of low buildings: boxes of varying heights (2–4 units) around the
  edge, roofs as thin boxes or pyramid cones; 2–3 accent-coloured
  shopfronts.
- People-free (clay worlds read better empty or with abstract figures):
  if figures, use simple spheres-on-cylinders at ~0.8 pod-height with no
  faces — matte clay has no faces.
- Paths: a couple of flat `box` strips (lighter tone) crossing the disc.

### Product hero / finale (the payoff)
- The product is the subject: pedestal (2–3 stacked cylinders, widening
  downward) → saucer (wide flat cylinder) → product.
- Product anatomy (a cup): tapered cylinder body + `torus` handle + dark
  liquid disc (thin cylinder on top) + steam column (3–4 white spheres,
  opacity fading upward).
- Brand halo: a large thin `torus` standing behind the product (accent
  colour, radius ≈ pod radius, slightly tilted or vertical) — reads as a
  logotype without any text.
- Scatter: 5–8 tiny ellipsoids (beans/pellets/gems, squashed spheres at
  `seg 12`) on the pedestal, accent + dark tones.
- This section deserves the biggest `scroll` and `linger` in the config.

## Optional upgrades

### Blender → GLB
- Model one pod (or the whole world) in Blender, export **GLB** (not glTF
  separate files). Keep it simple: matte materials, one palette, `roughness`
  high, no baked textures needed. Optionally enable DRACO compression.
- Set `model: 'assets/scenes/<name>.glb'` on the section — the engine loads
  it, auto-scales to the pod radius, and grounds it. If the section also has
  a `build()`, it runs too (adds props around the model).
- Blender is free; the clay look transfers directly (matte materials,
  warm key light, fog).

### AI stills as backdrops (free, optional flavor)
- Generate an isometric scene still (free tools — local SD/Flux, free web
  UIs) and use it as a **billboard behind the pod** (a plane at `z ≈
  -radius·2` facing the spine) or as ground texture.
- Cohesion rules: match the still's palette to `world.palette`; matte finish;
  place it where the camera looks from the settle waypoint; keep it 1–2 fog
  steps behind the pod so fog blends it in.
- Never mix AI backdrops on some pods and not others without a reason — the
  style jump reads as a cut.

## QA checklist for a pod
1. From the settle waypoint: subject framed, clearance around it, nothing
   hiding it.
2. From the approach waypoint: silhouette reads (the pod is identifiable
   from far).
3. Colours: ≤5 hexes, one neutral, all from the brand kit.
4. Blobs under everything tall; no floating objects.
5. The pod pops out of fog at `fog.far`, not before.
