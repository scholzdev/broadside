const css = `
#trot, #tzone, #tctl, #tpause, #tbase { display:none; }
#trot { position:fixed; inset:0; z-index:200; background:#07121f; color:#f4e6bf; text-align:center; flex-direction:column; align-items:center; justify-content:center; gap:10px; font:18px system-ui,sans-serif; padding:24px; }
#trot b { font-size:24px; color:#f6d06a; } #trot .ph { width:46px; height:76px; border:4px solid #d9b45c; border-radius:9px; animation:trot 1.8s ease-in-out infinite; } #trot span { opacity:.8; font-size:15px; }
@keyframes trot { 0%,25% { transform:rotate(0); } 65%,100% { transform:rotate(-90deg); } }
@media (orientation:portrait) { body.touch #trot { display:flex; } }
body.touch { touch-action:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; }
body.touch canvas#c { touch-action:none; }
body.touch[data-state=playing] #tzone { display:block; position:fixed; left:0; top:0; width:46%; height:100%; z-index:30; touch-action:none; }
body.touch[data-state=playing] #tctl { display:block; position:fixed; right:max(14px, env(safe-area-inset-right)); bottom:max(12px, env(safe-area-inset-bottom)); width:210px; height:200px; z-index:31; pointer-events:none; }
body.touch[data-state=playing] #tpause { display:flex; }
#tpause { position:fixed; left:max(10px, env(safe-area-inset-left)); top:max(8px, env(safe-area-inset-top)); z-index:32; width:44px; height:44px; border-radius:50%; align-items:center; justify-content:center; border:2px solid #d9b45c; background:#0d1f35cc; color:#f4e6bf; font:bold 18px system-ui,sans-serif; touch-action:none; padding:0; }
#tpause:active { background:#4a3412; }
#tbase { position:fixed; z-index:30; width:120px; height:120px; margin:-60px 0 0 -60px; border-radius:50%; border:2px solid #f4e6bf66; background:#f4e6bf14; pointer-events:none; }
#tbase i { position:absolute; left:50%; top:50%; width:54px; height:54px; margin:-27px 0 0 -27px; border-radius:50%; background:#f4e6bfa0; border:2px solid #fff8; }
body.touch[data-state=playing] #tbase.on { display:block; }
#tctl .tb { position:absolute; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:50%; overflow:hidden; pointer-events:auto; touch-action:none; padding:0;
  border:2px solid #d9b45c; background:radial-gradient(circle at 35% 30%, #35587f, #0f2037); color:#f4e6bf; font:bold 22px system-ui,sans-serif; box-shadow:0 3px 8px #000a; }
#tctl .tb small { font-size:9px; font-weight:bold; opacity:.85; } #tctl .tb .ico { width:30px; height:30px; } #tctl .tb b { position:relative; z-index:1; line-height:1; }
#tctl .tb .sw { position:absolute; inset:0; background:conic-gradient(#000000b8 var(--p,0%), transparent 0); pointer-events:none; }
#tctl .tb > *:not(.sw) { position:relative; z-index:1; }
#tctl .tb.rdy { box-shadow:0 0 0 2px #7fe3a0aa, 0 0 14px #7fe3a0aa; } #tctl .tb.none { opacity:.4; filter:grayscale(1); } #tctl .tb.on { box-shadow:0 0 0 3px #f6d06a, 0 0 18px #f6d06a; }
#tctl .tb.dn, #tctl .tb:active { transform:scale(.92); border-color:#fff; }
#tctl .tb.no { animation:abno .25s; }
#tctl .tb[data-b=sail] { width:84px; height:84px; right:0; bottom:0; } #tctl .tb[data-b=bow] { width:62px; height:62px; right:96px; bottom:4px; }
#tctl .tb[data-b=stern] { width:62px; height:62px; right:78px; bottom:72px; } #tctl .tb[data-b=side] { width:62px; height:62px; right:8px; bottom:104px; }
body.touch #inv { right:auto; left:max(14px, env(safe-area-inset-left)); bottom:max(14px, env(safe-area-inset-bottom)); }
body.touch #quests { transform:scale(.68); transform-origin:top right; }
body.touch .bc { bottom:max(6px, env(safe-area-inset-bottom)); }
body.touch #tut { top:max(8px, env(safe-area-inset-top)); }
body.touch #tut.low { top:max(8px, env(safe-area-inset-top)); bottom:auto; }
@media (orientation:landscape) and (max-height:520px) {
  body.touch #tut { width:min(400px, 52vw); padding:8px 12px 6px; font-size:13px; } body.touch #tut h3 { font-size:16px; margin:0 0 2px; } body.touch #tut p { margin:0 0 5px; }
  body.touch #end .box, body.touch #choice .box { zoom:.5; } body.touch #end, body.touch #choice { overflow:auto; }
  /* Sea Chart: chart and details side by side, compact sea cards, Set course pinned to the bottom of the detail panel */
  body.touch .smap { padding:8px 12px; gap:6px; } body.touch .smap .ltop h2 { font-size:22px; margin:0; } body.touch .smap .lback { font-size:14px !important; padding:4px 12px !important; }
  body.touch .sbody { flex-direction:row; gap:10px; } body.touch .card.sdet { flex:0 0 clamp(280px, 40vw, 340px); max-height:none; padding:8px 12px 0; gap:4px; }
  body.touch .sreg { width:clamp(92px, 14vw, 120px); padding:4px 3px 5px; } body.touch .semb { width:46px; height:46px; margin-bottom:2px; } body.touch .sname { font-size:14px; } body.touch .smul, body.touch .sstat { font-size:11px; }
  body.touch .sreg { transform:translate(-50%, -34px); } body.touch .shz, body.touch .sen, body.touch .scomp { display:none; } body.touch .schk { width:20px; height:20px; font-size:12px; }
  body.touch .sban { font-size:18px; padding:3px 8px; } body.touch .sgo { position:sticky; bottom:0; flex:none; margin:4px -4px 0; padding:8px 14px; font-size:19px; z-index:2; box-shadow:0 -8px 10px -2px #f8eed4, 0 4px 8px #0006; }
  body.touch .shsk small { display:none; } body.touch .smap > .hint { font-size:11px; }
  /* Loadout: slimmer columns, buttons stay reachable */
  body.touch .lo { padding:8px; gap:8px; --lb:40px; } body.touch .lcol { flex-basis:300px; padding:8px; gap:6px; } body.touch .lmid { flex-basis:230px; gap:6px; }
  body.touch .card.ldet { min-height:0; flex:1 1 0; padding:8px 12px; } body.touch .lbig { width:56px; height:56px; margin:0 auto 4px; } body.touch .lsail { font-size:19px; padding:8px 12px; flex:none; }
  body.touch .lgrp { padding:3px 6px 9px; } body.touch .lcat { margin-bottom:3px; font-size:11px; } body.touch .lwhy { margin-top:0; font-size:11px; }
  body.touch #cards { zoom:.62; } body.touch.tutlow #cards { zoom:.62; padding-bottom:20px; }
}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
export {};
