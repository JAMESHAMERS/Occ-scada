// ===================== Boot =====================
let HERO=null;
function startHero(){ if(HERO||!$("#hero3d")||getComputedStyle($(".login-hero")).display==="none") return; HERO="pending"; THREE3D.hero($("#hero3d")).then(h=>{ if(S.user){ h&&h.dispose(); HERO=null; return; } HERO=h; }); }
function stopHero(){ if(HERO&&HERO!=="pending") HERO.dispose(); HERO=null; }
(function boot(){
  const th=store.get("theme"); applyTheme(th||"dark");
  const lg=store.get("lang"); S.lang = LANGS.includes(lg)? lg : "vi"; document.documentElement.lang = S.lang==="zh"?"zh-CN":S.lang; document.body.classList.toggle("zh",S.lang==="zh");
  initHistory(); seedAlarms(); applyStatic(); renderLogin(); startHero();
  setInterval(()=>{ tick(); if(!S.user) return; if(PAGE_UPD){ try{ PAGE_UPD(); }catch(e){ console.warn(e); } } }, 2000);
  setInterval(()=>{ if(!S.user||!can("alarm")) return; if(Math.random()<0.5){ const a=randomAlarm(); if(a){ toast(t("newAlarm",{s:`${a.st} · ${a.dev}`}), alarmText(a), a.sev<=2?"warn":"info"); renderShell(); } } // clear an old non-critical one
      const old=ALARMS.filter(a=>!a.cleared&&a.sev>=3&&a.acked&&Date.now()-a.t>40*60e3); if(old.length){ const a=old[0]; a.cleared=true; a.clrT=Date.now(); } }, 75000);
  window.addEventListener("resize",()=>{ if(!S.user && !HERO) startHero(); });
})();

