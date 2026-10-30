// ===================== Live motion: in-place DOM updates, number tweens, sparklines, power flow =====================
// Containers marked data-live keep their DOM between 2-second refreshes: assigning innerHTML patches only what
// changed (morph), so bars and arcs glide via CSS transitions, hover/focus survive, and numbers count to the new value.
const RM = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const LV_T = document.createElement("template");
const LV_KEYS = ["data-k","data-unit","data-ack","data-u","data-c","data-s","data-lang","data-p"];
const LV_TW = ".kpi-v,.num,.m b,.tv,.mini3 b,.lbl3d span,[data-tw],#alSum b,.badge,.fl-v";
const LV_FL = ".kpi-v,#alSum b,[data-flash]";
const LV_HTML = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
function lvKey(n){ for(const k of LV_KEYS){ const v=n.getAttribute(k); if(v!=null) return k+"="+v; } return n.id||""; }
function morph(el, html){ LV_T.innerHTML = html; lvKids(el, LV_T.content); }
function lvKids(a, b){ const an=[...a.childNodes], bn=[...b.childNodes];
  bn.forEach((y,i)=>{ const x=an[i];
    if(!x){ a.appendChild(y); return; }
    if(x.nodeType!==y.nodeType || x.nodeName!==y.nodeName || (x.nodeType===1 && lvKey(x)!==lvKey(y))){ a.replaceChild(y,x); return; }
    if(x.nodeType===3){ if(x.nodeValue!==y.nodeValue) lvText(x,y.nodeValue); return; }
    if(x.nodeType===1){ lvAttrs(x,y); lvKids(x,y); return; }
    if(x.nodeValue!==y.nodeValue) x.nodeValue=y.nodeValue; });
  for(let i=an.length-1;i>=bn.length;i--) an[i].remove(); }
function lvAttrs(x, y){
  for(const {name} of [...x.attributes]) if(!y.hasAttribute(name)) x.removeAttribute(name);
  for(const {name,value} of [...y.attributes]){
    if(name==="class"){ const keep=[...x.classList].filter(c=>c.startsWith("lv-")); const v=keep.length? value+" "+keep.join(" ") : value; if(x.getAttribute("class")!==v) x.setAttribute("class",v); continue; }
    if(x.getAttribute(name)!==value) x.setAttribute(name,value); } }
// number format of the current language: "1.234,5" (vi) · "1,234.5" (en/zh)
function lvSep(){ const d=nf(1.5,1).replace(/\d/g,""), g=nf(12345,0).replace(/\d/g,""); return {d, g}; }
function lvParse(s){ const m=/^(\D*?)([+\-−]?\d(?:[\d.,  ]*\d)?)(\D*)$/.exec(s); if(!m) return null; const {d,g}=lvSep(); let num=m[2];
  const dec= d && num.includes(d)? num.length-num.lastIndexOf(d)-1 : 0; if(g) num=num.split(g).join(""); num=num.replace(d,".").replace("−","-");
  const v=parseFloat(num); return isFinite(v)? {pre:m[1], v, d:dec, suf:m[3]} : null; }
function lvAnim(n, A, B, final, dur=650){ if(n._tw) cancelAnimationFrame(n._tw); const t0=performance.now();
  const step=now=>{ const k=Math.max(0,Math.min(1,(now-t0)/dur)), e=1-Math.pow(1-k,3); if(k<1){ n.nodeValue=B.pre+nf(A.v+(B.v-A.v)*e,B.d)+B.suf; n._tw=requestAnimationFrame(step); } else { n.nodeValue=final; n._tw=0; } };
  n._tw=requestAnimationFrame(step); }
function lvText(n, v){ const host=n.parentElement; if(n._tw){ cancelAnimationFrame(n._tw); n._tw=0; }
  if(RM()||document.hidden||!host||!host.closest(LV_TW)){ n.nodeValue=v; return; }
  const A=lvParse(n.nodeValue), B=lvParse(v);
  if(!A||!B||A.pre!==B.pre||A.suf!==B.suf||A.d!==B.d||A.v===B.v){ n.nodeValue=v; return; }
  const fh=host.closest(LV_FL); if(fh){ const rel=Math.abs(B.v-A.v)/Math.max(Math.abs(A.v),1e-9); if(B.d===0&&Math.abs(B.v-A.v)>=1 || rel>0.01) lvFlash(fh, B.v>A.v?"lv-up":"lv-dn"); }
  lvAnim(n, A, B, v); }
function lvFlash(el, c){ el.classList.remove("lv-up","lv-dn"); void el.offsetWidth; el.classList.add(c); clearTimeout(el._ft); el._ft=setTimeout(()=>el.classList.remove(c),1300); }
function liveEl(el){ if(!el||el._lv) return el; el._lv=1;
  Object.defineProperty(el,"innerHTML",{configurable:true, get(){ return LV_HTML.get.call(this); }, set(v){ if(!this.firstChild) LV_HTML.set.call(this,v); else morph(this,String(v)); }});
  return el; }
function liveify(root){ if(!root) return; root.querySelectorAll("[data-live]").forEach(liveEl); }
// count up from zero when a page opens
function lvIntro(root){ if(RM()||!root) return; root.querySelectorAll(".kpi-v,.mini3 b,.fl-v").forEach(h=>{ const w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT); let n;
  while((n=w.nextNode())){ const B=lvParse(n.nodeValue); if(B&&B.v!==0) lvAnim(n,{...B,v:0},B,n.nodeValue,900); } }); }
// heartbeat on every data refresh
function lvBeat(){ if(RM()) return; $$(".live i, .stbar i").forEach(i=>{ i.classList.remove("beat"); void i.offsetWidth; i.classList.add("beat"); }); }

// ---------- trends for sparklines ----------
const TRC={};
function trCache(key, ttl, fn){ const b=Math.floor(Date.now()/ttl); const c=TRC[key]; if(c&&c.b===b) return c.v; const v=fn(); TRC[key]={b,v}; return v; }
function trendP(ids, n=36){ const live=ids.filter(id=>!ST[id].notOper); if(!live.length) return [];
  const base=trCache("p:"+live.join(), 300e3, ()=>{ const t1=Math.floor(Date.now()/300e3)*300e3, out=[]; for(let i=n-1;i>=0;i--){ const tt=t1-i*300e3; out.push(live.reduce((a,id)=>a+stationPower(ST[id],tt).p,0)); } return out; });
  return [...base, live.reduce((a,id)=>a+LIVE.st[id].p,0)]; }
function trendHrs(ids, f){ const live=ids.filter(id=>!ST[id].notOper); if(!live.length) return []; const cur=Math.floor(localH(Date.now())); const out=[]; let acc=0;
  for(let h=0;h<=cur;h++){ if(f==="w"){ out.push(live.reduce((a,id)=>a+(LIVE.st[id].hrs[h].w||0),0)/live.length); }
    else { live.forEach(id=>{ const x=LIVE.st[id].hrs[h]; acc+= f==="e"? x.e : Math.max(0,x.th-x.e); }); out.push(acc); } }
  return out; }
function trendAl(ids){ return trCache("al:"+ids.join()+":"+ALARMS.length+":"+ALARMS.filter(a=>a.cleared).length, 60e3, ()=>{ const now=Date.now(), out=[];
  for(let i=12;i>=0;i--){ const tt=now-i*HOUR; out.push(ALARMS.filter(a=>ids.includes(a.st)&&a.t<=tt&&(!a.cleared||a.clrT>tt)).length); } return out; }); }
function spark(vals, color="var(--accent)", o={}){ const v=(vals||[]).filter(x=>x!=null&&isFinite(x)); if(v.length<2) return "";
  let lo=Math.min(...v), hi=Math.max(...v); if(o.zero) lo=Math.min(0,lo); if(hi-lo<1e-9){ hi=lo+1; lo=lo-1; }
  const n=vals.length, W=100, H=24; const pts=vals.map((x,i)=>x==null||!isFinite(x)?null:[i/(n-1)*W, H-2-(x-lo)/(hi-lo)*(H-5)]).filter(Boolean);
  const d="M"+pts.map(p=>p[0].toFixed(2)+" "+p[1].toFixed(2)).join("L"); const l=pts[pts.length-1];
  return `<div class="spark" style="color:${color}" title="${esc(o.title||"")}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="sa" d="${d}L${l[0].toFixed(2)} ${H}L${pts[0][0].toFixed(2)} ${H}Z"/><path class="sl" d="${d}"/></svg><i style="left:${l[0].toFixed(2)}%;top:${(l[1]/H*100).toFixed(1)}%"></i></div>`; }

// ---------- live power-flow diagram (plants → OCC → national grid) ----------
function flowSVG(P){ const ws=P.ss.filter(s=>s.type==="wind"), so=P.ss.filter(s=>s.type!=="wind");
  const pw=ws.reduce((a,s)=>a+LIVE.st[s.id].p,0), ps=so.reduce((a,s)=>a+LIVE.st[s.id].p,0), cw=ws.reduce((a,s)=>a+s.cap,0), cs=so.reduce((a,s)=>a+acCap(s),0);
  const tot=pw+ps, cap=Math.max(1,cw+cs);
  const lane=(id, d, p, c, col)=>{ const sh=c? p/c : 0; const w=(3+7*Math.min(1,p/cap*1.6)).toFixed(1); const sp=p<=0.05? 0 : [3.2,2.4,1.7,1.2,0.9][Math.min(4,Math.floor(sh*5))];
    return `<path d="${d}" class="fl-base" style="stroke-width:${w}"/>${sp?`<path d="${d}" class="fl-run" data-k="${id}" style="stroke:${col};stroke-width:${Math.max(3,+w-0.5)};animation-duration:${sp}s"/>`:""}`; };
  const node=(x,y,w,h,col,label,val,sub)=>`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="fl-node" style="stroke:${col}"/><rect x="${x}" y="${y}" width="3" height="${h}" style="fill:${col}"/>
    <text x="${x+12}" y="${y+16}" class="fl-l">${esc(label)}</text><text x="${x+12}" y="${y+35}" class="fl-v">${val}</text><text x="${x+w-8}" y="${y+35}" text-anchor="end" class="fl-s">${sub}</text></g>`;
  const pct=(p,c)=>c? nf(100*p/c,0)+"%" : "—";
  return `<svg class="flow" viewBox="0 0 460 128" role="img" aria-label="${t("powerFlow")}">
    ${cw?lane("w","M150 30 C 190 30, 190 64, 222 64",pw,cw,"var(--wind)"):""}${cs?lane("s","M150 98 C 190 98, 190 64, 222 64",ps,cs,"var(--solar)"):""}${lane("g","M246 64 L 316 64",tot,cap,"var(--accent)")}
    ${cw?node(4,8,146,44,"var(--wind)",t("windP"),nf(pw,1)+" MW",pct(pw,cw)):""}${cs?node(4,76,146,44,"var(--solar)",t("solarP"),nf(ps,1)+" MW",pct(ps,cs)):""}
    <rect x="222" y="22" width="24" height="84" rx="3" class="fl-bus"/><text x="234" y="16" text-anchor="middle" class="fl-s">OCC</text><text x="234" y="122" text-anchor="middle" class="fl-s">${t("lvTot")}</text>
    ${node(316,42,140,44,"var(--accent)",t("lvGrid"),nf(tot,1)+" MW",pct(tot,cap))}</svg>`; }

// ---------- alarm toast (severity colour, click to open, quick acknowledge) ----------
function alarmToast(a){ const k=a.sev===1?"crit":a.sev===2?"warn":"info";
  toast(t("newAlarm",{s:`${a.st} · ${a.dev}`}), alarmText(a), k, { ttl:a.sev<=2?9000:6000, sev:a.sev, onClick:()=>go("alarms"),
    action: can("ack")&&!a.acked? {label:t("ack"), fn:()=>{ a.acked=true; a.ackBy=S.user.u; a.ackT=Date.now(); audit("a_ack",`${a.st} · ${a.dev}`,"ok"); renderShell(); PAGE_UPD&&PAGE_UPD(); }} : null }); }
