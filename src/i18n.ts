import { EN } from './i18n/en';
import { DE } from './i18n/de';

// Tiny i18n layer. UI strings live in EN/DE dictionaries (t); content tables keep their English source data and are looked up by a
// stable id with the data's English text as fallback (tr), so new content without a German entry still shows (in English).
export type Lang = 'en' | 'de';
export const LANGS: Lang[] = ['en', 'de'];
const KEY = 'broadside.lang';
const detect = (): Lang => {
  try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'de') return s; } catch { /* storage unavailable */ }
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
};
export let lang: Lang = detect();
const used = new Set<string>(), missing = new Set<string>();
const listeners: (() => void)[] = [];
document.documentElement.lang = lang;

/** Registers a callback that re-renders language-dependent DOM after setLang. */
export const onLang = (f: () => void): void => { listeners.push(f); };
export function setLang(l: Lang): void {
  if (l === lang) return;
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  for (const f of listeners) f();
}
export const nextLang = (): Lang => LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];

const fill = (s: string, p?: Record<string, string | number>): string => (p ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in p ? String(p[k]) : m)) : s);

/** UI string by key with {name} interpolation. */
export function t(key: string, p?: Record<string, string | number>): string {
  used.add(key);
  if (!(key in DE)) missing.add(key);
  return fill((lang === 'de' ? DE[key] : undefined) ?? EN[key] ?? key, p);
}
/** Content string by stable id; `en` is the English source text (fallback when the key has no entry). */
export function tr(key: string, en: string, p?: Record<string, string | number>): string {
  used.add(key);
  if (!(key in DE)) missing.add(key);
  return fill((lang === 'de' ? DE[key] : undefined) ?? en, p);
}
/** Keys that were looked up without a German entry (the checker in i18ncheck.ts also looks up every content id). */
export const missingKeys = (): string[] => [...missing].sort();
export const uiKeys = (): string[] => Object.keys(EN);
export const hasDe = (key: string): boolean => key in DE;
