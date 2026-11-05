import { G } from './game';
import { pad, padIn, pushTap, setLastInput } from './input';
import { S } from './settings';
import { J } from './juice';
import { padPickStep } from './padpick';

// ---- Gamepad API (standard mapping) -> the same paths as the keyboard ----
// Playing: left stick steers (x) and sets throttle (y), RT / A boost, LB / RB / Y fire the bow / stern / side abilities (= Q / E / R), Start pause.
// Menus / cards: D-pad or left stick navigate, A confirm, B back, Y reroll, LB / RB tabs. Everything becomes synthetic key taps (pushTap).
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SEL: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
let prev: boolean[] = [], navHeld = '', navT = 0, lastTrauma = 0, lastFlash = 0;

const dead = (v: number, dz: number): number => (Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz));
const rumble = (gp: Gamepad, ms: number, strong: number, weak: number): void => {
  if (!S.vib) return;
  const a = (gp as unknown as { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }).vibrationActuator;
  try { void a?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) })?.catch(() => 0); } catch { /* unsupported */ }
};

function find(): Gamepad | null {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of list) if (g && g.connected) return g;
  return null;
}

/** Edge-triggered navigation (D-pad or left stick) with key repeat; returns the arrow code to emit this frame, or ''. */
function navDir(gp: Gamepad, pressed: (i: number) => boolean, now: number): string {
  const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;
  let d = '';
  if (pressed(B.UP) || ly < -0.6) d = 'ArrowUp';
  else if (pressed(B.DOWN) || ly > 0.6) d = 'ArrowDown';
  else if (pressed(B.LEFT) || lx < -0.6) d = 'ArrowLeft';
  else if (pressed(B.RIGHT) || lx > 0.6) d = 'ArrowRight';
  if (!d) { navHeld = ''; return ''; }
  if (d !== navHeld) { navHeld = d; navT = now + 380; return d; }
  if (now >= navT) { navT = now + 130; return d; }
  return '';
}

function poll(now: number): void {
  requestAnimationFrame(poll);
  const gp = find();
  if (!gp) {
    if (pad.connected) { pad.connected = false; pad.id = ''; padIn.turn = 0; padIn.fwd = padIn.back = padIn.boost = false; if (pad.lastInput === 'gamepad') setLastInput('keyboard'); }
    return;
  }
  if (!pad.connected) { pad.connected = true; pad.id = gp.id; prev = []; }
  const down = (i: number): boolean => !!gp.buttons[i]?.pressed;
  const edge = (i: number): boolean => down(i) && !prev[i];
  const dz = S.padDz, ax = (i: number): number => gp.axes[i] ?? 0;
  const lx = dead(ax(0), dz), ly = dead(ax(1), dz), rx = dead(ax(2), dz), ry = dead(ax(3), dz); // right stick: only marks the pad as the last input
  const anyBtn = gp.buttons.some((b, i) => b.pressed && !prev[i]);
  if (anyBtn || lx || ly || rx || ry) setLastInput('gamepad');
  const st = G.state;
  if (st === 'playing') {
    padIn.turn = -lx; padIn.fwd = ly < -0.3; padIn.back = ly > 0.3;
    padIn.boost = down(B.RT) || (gp.buttons[B.RT]?.value ?? 0) > 0.4 || down(B.A);
    if (edge(B.LB)) pushTap('KeyQ'); // slot abilities: only while sailing, so menu / card LB, RB and Y keep their meaning
    if (edge(B.RB)) pushTap('KeyE');
    if (edge(B.Y)) pushTap('KeyR');
    if (edge(B.START)) pushTap('KeyP');
  } else {
    padIn.turn = 0; padIn.fwd = padIn.back = padIn.boost = false;
    if (st === 'levelup' || st === 'loot') padPickStep(navDir(gp, down, now), edge(B.A), edge(B.Y), edge(B.B));
    else if (st === 'dead' || st === 'won') {
      if (edge(B.A)) document.getElementById('again')?.click();
      else if (edge(B.B)) document.getElementById('toMenu')?.click();
    } else { // menu / paused
      const d = navDir(gp, down, now);
      if (d) pushTap(d);
      if (edge(B.A) || (st === 'menu' && edge(B.START))) pushTap('Enter');
      if (edge(B.B)) pushTap('Escape');
      if (st === 'paused' && edge(B.START)) pushTap('KeyP');
      if (edge(B.RB) || edge(B.LB)) pushTap(st === 'menu' && document.getElementById('menu')?.dataset.screen === 'loadout' ? 'KeyQ' : 'Tab'); // loadout: LB / RB flip Loadout <-> Decorations (loadoutui handles Q / E)
    }
  }
  // rumble: hits (hitFlash rising) and screen-shake trauma (bosses, big blasts)
  if (G.hitFlash > lastFlash + 0.05) rumble(gp, 160, 0.7, 0.4);
  else if (J.trauma > lastTrauma + 0.12) rumble(gp, 220, 0.5 + J.trauma * 0.4, 0.8);
  lastFlash = G.hitFlash; lastTrauma = J.trauma;
  prev = gp.buttons.map(b => b.pressed);
}
requestAnimationFrame(poll);
addEventListener('gamepadconnected', e => { pad.connected = true; pad.id = (e as GamepadEvent).gamepad.id; });
/** Settings test button: a short rumble. */
export const testRumble = (): void => { const gp = find(); if (gp) rumble(gp, 300, 0.8, 0.8); };
