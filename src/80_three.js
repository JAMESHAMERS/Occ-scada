// ===================== 3D (three.js r160) =====================
const THREE3D = (()=>{
  let T=null, loading=null;
  async function lib(){ if(T) return T; if(!loading) loading=(async()=>{ try{ const [three,oc,c2,rb,re]=await Promise.all([import("three"),import("three/addons/controls/OrbitControls.js"),import("three/addons/renderers/CSS2DRenderer.js"),import("three/addons/geometries/RoundedBoxGeometry.js"),import("three/addons/environments/RoomEnvironment.js")]);
      T=Object.assign({},three,{OrbitControls:oc.OrbitControls,CSS2DRenderer:c2.CSS2DRenderer,CSS2DObject:c2.CSS2DObject,RoundedBoxGeometry:rb.RoundedBoxGeometry,RoomEnvironment:re.RoomEnvironment}); return T; }catch(e){ console.warn("three load failed",e); return null; } })(); return loading; }
  const RM = ()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COL = {ok:0x34D399,warn:0xF5A524,crit:0xF4475E,off:0x6B7C99,maint:0xA88BFF,curt:0x5AA9FF,acc:0x4FA3FF};
  const stCol = st => ({run:COL.ok,limit:COL.curt,fault:COL.crit,maint:COL.maint,comm:COL.off,stop:COL.warn,idle:COL.off})[st]||COL.off;
  const v2n=(x,z,seed)=>{ const xi=Math.floor(x), zi=Math.floor(z), fx=x-xi, fz=z-zi; const u=fx*fx*(3-2*fx), w=fz*fz*(3-2*fz); const h=(a,b)=>hsh(a*73856093^b*19349663^seed*83492791);
    const a=h(xi,zi), b=h(xi+1,zi), c=h(xi,zi+1), d=h(xi+1,zi+1); return a+(b-a)*u+(c-a)*w+(a-b-c+d)*u*w; };
  const fbm2=(x,z,seed)=>v2n(x,z,seed)*0.55+v2n(x*2.1,z*2.1,seed+1)*0.27+v2n(x*4.3,z*4.3,seed+2)*0.13+v2n(x*8.7,z*8.7,seed+3)*0.05;

  // ---------- Stage ----------
  function stage(el, o={}){
    const w=el.clientWidth||600, h=el.clientHeight||400;
    const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,o.maxDpr||2)); renderer.setSize(w,h); renderer.outputColorSpace=T.SRGBColorSpace; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=o.exposure||1.0;
    if(o.shadows){ renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap; }
    el.innerHTML=""; el.appendChild(renderer.domElement); renderer.domElement.style.display="block";
    const scene=new T.Scene(); const camera=new T.PerspectiveCamera(o.fov||40,w/h,o.near||1,o.far||20000);
    let labelR=null; if(o.labels){ labelR=new T.CSS2DRenderer(); labelR.setSize(w,h); Object.assign(labelR.domElement.style,{position:"absolute",inset:"0",pointerEvents:"none"}); el.appendChild(labelR.domElement); }
    const controls=new T.OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=0.07; controls.screenSpacePanning=false;
    let raf=0, last=performance.now(), visible=true, fns=[], disposed=false;
    const io=new IntersectionObserver(es=>{ visible=es[0].isIntersecting; }); io.observe(el);
    const ro=new ResizeObserver(()=>{ const W=el.clientWidth, H=el.clientHeight; if(!W||!H) return; renderer.setSize(W,H); labelR&&labelR.setSize(W,H); camera.aspect=W/H; camera.updateProjectionMatrix(); }); ro.observe(el);
    function loop(now){ raf=requestAnimationFrame(loop); const dt=Math.min(0.05,(now-last)/1000); last=now; if(!visible||document.hidden) return; fns.forEach(f=>f(dt,now/1000)); controls.update(); renderer.render(scene,camera); labelR&&labelR.render(scene,camera); }
    raf=requestAnimationFrame(loop);
    if(/dbg3d/.test(location.hash)) (window.__st3d=window.__st3d||[]).push({camera,controls});   // test hook: camera access for automated visual checks
    // picking
    const ray=new T.Raycaster(), mv=new T.Vector2(); let down=null;
    renderer.domElement.addEventListener("pointerdown",e=>{ down=[e.clientX,e.clientY]; });
    const st={renderer,scene,camera,controls,labelR,el,
      onFrame(f){ fns.push(f); },
      pick(objs, cb){ renderer.domElement.addEventListener("pointerup",e=>{ if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5) return; const r=renderer.domElement.getBoundingClientRect(); mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(mv,camera); const hit=ray.intersectObjects(objs(),true)[0]; if(hit){ let o=hit.object; if(o.userData.pickFn){ const id=o.userData.pickFn(hit.instanceId); if(id!=null) cb(id,o); return; } while(o&&!o.userData.pick) o=o.parent; if(o) cb(o.userData.pick, o); } });
        renderer.domElement.addEventListener("pointermove",e=>{ const r=renderer.domElement.getBoundingClientRect(); mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(mv,camera); const hit=ray.intersectObjects(objs(),true)[0]; renderer.domElement.style.cursor=hit?"pointer":"grab"; }); },
      dispose(){ if(disposed) return; disposed=true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); controls.dispose();
        scene.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ m.map&&m.map.dispose(); m.dispose(); }); } if(o.isCSS2DObject&&o.element) o.element.remove(); });
        renderer.dispose(); renderer.forceContextLoss&&renderer.forceContextLoss(); el.innerHTML=""; } };
    return st;
  }
  function sky(scene, top, horizon, ground){ const g=new T.SphereGeometry(9000,32,16); const m=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(top)},hor:{value:new T.Color(horizon)},gnd:{value:new T.Color(ground)}},
      vertexShader:"varying vec3 vp; void main(){ vp=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
      fragmentShader:"uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; varying vec3 vp; void main(){ float h=vp.y; vec3 c = h>0.0 ? mix(hor,top,pow(h,0.55)) : mix(hor,gnd,pow(-h,0.4)); gl_FragColor=vec4(c,1.0);} "});
    const s=new T.Mesh(g,m); scene.add(s); return s; }
  function lightsFor(scene, ll, ms, o={}){ const sp=solarPos(ll,ms); const day=sp.el>0; const el=Math.max(sp.el,8)*Math.PI/180, az=sp.az*Math.PI/180;
    const dir=new T.Vector3(Math.sin(az)*Math.cos(el), Math.sin(el), -Math.cos(az)*Math.cos(el));
    const hemi=new T.HemisphereLight(day?0xDCEBFF:0x30406A, day?0x4A4030:0x0A0F1A, day?0.9:0.55); scene.add(hemi);
    const sun=new T.DirectionalLight(day?(sp.el<12?0xFFC890:0xFFF4E0):0x9DB4FF, day?(sp.el<12?1.8:2.6):0.55); sun.position.copy(dir.clone().multiplyScalar(o.dist||2500)); scene.add(sun);
    if(o.shadow){ sun.castShadow=true; const c=sun.shadow.camera; const R=o.shadowR||1800; c.left=-R; c.right=R; c.top=R; c.bottom=-R; c.near=10; c.far=(o.dist||2500)*2.2; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.6; }
    const skyM = day? sky(scene, sp.el<12?0x5B7FB8:0x3F86D9, sp.el<12?0xF4C79A:0xBFDDF6, 0x6E6A5E) : sky(scene,0x060B18,0x1A2846,0x05070D);
    if(!day){ scene.fog=new T.Fog(0x101A30,o.fogN||2500,o.fogF||9000); } else scene.fog=new T.Fog(sp.el<12?0xE8C9A8:0xC9DDF0,o.fogN||3000,o.fogF||9000);
    return {sun,hemi,day,sp,dir,skyM}; }

  // ---------- Turbine model ----------
  function bladeGeo(R){ const N=30, M=20, pos=[], idx=[];
    for(let i=0;i<=N;i++){ const s=i/N, r=s*R; const c = s<0.05? 2.5 : s<0.22? 2.5+1.9*((s-0.05)/0.17) : 0.5+3.9*Math.pow((1-s)/0.78,1.2);
      const tr = s<0.05? 1.0 : s<0.32? 1.0-0.76*((s-0.05)/0.27) : 0.24-0.12*((s-0.32)/0.68); const tw=(s<0.22?13:13*(1-(s-0.22)/0.78))*Math.PI/180;
      for(let j=0;j<M;j++){ const a=j/M*Math.PI*2; let x=Math.cos(a)*0.5*c - (s<0.05?0:c*0.12), y=Math.sin(a)*0.5*c*tr; y*= y>0?1.25:0.72; const xr=x*Math.cos(tw)-y*Math.sin(tw), yr=x*Math.sin(tw)+y*Math.cos(tw); pos.push(yr, r, xr); } }
    for(let i=0;i<N;i++) for(let j=0;j<M;j++){ const a=i*M+j, b=i*M+(j+1)%M, c=(i+1)*M+j, d=(i+1)*M+(j+1)%M; idx.push(a,c,b,b,c,d); }
    const tip=pos.length/3; pos.push(0,R+0.3,0); for(let j=0;j<M;j++) idx.push(N*M+j, tip, N*M+(j+1)%M);
    const g=new T.BufferGeometry(); g.setAttribute("position",new T.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  const geoCache={};
  let TWM=null; const TW=()=>TWM||(TWM=TWIN_MODELS(T,{COL,stCol,label:(h,c)=>label(h,c),bladeGeo:R=>geoCache["b"+R] ||= bladeGeo(R)}));
  function animTurbine(g, dt, rpm, pitchDeg, yawRad, time){ const r=g.userData.refs; g.userData.rpm += (rpm-g.userData.rpm)*Math.min(1,dt*0.8); r.rotor.rotation.x -= g.userData.rpm*2*Math.PI/60*dt;
    g.userData.pitch += (pitchDeg-g.userData.pitch)*Math.min(1,dt*1.5); r.pitchG.forEach(p=>p.rotation.y=g.userData.pitch*Math.PI/180);
    if(yawRad!=null){ let d=yawRad-r.yawG.rotation.y; d=Math.atan2(Math.sin(d),Math.cos(d)); r.yawG.rotation.y+=d*Math.min(1,dt*0.4); }
    r.av.material.emissiveIntensity = (Math.floor(time*1.0)%2===0)? 3 : 0.1;
    if(r.lowSpd) r.lowSpd.rotation.x=r.rotor.rotation.x;
    if(r.hss){ const w=Math.min(g.userData.rpm*112, 150)*2*Math.PI/60; r.hss.rotation.x-=w*dt; }
    if(r.fans) r.fans.forEach((f,i)=>f.rotation.y+=dt*(4+2*(i%2))*(g.userData.rpm>0.5?1:0.25)); }
  function label(html, cls="lbl3d"){ const d=document.createElement("div"); d.className=cls; d.innerHTML=html; liveEl(d); const o=new T.CSS2DObject(d); return o; }

  // ---------- Wind farm ----------
  function buildWindFarm(st, s, o={}){
    const {scene}=st; const seed=s.seed; const nf_=s.feeders.length; const spacing=360, rowGap=620;
    const L0=LIVE.st[s.id]; const lt=lightsFor(scene,s.ll,o.time||Date.now(),{shadow:true,shadowR:2200,dist:3000});
    // turbine layout on ridges
    const pos={}; s.feeders.forEach(([f,ids],fi)=>{ const z0=(fi-(nf_-1)/2)*rowGap; ids.forEach((id,j)=>{ const x=(j-(ids.length-1)/2)*spacing + 60*hsh(fi*11+j); const z=z0+70*Math.sin(j*1.3+fi)+40*hsh(fi*7+j*3); pos[id]=[x,z]; }); });
    const ridge=(x,z)=>{ let m=0; Object.values(pos).forEach(([px,pz])=>{ const d2=((x-px)**2+(z-pz)**2)/(260*260); m=Math.max(m,Math.exp(-d2)); }); return m; };
    const SZ=4200, SEG=150; const tg=new T.PlaneGeometry(SZ,SZ,SEG,SEG); tg.rotateX(-Math.PI/2); const p=tg.attributes.position; const cols=[];
    const hAt=(x,z)=>{ const n=fbm2(x/900,z/900,seed); const r=ridge(x,z); return 85*n + 55*r + 20*fbm2(x/250,z/250,seed+9); };
    const cG1=new T.Color(0x47703A), cG2=new T.Color(0x5F8A45), cSoil=new T.Color(0x7E4A30), cDry=new T.Color(0xA4864F), tmp=new T.Color();
    for(let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i); const h=hAt(x,z); p.setY(i,h); const n=fbm2(x/300,z/300,seed+5), n2=fbm2(x/120,z/120,seed+6);
      tmp.copy(cG1).lerp(cG2,clamp(0.5+n2,0,1)); if(n>0.22) tmp.lerp(cSoil,clamp((n-0.22)*2.4,0,0.6)); if(h>95) tmp.lerp(cDry,clamp((h-95)/60,0,0.5)); const edge=Math.max(Math.abs(x),Math.abs(z))/(SZ/2); tmp.multiplyScalar(1-0.25*edge); cols.push(tmp.r,tmp.g,tmp.b); }
    tg.setAttribute("color",new T.Float32BufferAttribute(cols,3)); tg.computeVertexNormals();
    const ground=new T.Mesh(tg,new T.MeshStandardMaterial({vertexColors:true,roughness:0.95,metalness:0})); ground.receiveShadow=true; scene.add(ground);
    // roads along feeders
    const roadMat=new T.MeshStandardMaterial({color:0xB59873,roughness:1});
    s.feeders.forEach(([f,ids])=>{ const pts=ids.map(id=>{ const [x,z]=pos[id]; return new T.Vector3(x,0,z+26); }); if(pts.length<2) return; const c=new T.CatmullRomCurve3(pts); const N=90, Wd=7; const vs=[], ix=[];
      for(let i=0;i<=N;i++){ const p0=c.getPoint(i/N), tg2=c.getTangent(i/N); const nx=-tg2.z, nz=tg2.x, ln=Math.hypot(nx,nz)||1; [-1,1].forEach(sg=>{ const x=p0.x+sg*nx/ln*Wd/2, z=p0.z+sg*nz/ln*Wd/2; vs.push(x,hAt(x,z)+0.9,z); }); if(i<N){ const a=i*2; ix.push(a,a+1,a+2,a+1,a+3,a+2); } }
      const rg=new T.BufferGeometry(); rg.setAttribute("position",new T.Float32BufferAttribute(vs,3)); rg.setIndex(ix); rg.computeVertexNormals(); const rm=new T.Mesh(rg,roadMat); rm.receiveShadow=true; roadMat.side=T.DoubleSide; scene.add(rm); });
    // substation
    const sub=new T.Group(); const sx=0, sz=(nf_/2)*rowGap+240; const sh=hAt(sx,sz); sub.position.set(sx,sh,sz);
    const bld=new T.Mesh(new T.BoxGeometry(46,9,16),new T.MeshStandardMaterial({color:0xE9ECEF,roughness:0.7})); bld.position.set(-40,4.5,0); bld.castShadow=true; sub.add(bld);
    const roof=new T.Mesh(new T.BoxGeometry(48,1,18),new T.MeshStandardMaterial({color:0x9C3B2F,roughness:0.8})); roof.position.set(-40,9.5,0); sub.add(roof);
    const pad=new T.Mesh(new T.BoxGeometry(70,0.6,50),new T.MeshStandardMaterial({color:0xB8B4AA,roughness:1})); pad.position.set(25,0.3,0); pad.receiveShadow=true; sub.add(pad);
    const tr=new T.Mesh(new T.BoxGeometry(10,8,7),new T.MeshStandardMaterial({color:0x6C7480,metalness:0.4,roughness:0.5})); tr.position.set(25,4.5,0); tr.castShadow=true; sub.add(tr);
    for(let i=0;i<4;i++){ const gn=new T.Mesh(new T.CylinderGeometry(0.4,0.4,16,8),new T.MeshStandardMaterial({color:0x9AA3AE,metalness:0.6})); gn.position.set(5+i*12,8,-18); sub.add(gn); }
    scene.add(sub); const subL=label(`<b>TBA ${s.kv}</b>`); subL.position.set(sx,sh+30,sz); if(o.labels!==false) scene.add(subL);
    // met mast
    const mm=new T.Mesh(new T.CylinderGeometry(0.4,0.6,100,6),new T.MeshStandardMaterial({color:0xC0C6CE,metalness:0.6})); const mx=-((s.feeders[0][1].length)/2)*spacing-200; mm.position.set(mx,hAt(mx,0)+50,0); scene.add(mm);
    // turbines
    const tbs={}; const R=s.rotor||156;
    s.units.forEach((u,i)=>{ const [x,z]=pos[u.id]; const g=TW().windTurbine({hub:s.hubH||110,rotor:(s.modelOf&&s.modelOf(u.id).includes("140"))?140:R,detail:false}); g.position.set(x,hAt(x,z)-0.5,z); g.userData.pick=u.id; scene.add(g); tbs[u.id]=g;
      if(o.labels!==false){ const lb=label(""); lb.position.set(0,(s.hubH||110)+R/2+14,0); g.add(lb); g.userData.lbl=lb; lb.element.addEventListener("click",()=>st.onPickCb&&st.onPickCb(u.id)); } });
    // wind particles
    const NP=900; const pg=new T.BufferGeometry(); const pp=new Float32Array(NP*3); for(let i=0;i<NP;i++){ pp[i*3]=(Math.random()-0.5)*3600; pp[i*3+1]=60+Math.random()*260; pp[i*3+2]=(Math.random()-0.5)*3600; } pg.setAttribute("position",new T.BufferAttribute(pp,3));
    const pts=new T.Points(pg,new T.PointsMaterial({color:0xffffff,size:3.2,transparent:true,opacity:lt.day?0.35:0.22,depthWrite:false})); scene.add(pts);
    const hemiExtra=new T.AmbientLight(0xffffff,lt.day?0.08:0.12); scene.add(hemiExtra);
    st.camera.position.set(1050,470,1350); st.controls.target.set(0,130,80); st.controls.maxPolarAngle=Math.PI*0.48; st.controls.minDistance=250; st.controls.maxDistance=5200;
    const time0=performance.now();
    st.onFrame((dt,time)=>{ const L1=LIVE.st[s.id]; const dir=(L1.dir??250)*Math.PI/180; const yaw=Math.PI/2-dir; const ws=L1.v||5;
      s.units.forEach((u,i)=>{ const g=tbs[u.id]; const lu=L1.units[i]; const d=unitDerived(s,lu,i); animTurbine(g,dt,RM()?0:(d.rpm||0),d.pitch||0,yaw,time); const rg=g.userData.refs.ring; rg.material.opacity = lu.st==="fault"? 0.35+0.25*Math.sin(time*4) : lu.st==="maint"? 0.3 : 0; rg.material.color.setHex(lu.st==="maint"?COL.maint:COL.crit); });
      const vx=-Math.sin(dir)*ws*18*dt, vz=Math.cos(dir)*ws*18*dt; const a=pg.attributes.position.array; for(let i=0;i<NP;i++){ a[i*3]+=vx; a[i*3+2]+=vz; if(a[i*3]>1800) a[i*3]-=3600; if(a[i*3]<-1800) a[i*3]+=3600; if(a[i*3+2]>1800) a[i*3+2]-=3600; if(a[i*3+2]<-1800) a[i*3+2]+=3600; } pg.attributes.position.needsUpdate=true;
      if(o.autoRotate){ const tt=0.6+(performance.now()-time0)/1000*0.03; const r=1500; st.camera.position.set(Math.cos(tt)*r, 330, Math.sin(tt)*r); st.controls.target.set(0,150,0); }
    });
    function update(){ const L1=LIVE.st[s.id]; s.units.forEach((u,i)=>{ const g=tbs[u.id]; const lu=L1.units[i]; if(g.userData.lbl){ const c="#"+stCol(lu.st).toString(16).padStart(6,"0"); g.userData.lbl.element.innerHTML=`<i style="background:${c}"></i><b>${u.id}</b><span>${lu.p==null||lu.st==="comm"?"—":nf(lu.p*1000,0)+" kW"}</span>`; } }); }
    update(); st.pick(()=>Object.values(tbs), id=>st.onPickCb&&st.onPickCb(id));
    return {update, tbs, lt, hAt};
  }

  // ---------- Health colors ----------
  function applyHealth(root, H, sel, time){ root.traverse(o=>{ const c=o.userData.comp; if(!c||!o.material||!H||o.userData.cover||!("emissiveIntensity" in o.material)) return; const x=H[c]; 
      if(!x){ o.material.emissive.setHex(0); return; } let col= x.lvl==="bad"?COL.crit : x.lvl==="watch"?COL.warn : 0x000000; let inten= x.lvl==="bad"? 0.55+0.35*Math.sin(time*5) : x.lvl==="watch"? 0.45 : 0; if(sel===c){ col= col||COL.acc; inten=Math.max(inten,0.5+0.3*Math.sin(time*6)); } o.material.emissive.setHex(col); o.material.emissiveIntensity=inten; }); }

  // ---------- Public: station scene ----------
  async function station(el, s){ const ok=await lib(); if(!ok){ el.innerHTML=`<div class="twin-load">${t("fail3d")}</div>`; return null; } if(!el.isConnected) return null;
    const st=stage(el,{shadows:true,labels:true,far:16000,fov:38,maxDpr:1.5}); let b;
    if(s.type==="wind") b=buildWindFarm(st,s);
    else { try{ const pm=new T.PMREMGenerator(st.renderer); st.scene.environment=pm.fromScene(new T.RoomEnvironment(st.renderer),0.04).texture; pm.dispose(); }catch(e){}
      const SS=SOLAR_SITES(T,{lightsFor,label,COL,stCol,fbm2,TW,RM}); b= s.type==="solar"? SS.farm(st,s) : SS.rooftop(st,s); }
    // HUD
    const hud=liveEl(document.createElement("div")); hud.className="twin-hud"; el.appendChild(hud);
    const ctl=document.createElement("div"); ctl.className="twin-ctl"; el.appendChild(ctl);
    let showL=true; const renderHud=()=>{ const L1=LIVE.st[s.id]; const sp=b.lt.sp; hud.innerHTML= s.type==="wind"? `<span class="chip">${ic("wind","sm")}${s.notOper?"—":t("windDir",{d:Math.round(L1.dir)})+" · "+nf(L1.v,1)+" m/s"}</span><span class="chip">${ic("pin","sm")}${s.ll[1].toFixed(3)}°N ${s.ll[0].toFixed(3)}°E</span>` : `<span class="chip">${ic("sun","sm")}${(st.sunInfo||sp).el>0? t("sunPos",{e:nf((st.sunInfo||sp).el,1),a:nf((st.sunInfo||sp).az,0)}) : t("night")}</span><span class="chip">${ic("pin","sm")}${s.ll[1].toFixed(3)}°N ${s.ll[0].toFixed(3)}°E</span>`; };
    const solar=s.type!=="wind";
    ctl.innerHTML=(solar?`<div class="seg"><button data-k="heat" aria-pressed="false">${t("heatMap")}</button><button data-k="flow" aria-pressed="false">${t("powerFlow")}</button></div>`:"")+`<div class="seg">${solar?`<button data-k="lapse" aria-pressed="false">${t("timelapse")}</button>`:""}<button data-k="lbl" aria-pressed="true">${t("labels")}</button></div>`;
    const leg=document.createElement("div"); leg.className="twin-leg"; leg.hidden=true; el.appendChild(leg);
    const setLeg=()=>{ const hOn=ctl.querySelector('[data-k="heat"]')?.getAttribute("aria-pressed")==="true", fOn=ctl.querySelector('[data-k="flow"]')?.getAttribute("aria-pressed")==="true";
      leg.hidden=!(hOn||fOn); leg.innerHTML=(hOn?`<span class="faint">${t("heatMap")}</span><span>${t("hmLow")}</span><i style="width:90px;height:8px;background:linear-gradient(90deg,hsl(7,85%,55%),hsl(60,85%,55%),hsl(126,85%,55%))"></i><span>${t("hmHigh")}</span><span><i style="width:8px;height:8px;background:#F4475E"></i>${t("st_fault")}</span><span><i style="width:8px;height:8px;background:#8892A0"></i>${t("st_comm")}</span>`:"")
        +(fOn?`<span class="faint">${t("powerFlow")}</span>${s.type==="roof"?`<span><i style="background:#36C5F0"></i>AC 0,4 kV</span>`:""}<span><i style="background:#B48CFF"></i>MV ${s.type==="roof"?"22":"22–35"} kV</span>`:""); };
    ctl.onclick=e=>{ const bt=e.target.closest("button"); if(!bt) return; const on=bt.getAttribute("aria-pressed")!=="true"; bt.setAttribute("aria-pressed",on); const k=bt.dataset.k;
      if(k==="lbl"){ showL=on; st.labelR.domElement.style.display=on?"":"none"; } else if(k==="heat"){ b.setHeat&&b.setHeat(on); } else if(k==="flow"){ b.setFlow&&b.setFlow(on); } else b.setLapse&&b.setLapse(on); setLeg(); };
    renderHud(); const iv=setInterval(renderHud,1000);
    const api={ update(){ b.update(); }, dispose(){ clearInterval(iv); st.dispose(); }, set onPick(f){ st.onPickCb=f; } };
    return api; }

  // ---------- Public: single unit (drawer / Digital Twin) ----------
  // Detailed engineering model with three views: exterior, cutaway (enclosure cut along its
  // centre line) and exploded (components pulled apart). Callouts show live values.
  const CALLOUTS = {
    wind: ["hubPitch","blades","mainBear","gearbox","brakeHyd","generator","cooling","converter","yaw"],
    solar: ["pvArr","dcIn","igbtMod","dcLink","filter","acOut","fans","trafo"],
    roof: ["pvArr","dcIn","dcLink","igbtMod","filter","acOut","fans"] };
  const EXKEY = { hubPitch:"rotor", blades:"rotor", brakeHyd:"hss" };
  const INSIDE = new Set(["mainBear","gearbox","brakeHyd","generator","cooling","converter","dcIn","igbtMod","dcLink","filter","acOut","cabinet"]);
  async function unit(el, s, uid, idx, o={}){ const ok=await lib(); if(!ok){ el.innerHTML=`<div class="twin-load">${t("fail3d")}</div>`; return null; } if(!el.isConnected) return null;
    const isW=s.type==="wind", central=s.type==="solar", hubH=s.hubH||110;
    const st=stage(el,{shadows:true,labels:!!o.twin,far:20000,fov:o.twin?34:36,near:0.03,exposure:1.0}); const {scene,renderer,camera,controls}=st; renderer.localClippingEnabled=true;
    const close = !!o.twin || !isW;
    const lt=lightsFor(scene,s.ll,Date.now(),{shadow:true,shadowR:isW?(close?16:140):(central?26:9),dist:isW?400:120,fogN:isW?900:central?140:90,fogF:isW?5000:central?900:700});
    if(isW&&close){ lt.sun.target.position.set(-3,hubH,0); lt.sun.position.add(new T.Vector3(-3,hubH,0)); scene.add(lt.sun.target); lt.sun.shadow.bias=-0.0002; lt.sun.shadow.normalBias=0.02; lt.sun.shadow.mapSize.set(2048,2048); }
    else if(!isW){ lt.sun.shadow.bias=-0.0002; lt.sun.shadow.normalBias=0.02; }
    // image-based lighting for believable metal, paint and glass
    try{ const pm=new T.PMREMGenerator(renderer); const env=pm.fromScene(new T.RoomEnvironment(renderer),0.04).texture; scene.environment=env; pm.dispose(); }catch(e){}
    const M=TW(); let model;
    if(isW){ const r=(s.modelOf&&s.modelOf(uid).includes("140"))?140:(s.rotor||156); model=M.windTurbine({hub:hubH,rotor:r,detail:true});
      const gc=document.createElement("canvas"); gc.width=gc.height=256; const gx=gc.getContext("2d"); gx.fillStyle="#557A3E"; gx.fillRect(0,0,256,256); for(let i=0;i<9000;i++){ gx.fillStyle=Math.random()<0.5?"rgba(40,70,30,.5)":"rgba(140,170,90,.35)"; gx.fillRect(Math.random()*256,Math.random()*256,1.5,1.5); }
      const gt=new T.CanvasTexture(gc); gt.wrapS=gt.wrapT=T.RepeatWrapping; gt.repeat.set(120,120); gt.colorSpace=T.SRGBColorSpace;
      const gr=new T.Mesh(new T.CircleGeometry(900,64),new T.MeshStandardMaterial({map:gt,roughness:1})); gr.rotation.x=-Math.PI/2; gr.receiveShadow=true; scene.add(gr);
      const pad=new T.Mesh(new T.CircleGeometry(16,40),new T.MeshStandardMaterial({color:0xB9AE97,roughness:1})); pad.rotation.x=-Math.PI/2; pad.position.y=0.03; pad.receiveShadow=true; scene.add(pad); }
    else model= central? M.solarCentral(s) : M.solarString(s);
    scene.add(model); model.updateMatrixWorld(true); const R=model.userData.refs;
    // camera presets
    const PRE = isW ? { close:[[-8,hubH+7,25],[-3.2,hubH+0.3,0]], exp:[[-3,hubH+12.5,38],[-1.8,hubH+3.6,0]], full:[[190,105,225],[0,92,0]] }
      : central ? { close:[[3.0,2.9,8.6],[-0.7,1.35,0]], exp:[[4.2,4.4,11.2],[-0.5,1.9,0.6]], full:[[18,11,24],[0,1,-6]] }
      : { close:[[1.25,1.55,2.35],[0.05,1.15,0]], exp:[[1.7,1.9,3.0],[0.1,1.25,0.25]], full:[[5.5,3.6,7.5],[0,1,-2.5]] };
    const setCam=(k)=>{ camera.position.set(...PRE[k][0]); controls.target.set(...PRE[k][1]); };
    setCam(o.twin? "close" : isW? "full" : "close");
    if(isW){ controls.minDistance=3; controls.maxDistance=900; controls.maxPolarAngle=Math.PI*0.495; } else { controls.minDistance=0.6; controls.maxDistance=central?80:30; controls.maxPolarAngle=Math.PI*0.49; }
    let tween=null; const goCam=(pos,tgt,dur=0.9)=>{ tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new T.Vector3(...pos),t1:new T.Vector3(...tgt),s:performance.now(),dur}; };
    // enclosure clipping plane (cutaway) – kept on the equipment's own centre line as it yaws
    const plane=new T.Plane(); const coverMats=new Set(); model.traverse(x=>{ if(x.isMesh&&x.userData.cover){ (Array.isArray(x.material)?x.material:[x.material]).forEach(m=>coverMats.add(m)); } });
    coverMats.forEach(m=>{ m.clipShadows=true; m.userData.op=m.opacity; });
    const qv=new T.Quaternion(), pv=new T.Vector3(), nv=new T.Vector3();
    const updPlane=()=>{ const f=R.clip.frame; f.updateMatrixWorld(); nv.set(...R.clip.normal).applyQuaternion(f.getWorldQuaternion(qv)); pv.set(...R.clip.point).applyMatrix4(f.matrixWorld); plane.setFromNormalAndCoplanarPoint(nv,pv); };
    // exploded view bookkeeping
    const exBase={}; Object.entries(R.explodeObj||{}).forEach(([k,ob])=>exBase[k]=ob.position.clone());
    let mode="ext", kE=0, lastF=0;
    const setMode=(m,cam=true)=>{ mode=m; coverMats.forEach(mt=>{ mt.clippingPlanes = m==="cut"? [plane] : []; mt.needsUpdate=true; });
      if(cam&&o.twin) goCam(...(m==="exp"? PRE.exp : PRE.close)); if(ctl) ctl.querySelectorAll("[data-m]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===m)); };
    // ---- HUD, controls, callouts
    const hud=liveEl(document.createElement("div")); hud.className="twin-hud"; el.appendChild(hud);
    let ctl=null, showL=true, full=false; const callouts={};
    if(o.twin){ ctl=document.createElement("div"); ctl.className="twin-ctl";
      ctl.innerHTML=`<div class="seg">${[["ext","vExt"],["cut","vCut"],["exp","vExp"]].map(([k,l])=>`<button data-m="${k}" aria-pressed="${k==="ext"}">${t(l)}</button>`).join("")}</div><div class="seg"><button data-k="full" aria-pressed="false">${t("vFull")}</button><button data-k="lbl" aria-pressed="true">${t("labels")}</button></div>`;
      el.appendChild(ctl);
      ctl.onclick=e=>{ const b=e.target.closest("button"); if(!b) return; if(b.dataset.m){ setMode(b.dataset.m); full=false; ctl.querySelector('[data-k="full"]').setAttribute("aria-pressed","false"); return; }
        if(b.dataset.k==="lbl"){ showL=!showL; b.setAttribute("aria-pressed",showL); st.labelR.domElement.style.display=showL?"":"none"; }
        if(b.dataset.k==="full"){ full=!full; b.setAttribute("aria-pressed",full); goCam(...(full? PRE.full : mode==="exp"? PRE.exp : PRE.close), 1.2); } };
      if(!isW){ const lg=document.createElement("div"); lg.className="twin-leg"; lg.innerHTML=`<span><i style="background:#FFB020"></i>DC</span><span><i style="background:#36C5F0"></i>AC 0,4 kV</span>${central?`<span><i style="background:#B48CFF"></i>MV 22 kV</span>`:""}<span class="faint">${t("powerFlow")}</span>`; el.appendChild(lg); }
      const list=CALLOUTS[isW?"wind":central?"solar":"roof"];
      list.forEach(c=>{ const grp=R.parts[c]; if(!grp) return; const exk=EXKEY[c]||c; const ob=(R.explodeObj||{})[exk];
        const frame = ob? ob.parent : (R.clip.frame); const v=new T.Vector3(...(R.anchors[c]||[0,1,0])); grp.localToWorld(v); frame.worldToLocal(v);
        const lb=label("","lbl3d call"); lb.position.copy(v); frame.add(lb); lb.userData.base=v.clone(); lb.userData.ex=exk;
        lb.element.addEventListener("click",()=>{ api.focus(c); api.onComp&&api.onComp(c); }); callouts[c]=lb; });
    }
    const hx=c=>"#"+c.toString(16).padStart(6,"0");
    const val=(c,u,d)=>{ const na=u.st==="comm"; if(na) return "—"; const load=u.r? Math.max(0,(u.p||0)/u.r):0;
      if(isW){ switch(c){ case "hubPitch": return nf(d.pitch,1)+"°"; case "blades": return d.rpm==null?"—":nf(d.rpm,1)+" rpm"; case "mainBear": return nf(d.amb+9+11*load,1)+" °C";
        case "gearbox": return nf(d.gbT,1)+" °C"; case "brakeHyd": return (d.rpm||0)>0.5? t("brakeRel") : t("brakeOn"); case "generator": return nf(d.genT,1)+" °C · "+nf((d.rpm||0)*112,0)+" rpm";
        case "cooling": return nf(d.nacT,1)+" °C"; case "converter": return nf((u.p||0)*1000,0)+" kW"; case "yaw": return nf(d.yaw||0,1)+"°"; } }
      const kv=central?0.315:0.4; switch(c){ case "pvArr": return nf(d.g,0)+" W/m²"; case "dcIn": case "dcLink": return nf(d.dcV,0)+" V"; case "igbtMod": return nf(d.igbt,1)+" °C";
        case "filter": return nf((u.p||0)*1000/(Math.sqrt(3)*kv),0)+" A"; case "acOut": return nf((u.p||0)*1000,1)+" kW"; case "fans": return nf(load>0.02? 35+60*load : 0,0)+" %"; case "trafo": return nf(d.amb+12+28*load,1)+" °C"; }
      return ""; };
    let H=null, sel=null;
    const renderHud=()=>{ const u=LIVE.st[s.id].units[idx]; const d=unitDerived(s,u,idx);
      hud.innerHTML=`<span class="chip"><i class="dot" style="background:${hx(stCol(u.st))}"></i>${uid} · ${t("st_"+u.st)}</span>`+(isW?`<span class="chip">${ic("rot","sm")}${d.rpm==null?"—":nf(d.rpm,1)} rpm</span><span class="chip">${ic("sliders","sm")}${nf(d.pitch,1)}°</span><span class="chip">${ic("zap","sm")}${u.st==="comm"?"—":nf((u.p||0)*1000,0)} kW</span>`:`<span class="chip">${ic("zap","sm")}${u.st==="comm"?"—":nf((u.p||0)*1000,1)} kW</span><span class="chip">${ic("thermo","sm")}IGBT ${nf(d.igbt,1)} °C</span>`);
      Object.entries(callouts).forEach(([c,lb])=>{ const x=H&&H[c]; const col= x? (x.lvl==="bad"?COL.crit:x.lvl==="watch"?COL.warn:COL.ok) : COL.ok;
        lb.element.className="lbl3d call"+(sel===c?" on":"")+(x&&x.lvl!=="good"?" "+x.lvl:""); lb.element.innerHTML=`<i style="background:${hx(col)}"></i><b>${t(c)}</b><span>${val(c,u,d)}</span>`; }); };
    renderHud(); const iv=setInterval(renderHud,1000);
    // ---- picking (ignores enclosures while they are cut away or lifted off)
    if(o.twin){ const ray=new T.Raycaster(), mv=new T.Vector2(); let dn=null; const cvs=renderer.domElement;
      cvs.addEventListener("pointerdown",e=>dn=[e.clientX,e.clientY]);
      cvs.addEventListener("pointerup",e=>{ if(!dn||Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>5) return; const r=cvs.getBoundingClientRect(); mv.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(mv,camera);
        const hits=ray.intersectObject(model,true).filter(h=>h.object.visible&&(h.object.userData.comp||h.object.userData.cover)&&!(mode!=="ext"&&h.object.userData.cover));
        const h=hits[0]; if(!h) return; if(h.object.userData.cover){ if(!isW){ api.focus("cabinet"); api.onComp&&api.onComp("cabinet"); } return; }
        const c=h.object.userData.comp; api.focus(c); api.onComp&&api.onComp(c); }); }
    // ---- per-frame animation
    const ease=x=>x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2; const tmp=new T.Vector3();
    st.onFrame((dt,time)=>{ const L1=LIVE.st[s.id]; const u=L1.units[idx]; const load=u.r? Math.max(0,(u.p||0)/u.r):0; const run=u.st!=="comm"&&(u.p||0)>0;
      if(isW){ const d=unitDerived(s,u,idx); animTurbine(model,dt,RM()?0:(d.rpm||0),d.pitch||0,(d.yaw||0)*Math.PI/180,time); if(R.vane) R.vane.rotation.y=Math.sin(time*0.7)*0.08; }
      else { R.fans.forEach((f,i)=>f.rotation.y+=dt*(run? 6+16*load : 0.4)*(RM()?0:1)); const c=stCol(u.st); (R.leds||[]).forEach(l=>{ l.material.color.setHex(c); l.material.emissive.setHex(c); l.material.emissiveIntensity= u.st==="fault"? (Math.sin(time*6)>0?2.5:0.2) : 2; });
        R.flows.forEach(f=>{ const on=run&&(f.kind!=="dc"||(LIVE.st[s.id].g||0)>15); f.tex.offset.x-= dt*(on? (0.5+1.8*load) : 0)*(RM()?0:1); f.mesh.material.opacity= on? 0.95 : 0.12; f.mesh.visible=!!o.twin||on; }); }
      // exploded / assembled
      const tgtE= mode==="exp"?1:0; const now=performance.now(); kE+= (tgtE-kE)*Math.min(1,(now-(lastF||now))/1000*3.2); lastF=now; const e=ease(clamp(kE,0,1));
      Object.entries(R.explodeObj||{}).forEach(([k,ob])=>{ const off=R.explodable[k]; if(!off) return; ob.position.set(exBase[k].x+off[0]*e, exBase[k].y+off[1]*e, exBase[k].z+off[2]*e); });
      coverMats.forEach(m=>{ const op= 1-0.86*e; m.transparent= op<0.999; m.opacity=op*(m.userData.op??1); m.depthWrite= op>0.98; });
      Object.values(callouts).forEach(lb=>{ const off=(R.explodable||{})[lb.userData.ex]; lb.position.copy(lb.userData.base); if(off) lb.position.add(tmp.set(off[0]*e,off[1]*e,off[2]*e)); });
      if(mode==="cut") updPlane();
      if(tween){ tween.k=Math.min(1,(performance.now()-tween.s)/1000/tween.dur); const k=ease(tween.k); camera.position.lerpVectors(tween.p0,tween.p1,k); controls.target.lerpVectors(tween.t0,tween.t1,k); if(tween.k>=1) tween=null; }
      if(H) applyHealth(model,H,sel,time); });
    const api={ dispose(){ clearInterval(iv); st.dispose(); }, setHealth(h){ H=h; renderHud(); },
      focus(c){ sel=c; renderHud(); if(!c||!o.twin) return; if(INSIDE.has(c)&&mode==="ext") setMode("cut",false);
        const bb=new T.Box3(); model.updateMatrixWorld(true); model.traverse(x=>{ if(x.isMesh&&x.userData.comp===c&&!x.userData.cover) bb.expandByObject(x); }); if(bb.isEmpty()) return;
        const ctr=bb.getCenter(new T.Vector3()), sz=bb.getSize(new T.Vector3()).length(); const dir=camera.position.clone().sub(controls.target).normalize();
        if(isW&&(c==="blades"||c==="tower")){ goCam(PRE.full[0],PRE.full[1],1.2); return; }
        const dist=clamp(sz*1.5, isW?7:central?2.4:0.7, isW?60:central?30:6); goCam([ctr.x+dir.x*dist, ctr.y+dir.y*dist, ctr.z+dir.z*dist],[ctr.x,ctr.y,ctr.z]); },
      onComp:null };
    return api; }

  // ---------- Public: 3D map ----------
  async function map(el, o={}){ const ok=await lib(); if(!ok||!window.d3||!window.GEO){ el.innerHTML=`<div class="twin-load">${t("fail3d")}</div>`; return null; } if(!el.isConnected) return null;
    const st=stage(el,{labels:true,far:30000,fov:36,exposure:1.05}); const {scene}=st; const dark=isDark();
    scene.background=new T.Color(dark?0x081222:0xDCE8F5); scene.fog=new T.Fog(dark?0x081222:0xDCE8F5,9000,22000);
    scene.add(new T.HemisphereLight(0xffffff,dark?0x334466:0x99AABB,dark?1.5:1.1)); const dl=new T.DirectionalLight(0xffffff,dark?1.2:1.6); dl.position.set(-2000,4000,3000); scene.add(dl);
    const pr=d3.geoMercator().center([108,15.5]).scale(16000).translate([0,0]); const P=ll=>{ const p=pr(ll); return [p[0],p[1]]; };
    const mkShape=ring=>{ const sh=new T.Shape(); ring.forEach((c,i)=>{ const [x,y]=P(c); i?sh.lineTo(x,-y):sh.moveTo(x,-y); }); return sh; };
    const polys=g=> g.type==="Polygon"? [g.coordinates] : g.type==="MultiPolygon"? g.coordinates : [];
    const extr=(f,depth,mat,y0)=>{ polys(f.geometry).forEach(poly=>{ const sh=mkShape(poly[0]); poly.slice(1).forEach(h=>sh.holes.push(mkShape(h))); const geo=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:false,curveSegments:1}); const m=new T.Mesh(geo,mat); m.rotation.x=-Math.PI/2; m.position.y=y0; m.userData.prov=f.properties.p; scene.add(m); }); };
    const sea=new T.Mesh(new T.PlaneGeometry(60000,60000),new T.MeshStandardMaterial({color:dark?0x0C1A30:0xC5D8EE,roughness:0.9})); sea.rotation.x=-Math.PI/2; sea.position.y=-2; scene.add(sea);
    const nbM=new T.MeshStandardMaterial({color:dark?0x152034:0xE8ECF1,roughness:1}); GEO.nb.features.forEach(f=>extr(f,6,nbM,0));
    const withP={IAP1:"Gia Lai",IAP2:"Gia Lai",TTN:"Quảng Ngãi",DKH:"Lâm Đồng",BTH:"Lâm Đồng",VHO:"Lâm Đồng",LXS:"Bắc Ninh"}; const hiSet=new Set(scopeIds().map(i=>withP[i]));
    const side=new T.MeshStandardMaterial({color:dark?0x1D3254:0xB9CBE2,roughness:0.8});
    GEO.prov.features.forEach((f,i)=>{ const hi=hiSet.has(f.properties.p); const top=new T.MeshStandardMaterial({color: hi?(dark?0x3A72B0:0xBCD6F5):(dark?(i%2?0x2A4268:0x2E486F):(i%2?0xFFFFFF:0xF5F8FB)),roughness:0.85}); extr(f,hi?40:22,[top,side],0); });
    // province borders as lines
    const lm=new T.LineBasicMaterial({color:dark?0x3A5A88:0x8CA3C2,transparent:true,opacity:0.8}); GEO.prov.features.forEach(f=>{ const hi=hiSet.has(f.properties.p); polys(f.geometry).forEach(poly=>{ const pts=poly[0].map(c=>{ const [x,y]=P(c); return new T.Vector3(x,(hi?40:22)+0.5,y); }); scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),lm)); }); });
    // islands
    const im=new T.MeshStandardMaterial({color:dark?0x5C7AA6:0x8CA3C2}); [...HOANGSA,...TRUONGSA].forEach(c=>{ const [x,y]=P(c); const m=new T.Mesh(new T.CylinderGeometry(9,9,10,10),im); m.position.set(x,4,y); scene.add(m); });
    [[t("hoangSa"),[111.95,17.3]],[t("truongSa"),[113.9,11.9]],[t("eastSea"),[112.4,13.4]]].forEach(([tx,c])=>{ const [x,y]=P(c); const lb=label(`<span>${esc(tx)}</span>`); lb.position.set(x,30,y); scene.add(lb); });
    // OCC beacon
    const [ox,oy]=P(OCC_LL); const occ=new T.Group(); occ.position.set(ox,40,oy); const beam=new T.Mesh(new T.CylinderGeometry(4,10,260,16,1,true),new T.MeshBasicMaterial({color:COL.acc,transparent:true,opacity:0.25,side:T.DoubleSide,depthWrite:false})); beam.position.y=130; occ.add(beam);
    const ringO=new T.Mesh(new T.RingGeometry(30,38,48),new T.MeshBasicMaterial({color:COL.acc,transparent:true,opacity:0.7,side:T.DoubleSide})); ringO.rotation.x=-Math.PI/2; ringO.position.y=2; occ.add(ringO); scene.add(occ);
    const ol=label(`<b>OCC</b><span>Ia Pech</span>`,"lbl3d big"); ol.position.set(ox,330,oy); scene.add(ol);
    // plants
    const bars={}; const curves=[]; const packets=[];
    scopeIds().forEach(id=>{ const s=ST[id]; const [x,y]=P(s.ll); const base=withP[id]&&hiSet.has(withP[id])?40:22; const g=new T.Group(); g.position.set(x,base,y); g.userData.pick=id;
      const mat=new T.MeshStandardMaterial({color:COL.ok,emissive:COL.ok,emissiveIntensity:0.35,roughness:0.4}); const bar=new T.Mesh(new T.CylinderGeometry(10,10,1,20),mat); g.add(bar); const cap=new T.Mesh(new T.CylinderGeometry(15,15,4,24),new T.MeshStandardMaterial({color:s.type==="wind"?0x2CC9C1:0xF4B740,roughness:0.5})); cap.position.y=2; g.add(cap);
      const lb=label(""); g.add(lb); lb.element.addEventListener("click",()=>o.onSelect&&o.onSelect(id)); g.userData.lbl=lb; g.userData.bar=bar; scene.add(g); bars[id]=g;
      if(s.plant!=="IAP"){ const a=new T.Vector3(x,base+4,y), b=new T.Vector3(ox,44,oy); const mid=a.clone().lerp(b,0.5); mid.y+=a.distanceTo(b)*0.22; const cv=new T.QuadraticBezierCurve3(a,mid,b); curves.push(cv);
        scene.add(new T.Mesh(new T.TubeGeometry(cv,48,2.2,6,false),new T.MeshBasicMaterial({color:s.notOper?COL.off:COL.acc,transparent:true,opacity:0.55})));
        for(let k=0;k<3;k++){ const pk=new T.Mesh(new T.SphereGeometry(5,10,8),new T.MeshBasicMaterial({color:s.notOper?COL.off:0xBFE0FF})); pk.userData={cv,t:k/3,on:!s.notOper}; scene.add(pk); packets.push(pk); } } });
    function upd(){ scopeIds().forEach(id=>{ const s=ST[id], g=bars[id]; const L1=LIVE.st[id]; const hgt= s.notOper? 6 : 12+ (L1.p/Math.max(s.cap,1))*260; g.userData.bar.scale.y=hgt; g.userData.bar.position.y=hgt/2; const c={ok:COL.ok,warn:COL.warn,crit:COL.crit,off:COL.off}[stStatus(s)]; g.userData.bar.material.color.setHex(c); g.userData.bar.material.emissive.setHex(c);
      g.userData.lbl.position.set(0,hgt+34,0); g.userData.lbl.element.innerHTML=`<i style="background:#${c.toString(16).padStart(6,"0")}"></i><b>${s.code}</b><span>${s.notOper?t("notYet"):nf(L1.p,1)+" MW"}</span>`; }); }
    upd(); const iv=setInterval(upd,2000);
    st.onFrame((dt,time)=>{ packets.forEach(p=>{ if(!p.userData.on) return; p.userData.t=(p.userData.t+dt*0.25)%1; p.position.copy(p.userData.cv.getPoint(p.userData.t)); }); ringO.scale.setScalar(1+0.25*Math.sin(time*2)); beam.material.opacity=0.18+0.1*Math.sin(time*2); });
    st.pick(()=>Object.values(bars), id=>o.onSelect&&o.onSelect(id));
    const views={ all:{c:[200,0,600],d:[0,5200,4200]}, high:{c:P([108.1,13.2]),d:[0,1900,1700]}, north:{c:P([106.12,21.2]),d:[0,900,800]} };
    let tw=null; function fly(cx,cz,off){ const from={p:st.camera.position.clone(),t:st.controls.target.clone()}; const to={t:new T.Vector3(cx,0,cz),p:new T.Vector3(cx+off[0],off[1],cz+off[2])}; const t0=performance.now(); tw=()=>{ const k=Math.min(1,(performance.now()-t0)/900), e=1-Math.pow(1-k,3); st.camera.position.lerpVectors(from.p,to.p,e); st.controls.target.lerpVectors(from.t,to.t,e); if(k>=1) tw=null; }; }
    st.onFrame(()=>{ tw&&tw(); });
    const v0=views.all; st.camera.position.set(v0.c[0]+v0.d[0],v0.d[1],v0.c[2]+v0.d[2]); st.controls.target.set(v0.c[0],0,v0.c[2]); st.controls.maxPolarAngle=Math.PI*0.45; st.controls.minDistance=200; st.controls.maxDistance=14000;
    fly(...P([108.4,14.6]),[0,4600,3600]);
    return { dispose(){ clearInterval(iv); st.dispose(); }, preset(p){ const v=views[p]; const c=Array.isArray(v.c)&&v.c.length===2? v.c : [v.c[0],v.c[2]]; if(p==="all") fly(200,600,[0,5200,4200]); else fly(c[0],c[1],v.d); }, focus(id){ const [x,y]=P(ST[id].ll); fly(x,y,[0,700,620]); }, update:upd }; }

  // ---------- Public: login hero ----------
  async function hero(el){ const ok=await lib(); if(!ok||!el.isConnected) return null; const s=ST.IAP2; const st=stage(el,{shadows:true,labels:false,far:16000,fov:34,exposure:1.05}); const b=buildWindFarm(st,s,{labels:false,autoRotate:true}); st.controls.enabled=false; return { dispose(){ st.dispose(); } }; }

  return {station, unit, map, hero, lib};
})();
