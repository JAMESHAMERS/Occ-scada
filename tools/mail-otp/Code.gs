/**
 * HINO OCC SCADA – email one-time code (two-step sign-in)
 * Google Apps Script web app. Deploy from the Gmail account that should send the codes:
 *   script.google.com → New project → paste this file → Deploy → New deployment →
 *   type "Web app", Execute as "Me", Who has access "Anyone" → Deploy → authorise →
 *   copy the Web app URL (…/exec) into MAIL_OTP.url in src/20_data.js.
 *
 * The page only sends the account name. This script picks the recipient, creates the
 * code, e-mails it and checks it, so neither the code nor the address is in the page.
 * Codes: 6 digits, valid 5 minutes, max 5 wrong tries, max 5 codes per account per 10 min.
 */
const RECIPIENTS = {            // account → email address (edit here, then Deploy → Manage deployments → new version)
  admin:       "your.name@gmail.com",
  manager:     "your.name@gmail.com",
  "zhang.wei": "your.name@gmail.com"
};
const TTL_S = 300, MAX_TRIES = 5, MAX_SENDS = 5, SEND_WINDOW_S = 600, TZ = "Asia/Ho_Chi_Minh";

function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  try {
    if (p.action === "send") out = send_(String(p.u || ""));
    else if (p.action === "verify") out = verify_(String(p.u || ""), String(p.code || ""));
    else if (p.action === "ping") out = { ok: true };
    else out = { ok: false, err: "bad_action" };
  } catch (err) { out = { ok: false, err: "server" }; console.error(err); }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function send_(u) {
  const to = RECIPIENTS[u];
  if (!to) return { ok: false, err: "no_email" };
  const cache = CacheService.getScriptCache();
  const rk = "rate_" + u, n = Number(cache.get(rk) || 0);
  if (n >= MAX_SENDS) return { ok: false, err: "rate" };
  cache.put(rk, String(n + 1), SEND_WINDOW_S);
  const code = newCode_();
  cache.put("otp_" + u, JSON.stringify({ code: code, tries: 0 }), TTL_S);
  const when = Utilities.formatDate(new Date(), TZ, "dd/MM/yyyy HH:mm:ss");
  MailApp.sendEmail({
    to: to, name: "HINO OCC SCADA",
    subject: "[HINO OCC SCADA] Mã xác thực đăng nhập: " + code,
    body: "Mã xác thực đăng nhập OCC SCADA của tài khoản " + u + ": " + code + "\nHiệu lực 5 phút (" + when + ").\n" +
          "Nếu bạn không đăng nhập, hãy bỏ qua email này và báo quản trị viên.\n\nHINO Systech Vietnam Co., Ltd.",
    htmlBody:
      '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #dde3ea">' +
      '<div style="background:#0B1320;color:#fff;padding:14px 18px;font-weight:bold;letter-spacing:.04em">HINO OCC SCADA · IA PECH</div>' +
      '<div style="padding:18px">' +
      '<p style="margin:0 0 8px">Mã xác thực đăng nhập cho tài khoản <b>' + u + '</b>:</p>' +
      '<p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:12px 0;color:#0044B8">' + code + '</p>' +
      '<p style="margin:0;color:#5b6675;font-size:13px">Hiệu lực 5 phút · gửi lúc ' + when + ' (giờ Việt Nam).<br>' +
      'Nếu bạn không đăng nhập, hãy bỏ qua email này và báo quản trị viên.</p>' +
      '<p style="margin:14px 0 0;color:#8a94a3;font-size:12px">Login verification code · 登录验证码 — valid 5 min / 5 分钟内有效.</p>' +
      '</div><div style="background:#f3f5f8;color:#5b6675;font-size:11px;padding:10px 18px">HINO Systech Vietnam Co., Ltd. · Global Services from Japan</div></div>'
  });
  return { ok: true, hint: mask_(to), ttl: TTL_S };
}

function verify_(u, code) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get("otp_" + u);
  if (!raw) return { ok: false, err: "expired" };
  const o = JSON.parse(raw);
  if (o.tries >= MAX_TRIES) { cache.remove("otp_" + u); return { ok: false, err: "locked" }; }
  if (/^\d{6}$/.test(code) && code === o.code) { cache.remove("otp_" + u); return { ok: true }; }
  o.tries++;
  if (o.tries >= MAX_TRIES) { cache.remove("otp_" + u); return { ok: false, err: "locked" }; }
  cache.put("otp_" + u, JSON.stringify(o), TTL_S);
  return { ok: false, err: "bad", left: MAX_TRIES - o.tries };
}

function newCode_() {   // 6 digits from a random UUID digest (not Math.random)
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
  const n = ((b[0] & 0x7f) << 24 | (b[1] & 0xff) << 16 | (b[2] & 0xff) << 8 | (b[3] & 0xff)) % 1000000;
  return ("000000" + n).slice(-6);
}
function mask_(e) { const p = e.split("@"); return p[0].slice(0, 4) + "•••@" + p[1]; }

/** Run once from the editor (▶ testSend) to authorise MailApp and receive a test code. */
function testSend() { console.log(JSON.stringify(send_("admin"))); }
