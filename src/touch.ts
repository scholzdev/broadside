import { G } from './game';
import { touchIn, pushTap } from './input';
import { SLOT_KEYS, activeCdMax } from './abilities';
import { ICON } from './icons';
import { t, onLang } from './i18n';
import './touchcss';

// ---- on-screen controls (phones / tablets, landscape): a floating stick on the left (x = turn, y = throttle, like the gamepad's left stick),
// Full Sail (hold) and the Q / E / R slot buttons on the right, a pause button top-left. Values go to touchIn (input.ts), never to padIn. ----
const R = 60, DEAD = 0.14;
let zone: HTMLElement, base: HTMLElement, knob: HTMLElement, ctl: HTMLElement, rot: HTMLElement;
let sid = -1, ox = 0, oy = 0;
const btns = new Map<string, HTMLElement>(), last = new Map<string, string>();

function stick(e: PointerEvent): void {
  let dx = e.clientX - ox, dy = e.clientY - oy;
  const d = Math.hypot(dx, dy);
  if (d > R) { ox += dx * (d - R) / d; oy += dy * (d - R) / d; dx = dx * R / d; dy = dy * R / d; } // the base follows a thumb that drags past the rim
  base.style.left = ox + 'px'; base.style.top = oy + 'px';
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  const dz = (v: number): number => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));
  const lx = dz(dx / R), ly = dy / R;
  touchIn.turn = -lx; touchIn.fwd = ly < -0.3; touchIn.back = ly > 0.3;
}
function endStick(): void { sid = -1; touchIn.turn = 0; touchIn.fwd = touchIn.back = false; base.classList.remove('on'); knob.style.transform = ''; }

function build(): void {
  if (zone) return;
  const mk = (id: string, html = ''): HTMLElement => { const el = document.createElement('div'); el.id = id; el.innerHTML = html; document.body.appendChild(el); return el; };
  zone = mk('tzone'); base = mk('tbase', '<i></i>'); knob = base.firstElementChild as HTMLElement;
  ctl = mk('tctl');
  rot = mk('trot');
  const pause = document.createElement('button'); pause.id = 'tpause'; pause.textContent = '❚❚'; document.body.appendChild(pause);
  const labels = (): void => {
    rot.innerHTML = `<div class="ph"></div><b>${t('touch.rotate')}</b><span>${t('touch.rotateSub')}</span>`;
    pause.setAttribute('aria-label', t('touch.pause'));
    ctl.innerHTML = `<button class="tb" data-b="sail"><i class="sw"></i><span class="ico">${ICON.sail}</span></button>`
      + SLOT_KEYS.map(k => `<button class="tb" data-b="${k.slot}" data-c="${k.code}"><i class="sw"></i><b>${k.key}</b><small>${t('abs.' + k.slot)}</small></button>`).join('');
    btns.clear(); last.clear();
    for (const b of ctl.querySelectorAll<HTMLElement>('.tb')) btns.set(b.dataset.b!, b);
  };
  labels(); onLang(labels);

  zone.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || sid !== -1) return;
    sid = e.pointerId; zone.setPointerCapture(sid); ox = e.clientX; oy = e.clientY;
    base.classList.add('on'); stick(e);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === sid) stick(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, e => { if ((e as PointerEvent).pointerId === sid) endStick(); });

  const boostIds = new Set<number>();
  ctl.addEventListener('pointerdown', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.tb');
    if (!b) return;
    e.preventDefault(); b.classList.add('dn');
    if (b.dataset.b === 'sail') { b.setPointerCapture(e.pointerId); boostIds.add(e.pointerId); touchIn.boost = true; }
    else pushTap(b.dataset.c!);
  });
  const up = (e: PointerEvent): void => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.tb');
    b?.classList.remove('dn');
    if (boostIds.delete(e.pointerId)) touchIn.boost = boostIds.size > 0;
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) ctl.addEventListener(ev, e => up(e as PointerEvent));
  pause.addEventListener('pointerdown', e => { e.preventDefault(); pushTap('KeyP'); });
  addEventListener('contextmenu', e => { if (document.body.classList.contains('touch')) e.preventDefault(); });
  requestAnimationFrame(frame);
}

function frame(): void {
  requestAnimationFrame(frame);
  if (G.state !== 'playing') { if (sid !== -1) endStick(); if (touchIn.boost) { touchIn.boost = false; } return; }
  if (!document.body.classList.contains('touch')) return;
  const p = G.player;
  for (const [k, el] of btns) {
    let cls = '', pct = 0;
    if (k === 'sail') { pct = Math.round((1 - p.nitro) * 100); cls = p.boost ? 'on' : pct <= 0 ? 'rdy' : ''; }
    else {
      const mods = G.modules.filter(m => m.slot === k);
      if (!mods.length) cls = 'none';
      else if (mods.some(m => m.charges > 0)) cls = 'rdy';
      else pct = Math.round(Math.min(...mods.map(m => (m.cd / Math.max(0.01, activeCdMax(m))))) * 100);
    }
    const key = cls + '|' + pct;
    if (last.get(k) === key) continue;
    last.set(k, key);
    el.classList.toggle('rdy', cls === 'rdy'); el.classList.toggle('none', cls === 'none'); el.classList.toggle('on', cls === 'on');
    el.style.setProperty('--p', pct + '%');
  }
}

if ('ontouchstart' in window || matchMedia('(pointer:coarse)').matches) build();
else addEventListener('pointerdown', e => { if (e.pointerType === 'touch') build(); }, { once: false, capture: true });
