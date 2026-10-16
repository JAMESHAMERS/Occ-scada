// ===================== Shell, navigation, router =====================
const NAV = [
  {g:"g_mon", items:[["overview","grid","overview"],["gis","map","overview"],["stations","station","station"],["twin","cube","station"],["alarms","bell","alarm"]]},
  {g:"g_ana", items:[["kpis","gauge","analytics"],["pcurve","curve","analytics"],["loss","down","analytics"],["downtime","stop","analytics"],["curtail","sliders","analytics"],["bench","bars","analytics"],["custom","layers","analytics"],["reports","file","reports"]]},
  {g:"g_sys", items:[["sources","server","sources"],["users","users","users"],["audit","log","audit"]]},
];
const PAGE_PERM = {custom:"analytics",overview:"overview",gis:"overview",station:"station",twin:"station",alarms:"alarm",kpis:"analytics",pcurve:"analytics",loss:"analytics",downtime:"analytics",curtail:"analytics",bench:"analytics",reports:"reports",sources:"sources",users:"users",audit:"audit"};
let navOpenStations = true;
function renderShell(){
  const u=S.user; const nAl=activeAlarms().length;
  $("#nav").innerHTML = NAV.map(g=>{ const its=g.items.filter(([,, p])=>can(p)); if(!its.length) return "";
    return `<div class="sb-g">${t(g.g)}</div>` + its.map(([k,icn])=>{
      if(k==="stations"){ const ids=scopeIds(); return `<button class="nav" data-tog="st" aria-expanded="${navOpenStations}">${ic(icn)}<span>${t("stations")}</span><span class="ty">${ic("chev","sm")}</span></button>
        <div class="nav-sub" ${navOpenStations?"":"hidden"}>${ids.map(id=>{const s=ST[id]; const stc=stStatus(s); return `<button class="nav" data-go="station" data-p="${id}" ${S.page==="station"&&S.param===id?'aria-current="page"':""}><span class="dot ${stc}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(stName(s))}</span><span class="ty">${ic(s.type==="wind"?"turbine":"panel","sm")}</span></button>`;}).join("")}</div>`; }
      return `<button class="nav" data-go="${k}" ${S.page===k?'aria-current="page"':""}>${ic(icn)}<span>${t(k)}</span>${k==="alarms"&&nAl?`<span class="badge chip bg-crit" style="height:19px;font-family:var(--f-num)">${nAl}</span>`:""}</button>`; }).join(""); }).join("");
  const gwDown=STATIONS.filter(s=>s.notOper&&inScope(s.id)).length; const nConn=scopeIds().filter(id=>!ST[id].notOper).length;
  const ptsScope=scopeIds().reduce((a,id)=>a+ST[id].pts,0);
  $("#sbFoot").innerHTML=`<div class="ds-row"><span class="cap muted">${t("dataSrc")}</span><span class="ro">${ic("lock","sm")}${t("readOnly")}</span></div>
    <div class="ds-row"><span>IEC 104 · Modbus · OPC UA</span><span class="live"><i></i>${nConn}/${scopeIds().length}</span></div>
    <div class="ds-row"><span class="muted">${t("ptsTot")}</span><b class="num" style="font-size:14px">${nf(ptsScope,0)}</b></div>
    <div class="ds-row"><span class="muted">${t("sysStatus")}</span><span class="${gwDown?"c-warn":"c-ok"}" style="font-size:11.5px">${gwDown?t("gwDown",{n:gwDown}):t("legOk")}</span></div>`;
  $("#hamb").innerHTML=ic("menu");
  const al=activeAlarms(); $("#alSum").hidden=!can("alarm"); $("#alSum").title=t("alBand");
  $("#alSum").innerHTML=[1,2,3,4].map(p=>{ const n=al.filter(a=>a.sev===p).length, un=al.filter(a=>a.sev===p&&!a.acked).length; return `<button data-go="alarms" class="${n?"on"+p:""} ${un&&p<=2?"unack":""}" aria-label="${t("p"+p)}: ${n}"><b>${n}</b><span>P${p}</span></button>`; }).join("");
  renderStatusBar();
  $("#langSeg").innerHTML=[["vi","VI"],["en","EN"],["zh","中文"]].map(([k,l])=>`<button data-lang="${k}" aria-pressed="${S.lang===k}">${l}</button>`).join("");
  $("#themeBtn").innerHTML=ic(isDark()?"sun":"moon"); $("#themeBtn").title=isDark()?t("light"):t("dark");
  $("#userBtn").innerHTML=`<span class="av">${esc(u.name.split(" ").pop().slice(0,1))}${esc(u.u.slice(0,1).toUpperCase())}</span><span class="user-n"><b>${esc(u.name)}</b><span>${t("r_"+u.role)}</span></span>${ic("chev","sm")}`;
  $("#search").innerHTML=`${ic("search","sm")}<input id="q" placeholder="${t("search")}" aria-label="${t("search")}" autocomplete="off"><kbd>/</kbd><div id="sres" hidden></div>`;
  bindSearch();
}
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]"); if(g){ go(g.dataset.go, g.dataset.p||null); $("#sb").classList.remove("open"); return; }
  const tg=e.target.closest("[data-tog='st']"); if(tg){ navOpenStations=!navOpenStations; renderShell(); return; }
  if(e.target.closest("#hamb")){ $("#sb").classList.toggle("open"); return; }
  if(e.target.closest("#themeBtn")){ applyTheme(isDark()?"light":"dark"); renderShell(); go(S.page,S.param,true); return; }
  if(e.target.closest("#userBtn")){ toggleUserMenu(); return; }
  if(!e.target.closest("#userMenu")) $("#userMenu").innerHTML="";
  if(!e.target.closest("#search")){ const r=$("#sres"); if(r) r.hidden=true; }
});
document.addEventListener("keydown",e=>{ if(e.key==="/" && S.user && document.activeElement.tagName!=="INPUT"){ e.preventDefault(); $("#q")?.focus(); } if(e.key==="Escape"){ closeModal(); closeDrawer(); } });
function toggleUserMenu(){ const m=$("#userMenu"); if(m.innerHTML){ m.innerHTML=""; return; } const u=S.user; const sc=u.scope==="all"?t("allPlants"):u.scope.map(id=>stName(ST[id])).join(", ");
  const mins=Math.floor((Date.now()-S.loginAt)/60000);
  m.innerHTML=`<div class="menu" role="menu"><div class="menu-h"><b>${esc(u.name)}</b><span class="muted" style="font-size:12px">${esc(u.u)} · ${t("r_"+u.role)}</span></div><hr>
  <div class="menu-h" style="gap:6px"><div class="kv"><span>${t("scope")}</span><b style="font-family:var(--f-ui);font-size:12px;text-align:right">${esc(sc)}</b></div><div class="kv"><span>${t("mfa")}</span><b style="font-size:12px">${u.mfa?"TOTP":"—"}</b></div><div class="kv"><span>${t("session")}</span><b style="font-size:12px">${mins} min · 15 min idle</b></div><div class="kv"><span>${t("lastLogin")}</span><b style="font-size:12px">${esc(u.last)}</b></div></div><hr><div class="menu-h show-sm"><span class="cap muted">${t("language")}</span>${langSeg()}</div><hr class="show-sm">
  <button class="mi show-xs" id="miTheme">${ic("moon")}${t("themeT")}</button><button class="mi" id="miAbout">${ic("info")}${t("about")}</button><button class="mi" id="miLogout">${ic("logout")}${t("logout")}</button></div>`; $("#miLogout").onclick=()=>logout(); $("#miTheme").onclick=()=>{ m.innerHTML=""; $("#themeBtn").click(); }; $("#miAbout").onclick=()=>{ m.innerHTML=""; openAbout(); }; }
function openAbout(){ modal(`<div class="mh">${ic("info")}<h3>${t("about")}</h3><span style="margin-left:auto"><button class="ibtn" data-close aria-label="${t("close")}">${ic("x")}</button></span></div><div class="mb about"><span data-logo="full" style="width:220px;display:block"></span>
  <dl class="dl"><dt>${t("model")}</dt><dd>HINO OCC SCADA</dd><dt>${t("version")}</dt><dd class="mono">${BUILD.version} · build ${BUILD.id}${BUILD.sha?" · "+BUILD.sha:""}</dd><dt>${t("devBy")}</dt><dd>${t("hinoName")}</dd><dt>${t("website")}</dt><dd class="mono">www.hino-systechvn.com</dd><dt>${t("customer")}</dt><dd>${t("customerV")}</dd><dt>OCC</dt><dd>NMĐG Ia Pếch · ${t("srvName")}</dd><dt>${t("ptsTot")}</dt><dd class="num">${nf(PTS_TOTAL,0)}</dd><dt>${t("standards")}</dt><dd style="white-space:normal;max-width:300px;margin-left:auto">${t("stdV")}</dd></dl>
  <div class="faint" style="font-size:11.5px">Global Services from Japan · ${t("hinoTag")} · © 2026 HINO Systech Vietnam Co., Ltd.</div></div>`); applyLogos(); }
function renderStatusBar(){ const el=$("#stbar"); if(!el||!S.user) return; const nConn=scopeIds().filter(id=>!ST[id].notOper).length;
  el.innerHTML=`<span>HINO SYSTECH VIETNAM</span><span class="hide-md">OCC SCADA ${BUILD.version} · build ${BUILD.id}</span><span class="hide-md">${t("srvName")}</span><span><i></i>IEC 104 ${nConn}/${scopeIds().length}</span><span class="hide-md">${ic("lock","sm")} ${t("readOnly")} · TLS 1.3</span><span class="grow">${esc(S.user.u)} · ${t("r_"+S.user.role)} · ${t("simData")}</span><span class="clk" id="stClk">${fmtDate(new Date())} ${fmtTime(new Date())} ICT</span>`; }
setInterval(()=>{ const c=document.getElementById("stClk"); if(c) c.textContent=`${fmtDate(new Date())} ${fmtTime(new Date())} ICT`; },1000);
function bindSearch(){ const q=$("#q"), box=$("#sres"); let sel=0, items=[];
  q.oninput=()=>{ const v=q.value.trim().toLowerCase(); if(!v){ box.hidden=true; return; } items=[];
    scopeIds().forEach(id=>{ const s=ST[id]; if((stName(s)+s.code+L(s.full)).toLowerCase().includes(v)) items.push({ic:"station",l:L(s.full),s:s.code,go:()=>go("station",id)});
      s.units.forEach(u=>{ if(u.id.toLowerCase().includes(v)) items.push({ic:s.type==="wind"?"turbine":"panel",l:`${u.id}`,s:stName(s),go:()=>{ if(can("station")){ go("station",id); setTimeout(()=>openUnit(id,u.id),60);} }}); }); });
    if(can("alarm")) activeAlarms().forEach(a=>{ const tx=alarmText(a); if((tx+a.dev).toLowerCase().includes(v)) items.push({ic:"bell",l:tx,s:`${a.st} · ${a.dev}`,go:()=>go("alarms")}); });
    items=items.slice(0,12); sel=0; box.className="sres"; box.hidden=false;
    box.innerHTML= items.length? items.map((x,i)=>`<button data-i="${i}" class="${i===0?"on":""}">${ic(x.ic,"sm")}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.l)}</span><span class="faint" style="font-size:11px">${esc(x.s)}</span></button>`).join("") : `<div class="muted" style="padding:10px">${t("noResult")}</div>`;
    $$("button",box).forEach(b=>b.onclick=()=>{ items[+b.dataset.i].go(); box.hidden=true; q.value=""; }); };
  q.onkeydown=e=>{ if(box.hidden||!items.length) return; if(e.key==="ArrowDown"||e.key==="ArrowUp"){ e.preventDefault(); sel=(sel+(e.key==="ArrowDown"?1:-1)+items.length)%items.length; $$("button",box).forEach((b,i)=>b.classList.toggle("on",i===sel)); } if(e.key==="Enter"){ items[sel].go(); box.hidden=true; q.value=""; } };
}
function teardown(){ S.charts.forEach(c=>{ try{c.dispose();}catch(e){} }); S.charts=[]; S.scenes.forEach(sc=>{ try{sc.dispose();}catch(e){} }); S.scenes=[]; S.cleanup.forEach(f=>{try{f();}catch(e){}}); S.cleanup=[]; PAGE_UPD=null; }
let PAGE_UPD=null;
function go(page, param=null, keep){
  const perm=PAGE_PERM[page]; const prevPage=S.page, prevParam=S.param; S.page=page; S.param=param;
  if(!keep) closeDrawer();
  teardown(); const v=$("#view"); v.innerHTML=""; if(!keep) v.scrollTop=0;
  if(perm && !can(perm)){ audit("a_view",page,"denied"); setTitle(t("denied"),""); v.innerHTML=`<div class="locked">${ic("lock","i")}<h2 style="margin:0;color:var(--text)">${t("denied")}</h2><p style="max-width:52ch;margin:0">${t("deniedS",{r:t("r_"+S.user.role)})}</p></div>`; renderShell(); return; }
  if(page==="station" && param && !inScope(param)){ audit("a_view",param,"denied"); setTitle(t("denied"),""); v.innerHTML=`<div class="locked">${ic("lock","i")}<h2 style="margin:0;color:var(--text)">${t("denied")}</h2></div>`; renderShell(); return; }
  if(page==="station" && !param){ param=scopeIds()[0]; S.param=param; }
  if(page!==prevPage||param!==prevParam) audit("a_view",page+(param?" · "+param:""),"ok");
  renderShell();
  const fn=PAGES[page]; v.innerHTML=`<div class="view-in" id="vin"></div>`; fn($("#vin"), param);
  saveSession();
}
const PAGE_LVL={custom:3,overview:1,gis:1,station:2,alarms:2,kpis:2,pcurve:3,loss:2,downtime:3,curtail:2,bench:1,reports:2,twin:4,sources:3,users:2,audit:2};
function setTitle(a,b){ $("#pgT").textContent=a; $("#pgS").textContent=b; const l=PAGE_LVL[S.page]||1; $("#pgL").textContent=`L${l} · ${t("L"+l)}`; }
function subClock(key){ return `${t(key)} · ${fmtTime(new Date())} (UTC+7)`; }

// ===================== Charts helper =====================
function chartBase(){ const dark=isDark(); return { textStyle:{fontFamily:css("--f-ui"),color:css("--muted")}, grid:{left:46,right:18,top:34,bottom:30,containLabel:false}, animationDuration:500,
  tooltip:{trigger:"axis",backgroundColor:css("--surface"),borderColor:css("--line-2"),textStyle:{color:css("--text"),fontSize:12},extraCssText:"box-shadow:0 6px 20px rgba(0,0,0,.3);border-radius:2px"},
  legend:{textStyle:{color:css("--text-2"),fontSize:11.5},itemWidth:14,itemHeight:3,top:2,icon:"rect"} }; }
function axisX(data,o={}){ return Object.assign({type:"category",data,axisLine:{lineStyle:{color:css("--line-2")}},axisTick:{show:false},axisLabel:{color:css("--muted"),fontSize:11}},o); }
function axisY(name,o={}){ return Object.assign({type:"value",name,nameTextStyle:{color:css("--muted"),fontSize:11,padding:[0,0,0,-20]},splitLine:{lineStyle:{color:css("--line"),type:[3,4]}},axisLabel:{color:css("--muted"),fontSize:11}},o); }
function mkChart(el, opt){ if(!window.echarts){ el.innerHTML=`<div class="empty">${ic("bars","i")}<span>ECharts CDN</span></div>`; return null; }
  const c=echarts.init(el,null,{renderer:"canvas"}); const orig=c.setOption.bind(c); c.setOption=(o,nm)=>{ const b=chartBase(); const m=Object.assign({},b,o); ["legend","tooltip","textStyle"].forEach(k=>{ if(o[k]&&!Array.isArray(o[k])) m[k]=Object.assign({},b[k],o[k], k==="legend"?{textStyle:Object.assign({},b.legend.textStyle,(o.legend||{}).textStyle)}:{}); }); return orig(m,nm); }; c.setOption(opt); S.charts.push(c); const ro=new ResizeObserver(()=>c.resize()); ro.observe(el); S.cleanup.push(()=>ro.disconnect()); return c; }

// common bits
function kpi(icn, cls, label, val, unit, sub, extra=""){ return `<div class="panel kpi"><div class="kpi-l">${label}</div><div class="kpi-v">${val}${unit?`<small>${unit}</small>`:""}</div><div class="kpi-s">${sub||"&nbsp;"}</div>${extra}</div>`; }
function sevChip(sev){ return `<span class="sev p${sev}" data-p="${sev}">${t("p"+sev)}</span>`; }
function healthChip(h){ if(h==null) return `<span class="health" style="box-shadow:inset 0 0 0 1px var(--line-2);color:var(--muted)">—</span>`; if(h>=90) return `<span class="health" style="background:var(--surface-3);color:var(--text)">${h}</span>`; const c=h>=80?"warn":"crit"; return `<span class="health bg-${c}">${h}</span>`; }
function exportCSV(name, rows){ if(!can("export")){ toast(t("noPermExport"),"","warn"); audit("a_export",name,"denied"); return; }
  const csv="﻿"+rows.map(r=>r.map(x=>{ const s=String(x??""); return /[",;\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }).join(",")).join("\n");
  const f=`${name}_${new Date().toISOString().slice(0,10)}.csv`; try{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=f; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500); }catch(e){}
  audit("a_export",f,"ok"); toast(t("exported",{f}), t("exportNote"), "ok"); }
function periodSeg(cur, id="per"){ return `<div class="seg" id="${id}">${[["month","thisMonth"],["year","thisYear"],["d30","d30"],["d365","d365"]].map(([k,l])=>`<button data-per="${k}" aria-pressed="${cur===k}">${t(l)}</button>`).join("")}</div>`; }
function stSelect(cur, id="stsel", allow="all"){ const ids=scopeIds().filter(i=>allow==="all"||ST[i].type===allow||(allow==="windish"&&ST[i].type==="wind")); return `<select class="sel" id="${id}">${allow==="all"?`<option value="all" ${cur==="all"?"selected":""}>${t("allSt")} (${ids.length})</option>`:""}${ids.map(i=>`<option value="${i}" ${cur===i?"selected":""}>${esc(stName(ST[i]))}</option>`).join("")}</select>`; }
