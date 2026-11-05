// Free-look camera for the loadout screen: drag = orbit, wheel/pinch = zoom, right/shift/two-finger drag = pan, double-click = reset.
import { MENU_CAM } from './loadoutui';
import { shipFit } from './ship';

const PITCH0 = (55 * Math.PI) / 180, YAW0 = Math.PI / 4;
const PMIN = (15 * Math.PI) / 180, PMAX = (80 * Math.PI) / 180, MAG_MAX = 4, IDLE = 4, AUTO = 0.08, MARGIN = 1.1;

/** Smoothed view state; the targets (suffix T) are what input writes to. */
export const ST = { yaw: YAW0, pitch: PITCH0, mag: 1, panX: 0, panY: 0, fit: 20, cx: 0, cy: 0, cz: 0 };
const T = { yaw: YAW0, pitch: PITCH0, mag: 1, panX: 0, panY: 0 };
let clock = 0, lastTouch = -99, auto = 0, yawVel = 0, lastMove = 0;
const ptrs = new Map<number, { x: number; y: number }>();
let pan = false, installed = false;

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const panLim = (): { x: number; y: number } => {
  const k = 0.18 + 0.25 * (T.mag - 1);
  return { x: Math.min(0.5, k) * MENU_CAM.w, y: Math.min(0.5, k) * MENU_CAM.h };
};
function clampPan(): void { const l = panLim(); T.panX = clamp(T.panX, -l.x, l.x); T.panY = clamp(T.panY, -l.y, l.y); }

/** Called when the loadout screen opens: start from the title camera's angle. */
export function beginStage(yaw: number): void {
  ST.yaw = T.yaw = yaw; ST.pitch = T.pitch = PITCH0; ST.mag = T.mag = 1; ST.panX = ST.panY = T.panX = T.panY = 0;
  lastTouch = -99; auto = 0; yawVel = 0; ptrs.clear();
}
export function resetView(): void {
  T.yaw = YAW0 + Math.PI * 2 * Math.round((T.yaw - YAW0) / (Math.PI * 2)); // the nearest equivalent, so it does not unwind turns
  T.pitch = PITCH0; T.mag = 1; T.panX = T.panY = 0; yawVel = 0; lastTouch = clock;
}

/** Advances the smoothing and the idle orbit; returns the visible half-height in world units for the current view. */
export function stepStage(dt: number): number {
  clock += dt;
  const idle = ptrs.size === 0 && clock - lastTouch > IDLE;
  auto += ((idle ? AUTO : 0) - auto) * (1 - Math.exp(-1.2 * dt));
  T.yaw += auto * dt;
  const k = (r: number): number => 1 - Math.exp(-r * dt);
  ST.yaw += (T.yaw - ST.yaw) * k(12); ST.pitch += (T.pitch - ST.pitch) * k(12);
  ST.mag += (T.mag - ST.mag) * k(10); ST.panX += (T.panX - ST.panX) * k(14); ST.panY += (T.panY - ST.panY) * k(14);
  const f = shipFit(); // the bounding sphere eases when the ship changes
  ST.fit += (f.r - ST.fit) * k(8); ST.cx = f.cx; ST.cy = f.cy; ST.cz = f.cz;
  const side = Math.max(60, Math.min(MENU_CAM.w, MENU_CAM.h));
  return (ST.fit * MARGIN * innerHeight) / side / ST.mag; // sphere radius R fills min(stage w,h)/MARGIN at mag 1
}

function touch(): void { lastTouch = clock; }
function zoomBy(f: number): void { T.mag = clamp(T.mag * f, 1, MAG_MAX); clampPan(); touch(); }

/** Installs the pointer/wheel handlers once on the (long-lived) menu root; the stage element itself is rebuilt on every redraw. */
export function installStage(root: HTMLElement): void {
  if (installed) return;
  installed = true;
  const onStage = (e: Event): boolean => MENU_CAM.on && (e.target as HTMLElement).closest('#lstage') !== null && (e.target as HTMLElement).closest('button') === null;
  root.addEventListener('contextmenu', e => { if (onStage(e)) e.preventDefault(); });
  root.addEventListener('dblclick', e => { if (onStage(e)) resetView(); });
  root.addEventListener('wheel', e => {
    if (!onStage(e)) return;
    e.preventDefault();
    const d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    zoomBy(Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0016)));
  }, { passive: false });
  root.addEventListener('pointerdown', e => {
    if (!onStage(e)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { root.setPointerCapture(e.pointerId); } catch { /* the pointer may already be gone */ }
    pan = e.button === 2 || e.shiftKey; yawVel = 0; lastMove = 0; touch();
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (ptrs.size >= 2) {
      const o = [...ptrs.entries()].find(([id]) => id !== e.pointerId)![1];
      const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
      if (d0 > 8) zoomBy(d1 / d0);
      T.panX += dx / 2; T.panY += dy / 2; clampPan(); // the midpoint moves by half of this finger's step
    } else if (pan || e.shiftKey || (e.buttons & 2) !== 0) { T.panX += dx; T.panY += dy; clampPan(); }
    else {
      T.yaw -= dx * 0.007; T.pitch = clamp(T.pitch + dy * 0.005, PMIN, PMAX);
      yawVel = -dx * 0.007 * 60; lastMove = e.timeStamp;
    }
    p.x = e.clientX; p.y = e.clientY; touch();
  });
  const up = (e: PointerEvent): void => {
    if (!ptrs.delete(e.pointerId)) return;
    if (ptrs.size === 0 && !pan && e.timeStamp - lastMove < 80) T.yaw += clamp(yawVel, -6, 6) * 0.2; // fling
    touch();
  };
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
}
