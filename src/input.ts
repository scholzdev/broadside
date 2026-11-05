const held = new Set<string>();
let taps: string[] = [];
export const input = { zoom: 1, lock: false };
/** Gamepad state shared with gamepad.ts / prompts.ts: lastInput drives the button-prompt swap (body.pad). */
export const pad = { connected: false, id: '', lastInput: 'keyboard' as 'keyboard' | 'gamepad' };
/** Analog stick input written by gamepad.ts each frame: turn = -1..1 (+1 = port), fwd/back = throttle, boost = RT / A held. */
export const padIn = { turn: 0, fwd: false, back: false, boost: false };
const srcListeners: (() => void)[] = [];
export const onInputSource = (f: () => void): void => { srcListeners.push(f); };
export function setLastInput(src: 'keyboard' | 'gamepad'): void {
  if (pad.lastInput === src) return;
  pad.lastInput = src;
  document.body.classList.toggle('pad', src === 'gamepad');
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
addEventListener('pointermove', e => { if (Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) > 3) setLastInput('keyboard'); mx = e.clientX; my = e.clientY; });
document.getElementById('c')?.addEventListener('pointerdown', () => setLastInput('keyboard'));
addEventListener('wheel', e => {
  if (input.lock) return;
  input.zoom = Math.min(1.6, Math.max(0.6, input.zoom * (e.deltaY > 0 ? 1.08 : 0.92)));
}, { passive: true });

export const takeTaps = (): string[] => { const t = taps; taps = []; return t; };
export const fwdHeld = (): boolean => held.has('KeyW') || held.has('ArrowUp') || padIn.fwd;
export const backHeld = (): boolean => held.has('KeyS') || held.has('ArrowDown') || padIn.back;
/** +1 = turning to port (A / Left), -1 = starboard (D / Right). */
export const turnAxis = (): number => {
  const kb = (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) - (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0);
  return Math.max(-1, Math.min(1, kb + padIn.turn)); // keyboard is digital, the stick analog (deadzone applied in gamepad.ts)
};
/** Full Sail: hold Shift. */
export const boostHeld = (): boolean => held.has('ShiftLeft') || held.has('ShiftRight') || padIn.boost;
/** Debug: hold keys programmatically (released on the next call or a window blur). */
const fake = new Set<string>();
export function holdKeys(codes: string[]): void { for (const c of fake) held.delete(c); fake.clear(); for (const c of codes) { fake.add(c); held.add(c); } }
