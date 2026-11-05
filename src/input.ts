const held = new Set<string>();
let taps: string[] = [];
export const input = { zoom: 1, lock: false };
/** Gamepad state shared with gamepad.ts / prompts.ts: lastInput drives the button-prompt swap (body.pad). */
export const pad = { connected: false, id: '', lastInput: 'keyboard' as 'keyboard' | 'gamepad' | 'touch' };
/** Analog stick input written by gamepad.ts each frame: turn = -1..1 (+1 = port), fwd/back = throttle, boost = RT / A held. */
export const padIn = { turn: 0, fwd: false, back: false, boost: false, aimX: 0, aimY: 0, mag: 0 };
const srcListeners: (() => void)[] = [];
/** On-screen controls (touch.ts): same shape as padIn but never overwritten by gamepad.ts. */
/** aimX / aimY = stick deflection on screen (x right, y up), mag = 0..1 (deadzone applied); used by absolute 'stick' steering, while turn / fwd / back stay zero in that mode. */
export const touchIn = { turn: 0, fwd: false, back: false, boost: false, aimX: 0, aimY: 0, mag: 0 };
export const onInputSource = (f: () => void): void => { srcListeners.push(f); };
export function setLastInput(src: 'keyboard' | 'gamepad' | 'touch'): void {
  if (pad.lastInput === src) return;
  pad.lastInput = src;
  document.body.classList.toggle('pad', src === 'gamepad');
  document.body.classList.toggle('touch', src === 'touch');
  for (const f of srcListeners) f();
}
/** Synthetic key tap (gamepad -> menu / card / pause pipeline). */
export const pushTap = (code: string): void => { taps.push(code); };
const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

addEventListener('keydown', e => {
  setLastInput('keyboard');
  if (block.has(e.code)) e.preventDefault();
  if (!e.repeat) taps.push(e.code);
  held.add(e.code);
});
addEventListener('keyup', e => held.delete(e.code));
addEventListener('blur', () => held.clear());
let mx = 0, my = 0;
addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; if (Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) > 3) setLastInput('keyboard'); mx = e.clientX; my = e.clientY; });
document.getElementById('c')?.addEventListener('pointerdown', e => setLastInput(e.pointerType === 'touch' ? 'touch' : 'keyboard'));
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') setLastInput('touch'); }, true);
if (matchMedia('(pointer:coarse)').matches) setLastInput('touch'); // phones / tablets start in touch mode; a keydown or mouse move switches back
addEventListener('wheel', e => {
  if (input.lock) return;
  input.zoom = Math.min(1.6, Math.max(0.6, input.zoom * (e.deltaY > 0 ? 1.08 : 0.92)));
}, { passive: true });

export const takeTaps = (): string[] => { const t = taps; taps = []; return t; };
export const fwdHeld = (): boolean => held.has('KeyW') || held.has('ArrowUp') || padIn.fwd || touchIn.fwd;
export const backHeld = (): boolean => held.has('KeyS') || held.has('ArrowDown') || padIn.back || touchIn.back;
/** +1 = turning to port (A / Left), -1 = starboard (D / Right). */
export const turnAxis = (): number => {
  const kb = (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) - (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0);
  return Math.max(-1, Math.min(1, kb + padIn.turn + touchIn.turn)); // keyboard is digital, the stick analog (deadzone applied in gamepad.ts)
};
/** True while any steering / throttle key is held (keyboard tank steering overrides the stick). */
export const kbDrive = (): boolean => ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(k => held.has(k));
/** The stronger of the gamepad and touch sticks (screen space: x right, y up, mag 0..1). */
export const stickVec = (): { x: number; y: number; mag: number } => { const s = touchIn.mag > padIn.mag ? touchIn : padIn; return { x: s.aimX, y: s.aimY, mag: s.mag }; };
/** Full Sail: hold Shift. */
export const boostHeld = (): boolean => held.has('ShiftLeft') || held.has('ShiftRight') || padIn.boost || touchIn.boost;
/** Debug: hold keys programmatically (released on the next call or a window blur). */
const fake = new Set<string>();
export function holdKeys(codes: string[]): void { for (const c of fake) held.delete(c); fake.clear(); for (const c of codes) { fake.add(c); held.add(c); } }
