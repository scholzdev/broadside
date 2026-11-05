import { G } from './game';
import { audio, bus, outputLevel, setVolume, setMusicVol, setSfxVol, play, type Bus, type Sound } from './audio';
import { TRACKS, TRACK_IDS, type TrackDef, type TrackId } from './musicdata';
import { note, drum, type Out, type Drum } from './voices';
import { AMB, setAmbience } from './ambience';
import { playStinger, type Stinger } from './stingers';

// Look-ahead pattern sequencer: a timer schedules notes ~0.5 s ahead on the AudioContext clock, so frame hitches never glitch the music.
// One Player per track; a crossfade runs the old and new player side by side for 2 s.
const LOOK = 0.5, TICK = 50, FADE = 2, STEPS = 256; // 8 phrases x 32 eighth-note steps
interface Note { deg: number; len: number }
interface Player { id: TrackId; def: TrackDef; g: GainNode; t: number; step: number; end: number }
const players: Player[] = [];
const parsed = new Map<string, (Note | undefined)[]>();
let cur: Player | null = null, timer = 0, duck: GainNode | null = null, B: Bus | null = null, forced: TrackId | 'none' | null = null;
let prevState = G.state, prevBoss = false, lastStinger: Stinger | null = null, duckLevel = 1;

const semi = (mode: number[], d: number): number => mode[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const fold = (m: number, lo: number, hi: number): number => { while (m > hi) m -= 12; while (m < lo) m += 12; return m; };
const deg = (ch: string): number => (ch >= '0' && ch <= '9' ? +ch : ch.charCodeAt(0) - 'a'.charCodeAt(0) < 3 ? -(ch.charCodeAt(0) - 96) : NaN);
function melody(def: TrackDef, tid: string, key: string): (Note | undefined)[] {
  const id = tid + key;
  let a = parsed.get(id);
  if (a) return a;
  const s = def.phrases[key].m.replace(/\s/g, ''), out: (Note | undefined)[] = new Array(s.length);
  let last: Note | undefined;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '-') { if (last) last.len++; } else if (s[i] === '.') last = undefined; else { last = { deg: deg(s[i]), len: 1 }; out[i] = last; }
  }
  parsed.set(id, a = out);
  return a;
}

function step(p: Player, o: Out): void {
  const d = p.def, sd = 60 / d.bpm / 2, [key, lv] = d.arr[Math.floor(p.step / 32)], sip = p.step % 32, bar = Math.floor(sip / 8), sb = sip % 8, t = p.t;
  const ph = d.phrases[key], root = +ph.c[bar], vel = [0.65, 0.85, 1][lv] * (0.92 + Math.random() * 0.16);
  const n = melody(d, p.id, key)[sip];
  if (n) note(o, d.lead, t, d.root + semi(d.mode, n.deg), n.len * sd * 0.95, vel);
  const bp = d.bassPat[sb];
  if (bp === 'r' || bp === 'f') note(o, d.bass, t, fold(d.root + semi(d.mode, root + (bp === 'f' ? 4 : 0)), 33, 50), sd * 1.6, vel);
  if (d.chordV && d.chordPat[sb] === 'x') for (const k of [0, 2, 4]) note(o, d.chordV, t, fold(d.root + semi(d.mode, root + k), 50, 69), sd * 1.5, vel * 0.55);
  if (d.drone && sb === 0 && bar % 2 === 0) note(o, d.drone, t, fold(d.root + semi(d.mode, root), 38, 52), sd * 16, 0.9);
  if (d.bells && lv > 0 && (sb === 3 || sb === 6) && Math.random() < 0.5) note(o, 'bell', t, fold(d.root + semi(d.mode, root + [0, 2, 4, 7][Math.floor(Math.random() * 4)]), 62, 86), 1, 0.45);
  const kit = d.kits[lv];
  for (const k of Object.keys(kit) as Drum[]) { const c = kit[k]![sb]; if (c === 'x' || c === 'o') drum(o, k, t, (c === 'x' ? 1 : 0.5) * vel); }
}
function pump(): void {
  if (!B) return;
  const now = B.ctx.currentTime, o: Out = { c: B.ctx, to: null as unknown as AudioNode, noise: B.noise };
  for (let i = players.length - 1; i >= 0; i--) {
    const p = players[i];
    if (p.end && now > p.end) { p.g.disconnect(); players.splice(i, 1); continue; }
    if (p.t < now) p.t = now + 0.05; // timer was starved (hidden tab): skip ahead rather than burst
    o.to = p.g;
    const look = document.hidden ? 1.5 : LOOK, sd = 60 / p.def.bpm / 2;
    while (p.t < now + look) { step(p, o); p.t += sd; p.step = (p.step + 1) % STEPS; }
  }
  if (!players.length) { clearInterval(timer); timer = 0; }
}
function setTrack(b: Bus, id: TrackId | null): void {
  if (cur?.id === id) return;
  const now = b.ctx.currentTime, fade = id === 'boss' ? 1.2 : FADE;
  if (cur) { cur.g.gain.cancelScheduledValues(now); cur.g.gain.setValueAtTime(cur.g.gain.value, now); cur.g.gain.linearRampToValueAtTime(0.0001, now + fade); cur.end = now + fade + 0.2; }
  cur = null;
  if (!id) return;
  const def = TRACKS[id], g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(def.vol, now + fade);
  g.connect(duck!);
  cur = { id, def, g, t: now + 0.1, step: 0, end: 0 };
  players.push(cur);
  if (!timer) timer = window.setInterval(pump, TICK);
  pump();
}

function want(): TrackId | null {
  if (forced) return forced === 'none' ? null : forced;
  const s = G.state;
  if (s === 'menu') return 'title';
  if (s === 'dead' || s === 'won') return null;
  return G.boss && !G.boss.dead ? 'boss' : (`sea${Math.min(3, Math.max(0, G.sea))}` as TrackId);
}
const duckFor = (s: typeof G.state): number => (s === 'levelup' || s === 'loot' ? 0.4 : s === 'paused' ? 0.5 : 1); // levelup/loot = -8 dB

/** Called once per frame from main.ts: picks the track, ducking, ambience and stingers from the game state. */
export function updateMusic(): void {
  try {
    const b = bus();
    if (!b) return;
    if (B !== b) { B = b; duck = b.ctx.createGain(); duck.connect(b.music); }
    const s = G.state, boss = !!G.boss && !G.boss.dead && s !== 'menu';
    if (s !== prevState) {
      if (s === 'levelup') stinger('levelup');
      else if (s === 'won') stinger('victory');
      else if (s === 'dead') stinger('death');
      prevState = s;
    }
    if (boss && !prevBoss && s === 'playing') stinger('boss');
    prevBoss = boss;
    setTrack(b, want());
    duckLevel = duckFor(s);
    duck!.gain.setTargetAtTime(duckLevel, b.ctx.currentTime, 0.25);
    const amb = forced === 'none' ? null : s === 'menu' ? AMB.title : (s === 'dead' || s === 'won') ? AMB[`sea${G.sea}`] : AMB[`sea${Math.min(3, Math.max(0, G.sea))}`];
    setAmbience(b, amb ?? null, s === 'dead' || s === 'won' ? 0.5 : duckLevel);
  } catch { /* audio must never break the game */ }
}
function stinger(s: Stinger): void { if (B) { lastStinger = s; playStinger(B, s); } }

export const musicView = () => ({
  track: cur?.id ?? null, playing: !!cur && !!B && B.ctx.state === 'running', players: players.length, stinger: lastStinger,
  volumes: { master: audio.muted ? 0 : audio.volume, music: audio.music, sfx: audio.sfx, duck: duckLevel },
});
/** Debug: force a track ('title' | 'sea0'..'sea3' | 'boss' | 'none'), play a stinger, or 'auto' to hand control back. */
export function debugMusic(t: string): string {
  if (t === 'auto') forced = null;
  else if (t === 'none' || (TRACK_IDS as string[]).includes(t)) forced = t as TrackId | 'none';
  else if (['victory', 'death', 'levelup', 'boss'].includes(t)) stinger(t as Stinger);
  return String(forced);
}
export function installMusicDebug(): void {
  const api = (window as unknown as { __game?: Record<string, unknown> & { debug: Record<string, unknown> } }).__game;
  if (!api) return;
  Object.defineProperty(api, 'music', { get: musicView, enumerable: true });
  api.debug.music = debugMusic;
  /** QA meter: RMS and peak (linear) of the last 2048 output samples, after the limiter. */
  api.debug.level = () => { const a = outputLevel(); if (!a) return null; let s = 0, pk = 0; for (const v of a) { s += v * v; pk = Math.max(pk, Math.abs(v)); } return { rms: Math.sqrt(s / a.length), peak: pk }; };
  api.debug.volumes = (master: number, music: number, sfx: number) => { setVolume(master); setMusicVol(music); setSfxVol(sfx); };
  api.debug.sfx = (s: string) => play(s as Sound);
}
