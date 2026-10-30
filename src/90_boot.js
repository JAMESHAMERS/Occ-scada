// ===================== Boot =====================
let HERO=null;
function startHero(){ if(HERO||!$("#hero3d")||getComputedStyle($(".login-hero")).display==="none") return; HERO="pending"; THREE3D.hero($("#hero3d")).then(h=>{ if(S.user){ h&&h.dispose(); HERO=null; return; } HERO=h; }); }
function stopHero(){ if(HERO&&HERO!=="pending") HERO.dispose(); HERO=null; }
(function boot(){
  const th=store.get("theme"); applyTheme(th||"dark");
  const lg=store.get("lang"); S.lang = LANGS.includes(lg)? lg : "vi"; document.documentElement.lang = S.lang==="zh"?"zh-CN":S.lang; document.body.classList.toggle("zh",S.lang==="zh");
  ["#nav","#alSum","#sbFoot","#stbar"].forEach(q=>liveEl($(q))); initHistory(); seedAlarms(); applyStatic(); renderLogin(); if(!resumeSession()){ renderLogin(); startHero(); }
  setInterval(()=>{ tick(); if(!S.user) return; liveify($("#view")); if(PAGE_UPD){ try{ PAGE_UPD(); }catch(e){ console.warn(e); } } lvBeat(); }, 2000);
  setInterval(()=>{ if(!S.user||!can("alarm")) return; if(Math.random()<0.5){ const a=randomAlarm(); if(a){ alarmToast(a); renderShell(); PAGE_UPD&&PAGE_UPD(); } } // clear an old non-critical one
      const old=ALARMS.filter(a=>!a.cleared&&a.sev>=3&&a.acked&&Date.now()-a.t>40*60e3); if(old.length){ const a=old[0]; a.cleared=true; a.clrT=Date.now(); } }, 75000);
  if(/dbg/.test(location.hash)) window.__occ={go,toast,alarmToast,randomAlarm,renderShell,get page(){ return PAGE_UPD; }}; // test hook
  window.addEventListener("resize",()=>{ if(!S.user && !HERO) startHero(); });
})();

