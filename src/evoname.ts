import { t } from './i18n';

// Evolved module names / texts (strings in i18n/en-evo.ts). Dependency-free so lname.ts can use it.
export const evoName = (id: string): string => t(`evo.${id}.n`);
export const evoText = (id: string): string => t(`evo.${id}.t`);
