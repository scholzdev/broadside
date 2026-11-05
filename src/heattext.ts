import { t } from './i18n';
import { HEAT_MAX, HEAT_DBL } from './heatdefs';
import { EN_HEAT } from './i18n/en-heat';

// Localized heat texts (strings live in i18n/en-heat.ts and de-heat.ts).
export const heatName = (n: number): string => (n === 0 ? t('heat.base') : t(`heat.${n}.name`));
export const heatText = (n: number): string => (n === 0 ? t('heat.base') : t(`heat.${n}.text`));
export const heatMult = (n: number): string => t('heat.mult', { m: HEAT_DBL[n] });

/** i18ncheck: looks up every heat and endless string once. */
export function checkHeat(): void {
  for (let n = 0; n <= HEAT_MAX; n++) { heatName(n); heatText(n); heatMult(n); t('heat.skull', { n }); t('heat.lock', { n }); }
  for (const k of Object.keys(EN_HEAT)) t(k);
}
