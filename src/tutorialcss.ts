const css = `
#tut { position:fixed; left:50%; top:118px; transform:translateX(-50%); z-index:70; width:min(440px, 92vw); display:none; padding:12px 16px 10px; border-radius:14px;
  background:linear-gradient(#2b1d0c, #1a1208); border:2px solid #d9b45c; color:#f4e6bf; box-shadow:0 8px 30px #000a; font:15px/1.4 system-ui,sans-serif; pointer-events:auto; }
#tut.low { top:auto; bottom:40px; }
body.tutlow #cards { zoom:.68; box-sizing:border-box; padding-bottom:330px; }
#tut small { color:#d9b45c; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
#tut h3 { margin:2px 0 4px; font-size:20px; color:#f6d06a; } #tut p { margin:0 0 8px; }
#tut .tbar { height:6px; border-radius:3px; background:#0008; overflow:hidden; } #tut .tbar i { display:block; height:100%; width:0; background:#7fe3a0; transition:width .15s; }
.tutlnk { margin-top:6px; background:none; border:0; color:#cbb88c; font:12px system-ui,sans-serif; cursor:pointer; padding:0; }
.tutbtn { padding:7px 16px; border-radius:9px; border:2px solid #d9b45c; background:#4a3412; color:#f4e6bf; font:bold 14px system-ui,sans-serif; cursor:pointer; }
.tutbtn:hover { background:#6a4a1a; }
#tutdlg { position:fixed; inset:0; z-index:90; display:none; align-items:center; justify-content:center; background:#0008; }
#tutdlg .box { background:linear-gradient(#2b1d0c, #1a1208); border:2px solid #d9b45c; border-radius:14px; padding:20px 26px; color:#f4e6bf; text-align:center; font:15px system-ui,sans-serif; }
#tutdlg h3 { margin:0 0 6px; font-size:22px; color:#f6d06a; } #tutdlg .row { display:flex; gap:12px; justify-content:center; margin-top:12px; }
#tutmark { position:fixed; left:0; top:0; z-index:65; display:none; pointer-events:none; width:28px; height:40px; }
#tutmark i { display:block; margin:0 auto; width:0; height:0; border-left:14px solid transparent; border-right:14px solid transparent; border-top:26px solid #7fe3a0; filter:drop-shadow(0 0 6px #000); animation:tutbob .7s ease-in-out infinite alternate; }
@keyframes tutbob { from { transform:translateY(0); } to { transform:translateY(10px); } }
.tuthl { animation:tutglow 1s ease-in-out infinite alternate; border-radius:10px; }
@keyframes tutglow { from { box-shadow:0 0 0 2px #7fe3a0, 0 0 8px #7fe3a0; } to { box-shadow:0 0 0 3px #7fe3a0, 0 0 22px #7fe3a0; } }
`;
const st = document.createElement('style');
st.textContent = css;
document.head.appendChild(st);
