import { t } from './i18n';
import { SEAS, SeaQuest, HazardId } from './seas';
import { bossName } from './lname';

// Localized sea texts (strings live in i18n/en-seas.ts and de-seas.ts).
export const seaName = (i: number): string => t(`sea.${SEAS[i].id}.name`);
export const seaFlavor = (i: number): string => t(`sea.${SEAS[i].id}.flavor`);
export const hazardName = (h: HazardId): string => t(`hz.${h}.name`);
export const hazardText = (h: HazardId): string => t(`hz.${h}.text`);
export const questText = (q: SeaQuest): string => t('sq.' + q.id, { n: q.n, m: q.maxTime ? Math.round(q.maxTime / 60) : 0 });
/** "Defeat the Admiral's Flagship in Calm Seas" for sea i (i >= 1). */
export const seaLock = (i: number): string => t('map.lock', { boss: bossName(SEAS[i - 1].bosses[3]), sea: seaName(i - 1) });

/** i18ncheck: looks up every sea string once. */
export function checkSeas(): void {
  SEAS.forEach((s, i) => { seaName(i); seaFlavor(i); hazardName(s.hazard); hazardText(s.hazard); if (i) seaLock(i); s.quests.forEach(questText); });
}
