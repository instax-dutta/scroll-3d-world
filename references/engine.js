/* ============================================================================
   scroll-3d-world engine  (v1.0.0)
   ----------------------------------------------------------------------------
   A self-contained ES-module scroll-scrub engine for continuous 3D
   "fly through the world" landing pages. Scroll drives ONE camera along ONE
   continuous path through a single Three.js scene — there are no clips, no
   seams, and no pre-rendered video. Everything renders live in the browser.

   Dependencies: `three` (r160+). Works from an importmap in plain HTML or
   from any bundler (`npm i three`).

   Usage:
     import { mountScrollWorld } from './engine.js';
     mountScrollWorld(document.getElementById('world'), { ...config });

   Config shape (see references/index-template.html for a complete example):
     {
       brand: { name, href },
       cta:   { label, href },                     // optional global CTA fallback
       hint:  'scroll to fly in',
       world: {
         sky: '#f2ead9',                           // scene background
         fog: { color: '#e8dcc8', near: 30, far: 120 },
         ground: { color: '#e7dcc8' },             // optional big ground disc
         palette: ['#8FB98A', '#E8B04B', ...],     // brand kit colors (for build())
         shadows: false,                           // real shadow maps (heavy)
         sections: [
           {
             id, label, accent, eyebrow, title, body, tags, cta,
             scroll: 1.6,                          // viewport-heights of scroll
             linger: 0.3,                          // dwell at the settle point (0–0.4)
             pod: { pos: [0,0,0], radius: 4, height: 3 },  // where the diorama sits
             waypoints: [ {pos:[..],look:[..]}, {pos:[..],look:[..]} ], // optional overrides (approach, settle); depart auto
             build(world) {  // add meshes to world.pod with the kit helpers
             },
             model: 'assets/scenes/shop.glb',      // optional: GLB instead of build()
           },
           ...
         ],
       }
     }

   Waypoints: when omitted the engine derives them from the pod — approach =
   high and outside, settle = at eye height in front of the subject. The
   depart of each section is the next section's approach, so the whole
   journey is one connected flight.
   ============================================================================ */

import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

/* --------------------------------------------------------------------------
   Scroll → arc warping. Each section's scroll band maps onto an arc range
   [T0, T1] of the camera path. The warp inserts a plateau near the settle
   point: the camera rests while the copy peaks, then continues. The warp is
   monotone, f(0)=0, f(1)=1, built from a quartic "delay density" bump so it
   is smooth everywhere.
   -------------------------------------------------------------------------- */
function makeWarp(linger) {
  const u = 0.8;                        // plateau centers near the end of the band
  const L = clamp(linger, 0, 0.4);
  if (L < 0.004) return { f: (t) => t, finv: (t) => t };
  const k = 1.25;                       // peak delay density
  const h = (15 * L) / (16 * k);        // plateau half-width
  const N = 512;
  const f = new Float64Array(N);
  const finv = new Float64Array(N);
  const bump = (s) => {
    const q = (s - u) / h;
    return Math.abs(s - u) <= h ? k * (1 - q * q) * (1 - q * q) : 0;
  };
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    acc += bump(t) * (1 / (N - 1));
    f[i] = t - acc + t * L;             // subtract delay, renormalize by +t*L
  }
  for (let i = 0; i < N; i++) {         // f is monotone → invert by search
    const y = i / (N - 1);
    let lo = 0, hi = N - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (f[mid] < y) lo = mid; else hi = mid;
    }
    const t0 = lo / (N - 1), t1 = hi / (N - 1);
    finv[i] = mix(t0, t1, (y - f[lo]) / Math.max(1e-9, f[hi] - f[lo]));
  }
  return {
    f: (t) => {
      const x = clamp(t, 0, 1) * (N - 1);
      const i = Math.floor(x), fr = x - i;
      return mix(f[i], f[Math.min(N - 1, i + 1)], fr);
    },
    finv: (t) => {
      const x = clamp(t, 0, 1) * (N - 1);
      const i = Math.floor(x), fr = x - i;
      return mix(finv[i], finv[Math.min(N - 1, i + 1)], fr);
    },
  };
}

/* --------------------------------------------------------------------------
   Arc fraction of each camera-path control point. getPointAt() is
   arc-length parameterized, so we find each control point's t by dense
   sampling and chord-length accumulation.
   -------------------------------------------------------------------------- */
function controlPointArcs(curve, points) {
  const SAMPLES = 1024;
  const cum = new Float64Array(SAMPLES);
  const prev = curve.getPoint(0);
  for (let i = 1; i < SAMPLES; i++) {
    const p = curve.getPoint(i / (SAMPLES - 1));
    cum[i] = cum[i - 1] + prev.distanceTo(p);
    prev.copy(p);
  }
  const total = cum[SAMPLES - 1] || 1;
  return points.map((cp) => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const p = curve.getPoint(i / (SAMPLES - 1));
      const d = cp.distanceToSquared(p);
      if (d < bestD) { bestD = d; best = i; }
    }
    return cum[best] / total;
  });
}

const CSS = `
.sw3d{position:fixed;inset:0;overflow:hidden;z-index:1;
  font-family:var(--sw3-font,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif)}
.sw3d .sw3d-stage{position:absolute;inset:0}
.sw3d canvas{display:block}
.sw3d-copy{position:absolute;inset:0;z-index:2;pointer-events:none}
.sw3d-panel{position:absolute;left:6vw;top:50%;transform:translateY(-50%);
  max-width:min(430px,84vw);color:var(--sw3-ink,#241d2b);opacity:0;
  will-change:opacity,transform;transition:opacity .18s linear}
.sw3d-eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--acc,#9B7EBD);font-weight:700;margin:0 0 10px}
.sw3d-title{font-size:clamp(30px,4.6vw,56px);line-height:1.04;margin:0 0 .32em;
  font-weight:800;letter-spacing:-.022em}
.sw3d-body{font-size:clamp(15px,1.65vw,18px);line-height:1.6;
  color:var(--sw3-ink-soft,#6a6072);max-width:38ch;margin:0}
.sw3d-tags{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
.sw3d-tags span{font-size:12px;padding:5px 11px;border-radius:999px;
  border:1px solid color-mix(in srgb,var(--sw3-ink) 18%,transparent);
  color:var(--sw3-ink-soft)}
.sw3d-cta{display:flex;gap:10px;margin-top:22px;pointer-events:auto}
.sw3d-btn{display:inline-block;padding:12px 24px;border-radius:12px;
  font-weight:650;text-decoration:none;font-size:15px;letter-spacing:.01em}
.sw3d-btn.primary{background:var(--acc,#9B7EBD);color:#fff;
  box-shadow:0 12px 26px -14px color-mix(in srgb,var(--acc) 80%,transparent)}
.sw3d-btn.ghost{border:1px solid color-mix(in srgb,var(--sw3-ink) 28%,transparent);
  color:var(--sw3-ink)}
.sw3d-rail{position:absolute;right:26px;top:50%;transform:translateY(-50%);
  z-index:3;display:flex;flex-direction:column;gap:13px}
.sw3d-rail button{width:10px;height:10px;padding:0;border:0;border-radius:50%;
  background:color-mix(in srgb,var(--sw3-ink) 24%,transparent);cursor:pointer;
  transition:transform .25s ease,background .25s ease}
.sw3d-rail button:hover{background:color-mix(in srgb,var(--sw3-ink) 45%,transparent)}
.sw3d-rail button.on{background:var(--acc,#9B7EBD);transform:scale(1.4)}
.sw3d-progress{position:absolute;top:0;left:0;right:0;height:3px;z-index:3}
.sw3d-progress span{display:block;height:100%;width:0;
  background:var(--acc,#9B7EBD);opacity:.85}
.sw3d-hint{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);
  font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--sw3-ink-soft,#6a6072);z-index:3;
  animation:sw3-bob 2.4s ease-in-out infinite}
@keyframes sw3-bob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-8px)}}
.sw3d-brand{position:absolute;top:26px;left:30px;z-index:3;font-weight:750;font-size:17px}
.sw3d-brand a{color:var(--sw3-ink,#241d2b);text-decoration:none}
.sw3d[data-reduced] .sw3d-progress,.sw3d[data-reduced] .sw3d-hint{display:none}
.sw3d[data-reduced] .sw3d-rail{display:none}
@media (max-width:760px){
  .sw3d-panel{left:5vw;top:auto;bottom:9vh;transform:none;max-width:88vw}
  .sw3d-rail{right:13px}
  .sw3d-brand{top:20px;left:20px}
}
`;

/* --------------------------------------------------------------------------
   mountScrollWorld
   -------------------------------------------------------------------------- */
export function mountScrollWorld(container, config) {
  const cfg = config.world || config;
  const sections = cfg.sections;
  if (!sections || !sections.length) {
    throw new Error('scroll-3d-world: config.world.sections[] is required');
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- DOM chrome ---------- */
  const style = document.createElement('style');
  style.textContent = `@layer sw3d{${CSS}}`;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'sw3d';
  root.innerHTML = `
    <div class="sw3d-stage"></div>
    <div class="sw3d-copy">${sections.map((s, i) => `
      <section class="sw3d-panel" data-i="${i}" style="--acc:${s.accent || '#9B7EBD'}">
        ${s.eyebrow ? `<p class="sw3d-eyebrow">${s.eyebrow}</p>` : ''}
        ${s.title ? `<h2 class="sw3d-title">${s.title}</h2>` : ''}
        ${s.body ? `<p class="sw3d-body">${s.body}</p>` : ''}
        ${s.tags && s.tags.length ? `<div class="sw3d-tags">${s.tags.map((t) => `<span>${t}</span>`).join('')}</div>` : ''}
        ${s.cta ? `<div class="sw3d-cta">
          <a class="sw3d-btn primary" href="${s.cta.primary ? s.cta.primary.href : '#'}">${s.cta.primary ? s.cta.primary.label : 'Get started'}</a>
          ${s.cta.secondary ? `<a class="sw3d-btn ghost" href="${s.cta.secondary.href}">${s.cta.secondary.label}</a>` : ''}
        </div>` : ''}
      </section>`).join('')}
    </div>
    <nav class="sw3d-rail" aria-label="sections">${sections.map((s, i) =>
      `<button data-i="${i}" title="${s.label || s.id || ''}"><span></span></button>`).join('')}</nav>
    <div class="sw3d-progress"><span></span></div>
    ${cfg.hint ? `<div class="sw3d-hint">${cfg.hint}</div>` : ''}
    ${config.brand ? `<div class="sw3d-brand"><a href="${config.brand.href || '#'}">${config.brand.name || ''}</a></div>` : ''}`;
  container.appendChild(root);

  const stage = root.querySelector('.sw3d-stage');
  const copyEls = [...root.querySelectorAll('.sw3d-panel')];
  const railBtns = [...root.querySelectorAll('.sw3d-rail button')];
  const progressEl = root.querySelector('.sw3d-progress span');
  const hintEl = root.querySelector('.sw3d-hint');

  /* ---------- renderer ---------- */
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = !!cfg.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  /* ---------- scene & lights ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.sky || '#f2ead9');
  if (cfg.fog) scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);

  const hemi = new THREE.HemisphereLight('#fff6e8', cfg.ground ? cfg.ground.color : '#cfc4ae', 0.95);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff1dc', 1.7);
  key.position.set(14, 22, 10);
  if (cfg.shadows) {
    const pods = sections.map((s) => s.pod).filter(Boolean);
    const xs = pods.flatMap((p) => [p.pos[0] - p.radius, p.pos[0] + p.radius]);
    const zs = pods.flatMap((p) => [p.pos[2] - p.radius, p.pos[2] + p.radius]);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = Math.min(...xs) - 10;
    key.shadow.camera.right = Math.max(...xs) + 10;
    key.shadow.camera.top = Math.max(...zs) + 10;
    key.shadow.camera.bottom = Math.min(...zs) - 10;
    key.shadow.camera.far = 120;
    key.shadow.bias = -0.0004;
  }
  scene.add(key);

  /* ---------- world ground ---------- */
  if (cfg.ground) {
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(400, 64),
      new THREE.MeshStandardMaterial({ color: cfg.ground.color, roughness: 1, metalness: 0 })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.02;
    g.receiveShadow = cfg.shadows;
    scene.add(g);
  }

  /* ---------- the kit (world API handed to section build()) ---------- */
  const material = (color, o = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: o.roughness != null ? o.roughness : 0.92,
      metalness: o.metalness != null ? o.metalness : 0,
      flatShading: o.flat != null ? o.flat : true,
      emissive: o.emissive ? new THREE.Color(o.emissive) : undefined,
      transparent: o.transparent,
      opacity: o.opacity,
    });

  const podAdd = (mesh) => { if (world.pod) world.pod.add(mesh); return mesh; };
  const place = (mesh, o = {}) => {
    const p = o;
    mesh.position.set(p.x || 0, p.y || 0, p.z || 0);
    if (p.ry) mesh.rotation.y = p.ry;
    if (p.rx) mesh.rotation.x = p.rx;
    return mesh;
  };
  const box = (color, w, h, d, o = {}) =>
    podAdd(place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, o)), o));
  const cyl = (color, rt, rb, h, o = {}) =>
    podAdd(place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 28), material(color, o)), o));
  const sphere = (color, r, o = {}) =>
    podAdd(place(new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 28, o.seg || 18), material(color, o)), o));
  const cone = (color, r, h, o = {}) =>
    podAdd(place(new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 28), material(color, o)), o));
  const ring = (color, rOut, rIn, o = {}) =>
    podAdd(place(new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, o.seg || 40), material(color, o)), o));
  const torus = (color, r, tube, o = {}) =>
    podAdd(place(new THREE.Mesh(new THREE.TorusGeometry(r, tube, o.tseg || 14, o.rseg || 40), material(color, o)), o));

  const world = {
    THREE,
    palette: cfg.palette || ['#9B7EBD'],
    mat: material,
    box, cyl, sphere, cone, ring, torus,
    group: (...children) => {
      const g = new THREE.Group();
      children.forEach((c) => c && g.add(c));
      return g;
    },
    ground(radius, color, o = {}) {
      const g = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.3, 48),
        material(color, { roughness: 1, flat: false })
      );
      g.position.y = -0.16 + (o.y || 0);
      return podAdd(g);
    },
    blob(x, z, radius, opacity = 0.18) {
      const b = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 36),
        new THREE.MeshBasicMaterial({
          color: '#000', transparent: true, opacity,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
        })
      );
      b.rotation.x = -Math.PI / 2;
      b.position.set(x, 0.015, z);
      return podAdd(b);
    },
    async loadGLB(url) {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene;
      m.traverse((o) => {
        if (o.isMesh) { o.castShadow = cfg.shadows; o.receiveShadow = cfg.shadows; }
      });
      return m;
    },
  };

  /* ---------- pods ---------- */
  sections.forEach((s) => {
    const pod = s.pod || { pos: [0, 0, 0], radius: 4, height: 3 };
    s._pod = pod;
    const group = new THREE.Group();
    group.position.set(...pod.pos);
    scene.add(group);
    s._group = group;
    world.pod = group;
    world.podCfg = pod;
    if (s.build) {
      const r = s.build(world);
      if (r && r.then) r.then(() => {});
    } else if (s.model) {
      world.loadGLB(s.model).then((m) => {
        const bbox = new THREE.Box3().setFromObject(m);
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = (pod.radius * 1.9) / maxDim;
        m.scale.setScalar(scale);
        const center = bbox.getCenter(new THREE.Vector3());
        m.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        group.add(m);
      }).catch((e) => console.error('scroll-3d-world: GLB load failed', s.model, e));
    }
  });

  /* ---------- camera path ---------- */
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 500);

  const posPts = [];
  const lookPts = [];
  sections.forEach((s, i) => {
    const pod = s._pod;
    const [px, py, pz] = pod.pos;
    const r = pod.radius, h = pod.height;
    const wps = s.waypoints || [
      { pos: [px, py + h * 2.1, pz + r * 2.5], look: [px, py + h * 0.5, pz] },
      { pos: [px, py + h * 0.85, pz + r * 1.3], look: [px, py + h * 0.5, pz] },
    ];
    s._wps = wps;
    posPts.push(new THREE.Vector3(...wps[0].pos));   // approach (i=0: also the start)
    posPts.push(new THREE.Vector3(...wps[1].pos));   // settle
    lookPts.push(new THREE.Vector3(...(wps[0].look || [px, py + h * 0.5, pz])));
    lookPts.push(new THREE.Vector3(...(wps[1].look || [px, py + h * 0.5, pz])));
  });
  // The path is [A0, S0, A1, S1, ..., A_{n-1}, S_{n-1}]: the depart of each
  // section IS the next section's approach, so the journey is one connected
  // flight with no extra control points needed.
  const posCurve = new THREE.CatmullRomCurve3(posPts, false, 'centripetal', 0.5);
  const lookCurve = new THREE.CatmullRomCurve3(lookPts, false, 'centripetal', 0.5);

  /* arc of each settle (control point 2i+1 in the full list) */
  const arcs = controlPointArcs(posCurve, posPts);
  const settleArc = sections.map((_, i) => arcs[2 * i + 1]);
  const startArc = arcs[0] || 0;

  /* ---------- scroll mapping ---------- */
  const bands = [];
  let totalW = 0;
  sections.forEach((s) => { totalW += s.scroll || 1.5; });
  let acc = 0;
  sections.forEach((s, i) => {
    const ws = acc / totalW; acc += s.scroll || 1.5; const we = acc / totalW;
    const T0 = i === 0 ? startArc : settleArc[i - 1];
    const T1 = settleArc[i];
    bands.push({ ws, we, T0, T1, warp: makeWarp(s.linger || 0) });
  });

  const totalScroll = totalW * window.innerHeight;
  const spacer = document.createElement('div');
  spacer.style.cssText = 'pointer-events:none;position:relative;z-index:0;height:0;visibility:hidden';
  document.body.appendChild(spacer);

  const pToArc = (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    for (const b of bands) {
      if (p >= b.ws && p <= b.we) {
        const t = b.warp.f((p - b.ws) / (b.we - b.ws));
        return mix(b.T0, b.T1, t);
      }
    }
    return 1;
  };
  const arcToP = (a) => {
    if (a <= 0) return 0;
    if (a >= 1) return 1;
    for (const b of bands) {
      if (a >= b.T0 && a <= b.T1) {
        const t = b.warp.finv((a - b.T0) / Math.max(1e-9, b.T1 - b.T0));
        return b.ws + t * (b.we - b.ws);
      }
    }
    return 1;
  };

  /* copy windows (arc space) */
  const copyWin = sections.map((_, i) => {
    const b = bands[i];
    const len = Math.max(1e-6, b.T1 - b.T0);
    const nextLen = i < sections.length - 1 ? Math.max(1e-6, bands[i + 1].T1 - bands[i + 1].T0) : 0;
    return {
      rise: b.T0 + 0.5 * len,
      peak: b.T0 + 0.72 * len,
      hold: b.T1 + 0.3 * nextLen,
      fade: b.T1 + 0.5 * nextLen,
    };
  });

  /* ---------- particles ---------- */
  let particles = null;
  if (cfg.particles !== false) {
    const N = 130;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 26 - 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: cfg.particleColor || '#fff7e8',
      size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.5,
      depthWrite: false,
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  /* ---------- interaction ---------- */
  let lastW = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth === lastW) return;   // ignore URL-bar height-only resizes
    lastW = window.innerWidth;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', onResize);

  railBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const p = arcToP(bands[i].T0 + (bands[i].T1 - bands[i].T0) * 0.5);
      window.scrollTo({ top: p * (spacer.offsetHeight - window.innerHeight), behavior: 'smooth' });
    });
  });

  /* ---------- main loop ---------- */
  const vTarget = new THREE.Vector3();
  const vCur = new THREE.Vector3();
  const lCur = new THREE.Vector3();

  let targetA = 0;
  let curA = 0;
  let firstScroll = false;
  let tPrev = performance.now();
  let activeSection = -1;
  const reducedNow = () => reduced.matches;
  if (reducedNow()) root.setAttribute('data-reduced', '');

  const updateSpacer = () => {
    spacer.style.height = `${totalScroll + window.innerHeight}px`;
  };
  updateSpacer();

  const scrollTo = (y) => window.scrollTo(0, y);
  let raf = 0;

  const frame = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - tPrev) / 1000));
    tPrev = now;

    if (!reducedNow()) {
      const maxScroll = Math.max(1, spacer.offsetHeight - window.innerHeight);
      const p = clamp(window.scrollY / maxScroll, 0, 1);
      targetA = pToArc(p);
      if (p > 0.002 && !firstScroll) {
        firstScroll = true;
        if (hintEl) hintEl.style.opacity = 0;
        if (hintEl) hintEl.style.transition = 'opacity .4s';
      }
    } else {
      targetA = settleArc[0] || 0;
      if (hintEl) hintEl.style.display = 'none';
    }

    const k = 1 - Math.exp(-11 * dt);
    curA += (targetA - curA) * k;

    posCurve.getPointAt(curA, vTarget);
    vCur.lerp(vTarget, 0.5);
    camera.position.copy(vTarget);
    lookCurve.getPointAt(curA, lCur);
    camera.lookAt(lCur);

    /* copy + rail */
    let on = -1;
    copyEls.forEach((el, i) => {
      const w = copyWin[i];
      let op = 0;
      if (curA <= w.rise) op = 0;
      else if (curA < w.peak) op = smooth((curA - w.rise) / Math.max(1e-6, w.peak - w.rise));
      else if (curA <= w.hold) op = 1;
      else if (curA < w.fade) op = 1 - smooth((curA - w.hold) / Math.max(1e-6, w.fade - w.hold));
      if (op > 0.05) on = i;
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translateY(${(1 - op) * 26}px)`;
    });
    if (on !== activeSection) {
      activeSection = on;
      railBtns.forEach((b, i) => b.classList.toggle('on', i === on));
    }
    progressEl.style.width = `${(targetA * 100).toFixed(2)}%`;

    /* particles */
    if (particles) {
      const pa = particles.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        pa.array[i * 3 + 1] += dt * 0.35;
        if (pa.array[i * 3 + 1] > 26) pa.array[i * 3 + 1] = -4;
      }
      pa.needsUpdate = true;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* reduced-motion can toggle live */
  const onReducedChange = () => {
    if (reduced.matches) {
      root.setAttribute('data-reduced', '');
      targetA = curA = settleArc[0] || 0;
      if (hintEl) hintEl.style.display = 'none';
      scrollTo(0);
    } else {
      root.removeAttribute('data-reduced');
      if (hintEl) hintEl.style.display = '';
      scrollTo(0);
      targetA = curA = 0;
    }
  };
  reduced.addEventListener('change', onReducedChange);

  const api = {
    unmount() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      reduced.removeEventListener('change', onReducedChange);
      spacer.remove();
      root.remove();
      style.remove();
      renderer.dispose();
    },
    goToSection(i) {
      const b = bands[Math.min(i, bands.length - 1)];
      const p = arcToP(b.T0 + (b.T1 - b.T0) * 0.5);
      window.scrollTo({ top: p * (spacer.offsetHeight - window.innerHeight), behavior: 'smooth' });
    },
    debug: () => ({
      arc: curA,
      camera: camera.position.toArray(),
      look: lCur.toArray(),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      scrollY: window.scrollY,
      maxScroll: Math.max(1, spacer.offsetHeight - window.innerHeight),
    }),
  };
  /* Debug hook for QA (headless screenshots, console checks). */
  if (typeof window !== 'undefined') window.__sw3d = { last: () => api.debug() };
  return api;
}
