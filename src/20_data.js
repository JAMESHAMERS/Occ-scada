// Build stamp is injected by build.py (date + git commit), so every published copy can be compared at a glance.
const BUILD = __BUILD__;
// ===================== Plant registry =====================
// Coordinates: WGS84, public reference sources (gem.wiki / thewindpower / news), tolerance a few km.
const OCC_LL = [107.902, 13.975];
const STATIONS = [
  { id:"IAP1", code:"IAP1", plant:"IAP", type:"wind", ll:[107.886,13.990], cap:49.5, rated:3.3,
    name:{vi:"Ia Pếch 1",en:"Ia Pech 1",zh:"IA Pech 1 风电场"}, full:{vi:"NMĐG Ia Pếch 1",en:"Ia Pech 1 Wind Farm",zh:"IA Pech 1 风电场"},
    prov:{vi:"Gia Lai",en:"Gia Lai",zh:"嘉莱省"}, old:null, model:"Windey WD164-3300", rotor:164, hubH:95,
    scada:"CYG PRS-7000", ppc:"CYG PRS-7910", gw:"GW-IAP-01", cod:"01/2026", proto:"IEC 104 · Modbus TCP", pts:2000, kv:"110 kV",
    feeders:[["XT1",["WT16","WT17","WT18","WT20","WT21"]],["XT2",["WT22","WT23","WT24","WT25","WT26"]],["XT3",["WT27","WT28","WT29","WT30","WT31"]]],
    states:{WT21:"fault",WT27:"maint",WT16:"limit",WT17:"limit",WT18:"limit"}, pset:32.0, base:7.1, seed:11, plan:12150 },
  { id:"IAP2", code:"IAP2", plant:"IAP", type:"wind", ll:[107.918,13.962], cap:49.5, rated:3.3,
    name:{vi:"Ia Pếch 2",en:"Ia Pech 2",zh:"IA Pech 2 风电场"}, full:{vi:"NMĐG Ia Pếch 2",en:"Ia Pech 2 Wind Farm",zh:"IA Pech 2 风电场"},
    prov:{vi:"Gia Lai",en:"Gia Lai",zh:"嘉莱省"}, old:null, model:"Windey WD164-3300", rotor:164, hubH:95,
    scada:"CYG PRS-7000", ppc:"CYG PRS-7910", gw:"GW-IAP-01", cod:"01/2026", proto:"IEC 104 · Modbus TCP", pts:2000, kv:"110 kV",
    feeders:[["XT1",["WT01","WT02","WT03","WT04","WT05"]],["XT2",["WT06","WT07","WT08","WT09","WT10"]],["XT3",["WT11","WT12","WT13","WT14","WT15"]]],
    states:{WT06:"stop"}, base:7.5, seed:23, plan:12150 },
  { id:"TTN", code:"TTN", plant:"TTN", type:"wind", ll:[107.736,15.086], cap:50.0, rated:3.0,
    name:{vi:"Tân Tấn Nhật",en:"Tan Tan Nhat",zh:"新晋日风电场"}, full:{vi:"NMĐG Tân Tấn Nhật",en:"Tan Tan Nhat Wind Farm",zh:"新晋日风电场"},
    prov:{vi:"Quảng Ngãi",en:"Quang Ngai",zh:"广义省"}, old:{vi:"Kon Tum",en:"Kon Tum",zh:"昆嵩"}, model:"Windey WD156-3000 / WD140", rotor:156, hubH:100,
    scada:"OCI (GE G500)", ppc:"Advantech AGC", gw:"GW-TTN-01", cod:"11/2021", proto:"IEC 104 · Modbus TCP", pts:2000, kv:"110 kV",
    feeders:[["XT1",["WT01","WT02","WT03","WT04","WT05"]],["XT2",["WT06","WT07","WT08","WT09","WT10"]],["XT3",["WT11","WT12","WT13","WT14","WT15"]],["XT4",["WT16","WT17","WT18"]]],
    ratedOf:id=>{const n=+id.slice(2); return n<=10?3.0:2.5;}, modelOf:id=>{const n=+id.slice(2); return n<=8?"WD156-3000":n<=10?"WD140-3000":"WD140-2500";},
    states:{WT04:"comm",WT15:"fault"}, base:5.7, seed:37, plan:9500 },
  { id:"DKH", code:"DKH", plant:"DKH", type:"wind", ll:[107.612,12.318], cap:49.5, rated:3.3,
    name:{vi:"Đắk Hòa",en:"Dak Hoa",zh:"得和风电场"}, full:{vi:"NMĐG Đắk Hòa",en:"Dak Hoa Wind Farm",zh:"得和风电场"},
    prov:{vi:"Lâm Đồng",en:"Lam Dong",zh:"林同省"}, old:{vi:"Đắk Nông",en:"Dak Nong",zh:"得农"}, model:"Envision EN-156-3.3", rotor:156, hubH:100,
    scada:"OCI (GE D400) · Envision USCADA", ppc:"CYG PRS-7910", gw:"GW-DKH-01", cod:"10/2021", proto:"IEC 104 · OPC UA", pts:1500, kv:"220 kV",
    feeders:[["XT1",["WT01","WT02","WT03","WT04","WT05"]],["XT2",["WT06","WT07","WT08","WT09","WT10"]],["XT3",["WT11","WT12","WT13","WT14","WT15"]]],
    states:{WT07:"fault",WT11:"maint"}, base:7.3, seed:41, plan:12600 },
  { id:"BTH", code:"BTH", plant:"BTH", type:"wind", ll:[108.684,11.214], cap:29.7, rated:3.3,
    name:{vi:"Bình Thuận (PĐ1)",en:"Binh Thuan (PD1)",zh:"平顺风电一期"}, full:{vi:"NMĐG Phong Điện 1 Bình Thuận",en:"Phong Dien 1 Binh Thuan Wind Farm",zh:"平顺风电一期"},
    prov:{vi:"Lâm Đồng",en:"Lam Dong",zh:"林同省"}, old:{vi:"Bình Thuận",en:"Binh Thuan",zh:"平顺"}, model:"Envision EN-156-3.3", rotor:156, hubH:100,
    scada:"NR PCS-9700", ppc:"Envision ENV-EMS-II", gw:"GW-BTH-01", cod:"—", proto:"IEC 104", pts:1000, kv:"110 kV",
    feeders:[["XT1",["WT01","WT02","WT03","WT04","WT05"]],["XT2",["WT06","WT07","WT08","WT09"]]],
    states:"comm", notOper:true, base:6.6, seed:53, plan:0 },
  { id:"VHO", code:"VHO", plant:"VHO", type:"solar", ll:[108.733,11.282], cap:29.99, capAC:29.99, capDC:34.25, capUnit:"MWac",
    name:{vi:"Vĩnh Hảo",en:"Vinh Hao",zh:"永好光伏电站"}, full:{vi:"NMĐMT Vĩnh Hảo",en:"Vinh Hao Solar Plant",zh:"永好光伏电站"},
    prov:{vi:"Lâm Đồng",en:"Lam Dong",zh:"林同省"}, old:{vi:"Bình Thuận",en:"Binh Thuan",zh:"平顺"}, model:"Sungrow SG630MX", invKW:630,
    scada:"NARI NS3000", ppc:"AGC/AVC NS3000", gw:"GW-VHO-01", cod:"06/2019", proto:"IEC 104 · Modbus TCP", pts:10400, kv:"110 kV", wx:"TRM-ZS1",
    feeders:Array.from({length:12},(_,b)=>[String(b+1).padStart(2,"0"),[1,2,3,4].map(k=>`INV-${String(b+1).padStart(2,"0")}-${k}`)]),
    states:{"INV-07-3":"fault","INV-04-1":"comm","INV-10-2":"limit"}, seed:61, plan:4350 },
  { id:"LXS", code:"LXS", plant:"LXS", type:"roof", ll:[106.121,21.256], cap:20.048, capAC:17.49, capDC:20.048, capUnit:"MWp",
    name:{vi:"Lập Tốn (mái nhà)",en:"Lap Ton (rooftop)",zh:"立讯屋顶光伏"}, full:{vi:"ĐMT mái nhà Lập Tốn",en:"Lap Ton Rooftop Solar",zh:"立讯屋顶光伏"},
    prov:{vi:"Bắc Ninh",en:"Bac Ninh",zh:"北宁省"}, old:{vi:"Bắc Giang",en:"Bac Giang",zh:"北江"}, model:"Solis S5-GC110K", invKW:110,
    surveyed:false, scada:"CYG SUNRI (HINO)", ppc:"Zero Export CYG · 9 POI", gw:"GW-LXS-01", cod:"12/2023", proto:"IEC 104 (HINO)", pts:8000, kv:"22 kV", wx:"WS01",
    feeders:null, states:{"INV-D2-14-03":"limit","INV-C3-8-05":"comm","INV-C2-5-02":"fault"}, seed:71, plan:2380 },
];
// Lập Tốn: 21 roof projects, 159 inverters
(()=>{ const s=STATIONS.find(x=>x.id==="LXS"); const zones=["A1","A2","B1","B2","C1","C2","C3","C4","D1","D2"]; const counts=[7,8,9,6,8,7,9,6,8,7,8,10,6,7,8,9,7,6,8,7,8];
  const projects=[]; let k=0; for(let i=0;i<21;i++){ const z=zones[i%zones.length]; const code=`${z}-${Math.floor(i/zones.length)*7+ (i%7)+1}`; projects.push([code, Array.from({length:counts[i]},(_,j)=>`INV-${code}-${String(j+1).padStart(2,"0")}`)]); k+=counts[i]; }
  // fix the codes referenced by alarms/states
  projects[19][0]="D2-14"; projects[19][1]=projects[19][1].map((_,j)=>`INV-D2-14-${String(j+1).padStart(2,"0")}`);
  projects[16][0]="C3-8"; projects[16][1]=projects[16][1].map((_,j)=>`INV-C3-8-${String(j+1).padStart(2,"0")}`);
  projects[5][0]="C2-5"; projects[5][1]=projects[5][1].map((_,j)=>`INV-C2-5-${String(j+1).padStart(2,"0")}`);
  projects[7][0]="C4-4"; projects[7][1]=projects[7][1].map((_,j)=>`INV-C4-4-${String(j+1).padStart(2,"0")}`);
  projects[3][0]="B2-1"; projects[3][1]=projects[3][1].map((_,j)=>`INV-B2-1-${String(j+1).padStart(2,"0")}`);
  s.feeders=projects; s.nInv=k; })();
STATIONS.forEach(s=>{ s.units=[]; s.feeders.forEach(([f,ids])=>ids.forEach(id=>s.units.push({id,f,st:s.id}))); s.n=s.units.length; });
const ST = Object.fromEntries(STATIONS.map(s=>[s.id,s]));
const CITIES = [
  {n:{vi:"Hà Nội",en:"Hanoi",zh:"河内"},ll:[105.854,21.028],cap:1},{n:{vi:"TP. Hồ Chí Minh",en:"Ho Chi Minh City",zh:"胡志明市"},ll:[106.700,10.776],cap:1},
  {n:{vi:"Đà Nẵng",en:"Da Nang",zh:"岘港"},ll:[108.202,16.054]},{n:{vi:"Huế",en:"Hue",zh:"顺化"},ll:[107.585,16.463]},
  {n:{vi:"Pleiku",en:"Pleiku",zh:"波来古"},ll:[108.000,13.983]},{n:{vi:"Kon Tum",en:"Kon Tum",zh:"昆嵩"},ll:[108.000,14.350]},
  {n:{vi:"Buôn Ma Thuột",en:"Buon Ma Thuot",zh:"邦美蜀"},ll:[108.038,12.667]},{n:{vi:"Gia Nghĩa",en:"Gia Nghia",zh:"嘉义"},ll:[107.690,12.004]},
  {n:{vi:"Đà Lạt",en:"Da Lat",zh:"大叻"},ll:[108.458,11.940]},{n:{vi:"Phan Thiết",en:"Phan Thiet",zh:"藩切"},ll:[108.102,10.928]},
  {n:{vi:"Nha Trang",en:"Nha Trang",zh:"芽庄"},ll:[109.196,12.239]},{n:{vi:"Quy Nhơn",en:"Quy Nhon",zh:"归仁"},ll:[109.223,13.776]},
  {n:{vi:"Quảng Ngãi",en:"Quang Ngai",zh:"广义"},ll:[108.800,15.120]},{n:{vi:"Bắc Ninh",en:"Bac Ninh",zh:"北宁"},ll:[106.076,21.186]},
  {n:{vi:"Hải Phòng",en:"Hai Phong",zh:"海防"},ll:[106.688,20.845]},{n:{vi:"Cần Thơ",en:"Can Tho",zh:"芹苴"},ll:[105.746,10.045]},
  {n:{vi:"Vinh",en:"Vinh",zh:"荣市"},ll:[105.681,18.679]},{n:{vi:"Phan Rang",en:"Phan Rang",zh:"藩朗"},ll:[108.989,11.565]}
];
const HOANGSA = [[112.339,16.834],[111.608,16.533],[111.200,15.783],[112.730,16.670],[111.700,16.450],[112.260,16.980],[111.570,16.220]];
const TRUONGSA = [[111.918,8.645],[114.333,11.430],[114.329,9.883],[114.361,10.183],[114.479,10.377],[112.917,7.867],[113.300,8.183],[112.250,8.850],[114.660,10.920],[115.530,10.720],[113.880,8.550]];

// ===================== Deterministic noise =====================
function hsh(i){ let h=Math.imul((i|0)^0x9e3779b9,0x85ebca6b); h^=h>>>13; h=Math.imul(h,0xc2b2ae35); h^=h>>>16; return (h>>>0)/4294967295*2-1; }
function vn(x,seed){ const i=Math.floor(x), f=x-i, u=f*f*(3-2*f); const a=hsh(i*7919+seed*104729), b=hsh((i+1)*7919+seed*104729); return a+(b-a)*u; }
function fbm(x,seed){ return vn(x,seed)*0.6+vn(x*2.31,seed+7)*0.28+vn(x*5.13,seed+13)*0.12; }
function rnd(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const HOUR=3600e3, DAY=86400e3, TZ=7*HOUR;
const localH = ms => (((ms+TZ)/HOUR)%24+24)%24;
const dayStart = ms => Math.floor((ms+TZ)/DAY)*DAY-TZ;

// ===================== Physics models =====================
function windAt(s, ms, k=0){
  const m=ms/60000, h=localH(ms);
  let v=s.base + 1.1*Math.cos(2*Math.PI*(h-4)/24) + 2.0*fbm(m/95,s.seed) + 0.7*fbm(m/14,s.seed+3);
  if(k) v = v*(1+0.07*hsh(k*31+s.seed)) + 0.45*fbm(m/5,s.seed+k*17);
  return clamp(v,0.3,24);
}
function pcurve(v, rated){ if(v<3||v>=22) return 0; if(v>=11.2) return rated; const x=(v*v*v-27)/(11.2**3-27); return rated*clamp(x*(1.16-0.16*x),0,1); }
function solarPos(ll, ms){
  const [lon,lat]=ll, d=new Date(ms); const doy=Math.floor((ms-Date.UTC(d.getUTCFullYear(),0,0))/DAY);
  const B=2*Math.PI*(doy-81)/364, eot=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B);
  const utcH=(ms/HOUR)%24, lst=utcH+lon/15+eot/60, H=(15*(lst-12))*Math.PI/180;
  const dec=23.44*Math.sin(2*Math.PI*(284+doy)/365)*Math.PI/180, phi=lat*Math.PI/180;
  const el=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
  let az=Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi))*180/Math.PI+180;
  return {el:el*180/Math.PI, az};
}
function irrAt(s, ms){ const {el}=solarPos(s.ll,ms); if(el<=0) return 0; const m=ms/60000; const cloud=clamp(0.80+0.30*fbm(m/38,s.seed)+0.08*fbm(m/6,s.seed+5),0.28,1.02); return 1060*Math.pow(Math.sin(el*Math.PI/180),1.18)*cloud*1.04; }
function ambAt(s, ms){ const h=localH(ms); const base = s.id==="LXS"?25.5 : (s.id==="VHO"||s.id==="BTH")?27.5 : 22.5; return base+5.2*Math.sin(2*Math.PI*(h-9)/24)+0.8*fbm(ms/3.6e6,s.seed); }
function unitState(s,id){ if(s.states==="comm") return "comm"; return (s.states&&s.states[id])||"run"; }
function unitRated(s,id){ return s.type==="wind" ? (s.ratedOf? s.ratedOf(id): s.rated) : s.invKW/1000; }
// cap = installed capacity as stated in the proposal (MW for wind, MWac Vĩnh Hảo, MWp Lập Tốn); acCap = grid-side AC limit used for physics
const acCap = s => s.capAC ?? s.cap;
const capLabel = (s,d=1) => nf(s.cap, s.capUnit==="MWp"?3 : s.capUnit==="MWac"?2 : d)+(s.capUnit && s.capUnit!=="MW" ? " "+s.capUnit : "");

// Station power at time ms. Returns {p, th, units?}
function stationPower(s, ms, detail=false){
  const out = detail? [] : null; let p=0, th=0;
  if(s.type==="wind"){
    s.units.forEach((u,i)=>{ const r=unitRated(s,u.id), v=windAt(s,ms,i+1), pa=pcurve(v,r); th+=pa; const st=unitState(s,u.id);
      let pu = (st==="run"||st==="limit")? pa*(0.97+0.02*hsh(i)) : 0;
      if(detail) out.push({id:u.id,f:u.f,v,p:pu,pa,st,r}); p+=pu; });
    if(s.pset && p>s.pset){ const f=s.pset/p; p=s.pset; if(detail) out.forEach(o=>{ if(o.p>0) o.p*=f; }); }
    if(s.notOper){ p=0; th=0; if(detail) out.forEach(o=>{o.p=null;o.v=null;}); }
  } else {
    const g=irrAt(s,ms), amb=ambAt(s,ms), tm=amb+g*0.032, der=1-0.0038*Math.max(0,tm-25);
    const dc = g/1000*s.capDC*0.86*der, acc=acCap(s); th=Math.min(acc,dc);
    s.units.forEach((u,i)=>{ const r=unitRated(s,u.id), st=unitState(s,u.id); const share=th/s.n*(1+0.035*hsh(i*13+s.seed));
      let pu = st==="run"? Math.min(r,share) : st==="limit"? Math.min(r*0.72,share) : 0; if(detail) out.push({id:u.id,f:u.f,p:pu,pa:share,st,r,g}); p+=pu; });
  }
  return {p,th,units:out};
}

// ===================== Live state & history =====================
const LIVE = { t:Date.now(), st:{}, lastTick:Date.now() };
function initHistory(){
  const now=Date.now(), d0=dayStart(now), step=5*60e3;
  STATIONS.forEach(s=>{
    const hrs=Array.from({length:24},()=>({e:0,th:0,w:0,n:0}));
    let e=0, eth=0, pmax=0;
    for(let t=d0; t<=now; t+=step){ const r=stationPower(s,t); const h=Math.floor(localH(t)); const de=r.p*step/HOUR, dth=r.th*step/HOUR; e+=de; eth+=dth; hrs[h].e+=de; hrs[h].th+=dth; hrs[h].n++; hrs[h].w+= s.type==="wind"? windAt(s,t) : irrAt(s,t); pmax=Math.max(pmax,r.p); }
    hrs.forEach(x=>{ if(x.n) x.w/=x.n; });
    // yesterday 5-min curve & total
    const yc=[]; let ye=0; for(let t=d0-DAY; t<d0; t+=step){ const r=stationPower(s,t); ye+=r.p*step/HOUR; yc.push(r.p); }
    // month to date (hourly sampling for past days)
    const dm=new Date(now+TZ); const mStart=Date.UTC(dm.getUTCFullYear(),dm.getUTCMonth(),1)-TZ; let mtd=0;
    for(let t=mStart; t<d0; t+=HOUR) mtd+=stationPower(s,t).p;
    LIVE.st[s.id]={ e, eth, pmax, hrs, ye, yc, mtd, aux: s.type==="wind"? 0.78+0.22*Math.abs(hsh(s.seed)) : 0.22+0.4*Math.abs(hsh(s.seed)), comm: s.notOper? 0: 1 };
  });
  // 5-min curves for today (portfolio trend)
  LIVE.curve=[]; for(let t=d0; t<=now; t+=step){ let p=0,th=0; STATIONS.forEach(s=>{const r=stationPower(s,t); p+=r.p; th+=r.th;}); LIVE.curve.push([t,p,th]); }
  tick(true);
}
function tick(first){
  const now=Date.now(), dt=(now-LIVE.lastTick)/HOUR; LIVE.t=now;
  STATIONS.forEach(s=>{ const L0=LIVE.st[s.id]; const r=stationPower(s,now,true); L0.p=r.p; L0.th=r.th; L0.units=r.units;
    if(!first){ L0.e+=r.p*dt; L0.eth+=r.th*dt; const h=Math.floor(localH(now)); L0.hrs[h].e+=r.p*dt; L0.hrs[h].th+=r.th*dt; L0.pmax=Math.max(L0.pmax,r.p); }
    if(s.type==="wind"){ L0.v=s.notOper?null:windAt(s,now); L0.dir=(250+40*fbm(now/3.6e6,s.seed+9)+360)%360; }
    else { L0.g=irrAt(s,now); L0.amb=ambAt(s,now); L0.tm=L0.amb+L0.g*0.032; }
    const avail=s.units.filter(u=>{const st=unitState(s,u.id); return st==="run"||st==="limit";}).length;
    L0.avail = s.notOper? null : 100*(avail + (s.n-avail)*0.35)/s.n * (s.type==="wind"? 1 : 1) ; // time-based approx (IEC 61400-26 T)
    L0.avail = s.notOper? null : clamp(96.2 + 3.6*avail/s.n - (s.n-avail)*0.18, 90, 99.9);
    L0.updAgo = s.notOper? null : Math.floor(Math.abs(hsh(Math.floor(now/2000)+s.seed))*3);
  });
  const last=LIVE.curve[LIVE.curve.length-1]; if(!first && now-last[0]>=5*60e3){ let p=0,th=0; STATIONS.forEach(s=>{p+=LIVE.st[s.id].p; th+=LIVE.st[s.id].th;}); LIVE.curve.push([now,p,th]); }
  LIVE.lastTick=now;
}
function scopeIds(){ const sc=S.user?.scope; return STATIONS.filter(s=>sc==="all"||(Array.isArray(sc)&&sc.includes(s.id))).map(s=>s.id); }
function inScope(id){ return scopeIds().includes(id); }
function stStatus(s){ // ok | warn | crit | off
  if(s.notOper) return "off"; const al=ALARMS.filter(a=>a.st===s.id&&!a.cleared); if(al.some(a=>a.sev===1&&!a.acked)) return "crit"; if(al.some(a=>a.sev===1||(a.sev===2&&!a.acked))) return "warn"; return "ok"; }
function healthScore(s){ if(s.notOper) return null; const L0=LIVE.st[s.id]; const al=ALARMS.filter(a=>a.st===s.id&&!a.cleared); let h=100-al.reduce((a,x)=>a+[0,9,5,3,1][x.sev],0)-(100-(L0.avail||100))*1.4; return Math.round(clamp(h,40,100)); }
function cfToday(s){ const L0=LIVE.st[s.id]; const hrs=(LIVE.t-dayStart(LIVE.t))/HOUR; return hrs>0? 100*L0.e/(acCap(s)*hrs):0; }

// ===================== Alarms =====================
const AT = { // alarm text templates
  pitchBat:{vi:"Lỗi nguồn dự phòng pitch cánh số 2",en:"Blade 2 pitch backup power fault",zh:"2号桨叶后备电源故障"},
  ppcLimit:{vi:"Vào chế độ hạn chế công suất (PPC)",en:"Entered curtailed operation (PPC)",zh:"进入限功率运行（PPC）"},
  maint6m:{vi:"Bảo trì định kỳ 6 tháng",en:"6-monthly scheduled maintenance",zh:"半年定检"},
  yawErr:{vi:"Sai lệch yaw >15° kéo dài · {v}°",en:"Yaw misalignment >15° sustained · {v}°",zh:"偏航对风偏差>15°持续 · {v}°"},
  manStop:{vi:"Dừng thủ công tại nhà máy",en:"Manual stop at site",zh:"现场手动停机"},
  gridF:{vi:"Tần số lưới vượt 49,8–50,2 Hz · {v} Hz",en:"Grid frequency outside 49.8–50.2 Hz · {v} Hz",zh:"电网频率超出49.8–50.2 Hz · {v} Hz"},
  genBear:{vi:"Nhiệt độ ổ trục máy phát cao · {v} °C",en:"Generator bearing temperature high · {v} °C",zh:"发电机驱动端轴承温度高 · {v} °C"},
  stale:{vi:"Mất dữ liệu: quá 300 s không cập nhật",en:"Data stale: no update for over 300 s",zh:"数据异常：超过300秒未更新"},
  dc48:{vi:"Điện áp nguồn DC 48 V thấp · {v} V",en:"48 V DC supply low · {v} V",zh:"48V直流电压低 · {v} V"},
  underPerf:{vi:"Công suất thấp hơn đường cong >15% trong 30 phút · {v}%",en:"Power below curve >15% for 30 min · {v}%",zh:"功率低于特性曲线>15%持续30分钟 · {v}%"},
  convF:{vi:"Sự cố bộ biến đổi phía lưới",en:"Grid-side converter fault",zh:"网侧变流器故障"},
  gwDown:{vi:"Gián đoạn truyền thông gateway trạm",en:"Station gateway communication lost",zh:"场站网关通讯中断"},
  igbtHi:{vi:"Nhiệt độ IGBT quá cao · {v} °C",en:"IGBT over-temperature · {v} °C",zh:"IGBT模块温度过高 · {v} °C"},
  ambDer:{vi:"Giảm công suất do nhiệt độ môi trường",en:"Derating due to ambient temperature",zh:"环境温度降额运行"},
  strLow:{vi:"Dòng string thấp hơn TB >20% · {v}%",en:"String current >20% below average · {v}%",zh:"组串电流低于平均>20% · {v}%"},
  ovGrid:{vi:"Quá áp lưới (OV-G-V) · {v} V",en:"Grid over-voltage (OV-G-V) · {v} V",zh:"电网过压（OV-G-V） · {v} V"},
  invFault:{vi:"Sự cố inverter: lỗi cách điện DC",en:"Inverter fault: DC insulation",zh:"逆变器故障：直流绝缘"},
  gbOil:{vi:"Nhiệt độ dầu hộp số cao · {v} °C",en:"Gearbox oil temperature high · {v} °C",zh:"齿轮箱油温高 · {v} °C"},
  windHi:{vi:"Dừng do gió vượt ngưỡng cắt",en:"Stopped on high-wind cut-out",zh:"大风切出停机"},
  vibHi:{vi:"Rung tháp vượt ngưỡng cảnh báo · {v} mm/s",en:"Tower vibration above warning · {v} mm/s",zh:"塔筒振动超限 · {v} mm/s"},
  transfT:{vi:"Nhiệt độ cuộn dây MBA cao · {v} °C",en:"Transformer winding temperature high · {v} °C",zh:"箱变绕组温度高 · {v} °C"},
};
const ACK_NAMES = ["le.tm","tran.qd","nguyen.vk","pham.dk"];
let ALARMS=[]; let ALARM_SEQ=1000;
function mkAlarm(st,dev,sev,key,val,agoMin,ack){ const now=Date.now(); return {id:++ALARM_SEQ, st, dev, sev, key, val, t:now-agoMin*60e3, acked:!!ack, ackBy:ack||null, ackT:ack?now-agoMin*60e3+8*60e3:null, cleared:false}; }
function seedAlarms(){
  ALARMS=[
    mkAlarm("IAP1","WT21",1,"pitchBat",null,48,"le.tm"), mkAlarm("IAP1","WT16",4,"ppcLimit",null,186,null), mkAlarm("IAP1","WT27",4,"maint6m",null,320,"tran.qd"), mkAlarm("IAP1","TBA 110kV",3,"transfT","78,4",22,null),
    mkAlarm("IAP2","WT09",3,"yawErr","21,7",14,null), mkAlarm("IAP2","WT06",4,"manStop",null,95,"le.tm"),
    mkAlarm("TTN","TBA 110kV",3,"gridF","50,23",6,null), mkAlarm("TTN","WT15",2,"genBear","91,3",5,"le.tm"), mkAlarm("TTN","WT04",2,"stale",null,34,null),
    mkAlarm("DKH","Tủ DC",2,"dc48","45,5",21,null), mkAlarm("DKH","WT03",3,"underPerf","−16,3",40,null), mkAlarm("DKH","WT07",1,"convF",null,140,null), mkAlarm("DKH","WT11",4,"maint6m",null,260,"pham.dk"),
    mkAlarm("BTH","Gateway",1,"gwDown",null,5*1440+190,"pham.dk"),
    mkAlarm("VHO","INV-07-3",2,"igbtHi","87,5",36,null), mkAlarm("VHO","INV-10-2",2,"ambDer",null,57,"tran.qd"), mkAlarm("VHO","INV-02-3",4,"strLow","−27,9",65,"tran.qd"),
    mkAlarm("LXS","INV-D2-14-03",2,"ovGrid","446",70,null), mkAlarm("LXS","INV-C3-8-05",2,"stale",null,45,"nguyen.vk"), mkAlarm("LXS","INV-C2-5-02",2,"invFault",null,25,null),
  ];
  // history (cleared)
  const r=rnd(9); const keys=["yawErr","genBear","gbOil","underPerf","windHi","vibHi","stale","gridF","igbtHi","strLow","ovGrid","ambDer","convF","pitchBat"];
  for(let i=0;i<160;i++){ const s=STATIONS[Math.floor(r()*STATIONS.length)]; if(s.notOper) continue; const u=s.units[Math.floor(r()*s.n)]; const k=keys[Math.floor(r()*keys.length)];
    const sev=[1,2,2,3,3,3,4,4][Math.floor(r()*8)]; const a=mkAlarm(s.id,u.id,sev,k,(10+r()*80).toFixed(1).replace(".",","), 60+r()*7*1440, ACK_NAMES[Math.floor(r()*4)]); a.cleared=true; a.clrT=a.t+(10+r()*300)*60e3; ALARMS.push(a); }
}
function alarmText(a){ const tpl=AT[a.key]; let s=L(tpl); if(a.val!=null){ let v=String(a.val); if(S.lang!=="vi") v=v.replace(",","."); s=s.replace("{v}",v); } return s; }
function activeAlarms(){ return ALARMS.filter(a=>!a.cleared && inScope(a.st)).sort((a,b)=>a.sev-b.sev||b.t-a.t); }
function randomAlarm(){
  const ids=scopeIds().filter(id=>!ST[id].notOper); if(!ids.length) return null; const r=Math.random; const s=ST[ids[Math.floor(r()*ids.length)]];
  const u=s.units[Math.floor(r()*s.n)]; const pool = s.type==="wind"? [["yawErr",()=>(15+r()*12).toFixed(1)],["gbOil",()=>(72+r()*8).toFixed(1)],["vibHi",()=>(4+r()*3).toFixed(1)],["underPerf",()=>"−"+(15+r()*8).toFixed(1)]] : [["strLow",()=>"−"+(20+r()*15).toFixed(1)],["igbtHi",()=>(80+r()*8).toFixed(1)],["ovGrid",()=>String(Math.round(440+r()*10))]];
  const [k,f]=pool[Math.floor(r()*pool.length)]; const a=mkAlarm(s.id,u.id,[2,3,3,4][Math.floor(r()*4)],k,f().replace(".",","),0,null); ALARMS.unshift(a); return a;
}

// ===================== Historical daily data (analytics) =====================
let HIST=null;
function buildHist(){
  if(HIST) return HIST; const now=Date.now(), d0=dayStart(now); const days=[]; for(let i=364;i>=0;i--) days.push(d0-i*DAY);
  HIST={days, st:{}};
  STATIONS.forEach((s,si)=>{ const rows=[]; const r=rnd(s.seed*97);
    days.forEach((d,di)=>{ let e=0, th=0, res=0; for(let h=0;h<24;h++){ const t=d+h*HOUR+30*60e3; if(s.type==="wind"){ const v=windAt(s,t); const pa=pcurve(v,s.cap/s.n*1.0)*s.n; th+=pa; res+=v; } else { const g=irrAt(s,t); th+=Math.min(acCap(s),g/1000*s.capDC*0.86); res+=g/1000; } }
      if(s.notOper){ rows.push({d,e:0,th:0,res:s.type==="wind"?res/24:res,avail:null,loss:[0,0,0,0,0],stopH:0,curtE:0}); return; }
      const fault=th*(0.006+0.03*Math.max(0,r()-0.55)), maint=th*(0.004+0.02*Math.max(0,r()-0.7)), curt=(s.id==="IAP1"||s.id==="IAP2"||s.id==="TTN"||s.id==="VHO")? th*(0.01+0.06*Math.max(0,r()-0.5)) : th*0.004*r(), grid=th*0.006, conv=th*(s.type==="wind"?0.012:0.02);
      const loss=[fault,maint,curt,grid,conv]; const lsum=loss.reduce((a,b)=>a+b,0); e=Math.max(0,th-lsum);
      rows.push({d,e,th,res:s.type==="wind"?res/24:res, avail:clamp(99.6-100*(fault+maint)/Math.max(th,1)*1.6,90,99.9), loss, stopH:(fault+maint)/Math.max(s.cap/s.n,0.1), curtE:curt}); });
    HIST.st[s.id]=rows; });
  return HIST;
}
function histRange(key){ const H=buildHist(); const now=Date.now(); const dm=new Date(now+TZ); let from;
  if(key==="month") from=Date.UTC(dm.getUTCFullYear(),dm.getUTCMonth(),1)-TZ; else if(key==="year") from=Date.UTC(dm.getUTCFullYear(),0,1)-TZ; else if(key==="d30") from=dayStart(now)-29*DAY; else from=dayStart(now)-364*DAY;
  const idx=H.days.map((d,i)=>[d,i]).filter(([d])=>d>=from).map(([,i])=>i); return idx; }

// Downtime & curtailment records
let STOPS=null, CURTS=null;
function buildEvents(){
  if(STOPS) return; const r=rnd(777); const now=Date.now(); STOPS=[]; CURTS=[];
  const causes=[{vi:"Lỗi bộ biến đổi",en:"Converter fault",zh:"变流器故障"},{vi:"Quá nhiệt ổ trục",en:"Bearing over-temperature",zh:"轴承温度高"},{vi:"Bảo trì định kỳ",en:"Scheduled maintenance",zh:"定期维护"},{vi:"Lỗi hệ pitch",en:"Pitch system fault",zh:"变桨系统故障"},{vi:"Thay thế linh kiện",en:"Component replacement",zh:"更换部件"},{vi:"Dừng do gió cắt",en:"High-wind cut-out",zh:"大风切出"},{vi:"Lỗi cách điện DC",en:"DC insulation fault",zh:"直流绝缘故障"},{vi:"Mất lưới",en:"Grid loss",zh:"电网失电"}];
  const iecMap=["FORCED_OUTAGE","FORCED_OUTAGE","SCHED_MAINT","FORCED_OUTAGE","PLANNED_CORR","OUT_OF_ENV","FORCED_OUTAGE","OUT_OF_ELEC_SPEC"];
  for(let i=0;i<64;i++){ const s=STATIONS.filter(x=>!x.notOper)[Math.floor(r()*6)]; const u=s.units[Math.floor(r()*s.n)]; const ci=s.type==="wind"? Math.floor(r()*6) : [0,6,2,7,4][Math.floor(r()*5)];
    const st=now-r()*60*DAY, dur=0.3+r()*r()*40; const ongoing=i<3; STOPS.push({st:s.id,dev:u.id,t0:st,t1:ongoing?null:st+dur*HOUR,dur,planned:ci===2||ci===4,cause:causes[ci],iec:iecMap[ci],loss:dur*unitRated(s,u.id)*(s.type==="wind"?0.32:0.2)}); }
  STOPS.sort((a,b)=>b.t0-a.t0);
  const reasons=[{k:"A0",vi:"Lệnh A0 – nghẽn lưới 110 kV",en:"A0 order – 110 kV congestion",zh:"A0调度指令 – 110kV电网阻塞"},{k:"A2",vi:"Lệnh A2 – kế hoạch phát",en:"A2 order – dispatch schedule",zh:"A2调度指令 – 发电计划"},{k:"PPC",vi:"PPC – giới hạn điện áp điểm đấu nối",en:"PPC – POI voltage limit",zh:"PPC – 并网点电压限制"},{k:"LINE",vi:"Bảo trì đường dây đấu nối",en:"Grid line maintenance",zh:"并网线路检修"}];
  for(let i=0;i<89;i++){ const s=[ST.IAP1,ST.IAP2,ST.TTN,ST.DKH,ST.VHO,ST.IAP1,ST.IAP2][Math.floor(r()*7)]; const rs=reasons[Math.floor(r()*r()*4)]; const t0=now-r()*90*DAY, dur=0.5+r()*7; const set=s.cap*(0.25+r()*0.5), av=Math.min(s.cap, set*(1.2+r()*0.7));
    CURTS.push({st:s.id,t0,t1:i===0?null:t0+dur*HOUR,dur,set,av,src:rs.k==="PPC"?"PPC":rs.k==="LINE"?(S.lang==="zh"?"运行":"Vận hành"):`${rs.k} / IEC104`,reason:rs,e:(av-set)*dur*0.85}); }
  CURTS[0].st="IAP1"; CURTS[0].t0=dayStart(now)+10*HOUR; CURTS[0].set=32; CURTS[0].av=41.6; CURTS[0].reason=reasons[0]; CURTS[0].src="A0 / IEC104";
  CURTS.sort((a,b)=>b.t0-a.t0);
}

// ===================== Users, roles, audit =====================
const PERMS=["overview","station","alarm","ack","analytics","reports","export","sources","users","audit"];
const ROLES={
  admin:  {perm:PERMS.slice(), color:"crit"},
  manager:{perm:["overview","station","alarm","analytics","reports","export"], color:"maint"},
  occ:    {perm:["overview","station","alarm","ack","analytics","reports","export","sources"], color:"acc"},
  plant:  {perm:["overview","station","alarm","ack","analytics","reports"], color:"wind"},
  maint:  {perm:["overview","station","alarm","analytics"], color:"warn"},
  viewer: {perm:["overview"], color:"off"},
};
const SALT="occ-iapech-2026";
// Email one-time code for two-step sign-in. Paste the Web-app URL of tools/mail-otp/Code.gs here
// (it ends with /exec). The script holds the recipient addresses; only account names are sent from the page.
const MAIL_OTP = { url: "", users: ["admin", "manager", "zhang.wei"] };
let USERS=[
  {u:"admin",   name:"Nguyễn Văn An",   role:"admin",  scope:"all", mfa:true,  enabled:true, h:"__H_admin__", last:"14/10/2026 17:42"},
  {u:"manager", name:"Trần Minh Đức",   role:"manager",scope:"all", mfa:true,  enabled:true, h:"__H_manager__", last:"14/10/2026 08:15"},
  {u:"zhang.wei",name:"张伟 (Zhang Wei)",role:"manager",scope:"all", mfa:true,  enabled:true, h:"__H_manager__", last:"13/10/2026 09:30"},
  {u:"occ",     name:"Lê Thị Hương",    role:"occ",    scope:"all", mfa:false, enabled:true, h:"__H_occ__", last:"15/10/2026 06:00"},
  {u:"iapech",  name:"Phạm Quốc Bảo",   role:"plant",  scope:["IAP1","IAP2"], mfa:false, enabled:true, h:"__H_plant__", last:"15/10/2026 07:02"},
  {u:"vinhhao", name:"Đỗ Thanh Tùng",   role:"plant",  scope:["VHO"], mfa:false, enabled:false, h:"__H_plant__", last:"02/09/2026 16:20"},
  {u:"maint",   name:"Hoàng Văn Nam",   role:"maint",  scope:["IAP1","IAP2","TTN","DKH","BTH"], mfa:false, enabled:true, h:"__H_maint__", last:"14/10/2026 13:11"},
  {u:"guest",   name:"Khách tham quan", role:"viewer", scope:"all", mfa:false, enabled:true, h:"__H_guest__", last:"10/10/2026 10:00"},
];
const DEMO_PW={admin:"Admin@2026",manager:"Manager@2026",occ:"Occ@2026",iapech:"Plant@2026",maint:"Maint@2026",guest:"Guest@2026"};
let AUDIT=[];
function audit(action, obj, result="ok", user){ AUDIT.unshift({t:Date.now(), u:user||S.user?.u||"—", a:action, o:obj||"", r:result, ip:"10.20.1."+(20+(hsh((user||S.user?.u||"x").length*7)>0?11:37))}); if(AUDIT.length>400) AUDIT.pop(); }
(function seedAudit(){ const now=Date.now(); const rows=[["occ","a_login","",ok=>"ok",600],["occ","a_ack","TTN · WT15","ok",5],["manager","a_export","KPI 365d","ok",1440],["guest","a_view","users","denied",2900],["iapech","a_login","","ok",420],["admin","a_role","vinhhao → disabled","ok",3*1440],["unknown","a_login","","fail",2*1440],["unknown","a_login","","fail",2*1440-1],["maint","a_ack","DKH · WT11","ok",260],["occ","a_timeout","","ok",900]];
  rows.forEach(([u,a,o,r,m])=>AUDIT.push({t:now-m*60e3,u,a,o,r:typeof r==="function"?"ok":r,ip:"10.20.1."+(30+u.length)})); AUDIT.sort((a,b)=>b.t-a.t); })();
function can(p){ return !!S.user && ROLES[S.user.role].perm.includes(p); }

const PTS_SURVEYED = STATIONS.filter(s=>s.surveyed!==false).reduce((a,s)=>a+s.pts,0); // sites surveyed in 09/2026 (Lập Tốn excluded: HINO SCADA)
const PTS_TOTAL = STATIONS.reduce((a,s)=>a+s.pts,0); // ≈ 26 900
