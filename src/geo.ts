import * as THREE from 'three';

// ---- merged, vertex-coloured geometry: every static model is one BufferGeometry on one shared material ----

/** Triangle colour: a hex, a function of the triangle centre (model space), or null = the geometry's own linear `color` attribute. */
export type Paint = number | ((x: number, y: number, z: number) => number) | null;
export interface PartOpts {
  /** Emissive colour added on top of lighting (HDR; multiplied by `glow`). */
  emit?: number; glow?: number;
  /** Keep the part's own (smooth) normals instead of flat facets. */
  smooth?: boolean;
  /** Per-triangle brightness variation (0..1) for a hand-painted look. */
  jitter?: number;
}

const _c = new THREE.Color(), _e = new THREE.Color(), _n = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _nm = new THREE.Matrix3();

/** Accumulates non-indexed triangles with linear vertex colours and per-vertex HDR emission. */
export class Builder {
  private pos: number[] = [];
  private nrm: number[] = [];
  private col: number[] = [];
  private emi: number[] = [];
  private seed = 1;

  add(src: THREE.BufferGeometry, paint: Paint, m?: THREE.Matrix4, o: PartOpts = {}): this {
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (m) g.applyMatrix4(m);
    const p = g.attributes.position.array as ArrayLike<number>;
    const sn = o.smooth && g.attributes.normal ? (g.attributes.normal.array as ArrayLike<number>) : null;
    const ca = paint === null ? (g.attributes.color.array as ArrayLike<number>) : null;
    if (o.emit !== undefined) _e.set(o.emit).multiplyScalar(o.glow ?? 1); else _e.setRGB(0, 0, 0);
    const jit = o.jitter ?? 0.06;
    for (let i = 0; i + 8 < p.length; i += 9) {
      const cx = (p[i] + p[i + 3] + p[i + 6]) / 3, cy = (p[i + 1] + p[i + 4] + p[i + 7]) / 3, cz = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
      if (paint !== null) _c.set(typeof paint === 'number' ? paint : paint(cx, cy, cz));
      this.seed = (this.seed * 16807) % 2147483647;
      const j = 1 - jit + ((this.seed / 2147483647) * 2 * jit);
      if (!sn) {
        _a.set(p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]);
        _b.set(p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]);
        _n.crossVectors(_a, _b).normalize();
      }
      for (let v = 0; v < 3; v++) {
        const k = i + v * 3;
        this.pos.push(p[k], p[k + 1], p[k + 2]);
        if (sn) this.nrm.push(sn[k], sn[k + 1], sn[k + 2]); else this.nrm.push(_n.x, _n.y, _n.z);
        if (ca) this.col.push(ca[k] * j, ca[k + 1] * j, ca[k + 2] * j); else this.col.push(_c.r * j, _c.g * j, _c.b * j);
        this.emi.push(_e.r, _e.g, _e.b);
      }
    }
    g.dispose();
    return this;
  }

  /** Raw triangles (flat-shaded), e.g. for hand-built hull strips. */
  tris(v: number[], paint: Paint, o: PartOpts = {}): this {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return this.add(g, paint, undefined, o);
  }

  /** Quad a-b-c-d (counter-clockwise seen from the front) as two triangles. */
  quad(a: V3, b: V3, c: V3, d: V3, paint: Paint, o?: PartOpts): this {
    return this.tris([...a, ...b, ...c, ...a, ...c, ...d], paint, o);
  }

  get empty(): boolean { return this.pos.length === 0; }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('emit', new THREE.Float32BufferAttribute(this.emi, 3));
    g.computeBoundingSphere();
    return g;
  }
}
export type V3 = [number, number, number];

/** Compose a transform: position, Euler rotation (XYZ), uniform or per-axis scale. */
export function xf(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: number | V3 = 1): THREE.Matrix4 {
  const sc = typeof s === 'number' ? _d.set(s, s, s) : _d.set(s[0], s[1], s[2]);
  return new THREE.Matrix4().compose(_a.set(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), sc.clone());
}

const UP = new THREE.Vector3(0, 1, 0);
/** Thin n-sided rod between two points (rigging, spars). */
export function rod(b: Builder, p0: V3, p1: V3, r: number, paint: Paint, sides = 3, o?: PartOpts): void {
  _a.set(...p0); _b.set(...p1);
  const len = _a.distanceTo(_b);
  if (len < 1e-4) return;
  const g = new THREE.CylinderGeometry(r, r, len, sides, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, _d.subVectors(_b, _a).normalize());
  const m = new THREE.Matrix4().compose(_a.add(_b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  b.add(g, paint, m, o);
  g.dispose();
}

// ---- shared materials ----

type Shader = { vertexShader: string; fragmentShader: string };
function patchEmit(s: Shader): void {
  s.vertexShader = s.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 emit;\nvarying vec3 vEmit;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmit = emit;');
  s.fragmentShader = s.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vEmit;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit;');
}

/**
 * Standard material that reads vertex colours plus the per-vertex `emit` attribute (added to the material
 * emissive, so a hit flash still covers the whole model). A subclass, so `clone()` keeps the shader patch.
 */
export class PaintedMaterial extends THREE.MeshStandardMaterial {
  constructor(p: THREE.MeshStandardMaterialParameters = {}) {
    super({ vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, ...p });
    this.onBeforeCompile = patchEmit;
  }
}
/** The one material shared by ships, islands and props (cloneMats copies it per enemy for hit flashes). */
export const PAINTED = new PaintedMaterial();

/** Mesh on the shared painted material, casting and receiving shadows. */
export function paintedMesh(g: THREE.BufferGeometry, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(g, PAINTED);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** Shade a hex colour (k < 1 darker, k > 1 lighter) in sRGB space. */
export function shade(hex: number, k: number): number {
  const r = Math.min(255, ((hex >> 16) & 255) * k), g = Math.min(255, ((hex >> 8) & 255) * k), b = Math.min(255, (hex & 255) * k);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
