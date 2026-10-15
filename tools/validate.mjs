// Consistency check for the OCC SCADA sources. Run: node tools/validate.mjs
// Fails (exit 1) when data or texts would show inconsistent figures, so nothing inconsistent gets published.
import fs from "fs"; import path from "path"; import vm from "vm"; import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// Load the i18n dictionary and the plant master data exactly as the app does.
const code = rd("src/10_i18n.js") + "\n" + rd("src/20_data.js").replace("__BUILD__", '{"version":"0","id":"check","date":""}') +
  "\n;globalThis.__X={DICT,LANGS,STATIONS,ST,ALARMS:(seedAlarms(),ALARMS),USERS,ROLES,PERMS,PTS_TOTAL,PTS_SURVEYED,FIG,t,unitRated,OCC_LL,CITIES};";
const ctx = { console, Intl, Date, Math, JSON, Set, Map, Object, Array, Number, String, Boolean, S: { lang: "vi", user: { scope: "all" } } };
vm.createContext(ctx);
try { vm.runInContext(code, ctx, { filename: "src (i18n+data)" }); } catch (e) { console.error("✗ Source does not load:", e.message); process.exit(1); }
const X = ctx.__X;

// 1. Texts: every entry in 3 languages, same placeholders in each language
const ph = s => [...String(s).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(m => m[1]).sort().join(",");
for (const [k, row] of Object.entries(X.DICT)) {
  if (!Array.isArray(row) || row.length !== 3) { err(`text "${k}": needs exactly 3 languages [vi, en, zh]`); continue; }
  row.forEach((s, i) => { if (!String(s).trim()) err(`text "${k}": empty ${X.LANGS[i]}`); });
  if (new Set(row.map(ph)).size > 1) err(`text "${k}": placeholders differ between languages (${row.map(ph).join(" | ")})`);
  if (/\b(1[0-9]|[2-9])\s?(nhà máy|plants|座)/.test(row.join(" ")) && !/\{N/.test(row.join(" "))) warn(`text "${k}": contains a typed plant count – use {NP}`);
}
// every t("key") used in the code exists
const used = new Set(); for (const f of fs.readdirSync(path.join(ROOT, "src")).filter(f => f.endsWith(".js")))
  for (const m of rd("src/" + f).matchAll(/\bt\("([A-Za-z0-9_]+)"\s*[,)]/g)) used.add(m[1]);
// keys built at run time from data: role names, unit states, priorities, levels, permissions, plant types, page subtitles
for (const r of Object.keys(X.ROLES)) used.add("r_" + r);
for (const st of ["run","limit","fault","maint","comm","stop","idle"]) used.add("st_" + st);
for (const i of [1,2,3,4]) { used.add("p" + i); used.add("L" + i); }
for (const p of X.PERMS) used.add("perm_" + p);
for (const ty of new Set(X.STATIONS.map(s => s.type))) used.add("plantType_" + ty);
for (const pg of ["overview","gis","twin","alarms","kpis","pcurve","loss","downtime","curtail","bench","custom","reports","users","audit","sources"]) used.add("sub_" + pg);
for (const k of used) if (!(k in X.DICT)) err(`text "${k}" is used in the code but missing from src/10_i18n.js`);
for (const m of rd("src/02_body.html").matchAll(/data-i="([A-Za-z0-9_]+)"/g)) if (!(m[1] in X.DICT)) err(`text "${m[1]}" (02_body.html) missing`);

// 2. Plant master data
const ids = new Set(), geo = JSON.parse(rd("data/geo/prov_hi.json")), provs = new Set(geo.features.map(f => f.properties.p));
for (const s of X.STATIONS) {
  const tag = `station ${s.id}`;
  if (ids.has(s.id)) err(`${tag}: duplicate id`); ids.add(s.id);
  for (const f of ["name", "full", "prov"]) for (const l of X.LANGS) if (!s[f] || !String(s[f][l] || "").trim()) err(`${tag}: ${f}.${l} missing`);
  if (!["wind", "solar", "roof"].includes(s.type)) err(`${tag}: type must be wind | solar | roof`);
  if (!(s.cap > 0)) err(`${tag}: cap (MW) must be > 0`);
  if (!Number.isInteger(s.pts) || s.pts <= 0) err(`${tag}: pts (data points) must be a positive whole number`);
  if (s.type !== "wind" && !(s.capDC >= s.cap)) err(`${tag}: capDC (MWp) must be ≥ cap (MWac)`);
  const [lon, lat] = s.ll || []; if (!(lon > 102 && lon < 110 && lat > 8 && lat < 23.5)) err(`${tag}: coordinates ${s.ll} outside mainland Viet Nam`);
  if (!provs.has(s.prov.vi)) err(`${tag}: province "${s.prov.vi}" is not one of the 34 provinces in data/geo`);
  const uids = new Set(); for (const u of s.units) { if (uids.has(u.id)) err(`${tag}: duplicate unit ${u.id}`); uids.add(u.id); }
  if (s.states && typeof s.states === "object") for (const k of Object.keys(s.states)) if (!uids.has(k)) err(`${tag}: state set for unknown unit ${k}`);
  if (s.type === "wind") { const sum = s.units.reduce((a, u) => a + X.unitRated(s, u.id), 0); if (Math.abs(sum - s.cap) / s.cap > 0.05) err(`${tag}: turbines add up to ${sum.toFixed(2)} MW but cap is ${s.cap} MW`); }
  if (!(s.plan >= 0)) err(`${tag}: monthly plan (MWh) missing`);
}
// 2b. Plant figures must match the proposal reference table (data/plants-reference.json)
const REF = JSON.parse(rd("data/plants-reference.json")).plants; const near = (a, b) => Math.abs(a - b) < 0.0005 * Math.max(1, b);
for (const [pid, r] of Object.entries(REF)) {
  const ss = X.STATIONS.filter(s => s.plant === pid); if (!ss.length) { err(`plant ${pid} (${r.name}) in reference table but not in STATIONS`); continue; }
  const units = ss.reduce((a, s) => a + s.n, 0), cap = ss.reduce((a, s) => a + s.cap, 0);
  if (units !== r.units) err(`plant ${pid}: ${units} units in data, reference says ${r.units}`);
  if (r.model && !ss.every(s => s.model.includes(r.model))) err(`plant ${pid}: model should contain "${r.model}" (data: ${ss.map(s => s.model).join(", ")})`);
  if (r.mw != null && !near(cap, r.mw)) err(`plant ${pid}: ${cap} MW in data, reference says ${r.mw} MW`);
  if (r.mwac != null && !ss.every(s => near(s.capAC ?? s.cap, r.mwac))) err(`plant ${pid}: AC capacity should be ${r.mwac} MWac`);
  if (r.mwp != null && !ss.every(s => near(s.capDC, r.mwp))) err(`plant ${pid}: DC capacity should be ${r.mwp} MWp`);
  if (r.unit_kw != null) for (const s of ss) { if (s.invKW !== r.unit_kw) err(`plant ${pid}: inverter rating ${s.invKW} kW, reference ${r.unit_kw} kW`);
    const invAC = s.n * s.invKW / 1000, ac = s.capAC ?? s.cap; if (invAC + 1e-6 < ac) err(`plant ${pid}: inverters give ${invAC.toFixed(2)} MWac, less than AC capacity ${ac}`); }
  if (r.roofs != null && !ss.every(s => s.feeders.length === r.roofs)) err(`plant ${pid}: ${ss[0].feeders.length} roof projects, reference ${r.roofs}`);
}
for (const s of X.STATIONS) if (s.type !== "wind" && s.capAC != null && s.capDC < s.capAC) err(`station ${s.id}: MWp below MWac`);

// 3. Alarms point at real stations and devices
const SITE_DEV = /^(TBA|Tủ|Gateway)/;
for (const a of X.ALARMS.filter(a => !a.cleared)) { const s = X.ST[a.st]; if (!s) { err(`alarm ${a.id}: unknown station ${a.st}`); continue; }
  if (!s.units.some(u => u.id === a.dev) && !SITE_DEV.test(a.dev)) err(`alarm ${a.st}/${a.dev}: device not found in station`); }
// 4. Users and roles
const un = new Set(); for (const u of X.USERS) { if (un.has(u.u)) err(`user ${u.u}: duplicate`); un.add(u.u);
  if (!X.ROLES[u.role]) err(`user ${u.u}: unknown role ${u.role}`);
  if (u.scope !== "all") for (const id of u.scope) if (!X.ST[id]) err(`user ${u.u}: scope has unknown station ${id}`); }
for (const [r, d] of Object.entries(X.ROLES)) for (const p of d.perm) if (!X.PERMS.includes(p)) err(`role ${r}: unknown permission ${p}`);
// 5. Hard-coded figures that must come from the data
const derived = X.FIG(); const body = rd("src/02_body.html") + rd("src/01_head.html");
for (const lit of [String(derived.MW) + " MW", X.PTS_TOTAL.toLocaleString("vi-VN")]) if (body.includes(lit)) err(`"${lit}" is typed into the HTML – it must be derived from the data`);

// Report
const sum = (f) => X.STATIONS.filter(f).reduce((a, s) => a + s.pts, 0);
console.log("OCC SCADA · data summary (derived from src/20_data.js)");
console.table(X.STATIONS.map(s => ({ station: s.id, plant: s.plant, type: s.type, installed: s.cap + " " + (s.capUnit || "MW"), MWac: s.capAC ?? s.cap, MWp: s.capDC ?? "", units: s.n, model: s.model, points: s.pts })));
console.log(`plants ${derived.NP} · stations ${derived.NS} · ${derived.MW} MW · points surveyed ${X.PTS_SURVEYED} · points total ${X.PTS_TOTAL} (check ${sum(() => true)})`);
warns.forEach(w => console.log("! " + w));
if (errors.length) { console.error(`\n✗ ${errors.length} problem(s):`); errors.forEach(e => console.error("  - " + e)); process.exit(1); }
console.log("✓ consistent");
