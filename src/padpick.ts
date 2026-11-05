import { G } from './game';
import { pad, pushTap } from './input';

// ---- gamepad cursor on the level-up / loot screens: free cards (row 0) and the buy row (row 1); A picks / buys, Y rerolls ----
let row = 0, col = 1, shown = '';

/** Per gamepad poll while a card screen is open. `dir` = ArrowX from the D-pad / stick (or ''), `a` / `y` = button edges. */
export function padPickStep(dir: string, a: boolean, y: boolean, b: boolean): void {
  const free = G.cards.length, buy = G.buy.length;
  if (shown !== G.state) { shown = G.state; row = 0; col = Math.min(1, Math.max(0, free - 1)); }
  if (dir === 'ArrowLeft') col--;
  else if (dir === 'ArrowRight') col++;
  else if (dir === 'ArrowDown' && buy) { if (row === 0) { row = 1; col = Math.min(col, buy - 1); } }
  else if (dir === 'ArrowUp') row = 0;
  col = Math.max(0, Math.min((row === 0 ? free : buy) - 1, col));
  if (a) pushTap('Digit' + (row === 0 ? col + 1 : col + 4));
  if (y) pushTap('KeyR');
  if (b) pushTap('Escape');
  mark();
}

/** Highlights the cursor tile (re-applied every frame: reroll / purchase redraw the markup). Cleared outside card screens. */
export function mark(): void {
  const on = pad.lastInput === 'gamepad' && (G.state === 'levelup' || G.state === 'loot');
  document.querySelectorAll('.padsel').forEach(e => e.classList.remove('padsel'));
  if (!on) return;
  const sel = row === 0 ? `.card[data-i="${col}"]` : `.btile[data-b="${col}"]`;
  document.querySelector(sel)?.classList.add('padsel');
}
export function resetPadPick(): void { shown = ''; }
