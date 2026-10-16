// ===================== Reports: portfolio + detailed plant report =====================
// Portfolio tab: the existing report catalogue (summary of all plants in scope).
// Plant tab: an A4 operations report for one plant and one period – key indicators, energy
// profile, loss breakdown, feeders/blocks/roofs, every unit, downtime, curtailment, alarms
// and sign-off. Printable (only the report is printed) and exportable to Excel (CSV).
const REP_PERIODS = [["day", "today"], ["month", "thisMonth"], ["d30", "d30"], ["year", "thisYear"]];
const EF_CO2 = 0.6592;   // t CO2 / MWh – Vietnam grid emission factor used across the app

function repRange(per) { const now = Date.now(), d0 = dayStart(now), dm = new Date(now + TZ);
  const from = per === "day" ? d0 : per === "month" ? Date.UTC(dm.getUTCFullYear(), dm.getUTCMonth(), 1) - TZ : per === "year" ? Date.UTC(dm.getUTCFullYear(), 0, 1) - TZ : d0 - 29 * DAY;
  return { from, to: now, hours: Math.max(1 / 60, (now - from) / HOUR), days: Math.max(1, Math.ceil((now - from) / DAY)) }; }
function daysInMonth() { const dm = new Date(Date.now() + TZ); return new Date(Date.UTC(dm.getUTCFullYear(), dm.getUTCMonth() + 1, 0)).getUTCDate(); }
const feederLabel = (s, f) => s.type === "wind" ? t("feeder", { n: f }) : s.type === "solar" ? t("block", { n: f }) : t("roof", { n: f });
const capFull = s => capLabel(s) + (s.capUnit && s.capUnit !== "MW" ? "" : " MW");
const repTri = k => DICT[k] ? (S.lang === "zh" ? DICT[k][0] : DICT[k][2]) : "";

// ---- all figures of one plant for one period (shared by the page, the print and the Excel export)
function plantReportData(id, per) {
  buildHist(); buildEvents(); const s = ST[id], L0 = LIVE.st[id], R = repRange(per), isW = s.type === "wind";
  const capRef = isW ? s.cap : s.capDC; let K, series;
  if (per === "day") {
    const H = HIST.st[id][HIST.st[id].length - 1]; const lt = Math.max(0, L0.eth - L0.e), hsum = H.loss.reduce((a, b) => a + b, 0) || 1;
    const hrsDone = (Date.now() - dayStart(Date.now())) / HOUR; const used = L0.hrs.filter(h => h.n);
    const res = isW ? (used.length ? used.reduce((a, h) => a + h.w, 0) / used.length : 0) : L0.hrs.reduce((a, h) => a + (h.n ? h.w / 1000 : 0), 0);
    K = { e: L0.e, th: L0.eth, loss: H.loss.map(x => lt * x / hsum), res, avail: L0.avail, cf: cfToday(s), eqh: L0.e / capRef, pmax: L0.pmax, plan: s.plan / daysInMonth() * Math.min(1, hrsDone / 24) };
    series = L0.hrs.map((h, i) => ({ k: String(i).padStart(2, "0"), e: h.e, th: h.th, r: h.n ? (isW ? h.w : h.w) : null, plan: null }));
  } else {
    const idx = histRange(per === "d30" ? "d30" : per); const ag = aggSt(id, idx); const rows = idx.map(i => HIST.st[id][i]);
    const best = rows.reduce((a, r) => r.e > a.e ? r : a, rows[0] || { e: 0, d: Date.now() });
    K = { e: ag.e, th: ag.th, loss: ag.loss, res: ag.res, avail: ag.avail, cf: ag.cf, eqh: ag.eqh, bestDay: best, plan: s.plan * idx.length / 30.4, stopH: ag.stopH };
    if (per === "year") { const m = {}; rows.forEach(r => { const d = new Date(r.d + TZ); const key = d.getUTCMonth(); (m[key] ||= { k: String(key + 1).padStart(2, "0"), e: 0, th: 0, r: 0, n: 0, plan: 0 }); m[key].e += r.e; m[key].th += r.th; m[key].r += r.res; m[key].n++; m[key].plan += s.plan / 30.4; });
      series = Object.values(m).map(x => ({ ...x, r: isW ? x.r / x.n : x.r })); }
    else series = rows.map(r => { const d = new Date(r.d + TZ); return { k: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`, e: r.e, th: r.th, r: r.res, plan: s.plan / 30.4 }; });
  }
  K.lsum = K.loss.reduce((a, b) => a + b, 0); K.pr = !isW && K.res > 0 ? 100 * K.e / (K.res * s.capDC) : null; K.co2 = K.e * EF_CO2;
  const inPer = x => (x.t1 == null || x.t1 >= R.from) && x.t0 <= R.to;
  const stops = s.notOper ? [] : STOPS.filter(x => x.st === id && inPer(x));
  const curts = s.notOper ? [] : CURTS.filter(x => x.st === id && inPer(x));
  const ovl = x => Math.max(0, (Math.min(x.t1 ?? R.to, R.to) - Math.max(x.t0, R.from)) / HOUR);
  K.stopH = stops.reduce((a, x) => a + ovl(x), 0); K.curtE = Math.max(curts.reduce((a, x) => a + x.e * ovl(x) / Math.max(x.dur, 0.01), 0), K.loss[2]);
  const alarms = ALARMS.filter(a => a.st === id && (a.t >= R.from || !a.cleared)).sort((a, b) => a.sev - b.sev || b.t - a.t);
  // units and feeders
  const units = s.units.map((u, i) => { const lu = L0.units[i]; const d = unitDerived(s, lu, i); const st = lu.st;
    const down = stops.filter(x => x.dev === u.id).reduce((a, x) => a + ovl(x), 0) + (st === "fault" || st === "comm" || st === "maint" ? Math.min(R.hours, 0.6) : 0);
    const f = s.feeders.find(([, ids]) => ids.includes(u.id))?.[0] ?? "";
    return { id: u.id, f, st, p: lu.p, v: lu.v, d, down, avail: s.notOper ? null : clamp(100 * (1 - down / R.hours), 0, 100), al: ALARMS.filter(a => a.st === id && a.dev === u.id && !a.cleared).length, rated: unitRated(s, u.id) }; });
  const feeders = s.feeders.map(([f, ids]) => { const us = units.filter(u => ids.includes(u.id)); const cnt = k => us.filter(u => u.st === k).length;
    return { f, n: us.length, run: cnt("run"), limit: cnt("limit"), fault: cnt("fault"), other: us.length - cnt("run") - cnt("limit") - cnt("fault"), p: us.reduce((a, u) => a + (u.p || 0), 0), eDay: us.reduce((a, u) => a + (u.st === "comm" ? 0 : u.d.eDay || 0), 0) / 1000 }; });
  return { s, L0, R, per, K, series, stops, curts, alarms, units, feeders, isW };
}

// ---- inline SVG energy chart (prints crisply, no chart library needed)
function repChart(D) { const W = 760, Hh = 210, pl = 46, pr = 46, pt = 16, pb = 30, s = D.series, n = s.length || 1;
  const maxE = Math.max(1e-6, ...s.map(x => Math.max(x.e, x.th, x.plan || 0))), maxR = Math.max(1e-6, ...s.map(x => x.r || 0));
  const bw = (W - pl - pr) / n, y = v => pt + (Hh - pt - pb) * (1 - v / maxE), yr = v => pt + (Hh - pt - pb) * (1 - v / maxR);
  const unit = D.per === "day" ? "MWh" : "MWh"; const rU = D.isW ? "m/s" : (D.per === "day" ? "kWh/m²" : "kWh/m²");
  let g = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" style="display:block;font-family:Arial,sans-serif;font-size:10px" role="img" aria-label="${esc(t("sec2"))}">`;
  for (let i = 0; i <= 4; i++) { const v = maxE * i / 4, yy = y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#E3E9F2"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end" fill="#5B6B85">${nf(v, v < 10 ? 1 : 0)}</text><text x="${W - pr + 6}" y="${yy + 3}" fill="#0E8A5F">${nf(maxR * i / 4, 1)}</text>`; }
  g += `<text x="${pl - 6}" y="10" text-anchor="end" fill="#5B6B85">${unit}</text><text x="${W - pr + 6}" y="10" fill="#0E8A5F">${D.isW ? "m/s" : rU}</text>`;
  s.forEach((x, i) => { const x0 = pl + i * bw + bw * 0.15, w = bw * 0.7; g += `<rect x="${x0}" y="${y(x.th)}" width="${w}" height="${Math.max(0, y(0) - y(x.th))}" fill="none" stroke="#9FB3D1" stroke-dasharray="2 2"/><rect x="${x0}" y="${y(x.e)}" width="${w}" height="${Math.max(0, y(0) - y(x.e))}" fill="#0044B8"/>`;
    if (n <= 31 || i % Math.ceil(n / 24) === 0) g += `<text x="${x0 + w / 2}" y="${Hh - pb + 13}" text-anchor="middle" fill="#5B6B85">${x.k}</text>`; });
  const rp = s.map((x, i) => x.r == null ? null : `${pl + i * bw + bw / 2},${yr(x.r)}`).filter(Boolean); if (rp.length > 1) g += `<polyline points="${rp.join(" ")}" fill="none" stroke="#00B07A" stroke-width="1.6"/>`;
  if (s.some(x => x.plan)) g += `<polyline points="${s.map((x, i) => `${pl + i * bw + bw / 2},${y(x.plan || 0)}`).join(" ")}" fill="none" stroke="#E8795B" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  g += `<line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" stroke="#8A9BB5"/></svg>`;
  const lg = (c, l, dash) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px"><i style="display:inline-block;width:14px;height:${dash ? 0 : 9}px;${dash ? `border-top:2px ${dash} ${c}` : `background:${c}`}"></i>${l}</span>`;
  return g + `<div style="margin-top:4px;color:#3A4A66">${lg("#0044B8", t("actE2"))}${lg("#9FB3D1", t("thE2"), "dashed")}${s.some(x => x.plan) ? lg("#E8795B", t("planE"), "dashed") : ""}${lg("#00B07A", D.isW ? t("windSpd") : t("irr"))}</div>`; }

function plantReportHTML(D) {
  const { s, K, R, per, isW } = D, now = new Date(); const fmtH = h => h >= 24 ? `${nf(h / 24, 1)} ${S.lang === "zh" ? "天" : S.lang === "en" ? "d" : "ngày"}` : `${nf(h, 1)} h`;
  const perLbl = per === "day" ? `${t("today")} ${fmtDate(new Date(R.from))}` : `${fmtDate(new Date(R.from))} – ${fmtDate(now)}`;
  const cell = (l, v, u = "", sub = "") => `<div class="kc"><span>${l}</span><b>${v}<small>${u}</small></b>${sub ? `<em>${sub}</em>` : ""}</div>`;
  const pct = (a, b) => b ? nf(100 * a / b, 1) : "—";
  const kpis = [
    cell(t("actE2"), nf(K.e, 1), " MWh", `${t("thE2")}: ${nf(K.th, 1)} MWh`),
    cell(t("planE"), nf(K.plan, 1), " MWh", `${t("planPct")}: ${pct(K.e, K.plan)} %`),
    per === "day" ? cell(t("peak"), nf(K.pmax, 2), " MW", `${t("capInst")}: ${capFull(s)}`) : cell(t("bestDay"), nf(K.bestDay.e, 1), " MWh", fmtDate(new Date(K.bestDay.d))),
    cell(t("cf"), nf(K.cf, 1), " %", `${t("eqHh")}: ${nf(K.eqh, 2)}`),
    cell(t("availPct"), K.avail == null ? "—" : nf(K.avail, 2), " %", isW ? "IEC 61400-26 (T)" : "IEC 61724"),
    isW ? cell(t("wsAvg"), nf(K.res, 2), " m/s", s.model) : cell(t("pr"), K.pr == null ? "—" : nf(K.pr, 1), " %", `${t("insol")}: ${nf(K.res, 2)} kWh/m²`),
    cell(t("lossTot"), nf(K.lsum, 1), " MWh", `${pct(K.lsum, K.th)} % ${t("thE2").toLowerCase()}`),
    cell(t("curtE"), nf(K.curtE, 1), " MWh", `${D.curts.length} ${t("events")}`),
    cell(t("stopH"), fmtH(K.stopH), "", `${D.stops.length} ${t("events")}`),
    cell(t("co2"), nf(K.co2, 1), "", `${EF_CO2} t/MWh`)];
  const LN = ["l_fault", "l_maint", "l_curt", "l_grid", "l_conv"], LC = ["#D8344A", "#8F6BE0", "#2F7FD8", "#D99A1E", "#7A8699"];
  const lossRows = LN.map((k, j) => `<tr><td><i style="display:inline-block;width:9px;height:9px;background:${LC[j]};margin-right:6px"></i>${t(k)}</td><td>${nf(K.loss[j], 2)}</td><td>${pct(K.loss[j], K.lsum)}</td><td>${pct(K.loss[j], K.th)}</td><td style="text-align:left;width:34%"><div style="height:8px;background:#EEF2F8"><div style="height:8px;width:${K.lsum ? 100 * K.loss[j] / K.lsum : 0}%;background:${LC[j]}"></div></div></td></tr>`).join("");
  const stTxt = st => t("st_" + st);
  const feederRows = D.feeders.map(f => `<tr><td>${esc(feederLabel(s, f.f))}</td><td>${f.n}</td><td>${f.run}</td><td>${f.limit}</td><td${f.fault ? ' style="color:#C0283E;font-weight:700"' : ""}>${f.fault}</td><td>${f.other}</td><td>${nf(f.p, 2)}</td><td>${nf(f.eDay, 2)}</td></tr>`).join("");
  const uHead = isW ? [t("device"), t("feederCol"), t("state"), "P (kW)", `${t("windSpd")} (m/s)`, t("eDayK"), t("availPer"), t("downH"), `${t("genT")} (°C)`, `${t("gbT")} (°C)`, t("alarms")]
    : [t("device"), t("feederCol"), t("state"), "P AC (kW)", "V DC (V)", `${t("eff")} (%)`, `${t("igbt")} (°C)`, t("eDayK"), t("availPer"), t("downH"), t("alarms")];
  const uRows = D.units.map(u => { const na = u.st === "comm"; const bad = u.st === "fault"; const c = v => na ? "—" : v;
    const cells = isW ? [u.id, u.f, stTxt(u.st), c(nf((u.p || 0) * 1000, 0)), c(u.v == null ? "—" : nf(u.v, 1)), c(nf(u.d.eDay || 0, 0)), u.avail == null ? "—" : nf(u.avail, 1), nf(u.down, 1), c(nf(u.d.genT, 1)), c(nf(u.d.gbT, 1)), u.al || ""]
      : [u.id, u.f, stTxt(u.st), c(nf((u.p || 0) * 1000, 1)), c(nf(u.d.dcV, 0)), c(u.d.eff == null ? "—" : nf(u.d.eff, 2)), c(nf(u.d.igbt, 1)), c(nf(u.d.eDay || 0, 0)), u.avail == null ? "—" : nf(u.avail, 1), nf(u.down, 1), u.al || ""];
    return `<tr${bad ? ' class="bad"' : na ? ' class="na"' : ""}>${cells.map(x => `<td>${esc(String(x))}</td>`).join("")}</tr>`; }).join("");
  const stopRows = D.stops.map(x => `<tr><td>${esc(x.dev)}</td><td>${fmtDT(new Date(x.t0))}</td><td>${x.t1 ? fmtDT(new Date(x.t1)) : `<b>${t("ongoing")}</b>`}</td><td>${nf(x.dur, 1)} h</td><td style="text-align:left;white-space:normal">${esc(L(x.cause))}</td><td>${x.planned ? t("plannedS") : t("unplanned")}</td><td>${esc(x.iec)}</td><td>${nf(x.loss, 2)}</td></tr>`).join("");
  const curtRows = D.curts.map(x => `<tr><td>${fmtDT(new Date(x.t0))}</td><td>${x.t1 ? nf(x.dur, 1) + " h" : `<b>${t("ongoing")}</b>`}</td><td>${nf(x.set, 1)}</td><td>${nf(x.av, 1)}</td><td>${esc(x.src)}</td><td style="text-align:left;white-space:normal">${esc(L(x.reason))}</td><td>${nf(x.e, 2)}</td></tr>`).join("");
  const alRows = D.alarms.map(a => `<tr><td><b style="color:${["", "#C0283E", "#C2660A", "#9A7B00", "#2563EB"][a.sev]}">${t("p" + a.sev)}</b></td><td>${esc(a.dev)}</td><td style="text-align:left;white-space:normal">${esc(alarmText(a))}</td><td>${fmtDT(new Date(a.t))}</td><td>${a.cleared ? fmtDT(new Date(a.clrT)) : `<b>${t("active")}</b>`}</td><td>${a.acked ? esc(a.ackBy) : "—"}</td></tr>`).join("");
  const empty = c => `<tr><td colspan="${c}" style="text-align:center;color:#5B6B85">${t("noEvents")}</td></tr>`;
  const sec = (k, body) => `<section class="rsec"><h3>${t(k)}</h3>${body}</section>`;
  return `<div class="rhead"><div><span data-logo="full" style="width:150px;display:block"></span></div>
      <div class="rtitle"><h2>${t("repPlantT")}</h2><div class="rsub">${esc(repTri("repPlantT"))}</div><div class="rname">${esc(L(s.full))}</div></div>
      <div class="rmeta"><div><span>${t("period")}</span><b>${esc(perLbl)}</b></div><div><span>${t("genAt")}</span><b>${fmtDate(now)} ${fmtTime(now, false)}</b></div><div><span>${t("docNo")}</span><b>OCC-${s.code}-${per.toUpperCase()}-${fmtDate(now).split("/").reverse().join("")}</b></div></div></div>
    <table class="rinfo"><tr><td>${t("plantCode")}</td><td>${s.code}</td><td>${t("province")}</td><td>${esc(L(s.prov))}</td><td>${t("capInst")}</td><td>${esc(capFull(s))}${s.capDC && s.capAC && s.capUnit === "MWp" ? ` · ${nf(s.capAC, 2)} MWac` : s.capDC && s.capUnit === "MWac" ? ` · ${nf(s.capDC, 2)} MWp` : ""}</td></tr>
      <tr><td>${t("model")}</td><td>${esc(s.model)}</td><td>${t("unitsN")}</td><td>${s.n} ${isW ? t("turbinesU") : t("invU")}</td><td>COD</td><td>${esc(s.cod || "—")}</td></tr>
      <tr><td>SCADA</td><td>${esc(s.scada || "—")}</td><td>${t("gridConn")}</td><td>${esc(s.kv || "—")}</td><td>${t("dataPts")}</td><td>${nf(s.pts, 0)}</td></tr></table>
    ${s.notOper ? `<div class="rnote">${t("notOperNote")}</div>` : ""}
    ${sec("sec1", `<div class="kgrid">${kpis.join("")}</div>`)}
    ${sec("sec2", repChart(D))}
    ${sec("sec3", `<table><thead><tr><th>${t("lossCat")}</th><th>MWh</th><th>% ${t("lossTot").toLowerCase()}</th><th>% ${t("thE2").toLowerCase()}</th><th></th></tr></thead><tbody>${lossRows}<tr class="tot"><td>${t("total")}</td><td>${nf(K.lsum, 2)}</td><td>100</td><td>${pct(K.lsum, K.th)}</td><td></td></tr></tbody></table>`)}
    ${sec("sec4", `<table><thead><tr><th>${isW ? t("feederCol") : s.type === "solar" ? t("blockCol") : t("roofCol")}</th><th>${t("unitsN")}</th><th>${t("st_run")}</th><th>${t("st_limit")}</th><th>${t("st_fault")}</th><th>${t("otherSt")}</th><th>P (MW)</th><th>${t("eToday")} (MWh)</th></tr></thead><tbody>${feederRows}<tr class="tot"><td>${t("total")}</td><td>${s.n}</td><td>${D.feeders.reduce((a, f) => a + f.run, 0)}</td><td>${D.feeders.reduce((a, f) => a + f.limit, 0)}</td><td>${D.feeders.reduce((a, f) => a + f.fault, 0)}</td><td>${D.feeders.reduce((a, f) => a + f.other, 0)}</td><td>${nf(D.feeders.reduce((a, f) => a + f.p, 0), 2)}</td><td>${nf(D.feeders.reduce((a, f) => a + f.eDay, 0), 2)}</td></tr></tbody></table>`)}
    ${sec("sec5", `<table class="units"><thead><tr>${uHead.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${uRows}</tbody></table>`)}
    ${sec("sec6", `<h4>${t("stopRec")} · ${D.stops.length}</h4><table><thead><tr><th>${t("device")}</th><th>${t("start")}</th><th>${t("end")}</th><th>${t("dur")}</th><th>${t("cause")}</th><th>${t("type")}</th><th>IEC 61400-26</th><th>${t("lossMWh")}</th></tr></thead><tbody>${stopRows || empty(8)}</tbody></table>
      <h4>${t("curtRec")} · ${D.curts.length}</h4><table><thead><tr><th>${t("start")}</th><th>${t("dur")}</th><th>${t("setMW")}</th><th>${t("availMW")}</th><th>${t("src")}</th><th>${t("reason")}</th><th>${t("curtE")} (MWh)</th></tr></thead><tbody>${curtRows || empty(7)}</tbody></table>`)}
    ${sec("sec7", `<table><thead><tr><th>${t("level")}</th><th>${t("device")}</th><th>${t("desc")}</th><th>${t("start")}</th><th>${t("end")}</th><th>${t("ackBy")}</th></tr></thead><tbody>${alRows || empty(6)}</tbody></table>`)}
    ${sec("sec8", `<div class="rnotes"><div></div><div></div><div></div></div>
      <div class="sig"><div><span>${t("preparedBy")}</span><b>${esc(S.user.name)}</b><em>${esc(t("r_" + S.user.role))}</em></div><div><span>${t("checkedBy")}</span><b>&nbsp;</b><em>${t("shiftLead")}</em></div><div><span>${t("approvedBy")}</span><b>&nbsp;</b><em>${t("plantDir")}</em></div></div>`)}
    <div class="rfoot"><span>HINO Systech Vietnam Co., Ltd. · OCC SCADA ${BUILD.version} · build ${BUILD.id}</span><span>${t("simNote")}</span></div>`;
}

function plantReportCSV(D) { const { s, K } = D; const rows = [];
  rows.push([t("repPlantT"), L(s.full)], [t("period"), D.per, fmtDate(new Date(D.R.from)), fmtDate(new Date())], [t("capInst"), capFull(s)], []);
  rows.push([t("sec1")], [t("actE2") + " (MWh)", nf(K.e, 2)], [t("thE2") + " (MWh)", nf(K.th, 2)], [t("planE") + " (MWh)", nf(K.plan, 2)], [t("cf") + " (%)", nf(K.cf, 2)], [t("eqHh"), nf(K.eqh, 2)], [t("availPct"), K.avail == null ? "" : nf(K.avail, 2)],
    [D.isW ? t("wsAvg") + " (m/s)" : t("insol") + " (kWh/m²)", nf(K.res, 2)], ...(D.isW ? [] : [[t("pr") + " (%)", K.pr == null ? "" : nf(K.pr, 2)]]), [t("lossTot") + " (MWh)", nf(K.lsum, 2)], [t("curtE") + " (MWh)", nf(K.curtE, 2)], [t("stopH") + " (h)", nf(K.stopH, 1)], [t("co2"), nf(K.co2, 1)], []);
  rows.push([t("sec2")], ["", t("actE2") + " (MWh)", t("thE2") + " (MWh)", D.isW ? t("windSpd") : t("irr")], ...D.series.map(x => [x.k, nf(x.e, 3), nf(x.th, 3), x.r == null ? "" : nf(x.r, 2)]), []);
  rows.push([t("sec3")], ...["l_fault", "l_maint", "l_curt", "l_grid", "l_conv"].map((k, j) => [t(k), nf(K.loss[j], 3)]), []);
  rows.push([t("sec4")], ["", t("unitsN"), t("st_run"), t("st_limit"), t("st_fault"), t("otherSt"), "P (MW)", t("eToday")], ...D.feeders.map(f => [feederLabel(s, f.f), f.n, f.run, f.limit, f.fault, f.other, nf(f.p, 3), nf(f.eDay, 3)]), []);
  rows.push([t("sec5")], [t("device"), t("feederCol"), t("state"), "P (kW)", t("eDayK"), t("availPer"), t("downH"), D.isW ? t("genT") : t("igbt"), D.isW ? t("gbT") : t("dcV"), t("alarms")],
    ...D.units.map(u => [u.id, u.f, t("st_" + u.st), nf((u.p || 0) * 1000, 1), nf(u.d.eDay || 0, 0), u.avail == null ? "" : nf(u.avail, 1), nf(u.down, 1), nf(D.isW ? u.d.genT : u.d.igbt, 1), nf(D.isW ? u.d.gbT : u.d.dcV, 1), u.al]), []);
  rows.push([t("stopRec")], ...D.stops.map(x => [x.dev, fmtDT(new Date(x.t0)), x.t1 ? fmtDT(new Date(x.t1)) : t("ongoing"), nf(x.dur, 1), L(x.cause), x.iec, nf(x.loss, 2)]), []);
  rows.push([t("curtRec")], ...D.curts.map(x => [fmtDT(new Date(x.t0)), nf(x.dur, 1), nf(x.set, 1), nf(x.av, 1), x.src, L(x.reason), nf(x.e, 2)]), []);
  rows.push([t("sec7")], ...D.alarms.map(a => [t("p" + a.sev), a.dev, alarmText(a), fmtDT(new Date(a.t)), a.cleared ? fmtDT(new Date(a.clrT)) : t("active"), a.ackBy || ""]));
  return rows; }

// print only the report: copy it to a top-level host, print, then remove it
function printPaper(paper) { const host = document.createElement("div"); host.id = "printHost"; host.innerHTML = paper.outerHTML; document.body.appendChild(host); document.body.classList.add("printing");
  const done = () => { document.body.classList.remove("printing"); host.remove(); window.removeEventListener("afterprint", done); }; window.addEventListener("afterprint", done);
  try { window.print(); } catch (e) { toast(t("printBlocked"), "", "warn"); } setTimeout(() => { if (!matchMedia("print").matches) done(); }, 1500); }

PAGES.reports = (el, param) => {
  setTitle(t("reports"), t("sub_reports")); const ids = scopeIds(); let [tab, sid, per] = (param || "").split(":");
  tab = tab === "plant" || (!tab && ids.length <= 2) ? "plant" : "all"; sid = ids.includes(sid) ? sid : ids.find(i => !ST[i].notOper) || ids[0]; per = REP_PERIODS.some(([k]) => k === per) ? per : "day";
  el.innerHTML = `<div class="fbar"><div class="seg" id="rTab"><button data-tab="all" aria-pressed="${tab === "all"}">${ic("grid", "sm")} ${t("repPortfolio")}</button><button data-tab="plant" aria-pressed="${tab === "plant"}">${ic("station", "sm")} ${t("repPlant")}</button></div>
      <span id="rCtl" class="row" style="gap:8px;flex-wrap:wrap"></span></div><div id="rBody"></div>`;
  function render() { $$("#rTab button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === tab));
    if (tab === "all") { $("#rCtl").innerHTML = "";
      const R = [["rDaily", "cal"], ["rWeekly", "cal"], ["rMonthly", "cal"], ["rEnergy", "zap"], ["rAlarm", "bell"], ["rCO2", "sun"]];
      $("#rBody").innerHTML = `<div class="rep-list">${R.map(([k, i]) => `<button class="rep" data-r="${k}">${ic(i, "c-acc")}<b>${t(k)}</b><span>${t(k + "S")}</span><span class="faint" style="font-size:11px">${t("autoSched")}</span></button>`).join("")}</div>
        <div class="panel" style="margin-top:12px"><div class="ph"><h3>${t("repPlant")}</h3><span class="sub">${t("repPlantS")}</span></div><div class="pb"><div class="rep-plants">${ids.map(i => { const s = ST[i]; return `<button class="rep sm" data-plant="${i}">${ic(s.type === "wind" ? "turbine" : "panel", "c-acc")}<b>${esc(stName(s))}</b><span>${esc(capFull(s))} · ${s.n} ${s.type === "wind" ? t("turbinesU") : t("invU")}</span></button>`; }).join("")}</div></div></div>
        <div class="faint" style="font-size:11.5px">${ic("info", "sm")} ${t("printNote")}</div>`; return; }
    $("#rCtl").innerHTML = `<label>${t("station")}</label><select class="sel" id="rSt">${ids.map(i => `<option value="${i}" ${i === sid ? "selected" : ""}>${esc(stName(ST[i]))}</option>`).join("")}</select>
      <label>${t("period")}</label><div class="seg" id="rPer">${REP_PERIODS.map(([k, l]) => `<button data-per="${k}" aria-pressed="${k === per}">${t(l)}</button>`).join("")}</div>
      <span style="margin-left:auto" class="row"><button class="btn sm" id="rPrint">${ic("file", "sm")} ${t("printPdf")}</button><button class="btn sm" id="rXls">${ic("dl", "sm")} ${t("excel")}</button></span>`;
    const D = plantReportData(sid, per); $("#rBody").innerHTML = `<div class="paper rep-paper" id="rPaper">${plantReportHTML(D)}</div>`; applyLogos();
    $("#rSt").onchange = e => { sid = e.target.value; audit("a_view", "report · " + sid + " · " + per, "ok"); render(); };
    $("#rPer").onclick = e => { const b = e.target.closest("[data-per]"); if (!b) return; per = b.dataset.per; render(); };
    $("#rPrint").onclick = () => { audit("a_export", `PDF · ${sid} · ${per}`, "ok"); printPaper($("#rPaper")); };
    $("#rXls").onclick = () => exportCSV(`report_${ST[sid].code}_${per}`, plantReportCSV(D));
    S.param = `plant:${sid}:${per}`; saveSession(); }
  $("#rTab").onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; tab = b.dataset.tab; render(); };
  el.onclick = e => { const r = e.target.closest("[data-r]"); if (r) { openReport(r.dataset.r); return; } const p = e.target.closest("[data-plant]"); if (p) { tab = "plant"; sid = p.dataset.plant; render(); } };
  render();
};
