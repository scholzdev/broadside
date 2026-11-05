import { uiKeys, hasDe, missingKeys, t } from './i18n';
import * as N from './lname';
import { SHIP_IDS, CAPTAIN_IDS } from './loadout';
import { MOD_IDS } from './modules';
import { RELIC_IDS, CREW_IDS } from './relics';
import { ENEMIES, EnemyType } from './content';
import { BOSS_IDS } from './seas';
import { checkSeas } from './seatext';
import { checkHeat } from './heattext';
import { TRACKS } from './modstats';
import { CATALOG } from './meta';
import { CREW_STAT } from './crewdefs';
import { EN_CARDFMT } from './i18n/en-cardfmt';
import { EN_INV } from './i18n/en-inv';

/** Dev check: looks up every content id and UI key, then returns all keys that have no German entry (should be []). */
export function missingTranslations(): string[] {
  for (const id of SHIP_IDS) { N.shipName(id); N.shipBlurb(id); }
  for (const id of CAPTAIN_IDS) { N.capName(id); N.capUp(id); N.capDown(id); N.spellName(id); N.spellText(id); }
  for (const id of MOD_IDS) { N.modName(id); N.modInfo(id); N.modActive(id); }
  for (const id of RELIC_IDS) { N.relicName(id); N.relicDesc(id); }
  for (const id of CREW_IDS) { N.crewName(id); N.crewText(id); N.crewAdvName(id); N.crewAdvText(id); N.statLabel(CREW_STAT[id].label); }
  for (const k of ['Crew figures', 'Crew level']) N.statLabel(k);
  for (const id of BOSS_IDS) N.bossName(id);
  checkSeas(); checkHeat();
  for (const id of Object.keys(ENEMIES) as EnemyType[]) N.enemyName(id);
  for (const tr of Object.values(TRACKS)) for (const def of Object.values(tr)) for (const s of [...def.stats, ...def.specials]) N.statLabel(s.label);
  for (const k of Object.keys(EN_CARDFMT)) if (k.startsWith('stat.')) N.statLabel(k.slice(5));
  for (const k of Object.keys(EN_INV)) N.invText(k);
  for (const c of CATALOG) c.challenge();
  for (const k of uiKeys()) if (k.startsWith('tut.') || k.startsWith('pad.') || k.startsWith('set.pad')) t(k); // tutorial + controller strings
  const ui = uiKeys().filter(k => !hasDe(k));
  return [...new Set([...missingKeys(), ...ui])].sort();
}
