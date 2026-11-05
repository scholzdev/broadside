import { G, applyCard, isPick } from './game';
import { L } from './loadout';
import { bump, runCount } from './meta';
import { showBuy } from './hud';
import { crewCardOk } from './crewcards';
import type { Card } from './cards';

// ---- buy row: the 2 extra cards under the free ones on every level-up and loot screen cost gold; buying applies at once and keeps the screen open ----
/** 25 gold, +15 per purchase this run, times the captain's shop factor (Baron Goldtooth +30%). */
export const shopPrice = (): number => Math.round((25 + 15 * G.shopBuys) * L.cap.shop);
/** Why a buy-row card cannot be bought right now ('' = it can). */
export function buyBlock(c: Card | null): '' | 'sold' | 'poor' | 'full' {
  if (!c) return 'sold';
  if (!crewCardOk(c)) return 'full';
  return G.gold < shopPrice() ? 'poor' : '';
}
export function buyCard(i: number): boolean {
  const c = G.buy[i];
  if (!isPick(G.state) || buyBlock(c ?? null)) return false;
  G.gold -= shopPrice(); G.shopBuys++; bump('shopBuys'); runCount('buy:shop');
  applyCard(c as Card);
  G.buy[i] = null;
  showBuy();
  return true;
}
