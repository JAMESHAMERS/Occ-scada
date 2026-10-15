// ===================== Pages: overview, station, unit drawer, alarms, twin =====================
const PAGES = {};
function scopeStations(){ return scopeIds().map(id=>ST[id]); }
function portfolio(){
  const ss=scopeStations(); const live=ss.filter(s=>!s.notOper);
  const p=ss.reduce((a,s)=>a+LIVE.st[s.id].p,0), cap=ss.reduce((a,s)=>a+s.cap,0), e=ss.reduce((a,s)=>a+LIVE.st[s.id].e,0), eth=ss.reduce((a,s)=>a+LIVE.st[s.id].eth,0);
  const plan=ss.reduce((a,s)=>a+s.plan,0), mtd=ss.reduce((a,s)=>a+(s.plan?LIVE.st[s.id].mtd+LIVE.st[s.id].e:0),0);
  const capLive=live.reduce((a,s)=>a+s.cap,0); const avail= capLive? live.reduce((a,s)=>a+LIVE.st[s.id].avail*s.cap,0)/capLive : null;
  const units=ss.reduce((a,s)=>a+s.n,0), unitsOk=ss.reduce((a,s)=>a+s.units.filter(u=>["run","limit"].includes(unitState(s,u.id))).length,0);
  const ws=live.filter(s=>s.type==="wind"), sol=live.filter(s=>s.type!=="wind");
  const wind= ws.length? ws.reduce((a,s)=>a+LIVE.st[s.id].v,0)/ws.length : null; const irr= sol.length? sol.reduce((a,s)=>a+LIVE.st[s.id].g,0)/sol.length : null;
  const al=activeAlarms(); const yday=ss.reduce((a,s)=>a+LIVE.st[s.id].ye,0);
  return {ss,p,cap,e,eth,plan,mtd,avail,units,unitsOk,wind,irr,al,ws,sol,yday,nWind:ss.filter(s=>s.type==="wind").length,nSol:ss.filter(s=>s.type!=="wind").length};
}
PAGES.overview=(el)=>{
  setTitle(t("overview"), subClock("sub_overview"));
  let tab="pow";
  el.innerHTML=`<div class="grid g-kpi" id="ovK"></div>
  <div class="grid g-ov">
    <div class="panel"><div class="ph"><h3>${t("health")}</h3></div><div class="pb" id="ovH"></div></div>
    <div class="panel ov-map"><div class="ph"><h3>${t("stMap")}</h3><span class="sub">WGS84</span><span class="act"><button class="btn sm" data-go="gis">${ic("map","sm")} ${t("gis")}</button></span></div><div class="pb flush" style="display:flex;flex-direction:column;padding-top:10px;min-height:340px"><div class="map-w" id="ovMap"></div></div></div>
    <div class="panel"><div class="ph"><h3>${t("stStatus")}</h3><span class="act">${can("analytics")?`<button class="link" data-go="bench">${t("viewAll")}</button>`:""}</span></div><div class="pb flush tw" id="ovT"></div></div>
  </div>
  <div class="grid g-ov2">
    <div class="panel"><div class="ph"><h3>${t("assets")}</h3></div><div class="pb"><div class="asset" id="ovA"></div></div></div>
    <div class="panel"><div class="ph"><h3>${t("trend")}</h3><span class="sub">${fmtDate(new Date())}</span><span class="act"><div class="seg" id="ovTab">${[["pow","activePow"],["en","energy"],["wind","windSpd"],["irr","irr"]].map(([k,l])=>`<button data-k="${k}" aria-pressed="${k===tab}">${t(l)}</button>`).join("")}</div></span></div>
      <div class="pb" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,170px);gap:14px"><div class="chart" id="ovC"></div><div id="ovS" class="ov-side"></div></div></div>
  </div>
  <div class="faint" style="font-size:11.5px">${ic("info","sm")} ${t("simNote")}</div>`;
  const map=MAP2D.mount($("#ovMap"),{mini:true}); S.cleanup.push(()=>map.destroy());
  const ch=mkChart($("#ovC"),{});
  function drawChart(){ if(!ch) return; const P=portfolio(); const ids=new Set(scopeIds()); const d0=dayStart(Date.now());
    const xs=[]; for(let i=0;i<288;i++) xs.push(fmtTime(new Date(d0+i*300e3),false));
    let opt;
    if(tab==="pow"){ const act=[], th=[], yd=[]; const yc=Array(288).fill(0); scopeStations().forEach(s=>LIVE.st[s.id].yc.forEach((v,i)=>yc[i]+=v));
      // recompute the scoped curve (LIVE.curve is portfolio-wide)
      const full=scopeIds().length===STATIONS.length;
      for(let i=0;i<288;i++){ const tt=d0+i*300e3; if(tt<=Date.now()){ if(full){ const c=LIVE.curve[i]; act.push(c?+c[1].toFixed(2):null); th.push(c?+c[2].toFixed(2):null);} else { let p=0,q=0; scopeStations().forEach(s=>{const r=stationPower(s,tt); p+=r.p;q+=r.th;}); act.push(+p.toFixed(2)); th.push(+q.toFixed(2)); } } else { act.push(null); th.push(null);} yd.push(+yc[i].toFixed(2)); }
      opt={legend:{data:[t("actual"),t("theory"),t("yesterday")]},xAxis:axisX(xs,{axisLabel:{interval:35,color:css("--muted"),fontSize:11}}),yAxis:axisY("MW"),
        series:[{name:t("actual"),type:"line",data:act,showSymbol:false,smooth:.2,lineStyle:{width:2,color:css("--accent")},itemStyle:{color:css("--accent")},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:css("--accent-soft")},{offset:1,color:"rgba(0,0,0,0)"}])}},
          {name:t("theory"),type:"line",data:th,showSymbol:false,smooth:.2,lineStyle:{width:1.4,type:[4,3],color:css("--wind")},itemStyle:{color:css("--wind")}},
          {name:t("yesterday"),type:"line",data:yd,showSymbol:false,smooth:.2,lineStyle:{width:1.2,color:css("--faint")},itemStyle:{color:css("--faint")}}]};
    } else if(tab==="en"){ const hx=[...Array(24).keys()].map(h=>String(h).padStart(2,"0")+":00"); const cur=Math.floor(localH(Date.now())); const w=[], so=[];
      for(let h=0;h<24;h++){ let a=0,b=0; scopeStations().forEach(s=>{ const v=LIVE.st[s.id].hrs[h].e; if(s.type==="wind") a+=v; else b+=v; }); w.push(h<=cur?+a.toFixed(2):null); so.push(h<=cur?+b.toFixed(2):null); }
      opt={legend:{data:[t("windP"),t("solarP")]},xAxis:axisX(hx,{axisLabel:{interval:2,color:css("--muted"),fontSize:11}}),yAxis:axisY("MWh"),series:[{name:t("windP"),type:"bar",stack:"e",data:w,itemStyle:{color:css("--wind"),borderRadius:[0,0,0,0]},barWidth:"58%"},{name:t("solarP"),type:"bar",stack:"e",data:so,itemStyle:{color:css("--solar"),borderRadius:[3,3,0,0]}}]};
    } else { const isW=tab==="wind"; const sts=scopeStations().filter(s=>!s.notOper&&(isW?s.type==="wind":s.type!=="wind")); const hx=[...Array(24).keys()].map(h=>String(h).padStart(2,"0")+":00"); const cur=Math.floor(localH(Date.now()));
      opt={legend:{data:sts.map(s=>s.code)},xAxis:axisX(hx,{axisLabel:{interval:2,color:css("--muted"),fontSize:11}}),yAxis:axisY(isW?"m/s":"W/m²"),
        series:sts.map((s,i)=>({name:s.code,type:"line",showSymbol:false,smooth:.3,data:LIVE.st[s.id].hrs.map((x,h)=>h<=cur?+x.w.toFixed(isW?2:0):null),lineStyle:{width:1.8},color:[css("--wind"),css("--accent"),css("--maint"),css("--solar"),css("--ok")][i%5]}))};
    }
    ch.setOption(opt,true);
  }
  function upd(){ const P=portfolio();
    const nUrgent=P.al.filter(a=>a.sev===1).length, nSt=new Set(P.al.map(a=>a.st)).size;
    $("#ovK").innerHTML=[
      kpi("zap","", t("pNow"), nf(P.p,1),"MW", t("ofCap",{a:nf(100*P.p/P.cap,1)+" %",b:nf(P.cap,1)}), `<div class="bar"><i style="width:${100*P.p/P.cap}%"></i></div>`),
      kpi("sun","bg-solar", t("eToday"), nf(P.e,1),"MWh", t("eqH",{h:nf(P.e/P.cap,2)})),
      kpi("cal","bg-maint", t("planM"), nf(P.plan?100*P.mtd/P.plan:0,1),"%", `${nf(P.mtd/1000,2)} / ${nf(P.plan/1000,2)} GWh`, `<div class="bar"><i style="width:${P.plan?Math.min(100,100*P.mtd/P.plan):0}%"></i></div>`),
      kpi("okc","bg-ok", t("avail"), P.avail==null?"—":nf(P.avail,1),"%", t("devRun",{a:P.unitsOk,b:P.units})),
      kpi("alert","bg-crit", t("actAlarms"), `<span class="c-crit">${P.al.length}</span>`,"", `<span class="c-crit">${t("urgent",{n:nUrgent,m:nSt})}</span>`),
      kpi("wind","bg-wind", t("avgWind"), P.wind==null?"—":nf(P.wind,1),"m/s", t("windSt",{n:P.ws.length})),
      kpi("sun","bg-solar", t("irr"), P.irr==null?"—":nf(P.irr,0),"W/m²", t("solarSt",{n:P.sol.length})) ].join("");
    const cnt={ok:0,warn:0,crit:0,off:0}; P.ss.forEach(s=>cnt[stStatus(s)]++); const tot=P.ss.length;
    const segs=[["ok",cnt.ok],["warn",cnt.warn],["crit",cnt.crit],["off",cnt.off]]; let acc=0; const C=2*Math.PI*44;
    const arcs=segs.map(([k,n])=>{ const len=C*n/tot; const gap=n&&tot>1?3:0; const s=`<circle cx="60" cy="60" r="44" fill="none" stroke="var(--${k})" stroke-width="13" stroke-dasharray="${Math.max(0,len-gap)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`; acc+=len; return s; }).join("");
    const cf=P.ss.filter(s=>!s.notOper).reduce((a,s)=>a+cfToday(s)*s.cap,0)/Math.max(1,P.ss.filter(s=>!s.notOper).reduce((a,s)=>a+s.cap,0));
    const comm=100*P.ss.reduce((a,s)=>a+s.units.filter(u=>unitState(s,u.id)!=="comm").length,0)/Math.max(1,P.units);
    $("#ovH").innerHTML=`<div class="donut-w"><svg viewBox="0 0 120 120" width="132" height="132" role="img" aria-label="${t("health")}"><circle cx="60" cy="60" r="44" fill="none" stroke="var(--surface-3)" stroke-width="13"/>${arcs}<text x="60" y="62" text-anchor="middle" font-family="var(--f-num)" font-size="30" font-weight="600" fill="var(--text)">${tot}</text><text x="60" y="80" text-anchor="middle" font-size="10" fill="var(--muted)">${t("stCount")}</text></svg>
      <div class="legend">${[["ok","online"],["warn","warning"],["crit","fault"],["off","interrupted"]].map(([k,l])=>`<div><span class="dot ${k}"></span><b>${cnt[k]}</b><span class="muted">${t(l)}</span></div>`).join("")}</div></div>
      <div class="mini3"><div><b class="c-ok">${P.avail==null?"—":nf(P.avail,1)}<small style="font-size:12px"> %</small></b><span>${t("avail")}</span></div><div><b class="c-wind">${nf(cf,1)}<small style="font-size:12px"> %</small></b><span>${t("capFactor")}</span></div><div><b class="c-warn">${nf(comm,0)}<small style="font-size:12px"> %</small></b><span>${t("comms")}</span></div></div>`;
    $("#ovT").innerHTML=`<table class="t"><thead><tr><th>${t("station")}</th><th class="r">${t("capMW")}</th><th class="r">${t("nowMW")}</th><th class="r">${t("availPct")}</th><th class="c">${ic("bell","sm")}</th><th class="c">${t("healthSc")}</th></tr></thead><tbody>
      ${P.ss.map(s=>{const L0=LIVE.st[s.id]; const n=ALARMS.filter(a=>a.st===s.id&&!a.cleared).length; return `<tr class="click" data-go="station" data-p="${s.id}"><td><span class="row" style="gap:8px"><span class="dot ${stStatus(s)}"></span>${esc(stName(s))}</span></td><td class="r num">${capLabel(s)}</td><td class="r num">${s.notOper?"—":nf(L0.p,1)}</td><td class="r num">${L0.avail==null?"—":nf(L0.avail,1)}</td><td class="c num ${n?"c-crit":""}">${n}</td><td class="c">${healthChip(healthScore(s))}</td></tr>`;}).join("")}</tbody></table>`;
    const card=(type)=>{ const arr=P.ss.filter(s=>type==="wind"?s.type==="wind":s.type!=="wind"); if(!arr.length) return ""; const live=arr.filter(s=>!s.notOper); const p=arr.reduce((a,s)=>a+LIVE.st[s.id].p,0), cap=arr.reduce((a,s)=>a+s.cap,0), e=arr.reduce((a,s)=>a+LIVE.st[s.id].e,0), pl=arr.reduce((a,s)=>a+s.plan,0), m=arr.reduce((a,s)=>a+(s.plan?LIVE.st[s.id].mtd+LIVE.st[s.id].e:0),0); const cl=live.reduce((a,s)=>a+s.cap,0); const av=cl?live.reduce((a,s)=>a+LIVE.st[s.id].avail*s.cap,0)/cl:null;
      const res = type==="wind"? [t("avgWind"), live.length? nf(live.reduce((a,s)=>a+LIVE.st[s.id].v,0)/live.length,1)+" m/s":"—"] : [t("irr"), live.length? nf(live.reduce((a,s)=>a+LIVE.st[s.id].g,0)/live.length,0)+" W/m²":"—"];
      return `<div class="asset-c"><h4><span class="sw" style="background:var(--${type==="wind"?"wind":"solar"})"></span>${t(type==="wind"?"windP":"solarP")} <span class="muted" style="font-weight:400;font-size:12px">· ${arr.length} ${t("stCount")}</span></h4>
        <div class="kv"><span>${t("pNow")}</span><b>${nf(p,1)} / ${nf(cap,1)} MW</b></div><div class="kv"><span>${res[0]}</span><b>${res[1]}</b></div><div class="kv"><span>${t("eToday")}</span><b>${nf(e,1)} MWh</b></div><div class="kv"><span>${t("monthPlan")}</span><b>${nf(pl?100*m/pl:0,1)} %</b></div><div class="kv"><span>${t("avail")}</span><b>${av==null?"—":nf(av,1)+" %"}</b></div></div>`; };
    $("#ovA").innerHTML=card("wind")+card("solar");
    const vt=P.eth? 100*(P.e-P.eth)/P.eth:0;
    $("#ovS").innerHTML=`<div><div class="kpi-l">${t("vsTheory")}</div><div class="kpi-v ${vt<0?"c-crit":"c-ok"}">${vt>0?"+":""}${nf(vt,1)}<small>%</small></div></div><div><div class="kpi-l">${t("eToday")}</div><div class="kpi-v" style="font-size:22px">${nf(P.e,1)}<small>MWh</small></div></div><div><div class="kpi-l">${t("theoryE")}</div><div class="kpi-v" style="font-size:22px">${nf(P.eth,1)}<small>MWh</small></div></div><div><div class="kpi-l">${t("yestE")}</div><div class="kpi-v" style="font-size:22px">${nf(P.yday,1)}<small>MWh</small></div></div>`;
    map.update(); setTitle(t("overview"), subClock("sub_overview"));
  }
  $("#ovTab").onclick=e=>{ const b=e.target.closest("button"); if(!b) return; tab=b.dataset.k; $$("#ovTab button").forEach(x=>x.setAttribute("aria-pressed",x===b)); drawChart(); };
  upd(); drawChart(); let k=0; PAGE_UPD=()=>{ upd(); if(++k%15===0) drawChart(); };
};

// ---------- Station page ----------
function unitDerived(s, u, i){
  const now=Date.now(), seed=i*13+s.seed; const r=x=>hsh(seed*7+x);
  if(s.type==="wind"){ const v=u.v??0, p=u.p; const run=p>0; const rpm=run? clamp(4.2+0.7*v,0,11.8) : (u.st==="comm"?null:0.3); const pitch= u.st==="fault"||u.st==="stop"||u.st==="maint"? 88 : run? (v>11.2? (v-11.2)*2.4+1 : 0.4+(u.st==="limit"?6:0)) : 2; const amb=ambAt(s,now);
    return {rpm, pitch, yaw: run? 0.5+3*Math.abs(r(1))+(u.id==="WT09"&&s.id==="IAP2"?20:0) : 0, genT: amb+ (run? 22+28*p/u.r : 6)+3*r(2) + (s.id==="TTN"&&u.id==="WT15"?36:0), gbT: amb+(run?26+16*p/u.r:5)+2*r(3), nacT: amb+8+2*r(4), amb, eDay: LIVE.st[s.id].e/Math.max(1,s.n)*1000*(run?(1+0.15*r(5)):0.6) };
  } else { const g=LIVE.st[s.id].g, p=u.p; const run=p>0; const dcP= run? p/0.982 : 0; const dcV= g>20? (s.type==="solar"? 905+25*r(1) : 600+40*r(1)) : 0; const amb=ambAt(s,now);
    return {dcP, dcV, eff: run? 98.0+0.3*r(2) : null, igbt: amb+(run? 12+18*p/u.r : 1)+(u.id==="INV-07-3"?40:0), strI: run? (s.type==="solar"? 9.6 : 10.2)*g/1000*(1+0.03*r(4)) : 0, amb, g, eDay: LIVE.st[s.id].e/Math.max(1,s.n)*1000*(run?1+0.05*r(5):0.6) };
  }
}
function unitTile(s,u,i){ const st=u.st; const d=s.type==="wind"; const val= st==="comm"||u.p==null? "—" : nf(u.p*1000, d?0:1);
  const lab = d? u.id : (s.id==="VHO"? u.id.slice(4) : u.id.split("-").slice(-1)[0]);
  const sub = d? (st==="comm"? t("st_comm") : `${nf(u.v,1)} m/s`) : (st==="comm"? "—" : `${t("st_"+st)}`);
  return `<button class="tile ${d?"":"inv"} s-${st}" data-unit="${u.id}" title="${u.id} · ${t("st_"+st)}"><div class="tn"><span>${lab}</span><span class="c-${ST_CLS[st]}">${ic(ST_IC[st],"sm")}</span></div><div class="tv">${val}<small>kW</small></div><div class="ts">${sub}</div><div class="bar"><i style="width:${u.p? clamp(100*u.p/u.r,0,100):0}%;background:var(--${ST_CLS[st]==="curt"?"curt":ST_CLS[st]==="ok"?"fill":ST_CLS[st]})"></i></div></button>`; }
PAGES.station=(el,id)=>{
  const s=ST[id]; const isW=s.type==="wind"; let filterQ="";
  const head=()=>{ setTitle(L(s.full), `${s.model} · ${L(s.prov)}${s.old?" ("+t("formerly",{p:L(s.old)})+")":""} · ${fmtTime(new Date())}`); };
  head();
  el.innerHTML=`<div class="st-head"><div class="between" style="flex-wrap:wrap"><div class="meta"><span class="tag">${s.code}</span><span>${L(s.prov)}</span><span class="sep"></span><span>${s.model}</span><span class="sep"></span><span>SCADA ${s.scada}</span><span class="sep"></span><span>PPC ${s.ppc}</span><span class="sep"></span><span class="mono">${s.gw}</span><span class="sep"></span><span>COD ${s.cod}</span></div><span class="live" id="stLive"></span></div>
    ${s.pset?`<div class="banner">${ic("gauge","c-curt")}<b>${t("curtBanner")}</b><span>${t("curtBannerS",{p:nf(s.pset,1),t:"10:00 "+fmtDate(new Date())})}</span>${can("analytics")?`<button class="link" style="margin-left:auto" data-go="curtail">${t("curtail")} →</button>`:""}</div>`:""}
    ${s.notOper?`<div class="banner off">${ic("wifiOff")}<b>${t("notOper")}</b><span>${t("notOperS")}</span></div>`:""}</div>
  <div class="grid g-kpi4" id="stK"></div>
  <div class="grid g-st">
    <div class="grid" style="gap:14px;min-width:0">
      <div class="panel"><div class="ph"><h3>${t("twin3d")}</h3><span class="sub">${t("twin3dS")}</span></div><div class="pb flush" style="padding-top:10px"><div class="twin-w" id="st3d"><div class="twin-load">${t("loading3d")}</div></div></div></div>
      <div class="panel"><div class="ph"><h3>${t(isW?"turbines":"inverters")}</h3><span class="sub">${t("lastValid")}</span>${s.id==="LXS"||s.id==="VHO"?`<span class="act"><div class="inp" style="height:30px;width:180px">${ic("search","sm")}<input id="uq" placeholder="INV-…" aria-label="Filter"></div></span>`:""}</div><div class="pb"><div class="st-bar" id="stBar"></div><div class="tgrid" id="stG" style="margin-top:12px"></div></div></div>
    </div>
    <div class="grid" style="gap:14px;align-content:start;min-width:0">
      <div class="panel"><div class="ph"><h3>${t("hourly")}</h3><span class="sub">${t("blankFut")}</span></div><div class="pb"><div class="chart" id="stC" style="height:300px"></div></div></div>
      <div class="panel"><div class="ph"><h3>${t("activeAl")}</h3><span class="sub" id="stAlN"></span><span class="act">${can("alarm")?`<button class="btn sm" data-go="alarms">${t("toAlarms")}</button>`:""}</span></div><div class="pb flush tw" id="stAl"></div></div>
    </div>
  </div>`;
  const ch=mkChart($("#stC"),{});
  function drawChart(){ if(!ch) return; const L0=LIVE.st[s.id]; const cur=Math.floor(localH(Date.now())); const hx=[...Array(24).keys()].map(h=>String(h).padStart(2,"0")+":00");
    ch.setOption({legend:{data:[t("actE"),t("thE"),isW?t("windSpd"):t("irr")]},grid:{left:40,right:44,top:34,bottom:28},xAxis:axisX(hx,{axisLabel:{interval:2,color:css("--muted"),fontSize:11}}),
      yAxis:[axisY("MWh"),axisY(isW?"m/s":"W/m²",{splitLine:{show:false},nameTextStyle:{color:css("--muted"),fontSize:11,padding:[0,-20,0,0]}})],
      series:[{name:t("actE"),type:"bar",data:L0.hrs.map((x,h)=>h<=cur?+x.e.toFixed(2):null),itemStyle:{color:isW?css("--wind"):css("--solar"),borderRadius:[3,3,0,0]},barWidth:"55%"},
        {name:t("thE"),type:"scatter",symbol:"rect",symbolSize:[12,2],data:L0.hrs.map((x,h)=>h<=cur?+x.th.toFixed(2):null),itemStyle:{color:css("--text-2")}},
        {name:isW?t("windSpd"):t("irr"),type:"line",yAxisIndex:1,smooth:.35,showSymbol:false,data:L0.hrs.map((x,h)=>h<=cur?+x.w.toFixed(isW?2:0):null),lineStyle:{width:2,color:css("--accent")},itemStyle:{color:css("--accent")}}]},true); }
  function upd(){ const L0=LIVE.st[s.id]; head(); const hrs=(Date.now()-dayStart(Date.now()))/HOUR; const loss=Math.max(0,L0.eth-L0.e);
    $("#stLive").innerHTML= s.notOper? `<span class="chip bg-off">${t("st_comm")}</span>` : `<i></i>${t("updated",{t:fmtTime(new Date()),s:L0.updAgo})}`;
    const pct=s.notOper?0:100*L0.p/acCap(s);
    const tiles = isW? [
      kpi("zap","",t("pNow"), s.notOper?"—":nf(L0.p,2),"MW", `${nf(pct,1)} % / ${nf(s.cap,2)} MW`, `<div class="bar"><i style="width:${pct}%"></i></div>`),
      kpi("wind","bg-wind",t("windNow"), s.notOper?"—":nf(L0.v,2),"m/s", s.notOper?"—":t("windSrc")+` · ${Math.round(L0.dir)}°`),
      kpi("sun","bg-solar",t("eDay"), s.notOper?"—":nf(L0.e,1),"MWh", s.notOper?"—":t("theoryX",{e:nf(L0.eth,1)})),
      kpi("down","bg-crit",t("eLoss"), s.notOper?"—":nf(loss,1),"MWh", s.notOper?"—":t("lossPct",{p:nf(L0.eth?100*loss/L0.eth:0,1)})),
      kpi("gauge","bg-maint",t("cf"), s.notOper?"—":nf(cfToday(s),1),"%", t("since0")),
      kpi("okc","bg-ok",t("availIEC"), L0.avail==null?"—":nf(L0.avail,2),"%", "IEC 61400-26 (T)"),
      kpi("clock","bg-wind",t("eqHours"), s.notOper?"—":nf(L0.e/s.cap,2),"h", t("today")),
      kpi("plug","bg-solar",t("aux"), s.notOper?"—":nf(L0.aux,2),"%", t("auxS")) ] : [
      kpi("zap","",t("pNow"), nf(L0.p,2),"MW", `${nf(pct,1)} % / ${nf(acCap(s),2)} MWac · ${nf(s.capDC,3)} MWp`, `<div class="bar"><i style="width:${pct}%"></i></div>`),
      kpi("sun","bg-solar",t("poa"), nf(L0.g,0),"W/m²", t("weatherSt",{w:s.wx})),
      kpi("sun","bg-solar",t("eDay"), nf(L0.e,1),"MWh", t("theoryX",{e:nf(L0.eth,1)})),
      kpi("down","bg-crit",t("eLoss"), nf(loss,1),"MWh", t("lossPct",{p:nf(L0.eth?100*loss/L0.eth:0,1)})),
      kpi("gauge","bg-maint",t("cf"), nf(cfToday(s),1),"%", t("since0")),
      kpi("okc","bg-ok",t("availIEC"), nf(L0.avail,2),"%", "IEC 61724 (T)"),
      kpi("clock","bg-wind",t("eqHours"), nf(L0.e/s.capDC,2),"h", t("today")),
      kpi("thermo","bg-warn",t("modT"), nf(L0.tm,1),"°C", `${t("ambT")} ${nf(L0.amb,1)} °C`) ];
    $("#stK").innerHTML=tiles.join("");
    const units=L0.units; const cnt={}; units.forEach(u=>cnt[u.st]=(cnt[u.st]||0)+1);
    $("#stBar").innerHTML=["run","limit","stop","fault","maint","comm"].filter(k=>cnt[k]).map(k=>`<span class="sb-it bg-${ST_CLS[k]}" style="${k==="run"?"flex:"+cnt[k]:""}">${ic(ST_IC[k],"sm")}${t("st_"+k)} <b class="num" style="font-size:14px">${cnt[k]}</b></span>`).join("");
    const q=filterQ.toLowerCase();
    $("#stG").innerHTML=s.feeders.map(([f,ids])=>{ const us=ids.map(id=>units.find(u=>u.id===id)).filter(u=>!q||u.id.toLowerCase().includes(q)); if(!us.length) return ""; return `<div class="feeder"><h5>${isW?t("feeder",{n:f}):s.id==="VHO"?t("block",{n:f}):t("roof",{n:f})}</h5><div class="tiles ${isW?"":"inv"}">${us.map(u=>unitTile(s,u,units.indexOf(u))).join("")}</div></div>`; }).join("");
    const al=ALARMS.filter(a=>a.st===s.id&&!a.cleared).sort((a,b)=>a.sev-b.sev||b.t-a.t); $("#stAlN").textContent=al.length;
    $("#stAl").innerHTML= al.length? `<table class="t"><thead><tr><th>${t("level")}</th><th>${t("device")}</th><th>${t("desc")}</th><th>${t("start")}</th><th>${t("ack")}</th></tr></thead><tbody>${al.map(a=>alarmRow(a,true)).join("")}</tbody></table>` : `<div class="empty">${ic("okc","i")}<span>—</span></div>`;
    S.scenes.forEach(sc=>sc.update&&sc.update());
  }
  $("#stG").onclick=e=>{ const b=e.target.closest("[data-unit]"); if(b) openUnit(s.id,b.dataset.unit); };
  $("#uq") && ($("#uq").oninput=e=>{ filterQ=e.target.value; upd(); });
  bindAck($("#stAl"), ()=>upd());
  upd(); drawChart(); let k=0; PAGE_UPD=()=>{ upd(); if(++k%30===0) drawChart(); };
  THREE3D.station($("#st3d"), s).then(sc=>{ if(sc){ if(S.page!=="station"||S.param!==id){ sc.dispose(); return; } S.scenes.push(sc); sc.onPick=uid=>openUnit(s.id,uid); } });
};
function alarmRow(a, compact){ const ackCell = a.acked? `<span class="muted">${esc(a.ackBy)}</span>` : (can("ack")? `<button class="btn sm" data-ack="${a.id}">${t("ack")}</button>` : `<span class="c-crit" title="${t("noPermAck")}">${t("unacked")}</span>`);
  return `<tr><td>${sevChip(a.sev)}</td>${compact?"":`<td>${esc(stName(ST[a.st]))}</td>`}<td class="mono">${esc(a.dev)}</td><td style="white-space:normal;min-width:200px">${esc(alarmText(a))}</td><td class="num">${fmtDT(new Date(a.t))}</td>${compact?"":`<td class="num">${a.cleared?fmtDT(new Date(a.clrT)):`<span class="chip bg-crit">${t("active")}</span>`}</td>`}<td>${ackCell}</td></tr>`; }
function bindAck(root, after){ root.addEventListener("click",e=>{ const b=e.target.closest("[data-ack]"); if(!b) return; const a=ALARMS.find(x=>x.id===+b.dataset.ack); if(!a) return; if(!can("ack")){ toast(t("noPermAck"),"","warn"); audit("a_ack",a.dev,"denied"); return; } a.acked=true; a.ackBy=S.user.u; a.ackT=Date.now(); audit("a_ack",`${a.st} · ${a.dev}`,"ok"); toast(t("ackDone",{d:`${a.st} · ${a.dev}`}),alarmText(a),"ok"); after&&after(); renderShell(); }); }

// ---------- Unit drawer ----------
let DRAWER=null;
function closeDrawer(){ if(DRAWER){ DRAWER.sc&&DRAWER.sc.dispose(); clearInterval(DRAWER.iv); DRAWER.ch&&DRAWER.ch.dispose(); } DRAWER=null; $("#drawerHost").innerHTML=""; }
function openUnit(stId, uid){
  closeDrawer(); const s=ST[stId]; const isW=s.type==="wind"; const host=$("#drawerHost");
  host.innerHTML=`<div class="scrim" id="drS"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${uid}"><div class="dr-h">${ic(isW?"turbine":"panel","lg")}<div style="flex:1;min-width:0"><h3>${uid}</h3><div class="muted" style="font-size:12px">${esc(L(s.full))} · ${t(isW?"tDetail":"iDetail")}</div></div><span id="drSt"></span><button class="ibtn" id="drX" aria-label="${t("close")}">${ic("x")}</button></div>
    <div class="dr-b"><div class="dr-3d" id="dr3d"><div class="twin-load">${t("loading3d")}</div></div><div class="mgrid" id="drM"></div><dl class="dl" id="drI"></dl><div class="panel"><div class="ph"><h3>${t("todayP")}</h3></div><div class="pb"><div class="chart sm" id="drC"></div></div></div>
    ${can("station")?`<button class="btn" id="drTwin">${ic("cube","sm")} ${t("openTwin")}</button>`:""}</div></aside>`;
  $("#drS").onclick=closeDrawer; $("#drX").onclick=closeDrawer; $("#drTwin") && ($("#drTwin").onclick=()=>{ const p=stId+":"+uid; closeDrawer(); go("twin",p); });
  DRAWER={};
  const idx=s.units.findIndex(u=>u.id===uid); const k=idx+1;
  function upd(){ const u=LIVE.st[s.id].units[idx]; const d=unitDerived(s,u,idx); const st=u.st;
    $("#drSt").innerHTML=`<span class="chip bg-${ST_CLS[st]}">${ic(ST_IC[st],"sm")} ${t("st_"+st)}</span>`;
    const m=(i,l,v,un)=>`<div class="m"><span>${ic(i,"sm")}${l}</span><b>${v}<small>${un}</small></b></div>`; const na=st==="comm";
    $("#drM").innerHTML= isW? [m("zap",t("power"),na?"—":nf(u.p*1000,0),"kW"),m("wind",t("windSpd"),na?"—":nf(u.v,1),"m/s"),m("rot",t("rotor"),na||d.rpm==null?"—":nf(d.rpm,1),"rpm"),m("sliders",t("pitch"),na?"—":nf(d.pitch,1),"°"),m("map",t("yawErr"),na?"—":nf(d.yaw,1),"°"),m("thermo",t("genT"),na?"—":nf(d.genT,1),"°C"),m("thermo",t("gbT"),na?"—":nf(d.gbT,1),"°C"),m("thermo",t("nacT"),na?"—":nf(d.nacT,1),"°C"),m("sun",t("dayE"),na?"—":nf(d.eDay,0),"kWh")].join("")
      : [m("zap",t("acP"),na?"—":nf(u.p*1000,1),"kW"),m("zap",t("dcP"),na?"—":nf(d.dcP*1000,1),"kW"),m("plug",t("dcV"),na?"—":nf(d.dcV,0),"V"),m("gauge",t("eff"),na||d.eff==null?"—":nf(d.eff,2),"%"),m("thermo",t("igbt"),na?"—":nf(d.igbt,1),"°C"),m("sun",t("irr"),nf(d.g,0),"W/m²"),m("limit",t("strI"),na?"—":nf(d.strI,2),"A"),m("thermo",t("ambT"),nf(d.amb,1),"°C"),m("sun",t("dayE"),na?"—":nf(d.eDay,0),"kWh")].join("");
    const f=s.feeders.find(([,ids])=>ids.includes(uid))[0];
    const model = s.modelOf? s.modelOf(uid) : s.model.split(" / ")[0];
    $("#drI").innerHTML=`<dt>${t("station")}</dt><dd>${esc(stName(s))}</dd><dt>${isW?t("feeder",{n:""}).trim():s.id==="VHO"?t("block",{n:""}).trim():t("roof",{n:""}).trim()}</dt><dd>${f}</dd><dt>${t("model")}</dt><dd>${esc(model)} · ${nf(unitRated(s,uid)*1000,0)} kW</dd><dt>${t("quality")}</dt><dd class="${na?"c-crit":"c-ok"}">${na?"BAD · >300 s":"GOOD"}</dd><dt>${t("monthAvail")}</dt><dd>${nf(clamp(98.9+hsh(k*7)*0.9-(st==="fault"?3.1:0),90,99.9),2)} %</dd>${isW?`<dt>${t("ambT")}</dt><dd>${nf(d.amb,1)} °C</dd>`:""}<dt>${t("lastUpd")}</dt><dd>${fmtTime(new Date())}</dd>`;
  }
  upd(); DRAWER.iv=setInterval(()=>{ if(!$("#drM")) return; upd(); },2000);
  // today chart for unit
  if(window.echarts){ const el=$("#drC"); const c=echarts.init(el); DRAWER.ch=c; const d0=dayStart(Date.now()); const xs=[],p=[],w=[]; const r=unitRated(s,uid); const st=unitState(s,uid);
    for(let tt=d0; tt<=Date.now(); tt+=600e3){ xs.push(fmtTime(new Date(tt),false)); if(isW){ const v=windAt(s,tt,k); w.push(+v.toFixed(2)); p.push(st==="comm"||s.notOper?null:+(pcurve(v,r)*1000*(st==="run"||st==="limit"||tt<Date.now()-3*HOUR?1:0)).toFixed(0)); } else { const g=irrAt(s,tt); w.push(+g.toFixed(0)); const sh=Math.min(acCap(s),g/1000*s.capDC*0.86)/s.n; p.push(st==="comm"?null:+(Math.min(r,sh)*1000*(st==="fault"&&tt>Date.now()-0.5*HOUR?0:1)).toFixed(1)); } }
    c.setOption(Object.assign(chartBase(),{grid:{left:44,right:40,top:30,bottom:24},legend:{data:["P",isW?t("windSpd"):t("irr")]},xAxis:axisX(xs,{axisLabel:{interval:23,color:css("--muted"),fontSize:10.5}}),yAxis:[axisY("kW"),axisY(isW?"m/s":"W/m²",{splitLine:{show:false}})],
      series:[{name:"P",type:"line",data:p,showSymbol:false,lineStyle:{width:1.6,color:isW?css("--wind"):css("--solar")},itemStyle:{color:isW?css("--wind"):css("--solar")},areaStyle:{opacity:.12}},{name:isW?t("windSpd"):t("irr"),type:"line",yAxisIndex:1,data:w,showSymbol:false,lineStyle:{width:1.2,color:css("--accent")},itemStyle:{color:css("--accent")}}]}));
    const ro=new ResizeObserver(()=>c.resize()); ro.observe(el); }
  THREE3D.unit($("#dr3d"), s, uid, idx).then(sc=>{ if(!sc) return; if(!DRAWER||!$("#dr3d")){ sc.dispose(); return; } DRAWER.sc=sc; });
}

// ---------- Alarms page ----------
PAGES.alarms=(el)=>{
  setTitle(t("alarms"), t("sub_alarms")); const F={sev:"all",st:"all",ack:"all",q:""};
  el.innerHTML=`<div class="between" style="flex-wrap:wrap"><div class="seg" id="alTab">${[["active","active"],["history","history"],["stats","stats"]].map(([k,l])=>`<button data-k="${k}" aria-pressed="${S.alarmTab===k}">${t(l)}</button>`).join("")}</div><div class="faint" style="font-size:11.5px;max-width:70ch">${ic("info","sm")} ${t("flood")}</div></div>
  <div class="fbar" id="alF"><select class="sel" id="fSev"><option value="all">${t("allSev")}</option>${[1,2,3,4].map(i=>`<option value="${i}">${t("p"+i)}</option>`).join("")}</select>${stSelect("all","fSt")}<select class="sel" id="fAck"><option value="all">${t("allState")}</option><option value="no">${t("unacked")}</option><option value="yes">${t("acked")}</option></select><div class="inp" style="height:32px;flex:1;min-width:160px;max-width:320px">${ic("search","sm")}<input id="fQ" placeholder="${t("search")}"></div><span class="act" style="margin-left:auto"><button class="btn sm" id="alX">${ic("dl","sm")} ${t("excel")}</button></span></div>
  <div class="panel"><div class="pb flush tw" id="alT" style="max-height:calc(100vh - 260px)"></div></div>`;
  function rows(){ const hist=S.alarmTab==="history"; return ALARMS.filter(a=>inScope(a.st) && (hist? a.cleared : !a.cleared) && (F.sev==="all"||a.sev===+F.sev) && (F.st==="all"||a.st===F.st) && (F.ack==="all"||(F.ack==="yes")===a.acked) && (!F.q || (alarmText(a)+a.dev).toLowerCase().includes(F.q))).sort((a,b)=> hist? b.t-a.t : a.sev-b.sev||b.t-a.t); }
  function render(){ $("#alF").hidden = S.alarmTab==="stats";
    if(S.alarmTab==="stats"){ $("#alT").innerHTML=`<div class="grid g2" style="padding:14px"><div><h3 style="margin:0 0 8px;font-size:13px">${t("byStation")}</h3><div class="chart" id="alC"></div></div><div><h3 style="margin:0 0 8px;font-size:13px">${t("devRank")}</h3><div class="chart" id="alC2"></div></div></div>`; teardownCharts();
      const ids=scopeIds(); const c=mkChart($("#alC"),{}); const all=ALARMS.filter(a=>inScope(a.st));
      c&&c.setOption({legend:{data:[1,2,3,4].map(i=>t("p"+i))},xAxis:axisX(ids),yAxis:axisY(""),series:[1,2,3,4].map(i=>({name:t("p"+i),type:"bar",stack:"a",barWidth:"50%",data:ids.map(id=>all.filter(a=>a.st===id&&a.sev===i).length),itemStyle:{color:[0,css("--crit"),css("--warn"),css("--solar"),css("--accent")][i]}}))});
      const cnt={}; all.forEach(a=>{const k=a.st+" "+a.dev; cnt[k]=(cnt[k]||0)+1;}); const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,12).reverse(); const c2=mkChart($("#alC2"),{});
      c2&&c2.setOption({grid:{left:120,right:20,top:10,bottom:24},tooltip:{trigger:"axis"},xAxis:axisY(""),yAxis:axisX(top.map(x=>x[0])),series:[{type:"bar",data:top.map(x=>x[1]),itemStyle:{color:css("--accent"),borderRadius:[0,3,3,0]},barWidth:"55%"}]}); return; }
    const r=rows(); $("#alT").innerHTML= r.length? `<table class="t"><thead><tr><th>${t("level")}</th><th>${t("station")}</th><th>${t("device")}</th><th>${t("desc")}</th><th>${t("start")}</th><th>${t("state")}</th><th>${t("ackBy")}</th></tr></thead><tbody>${r.slice(0,300).map(a=>alarmRow(a,false)).join("")}</tbody></table>` : `<div class="empty">${ic("okc","i")}<span>${t("noResult")}</span></div>`; }
  function teardownCharts(){ S.charts.forEach(c=>c.dispose()); S.charts=[]; }
  $("#alTab").onclick=e=>{ const b=e.target.closest("button"); if(!b) return; S.alarmTab=b.dataset.k; $$("#alTab button").forEach(x=>x.setAttribute("aria-pressed",x===b)); teardownCharts(); render(); };
  $("#fSev").onchange=e=>{F.sev=e.target.value;render();}; $("#fSt").onchange=e=>{F.st=e.target.value;render();}; $("#fAck").onchange=e=>{F.ack=e.target.value;render();}; $("#fQ").oninput=e=>{F.q=e.target.value.toLowerCase();render();};
  $("#alX").onclick=()=>exportCSV("alarms",[["Level","Station","Device","Description","Start","Cleared","AckBy"],...rows().map(a=>[t("p"+a.sev),a.st,a.dev,alarmText(a),fmtDT(new Date(a.t)),a.cleared?fmtDT(new Date(a.clrT)):"",a.ackBy||""])]);
  bindAck($("#alT"), render); render(); PAGE_UPD=()=>{ if(S.alarmTab==="active") render(); };
};

// ---------- Digital twin page ----------
const COMP_W=[["blades","blades"],["hubPitch","hubPitch"],["mainBear","mainBear"],["gearbox","gearbox"],["generator","generator"],["converter","converter"],["yaw","yaw"],["tower","tower"]];
const COMP_S=[["pvArr","pvArr"],["dcIn","dcIn"],["igbtMod","igbtMod"],["fans","fans"],["acOut","acOut"],["cabinet","cabinet"]];
const ALARM_COMP={pitchBat:"hubPitch",convF:"converter",genBear:"generator",yawErr:"yaw",gbOil:"gearbox",vibHi:"tower",underPerf:"blades",igbtHi:"igbtMod",strLow:"dcIn",ovGrid:"acOut",invFault:"dcIn",ambDer:"fans",stale:"converter"};
function compHealth(s, uid){ const isW=s.type==="wind"; const list=isW?COMP_W:COMP_S; const k=s.units.findIndex(u=>u.id===uid)+1; const out={};
  list.forEach(([c],i)=>{ const h=clamp(93+6*hsh(k*31+i*7+s.seed),70,99.5); out[c]={h, lvl:"good"}; });
  ALARMS.filter(a=>a.st===s.id&&a.dev===uid&&!a.cleared).forEach(a=>{ const c=ALARM_COMP[a.key]; if(c&&out[c]){ out[c].lvl=a.sev<=2?"bad":"watch"; out[c].h=a.sev<=2? 48+10*Math.abs(hsh(k)) : 74+6*Math.abs(hsh(k+1)); out[c].al=a; } });
  if(unitState(s,uid)==="maint"){ const c=isW?"gearbox":"fans"; out[c].lvl="watch"; out[c].h=78; }
  return out; }
PAGES.twin=(el,param)=>{
  setTitle(t("twin"), t("sub_twin")); let [sid,uid]=(param||"").split(":"); if(!sid||!inScope(sid)) sid=scopeIds().find(i=>!ST[i].notOper)||scopeIds()[0]; let s=ST[sid]; if(!uid||!s.units.find(u=>u.id===uid)) uid=(s.id==="TTN"?"WT15":s.id==="IAP1"?"WT21":s.id==="VHO"?"INV-07-3":s.id==="DKH"?"WT07":s.units[0].id);
  let sel=null, scene=null;
  el.innerHTML=`<div class="grid g-twin">
    <div class="panel"><div class="ph"><h3>${t("selEq")}</h3></div><div class="pb" style="padding-bottom:8px;flex:none">${stSelect(sid,"twSt","none")}</div><div class="eq-list" id="twL"></div></div>
    <div class="twin-big" id="tw3d"><div class="twin-load">${t("loading3d")}</div></div>
    <div class="grid twin-info" style="gap:14px;align-content:start"><div class="panel"><div class="ph"><h3 id="twT"></h3><span class="act" id="twSt2"></span></div><div class="pb"><div class="mgrid" id="twM" style="grid-template-columns:repeat(2,minmax(0,1fr))"></div></div></div>
    <div class="panel"><div class="ph"><h3>${t("components")}</h3><span class="sub">${t("hIdx")}</span></div><div class="pb"><div class="comp-list" id="twC"></div></div></div>
    <div class="faint" style="font-size:11.5px">${ic("info","sm")} ${t("twinNote")}</div></div></div>`;
  $("#twSt").innerHTML=scopeIds().map(i=>`<option value="${i}" ${i===sid?"selected":""}>${esc(stName(ST[i]))}</option>`).join("");
  function list(){ $("#twL").innerHTML=s.feeders.map(([f,ids])=>`<div class="grp">${s.type==="wind"?t("feeder",{n:f}):s.id==="VHO"?t("block",{n:f}):t("roof",{n:f})}</div>`+ids.map(id=>{ const st=unitState(s,id); return `<button data-u="${id}" class="${id===uid?"on":""}"><span class="dot ${ST_CLS[st]==="curt"?"ok":ST_CLS[st]==="maint"?"warn":ST_CLS[st]}"></span>${id}<span class="faint" style="margin-left:auto;font-size:11px">${t("st_"+st)}</span></button>`; }).join("")).join(""); }
  function info(){ const idx=s.units.findIndex(u=>u.id===uid); const u=LIVE.st[s.id].units[idx]; const d=unitDerived(s,u,idx); const na=u.st==="comm"; const isW=s.type==="wind";
    $("#twT").textContent=`${uid} · ${stName(s)}`; $("#twSt2").innerHTML=`<span class="chip bg-${ST_CLS[u.st]}">${t("st_"+u.st)}</span>`;
    const m=(l,v,un)=>`<div class="m"><span>${l}</span><b>${v}<small>${un}</small></b></div>`;
    $("#twM").innerHTML= isW? [m(t("power"),na?"—":nf(u.p*1000,0),"kW"),m(t("windSpd"),na?"—":nf(u.v,1),"m/s"),m(t("rotor"),na||d.rpm==null?"—":nf(d.rpm,1),"rpm"),m(t("pitch"),na?"—":nf(d.pitch,1),"°"),m(t("genT"),na?"—":nf(d.genT,1),"°C"),m(t("gbT"),na?"—":nf(d.gbT,1),"°C")].join("")
      : [m(t("acP"),na?"—":nf(u.p*1000,1),"kW"),m(t("dcV"),na?"—":nf(d.dcV,0),"V"),m(t("eff"),na||d.eff==null?"—":nf(d.eff,2),"%"),m(t("igbt"),na?"—":nf(d.igbt,1),"°C"),m(t("irr"),nf(d.g,0),"W/m²"),m(t("strI"),na?"—":nf(d.strI,2),"A")].join("");
    const H=compHealth(s,uid); const lst=s.type==="wind"?COMP_W:COMP_S;
    $("#twC").innerHTML=lst.map(([c,l])=>{ const x=H[c]; const cls=x.lvl==="bad"?"crit":x.lvl==="watch"?"warn":"ok"; return `<button class="comp ${sel===c?"on":""}" data-c="${c}"><span class="dot ${cls}"></span><span>${t(l)}${x.al?`<div class="faint" style="font-size:11px;white-space:normal">${esc(alarmText(x.al))}</div>`:""}</span><span class="num c-${cls}" style="font-size:15px;font-weight:600">${nf(x.h,0)}</span><span class="chip bg-${cls}">${t(x.lvl)}</span></button>`; }).join("");
    scene&&scene.setHealth&&scene.setHealth(H);
  }
  async function load3d(){ if(scene){ scene.dispose(); S.scenes=S.scenes.filter(x=>x!==scene); scene=null; } $("#tw3d").innerHTML=`<div class="twin-load">${t("loading3d")}</div>`; const idx=s.units.findIndex(u=>u.id===uid);
    const sc=await THREE3D.unit($("#tw3d"), s, uid, idx, {twin:true}); if(!sc) return; if(S.page!=="twin"){ sc.dispose(); return; } scene=sc; S.scenes.push(sc); sc.onComp=c=>{ sel=c; info(); }; info(); }
  $("#twSt").onchange=e=>{ sid=e.target.value; s=ST[sid]; uid=s.units[0].id; sel=null; list(); info(); load3d(); };
  $("#twL").onclick=e=>{ const b=e.target.closest("[data-u]"); if(!b) return; uid=b.dataset.u; sel=null; list(); info(); load3d(); };
  $("#twC").onclick=e=>{ const b=e.target.closest("[data-c]"); if(!b) return; sel=sel===b.dataset.c?null:b.dataset.c; info(); scene&&scene.focus&&scene.focus(sel); };
  list(); info(); load3d(); PAGE_UPD=()=>info();
};
