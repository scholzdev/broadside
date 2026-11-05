import * as THREE from 'three';

// ---- shared edge arrows: point at tracked things that are off-screen or hidden (fog), clamped to the screen edge ----
// Two ways in: a per-frame list per source (setArrows('fog', [...])) or a standing tracker (trackArrow(id, getPos, kind)).

export type ArrowKind = 'enemy' | 'boss' | 'quest' | 'treasure';
/** `ring`: for a target that is on screen but hidden, draw the arrow on this world radius around the player instead (fog edge). */
export interface Arrow { x: number; z: number; kind: ArrowKind; ring?: number; d?: number }

const lists = new Map<string, Arrow[]>();
const tracked = new Map<string, { get: () => { x: number; z: number } | null; kind: ArrowKind }>();
export const setArrows = (source: string, list: Arrow[]): void => { lists.set(source, list); };
export const trackArrow = (id: string, getPos: () => { x: number; z: number } | null, kind: ArrowKind): void => { tracked.set(id, { get: getPos, kind }); };
export const untrack = (id: string): void => { tracked.delete(id); };
export const clearArrows = (): void => { lists.clear(); tracked.clear(); };

const pool: HTMLElement[] = [];
let layer: HTMLElement | null = null, shown = 0;
const v = new THREE.Vector3(), MARGIN = 34;

function el(i: number): HTMLElement {
  if (!layer) { layer = document.createElement('div'); layer.id = 'arrows'; document.getElementById('hud')?.appendChild(layer); }
  while (pool.length <= i) { const d = document.createElement('div'); d.className = 'earrow'; d.innerHTML = '<i></i>'; layer.appendChild(d); pool.push(d); }
  return pool[i];
}

/** Per render frame (after the camera moved). `px, pz` = the player's render position. */
export function updateArrows(cam: THREE.Camera, w: number, h: number, px: number, pz: number, active: boolean): void {
  const all: Arrow[] = [];
  if (active) {
    for (const l of lists.values()) all.push(...l);
    for (const t of tracked.values()) { const p = t.get(); if (p) all.push({ x: p.x, z: p.z, kind: t.kind }); }
  }
  v.set(px, 0, pz).project(cam);
  const cx = (v.x * 0.5 + 0.5) * w, cy = (-v.y * 0.5 + 0.5) * h;
  let n = 0;
  for (const a of all) {
    v.set(a.x, 0, a.z).project(cam);
    let sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
    const on = sx > MARGIN && sx < w - MARGIN && sy > MARGIN && sy < h - MARGIN;
    if (on && a.ring === undefined) continue; // visible on screen: no arrow needed
    if (on && a.ring !== undefined) {
      const d = Math.hypot(a.x - px, a.z - pz) || 1;
      v.set(px + ((a.x - px) / d) * a.ring, 0, pz + ((a.z - pz) / d) * a.ring).project(cam);
      sx = (v.x * 0.5 + 0.5) * w; sy = (-v.y * 0.5 + 0.5) * h;
    }
    // clamp along the ray from the player's screen position to the screen rectangle
    const dx = sx - cx, dy = sy - cy, ang = Math.atan2(dy, dx);
    const k = Math.min(1, dx ? Math.abs(((dx > 0 ? w - MARGIN : MARGIN) - cx) / dx) : 1, dy ? Math.abs(((dy > 0 ? h - MARGIN : MARGIN) - cy) / dy) : 1);
    const e = el(n++);
    e.className = 'earrow ' + a.kind;
    e.style.display = '';
    e.style.transform = `translate(${cx + dx * k}px,${cy + dy * k}px) rotate(${ang}rad)`;
  }
  for (let i = n; i < shown; i++) pool[i].style.display = 'none';
  shown = n;
}
export const arrowCount = (): number => shown;
