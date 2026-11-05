import * as THREE from 'three';
import { G, stepGame, installDebug, STEP } from './game';
import { loadAround } from './world';
import { createSea, updateSea } from './sea';
import { initShip, updateShipVisual, model, renderPos } from './ship';
import { updateEnemyVisuals, stepSinking, prewarmShips } from './enemies';
import { initHud, updateHud } from './hud';
import { initMenu } from './menu';
import { MENU_CAM } from './loadoutui';
import { input } from './input';
import { ST, stepStage, beginStage } from './stagecam';
import { renderProjectiles } from './weapons';
import { renderSummons } from './summons';
import { stepFx } from './particles';
import { J, initJuice, applyShake, updateNumbers, setNumberFilter } from './juice';
import { renderHazards, fogHides } from './hazards';
import { updateArrows } from './edgearrows';
import { renderEdibles } from './edibles';
import { renderSpells } from './spells';
import { initRender, resizeRender, setShadowExtent, renderFrame, prewarm } from './render';
import { buildPendingIslands } from './props';
import { projGeo, projMat } from './projvis';
import { makeTelegraph } from './overlays';
import { updateWakes } from './wake';
import { uTime } from './anim';
import './audio';
import './gamepad';
import './prompts';
import './touch';
import { updateTutMark } from './tutorial';
import { updateMusic, installMusicDebug } from './music';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const VIEW_H = 44, CAM_DIST = 120, PITCH = (55 * Math.PI) / 180, YAW = Math.PI / 4;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
const camOff = new THREE.Vector3();
let curPitch = PITCH;
const setCam = (yaw: number, pitch: number): void => { curPitch = pitch; camOff.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(CAM_DIST); };
setCam(YAW, PITCH);
const camTarget = new THREE.Vector3();
initRender(canvas, camera);

let bossMul = 1; // eases to 1.3 while a boss fight is on
let viewMul = 1; // eases toward the stage framing on the loadout screen
function resize(): void {
  resizeRender();
  project();
}
function project(): void {
  const a = innerWidth / innerHeight;
  const vh = (VIEW_H * input.zoom * viewMul * bossMul) / 2;
  camera.left = -vh * a; camera.right = vh * a; camera.top = vh; camera.bottom = -vh;
  camera.updateProjectionMatrix();
  setShadowExtent(vh * a, vh, curPitch);
}
addEventListener('resize', resize);
addEventListener('wheel', resize, { passive: true });

const sea = createSea();
initShip();
initHud();
initJuice();
setNumberFilter(fogHides);
installDebug();
installMusicDebug();
loadAround(0, 0);
buildPendingIslands(Infinity); // the starting islands are dressed before the first frame
prewarmShips();
initMenu(); // title screen, or straight into a run with ?quick
camTarget.set(0, 0, 0);
resize();
prewarm(camera, [new THREE.Mesh(projGeo.fball, projMat.fball), new THREE.Mesh(projGeo.shell, projMat.shell), makeTelegraph()]);

const tmp = new THREE.Vector3();
let last = performance.now(), acc = 0, t = 0, framedT = 0, wasFramed = false, titleOff = 0;
const camR = new THREE.Vector3(), camU = new THREE.Vector3();
function frame(now: number): void {
  requestAnimationFrame(frame);
  const start = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // hit-stop skips stepping (no state change) and drops the backlog so there is no catch-up burst afterwards
  const paused = G.state === 'paused', idle = paused || G.state === 'menu';
  const stopped = J.hitstop > 0 && !idle;
  if (idle) { stepGame(STEP); acc = 0; } // only the menu/pause key handling runs; the sim and hit-stop stay frozen
  else if (stopped) { J.hitstop = Math.max(0, J.hitstop - dt); acc = 0; }
  else {
    acc += dt;
    while (acc >= STEP) {
      stepGame(STEP); acc -= STEP;
      if (J.hitstop > 0) { acc = 0; break; }
    }
  }
  t += dt;
  uTime.value = t;
  const alpha = idle || stopped || J.hitstop > 0 ? 1 : acc / STEP;
  const fdt = paused ? 0 : dt; // pause freezes particles, projectiles, wakes and number pop-ups
  input.lock = G.state === 'menu'; // the wheel belongs to the loadout stage, not the in-run zoom
  const framed = G.state === 'menu' && MENU_CAM.on, titleYaw = YAW + t * 0.08;
  if (framed && !wasFramed) beginStage(titleYaw + titleOff);
  if (!framed && wasFramed) titleOff = ST.yaw - titleYaw; // the title orbit carries on from where the stage left it
  wasFramed = framed; framedT = framed ? framedT + dt : 0;
  let yaw = G.state === 'menu' ? titleYaw + titleOff : YAW, wantMul = 1, pitch = PITCH;
  if (framed) { wantMul = (stepStage(dt) * 2) / VIEW_H / input.zoom; yaw = ST.yaw; pitch = ST.pitch; }
  setCam(yaw, pitch);
  if (Math.abs(viewMul - wantMul) > 1e-4) {
    // ease into the stage framing, then follow the smoothed stage zoom 1:1
    viewMul += (wantMul - viewMul) * Math.min(1, 1 - Math.exp(-(framed && framedT > 0.8 ? 60 : 5) * dt));
    if (Math.abs(viewMul - wantMul) < 1e-4) viewMul = wantMul;
    project();
  }

  const wantBoss = G.state !== 'menu' && G.boss && !G.boss.dead ? 1.3 : 1;
  if (bossMul !== wantBoss) {
    bossMul += (wantBoss - bossMul) * Math.min(1, 1 - Math.exp(-2.5 * dt)); // ~1.2 s to settle
    if (Math.abs(bossMul - wantBoss) < 1e-3) bossMul = wantBoss;
    project();
  }

  updateShipVisual(t, fdt, alpha);
  const p = G.player;
  tmp.set(renderPos.x + p.vx * 0.3, 0, renderPos.z + p.vz * 0.3);
  if (framed) {
    // put the ship's bounding-sphere centre at the stage centre (+ pan): shift the target along the screen axes
    tmp.x += ST.cx; tmp.y += ST.cy; tmp.z += ST.cz;
    camR.set(Math.cos(yaw), 0, -Math.sin(yaw));
    camU.set(-Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw));
    const nx = MENU_CAM.fx + (2 * ST.panX) / innerWidth, ny = MENU_CAM.fy - (2 * ST.panY) / innerHeight;
    tmp.addScaledVector(camR, -nx * camera.right).addScaledVector(camU, -ny * camera.top);
  }
  if (framed && framedT > 0.8) camTarget.copy(tmp); else camTarget.lerp(tmp, 1 - Math.exp(-4 * dt));
  camera.position.copy(camTarget).add(camOff);
  camera.lookAt(camTarget);
  applyShake(camera, dt, t); // after follow + lookAt; the follow target is never shaken
  camera.updateMatrixWorld();
  updateSea(sea, camTarget.x, camTarget.z);
  updateEnemyVisuals(t, camera, innerWidth, innerHeight, tmp, alpha);
  stepSinking(t, fdt);
  renderProjectiles(alpha, fdt);
  renderSummons(t, alpha);
  renderEdibles(alpha, t);
  renderSpells(alpha, fdt, t, renderPos.x, renderPos.z);
  updateWakes(fdt);
  buildPendingIslands(2.5); // islands from newly loaded cells, a few ms per frame
  stepFx(fdt);
  renderHazards(camera, curPitch, yaw, renderPos.x, renderPos.z, t);
  updateArrows(camera, innerWidth, innerHeight, renderPos.x, renderPos.z, G.state !== 'menu');
  updateTutMark(camera, innerWidth, innerHeight);
  updateNumbers(camera, innerWidth, innerHeight, fdt);
  updateHud();
  updateMusic();
  void model;
  renderFrame(camTarget, dt, start);
}
requestAnimationFrame(frame);
