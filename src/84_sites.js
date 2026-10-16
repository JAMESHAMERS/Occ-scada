// ===================== Solar plant site scenes (station level) =====================
// Vĩnh Hảo: utility-scale ground-mounted farm on graded coastal land (Tuy Phong).
// Lập Tốn: rooftop PV on an industrial park (Bắc Giang) – 21 roof projects on 10 factories.
// Both return { update, setLapse, setHeat, setFlow, lt } for the station page.
const SOLAR_SITES = (T, U) => {
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.65, metalness: 0.08, envMapIntensity: 0.6 }, o));
  function add(p, geo, mat, pos, rot, o = {}) { const m = new T.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); m.castShadow = o.shadow !== false; m.receiveShadow = o.receive !== false; p.add(m); return m; }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 16) => new T.CylinderGeometry(rt, rb, h, s);
  function canvasTex(w, h, draw, rx = 1, ry = 1) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }
  const rand = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // instancing helper: collect matrices (and colours) first, then create one InstancedMesh
  function batch(geo, mat, o = {}) {
    const ms = [], cs = []; const api = {
      push(pos, rot = [0, 0, 0], sc = [1, 1, 1], col) { const m = new T.Matrix4(); m.compose(V3(...pos), new T.Quaternion().setFromEuler(new T.Euler(...rot)), V3(...sc)); ms.push(m); cs.push(col); return ms.length - 1; },
      beam(a, b, t = 0.12) { const A = V3(...a), B = V3(...b), d = B.clone().sub(A), len = d.length(); const q = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()); const m = new T.Matrix4(); m.compose(A.clone().add(B).multiplyScalar(0.5), q, V3(t, len, t)); ms.push(m); cs.push(null); },
      build(parent) { if (!ms.length) return null; const im = new T.InstancedMesh(geo, mat, ms.length); ms.forEach((m, i) => im.setMatrixAt(i, m));
        if (cs.some(c => c != null)) cs.forEach((c, i) => im.setColorAt(i, new T.Color(c ?? 0xffffff)));
        im.castShadow = o.shadow !== false; im.receiveShadow = true; parent.add(im); return im; },
      get n() { return ms.length; } };
    return api;
  }
  function fenceTex() { return canvasTex(64, 64, (x) => { x.strokeStyle = "rgba(170,178,186,1)"; x.lineWidth = 1.4; for (let i = -64; i < 128; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); } }); }
  function noiseTex(seed, lo = 200, hi = 255, n = 256) { const r = rand(seed); return canvasTex(n, n, (x) => { const im = x.createImageData(n, n); for (let i = 0; i < n * n; i++) { const v = lo + (hi - lo) * r(); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); }); }
  function flowTex(color) { return canvasTex(128, 8, (x) => { x.globalAlpha = 0.62; x.fillStyle = color; x.fillRect(0, 0, 128, 8); x.globalAlpha = 1;
    const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0.3, "rgba(255,255,255,0)"); g.addColorStop(0.62, color); g.addColorStop(0.7, "#ffffff"); g.addColorStop(0.76, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 8); }); }
  function flowLine(parent, pts, r, color, flows, key) {
    const c = new T.CurvePath(); for (let i = 0; i < pts.length - 1; i++) c.add(new T.LineCurve3(V3(...pts[i]), V3(...pts[i + 1]))); const len = c.getLength();   // straight cable runs with sharp corners
    const tex = flowTex(color); tex.repeat.set(Math.max(1, len / (r > 1 ? 60 : 26)), 1);
    const m = add(parent, new T.TubeGeometry(c, Math.max(32, Math.round(len / 2)), r, 6, false), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.95 }), null, null, { shadow: false, receive: false });
    m.renderOrder = 6; m.visible = false; flows.push({ tex, mesh: m, key, len }); return m;
  }
  // performance colour: relative yield 1.0 = best block of the plant
  const heatCol = (rel, st) => { const c = new T.Color(); if (st === "comm" || rel == null || !isFinite(rel)) return c.setHex(0x8892A0);
    if (st === "fault") return c.setHex(0xF4475E); const k = clamp((rel - 0.7) / 0.3, 0, 1); return c.setHSL(0.02 + 0.33 * k, 0.85, 0.55); };
  const worstOf = (s, ids) => { const rank = { fault: 0, comm: 1, limit: 2, stop: 3, maint: 4, run: 5 }; return ids.slice().sort((a, b) => rank[unitState(s, a)] - rank[unitState(s, b)])[0]; };
  const hx = c => "#" + c.toString(16).padStart(6, "0");
  function sunMover(st, s, lt, simT, dist) {
    const sunD = new T.Mesh(new T.SphereGeometry(70, 24, 16), new T.MeshBasicMaterial({ color: 0xFFE9B0, fog: false })); st.scene.add(sunD);
    const place = (ms) => { const sp = solarPos(s.ll, ms); const el = sp.el * Math.PI / 180, az = sp.az * Math.PI / 180; const dir = V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      lt.sun.position.copy(dir.clone().multiplyScalar(dist)); sunD.position.copy(dir.clone().multiplyScalar(7000)); sunD.visible = sp.el > -2;
      lt.sun.intensity = sp.el > 0 ? 0.6 + 2.3 * Math.sin(Math.max(el, 0.05)) : 0.12; lt.hemi.intensity = sp.el > 0 ? 0.45 + 0.55 * Math.sin(Math.max(el, 0)) : 0.22; st.sunInfo = sp; };
    place(simT); let lapse = false; let t = simT;
    st.onFrame(dt => { if (!lapse) return; t += dt * 3600 * 1000 * 1.6; const d0 = dayStart(Date.now()); if (t > d0 + 19 * HOUR) t = d0 + 5 * HOUR; place(t); });
    return { set(v) { lapse = v; if (!v) { t = Date.now(); place(t); } } };
  }
  // simple lattice steel member set (gantries, transmission towers)
  function latticeTower(B, x, z, h, base, top, arms, y0 = 0) {
    const L = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const at = (k, y) => { const w = base + (top - base) * (y / h); return [x + L[k][0] * w / 2, y + y0, z + L[k][1] * w / 2]; };
    for (let k = 0; k < 4; k++) B.beam(at(k, 0), at(k, h), 0.35);
    const lv = Math.max(4, Math.round(h / 4)); for (let i = 0; i < lv; i++) { const y0 = h * i / lv, y1 = h * (i + 1) / lv; for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; B.beam(at(k, y0), at(k2, y1), 0.14); B.beam(at(k2, y0), at(k, y1), 0.14); B.beam(at(k, y1), at(k2, y1), 0.14); } }
    (arms || []).forEach(([y, len]) => { [-1, 1].forEach(sd => { B.beam([x, y + y0, z], [x + sd * len, y + y0, z], 0.25); B.beam([x + sd * top / 2, y + y0 - 2, z], [x + sd * len, y + y0, z], 0.15); }); });
  }

  // =====================================================================
  // VĨNH HẢO – utility farm
  // =====================================================================
  function farm(st, s, o = {}) {
    const { scene } = st; const simT = o.time || Date.now(); const seed = s.seed || 7;
    const lt = U.lightsFor(scene, s.ll, simT, { shadow: true, shadowR: 820, dist: 2600, fogN: 2400, fogF: 9500 });
    lt.sun.shadow.bias = -0.0008; lt.sun.shadow.normalBias = 1.2;
    const NB = s.feeders.length, COLS = 4, ROWS = Math.ceil(NB / COLS);
    const MODW = 1.134, MODH = 2.278, NMX = 28, TWm = NMX * MODW, TD = 2 * MODH + 0.02, TGAP = 0.9, NX = 7, NZ = 24, PITCH = 8.6, TILT = 12 * Math.PI / 180;
    const BW = NX * (TWm + TGAP), BD = NZ * PITCH, GAPB = 22;
    const siteW = COLS * BW + (COLS - 1) * GAPB, siteD = ROWS * BD + (ROWS - 1) * GAPB;
    const bc = b => [-siteW / 2 + BW / 2 + (b % COLS) * (BW + GAPB), -siteD / 2 + BD / 2 + Math.floor(b / COLS) * (BD + GAPB)];
    const fx0 = -siteW / 2 - 260, fx1 = siteW / 2 + 35, fz0 = -siteD / 2 - 35, fz1 = siteD / 2 + 35;
    const subX = -siteW / 2 - 150, subZ = -siteD / 2 + 110, omX = -siteW / 2 - 160, omZ = siteD / 2 - 40;
    // ---- terrain: graded platform inside the fence, red sand dunes and scrub outside, sea to the south-east
    const outside = (x, z) => { const dx = Math.max(fx0 - 60 - x, 0, x - fx1 - 60), dz = Math.max(fz0 - 60 - z, 0, z - fz1 - 60); return Math.hypot(dx, dz); };
    const seaZ = fz1 + 900;
    const hAt = (x, z) => { const d = outside(x, z); const w = clamp(d / 260, 0, 1); const ww = w * w * (3 - 2 * w);
      const hills = 16 * U.fbm2(x / 520, z / 520, seed) + 7 * U.fbm2(x / 160, z / 160, seed + 4) + 55 * clamp((-z - 700) / 1800, 0, 1) * (0.7 + 0.5 * U.fbm2(x / 900, z / 900, seed + 9));
      const sea = -14 * clamp((z - seaZ + 250) / 500, 0, 1);
      return ww * (Math.max(0.8, hills + 9) + sea) + 0.25 * U.fbm2(x / 60, z / 60, seed + 2) * (1 - ww); };
    const SZ = 9000, SEG = 230; const tg = new T.PlaneGeometry(SZ, SZ, SEG, SEG); tg.rotateX(-Math.PI / 2); const pa = tg.attributes.position; const cols = [];
    const cIn = new T.Color(0xC4B391), cIn2 = new T.Color(0xA99876), cSand = new T.Color(0xE2CFA2), cRed = new T.Color(0xC98F58), cScrub = new T.Color(0x7E8450), cBeach = new T.Color(0xEDE2C4), tc = new T.Color();
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); const h = hAt(x, z); pa.setY(i, h); const d = outside(x, z);
      if (d < 40) { tc.copy(cIn).lerp(cIn2, clamp(0.5 + U.fbm2(x / 90, z / 90, seed + 3), 0, 1)); }
      else { tc.copy(cSand).lerp(cRed, clamp(0.45 + 1.2 * U.fbm2(x / 700, z / 700, seed + 11), 0, 1)); const sc = U.fbm2(x / 220, z / 220, seed + 13); if (sc > 0.05) tc.lerp(cScrub, clamp((sc - 0.05) * 2.2, 0, 0.75)); if (h < 1.5 && z > seaZ - 600) tc.lerp(cBeach, clamp((1.5 - h) / 3, 0, 1)); }
      cols.push(tc.r, tc.g, tc.b); }
    tg.setAttribute("color", new T.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const nt = noiseTex(seed, 205, 255); nt.repeat.set(SZ / 18, SZ / 18);
    const ground = add(scene, tg, new T.MeshStandardMaterial({ vertexColors: true, map: nt, roughness: 1, metalness: 0 }), null, null, { shadow: false }); ground.receiveShadow = true;
    const sea = add(scene, new T.PlaneGeometry(SZ * 1.6, 7000), std(0x2E7B98, { roughness: 0.18, metalness: 0.15 }), [0, -3.2, seaZ + 3300], [-Math.PI / 2, 0, 0], { shadow: false });
    // ---- roads (compacted gravel) and fence
    const roadM = std(0xDCCFAE, { roughness: 1 }); const roads = new T.Group(); scene.add(roads);
    const rect = (x0, z0, x1, z1, m = roadM, y = 0.07) => add(roads, new T.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)), m, [(x0 + x1) / 2, y, (z0 + z1) / 2], [-Math.PI / 2, 0, 0], { shadow: false });
    const RW = 7;
    rect(-siteW / 2 - 14, -siteD / 2 - 14 - RW / 2, siteW / 2 + 14, -siteD / 2 - 14 + RW / 2); rect(-siteW / 2 - 14, siteD / 2 + 14 - RW / 2, siteW / 2 + 14, siteD / 2 + 14 + RW / 2);
    rect(-siteW / 2 - 14 - RW / 2, -siteD / 2 - 14, -siteW / 2 - 14 + RW / 2, siteD / 2 + 14); rect(siteW / 2 + 14 - RW / 2, -siteD / 2 - 14, siteW / 2 + 14 + RW / 2, siteD / 2 + 14);
    for (let c = 1; c < COLS; c++) { const x = -siteW / 2 + c * (BW + GAPB) - GAPB / 2; rect(x - RW / 2, -siteD / 2 - 14, x + RW / 2, siteD / 2 + 14); }
    for (let r = 1; r < ROWS; r++) { const z = -siteD / 2 + r * (BD + GAPB) - GAPB / 2; rect(-siteW / 2 - 14, z - RW / 2, siteW / 2 + 14, z + RW / 2); }
    rect(fx0 + 20, omZ + 30, -siteW / 2 - 14, omZ + 30 + RW); rect(subX - 5, subZ + 45, subX + 5, omZ + 30);   // access roads to O&M and substation
    // highway along the coast (outside the fence, follows the terrain)
    { const pts = []; for (let x = -4200; x <= 4200; x += 60) pts.push([x, 0, fz1 + 420 + 70 * Math.sin(x / 900)]); const vs = [], ix = []; const W2 = 6;
      pts.forEach(([x, , z], i) => { const h = Math.max(hAt(x, z), 0) + 0.4; vs.push(x, h, z - W2, x, h, z + W2); if (i < pts.length - 1) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(vs, 3)); g.setIndex(ix); g.computeVertexNormals(); add(scene, g, std(0x4B4F55, { roughness: 0.9, side: T.DoubleSide }), null, null, { shadow: false }); }
    const FB = batch(cyl(0.06, 0.06, 2.4, 6), std(0x9AA3AD, { metalness: 0.6 }), { shadow: false });
    const fM = new T.MeshStandardMaterial({ map: fenceTex(), transparent: true, alphaTest: 0.25, side: T.DoubleSide, metalness: 0.5, roughness: 0.5 });
    [[fx0, fz0, fx1, fz0], [fx1, fz0, fx1, fz1], [fx1, fz1, fx0, fz1], [fx0, fz1, fx0, fz0]].forEach(([a, b, c, d]) => { const len = Math.hypot(c - a, d - b); for (let k = 0; k <= len; k += 3) FB.push([a + (c - a) * k / len, 1.2, b + (d - b) * k / len]);
      const ft = fM.clone(); ft.map = fM.map.clone(); ft.map.needsUpdate = true; ft.map.repeat.set(len / 1.6, 1.4); add(scene, new T.PlaneGeometry(len, 2.3), ft, [(a + c) / 2, 1.2, (b + d) / 2], [0, -Math.atan2(d - b, c - a), 0], { shadow: false }); });
    FB.build(scene);

    // ---- PV tables (instanced), posts, rails, combiner boxes
    const tex = U.TW().moduleTex(NMX, 2, false);
    // table = glass top (module texture) + white backsheet, each a single quad: cheap enough for ~2 000 tables
    const topGeo = new T.PlaneGeometry(TWm, TD); topGeo.rotateX(-Math.PI / 2); const backGeo = topGeo.clone(); backGeo.rotateX(Math.PI); backGeo.translate(0, -0.035, 0);
    const TB = batch(topGeo, new T.MeshStandardMaterial({ map: tex, color: 0xC8D2E6, metalness: 0.2, roughness: 0.32, envMapIntensity: 0.35 })), BB = batch(backGeo, std(0xDADDE0, { roughness: 0.8 }), { shadow: false });
    const PB = batch(box(0.12, 1, 0.12), std(0xA2ABB4, { metalness: 0.7, roughness: 0.4 }), { shadow: false });
    const RB = batch(box(TWm, 0.07, 0.09), std(0xB0B8C0, { metalness: 0.7, roughness: 0.35 }), { shadow: false });
    const CB = batch(box(0.8, 0.6, 0.28), std(0xEEF1F3, { roughness: 0.5 }));
    const tableBlock = []; const hF = 0.75, yc = hF + (TD / 2) * Math.sin(TILT) + 0.08;
    for (let b = 0; b < NB; b++) { const [bx, bz] = bc(b);
      for (let r = 0; r < NZ; r++) for (let c = 0; c < NX; c++) { if (c === 3 && r >= 10 && r <= 13) continue; // inverter skid clearing
        const x = bx - BW / 2 + (TWm + TGAP) * (c + 0.5), z = bz - BD / 2 + PITCH * (r + 0.5);
        TB.push([x, yc, z], [TILT, 0, 0]); BB.push([x, yc, z], [TILT, 0, 0]); tableBlock.push(b);
        [-0.32, 0.32].forEach(dz => RB.push([x, yc - Math.sin(TILT) * dz * TD - 0.06, z + dz * TD * Math.cos(TILT)], [TILT, 0, 0]));
        for (let p = 0; p < 3; p++) { const px = x - TWm / 2 + 2 + p * (TWm - 4) / 2; [-0.32, 0.32].forEach(dz => { const hh = yc - Math.sin(TILT) * dz * TD - 0.1; PB.push([px, hh / 2, z + dz * TD * Math.cos(TILT)], [0, 0, 0], [1, hh, 1]); }); }
        if (c === 0 && r % 3 === 1) { CB.push([x - TWm / 2 - 1.6, 1.25, z]); PB.push([x - TWm / 2 - 1.6, 0.5, z - 0.2], [0, 0, 0], [1, 1.0, 1]); }
      } }
    const tables = TB.build(scene); BB.build(scene); PB.build(scene); RB.build(scene); CB.build(scene);
    tables.instanceColor = new T.InstancedBufferAttribute(new Float32Array(TB.n * 3).fill(1), 3);
    tables.userData.pickFn = i => worstOf(s, s.feeders[tableBlock[i]][1]);

    // ---- inverter skids: 4 central-inverter cabinets + MV transformer + RMU per block
    const skids = [], radB = batch(box(0.07, 1.9, 0.7), std(0x7D8985, { metalness: 0.45, roughness: 0.5 }));
    const cabM = std(0xE6EAEE, { roughness: 0.45, metalness: 0.2 }), hoodM = std(0xD3D8DE, { metalness: 0.25 }), dark = std(0x2A3038, { metalness: 0.3 });
    const tankM = std(0x7D8985, { metalness: 0.45, roughness: 0.5 }), porc = std(0x7A4A35, { roughness: 0.35 }), padM = std(0xB9B6AE, { roughness: 0.95 });
    s.feeders.forEach(([f, ids], b) => { const [bx, bz] = bc(b); const g = new T.Group(); g.position.set(bx, 0, bz); scene.add(g);
      add(g, box(24, 0.3, 9), padM, [1.5, 0.15, 0]);
      const cabs = []; ids.forEach((id, i) => { const x = -8.2 + i * 3.25; const cab = add(g, box(2.9, 2.3, 1.05), cabM, [x, 1.45, 0]); cab.userData.pick = id;
        add(g, box(2.7, 0.3, 0.9), hoodM, [x, 2.75, 0]); add(g, box(2.5, 0.12, 0.02), dark, [x, 2.75, 0.46], null, { shadow: false });
        [-0.48, 0.48].forEach(dx => add(g, box(0.02, 2.1, 0.02), std(0x9AA3AD), [x + dx, 1.45, 0.53], null, { shadow: false }));
        add(g, box(2.6, 0.45, 0.02), dark, [x, 0.6, 0.53], null, { shadow: false });
        const led = add(g, box(0.18, 0.06, 0.02), new T.MeshStandardMaterial({ color: U.COL.ok, emissive: U.COL.ok, emissiveIntensity: 2 }), [x - 0.9, 2.15, 0.54], null, { shadow: false }); cabs.push({ id, led, cab }); });
      add(g, box(3.4, 2.6, 2.3), tankM, [8.3, 1.6, 0]); add(g, box(3.6, 0.12, 2.5), tankM, [8.3, 2.95, 0]);
      for (let i = 0; i < 12; i++) { radB.push([bx + 6.9 + i * 0.25, 1.45, bz + 1.55]); radB.push([bx + 6.9 + i * 0.25, 1.45, bz - 1.55]); }
      add(g, cyl(0.3, 0.3, 1.6, 16), tankM, [8.3, 3.4, -0.7], [0, 0, Math.PI / 2]);
      for (let k = 0; k < 3; k++) add(g, cyl(0.12, 0.16, 0.9, 10), porc, [7.6 + k * 0.7, 3.4, 0.6]);
      add(g, box(1.6, 2.0, 1.1), std(0xD6DBE0, { metalness: 0.2 }), [12.2, 1.3, 0]);
      const lb = U.label(""); lb.position.set(0, 14, 0); g.add(lb); lb.element.addEventListener("click", () => st.onPickCb && st.onPickCb(worstOf(s, ids)));
      skids.push({ f, ids, g, cabs, lb, x: bx, z: bz }); });
    radB.build(scene);

    // ---- 110 kV substation: main transformer, switchyard gantries, breakers, control building, outgoing line
    const sub = new T.Group(); sub.position.set(subX, 0, subZ); scene.add(sub);
    add(sub, box(120, 0.2, 90), std(0xBFBBB2, { roughness: 1 }), [0, 0.1, 0], null, { shadow: false });
    const sB = batch(box(1, 1, 1), std(0xA9B1B9, { metalness: 0.75, roughness: 0.35 }));
    const mt = new T.Group(); mt.position.set(-10, 0, 18); sub.add(mt);
    add(mt, box(9, 4.8, 5), tankM, [0, 3.0, 0]); add(mt, box(9.4, 0.25, 5.4), tankM, [0, 5.5, 0]);
    const radT = batch(box(0.08, 3.8, 1.6), tankM); for (let i = 0; i < 18; i++) [-1, 1].forEach(sd => radT.push([subX - 10 - 4 + i * 0.47, 2.7, subZ + 18 + sd * 3.4])); radT.build(scene);
    add(mt, cyl(0.6, 0.6, 5, 20), tankM, [0, 6.7, -1.8], [0, 0, Math.PI / 2]);
    for (let k = 0; k < 3; k++) { const bs = new T.Group(); bs.position.set(-2.5 + k * 2.5, 5.6, 1.2); mt.add(bs); for (let j = 0; j < 12; j++) add(bs, cyl(0.32 - j * 0.012, 0.32 - j * 0.012, 0.22, 16), porc, [0, 0.15 + j * 0.27, 0]); }
    add(mt, box(10.5, 0.5, 6.5), std(0x9A978F, { roughness: 1 }), [0, 0.25, 0]);
    // gantries + bays toward the line exit (north)
    [[-30, -30], [10, -30], [-30, -10], [10, -10]].forEach(([x, z]) => latticeTower(sB, subX + x, subZ + z, 14, 1.4, 1.0, []));
    [[-30, 10], [-30, -10]].forEach(([x0, z]) => { sB.beam([subX + x0, 13.5, subZ + z], [subX + 10, 13.5, subZ + z], 0.6); sB.beam([subX + x0, 12.5, subZ + z], [subX + 10, 12.5, subZ + z], 0.3); });
    for (let ph = 0; ph < 3; ph++) { const x = -18 + ph * 4;
      [[x, -22], [x, -4]].forEach(([px, pz]) => { add(sub, box(0.6, 2.6, 0.6), std(0x9AA3AD, { metalness: 0.6 }), [px, 1.3, pz]); for (let j = 0; j < 9; j++) add(sub, cyl(0.28, 0.28, 0.18, 14), porc, [px, 2.8 + j * 0.24, pz]); add(sub, cyl(0.35, 0.35, 0.6, 14), std(0x8E969F, { metalness: 0.6 }), [px, 5.2, pz]); }); }
    const bus = std(0xC27A3E, { metalness: 0.85, roughness: 0.3 });
    for (let ph = 0; ph < 3; ph++) { add(sub, cyl(0.08, 0.08, 40, 8), bus, [-10, 10 + ph * 0.01, -30 + 0.01 + ph * 2.5 - 2.5], [0, 0, Math.PI / 2], { shadow: false }); }
    const cb = new T.Group(); cb.position.set(30, 0, 18); sub.add(cb);
    add(cb, box(30, 5.5, 13), std(0xEDEFF1, { roughness: 0.6 }), [0, 2.75, 0]); add(cb, box(31, 0.5, 14), std(0x3E6E9C, { metalness: 0.3 }), [0, 5.75, 0]);
    add(cb, box(26, 1.1, 0.05), std(0x24364A, { roughness: 0.15, metalness: 0.4 }), [0, 3.1, 6.53], null, { shadow: false });
    // inner fence of the substation
    const sfB = batch(cyl(0.06, 0.06, 2.4, 6), std(0x9AA3AD, { metalness: 0.6 }), { shadow: false }); [[-60, -45, 60, -45], [60, -45, 60, 45], [60, 45, -60, 45], [-60, 45, -60, -45]].forEach(([a, b, c, d]) => { const len = Math.hypot(c - a, d - b); for (let k = 0; k <= len; k += 3) sfB.push([subX + a + (c - a) * k / len, 1.2, subZ + b + (d - b) * k / len]); }); sfB.build(scene);
    // outgoing 110 kV line: lattice towers + conductors
    const towers = [[subX - 10, subZ - 70], [subX - 160, subZ - 330], [subX - 330, subZ - 620], [subX - 520, subZ - 930], [subX - 720, subZ - 1250]];
    towers.forEach(([x, z]) => latticeTower(sB, x, z, 32, 6, 1.6, [[24, 5], [28, 4.2], [31.5, 2]], Math.max(0, hAt(x, z)) - 0.3));
    sB.build(scene);
    const condM = new T.MeshBasicMaterial({ color: 0x3C434B });
    [[-5, 24], [5, 24], [-4.2, 28], [4.2, 28], [0, 31.5]].forEach(([dx, y]) => { for (let i = 0; i < towers.length - 1; i++) { const [x0, z0] = towers[i], [x1, z1] = towers[i + 1];
      const h0 = hAt(x0, z0), h1 = hAt(x1, z1); const pts = []; for (let k = 0; k <= 16; k++) { const t2 = k / 16; pts.push(V3(x0 + (x1 - x0) * t2 + dx, (h0 + (h1 - h0) * t2) + y - 6 * 4 * t2 * (1 - t2), z0 + (z1 - z0) * t2)); }
      add(scene, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.09, 4), condM, null, null, { shadow: false }); } });
    // tower bases follow the terrain
    // (towers outside the graded area are placed on the hill slope)
    const subL = U.label(`<b>TBA ${s.kv}</b>`, "lbl3d big"); subL.position.set(subX, 30, subZ); scene.add(subL);

    // ---- O&M building, warehouse, water tank, weather station, cars
    const om = new T.Group(); om.position.set(omX, 0, omZ); scene.add(om);
    add(om, box(40, 0.2, 60), std(0xC4C0B6, { roughness: 1 }), [0, 0.1, 0], null, { shadow: false });
    add(om, box(34, 4.6, 12), std(0xF1F2F3, { roughness: 0.6 }), [0, 2.3, -14]); add(om, box(35, 0.5, 13), std(0x3E6E9C, { metalness: 0.3 }), [0, 4.85, -14]);
    add(om, box(30, 1.2, 0.05), std(0x24364A, { roughness: 0.15, metalness: 0.4 }), [0, 2.6, -7.97], null, { shadow: false });
    add(om, box(22, 7, 16), std(0xD9DDE2, { metalness: 0.3, roughness: 0.5 }), [-2, 3.5, 12]); add(om, box(5, 4.5, 0.05), dark, [-2, 2.25, 20.03], null, { shadow: false });
    add(om, cyl(2.2, 2.2, 3.5, 20), std(0x6E9FC5, { metalness: 0.4 }), [14, 9.5, 14]); for (let i = 0; i < 4; i++) add(om, box(0.3, 8, 0.3), std(0x9AA3AD, { metalness: 0.6 }), [14 + (i % 2 ? 1.6 : -1.6), 4, 14 + (i < 2 ? 1.6 : -1.6)]);
    const wx = new T.Group(); wx.position.set(14, 0, -2); om.add(wx); add(wx, cyl(0.08, 0.1, 6, 8), std(0xC0C6CE, { metalness: 0.6 }), [0, 3, 0]); add(wx, box(1.4, 0.04, 0.9), std(0x1B2B45), [0, 4.5, 0.5], [0.4, 0, 0]); add(wx, cyl(0.12, 0.12, 0.1, 12), std(0xEEEEEE), [0.6, 6.05, 0]); add(wx, cyl(0.12, 0.12, 0.1, 12), std(0xEEEEEE), [-0.6, 6.05, 0]); add(wx, box(1.4, 0.05, 0.05), std(0xC0C6CE), [0, 6, 0]);
    const wxL = U.label(`<b>${s.wx}</b>`); wxL.position.set(omX + 14, 10, omZ - 2); scene.add(wxL);
    const carB = batch(box(4.4, 1.4, 1.8), std(0xffffff, { metalness: 0.5, roughness: 0.35 })); const r0 = rand(seed + 5); const carCols = [0xF2F4F6, 0x1E2329, 0x9AA3AD, 0x8C1C13, 0x2B4C7E, 0xC9CED4];
    for (let i = 0; i < 9; i++) carB.push([omX - 15 + i * 3.2, 0.9, omZ + 4], [0, Math.PI / 2, 0], [1, 1, 1], carCols[Math.floor(r0() * carCols.length)]); carB.build(scene);

    // ---- vegetation: low scrub on the dunes, casuarina rows along the fence
    const r1 = rand(seed + 77); const shB = batch(new T.SphereGeometry(1, 6, 4), std(0x5F6B3A, { roughness: 1 }), { shadow: false });
    for (let i = 0; i < 1600; i++) { const x = (r1() - 0.5) * 5200, z = (r1() - 0.5) * 4200; if (outside(x, z) < 50) continue; const h = hAt(x, z); if (h < 0.3) continue; const k = 1.2 + r1() * 2.6; shB.push([x, h + k * 0.25, z], [0, r1() * 6, 0], [k, k * 0.55, k], r1() < 0.5 ? 0x5F6B3A : 0x7A7F48); }
    shB.build(scene);
    const trB = batch(new T.ConeGeometry(1, 1, 7), std(0x3D5A34, { roughness: 1 }), { shadow: false }), tkB = batch(cyl(0.2, 0.3, 1, 6), std(0x5B4636, { roughness: 1 }), { shadow: false });
    for (let x = fx0 - 12; x < fx1 + 12; x += 16) [fz0 - 14, fz1 + 14].forEach(z => { const k = 0.8 + r1() * 0.5; const h = hAt(x, z); trB.push([x, h + 3 + 6 * k, z], [0, 0, 0], [2.6 * k, 12 * k, 2.6 * k]); tkB.push([x, h + 1.5, z], [0, 0, 0], [1, 3, 1]); });
    trB.build(scene); tkB.build(scene);

    // ---- MV collector power flow (block skid → road → substation)
    const flows = []; const flowG = new T.Group(); scene.add(flowG);
    skids.forEach((sk, b) => { const r = Math.floor(b / COLS); const zRoad = -siteD / 2 + r * (BD + GAPB) - GAPB / 2 + (r === 0 ? -14 + GAPB / 2 : 0);
      const xW = -siteW / 2 - 14; const y = 2.6;
      flowLine(flowG, [[sk.x + 8, y, sk.z], [sk.x + 8, y, sk.z - 8], [sk.x - BW / 2 + 2, y, sk.z - 8], [sk.x - BW / 2 - GAPB / 2 + (b % COLS === 0 ? -3 : 0), y, sk.z - 8], [xW, y, zRoad + 0.01], [xW, y, subZ + 40], [subX + 20, y, subZ + 40], [subX - 10, y, subZ + 18]], 2.2, "#9B6BFF", flows, b); });
    // ---- labels / camera
    st.camera.position.set(560, 330, 650); st.controls.target.set(-70, 0, 10); st.controls.maxPolarAngle = Math.PI * 0.47; st.controls.minDistance = 40; st.controls.maxDistance = 4200;
    const sun = sunMover(st, s, lt, simT, 2600);
    let heat = false, flowOn = false; const blockPow = new Array(NB).fill(0);
    st.onFrame((dt) => { if (!flowOn) return; flows.forEach(f => { const k = blockPow[f.key] || 0; f.tex.offset.x -= dt * (k > 0.01 ? 0.4 + 2.2 * k : 0) * (U.RM() ? 0 : 1); f.mesh.material.opacity = k > 0.01 ? 0.95 : 0.15; }); });
    function update() { const L1 = LIVE.st[s.id]; const ratio = [];
      skids.forEach((sk, b) => { const us = sk.ids.map(id => L1.units[s.units.findIndex(u => u.id === id)]); const p = us.reduce((a, u) => a + (u.p || 0), 0), r = us.reduce((a, u) => a + (u.r || 0), 0);
        ratio[b] = r ? p / r : 0; blockPow[b] = r ? p / r : 0; const w = worstOf(s, sk.ids); const c = U.stCol(unitState(s, w));
        sk.lb.element.innerHTML = `<i style="background:${hx(c)}"></i><b>${t("block", { n: sk.f })}</b><span>${nf(p * 1000, 0)} kW</span>`;
        sk.cabs.forEach(cb => { const cc = U.stCol(unitState(s, cb.id)); cb.led.material.color.setHex(cc); cb.led.material.emissive.setHex(cc); }); });
      const mx = Math.max(...ratio, 1e-6); const cols2 = skids.map((sk, b) => heatCol(ratio[b] > 0.005 ? ratio[b] / mx : null, unitState(s, worstOf(s, sk.ids))));
      const arr = tables.instanceColor.array; for (let i = 0; i < tableBlock.length; i++) { const c = heat ? cols2[tableBlock[i]] : null; arr[i * 3] = c ? (0.35 + 0.65 * c.r) / 0.78 : 1; arr[i * 3 + 1] = c ? (0.35 + 0.65 * c.g) / 0.82 : 1; arr[i * 3 + 2] = c ? (0.35 + 0.65 * c.b) / 0.9 : 1; }
      tables.instanceColor.needsUpdate = true; }
    update(); st.pick(() => [tables, ...skids.flatMap(k => k.cabs.map(c => c.cab))], id => st.onPickCb && st.onPickCb(id));
    return { update, lt, setLapse: v => sun.set(v), setHeat(v) { heat = v; update(); }, setFlow(v) { flowOn = v; flows.forEach(f => f.mesh.visible = v); } };
  }

  // =====================================================================
  // LẬP TỐN – rooftop PV on an industrial park
  // =====================================================================
  function rooftop(st, s, o = {}) {
    const { scene } = st; const simT = o.time || Date.now(); const seed = s.seed || 11; const r = rand(seed);
    const lt = U.lightsFor(scene, s.ll, simT, { shadow: true, shadowR: 650, dist: 2400, fogN: 2300, fogF: 9000 });
    lt.sun.shadow.bias = -0.0006; lt.sun.shadow.normalBias = 0.8;
    // group roof projects by factory (A1-1, A1-11, A1-21 → building A1, sections 1, 11, 21)
    const bmap = {}; s.feeders.forEach(([code, ids]) => { const [b, n] = code.split("-"); (bmap[b] ||= []).push({ code, ids, n: +n }); });
    Object.values(bmap).forEach(a => a.sort((x, y) => x.n - y.n));
    const order = [["A1", "A2", "B1", "B2"], ["C1", "C2", "C3", "C4"], ["D1", "D2"]].map(row => row.filter(b => bmap[b]));
    const D = 86, H = 12, PITCH = 5 * Math.PI / 180, RISE = D / 2 * Math.tan(PITCH), AREA = 860, GAPX = 46, rowZ = [-185, -25, 135];
    // ---- surroundings: rice paddies, village clusters, distant hills
    const padTex = canvasTex(256, 256, (x) => { const rr = rand(seed + 1); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const g = 0.4 + 0.25 * rr(); x.fillStyle = `hsl(${78 + 26 * rr()},${24 + 14 * rr()}%,${30 + 14 * g}%)`; x.fillRect(i * 64, j * 64, 64, 64);
      for (let k = 0; k < 40; k++) { x.fillStyle = "rgba(20,40,10,.12)"; x.fillRect(i * 64 + rr() * 64, j * 64, 1, 64); }
      x.strokeStyle = "rgba(150,140,100,.45)"; x.lineWidth = 1.5; x.strokeRect(i * 64 + 1, j * 64 + 1, 62, 62); } }, 55, 55);
    const SZ = 9000, SEG = 160; const tg = new T.PlaneGeometry(SZ, SZ, SEG, SEG); tg.rotateX(-Math.PI / 2); const pa = tg.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); const d = Math.hypot(x / 1.2, z); const w = clamp((d - 1900) / 1400, 0, 1);
      pa.setY(i, w * (90 + 160 * U.fbm2(x / 900, z / 900, seed) + 60 * U.fbm2(x / 300, z / 300, seed + 3)) * (z < 0 || x < 0 ? 1 : 0.45)); }
    tg.computeVertexNormals();
    add(scene, tg, new T.MeshStandardMaterial({ map: padTex, roughness: 1 }), [0, -0.05, 0], null, { shadow: false });
    // industrial-park pad, lawn, perimeter wall
    const PW = 980, PD = 520;
    add(scene, new T.PlaneGeometry(PW, PD), new T.MeshStandardMaterial({ map: (() => { const t2 = noiseTex(seed + 3, 120, 175); t2.repeat.set(140, 80); return t2; })(), color: 0x86A65E, roughness: 1 }), [0, 0.02, -25], [-Math.PI / 2, 0, 0], { shadow: false }).receiveShadow = true;
    const wallB = batch(box(1, 2.4, 0.3), std(0xE4E1D8, { roughness: 0.9 }), { shadow: false });
    [[-PW / 2, -PD / 2 - 25, PW / 2, -PD / 2 - 25], [PW / 2, -PD / 2 - 25, PW / 2, PD / 2 - 25], [PW / 2, PD / 2 - 25, -PW / 2, PD / 2 - 25], [-PW / 2, PD / 2 - 25, -PW / 2, -PD / 2 - 25]].forEach(([a, b, c, d]) => { const len = Math.hypot(c - a, d - b); wallB.push([(a + c) / 2, 1.2, (b + d) / 2], [0, -Math.atan2(d - b, c - a), 0], [len, 1, 1]); });
    wallB.build(scene);
    // asphalt roads with lane markings
    const roadTex = canvasTex(256, 64, (x, w, h) => { x.fillStyle = "#4A4F55"; x.fillRect(0, 0, w, h); const rr = rand(seed + 9); for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.08)"; x.fillRect(rr() * w, rr() * h, 2, 2); }
      x.fillStyle = "#E8E4D6"; x.fillRect(0, h / 2 - 1.5, w * 0.55, 3); x.fillStyle = "rgba(232,228,214,.85)"; x.fillRect(0, 2, w, 2); x.fillRect(0, h - 4, w, 2); });
    const roadX = (x0, x1, z, w = 14) => { const t2 = roadTex.clone(); t2.needsUpdate = true; t2.repeat.set((x1 - x0) / 14, 1); const m = add(scene, new T.PlaneGeometry(x1 - x0, w), new T.MeshStandardMaterial({ map: t2, roughness: 0.9 }), [(x0 + x1) / 2, 0.06, z], [-Math.PI / 2, 0, 0], { shadow: false }); return m; };
    const roadZ = (z0, z1, x, w = 14) => { const t2 = roadTex.clone(); t2.needsUpdate = true; t2.repeat.set((z1 - z0) / 14, 1); add(scene, new T.PlaneGeometry(z1 - z0, w), new T.MeshStandardMaterial({ map: t2, roughness: 0.9 }), [x, 0.065, (z0 + z1) / 2], [-Math.PI / 2, 0, Math.PI / 2], { shadow: false }); };
    roadX(-PW / 2 + 10, PW / 2 - 10, rowZ[0] - D / 2 - 22); roadX(-PW / 2 + 10, PW / 2 - 10, (rowZ[0] + rowZ[1]) / 2); roadX(-PW / 2 + 10, PW / 2 - 10, (rowZ[1] + rowZ[2]) / 2); roadX(-PW / 2 + 10, PW / 2 - 10, rowZ[2] + D / 2 + 22);
    roadZ(rowZ[0] - D / 2 - 22, rowZ[2] + D / 2 + 22, -PW / 2 + 18); roadZ(rowZ[0] - D / 2 - 22, rowZ[2] + D / 2 + 22, PW / 2 - 18); roadZ(rowZ[2] + D / 2 + 22, 900, 120, 18);
    roadX(-4000, 4000, 900, 22);   // provincial road outside the park

    // ---- factories
    const roofTex = canvasTex(64, 8, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#8E979F"); g.addColorStop(0.1, "#E3E7EA"); g.addColorStop(0.2, "#B7BFC6"); g.addColorStop(0.65, "#C8CFD5"); g.addColorStop(1, "#9AA2AA"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    const wallTex = canvasTex(256, 128, (x, w, h) => { x.fillStyle = "#E9EBED"; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 8) { x.fillStyle = "rgba(120,130,140,.18)"; x.fillRect(i, 0, 2, h); }
      x.fillStyle = "#3C6FA8"; x.fillRect(0, 6, w, 12); x.fillStyle = "#2B3A4A"; x.fillRect(0, 52, w, 12); for (let i = 0; i < w; i += 32) { x.fillStyle = "rgba(160,190,215,.35)"; x.fillRect(i + 2, 54, 26, 8); } x.fillStyle = "#B8BEC4"; x.fillRect(0, h - 10, w, 10); });
    const modT = U.TW().moduleTex(1, 1, false); modT.wrapS = modT.wrapT = T.RepeatWrapping;
    const ventB = batch(cyl(0.38, 0.38, 0.6, 12), std(0xC9CFD6, { metalness: 0.8, roughness: 0.3 })), ventTop = batch(new T.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(0xD9DEE3, { metalness: 0.8, roughness: 0.3 }));
    const invB = batch(box(1.06, 0.7, 0.36), std(0xF2F4F6, { roughness: 0.4, metalness: 0.15 })), ledB = batch(box(0.4, 0.07, 0.02), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.6 }), { shadow: false });
    const rackB = batch(box(0.08, 1, 0.08), std(0xA9B1BA, { metalness: 0.7 }), { shadow: false }), trayB = batch(box(1, 0.12, 0.4), std(0xB8C0C9, { metalness: 0.7, roughness: 0.35 }), { shadow: false });
    const doorB = batch(box(4.2, 4.6, 0.08), std(0x8D96A0, { metalness: 0.5, roughness: 0.4 }), { shadow: false }), truckB = batch(box(12, 3.4, 2.5), std(0xF2F2F0, { roughness: 0.5 })), cabB = batch(box(2.4, 2.8, 2.4), std(0x2B4C7E, { metalness: 0.3 }));
    const kioskB = batch(box(3.2, 2.6, 2.3), std(0xD9DDE2, { metalness: 0.2 }));
    const invIds = [], sections = [], buildings = [];
    const wallMat = (len) => { const t2 = wallTex.clone(); t2.needsUpdate = true; t2.repeat.set(len / 26, 1); return std(0xffffff, { map: t2, roughness: 0.7 }); };
    order.forEach((row, ri) => { const lens = row.map(b => Math.max(100, Math.round(bmap[b].reduce((a, sc) => a + sc.ids.length, 0) * AREA / D)));
      const tot = lens.reduce((a, b) => a + b, 0) + GAPX * (row.length - 1) + (ri === 2 ? 360 : 0); let x = -tot / 2;
      row.forEach((bcode, bi) => { const L = lens[bi], cx = x + L / 2, cz = rowZ[ri]; x += L + GAPX;
        const g = new T.Group(); g.position.set(cx, 0, cz); scene.add(g); buildings.push({ code: bcode, g, L, cx, cz });
        const endM = wallMat(D), sideM = wallMat(L), plain = std(0xDDE0E3);
        add(g, box(L, H, D), [endM, endM, plain, plain, sideM, sideM], [0, H / 2, 0]);
        // gable triangles
        const tri = new T.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, RISE); tri.lineTo(-D / 2, 0);
        [-1, 1].forEach(sd => add(g, new T.ShapeGeometry(tri), std(0xE9EBED, { side: T.DoubleSide }), [sd * L / 2, H, 0], [0, Math.PI / 2, 0]));
        // roof slopes (standing seam), ridge cap, skylights, PV strips per roof project, inverters
        const Sw = D / 2 / Math.cos(PITCH) + 0.8;
        const secs = bmap[bcode]; const nTot = secs.reduce((a, sc) => a + sc.ids.length, 0); let sx = -L / 2 + 3;
        const usable = L - 6 - (secs.length - 1) * 4;
        [-1, 1].forEach(side => { const sl = new T.Group(); sl.position.set(0, H + RISE, 0); sl.rotation.x = side * PITCH; g.add(sl);
          const rt = roofTex.clone(); rt.needsUpdate = true; rt.repeat.set((L + 1.2) / 0.6, 1);
          add(sl, new T.PlaneGeometry(L + 1.2, Sw), std(0xffffff, { map: rt, metalness: 0.55, roughness: 0.42, side: T.DoubleSide }), [0, 0, side * Sw / 2], [-Math.PI / 2, 0, 0]); });
        add(g, box(L + 1.2, 0.35, 1.0), std(0xB9C0C7, { metalness: 0.6, roughness: 0.4 }), [0, H + RISE + 0.1, 0]);
        for (let vx = -L / 2 + 8; vx < L / 2 - 6; vx += 11) { ventB.push([cx + vx, H + RISE + 0.5, cz]); ventTop.push([cx + vx, H + RISE + 0.8, cz]); }
        secs.forEach((sc, si) => { const w = usable * sc.ids.length / nTot; const x0 = sx, x1 = sx + w; sx = x1 + 4;
          const mat = new T.MeshStandardMaterial({ map: modT, color: 0xC8D2E6, metalness: 0.2, roughness: 0.32, envMapIntensity: 0.35 });
          [-1, 1].forEach(side => { const sl = new T.Group(); sl.position.set(0, H + RISE, 0); sl.rotation.x = side * PITCH; g.add(sl);
            const zIn = 2.6, zOut = Sw - 1.6, h = zOut - zIn; const STRIP = 12 * 1.154; let px = x0;
            while (px < x1 - 2) { const sw = Math.min(STRIP, x1 - px); const geo = new T.PlaneGeometry(sw, h); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * sw / 1.154, uv.getY(k) * h / 2.298);
              const m = add(sl, geo, mat, [px + sw / 2, 0.16, side * (zIn + h / 2)], [-Math.PI / 2, 0, 0]); m.userData.pickFn = () => worstOf(s, sc.ids); px += sw + 0.9; }
            // skylight strip between projects
            if (si < secs.length - 1) add(sl, new T.PlaneGeometry(2.2, Sw - 1), std(0xF4F7F8, { transparent: true, opacity: 0.85, roughness: 0.2, emissive: 0x6B7680, emissiveIntensity: 0.15 }), [x1 + 2, 0.05, side * Sw / 2], [-Math.PI / 2, 0, 0], { shadow: false });
          });
          // string inverters on a rack along the ridge walkway (south side), clickable one by one
          const yR = H + RISE - Math.sin(PITCH) * 1.6, zR = cz + 1.6; sc.ids.forEach((id, k) => { const ix = cx + x0 + 1.2 + k * 1.35;
            invB.push([ix, yR + 0.95, zR], [0, 0, 0]); ledB.push([ix, yR + 1.15, zR + 0.19], [0, 0, 0], [1, 1, 1], 0x34D399); invIds.push(id); rackB.push([ix - 0.55, yR + 0.5, zR - 0.1], [0, 0, 0], [1, 1.2, 1]); });
          rackB.push([cx + x0 + 0.5 + sc.ids.length * 0.68, yR + 1.7, zR], [0.12, 0, 0], [(sc.ids.length * 1.35 + 0.6) / 0.08, 0.04, 1.1 / 0.08]);   // sunshade
          // cable tray: inverters → east gable → down the wall to the building kiosk
          trayB.push([cx + (x0 + L / 2) / 2 + 0.6, H + RISE + 0.45, cz - 1.0], [0, 0, 0], [L / 2 - x0, 1, 1]);
          const lb = U.label(""); lb.position.set(cx + (x0 + x1) / 2, H + RISE + 9, cz); scene.add(lb); lb.element.addEventListener("click", () => st.onPickCb && st.onPickCb(worstOf(s, sc.ids)));
          sections.push({ code: sc.code, ids: sc.ids, mat, lb, cx: cx + (x0 + x1) / 2, cz, x0: cx + x0, building: bcode });
        });
        trayB.push([cx + L / 2 + 0.3, (H + RISE) / 2, cz - 1.0], [0, 0, Math.PI / 2], [H + RISE, 1, 1]);
        kioskB.push([cx + L / 2 + 8, 1.4, cz - 6]);
        // loading docks with roller shutters and trucks on the north side
        for (let k = 0; k < Math.floor(L / 16); k++) { const dx = cx - L / 2 + 10 + k * 16; doorB.push([dx, 2.4, cz - D / 2 - 0.05]); if (r() < 0.35) { truckB.push([dx, 2.1, cz - D / 2 - 9], [0, Math.PI / 2, 0]); cabB.push([dx, 1.9, cz - D / 2 - 16.5], [0, Math.PI / 2, 0]); } }
        const bl = U.label("", "lbl3d big"); bl.position.set(cx, H + RISE + 14, cz); scene.add(bl); buildings[buildings.length - 1].lb = bl;
        bl.element.addEventListener("click", () => st.onPickCb && st.onPickCb(worstOf(s, bmap[bcode].flatMap(x => x.ids))));
      });
      if (ri === 2) { // admin office, canteen, main 22 kV switching station, parking
        const ox = x - GAPX + 40; const of = new T.Group(); of.position.set(ox + 50, 0, rowZ[2]); scene.add(of);
        const glass = std(0x355A7A, { metalness: 0.6, roughness: 0.12, envMapIntensity: 1.2 });
        add(of, box(70, 18, 24), glass, [0, 9, -20]); for (let k = 1; k < 5; k++) add(of, box(70.4, 0.5, 24.4), std(0xE8EAEC), [0, k * 3.6, -20], null, { shadow: false }); add(of, box(71, 0.8, 25), std(0xE8EAEC), [0, 18.3, -20]);
        add(of, box(46, 7, 30), std(0xEEE9E0, { roughness: 0.7 }), [-10, 3.5, 28]); add(of, box(47, 0.6, 31), std(0xA14E3A, { roughness: 0.6 }), [-10, 7.2, 28]);
        // parking lot with cars
        const pk = canvasTex(64, 64, (x2) => { x2.fillStyle = "#575C62"; x2.fillRect(0, 0, 64, 64); x2.fillStyle = "#E8E4D6"; x2.fillRect(0, 0, 2, 40); }, 30, 2);
        add(scene, new T.PlaneGeometry(110, 40), new T.MeshStandardMaterial({ map: pk, roughness: 0.9 }), [ox + 150, 0.07, rowZ[2] - 8], [-Math.PI / 2, 0, 0], { shadow: false });
        const carB = batch(box(4.4, 1.45, 1.85), std(0xffffff, { metalness: 0.55, roughness: 0.32 })); const cc = [0xF2F4F6, 0x1E2329, 0x9AA3AD, 0x8C1C13, 0x2B4C7E, 0xC9CED4, 0xF2F4F6];
        for (let i = 0; i < 30; i++) for (let j = 0; j < 2; j++) if (r() < 0.7) carB.push([ox + 98 + i * 3.6, 0.85, rowZ[2] - 22 + j * 28], [0, Math.PI / 2, 0], [1, 1, 1], cc[Math.floor(r() * cc.length)]);
        carB.build(scene);
        const ss = new T.Group(); ss.position.set(ox + 150, 0, rowZ[2] + 40); scene.add(ss);
        add(ss, box(50, 0.2, 34), std(0xBFBBB2, { roughness: 1 }), [0, 0.1, 0], null, { shadow: false }); add(ss, box(20, 5, 9), std(0xEDEFF1), [-10, 2.5, -6]); add(ss, box(21, 0.5, 10), std(0x3E6E9C), [-10, 5.2, -6]);
        for (let i = 0; i < 3; i++) kioskB.push([ox + 150 + 8 + i * 6, 1.4, rowZ[2] + 46]);
        const sl = U.label(`<b>TBA ${s.kv}</b>`, "lbl3d big"); sl.position.set(ox + 150, 16, rowZ[2] + 40); scene.add(sl); subPos = [ox + 150, rowZ[2] + 40];
        const wxL = U.label(`<b>${s.wx}</b>`); wxL.position.set(ox + 50, 26, rowZ[2] - 20); scene.add(wxL);
      }
    });
    var subPos = subPos || [300, 175];
    ventB.build(scene); ventTop.build(scene); const invs = invB.build(scene); const leds = ledB.build(scene); rackB.build(scene); trayB.build(scene); doorB.build(scene); truckB.build(scene); cabB.build(scene); kioskB.build(scene);
    invs.userData.pickFn = i => invIds[i]; leds.userData.pickFn = i => invIds[i];
    // trees along the internal roads and in the green belt; village houses in the paddies
    const trB = batch(new T.SphereGeometry(1, 8, 6), std(0x3F6B35, { roughness: 1 })), tkB = batch(cyl(0.18, 0.25, 1, 6), std(0x5B4636), { shadow: false });
    const zr = [rowZ[0] - D / 2 - 22, (rowZ[0] + rowZ[1]) / 2, (rowZ[1] + rowZ[2]) / 2, rowZ[2] + D / 2 + 22];
    zr.forEach(z => { for (let x = -PW / 2 + 24; x < PW / 2 - 24; x += 14) [-10, 10].forEach(dz => { const k = 2.2 + r() * 1.2; trB.push([x + r() * 3, 3 + k, z + dz], [0, 0, 0], [k, k * 1.1, k], r() < 0.5 ? 0x3F6B35 : 0x4F7A3C); tkB.push([x, 1.5, z + dz], [0, 0, 0], [1, 3, 1]); }); });
    for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * PW, z = r() < 0.5 ? -PD / 2 - 25 + 6 : PD / 2 - 25 - 6; const k = 2 + r() * 1.5; trB.push([x, 3 + k, z], [0, 0, 0], [k, k * 1.1, k]); }
    trB.build(scene); tkB.build(scene);
    const hsB = batch(box(1, 1, 1), std(0xEDEAE2, { roughness: 0.8 })), hrB = batch(new T.ConeGeometry(0.75, 0.5, 4), std(0xA54B37, { roughness: 0.7 }));
    for (let c = 0; c < 14; c++) { const ang = r() * Math.PI * 2, rad = 800 + r() * 900, vx = Math.cos(ang) * rad, vz = Math.sin(ang) * rad * 0.8;
      for (let i = 0; i < 20; i++) { const x = vx + (r() - 0.5) * 140, z = vz + (r() - 0.5) * 90, w = 8 + r() * 6, h = 4 + r() * 8; hsB.push([x, h / 2, z], [0, 0, 0], [w, h, 10]); hrB.push([x, h + 1.4, z], [0, Math.PI / 4, 0], [w * 0.95, 5, 13]); } }
    hsB.build(scene); hrB.build(scene);
    // ---- power flow: each roof project (inverters → tray → kiosk) and kiosks → 22 kV station
    const flows = []; const flowG = new T.Group(); scene.add(flowG);
    sections.forEach((sc, i) => { const b = buildings.find(x => x.code === sc.building); const yR = H + RISE + 0.7;
      flowLine(flowG, [[sc.x0 + 2, yR, sc.cz - 1.0], [b.cx + b.L / 2, yR, sc.cz - 1.0], [b.cx + b.L / 2 + 0.6, H * 0.5, sc.cz - 1.0], [b.cx + b.L / 2 + 0.8, 1.0, b.cz - 6]], 0.9, "#36C5F0", flows, i); });
    buildings.forEach((b, i) => flowLine(flowG, [[b.cx + b.L / 2 + 8, 1.2, b.cz - 6], [b.cx + b.L / 2 + 23, 1.2, b.cz - 6], [b.cx + b.L / 2 + 23, 1.2, rowZ[2] + D / 2 + 22], [subPos[0], 1.2, rowZ[2] + D / 2 + 22], [subPos[0], 1.2, subPos[1]]], 1.6, "#9B6BFF", flows, "b" + b.code));
    // ---- camera & interaction
    st.camera.position.set(470, 330, 560); st.controls.target.set(-20, 0, -30); st.controls.maxPolarAngle = Math.PI * 0.47; st.controls.minDistance = 25; st.controls.maxDistance = 3800;
    const sun = sunMover(st, s, lt, simT, 2400);
    let heat = false, flowOn = false; const secPow = {}, bPow = {};
    let near = null; const tv = new T.Vector3();
    st.onFrame(() => { const d = st.camera.position.distanceTo(st.controls.target); const n = d < 520; if (n === near) return; near = n;
      sections.forEach(sc => sc.lb.visible = n); buildings.forEach(b => b.lb.visible = !n); });
    st.onFrame(dt => { if (!flowOn) return; flows.forEach(f => { const k = (typeof f.key === "string" ? bPow[f.key.slice(1)] : secPow[f.key]) || 0; f.tex.offset.x -= dt * (k > 0.01 ? 0.4 + 2.2 * k : 0) * (U.RM() ? 0 : 1); f.mesh.material.opacity = k > 0.01 ? 0.95 : 0.15; }); });
    function update() { const L1 = LIVE.st[s.id]; const ratio = [];
      sections.forEach((sc, i) => { const us = sc.ids.map(id => L1.units[s.units.findIndex(u => u.id === id)]); const p = us.reduce((a, u) => a + (u.p || 0), 0), rr = us.reduce((a, u) => a + (u.r || 0), 0);
        ratio[i] = rr ? p / rr : 0; secPow[i] = ratio[i]; const w = worstOf(s, sc.ids); const c = U.stCol(unitState(s, w));
        sc.lb.element.innerHTML = `<i style="background:${hx(c)}"></i><b>${sc.code}</b><span>${nf(p * 1000, 0)} kW</span>`; });
      buildings.forEach(b => { const ss = sections.map((x, i) => [x, i]).filter(([x]) => x.building === b.code); bPow[b.code] = ss.reduce((a, [, i]) => a + ratio[i], 0) / Math.max(1, ss.length);
        const ids = ss.flatMap(([x]) => x.ids); const p = ids.reduce((a, id) => a + (L1.units[s.units.findIndex(u => u.id === id)].p || 0), 0); const c = U.stCol(unitState(s, worstOf(s, ids)));
        b.lb.element.innerHTML = `<i style="background:${hx(c)}"></i><b>${b.code}</b><span>${ss.length} ${t("roofsN")} · ${nf(p * 1000, 0)} kW</span>`; });
      const mx = Math.max(...ratio, 1e-6); sections.forEach((sc, i) => { if (heat) { const c = heatCol(ratio[i] > 0.005 ? ratio[i] / mx : null, unitState(s, worstOf(s, sc.ids))); sc.mat.color.setRGB(0.3 + 0.7 * c.r, 0.3 + 0.7 * c.g, 0.3 + 0.7 * c.b); } else sc.mat.color.setHex(0xC8D2E6); });
      const col = new T.Color(); invIds.forEach((id, i) => { leds.setColorAt(i, col.setHex(U.stCol(unitState(s, id)))); }); leds.instanceColor.needsUpdate = true; }
    const pickables = [invs, leds, ...buildings.map(b => b.g)]; update(); st.pick(() => pickables, id => st.onPickCb && st.onPickCb(id));
    return { update, lt, setLapse: v => sun.set(v), setHeat(v) { heat = v; update(); }, setFlow(v) { flowOn = v; flows.forEach(f => f.mesh.visible = v); } };
  }
  return { farm, rooftop };
};
