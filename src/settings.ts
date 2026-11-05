import { audio, setMuted, setVolume, setMusicVol, setSfxVol, onAudio } from './audio';
import { setQuality, Quality } from './render';
import { lang } from './i18n';

// Persistent user settings ('broadside.settings'); the language keeps its own key (i18n.ts). Loaded and applied at import time.
export type Shake = 'off' | 'low' | 'normal';
export const QUALITIES: Quality[] = ['high', 'medium', 'low'];
export const SHAKES: Shake[] = ['off', 'low', 'normal'];
export const SHAKE_MUL: Record<Shake, number> = { off: 0, low: 0.5, normal: 1 };
const KEY = 'broadside.settings';
/** quality null = Auto (the renderer's own adaptive choice). */
export const S = { quality: null as Quality | null, shake: 'normal' as Shake, nums: true, arcs: true, padDz: 0.2, vib: true, tutDone: false };

export function saveSettings(): void {
  try { localStorage.setItem(KEY, JSON.stringify({ quality: S.quality, shake: S.shake, nums: S.nums, arcs: S.arcs, padDz: S.padDz, vib: S.vib, tutDone: S.tutDone, muted: audio.muted, volume: audio.volume, music: audio.music, sfx: audio.sfx })); } catch { /* storage unavailable */ }
}
function load(): void {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, unknown> | null;
    const old = localStorage.getItem('broadside.quality'); // pre-settings key
    const q = o ? o.quality : old;
    if (QUALITIES.includes(q as Quality)) S.quality = q as Quality;
    if (o) {
      if (SHAKES.includes(o.shake as Shake)) S.shake = o.shake as Shake;
      if (typeof o.nums === 'boolean') S.nums = o.nums;
      if (typeof o.arcs === 'boolean') S.arcs = o.arcs;
      if (typeof o.padDz === 'number' && o.padDz >= 0.05 && o.padDz <= 0.6) S.padDz = o.padDz;
      if (typeof o.vib === 'boolean') S.vib = o.vib;
      if (typeof o.tutDone === 'boolean') S.tutDone = o.tutDone;
      // muted is not restored: the game always launches muted
      if (typeof o.volume === 'number' && o.volume >= 0 && o.volume <= 1) setVolume(o.volume);
      if (typeof o.music === 'number' && o.music >= 0 && o.music <= 1) setMusicVol(o.music);
      if (typeof o.sfx === 'number' && o.sfx >= 0 && o.sfx <= 1) setSfxVol(o.sfx);
    }
  } catch { /* corrupt or unavailable: keep defaults */ }
  if (S.quality) setQuality(S.quality);
}
load();
onAudio.f = saveSettings;

export function setQualityPref(q: Quality | null): void { S.quality = q; if (q) setQuality(q); saveSettings(); }
/** Debug / test view of every setting. */
export const settingsView = () => ({ lang, quality: S.quality ?? 'auto', shake: S.shake, damageNumbers: S.nums, arcs: S.arcs, padDeadzone: S.padDz, vibration: S.vib, tutorialDone: S.tutDone, muted: audio.muted, volume: audio.volume, music: audio.music, sfx: audio.sfx });
