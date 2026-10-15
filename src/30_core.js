// ===================== App state & utils =====================
const S = { lang:"vi", theme:null, user:null, page:"overview", param:null, alarmTab:"active", lastAct:Date.now(), charts:[], scenes:[], cleanup:[] };
const $ = (s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = { get(k){ try{ return JSON.parse(localStorage.getItem("occ."+k)); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem("occ."+k,JSON.stringify(v)); }catch(e){} } };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
async function sha256(s){ const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); }

const IC = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  station:'<path d="M3 21h18M5 21V10l5-3v14M10 21V5l9 4v12"/><path d="M13 12h3M13 16h3"/>',
  turbine:'<path d="M12 12v9"/><path d="M12 12 6.5 3.8"/><path d="m12 12 8.6-1.2"/><path d="M12 12 4.6 15.6"/><circle cx="12" cy="12" r="1.4"/><path d="M9 21h6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  panel:'<path d="M4 5h16l-2 9H2l2-9Z"/><path d="M3 9.5h16M8 5l-1 9M14 5l-1 9M10 14v4M6 21h8"/>',
  cube:'<path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="m3.3 7.5 8.7 5 8.7-5M12 22V12.5"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  gauge:'<path d="M12 14 15.5 9"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/><circle cx="12" cy="14" r="1.2"/>',
  curve:'<path d="M3 20c5 0 6-14 18-16"/><path d="M3 3v18h18"/>',
  down:'<path d="M22 17 13.5 8.5l-5 5L2 7"/><path d="M16 17h6v-6"/>',
  stop:'<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  bars:'<path d="M3 3v18h18"/><path d="M7 16v-4M11 16V8M15 16v-6M19 16V5"/>',
  file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  shield:'<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  log:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  server:'<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  moon:'<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  chev:'<path d="m6 9 6 6 6-6"/>', chevR:'<path d="m9 6 6 6-6 6"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>', check:'<path d="M20 6 9 17l-5-5"/>',
  alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
  dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  wind:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  thermo:'<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plug:'<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8ZM12 18v4"/>',
  cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14h.01M12 14h.01M16 14h.01"/>',
  okc:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  rot:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  wifiOff:'<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.2-1.6M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M12 20h.01"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8 2.3 2.3a4 4 0 0 0 2.4 2Z"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>', plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>', fit:'<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"/>',
  layers:'<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>', pin:'<path d="M12 21s-7-6.3-7-11.5a7 7 0 0 1 14 0C19 14.7 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>', play:'<path d="m6 4 14 8-14 8V4Z"/>', pause:'<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  cpu:'<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  hand:'<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0"/>',
  limit:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
};
const ic = (n,c="") => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||""}</svg>`;
const ST_IC = {run:"okc",limit:"gauge",fault:"alert",maint:"wrench",comm:"wifiOff",stop:"hand",idle:"clock"};
const ST_CLS = {run:"ok",limit:"curt",fault:"crit",maint:"maint",comm:"off",stop:"warn",idle:"off"};
const stName = s => L(s.name);

// HINO Systech Vietnam logo (vector, redrawn from the corporate mark: blue #0044B8, green #00B07A)
function hinoLogo(kind="full", fixed){ const b=fixed?' style="fill:#5C8FF2"':'', g=fixed?' style="fill:#1FC48E"':'', o=fixed?' style="stroke:#5C8FF2"':'', tx=fixed?' style="fill:#A3ABB6"':'';
  const mark=`<rect class="b"${b} x="93" y="59" width="14" height="154"/><rect class="b"${b} x="189" y="59" width="14" height="154"/><rect class="b"${b} x="93" y="129" width="110" height="14"/><polygon class="g"${g} points="310,59 326,59 227,213 211,213"/><rect class="b"${b} x="333" y="59" width="14" height="154"/><rect class="b"${b} x="433" y="59" width="14" height="154"/><polygon class="b"${b} points="333,59 349,59 447,213 431,213"/><ellipse class="o"${o} cx="541.5" cy="136" rx="69" ry="70.5" stroke-width="13"/>`;
  return kind==="mark"? `<svg class="hino" viewBox="86 52 538 168" role="img" aria-label="HINO">${mark}</svg>` : `<svg class="hino" viewBox="78 50 566 218" role="img" aria-label="HINO Systech Vietnam Co., Ltd.">${mark}<text class="t"${tx} x="80" y="259" font-family="Arial,Helvetica,sans-serif" font-size="25" textLength="556" lengthAdjust="spacingAndGlyphs">HINO SYSTECH VIETNAM CO.,LTD.</text></svg>`; }
function applyLogos(){ $$("[data-logo]").forEach(el=>el.innerHTML=hinoLogo(el.dataset.logo, el.hasAttribute("data-fixed"))); }
function toast(title, body, kind="info"){
  const el=document.createElement("div"); el.className="toast k-"+kind;
  const k={info:["info","c-acc"],ok:["okc","c-ok"],warn:["alert","c-warn"],crit:["alert","c-crit"]}[kind];
  el.innerHTML=`${ic(k[0],k[1])}<div><b>${esc(title)}</b>${body?`<div class="muted">${esc(body)}</div>`:""}</div>`;
  $("#toasts").appendChild(el); setTimeout(()=>{ el.style.opacity="0"; el.style.transition="opacity .3s"; setTimeout(()=>el.remove(),320); }, 4200);
}
function modal(html, wide){ const h=$("#modalHost"); h.innerHTML=`<div class="scrim" data-close></div><div class="modal" data-close><div class="modal-c ${wide?"wide":""}" role="dialog" aria-modal="true">${html}</div></div>`; h.onclick=e=>{ if(e.target.hasAttribute("data-close")) closeModal(); }; return $(".modal-c",h); }
function closeModal(){ $("#modalHost").innerHTML=""; }

// theme
function applyTheme(th){ S.theme=th; if(th) document.documentElement.setAttribute("data-theme",th); else document.documentElement.removeAttribute("data-theme"); store.set("theme",th); }
function isDark(){ const a=document.documentElement.getAttribute("data-theme"); if(a) return a==="dark"; return !window.matchMedia("(prefers-color-scheme: light)").matches; }
function setLang(l){ S.lang=l; store.set("lang",l); document.documentElement.lang = l==="zh"?"zh-CN":l; document.body.classList.toggle("zh",l==="zh"); nfCache && Object.keys(nfCache).forEach(k=>delete nfCache[k]); applyStatic(); if(S.user){ renderShell(); go(S.page,S.param,true); } else renderLogin(); }
function applyStatic(){ $$("[data-i]").forEach(el=>el.textContent=t(el.dataset.i)); const g=FIG(); const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; }; set("hsPtsV","≈"+g.PTS); set("hsNpV",g.NP); set("hsMwV","≈"+g.MW+" MW"); applyLogos(); }
function langSeg(id){ return `<div class="seg" role="group" aria-label="Language" ${id?`id="${id}"`:""}>${[["vi","VI"],["en","EN"],["zh","中文"]].map(([k,l])=>`<button data-lang="${k}" aria-pressed="${S.lang===k}">${l}</button>`).join("")}</div>`; }
document.addEventListener("click",e=>{ const b=e.target.closest("[data-lang]"); if(b) setLang(b.dataset.lang); });

// ===================== Auth / login =====================
const LOGIN = { step:"cred", pending:null, err:null, busy:false };
function lockInfo(u){ const x=store.get("lock."+u)||{n:0,until:0}; return x; }
function setLock(u,x){ store.set("lock."+u,x); }
function totp(u, slot){ const seed=[...u].reduce((a,c)=>a*31+c.charCodeAt(0),7)|0; const h=Math.abs(hsh(seed ^ (slot??Math.floor(Date.now()/30000))*2654435761)); return String(Math.floor(h*1e6)).padStart(6,"0"); }
function renderLogin(){
  const c=$("#loginCard"); const remembered=store.get("rememberU")||"";
  if(LOGIN.step==="cred"){
    c.innerHTML=`
      <div class="login-top"><span data-logo="full" style="width:190px;display:block"></span>${langSeg()}</div>
      <div class="login-prod"><b>OCC SCADA · IA PECH</b><span>${t("prodSub")}</span></div>
      <div><h2 class="login-h">${t("login")}</h2><p class="login-sub">${t("loginSub")}</p></div>
      ${LOGIN.err?`<div class="err" role="alert">${ic("alert","sm")}<span>${esc(LOGIN.err)}</span></div>`:""}
      <form id="lf" class="grid" style="gap:14px" autocomplete="on" novalidate>
        <div class="field"><label for="lu">${t("username")}</label><div class="inp">${ic("users","sm")}<input id="lu" name="username" autocomplete="username" value="${esc(remembered)}" required spellcheck="false"></div></div>
        <div class="field"><label for="lp">${t("password")}</label><div class="inp">${ic("lock","sm")}<input id="lp" name="password" type="password" autocomplete="current-password" required><button type="button" class="ib" id="pwEye" aria-label="Show password">${ic("eye","sm")}</button></div></div>
        <div class="between"><label class="chk"><input type="checkbox" id="lrem" ${remembered?"checked":""}> ${t("remember")}</label><button type="button" class="link" id="forgot">${t("forgot")}</button></div>
        <button class="btn primary lg" id="lbtn" ${LOGIN.busy?"disabled":""}>${LOGIN.busy?t("verifying"):t("signin")}</button>
      </form>
      <div class="demo"><div class="demo-h"><span>${t("demoAcc")}</span><span>${t("demoHint")}</span></div><div class="demo-list">
        ${["admin","manager","occ","iapech","maint","guest"].map(u=>{const x=USERS.find(y=>y.u===u); return `<button class="demo-acc" data-demo="${u}"><b>${u}</b><span>${t("r_"+x.role)}${x.mfa?" · 2FA":""}</span></button>`;}).join("")}
      </div><div class="faint" style="font-size:11px">${t("pwPolicy")}</div></div>
      <div class="sec-foot"><span>${ic("lock","sm")}${t("secTls")}</span><span>${ic("shield","sm")}${t("secRbac")}</span><span>${ic("log","sm")}${t("secAudit")}</span><span>${ic("eye","sm")}${t("secRo")}</span></div>
      <div class="login-legal"><span>${t("devBy")} <b>${t("hinoName")}</b></span><span>Global Services from Japan · www.hino-systechvn.com</span><span>© 2026 HINO Systech Vietnam Co., Ltd. · OCC SCADA v${BUILD.version} · build ${BUILD.id}</span></div>`;
    $("#pwEye").onclick=()=>{ const p=$("#lp"); p.type=p.type==="password"?"text":"password"; $("#pwEye").innerHTML=ic(p.type==="password"?"eye":"eyeOff","sm"); };
    $("#forgot").onclick=()=>toast(t("forgot"),t("forgotMsg"));
    $$("[data-demo]").forEach(b=>b.onclick=()=>{ $("#lu").value=b.dataset.demo; $("#lp").value=DEMO_PW[b.dataset.demo]; $("#lp").focus(); });
    $("#lf").onsubmit=async e=>{ e.preventDefault(); await doLogin($("#lu").value.trim(), $("#lp").value, $("#lrem").checked); };
    if(!remembered) setTimeout(()=>$("#lu")?.focus(),50);
  } else {
    const u=LOGIN.pending; const slot=Math.floor(Date.now()/30000), left=30-Math.floor(Date.now()/1000)%30;
    c.innerHTML=`
      <div class="login-top"><button class="btn ghost sm" id="otpBack">${ic("chevR","sm")} ${t("back")}</button>${langSeg()}</div>
      <div><h2 class="login-h">${t("mfaT")}</h2><p class="login-sub">${t("mfaS")}</p></div>
      ${LOGIN.err?`<div class="err" role="alert">${ic("alert","sm")}<span>${esc(LOGIN.err)}</span></div>`:""}
      <form id="of" class="grid" style="gap:14px"><div class="otp">${[0,1,2,3,4,5].map(i=>`<input inputmode="numeric" maxlength="1" aria-label="Digit ${i+1}" id="o${i}" autocomplete="${i===0?"one-time-code":"off"}">`).join("")}</div>
      <button class="btn primary lg">${t("verify")}</button></form>
      <div class="totp"><div><div class="faint" style="font-size:11px">${t("mfaDemo")} · ${esc(u.u)}</div><b id="totpCode">${totp(u.u,slot)}</b></div>
      <svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--line-2)" stroke-width="3"/><circle id="totpRing" cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="94.2" stroke-dashoffset="${94.2*(1-left/30)}" transform="rotate(-90 18 18)" stroke-linecap="round"/></svg></div>
      <div class="sec-foot"><span>${ic("key","sm")}TOTP RFC 6238 · 30 s</span></div>
      <div class="login-legal"><span>${t("devBy")} <b>${t("hinoName")}</b></span></div>`;
    $("#otpBack").firstChild.style.transform="rotate(180deg)";
    $("#otpBack").onclick=()=>{ LOGIN.step="cred"; LOGIN.err=null; renderLogin(); };
    const ins=$$(".otp input"); ins.forEach((inp,i)=>{ inp.oninput=()=>{ inp.value=inp.value.replace(/\D/g,"").slice(-1); if(inp.value&&i<5) ins[i+1].focus(); if(ins.every(x=>x.value)) $("#of").requestSubmit(); };
      inp.onkeydown=e=>{ if(e.key==="Backspace"&&!inp.value&&i>0) ins[i-1].focus(); };
      inp.onpaste=e=>{ const d=(e.clipboardData.getData("text")||"").replace(/\D/g,"").slice(0,6); if(d.length===6){ e.preventDefault(); ins.forEach((x,j)=>x.value=d[j]); $("#of").requestSubmit(); } }; });
    $("#totpCode").onclick=()=>{ const d=$("#totpCode").textContent; ins.forEach((x,j)=>x.value=d[j]); };
    $("#of").onsubmit=e=>{ e.preventDefault(); const code=ins.map(x=>x.value).join(""); const s=Math.floor(Date.now()/30000);
      if(code===totp(u.u,s)||code===totp(u.u,s-1)){ audit("a_mfa","TOTP","ok",u.u); finishLogin(u); } else { audit("a_mfa","TOTP","fail",u.u); LOGIN.err=t("badOtp"); renderLogin(); } };
    setTimeout(()=>ins[0]?.focus(),50);
  }
  applyStatic();
}
setInterval(()=>{ if(LOGIN.step==="otp" && !S.user){ const el=$("#totpCode"), ring=$("#totpRing"); if(!el) return; el.textContent=totp(LOGIN.pending.u); const left=30-Math.floor(Date.now()/1000)%30; ring.setAttribute("stroke-dashoffset",94.2*(1-left/30)); } },1000);
async function doLogin(u, pw, rem){
  LOGIN.err=null; const lk=lockInfo(u); const now=Date.now();
  if(lk.until>now){ const m=Math.ceil((lk.until-now)/60000); LOGIN.err=t("locked",{t:`${m} ${S.lang==="en"?"min":S.lang==="zh"?"分钟":"phút"}`}); renderLogin(); return; }
  LOGIN.busy=true; renderLogin(); const h=await sha256(SALT+":"+pw); await new Promise(r=>setTimeout(r,450)); LOGIN.busy=false;
  const acc=USERS.find(x=>x.u===u);
  if(!acc || acc.h!==h){ lk.n=(lk.n||0)+1; if(lk.n>=5){ lk.until=now+5*60e3; lk.n=0; audit("a_lock",u,"fail",u||"unknown"); LOGIN.err=t("locked",{t:`5 ${S.lang==="en"?"min":S.lang==="zh"?"分钟":"phút"}`}); } else LOGIN.err=t("badCred",{n:5-lk.n}); setLock(u,lk); audit("a_login","", "fail", u||"unknown"); renderLogin(); return; }
  if(!acc.enabled){ LOGIN.err=t("disabledAcc"); audit("a_login","disabled","fail",u); renderLogin(); return; }
  setLock(u,{n:0,until:0}); store.set("rememberU", rem?u:"");
  if(acc.mfa){ LOGIN.step="otp"; LOGIN.pending=acc; renderLogin(); return; }
  finishLogin(acc);
}
function finishLogin(acc){
  S.user=acc; LOGIN.step="cred"; LOGIN.err=null; LOGIN.pending=null; S.lastAct=Date.now(); S.loginAt=Date.now(); audit("a_login","","ok",acc.u);
  stopHero(); $("#login").hidden=true; $("#shell").hidden=false; renderShell();
  const first = can("overview")? "overview" : "alarms"; go(first);
  store.set("session",{u:acc.u,t:Date.now()});
}
function logout(reason){ audit(reason==="timeout"?"a_timeout":"a_logout",""); S.user=null; teardown(); store.set("session",null); $("#shell").hidden=true; $("#login").hidden=false; $("#drawerHost").innerHTML=""; closeModal(); LOGIN.step="cred"; LOGIN.err= reason==="timeout"? t("expired") : null; renderLogin(); startHero(); }
// idle timeout 15 min
["pointerdown","keydown","wheel","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ S.lastAct=Date.now(); if($("#idleBox")){ $("#idleBox").remove(); } },{passive:true}));
setInterval(()=>{ if(!S.user) return; const idle=(Date.now()-S.lastAct)/1000; const lim=15*60; if(idle>lim){ logout("timeout"); return; }
  if(idle>lim-60){ let b=$("#idleBox"); if(!b){ b=document.createElement("div"); b.id="idleBox"; b.className="timeout toast"; document.body.appendChild(b); } b.innerHTML=`${ic("clock","c-warn")}<div><b>${t("idleT")}</b><div class="muted">${t("idleS",{s:Math.ceil(lim-idle)})}</div><button class="btn sm primary" style="margin-top:8px">${t("stay")}</button></div>`; } },1000);
