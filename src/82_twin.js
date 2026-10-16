// ===================== Digital Twin: detailed equipment models =====================
// Engineering-level geometry (metres) for a geared DFIG wind turbine (3 MW class),
// a central-inverter skid (Vĩnh Hảo) and a rooftop string inverter (Lập Tốn).
// Each model exposes:
//   refs.parts[comp]   – group per component (health colouring, focus, exploded view)
//   refs.cover[]       – enclosure meshes (cut away / lifted off)
//   refs.clip          – {frame, normal, point}: cut plane in the frame's local space
//   refs.anchors[comp] – callout position (local to the part group)
//   refs.spin[]        – {obj, axis, k}: rotating parts, k = share of the drive speed
//   refs.flows[]       – {tex, kind}: animated power-flow cables ("dc" | "ac" | "mv")
const TWIN_MODELS = (T, U) => {
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  // one material per (component, look) so health colours never bleed between components
  function matFactory() {
    const cache = {};
    return (comp, color, o = {}) => {
      const k = comp + "|" + color + "|" + JSON.stringify(o);
      if (!cache[k]) cache[k] = new T.MeshStandardMaterial(Object.assign({ color, metalness: 0.5, roughness: 0.45, envMapIntensity: 0.75 }, o));
      return cache[k];
    };
  }
  function add(parent, geo, mat, pos, rot, o = {}) {
    const m = new T.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot);
    if (o.scale) m.scale.set(...o.scale); m.castShadow = o.shadow !== false; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r) => new T.RoundedBoxGeometry(w, h, d, 3, r);
  const cyl = (rt, rb, h, s = 32, open = false) => new T.CylinderGeometry(rt, rb, h, s, 1, open);
  const RX = [0, 0, Math.PI / 2];          // cylinder axis → X
  const RZ = [Math.PI / 2, 0, 0];          // cylinder axis → Z
  const torusX = (R, r, s = 48) => { const g = new T.TorusGeometry(R, r, 10, s); g.rotateY(Math.PI / 2); return g; };
  const torusY = (R, r, s = 48) => { const g = new T.TorusGeometry(R, r, 10, s); g.rotateX(Math.PI / 2); return g; };
  function tube(parent, pts, r, mat, seg = 40) { const c = new T.CatmullRomCurve3(pts.map(p => V3(...p))); return add(parent, new T.TubeGeometry(c, seg, r, 8, false), mat); }
  // finished part groups
  function partsKit(root) {
    const parts = {}, anchors = {}, offsets = {};
    return {
      parts, anchors, offsets,
      P(comp, parent = root, off = [0, 0, 0], anchor = [0, 1, 0]) { const g = new T.Group(); g.userData.part = comp; parent.add(g); parts[comp] = g; offsets[comp] = off; anchors[comp] = anchor; return g; },
      tag() { Object.entries(parts).forEach(([c, g]) => g.traverse(o => { if (o.isMesh && !o.userData.cover && !o.userData.noComp) o.userData.comp = o.userData.comp || c; })); }
    };
  }
  // animated power-flow texture (bright dashes moving along a cable)
  function flowTex(color) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 8; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.3, "rgba(0,0,0,0)"); g.addColorStop(0.62, color); g.addColorStop(0.7, color); g.addColorStop(0.74, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 8); const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t;
  }
  function flowCable(parent, pts, r, kind, flows) {
    const color = kind === "dc" ? "#FFB020" : kind === "mv" ? "#B48CFF" : "#36C5F0";
    const c = new T.CatmullRomCurve3(pts.map(p => V3(...p))); const len = c.getLength();
    const tex = flowTex(color); tex.repeat.set(Math.max(1, len / 0.9), 1);
    const seg = Math.max(24, Math.round(len * 6));
    const base = add(parent, new T.TubeGeometry(c, seg, r, 8, false), new T.MeshStandardMaterial({ color: 0x1B1F24, roughness: 0.7, metalness: 0.1 })); base.userData.noComp = true;   // the cable itself
    const m = add(parent, new T.TubeGeometry(c, seg, r * 1.35, 8, false), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), null, null, { shadow: false });
    m.userData.noComp = true; m.renderOrder = 5; flows.push({ tex, kind, mesh: m }); return m;
  }

  // ---------- realistic PV module texture (mono PERC half-cut, silver frame) ----------
  function moduleTex(nx, ny, landscape) {
    const pw = landscape ? 192 : 96, ph = landscape ? 96 : 192;
    const c = document.createElement("canvas"); c.width = nx * pw; c.height = ny * ph; const x = c.getContext("2d");
    x.fillStyle = "#C9CED4"; x.fillRect(0, 0, c.width, c.height);
    const cx = landscape ? 20 : 6, cy = landscape ? 6 : 20;   // half-cut cells
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const ox = i * pw + 3, oy = j * ph + 3, w = pw - 6, h = ph - 6;
      x.fillStyle = "#0B1220"; x.fillRect(ox, oy, w, h);
      const cw = w / cx, ch = h / cy;
      for (let a = 0; a < cx; a++) for (let b = 0; b < cy; b++) {
        const l = 9 + ((a * 7 + b * 3 + i * 5 + j) % 4);
        x.fillStyle = `hsl(222,38%,${l}%)`; x.fillRect(ox + a * cw + 0.6, oy + b * ch + 0.6, cw - 1.2, ch - 1.2);
      }
      // busbars (thin silver lines along the long side of the cells)
      x.strokeStyle = "rgba(190,200,215,.30)"; x.lineWidth = 0.6;
      for (let a = 0; a < cx; a++) for (let k = 1; k < 5; k++) {
        if (landscape) { /* busbars run along y for landscape-rotated cells */ }
        const px = ox + a * cw + k * cw / 5; x.beginPath(); x.moveTo(px, oy); x.lineTo(px, oy + h); x.stroke();
      }
      // half-cut split
      x.fillStyle = "#AEB6C0"; if (landscape) x.fillRect(ox + w / 2 - 1, oy, 2, h); else x.fillRect(ox, oy + h / 2 - 1, w, 2);
      // sheen
      const g = x.createLinearGradient(ox, oy, ox + w, oy + h); g.addColorStop(0, "rgba(255,255,255,.07)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(120,150,210,.06)");
      x.fillStyle = g; x.fillRect(ox, oy, w, h);
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  function pvTableMats(tex) {
    const frame = new T.MeshStandardMaterial({ color: 0xC5CBD2, metalness: 0.8, roughness: 0.35, envMapIntensity: 0.8 });
    const glass = new T.MeshStandardMaterial({ map: tex, metalness: 0.15, roughness: 0.14, envMapIntensity: 1.1 });
    const back = new T.MeshStandardMaterial({ color: 0xE8EBEE, roughness: 0.8 });
    return [frame, frame, glass, back, frame, frame];
  }
  // ground-mounted fixed-tilt tables (instanced) with posts and purlins
  function pvField(parent, o) {
    const { nx, ny, landscape, rows, perRow, tilt, pitchZ, gapX, z0, x0 = 0, postH = 0.9, modW, modH } = o;
    const W = nx * modW, D = ny * modH; const tex = moduleTex(nx, ny, landscape);
    const n = rows * perRow; const top = new T.InstancedMesh(new T.BoxGeometry(W, 0.04, D), pvTableMats(tex), n);
    const posts = new T.InstancedMesh(new T.BoxGeometry(0.1, 1, 0.1), new T.MeshStandardMaterial({ color: 0x9EA7B1, metalness: 0.7, roughness: 0.4 }), n * Math.ceil(nx / 2.5) * 2);
    const purl = new T.InstancedMesh(new T.BoxGeometry(W, 0.06, 0.08), new T.MeshStandardMaterial({ color: 0xA9B1BA, metalness: 0.7, roughness: 0.35 }), n * 2);
    const m4 = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(tilt, 0, 0)), q0 = new T.Quaternion(), s1 = V3(1, 1, 1); let k = 0, kp = 0, ku = 0;
    const hFront = postH, hBack = postH + Math.sin(tilt) * D;
    for (let r = 0; r < rows; r++) for (let c = 0; c < perRow; c++) {
      const x = x0 + (c - (perRow - 1) / 2) * (W + gapX), z = z0 - r * pitchZ, yc = (hFront + hBack) / 2 + 0.06;
      m4.compose(V3(x, yc, z), q, s1); top.setMatrixAt(k++, m4);
      [-D * 0.32, D * 0.32].forEach(dz => { const hh = yc - Math.sin(tilt) * dz - 0.05; m4.compose(V3(x, hh, z + dz * Math.cos(tilt)), q, s1); purl.setMatrixAt(ku++, m4); });
      const np = Math.ceil(nx / 2.5); for (let p = 0; p < np; p++) { const px = x - W / 2 + (p + 0.5) * W / np;
        [-D * 0.32, D * 0.32].forEach(dz => {
          // the south (+z) post is the shorter one: tables tilt towards +z = south
          const hh = dz > 0 ? hFront + (D / 2 - D * 0.32) * Math.sin(tilt) : hFront + (D / 2 + D * 0.32) * Math.sin(tilt);
          m4.compose(V3(px, hh / 2, z + dz * Math.cos(tilt)), q0, V3(1, hh, 1)); posts.setMatrixAt(kp++, m4); }); }
    }
    top.castShadow = true; top.receiveShadow = true; posts.castShadow = true; purl.castShadow = true;
    parent.add(top, posts, purl); return { top, posts, purl, W, D };
  }

  // =====================================================================
  // WIND TURBINE – geared DFIG, 3 MW class (Windey WD156/164, Envision EN-156)
  // Tilt frame: x = rotor axis (rotor at +x), y = up, z = lateral. Shaft axis y = AY.
  // =====================================================================
  function windTurbine(o = {}) {
    const hub = o.hub || 110, D = o.rotor || 156, R = D / 2 - 2.6, detail = !!o.detail;
    const M = matFactory();
    const white = M("tower", 0xF2F4F7, { metalness: 0.05, roughness: 0.38 });
    const g = new T.Group(); const tH = hub - 2.3;
    const K = partsKit(g);
    // ---- tower, flanges, door, foundation
    const tw = K.P("tower", g, [0, 0, 0], [0, tH * 0.55, 2.6]);
    add(tw, cyl(1.65, 2.4, tH, 48), white, [0, tH / 2, 0]);
    const fl = M("tower", 0xD9DEE4, { metalness: 0.3, roughness: 0.4 });
    [0.22, 0.46, 0.7, 0.88].forEach(f => { const r = 2.4 - (2.4 - 1.65) * f; add(tw, torusY(r + 0.02, 0.05, 56), fl, [0, tH * f, 0], null, { shadow: false }); });
    add(tw, box(0.12, 2.3, 1.05), M("tower", 0x6B7787, { metalness: 0.4 }), [0, 1.9, 2.38], [0, Math.PI / 2, 0]);
    add(tw, box(1.6, 0.18, 1.2), M("tower", 0x9AA3AE, { metalness: 0.6 }), [0, 0.75, 3.0]);           // landing
    for (let i = 0; i < 4; i++) add(tw, box(1.2, 0.06, 0.32), M("tower", 0x9AA3AE, { metalness: 0.6 }), [0, 0.12 + i * 0.16, 3.75 + i * 0.3 * -1 + 0.9]);
    add(g, cyl(7.0, 7.4, 0.9, 48), M("fnd", 0x9A9D9F, { metalness: 0, roughness: 0.95 }), [0, 0.15, 0]).userData.noComp = true;
    if (detail) { // box-type 35 kV transformer next to the tower
      const kt = new T.Group(); kt.position.set(9, 0, 6); g.add(kt);
      add(kt, box(2.8, 2.3, 2.0), M("kiosk", 0xDCE1E6, { metalness: 0.15, roughness: 0.6 }), [0, 1.35, 0]).userData.noComp = true;
      add(kt, box(3.0, 0.15, 2.2), M("kiosk", 0x9AA3AE, { metalness: 0.3 }), [0, 2.55, 0]).userData.noComp = true;
      add(kt, box(3.2, 0.2, 2.4), M("fnd", 0x9A9D9F, { metalness: 0, roughness: 0.95 }), [0, 0.1, 0]).userData.noComp = true;
      for (let i = 0; i < 6; i++) add(kt, box(0.03, 0.9, 0.5), M("kiosk", 0x9AA3AE, { metalness: 0.4 }), [-1.0 + i * 0.4, 1.1, 1.01]).userData.noComp = true;
    }
    // ---- yaw frame
    const yawG = new T.Group(); yawG.position.y = hub; g.add(yawG);
    const tilt = new T.Group(); tilt.rotation.z = 5 * Math.PI / 180; yawG.add(tilt);
    const AY = 0.5, HY = 1.4;
    // ---- nacelle cover (GRP), front at x = 3.0
    const coverMat = M("cover", 0xF2F4F7, { metalness: 0.05, roughness: 0.36, side: T.DoubleSide });
    const cover = new T.Group(); cover.userData.part = "cover"; tilt.add(cover);
    const shell = add(cover, rbox(13.6, 5.0, 4.5, 0.9), coverMat, [-3.8, 0.6, 0]); shell.userData.cover = true;
    const trim = M("cover", 0xC9D0D8, { metalness: 0.3, roughness: 0.4 });
    add(cover, box(11.0, 0.08, 0.06), trim, [-4.3, 3.12, 1.6]).userData.cover = true;
    add(cover, box(11.0, 0.08, 0.06), trim, [-4.3, 3.12, -1.6]).userData.cover = true;
    for (let i = 0; i < 7; i++) { add(cover, cyl(0.03, 0.03, 0.35, 6), trim, [-9.6 + i * 1.75, 3.27, 1.6]).userData.cover = true; add(cover, cyl(0.03, 0.03, 0.35, 6), trim, [-9.6 + i * 1.75, 3.27, -1.6]).userData.cover = true; }
    add(cover, box(1.2, 0.06, 1.0), M("cover", 0xDDE2E8, { metalness: 0.2 }), [-8.6, 3.12, 0]).userData.cover = true;    // roof hatch
    add(cover, box(2.2, 0.08, 1.6), M("cover", 0x2A3038, { metalness: 0.4, roughness: 0.6 }), [-6.4, 3.12, 0]).userData.cover = true; // cooler outlet grille
    // met mast: ultrasonic anemometer + vane, aviation light
    const mastM = M("cover", 0xB8C0C9, { metalness: 0.6, roughness: 0.35 });
    add(cover, cyl(0.06, 0.08, 1.8, 8), mastM, [-9.8, 4.0, 0]).userData.cover = true;
    add(cover, box(0.05, 0.05, 1.6), mastM, [-9.8, 4.85, 0]).userData.cover = true;
    const us = add(cover, cyl(0.09, 0.09, 0.22, 12), M("cover", 0xE6E9ED, { metalness: 0.1 }), [-9.8, 5.0, 0.75]); us.userData.cover = true;
    for (let i = 0; i < 3; i++) add(cover, cyl(0.012, 0.012, 0.22, 4), mastM, [-9.8 + 0.07 * Math.cos(i * 2.1), 5.18, 0.75 + 0.07 * Math.sin(i * 2.1)]).userData.cover = true;
    const vane = new T.Group(); vane.position.set(-9.8, 5.0, -0.75); cover.add(vane);
    add(vane, box(0.5, 0.02, 0.02), mastM, [-0.15, 0, 0]).userData.cover = true; add(vane, box(0.02, 0.16, 0.12), mastM, [-0.38, 0, 0]).userData.cover = true;
    const av = add(cover, new T.SphereGeometry(0.16, 14, 10), new T.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 2 }), [-9.8, 5.08, 0], null, { shadow: false }); av.userData.cover = true;
    K.offsets.cover = [0, 11, 0];

    // ---- rotor (rotating): hub casting, pitch bearings/drives/cabinets, spinner, blades
    const rotor = new T.Group(); rotor.position.set(3.0, AY, 0); tilt.add(rotor);
    const rotorWrap = rotor;
    const hp = K.P("hubPitch", rotor, [0, 0, 0], [1.0, 2.9, 0]);
    const hubM = M("hubPitch", 0x8E959C, { metalness: 0.65, roughness: 0.42 });
    if (detail) {
      add(hp, new T.SphereGeometry(1.72, 36, 26), hubM, [1.0, 0, 0]);
      add(hp, cyl(1.05, 1.05, 0.35, 40), hubM, [-0.05, 0, 0], RX);
      for (let i = 0; i < 3; i++) { // pitch cabinets & batteries between the blades
        const a = (i + 0.5) * 2 * Math.PI / 3; const cab = add(hp, box(0.5, 0.55, 0.35), M("hubPitch", 0xC8CDD3, { metalness: 0.2, roughness: 0.5 }), [0.55, Math.cos(a) * 1.05, Math.sin(a) * 1.05], [a, 0, 0]);
        add(hp, box(0.3, 0.35, 0.3), M("hubPitch", 0x2E3540, { metalness: 0.3 }), [1.45, Math.cos(a) * 1.0, Math.sin(a) * 1.0], [a, 0, 0]);
      }
    }
    const spinPts = []; for (let i = 0; i <= 18; i++) { const a = i / 18; spinPts.push(new T.Vector2(Math.max(0.001, 2.35 * Math.cos(a * Math.PI / 2) ** 0.9), 4.4 * Math.sin(a * Math.PI / 2))); }
    const spinMat = M("cover", 0xF2F4F7, { metalness: 0.05, roughness: 0.36, side: T.DoubleSide });
    const spinner = add(rotor, new T.LatheGeometry(spinPts, 48), spinMat, [-0.55, 0, 0], [0, 0, -Math.PI / 2]); spinner.userData.cover = true;
    const bg = U.bladeGeo(R); const blades = [], pitchG = [];
    const bladeM = M("blades", 0xF2F4F7, { metalness: 0.05, roughness: 0.38 });
    const bl = K.P("blades", rotor, [0, 0, 0], [1.0, 24, 0]);
    for (let i = 0; i < 3; i++) {
      const holder = new T.Group(); holder.position.x = 1.0; holder.rotation.x = i * 2 * Math.PI / 3; rotor.add(holder);
      const brg = new T.Group(); holder.add(brg); brg.userData.part = "hubPitch";
      // pitch bearing (outer ring fixed to hub) + pitch drive motor/gear
      add(brg, torusY(1.28, 0.13, 48), M("hubPitch", 0x5E6670, { metalness: 0.7, roughness: 0.35 }), [0, 1.95, 0]);
      if (detail) { add(brg, cyl(0.17, 0.17, 0.75, 20), M("hubPitch", 0x34536F, { metalness: 0.4 }), [-0.55, 1.35, 0.85]);
        add(brg, cyl(0.21, 0.21, 0.28, 20), M("hubPitch", 0x707A86, { metalness: 0.6 }), [-0.55, 1.85, 0.85]); }
      const pg = new T.Group(); pg.position.y = 2.0; holder.add(pg);
      const root = add(pg, cyl(1.18, 1.25, 1.5, 36), bladeM, [0, 0.75, 0]);
      const b = add(pg, bg, bladeM, [0, 0.6, 0]); blades.push(b); pitchG.push(pg);
      if (detail) add(pg, torusY(1.16, 0.06, 40), M("hubPitch", 0x7A838E, { metalness: 0.7 }), [0, 0.05, 0]); // inner (rotating) ring
    }
    rotor.traverse(x => { if (x.isMesh && !x.userData.cover) x.userData.comp = x.material === bladeM ? "blades" : "hubPitch"; });
    const ring = add(g, new T.RingGeometry(9, 11.5, 48), new T.MeshBasicMaterial({ color: U.COL.crit, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }), [0, 0.65, 0], [-Math.PI / 2, 0, 0], { shadow: false }); ring.userData.noComp = true;

    const spin = [{ obj: rotor, axis: "x", k: 1 }];
    const refs = { yawG, rotor, rotorWrap, pitchG, blades, av, ring, tilt, shell, vane, cover: [], spin, parts: K.parts, anchors: K.anchors, offsets: K.offsets, fans: [], flows: [] };
    if (!detail) { // exterior-only turbine (wind-farm scenes): close the nacelle bottom with a yaw skirt
      add(yawG, cyl(1.95, 1.95, 0.5, 40), white, [0, -1.95, 0]);
      K.tag(); cover.traverse(x => { if (x.isMesh) x.userData.cover = true; }); g.userData.refs = refs; g.userData.rpm = 0; g.userData.pitch = 0; return g; }

    // ---- low-speed shaft with flange + rotor-lock disc (rotating)
    const lowSpd = new T.Group(); lowSpd.position.set(3.0, AY, 0); tilt.add(lowSpd); lowSpd.userData.part = "mainBear";
    const shaftM = M("mainBear", 0xA7AFB8, { metalness: 0.85, roughness: 0.28 });
    add(lowSpd, cyl(0.46, 0.64, 3.5, 40), shaftM, [-1.75, 0, 0], RX);
    add(lowSpd, cyl(0.98, 0.98, 0.14, 48), shaftM, [-0.08, 0, 0], RX);
    add(lowSpd, cyl(1.12, 1.12, 0.09, 48), M("mainBear", 0x6E7681, { metalness: 0.75, roughness: 0.35 }), [-0.5, 0, 0], RX);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; add(lowSpd, cyl(0.06, 0.06, 0.1, 10), M("mainBear", 0x2A2F36, { metalness: 0.3 }), [-0.5, Math.cos(a) * 0.95, Math.sin(a) * 0.95], RX); }
    lowSpd.traverse(x => { if (x.isMesh) x.userData.comp = "mainBear"; }); spin.push({ obj: lowSpd, axis: "x", k: 1 });

    // ---- bedplate (cast) + rear frame + floor grating (static, not a health component)
    const frame = new T.Group(); tilt.add(frame);
    const castM = new T.MeshStandardMaterial({ color: 0x5A636D, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.7 });
    add(frame, box(4.0, 0.22, 3.0), castM, [0.6, -1.05, 0]); add(frame, box(4.0, 0.75, 0.24), castM, [0.6, -1.5, 1.38]); add(frame, box(4.0, 0.75, 0.24), castM, [0.6, -1.5, -1.38]);
    add(frame, box(0.24, 0.75, 3.0), castM, [2.5, -1.5, 0]); add(frame, box(0.24, 0.75, 3.0), castM, [-1.3, -1.5, 0]);
    [1.78, -1.78].forEach(z => add(frame, box(0.8, 0.55, 0.7), castM, [-0.9, -1.0, z]));         // torque-arm pedestals
    const railM = new T.MeshStandardMaterial({ color: 0x4D555F, metalness: 0.55, roughness: 0.45, envMapIntensity: 0.7 });
    [1.15, -1.15].forEach(z => add(frame, box(9.2, 0.5, 0.32), railM, [-5.9, -1.38, z]));
    [-3.2, -6.4, -9.6].forEach(x => add(frame, box(0.3, 0.4, 2.0), railM, [x, -1.42, 0]));
    const grat = moduleGrating(); add(frame, box(11.6, 0.05, 3.9), new T.MeshStandardMaterial({ map: grat, color: 0x9AA2AB, metalness: 0.6, roughness: 0.5 }), [-4.6, -1.1, 0], null, { shadow: false });
    frame.traverse(x => x.userData.noComp = true);

    // ---- main bearing housing (static)
    const mb = K.P("mainBear", tilt, [2.2, 2.4, 0], [0, 1.4, 0]); mb.position.set(2.0, 0, 0);
    const mbM = M("mainBear", 0x5D6670, { metalness: 0.6, roughness: 0.45 });
    add(mb, cyl(1.05, 1.05, 0.95, 48), mbM, [0, AY, 0], RX); add(mb, torusX(1.05, 0.09), mbM, [0.48, AY, 0]); add(mb, torusX(1.05, 0.09), mbM, [-0.48, AY, 0]);
    add(mb, box(1.5, 1.05, 2.3), mbM, [0, AY - 0.98, 0]);
    for (let i = 0; i < 4; i++) add(mb, cyl(0.07, 0.07, 0.25, 10), M("mainBear", 0x2A2F36, { metalness: 0.4 }), [-0.55 + (i % 2) * 1.1, AY - 0.4, i < 2 ? 1.05 : -1.05]);
    tube(mb, [[0, AY + 1.05, 0.2], [-0.3, AY + 1.6, 0.6], [-1.5, AY + 1.9, 1.2]], 0.025, M("mainBear", 0x1E2329, { metalness: 0.2 }), 20);

    // ---- gearbox: two planetary stages + parallel stage, torque arms on elastomer bushings
    const gb = K.P("gearbox", tilt, [0, 3.3, 0], [-1.6, 2.1, 0]);
    const gbM = M("gearbox", 0x7E8B98, { metalness: 0.55, roughness: 0.42 });
    add(gb, cyl(1.45, 1.45, 1.25, 56), gbM, [-0.9, AY, 0], RX);
    add(gb, torusX(1.46, 0.08, 56), gbM, [-0.3, AY, 0]); add(gb, torusX(1.46, 0.08, 56), gbM, [-1.5, AY, 0]);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; add(gb, box(1.15, 0.08, 0.08), gbM, [-0.9, AY + Math.cos(a) * 1.47, Math.sin(a) * 1.47], [a, 0, 0]); }   // casting ribs
    add(gb, cyl(1.2, 1.2, 0.8, 48), gbM, [-1.95, AY, 0], RX);
    add(gb, rbox(1.0, 2.35, 2.4, 0.12), gbM, [-2.8, AY + 0.35, 0]);
    add(gb, cyl(0.33, 0.33, 0.35, 28), gbM, [-3.42, HY, 0], RX);
    [1.72, -1.72].forEach(z => { add(gb, box(0.7, 0.45, 0.85), gbM, [-0.9, AY - 0.45, z * 0.82]); add(gb, cyl(0.3, 0.3, 0.42, 24), M("gearbox", 0x16191D, { metalness: 0.05, roughness: 0.9 }), [-0.9, AY - 0.92, z]); });
    add(gb, box(0.5, 0.35, 0.4), M("gearbox", 0x3A4350, { metalness: 0.4 }), [-2.8, AY - 0.75, 1.35]);         // oil pump
    [0.2, -0.2].forEach(dz => add(gb, cyl(0.12, 0.12, 0.55, 16), M("gearbox", 0xC9CED4, { metalness: 0.4 }), [-2.3, AY - 0.95, -1.35 + dz]));   // filters
    add(gb, box(0.35, 0.18, 0.12), M("gearbox", 0xE9C46A, { metalness: 0.2, roughness: 0.5 }), [-2.8, AY + 0.9, 1.21]);   // nameplate

    // ---- high-speed shaft: brake disc + composite coupling (rotating)
    const hss = new T.Group(); hss.position.set(-3.62, HY, 0); tilt.add(hss); hss.userData.part = "brakeHyd";
    const discM = M("brakeHyd", 0xB4BBC3, { metalness: 0.9, roughness: 0.25 });
    add(hss, cyl(0.52, 0.52, 0.05, 48), discM, [0, 0, 0], RX);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(hss, box(0.06, 0.16, 0.03), M("brakeHyd", 0x2A2F36, { metalness: 0.4 }), [0.03, Math.cos(a) * 0.36, Math.sin(a) * 0.36], [a, 0, 0]); }
    add(hss, cyl(0.3, 0.3, 0.12, 32), M("brakeHyd", 0x6F7A86, { metalness: 0.7 }), [-0.25, 0, 0], RX);
    add(hss, cyl(0.15, 0.15, 1.1, 24), M("brakeHyd", 0xD9A441, { metalness: 0.3, roughness: 0.45 }), [-0.88, 0, 0], RX);   // GRP spacer tube
    add(hss, cyl(0.3, 0.3, 0.12, 32), M("brakeHyd", 0x6F7A86, { metalness: 0.7 }), [-1.48, 0, 0], RX);
    hss.traverse(x => { if (x.isMesh) x.userData.comp = "brakeHyd"; }); spin.push({ obj: hss, axis: "x", k: 112 });
    // brake caliper + hydraulic power unit (static)
    const bh = K.P("brakeHyd", tilt, [0, 1.0, -2.6], [-3.4, 0.4, -1.3]);
    const calM = M("brakeHyd", 0xC0392B, { metalness: 0.35, roughness: 0.45 });
    add(bh, box(0.24, 0.34, 0.3), calM, [-3.62, HY + 0.5, 0]); add(bh, box(0.3, 0.6, 0.12), M("brakeHyd", 0x59626C, { metalness: 0.5 }), [-3.62, HY + 0.32, -0.3]);
    add(bh, box(0.75, 0.5, 0.55), M("brakeHyd", 0x3E4650, { metalness: 0.4 }), [-3.4, -0.82, -1.45]);
    [-3.65, -3.2].forEach(x => add(bh, cyl(0.1, 0.1, 0.55, 16), M("brakeHyd", 0xC0392B, { metalness: 0.4 }), [x, -0.3, -1.45]));
    tube(bh, [[-3.4, -0.55, -1.25], [-3.5, 0.5, -0.9], [-3.62, HY + 0.6, -0.15]], 0.02, M("brakeHyd", 0x1E2329, { metalness: 0.2 }), 24);

    // ---- generator (DFIG): ribbed frame, end shields, slip-ring housing, terminal box
    const gen = K.P("generator", tilt, [-1.8, 3.6, 0], [-6.45, HY + 1.0, 0]);
    const genM = M("generator", 0x2F5F8E, { metalness: 0.4, roughness: 0.42 });
    add(gen, cyl(0.95, 0.95, 2.5, 48), genM, [-6.45, HY, 0], RX);
    for (let i = 0; i < 13; i++) add(gen, torusX(0.965, 0.03, 48), genM, [-5.4 - i * 0.175, HY, 0]);
    add(gen, cyl(0.95, 0.78, 0.25, 48), genM, [-5.08, HY, 0], RX); add(gen, cyl(0.78, 0.95, 0.25, 48), genM, [-7.82, HY, 0], RX);
    add(gen, cyl(0.1, 0.1, 0.25, 16), M("generator", 0xB4BBC3, { metalness: 0.9, roughness: 0.25 }), [-4.92, HY, 0], RX);
    add(gen, cyl(0.5, 0.5, 0.6, 36), M("generator", 0x5A6470, { metalness: 0.5 }), [-8.25, HY, 0], RX);
    add(gen, box(0.6, 0.45, 0.42), genM, [-6.4, HY + 0.2, 1.06]);
    [[-5.6, 0.7], [-5.6, -0.7], [-7.3, 0.7], [-7.3, -0.7]].forEach(([x, z]) => add(gen, box(0.32, 1.55, 0.3), M("generator", 0x4D555F, { metalness: 0.5 }), [x, -0.33, z]));
    // ---- cooling: generator air-to-air cooler + gearbox oil cooler with fans
    const cool = K.P("cooling", tilt, [-0.6, 6.6, 0], [-5.2, 3.15, 0]);
    const coolM = M("cooling", 0xC9CFD6, { metalness: 0.55, roughness: 0.35 });
    add(cool, box(2.1, 0.5, 1.5), coolM, [-6.45, HY + 1.22, 0]);
    add(cool, box(1.3, 0.35, 1.0), coolM, [-2.6, HY + 1.35, 0]);
    const fans = [];
    [[-6.95, HY + 1.5, 0], [-5.95, HY + 1.5, 0], [-2.6, HY + 1.55, 0]].forEach(p => { add(cool, cyl(0.36, 0.36, 0.06, 32, true), M("cooling", 0x2A3038, { metalness: 0.3 }), p);
      const f = new T.Group(); f.position.set(...p); cool.add(f); for (let i = 0; i < 5; i++) add(f, box(0.32, 0.015, 0.1), M("cooling", 0x3B4450, { metalness: 0.4 }), [0.16 * Math.cos(i * 1.2566), 0.02, 0.16 * Math.sin(i * 1.2566)], [0, -i * 1.2566, 0.35]); fans.push(f); });
    tube(cool, [[-2.8, AY + 1.55, 0.6], [-2.75, HY + 1.0, 0.5], [-2.6, HY + 1.2, 0.35]], 0.04, M("cooling", 0x30363E, { metalness: 0.3 }), 16);
    tube(cool, [[-2.8, AY + 1.55, -0.6], [-2.75, HY + 1.0, -0.5], [-2.6, HY + 1.2, -0.35]], 0.04, M("cooling", 0x30363E, { metalness: 0.3 }), 16);
    // ---- converter + control cabinets (rear), power cables
    const cv = K.P("converter", tilt, [-3.2, 1.2, 0], [-9.3, 1.3, 0.2]);
    const cabM = M("converter", 0xD4D9DF, { metalness: 0.25, roughness: 0.55 });
    [[0.95, 2.1], [-0.4, 2.1]].forEach(([z, h]) => { add(cv, box(0.75, h, 1.3), cabM, [-9.45, -1.08 + h / 2, z]);
      add(cv, box(0.02, h - 0.2, 0.02), M("converter", 0x8C949E, { metalness: 0.4 }), [-9.07, -1.08 + h / 2, z]);
      add(cv, box(0.03, 0.18, 0.04), M("converter", 0x30363E, { metalness: 0.3 }), [-9.06, -0.05, z + 0.5]);
      for (let i = 0; i < 4; i++) add(cv, box(0.02, 0.05, 0.9), M("converter", 0x8C949E, { metalness: 0.4 }), [-9.065, -0.9 + i * 0.08, z]); });
    add(cv, box(0.6, 1.3, 0.75), cabM, [-8.4, -0.43, -1.55]);                                 // main control cabinet (PLC)
    add(cv, new T.PlaneGeometry(0.3, 0.2), new T.MeshBasicMaterial({ color: 0x1D3557 }), [-8.4, -0.2, -1.17]);
    const cblM = M("converter", 0x15181C, { metalness: 0.1, roughness: 0.8 });
    [-0.08, 0, 0.08].forEach(d => tube(cv, [[-6.4, HY + 0.43, 1.06 + d], [-7.5, HY + 0.9, 1.0 + d], [-8.8, 1.2, 0.95 + d], [-9.45, 1.05, 0.95 + d]], 0.03, cblM, 28));
    [-0.1, 0, 0.1].forEach(d => tube(cv, [[-9.1, -1.0, 0.95 + d], [-7.0, -1.05, 1.6], [-1.5, -1.05, 1.6], [0.2, -1.6, 0.9 + d], [0.15, -3.0, 0.4 + d]], 0.035, cblM, 40)); // to tower
    // ---- yaw system: bearing with gear ring, 6 drives, 8 brake calipers, skirt
    const yw = K.P("yaw", yawG, [0, -2.6, 0], [1.6, -0.6, 0]);
    const ywM = M("yaw", 0x6B7480, { metalness: 0.7, roughness: 0.38 });
    add(yw, torusY(1.72, 0.16, 64), ywM, [0, -1.92, 0]); add(yw, torusY(1.5, 0.11, 64), M("yaw", 0x8E969F, { metalness: 0.8, roughness: 0.3 }), [0, -1.92, 0]);
    const teeth = new T.InstancedMesh(box(0.07, 0.2, 0.12), M("yaw", 0x8E969F, { metalness: 0.8, roughness: 0.3 }), 96); const m4 = new T.Matrix4();
    for (let i = 0; i < 96; i++) { const a = i * 2 * Math.PI / 96; m4.compose(V3(Math.cos(a) * 1.38, -1.92, Math.sin(a) * 1.38), new T.Quaternion().setFromEuler(new T.Euler(0, -a, 0)), V3(1, 1, 1)); teeth.setMatrixAt(i, m4); } yw.add(teeth);
    [30, 90, 150, 210, 270, 330].forEach(d => { const a = d * Math.PI / 180, x = Math.cos(a) * 1.2, z = Math.sin(a) * 1.2;
      add(yw, cyl(0.2, 0.22, 0.55, 24), M("yaw", 0x7C8794, { metalness: 0.55 }), [x, -1.5, z]);
      add(yw, cyl(0.17, 0.17, 0.5, 24), M("yaw", 0x34536F, { metalness: 0.4 }), [x, -0.98, z]);
      add(yw, cyl(0.19, 0.19, 0.08, 24), M("yaw", 0x2A2F36, { metalness: 0.3 }), [x, -0.7, z]); });
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; add(yw, box(0.22, 0.24, 0.32), M("yaw", 0xC0392B, { metalness: 0.35 }), [Math.cos(a) * 1.95, -2.1, Math.sin(a) * 1.95], [0, -a, 0]); }
    const skirt = add(yawG, cyl(2.05, 2.05, 0.35, 48, true), coverMat, [0, -2.2, 0]); skirt.userData.cover = true; cover.userData.skirt = skirt;
    yw.userData.frame = "yawG";

    K.tag(); cover.traverse(x => { if (x.isMesh) x.userData.cover = true; }); skirt.userData.cover = true;
    refs.lowSpd = lowSpd; refs.hss = hss; refs.fans = fans; refs.coverGroup = cover; refs.coverMats = [coverMat, spinMat];
    refs.clip = { frame: tilt, normal: [0, 0, -1], point: [0, 0, 0.02] };
    refs.explodable = { rotor: [7.5, 0, 0], lowSpd: [3.4, 0, 0], mainBear: K.offsets.mainBear, gearbox: K.offsets.gearbox, brakeHyd: K.offsets.brakeHyd, hss: [-0.3, 4.8, 0], generator: K.offsets.generator, cooling: K.offsets.cooling, converter: K.offsets.converter, yaw: K.offsets.yaw, cover: K.offsets.cover };
    refs.explodeObj = { rotor, lowSpd, mainBear: mb, gearbox: gb, brakeHyd: bh, hss, generator: gen, cooling: cool, converter: cv, yaw: yw, cover };
    g.userData.refs = refs; g.userData.rpm = 0; g.userData.pitch = 0;
    return g;
  }
  function moduleGrating() { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#6F7780"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#3B4148"; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) x.fillRect(i * 8 + 1.5, j * 8 + 1.5, 5, 5); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(60, 20); return t; }

  // =====================================================================
  // CENTRAL INVERTER SKID – Vĩnh Hảo (Sungrow SG630MX class) + MV transformer + PV tables
  // Model frame: +z = south (front of the cabinet, camera side), y up.
  // =====================================================================
  function solarCentral(s) {
    const M = matFactory(); const g = new T.Group(); const K = partsKit(g); const flows = [], fans = [], leds = [];
    // ground: compacted gravel + concrete pad
    const grav = noiseTex("#B9AD92", "#9C917A", 256); grav.repeat.set(30, 30);
    add(g, new T.PlaneGeometry(160, 160), new T.MeshStandardMaterial({ map: grav, roughness: 1 }), [0, 0, 0], [-Math.PI / 2, 0, 0], { shadow: false }).userData.noComp = true;
    add(g, box(10.5, 0.3, 4.6), M("pad", 0xB7B5AE, { metalness: 0, roughness: 0.95 }), [0.4, 0.15, 0]).userData.noComp = true;
    // ---- inverter cabinet (W 3.0 × H 2.2 × D 1.0), base at y = 0.3
    const W = 3.0, H = 2.2, Dp = 1.0, cx = -2.0, y0 = 0.4;
    const cab = K.P("cabinet", g, [0, 0, 0], [cx + 1.1, y0 + H + 0.45, 0.3]);
    const shellM = M("cover", 0xE4E8EC, { metalness: 0.2, roughness: 0.5, side: T.DoubleSide });
    const cover = new T.Group(); g.add(cover); cover.userData.part = "cover";
    add(cover, box(W, H, Dp), shellM, [cx, y0 + H / 2, 0]);
    add(cover, box(W + 0.1, 0.12, Dp + 0.12), M("cover", 0xCDD3D9, { metalness: 0.3 }), [cx, y0 + H + 0.06, 0]);
    add(cover, box(W - 0.2, 0.32, Dp - 0.1), M("cover", 0xD5DAE0, { metalness: 0.25 }), [cx, y0 + H + 0.28, 0]);      // air outlet hood
    for (let i = 0; i < 3; i++) add(cover, box(0.85, 0.22, 0.02), M("cover", 0x2A3038, { metalness: 0.3 }), [cx - 1.0 + i * 1.0, y0 + H + 0.28, Dp / 2 - 0.04]);
    for (let i = 0; i < 3; i++) { const dx = cx - W / 3 + i * W / 3; // doors, louvers, handles, labels
      add(cover, box(W / 3 - 0.05, H - 0.12, 0.02), M("cover", 0xDCE1E6, { metalness: 0.2, roughness: 0.5, side: T.DoubleSide }), [dx, y0 + H / 2, Dp / 2 + 0.012]);
      for (let k = 0; k < 7; k++) add(cover, box(W / 3 - 0.3, 0.025, 0.04), M("cover", 0x8D96A0, { metalness: 0.4 }), [dx, y0 + 0.2 + k * 0.06, Dp / 2 + 0.03]);
      add(cover, box(0.04, 0.24, 0.05), M("cover", 0x2F353D, { metalness: 0.4 }), [dx + W / 6 - 0.12, y0 + H / 2, Dp / 2 + 0.05]);
      add(cover, new T.PlaneGeometry(0.16, 0.14), new T.MeshBasicMaterial({ color: 0xF2C14E }), [dx - 0.25, y0 + H - 0.35, Dp / 2 + 0.025]); }
    add(cover, new T.PlaneGeometry(0.32, 0.18), new T.MeshBasicMaterial({ color: 0x15253D }), [cx + 0.05, y0 + 1.45, Dp / 2 + 0.026]);   // HMI
    const led = add(cover, new T.CircleGeometry(0.025, 16), new T.MeshStandardMaterial({ color: U.COL.ok, emissive: U.COL.ok, emissiveIntensity: 2 }), [cx + 0.3, y0 + 1.5, Dp / 2 + 0.027], null, { shadow: false }); leds.push(led);
    for (let k = 0; k < 6; k++) add(cover, box(0.02, 0.6, 0.3), M("cover", 0x8D96A0, { metalness: 0.4 }), [cx - W / 2 - 0.012, y0 + 0.5 + k * 0.01, -0.2 + k * 0.08]);
    cover.traverse(x => { if (x.isMesh) x.userData.cover = true; });
    // interior frame
    add(cab, box(W - 0.1, 0.06, Dp - 0.1), M("cabinet", 0x8D96A0, { metalness: 0.5 }), [cx, y0 + 0.05, 0]);
    [-W / 6, W / 6].forEach(dx => add(cab, box(0.04, H - 0.1, Dp - 0.12), M("cabinet", 0xB5BCC4, { metalness: 0.4 }), [cx + dx, y0 + H / 2, -0.02]));
    add(cab, box(0.5, 0.35, 0.03), M("cabinet", 0x1F6B3A, { metalness: 0.2, roughness: 0.6 }), [cx + W / 3, y0 + 1.75, -0.38]);         // control board
    for (let i = 0; i < 6; i++) add(cab, box(0.04, 0.04, 0.02), M("cabinet", 0x2A2F36), [cx + W / 3 - 0.18 + i * 0.07, y0 + 1.85, -0.36]);
    // ---- DC input bay (left): DC busbars, DC breakers, fuse rows, SPD
    const dc = K.P("dcIn", g, [-0.8, 0, 1.4], [cx - 1.05, y0 + 0.55, 0.45]);
    const cu = M("dcIn", 0xC27A3E, { metalness: 0.85, roughness: 0.3 });
    [-0.25, -0.15].forEach(z => add(dc, box(0.6, 0.06, 0.02), cu, [cx - W / 3, y0 + 1.6, z]));
    for (let i = 0; i < 2; i++) { add(dc, box(0.34, 0.42, 0.22), M("dcIn", 0x2F353D, { metalness: 0.3 }), [cx - W / 3 - 0.2 + i * 0.4, y0 + 1.15, 0.05]); add(dc, box(0.06, 0.12, 0.06), M("dcIn", 0xD9A441, { metalness: 0.2 }), [cx - W / 3 - 0.2 + i * 0.4, y0 + 1.2, 0.2]); }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) add(dc, cyl(0.03, 0.03, 0.12, 12), M("dcIn", 0xE8E2D0, { metalness: 0.1 }), [cx - W / 3 - 0.35 + i * 0.1, y0 + 0.6 + r * 0.2, 0.0], RZ);
    add(dc, box(0.5, 0.12, 0.1), M("dcIn", 0x7C3AED, { metalness: 0.2 }), [cx - W / 3, y0 + 0.35, 0.05]);
    // ---- power stage (middle): IGBT phase legs on finned heatsinks + DC-link capacitor bank
    const ig = K.P("igbtMod", g, [0, 0.4, 1.7], [cx + 0.05, y0 + 1.85, 0.45]);
    const al = M("igbtMod", 0xB9C0C8, { metalness: 0.85, roughness: 0.3 });
    for (let p = 0; p < 3; p++) { const y = y0 + 1.2 + p * 0.25; add(ig, box(0.75, 0.16, 0.42), al, [cx, y, -0.1]);
      for (let f = 0; f < 10; f++) add(ig, box(0.75, 0.015, 0.16), al, [cx, y - 0.04 + f * 0.009, -0.4]);
      for (let m = 0; m < 3; m++) add(ig, box(0.16, 0.035, 0.1), M("igbtMod", 0x1E3A5F, { metalness: 0.2, roughness: 0.5 }), [cx - 0.24 + m * 0.24, y + 0.1, -0.05]);
      add(ig, box(0.7, 0.012, 0.18), M("igbtMod", 0x1F6B3A, { roughness: 0.6 }), [cx, y + 0.13, 0.08]); }
    const dl = K.P("dcLink", g, [0, -0.3, 1.7], [cx - 0.05, y0 + 0.9, 0.45]);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) add(dl, cyl(0.055, 0.055, 0.24, 18), M("dcLink", 0x5B8DB8, { metalness: 0.3, roughness: 0.4 }), [cx - 0.3 + i * 0.12, y0 + 0.55 + r * 0.02, -0.25 + r * 0.14]);
    add(dl, box(0.8, 0.02, 0.5), cu, [cx, y0 + 0.69, -0.1]);
    // ---- AC bay (right): LCL filter reactors (3 coils), AC breaker, AC busbars
    const flt = K.P("filter", g, [0.8, -0.2, 1.5], [cx + 1.05, y0 + 0.55, 0.45]);
    const core = M("filter", 0x5D6670, { metalness: 0.6 });
    add(flt, box(0.8, 0.08, 0.35), core, [cx + W / 3, y0 + 0.32, -0.1]); add(flt, box(0.8, 0.08, 0.35), core, [cx + W / 3, y0 + 0.98, -0.1]);
    for (let i = 0; i < 3; i++) add(flt, cyl(0.12, 0.12, 0.58, 28), M("filter", 0xB8742F, { metalness: 0.8, roughness: 0.32 }), [cx + W / 3 - 0.26 + i * 0.26, y0 + 0.65, -0.1]);
    const ac = K.P("acOut", g, [1.2, 0.3, 1.3], [cx + 1.05, y0 + 1.75, 0.45]);
    add(ac, box(0.5, 0.42, 0.3), M("acOut", 0x22272E, { metalness: 0.3 }), [cx + W / 3 - 0.1, y0 + 1.35, 0.0]);
    add(ac, box(0.08, 0.14, 0.08), M("acOut", 0xD62828, { metalness: 0.2 }), [cx + W / 3 - 0.1, y0 + 1.38, 0.18]);
    [-0.3, -0.18, -0.06].forEach(z => add(ac, box(0.04, 0.5, 0.025), M("acOut", 0xC27A3E, { metalness: 0.85, roughness: 0.3 }), [cx + W / 3 + 0.28, y0 + 1.25, z]));
    // ---- cooling fans in the roof hood (rotating)
    const fn = K.P("fans", g, [0, 1.2, 0], [cx, y0 + H + 0.65, 0]);
    for (let i = 0; i < 3; i++) { const p = [cx - 1.0 + i * 1.0, y0 + H - 0.05, -0.05]; add(fn, cyl(0.3, 0.3, 0.12, 32, true), M("fans", 0x2A3038, { metalness: 0.3, side: T.DoubleSide }), p);
      const f = new T.Group(); f.position.set(...p); fn.add(f); for (let b = 0; b < 7; b++) add(f, box(0.26, 0.012, 0.08), M("fans", 0x3B4450, { metalness: 0.3 }), [0.13 * Math.cos(b * 0.8976), 0, 0.13 * Math.sin(b * 0.8976)], [0, -b * 0.8976, 0.4]); fans.push(f); }
    // ---- MV transformer (oil, ONAN): tank, radiators, conservator, bushings
    const tr = K.P("trafo", g, [1.8, 0, 0.6], [2.6, 3.0, 0.6]);
    const tk = M("trafo", 0x7D8A86, { metalness: 0.45, roughness: 0.5 });
    add(tr, box(1.7, 1.8, 1.3), tk, [2.5, 0.3 + 0.9, 0]); add(tr, box(1.8, 0.1, 1.4), tk, [2.5, 2.15, 0]);
    const rad = new T.InstancedMesh(box(0.035, 1.35, 0.45), tk, 28); let ri = 0;
    [-1, 1].forEach(sd => { for (let i = 0; i < 14; i++) { m4set(rad, ri++, [2.5 - 0.72 + i * 0.11, 1.15, sd * 0.88]); } }); tr.add(rad);
    add(tr, cyl(0.22, 0.22, 1.2, 24), tk, [2.5, 2.75, -0.45], RX); add(tr, cyl(0.06, 0.06, 0.5, 8), tk, [2.5, 2.4, -0.45]);
    for (let i = 0; i < 3; i++) { const bx = 2.05 + i * 0.45; const bsh = new T.Group(); bsh.position.set(bx, 2.2, 0.25); tr.add(bsh);
      for (let k = 0; k < 7; k++) add(bsh, cyl(0.09, 0.09, 0.04, 16), M("trafo", 0x7A4A35, { metalness: 0.1, roughness: 0.35 }), [0, 0.05 + k * 0.07, 0]); add(bsh, cyl(0.025, 0.025, 0.1, 8), cu, [0, 0.55, 0]); }
    for (let i = 0; i < 4; i++) add(tr, cyl(0.05, 0.05, 0.22, 12), M("trafo", 0x3A3F45, { metalness: 0.2 }), [2.15 + i * 0.25, 2.3, -0.3]);
    add(tr, box(0.25, 0.18, 0.02), M("trafo", 0xC9CED4, { metalness: 0.6 }), [2.5, 1.5, 0.66]);
    // RMU / MV switchgear
    add(tr, box(1.0, 1.7, 0.8), M("trafo", 0xD5DAE0, { metalness: 0.25 }), [4.4, 0.3 + 0.85, 0]); add(tr, new T.PlaneGeometry(0.2, 0.12), new T.MeshBasicMaterial({ color: 0x15253D }), [4.4, 1.5, 0.41]);
    // ---- DC combiner box on a post + PV field behind the skid
    const pv = K.P("pvArr", g, [0, 0, -3], [-7, 3.0, -9]);
    const comb = new T.Group(); comb.position.set(-5.2, 0, -3.6); pv.add(comb);
    add(comb, box(0.1, 1.6, 0.1), M("pvArr", 0x9EA7B1, { metalness: 0.6 }), [0, 0.8, 0]); add(comb, box(0.7, 0.55, 0.25), M("pvArr", 0xE9ECEF, { metalness: 0.2 }), [0, 1.25, 0.15]);
    pvField(pv, { nx: 20, ny: 2, landscape: false, rows: 4, perRow: 3, tilt: 15 * Math.PI / 180, pitchZ: 9.5, gapX: 1.2, z0: -9, modW: 1.134, modH: 2.278, postH: 0.8 });
    // fence
    const fM = M("fence", 0x8E969F, { metalness: 0.6 }); const fence = new T.Group(); g.add(fence);
    for (let i = 0; i < 9; i++) add(fence, cyl(0.04, 0.04, 2.0, 8), fM, [-5.5 + i * 1.5, 1.0, -2.7]);
    for (let i = 1; i < 4; i++) { add(fence, cyl(0.04, 0.04, 2.0, 8), fM, [-5.5, 1.0, -2.7 + i * 1.5]); add(fence, cyl(0.04, 0.04, 2.0, 8), fM, [6.5, 1.0, -2.7 + i * 1.5]); }
    const fMesh = new T.MeshStandardMaterial({ map: meshTex(), transparent: true, side: T.DoubleSide, alphaTest: 0.2, metalness: 0.6, roughness: 0.4 });
    add(fence, new T.PlaneGeometry(12, 1.8), fMesh, [0.5, 1.05, -2.7], null, { shadow: false });
    add(fence, new T.PlaneGeometry(4.5, 1.8), fMesh, [-5.5, 1.05, -0.45], [0, Math.PI / 2, 0], { shadow: false }); add(fence, new T.PlaneGeometry(4.5, 1.8), fMesh, [6.5, 1.05, -0.45], [0, Math.PI / 2, 0], { shadow: false });
    fence.traverse(x => x.userData.noComp = true);
    // ---- power-flow cables: strings → combiner → inverter DC → transformer LV → RMU → grid
    const pf = new T.Group(); g.add(pf);
    [[-12.5, -9.0], [0, -9.0], [12.5, -9.0]].forEach(([x, z]) => flowCable(pf, [[x, 0.9, z + 1.4], [x * 0.6 - 2, 0.12, -5.8], [-5.2, 0.12, -3.7], [-5.2, 1.05, -3.5]], 0.025, "dc", flows));
    flowCable(pf, [[-5.2, 1.0, -3.4], [-5.2, 0.12, -2.8], [-3.4, 0.12, -0.4], [cx - 1.0, 0.45, 0]], 0.035, "dc", flows);
    flowCable(pf, [[cx + 1.3, 0.5, -0.2], [0.2, 0.32, -0.6], [1.6, 0.32, -0.5], [2.1, 2.5, -0.3]], 0.035, "ac", flows);
    flowCable(pf, [[2.95, 2.75, 0.25], [3.6, 2.9, 0.3], [4.2, 2.2, 0.2], [4.4, 1.9, 0]], 0.03, "mv", flows);
    flowCable(pf, [[4.4, 0.4, 0.3], [5.4, 0.12, 1.5], [9, 0.12, 2.5], [16, 0.12, 3]], 0.03, "mv", flows);
    K.tag();
    const refs = { parts: K.parts, anchors: K.anchors, offsets: K.offsets, fans, leds, flows, coverGroup: cover, coverMats: [shellM], led,
      clip: { frame: g, normal: [0, 0, -1], point: [0, 0, Dp / 2 - 0.1] },
      explodable: { cover: [0, 3.2, 0], dcIn: [-0.9, 0.2, 1.4], igbtMod: [0, 0.6, 1.8], dcLink: [0, -0.15, 2.0], filter: [0.9, -0.1, 1.6], acOut: [1.2, 0.5, 1.4], fans: [0, 1.4, 0.2] },
      explodeObj: { cover, dcIn: dc, igbtMod: ig, dcLink: dl, filter: flt, acOut: ac, fans: fn } };
    g.userData.refs = refs; return g;
  }

  // =====================================================================
  // ROOFTOP STRING INVERTER – Lập Tốn (Solis S5-GC110K class) on a roof rack
  // =====================================================================
  function solarString(s) {
    const M = matFactory(); const g = new T.Group(); const K = partsKit(g); const flows = [], fans = [], leds = [];
    // standing-seam steel roof
    const rt = roofTex(); rt.repeat.set(70, 1);
    add(g, new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ map: rt, color: 0xC7CDD4, metalness: 0.55, roughness: 0.45 }), [0, 0, 0], [-Math.PI / 2, 0, 0], { shadow: false }).userData.noComp = true;
    add(g, box(40, 0.9, 0.25), M("roof", 0xD9DDE2, { metalness: 0.3 }), [0, 0.45, 4.2]).userData.noComp = true;       // parapet
    add(g, box(1.0, 0.03, 30), M("roof", 0xBFAE5A, { metalness: 0.1, roughness: 0.8 }), [-3.5, 0.02, -8]).userData.noComp = true;   // walkway
    // ---- rack: two posts, rails, canopy
    const W = 1.06, H = 0.70, Dp = 0.36, cy = 1.25;
    const rackM = M("rack", 0xA9B1BA, { metalness: 0.75, roughness: 0.35 }); const rack = new T.Group(); g.add(rack);
    [-0.75, 0.75].forEach(x => { add(rack, box(0.08, 2.2, 0.08), rackM, [x, 1.1, -0.35]); add(rack, box(0.5, 0.06, 0.4), rackM, [x, 0.03, -0.35]); });
    [0.95, 1.55].forEach(y => add(rack, box(1.7, 0.06, 0.06), rackM, [0, y, -0.32]));
    add(rack, box(1.9, 0.04, 1.0), M("rack", 0xDDE2E8, { metalness: 0.4 }), [0, 2.25, 0.05], [0.12, 0, 0]);
    rack.traverse(x => x.userData.noComp = true);
    // ---- enclosure: front cover + dark lower band + rear heatsink
    const cover = new T.Group(); g.add(cover);
    const coverM = M("cover", 0xF1F3F5, { metalness: 0.15, roughness: 0.4, side: T.DoubleSide });
    add(cover, rbox(W, H, 0.14, 0.03), coverM, [0, cy, Dp / 2 - 0.07]);
    add(cover, rbox(W, 0.16, 0.16, 0.03), M("cover", 0x3A4048, { metalness: 0.3, roughness: 0.5, side: T.DoubleSide }), [0, cy - H / 2 + 0.06, Dp / 2 - 0.08]);
    for (let i = 0; i < 4; i++) { const l = add(cover, new T.CircleGeometry(0.012, 16), new T.MeshStandardMaterial({ color: i === 0 ? U.COL.ok : 0x334155, emissive: i === 0 ? U.COL.ok : 0x000000, emissiveIntensity: 2 }), [-0.09 + i * 0.06, cy + 0.12, Dp / 2 + 0.001], null, { shadow: false }); if (i === 0) leds.push(l); }
    add(cover, new T.PlaneGeometry(0.3, 0.05), new T.MeshBasicMaterial({ color: 0x9AA4AF }), [0, cy + 0.2, Dp / 2 + 0.001]);
    cover.traverse(x => { if (x.isMesh) x.userData.cover = true; });
    const cab = K.P("cabinet", g, [0, 0, 0], [0.3, cy + 0.3, 0.15]);
    add(cab, box(W - 0.02, H - 0.02, 0.05), M("cabinet", 0x4A525C, { metalness: 0.55, roughness: 0.45 }), [0, cy, -0.075]);   // chassis (die-cast)
    const hs = M("cabinet", 0xBFC6CE, { metalness: 0.85, roughness: 0.32 });
    add(cab, box(W - 0.04, H - 0.04, 0.03), hs, [0, cy, -0.115]);
    for (let i = 0; i < 26; i++) add(cab, box(0.012, H - 0.08, 0.08), hs, [-W / 2 + 0.04 + i * 0.039, cy, -0.17]);
    const pcb = M("cabinet", 0x1E6B3C, { metalness: 0.15, roughness: 0.55 });
    add(cab, box(0.96, 0.56, 0.008), pcb, [0, cy - 0.02, -0.047]);                                      // main power board
    add(cab, box(0.26, 0.16, 0.008), pcb, [0.33, cy + 0.2, 0.06]);                                       // control / DSP board (raised)
    for (let i = 0; i < 4; i++) add(cab, cyl(0.004, 0.004, 0.1, 6), hs, [0.22 + (i % 2) * 0.22, cy + 0.14 + Math.floor(i / 2) * 0.12, 0.01], RZ);
    for (let i = 0; i < 6; i++) add(cab, box(0.025, 0.025, 0.006), M("cabinet", 0x111418, { metalness: 0.3 }), [0.24 + (i % 3) * 0.06, cy + 0.19 + Math.floor(i / 3) * 0.04, 0.066]);
    add(cab, box(0.08, 0.05, 0.03), M("cabinet", 0x2563EB, { metalness: 0.2 }), [0.44, cy + 0.23, 0.07]);   // comms module
    // ---- DC side: MC4 connectors (10 MPPT × 2), 2 DC switches, boost inductors
    const dc = K.P("dcIn", g, [-0.35, -0.3, 0.45], [-0.25, cy - 0.28, 0.1]);
    for (let i = 0; i < 20; i++) { const x = -0.45 + (i % 10) * 0.05, z = i < 10 ? 0.06 : 0.11; add(dc, cyl(0.011, 0.011, 0.06, 10), M("dcIn", i % 2 ? 0x1B1E22 : 0x2B2F35, { metalness: 0.2 }), [x, cy - H / 2 - 0.02, z]); }
    [-0.05, 0.08].forEach(x => { add(dc, cyl(0.03, 0.03, 0.05, 16), M("dcIn", 0x16191C, { metalness: 0.2 }), [x, cy - H / 2 - 0.02, 0.1]); add(dc, box(0.05, 0.02, 0.012), M("dcIn", 0x2A2F36), [x, cy - H / 2 - 0.05, 0.1]); });
    const cuW = M("dcIn", 0xB8742F, { metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 5; i++) { add(dc, cyl(0.052, 0.052, 0.045, 28), M("dcIn", 0x22262B, { metalness: 0.2, roughness: 0.7 }), [-0.4 + i * 0.1, cy - 0.17, -0.02], RZ); add(dc, new T.TorusGeometry(0.05, 0.013, 10, 28), cuW, [-0.4 + i * 0.1, cy - 0.17, 0.004]); }
    for (let i = 0; i < 10; i++) add(dc, box(0.012, 0.012, 0.03), M("dcIn", i % 2 ? 0xD62828 : 0x111418), [-0.45 + i * 0.05, cy - 0.29, -0.02]);
    // DC-link: 2 rows of electrolytic capacitors (vertical cans)
    const dl = K.P("dcLink", g, [0, -0.15, 0.5], [-0.08, cy + 0.12, 0.1]);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) { const x = -0.33 + i * 0.055, z = -0.01 + r * 0.06; add(dl, cyl(0.024, 0.024, 0.11, 18), M("dcLink", 0x27406A, { metalness: 0.3, roughness: 0.4 }), [x, cy + 0.03, z]); add(dl, cyl(0.022, 0.022, 0.004, 18), M("dcLink", 0xC9CED4, { metalness: 0.8 }), [x, cy + 0.087, z]); }
    // IGBT power modules on the heatsink
    const ig = K.P("igbtMod", g, [0, 0.14, 0.55], [-0.3, cy + 0.22, 0.1]);
    for (let i = 0; i < 3; i++) { add(ig, box(0.12, 0.07, 0.03), M("igbtMod", 0x14171B, { metalness: 0.2, roughness: 0.6 }), [-0.36 + i * 0.14, cy + 0.2, -0.025]);
      for (let k = 0; k < 4; k++) add(ig, cyl(0.006, 0.006, 0.006, 8), M("igbtMod", 0xC9CED4, { metalness: 0.9 }), [-0.4 + i * 0.14 + (k % 2) * 0.08, cy + 0.18 + Math.floor(k / 2) * 0.04, -0.008], RZ);
      add(ig, box(0.1, 0.05, 0.006), M("igbtMod", 0x1E6B3C, { roughness: 0.6 }), [-0.36 + i * 0.14, cy + 0.2, 0.0]); }
    // AC side: LCL filter chokes + output relays
    const flt = K.P("filter", g, [0.3, 0.1, 0.5], [0.15, cy - 0.05, 0.1]);
    for (let i = 0; i < 3; i++) { add(flt, box(0.075, 0.09, 0.05), M("filter", 0x3A4048, { metalness: 0.5 }), [0.06 + i * 0.09, cy - 0.06, -0.015]); add(flt, cyl(0.03, 0.03, 0.055, 20), cuW, [0.06 + i * 0.09, cy - 0.06, 0.005]); }
    const ac = K.P("acOut", g, [0.35, -0.25, 0.4], [0.4, cy - 0.25, 0.1]);
    for (let i = 0; i < 4; i++) add(ac, box(0.035, 0.05, 0.035), M("acOut", 0xF2F4F6, { metalness: 0.1 }), [0.34 + i * 0.045, cy - 0.2, -0.02]);
    add(ac, cyl(0.03, 0.03, 0.06, 16), M("acOut", 0x1B1E22), [0.42, cy - H / 2 - 0.02, 0.1]);
    [[0xD62828, 0.36], [0x111418, 0.4], [0x2563EB, 0.44], [0x1F9D55, 0.48]].forEach(([c, x]) => tube(ac, [[x, cy - 0.23, -0.01], [x, cy - 0.3, 0.02], [0.42, cy - H / 2 + 0.01, 0.06]], 0.005, M("acOut", c, { metalness: 0.1 }), 10));
    // AC combiner box on the rack
    add(ac, box(0.45, 0.55, 0.2), M("acOut", 0xE9ECEF, { metalness: 0.2 }), [1.3, 1.0, -0.25]); add(ac, new T.PlaneGeometry(0.1, 0.1), new T.MeshBasicMaterial({ color: 0xF2C14E }), [1.3, 1.15, -0.149]);
    // side fans (rotating)
    const fn = K.P("fans", g, [0.45, 0, 0], [W / 2 + 0.05, cy + 0.1, 0]);
    for (let i = 0; i < 3; i++) { const p = [W / 2 + 0.012, cy - 0.2 + i * 0.2, -0.02]; add(fn, cyl(0.075, 0.075, 0.03, 24, true), M("fans", 0x2A3038, { side: T.DoubleSide }), p, [0, 0, Math.PI / 2]);
      const f = new T.Group(); f.position.set(...p); f.rotation.z = Math.PI / 2; fn.add(f); for (let b = 0; b < 7; b++) add(f, box(0.065, 0.006, 0.025), M("fans", 0x3B4450), [0.033 * Math.cos(b * 0.8976), 0, 0.033 * Math.sin(b * 0.8976)], [0, -b * 0.8976, 0.4]); fans.push(f); }
    // ---- rooftop PV arrays (landscape, 6° tilt) behind the rack
    const pv = K.P("pvArr", g, [0, 0, -2], [0, 1.6, -6]);
    pvField(pv, { nx: 10, ny: 1, landscape: true, rows: 9, perRow: 3, tilt: 6 * Math.PI / 180, pitchZ: 1.75, gapX: 1.4, z0: -3.2, modW: 2.278, modH: 1.134, postH: 0.35 });
    // neighbouring factory roofs and trees in the distance
    const far = new T.Group(); g.add(far);
    [[-55, -40, 40, 12, 30], [45, -55, 50, 14, 36], [0, -75, 70, 10, 26]].forEach(([x, z, w, h, d]) => { add(far, box(w, h, d), M("far", 0xE3E6EA, { metalness: 0.1, roughness: 0.7 }), [x, -h / 2 + 0.2, z]); });
    far.traverse(x => x.userData.noComp = true);
    // ---- power flow: strings → MC4 → inverter → AC combiner → tray
    const pf = new T.Group(); g.add(pf);
    [-1.6, -0.8, 0.0, 0.8].forEach((x, i) => flowCable(pf, [[x * 4, 0.45, -3.2], [x * 2, 0.06, -1.5], [-0.42 + i * 0.1, 0.06, 0.3], [-0.42 + i * 0.1, cy - H / 2 - 0.05, 0.08]], 0.008, "dc", flows));
    flowCable(pf, [[0.42, cy - H / 2 - 0.05, 0.1], [0.6, 0.6, 0.05], [1.1, 0.75, -0.2], [1.3, 0.73, -0.25]], 0.012, "ac", flows);
    flowCable(pf, [[1.3, 1.27, -0.25], [1.6, 1.9, -0.3], [3.5, 2.0, -0.3], [8, 2.0, -0.3]], 0.014, "ac", flows);
    add(pf, box(7, 0.08, 0.25), M("tray", 0xB8C0C9, { metalness: 0.7 }), [5.0, 1.95, -0.3]).userData.noComp = true;
    K.tag();
    const refs = { parts: K.parts, anchors: K.anchors, offsets: K.offsets, fans, leds, flows, coverGroup: cover, coverMats: [coverM], led: leds[0],
      clip: { frame: g, normal: [0, 0, -1], point: [0, 0, 0.015] },
      explodable: { cover: [0, 0.15, 0.55], dcIn: [-0.25, -0.25, 0.35], dcLink: [0, -0.08, 0.42], igbtMod: [0, 0.18, 0.45], filter: [0.25, 0.05, 0.4], acOut: [0.2, -0.22, 0.32], fans: [0.3, 0, 0] },
      explodeObj: { cover, dcIn: dc, dcLink: dl, igbtMod: ig, filter: flt, acOut: ac, fans: fn } };
    g.userData.refs = refs; return g;
  }
  function m4set(inst, i, p) { const m = new T.Matrix4(); m.makeTranslation(...p); inst.setMatrixAt(i, m); }
  function noiseTex(a, b, n) { const c = document.createElement("canvas"); c.width = c.height = n; const x = c.getContext("2d"); x.fillStyle = a; x.fillRect(0, 0, n, n);
    for (let i = 0; i < n * n / 6; i++) { x.fillStyle = Math.random() < 0.5 ? b : "rgba(255,255,255,.18)"; const r = Math.random() * 1.8 + 0.4; x.fillRect(Math.random() * n, Math.random() * n, r, r); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t; }
  function roofTex() { const c = document.createElement("canvas"); c.width = 64; c.height = 8; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, "#9AA3AD"); g.addColorStop(0.12, "#E6EAEE"); g.addColorStop(0.22, "#B9C1CA"); g.addColorStop(0.6, "#C9D0D7"); g.addColorStop(1, "#9AA3AD");
    x.fillStyle = g; x.fillRect(0, 0, 64, 8); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t; }
  function meshTex() { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.strokeStyle = "rgba(160,170,180,1)"; x.lineWidth = 1.5;
    for (let i = -64; i < 128; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(24, 4); return t; }

  return { windTurbine, solarCentral, solarString, moduleTex, pvTableMats };
};
