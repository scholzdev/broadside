import * as THREE from 'three';
import { G, scene } from './game';
import { edibles } from './edibles';
import { sinking } from './enemies';
import { model, renderPos } from './ship';
import { WAVE_GLSL, uTime } from './anim';
import { NOISE_GLSL } from './glsl';
import { L } from './loadout';

// ---- ship wakes: one dynamic mesh (one draw call) holding a widening foam ribbon behind every ship
// and a foam ring around each moving hull. Visual only: reads render positions after the visuals update. ----

const LIFE = 2.6, STEP_D = 0.7, MAX_PTS = 36, MAX_SHIPS = 72;
const MAX_V = MAX_SHIPS * (MAX_PTS * 2 + 2 + 4), MAX_I = MAX_SHIPS * ((MAX_PTS + 1) * 6 + 6);
interface Pt { x: number; z: number; t: number; w: number; a: number }
interface Trail { pts: Pt[]; seen: number; lx: number; lz: number; spd: number }
const trails = new Map<object, Trail>();

const pos = new Float32Array(MAX_V * 3), uv = new Float32Array(MAX_V * 2), dat = new Float32Array(MAX_V * 2), idx = new Uint16Array(MAX_I);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('aData', new THREE.BufferAttribute(dat, 2).setUsage(THREE.DynamicDrawUsage));
geo.setIndex(new THREE.BufferAttribute(idx, 1).setUsage(THREE.DynamicDrawUsage));

const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
uniforms.uTime = uTime;
const mat = new THREE.ShaderMaterial({
  uniforms, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, // ribbon winding flips with turn direction
  vertexShader: /* glsl */ `
    #include <common>
    #include <fog_pars_vertex>
    attribute vec2 aData;
    uniform float uTime;
    varying vec2 vUv; varying vec2 vData; varying vec2 vW;
    ${WAVE_GLSL}
    void main() {
      vec3 wp = position;
      wp.y = waveH(wp.xz, uTime) + 0.09;
      vUv = uv; vData = aData; vW = wp.xz;
      vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <fog_pars_fragment>
    uniform float uTime;
    varying vec2 vUv; varying vec2 vData; varying vec2 vW;
    ${NOISE_GLSL}
    void main() {
      float n = vnoise(vW * 1.8 + vec2(uTime * 0.25, -uTime * 0.2)) * 0.6 + vnoise(vW * 4.6 - uTime * 0.4) * 0.4;
      float a;
      if (vData.y < 0.5) {
        float across = abs(vUv.x), age = vUv.y;
        float edge = smoothstep(0.5, 0.86, across) * smoothstep(1.0, 0.88, across);
        float churn = (1.0 - smoothstep(0.0, 0.55, across)) * (1.0 - age);
        a = max(edge, churn * 0.6) * smoothstep(0.32 + age * 0.3, 0.64 + age * 0.15, n);
      } else {
        float d = length(vUv);
        float ring = smoothstep(0.66, 0.84, d) * smoothstep(1.0, 0.86, d);
        a = ring * (0.3 + 0.7 * smoothstep(-0.2, 0.9, vUv.y)) * smoothstep(0.28, 0.55, n);
      }
      gl_FragColor = vec4(vec3(0.94, 0.98, 1.0), clamp(a * vData.x, 0.0, 1.0) * 0.9);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});
const mesh = new THREE.Mesh(geo, mat);
mesh.frustumCulled = false;
mesh.renderOrder = 0;
let added = false, frame = 0;

interface ShipRef { key: object; x: number; z: number; h: number; spd: number; len: number; beam: number }
const ships: ShipRef[] = [];

function gather(): void {
  ships.length = 0;
  const p = G.player;
  ships.push({ key: p, x: renderPos.x, z: renderPos.z, h: model.root.rotation.y, spd: Math.max(0, p.speed) / 9, len: L.geo.len, beam: L.geo.beam });
  for (const e of G.enemies) {
    if (!e.model.root.visible) continue; // submerged serpents and fog-hidden ships leave no wake
    const r = e.r;
    ships.push({ key: e, x: e.model.root.position.x, z: e.model.root.position.z, h: e.model.root.rotation.y, spd: e.speed / 8, len: r * 2.7, beam: r * 1.05 });
  }
  for (const e of sinking) ships.push({ key: e, x: e.x, z: e.z, h: e.heading, spd: 0, len: e.r * 2.7, beam: e.r * 1.05 });
  for (const e of edibles) if (e.kind === 'boat') ships.push({ key: e, x: e.mesh.position.x, z: e.mesh.position.z, h: e.mesh.rotation.y, spd: -1, len: 2.2, beam: 0.95 });
}

export function updateWakes(dt: number): void {
  if (!added) { scene.add(mesh); added = true; }
  frame++;
  const now = uTime.value;
  gather();
  let v = 0, ii = 0;
  for (const s of ships) {
    if (v + MAX_PTS * 2 + 6 > MAX_V) break;
    let tr = trails.get(s.key);
    if (!tr) { tr = { pts: [], seen: frame, lx: s.x, lz: s.z, spd: 0 }; trails.set(s.key, tr); }
    // speed from movement when the caller has none (edible boats); smoothed
    const moved = Math.hypot(s.x - tr.lx, s.z - tr.lz);
    const sp = s.spd >= 0 ? Math.min(1.2, s.spd) : Math.min(1, moved / Math.max(dt, 1e-3) / 6);
    tr.spd += (sp - tr.spd) * Math.min(1, dt * 4);
    tr.seen = frame;
    const fx = Math.sin(s.h), fz = Math.cos(s.h), sx = s.x - fx * s.len * 0.46, sz = s.z - fz * s.len * 0.46;
    const last = tr.pts[tr.pts.length - 1];
    if (tr.spd > 0.08 && (!last || Math.hypot(sx - last.x, sz - last.z) > STEP_D * Math.max(0.6, s.len / 6.4))) {
      tr.pts.push({ x: sx, z: sz, t: now, w: s.beam * 0.42, a: Math.min(1, tr.spd * 1.3) });
      if (tr.pts.length > MAX_PTS) tr.pts.shift();
    }
    tr.lx = s.x; tr.lz = s.z;
    // hull ring
    if (tr.spd > 0.05) {
      const hl = s.len * 0.62, hb = s.beam * 0.95, px = fz, pz = -fx, a = Math.min(1, tr.spd * 1.4);
      const c: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [u, w] of c) {
        pos.set([s.x + px * u * hb + fx * w * hl, 0, s.z + pz * u * hb + fz * w * hl], v * 3);
        uv.set([u, w], v * 2); dat.set([a, 1], v * 2); v++;
      }
      idx.set([v - 4, v - 3, v - 2, v - 4, v - 2, v - 1], ii); ii += 6;
    }
    v = ribbon(tr, s, sx, sz, now, v);
    ii = ribbonIdx(tr, v, ii);
  }
  // trails of ships that are gone keep fading out
  for (const [k, tr] of trails) {
    while (tr.pts.length && now - tr.pts[0].t > LIFE) tr.pts.shift();
    if (tr.seen !== frame) {
      if (!tr.pts.length) { trails.delete(k); continue; }
      if (v + MAX_PTS * 2 > MAX_V) continue;
      const end = tr.pts[tr.pts.length - 1];
      v = ribbon(tr, null, end.x, end.z, now, v);
      ii = ribbonIdx(tr, v, ii);
    }
  }
  geo.setDrawRange(0, ii);
  for (const n of ['position', 'uv', 'aData'] as const) {
    const at = geo.attributes[n] as THREE.BufferAttribute;
    at.clearUpdateRanges(); at.addUpdateRange(0, v * at.itemSize); at.needsUpdate = true;
  }
  const ia = geo.index as THREE.BufferAttribute;
  ia.clearUpdateRanges(); ia.addUpdateRange(0, ii); ia.needsUpdate = true;
}

let segStart = 0, segCount = 0;
/** Writes the ribbon vertices (oldest -> head at the stern); remembers where they start for ribbonIdx. */
function ribbon(tr: Trail, s: ShipRef | null, hx: number, hz: number, now: number, v: number): number {
  segStart = v; segCount = 0;
  const n = tr.pts.length;
  if (n < 1) return v;
  for (let i = 0; i <= n; i++) {
    const p = i < n ? tr.pts[i] : null;
    const x = p ? p.x : hx, z = p ? p.z : hz;
    if (!p && !s) break;
    const age = p ? Math.min(1, (now - p.t) / LIFE) : 0;
    const a = (p ? p.a : Math.min(1, tr.spd * 1.3)) * (1 - age) * (1 - age);
    const prev = tr.pts[Math.max(0, i - 1)], next = i + 1 < n ? tr.pts[i + 1] : { x: hx, z: hz };
    let dx = next.x - prev.x, dz = next.z - prev.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    const w = (p ? p.w : (s ? s.beam * 0.42 : 0.5)) + age * 2.4;
    pos.set([x + dz * w, 0, z - dx * w, x - dz * w, 0, z + dx * w], v * 3);
    uv.set([1, age, -1, age], v * 2);
    dat.set([a, 0, a, 0], v * 2);
    v += 2; segCount++;
  }
  return v;
}
function ribbonIdx(_tr: Trail, _v: number, ii: number): number {
  for (let k = 0; k < segCount - 1; k++) {
    const a = segStart + k * 2;
    idx.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], ii);
    ii += 6;
  }
  return ii;
}
