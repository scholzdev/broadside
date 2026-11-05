import { tr, t } from './i18n';
import { SHIPS, CAPTAINS, ShipId, CaptainId } from './loadout';
import { MODS, ModuleId, Slot } from './modules';
import { RELICS, CREW, RelicId, CrewId } from './relics';
import { SPELLS } from './spelldata';
import { BOSSES, ENEMIES, EnemyType } from './content';
import type { BossId } from './seas';
import { G } from './game';
import { evoName } from './evoname';

// Localized lookups for the content tables: stable id -> German entry, English data as fallback.
export const shipName = (id: ShipId): string => tr(`ship.${id}.name`, SHIPS[id].name);
export const shipBlurb = (id: ShipId): string => tr(`ship.${id}.blurb`, SHIPS[id].blurb);
export const capName = (id: CaptainId): string => tr(`cap.${id}.name`, CAPTAINS[id].name);
export const capUp = (id: CaptainId): string => tr(`cap.${id}.up`, CAPTAINS[id].up);
export const capDown = (id: CaptainId): string => (CAPTAINS[id].down ? tr(`cap.${id}.down`, CAPTAINS[id].down) : '');
export const spellName = (id: CaptainId): string => tr(`spell.${id}.name`, SPELLS[id].name);
export const spellText = (id: CaptainId): string => tr(`spell.${id}.text`, SPELLS[id].text);
export const modName = (id: ModuleId): string => (G.modStats[id]?.auto.evo ? evoName(id) : tr(`mod.${id}.name`, MODS[id].name)); // evolved modules show their new name
export const modInfo = (id: ModuleId): string => tr(`mod.${id}.info`, MODS[id].info);
export const modActive = (id: ModuleId): { name: string; text: string; plus: string; cd: number } => {
  const a = MODS[id].active;
  return { name: tr(`mod.${id}.an`, a.name), text: tr(`mod.${id}.at`, a.text), plus: tr(`mod.${id}.ap`, a.plus), cd: a.cd };
};
export const relicName = (id: RelicId): string => tr(`relic.${id}.name`, RELICS[id].name);
export const relicDesc = (id: RelicId): string => tr(`relic.${id}.desc`, RELICS[id].desc);
export const crewName = (id: CrewId): string => tr(`crew.${id}.name`, CREW[id].name);
export const crewText = (id: CrewId): string => tr(`crew.${id}.text`, CREW[id].text);
/** Lv 5 advanced form: name and effect (strings in i18n/en-crew.ts). */
export const crewAdvName = (id: CrewId): string => t(`crew.${id}.adv`);
export const crewAdvText = (id: CrewId): string => t(`crew.${id}.advt`);
export const crewAdv = (id: CrewId): string => `${crewAdvName(id)}: ${crewAdvText(id)}`;
export const bossName = (id: BossId): string => tr(`boss.${id}`, BOSSES[id].name);
export const enemyName = (type: EnemyType): string => tr(`enemy.${type}`, ENEMIES[type].name);
/** Inventory strip UI strings (see i18n/en-inv.ts). */
export const invText = (k: string, p?: Record<string, string | number>): string => t(k, p);
export const statLabel = (label: string): string => tr('stat.' + label, label);
/** "bow slot" etc. */
export const slotName = (s: Slot): string => t('slot.' + s);
/** "2 side slots" */
export const slotCount = (s: Slot, n: number): string => t(`slots.${s}.${n === 1 ? 'one' : 'many'}`, { n });
/** Localized name of an unlock id such as 'ship:sloop' or 'mod:ram'. */
export function unlockName(id: string): string {
  const [k, v] = id.split(':');
  return k === 'ship' ? shipName(v as ShipId) : k === 'cap' ? capName(v as CaptainId) : k === 'relic' ? relicName(v as RelicId) : k === 'crew' ? crewName(v as CrewId) : modName(v as ModuleId);
}
