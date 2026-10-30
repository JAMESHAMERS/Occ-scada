// ===================== GIS map (D3, WGS84 → Web Mercator) =====================
const PROV_ZH={"Hà Nội":"河内","Bắc Ninh":"北宁","Quảng Ninh":"广宁","Hải Phòng":"海防","Hưng Yên":"兴安","Ninh Bình":"宁平","Cao Bằng":"高平","Tuyên Quang":"宣光","Lào Cai":"老街","Thái Nguyên":"太原","Lạng Sơn":"谅山","Phú Thọ":"富寿","Điện Biên":"奠边","Lai Châu":"莱州","Sơn La":"山罗","Thanh Hóa":"清化","Nghệ An":"乂安","Hà Tĩnh":"河静","Quảng Trị":"广治","Huế":"顺化","Đà Nẵng":"岘港","Quảng Ngãi":"广义","Khánh Hòa":"庆和","Gia Lai":"嘉莱","Đắk Lắk":"多乐","Lâm Đồng":"林同","Tây Ninh":"西宁","Đồng Nai":"同奈","Hồ Chí Minh":"胡志明市","Vĩnh Long":"永隆","Đồng Tháp":"同塔","An Giang":"安江","Cần Thơ":"芹苴","Cà Mau":"金瓯"};
const NB_NAME={China:{vi:"Trung Quốc",en:"China",zh:"中国"},Laos:{vi:"Lào",en:"Laos",zh:"老挝"},Cambodia:{vi:"Campuchia",en:"Cambodia",zh:"柬埔寨"},Thailand:{vi:"Thái Lan",en:"Thailand",zh:"泰国"},Myanmar:{vi:"Myanmar",en:"Myanmar",zh:"缅甸"},Philippines:{vi:"Philippines",en:"Philippines",zh:"菲律宾"},Malaysia:{vi:"Malaysia",en:"Malaysia",zh:"马来西亚"}};
const NB_LBL={China:[107.5,23.2],Laos:[103.6,19.6],Cambodia:[104.9,12.6],Thailand:[101.6,15.4],Philippines:[121.0,15.2],Malaysia:[116.2,5.2]};
const ascii=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D");
const provName=n=> S.lang==="zh"? (PROV_ZH[n]||n) : S.lang==="en"? ascii(n) : n;
function dms(v,pos,neg){ const a=Math.abs(v), d=Math.floor(a), m=Math.floor((a-d)*60), s=((a-d)*60-m)*60; return `${d}°${String(m).padStart(2,"0")}′${s.toFixed(1).padStart(4,"0")}″${v>=0?pos:neg}`; }
const PRESETS={ all:[[102.0,7.4],[117.6,23.5]], high:[[106.9,10.7],[109.3,15.6]], north:[[105.5,20.8],[106.7,21.6]] };
const MAP2D={
  mount(el, opts={}){
    if(!window.d3||!window.GEO){ el.innerHTML=`<div class="empty">${ic("map","i")}<span>D3 CDN</span></div>`; return {update(){},destroy(){},focus(){}}; }
    const W=()=>el.clientWidth||600, H=()=>el.clientHeight||360; const mini=!!opts.mini, full=!!opts.full;
    el.innerHTML=""; const svg=d3.select(el).append("svg").attr("class","map").style("will-change","transform").attr("role","img").attr("aria-label",t("stMap"));
    const defs=svg.append("defs");
    const glow=defs.append("filter").attr("id","mglow").attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%"); glow.append("feGaussianBlur").attr("stdDeviation",3).attr("result","b"); const fm=glow.append("feMerge"); fm.append("feMergeNode").attr("in","b"); fm.append("feMergeNode").attr("in","SourceGraphic");
    const proj=d3.geoMercator(); const path=d3.geoPath(proj);
    const fit=(bb)=>{ proj.fitExtent([[18,18],[W()-18,H()-18]],{type:"Feature",geometry:{type:"MultiPoint",coordinates:bb}}); };
    fit(opts.preset? PRESETS[opts.preset] : (mini? [[102.2,8.3],[115.2,23.4]] : PRESETS.all));
    const sea=svg.append("rect").attr("width","100%").attr("height","100%").attr("fill","var(--sea)");
    const gm=svg.append("g"); // zoomed vector layer
    const grat=d3.geoGraticule().step([1,1]).extent([[95,0],[125,28]]);
    gm.append("path").datum(grat()).attr("d",path).attr("fill","none").attr("stroke","var(--line)").attr("stroke-width",.5).attr("vector-effect","non-scaling-stroke").attr("opacity",.55);
    gm.append("g").selectAll("path").data(GEO.nb.features).join("path").attr("d",path).attr("fill","var(--nb)").attr("stroke","var(--line-2)").attr("stroke-width",.7).attr("vector-effect","non-scaling-stroke");
    const withPlants=new Set(scopeIds().map(id=>({IAP1:"Gia Lai",IAP2:"Gia Lai",TTN:"Quảng Ngãi",DKH:"Lâm Đồng",BTH:"Lâm Đồng",VHO:"Lâm Đồng",LXS:"Bắc Ninh"})[id]));
    const provs=gm.append("g").selectAll("path").data(GEO.prov.features).join("path").attr("d",path)
      .attr("fill",d=>withPlants.has(d.properties.p)?"var(--land-hi)":"var(--land)").attr("stroke","var(--land-line)").attr("stroke-width",.55).attr("vector-effect","non-scaling-stroke");
    gm.append("path").datum(GEO.vn).attr("d",path).attr("fill","none").attr("stroke","var(--accent)").attr("stroke-opacity",.55).attr("stroke-width",1.2).attr("vector-effect","non-scaling-stroke");
    const top=svg.append("g"); // screen-space static labels
    const gNb=top.append("g"), gProvL=top.append("g"), gIsl=top.append("g"), gCity=top.append("g");
    // animated overlay in its own SVG so the detailed base map is not repainted every frame
    const svg2=d3.select(el).append("svg").attr("class","map").style("pointer-events","none").style("will-change","transform").attr("aria-hidden","true");
    const gLink=svg2.append("g"), gPl=svg2.append("g").style("pointer-events","all");
    let T=d3.zoomIdentity; const P=ll=>T.apply(proj(ll));
    const tip=d3.select(el).append("div").attr("class","map-tip").style("display","none");
    const ids=scopeIds(); const showLinks=!mini || true;
    function statusOf(s){ return stStatus(s); }
    function drawBase(){
      const k=T.k; gm.attr("transform",T);
      gNb.selectAll("text").data(Object.entries(NB_LBL)).join("text").attr("x",d=>P(d[1])[0]).attr("y",d=>P(d[1])[1]).text(d=>L(NB_NAME[d[0]])).attr("text-anchor","middle").attr("fill","var(--faint)").attr("font-size",mini?10:11.5).attr("letter-spacing",".12em").style("text-transform","uppercase").attr("pointer-events","none");
      // sea + archipelagos
      const seaLbl=[[112.4,13.2]];
      gIsl.selectAll("text.sea").data(seaLbl).join("text").attr("class","sea").attr("x",d=>P(d)[0]).attr("y",d=>P(d)[1]).text(t("eastSea")).attr("text-anchor","middle").attr("fill","var(--accent)").attr("opacity",.55).attr("font-size",mini?11:14).attr("font-style","italic").attr("letter-spacing",".2em");
      gIsl.selectAll("circle.hs").data(HOANGSA).join("circle").attr("class","hs").attr("cx",d=>P(d)[0]).attr("cy",d=>P(d)[1]).attr("r",Math.min(3,1.4+k*0.15)).attr("fill","var(--land-line)");
      gIsl.selectAll("circle.ts").data(TRUONGSA).join("circle").attr("class","ts").attr("cx",d=>P(d)[0]).attr("cy",d=>P(d)[1]).attr("r",Math.min(3,1.4+k*0.15)).attr("fill","var(--land-line)");
      gIsl.selectAll("text.isl").data([[t("hoangSa"),[111.95,17.35]],[t("truongSa"),[113.9,11.95]]]).join("text").attr("class","isl").attr("x",d=>P(d[1])[0]).attr("y",d=>P(d[1])[1]).text(d=>d[0]).attr("text-anchor","middle").attr("fill","var(--text-2)").attr("font-size",mini?9.5:11).attr("font-weight",500);
      // province labels
      const showProv=!mini && k>=2.2;
      gProvL.selectAll("text").data(showProv?GEO.prov.features:[]).join("text").attr("x",d=>P(d3.geoCentroid(d))[0]).attr("y",d=>P(d3.geoCentroid(d))[1]).text(d=>provName(d.properties.p)).attr("text-anchor","middle").attr("fill",d=>withPlants.has(d.properties.p)?"var(--text-2)":"var(--faint)").attr("font-size",10.5).attr("pointer-events","none");
      // cities
      const cities=CITIES.filter(c=>c.cap||k>=(mini?99:1.6));
      const cg=gCity.selectAll("g").data(cities).join(en=>{ const g=en.append("g"); g.append("rect"); g.append("text"); return g; });
      cg.attr("transform",d=>`translate(${P(d.ll)})`);
      cg.select("rect").attr("x",-2.5).attr("y",-2.5).attr("width",5).attr("height",5).attr("fill",d=>d.cap?"var(--text-2)":"var(--faint)").attr("transform","rotate(45)");
      cg.select("text").text(d=>L(d.n)).attr("x",6).attr("y",3.5).attr("fill","var(--muted)").attr("font-size",mini?9.5:10.5);
      if(full) scaleBar();
    }
    function drawTop(){
      // links to OCC
      const occ=P(OCC_LL);
      const linkData=ids.map(id=>ST[id]).filter(s=>s.plant!=="IAP");
      gLink.selectAll("path").data(linkData).join("path").attr("d",s=>{ const a=P(s.ll); const mx=(a[0]+occ[0])/2, my=(a[1]+occ[1])/2; const dx=occ[0]-a[0], dy=occ[1]-a[1]; const off=0.18; return `M${a[0]},${a[1]} Q${mx-dy*off},${my+dx*off} ${occ[0]},${occ[1]}`; })
        .attr("fill","none").attr("stroke",s=>s.notOper?"var(--off)":"var(--accent)").attr("stroke-width",1.4).attr("stroke-dasharray","4 5").attr("opacity",.75).attr("class","flow");
      // OCC marker
      const og=gPl.selectAll("g.occ").data([OCC_LL]).join(en=>{ const g=en.append("g").attr("class","occ"); g.append("circle").attr("r",13).attr("fill","none").attr("stroke","var(--accent)").attr("stroke-width",1.2).attr("opacity",.6); g.append("path").attr("d",d3.symbol(d3.symbolStar,90)()).attr("fill","var(--accent)"); return g; }).attr("transform",d=>`translate(${P(d)})`);
      // plants: group IAP1/IAP2 offsets handled by real coordinates
      const pl=ids.map(id=>ST[id]);
      const pg=gPl.selectAll("g.pl").data(pl,d=>d.id).join(en=>{ const g=en.append("g").attr("class","pl").style("cursor","pointer"); g.append("circle").attr("class","halo"); g.append("circle").attr("class","core"); g.append("path").attr("class","ico"); const tx=g.append("g").attr("class","lb"); tx.append("rect"); tx.append("text").attr("class","l1"); tx.append("text").attr("class","l2"); return g; });
      pg.attr("transform",d=>`translate(${P(d.ll)})`);
      pg.each(function(d){ const g=d3.select(this); const st=statusOf(d); const col=`var(--${st})`; const L0=LIVE.st[d.id]; const r= mini? 5+Math.sqrt(d.cap)*0.55 : 6+Math.sqrt(d.cap)*0.7;
        g.select(".halo").attr("r",r+5).attr("fill",col).attr("opacity",.18).attr("class","halo"+(st==="crit"?" pulse-h":""));
        g.select(".core").attr("r",r).attr("fill","var(--surface)").attr("stroke",col).attr("stroke-width",2.2);
        g.select(".ico").attr("d",d.type==="wind"? "M0,0 L-1,-6 L1,-6 Z M0,0 L5.2,3 L4.2,4.6 Z M0,0 L-5.2,3 L-4.2,4.6 Z" : "M-4.5,-3 h9 v6 h-9 Z M-4.5,0 h9 M0,-3 v6").attr("fill",d.type==="wind"?col:"none").attr("stroke",col).attr("stroke-width",d.type==="wind"?0:1.2).attr("transform",`scale(${r/7})`);
        const metric=opts.metric? opts.metric(d.id) : null; const l2 = metric!=null? metric : (d.notOper? t("notYet") : `${nf(L0.p,1)} MW`);
        const OFF={IAP1:[-1,-0.2],IAP2:[1,0.15],TTN:[1,-0.3],DKH:[-1,0],BTH:[-1,1.6],VHO:[1,0.7],LXS:[1,0]}; const of=OFF[d.id]||[1,0]; const right=of[0]>0; const lb=g.select(".lb").attr("transform",`translate(${right? r+6 : -(r+6)},${of[1]*(r+8)})`);
        lb.select(".l1").text(d.code).attr("x",0).attr("y",-2).attr("text-anchor",right?"start":"end").attr("font-size",mini?10.5:11.5).attr("font-weight",700).attr("fill","var(--text)");
        lb.select(".l2").text(l2).attr("x",0).attr("y",mini?10:11.5).attr("text-anchor",right?"start":"end").attr("font-size",mini?9.5:10.5).attr("fill","var(--muted)").attr("font-family","var(--f-num)");
        lb.select("rect").attr("x",right?-3:-62).attr("y",-13).attr("width",65).attr("height",mini?27:29).attr("rx",4).attr("fill","var(--surface)").attr("opacity",mini?0:.0);
      });
    }
    function draw(){ drawBase(); drawTop(); }
    // flow animation
    let off=0, raf=0, lt=0; const anim=(now)=>{ raf=requestAnimationFrame(anim); if(now-lt<40) return; lt=now; off=(off-0.6)%90; gLink.selectAll("path").attr("stroke-dashoffset",off); }; if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches) raf=requestAnimationFrame(anim);
    // interactions
    gPl.on("mousemove",(ev)=>{ const g=ev.target.closest("g.pl,g.occ"); if(!g){ tip.style("display","none"); return; } const [x,y]=d3.pointer(ev,el);
      if(g.classList.contains("occ")){ tip.style("display","block").style("left",x+"px").style("top",y+"px").html(`<b>${t("occ")} · Ia Pech</b><div class="muted">${dms(OCC_LL[1],"N","S")} · ${dms(OCC_LL[0],"E","W")}</div>`); return; }
      const d=d3.select(g).datum(); const L0=LIVE.st[d.id];
      tip.style("display","block").style("left",x+"px").style("top",y+"px").html(`<b>${esc(L(d.full))}</b><div class="kv"><span>${t("pNow")}</span><b>${d.notOper?"—":nf(L0.p,1)+" MW / "+capLabel(d)+(d.capUnit?"":" MW")}</b></div><div class="kv"><span>${t("province")}</span><b style="font-family:var(--f-ui);font-size:12px">${esc(L(d.prov))}</b></div><div class="kv"><span>${t("distOCC")}</span><b>${nf(distKm(d.ll,OCC_LL),0)} km</b></div><div class="faint mono" style="font-size:10.5px;margin-top:4px">${dms(d.ll[1],"N","S")} ${dms(d.ll[0],"E","W")}</div>`); })
      .on("mouseleave",()=>tip.style("display","none"))
      .on("click",(ev)=>{ const g=ev.target.closest("g.pl"); if(!g) return; const d=d3.select(g).datum(); if(opts.onSelect) opts.onSelect(d.id); else if(can("station")) go("station",d.id); });
    let coordEl=null; if(full){ coordEl=d3.select(el).append("div").attr("class","map-coord").text("—"); }
    if(!mini){ provs.on("mousemove",(ev,d)=>{ if(ev.target.closest&&false) return; const [x,y]=d3.pointer(ev,el); tip.style("display","block").style("left",x+"px").style("top",y+"px").html(`<b>${esc(provName(d.properties.p))}</b>${withPlants.has(d.properties.p)?`<div class="muted">${t("stations")}: ${ids.filter(id=>({IAP1:"Gia Lai",IAP2:"Gia Lai",TTN:"Quảng Ngãi",DKH:"Lâm Đồng",BTH:"Lâm Đồng",VHO:"Lâm Đồng",LXS:"Bắc Ninh"})[id]===d.properties.p).join(", ")}</div>`:""}`); }).on("mouseleave",()=>tip.style("display","none")); }
    svg.on("mousemove.coord",ev=>{ if(!coordEl) return; const [x,y]=d3.pointer(ev,svg.node()); const ll=proj.invert(T.invert([x,y])); if(ll) coordEl.text(`${dms(ll[1],"N","S")}  ${dms(ll[0],"E","W")}`); });
    const zoom=d3.zoom().scaleExtent([0.8,mini?14:80]).on("zoom",ev=>{ T=ev.transform; draw(); });
    svg.call(zoom); if(mini) svg.on("wheel.zoom",null); svg.on("dblclick.zoom",null);
    // controls
    const ctl=d3.select(el).append("div").attr("class","map-ctl");
    ctl.append("button").attr("aria-label","Zoom in").html(ic("plus","sm")).on("click",()=>svg.transition().duration(300).call(zoom.scaleBy,1.6));
    ctl.append("button").attr("aria-label","Zoom out").html(ic("minus","sm")).on("click",()=>svg.transition().duration(300).call(zoom.scaleBy,1/1.6));
    ctl.append("button").attr("aria-label","Fit").html(ic("fit","sm")).on("click",()=>focusPreset(mini?null:"all"));
    const leg=d3.select(el).append("div").attr("class","map-leg").html(`<span><i class="dot ok"></i>${t("legOk")}</span><span><i class="dot warn"></i>${t("legWarn")}</span><span><i class="dot crit"></i>${t("legFault")}</span><span><i class="dot off"></i>${t("legOff")}</span>${mini?"":`<span><svg width="18" height="6"><path d="M0 3h18" stroke="var(--accent)" stroke-dasharray="4 3"/></svg>${t("legLink")}</span><span><svg width="12" height="12" viewBox="-6 -6 12 12"><path d="${d3.symbol(d3.symbolStar,40)()}" fill="var(--accent)"/></svg>OCC</span>`}`);
    function focusBBox(bb, dur=600){ const a=proj(bb[0]), b=proj(bb[1]); const w=W(), h=H(); const dx=Math.abs(b[0]-a[0]), dy=Math.abs(b[1]-a[1]); const k=Math.min(80,0.86/Math.max(dx/w,dy/h)); const cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2;
      svg.transition().duration(dur).call(zoom.transform,d3.zoomIdentity.translate(w/2,h/2).scale(k).translate(-cx,-cy)); }
    function focusPreset(p){ if(!p){ svg.transition().duration(400).call(zoom.transform,d3.zoomIdentity); return; } focusBBox(PRESETS[p]); }
    function scaleBar(){ let sb=svg.select("g.sbar"); if(sb.empty()){ sb=svg.append("g").attr("class","sbar"); sb.append("path"); sb.append("text"); }
      const h=H(); const a=proj.invert(T.invert([20,h-50])), b=proj.invert(T.invert([120,h-50])); if(!a||!b) return; const km=distKm(a,b); const nice=[1,2,5,10,20,50,100,200,500,1000].find(x=>x>=km*0.6)||1000; const px=100*nice/km;
      sb.attr("transform",`translate(16,${h-56})`); sb.select("path").attr("d",`M0,0 v6 h${px} v-6`).attr("fill","none").attr("stroke","var(--text-2)").attr("stroke-width",1.4); sb.select("text").attr("x",px/2).attr("y",-4).attr("text-anchor","middle").attr("font-size",10.5).attr("fill","var(--text-2)").text(`${nice} km`); }
    const ro=new ResizeObserver(()=>{ const w=W(), h=H(); svg.attr("viewBox",`0 0 ${w} ${h}`); svg2.attr("viewBox",`0 0 ${w} ${h}`); fit(opts.preset? PRESETS[opts.preset] : (mini? [[102.2,8.3],[115.2,23.4]] : PRESETS.all)); gm.selectAll("path").attr("d",path); draw(); }); ro.observe(el);
    draw();
    return { update:drawTop, destroy(){ cancelAnimationFrame(raf); ro.disconnect(); svg.interrupt(); }, focus:focusPreset, focusStation(id){ const s=ST[id]; focusBBox([[s.ll[0]-0.35,s.ll[1]-0.25],[s.ll[0]+0.35,s.ll[1]+0.25]],700); } };
  }
};

PAGES.gis=(el)=>{
  setTitle(t("gis"), t("sub_gis")); let mode="2d", selId=null, m=null, m3=null;
  el.innerHTML=`<div class="gis"><div class="panel" style="position:relative;min-height:560px"><div class="map-presets"><div class="seg" id="gP"><button data-p="all" aria-pressed="true">${t("presetAll")}</button><button data-p="high" aria-pressed="false">${t("presetHigh")}</button><button data-p="north" aria-pressed="false">${t("presetNorth")}</button></div></div>
    <div style="position:absolute;left:10px;top:52px;z-index:3"><div class="seg" id="gV"><button data-v="2d" aria-pressed="true">${t("view2d")}</button><button data-v="3d" aria-pressed="false">${t("view3d")}</button></div></div>
    <div class="map-w" id="gMap" style="position:absolute;inset:0;border-radius:var(--r)"></div></div>
    <div class="gis-side"><div class="panel"><div class="ph"><h3>${t("stations")}</h3><span class="sub">${scopeIds().length}</span></div><div class="plist" id="gL" data-live></div></div><div class="panel" id="gD" data-live></div><div class="faint" style="font-size:11.5px">${ic("info","sm")} ${t("coordNote")}</div></div></div>`;
  function list(){ $("#gL").innerHTML=scopeIds().map(id=>{ const s=ST[id]; return `<button data-s="${id}" class="${selId===id?"on":""}"><span class="dot ${stStatus(s)}"></span><span><div class="pn">${esc(L(s.full))}</div><div class="pm">${esc(L(s.prov))} · ${capLabel(s)}${s.capUnit?"":" MW"}</div></span><span class="num muted">${s.notOper?"—":nf(LIVE.st[id].p,1)+" MW"}</span></button>`; }).join(""); }
  function detail(){ const D=$("#gD"); if(!selId){ D.innerHTML=`<div class="ph"><h3>${t("occ")}</h3><span class="act"><span class="tag">OCC</span></span></div><div class="pb"><dl class="dl"><dt>${t("coords")}</dt><dd class="mono" style="font-size:11.5px">${dms(OCC_LL[1],"N","S")}<br>${dms(OCC_LL[0],"E","W")}</dd><dt>${t("province")}</dt><dd>${esc(L(ST.IAP1.prov))}</dd><dt>${t("stations")}</dt><dd>${scopeIds().length}</dd></dl><p class="muted" style="margin:10px 0 0;font-size:12.5px">${t("occHere")} · NMĐG Ia Pếch</p></div>`; return; }
    const s=ST[selId]; const L0=LIVE.st[selId]; const d=distKm(s.ll,OCC_LL);
    D.innerHTML=`<div class="ph"><h3>${esc(L(s.full))}</h3><span class="act"><span class="tag">${s.code}</span></span></div><div class="pb"><dl class="dl">
      <dt>${t("coords")}</dt><dd class="mono" style="font-size:11.5px">${dms(s.ll[1],"N","S")}<br>${dms(s.ll[0],"E","W")}<br><span class="faint">${s.ll[1].toFixed(4)}, ${s.ll[0].toFixed(4)}</span></dd>
      <dt>${t("province")}</dt><dd>${esc(L(s.prov))}${s.old?`<div class="faint" style="font-size:11.5px">${t("formerly",{p:L(s.old)})}</div>`:""}</dd>
      <dt>${t("type")}</dt><dd>${t("plantType_"+s.type)}</dd><dt>${t("capMW")}</dt><dd class="num">${s.capDC?`${nf(acCap(s),2)} MWac · ${nf(s.capDC,3)} MWp`:nf(s.cap,2)+" MW"}</dd><dt>${t("model")}</dt><dd>${esc(s.model)} × ${s.n}</dd>
      <dt>${t("pNow")}</dt><dd class="num">${s.notOper?"—":nf(L0.p,2)+" MW"}</dd><dt>${t("distOCC")}</dt><dd class="num">${s.plant==="IAP"?"0 km · OCC":nf(d,0)+" km"}</dd><dt>${t("link")}</dt><dd>${s.gw} · ${s.proto}</dd><dt>${t("latency")}</dt><dd class="num">${s.notOper?"—":Math.round(8+d*0.06)+" ms"}</dd></dl>
      ${can("station")?`<button class="btn primary" style="margin-top:12px;width:100%" data-go="station" data-p="${s.id}">${t("openSt")} ${ic("chevR","sm")}</button>`:""}</div>`; }
  function sel(id){ selId=id; list(); detail(); if(m&&id) m.focusStation(id); if(m3&&id) m3.focus(id); }
  async function mountView(){ if(m){ m.destroy(); m=null; } if(m3){ m3.dispose(); S.scenes=S.scenes.filter(x=>x!==m3); m3=null; } const host=$("#gMap"); host.innerHTML="";
    if(mode==="2d"){ m=MAP2D.mount(host,{full:true,onSelect:sel}); }
    else { host.innerHTML=`<div class="twin-load">${t("loading3d")}</div>`; const sc=await THREE3D.map(host,{onSelect:sel}); if(sc){ if(S.page!=="gis"||mode!=="3d"){ sc.dispose(); return; } m3=sc; S.scenes.push(sc); } } }
  $("#gL").onclick=e=>{ const b=e.target.closest("[data-s]"); if(b) sel(b.dataset.s); };
  $("#gP").onclick=e=>{ const b=e.target.closest("[data-p]"); if(!b) return; $$("#gP button").forEach(x=>x.setAttribute("aria-pressed",x===b)); selId=null; list(); detail(); if(m) m.focus(b.dataset.p); if(m3) m3.preset(b.dataset.p); };
  $("#gV").onclick=e=>{ const b=e.target.closest("[data-v]"); if(!b||b.dataset.v===mode) return; mode=b.dataset.v; $$("#gV button").forEach(x=>x.setAttribute("aria-pressed",x===b)); mountView(); };
  S.cleanup.push(()=>{ m&&m.destroy(); });
  list(); detail(); mountView(); PAGE_UPD=()=>{ list(); m&&m.update(); if(selId) detail(); };
};
