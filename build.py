#!/usr/bin/env python3
"""Build the single-file OCC SCADA page (index.html) from src/ and data/.

index.html is GENERATED. Edit the files in src/ (texts, plant data, styles) and run:
    node tools/validate.mjs && python3 build.py
On GitHub the same two steps run automatically on every push (.github/workflows/build.yml).

The build is reproducible: the same sources give a byte-identical index.html, and the
build id shown in the app (status bar, login page, "About") is a hash of the sources,
so any two copies can be compared at a glance.
"""
import glob, hashlib, json, os, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
GEO = os.path.join(ROOT, "data", "geo")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "index.html")
VERSION = "1.0"
SALT = "occ-iapech-2026"
DEMO_PW = {"admin": "Admin@2026", "manager": "Manager@2026", "occ": "Occ@2026",
           "plant": "Plant@2026", "maint": "Maint@2026", "guest": "Guest@2026"}

def rnd(o, d=3):
    if isinstance(o, float): return round(o, d)
    if isinstance(o, list): return [rnd(x, d) for x in o]
    if isinstance(o, dict): return {k: rnd(v, d) for k, v in o.items()}
    return o

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()

# ---- sources (fixed order) and content hash
src_files = [os.path.join(SRC, "01_head.html"), os.path.join(SRC, "02_body.html")] + sorted(glob.glob(os.path.join(SRC, "*.js")))
geo_files = [os.path.join(GEO, n) for n in ("prov_hi.json", "nb_hi.json", "vn_hi.json")]
h = hashlib.sha256()
for p in src_files + geo_files + [os.path.abspath(__file__)]:
    h.update(os.path.relpath(p, ROOT).encode()); h.update(read(p).encode())
src_hash = h.hexdigest()[:7]

def git(*a):
    try: return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception: return ""
# date of the last commit that touched the sources; today (ICT) if they have uncommitted edits
dirty = git("status", "--porcelain", "--", "src", "data", "build.py")
ts = git("log", "-1", "--format=%ct", "--", "src", "data", "build.py")
ict = datetime.timezone(datetime.timedelta(hours=7))
d = datetime.datetime.now(ict) if (dirty or not ts) else datetime.datetime.fromtimestamp(int(ts), ict)
BUILD = {"version": VERSION, "id": d.strftime("%y%m%d") + "." + src_hash, "date": d.strftime("%Y-%m-%d")}

# ---- map data
prov = rnd(json.loads(read(geo_files[0]))); nb = rnd(json.loads(read(geo_files[1]))); vn = rnd(json.loads(read(geo_files[2])))
prov["features"] = [{"type": "Feature", "properties": {"p": f["properties"]["p"]}, "geometry": f["geometry"]} for f in prov["features"]]
nb["features"] = [{"type": "Feature", "properties": {"n": f["properties"].get("name")}, "geometry": f["geometry"]} for f in nb["features"]]
vng = vn["features"][0]["geometry"] if "features" in vn else (vn["geometries"][0] if "geometries" in vn else vn)
geo_js = "window.GEO=" + json.dumps({"prov": prov, "nb": nb, "vn": {"type": "Feature", "properties": {}, "geometry": vng}},
                                    separators=(",", ":"), ensure_ascii=False) + ";"

# ---- app script
js = ""
for p in src_files[2:]:
    js += "\n// ---- " + os.path.basename(p) + "\n" + read(p)
for k, v in DEMO_PW.items():
    js = js.replace("__H_%s__" % k, hashlib.sha256((SALT + ":" + v).encode()).hexdigest())
js = js.replace("__BUILD__", json.dumps(BUILD))
for token in ("__H_", "__BUILD__"):
    if token in js: sys.exit("build: unresolved placeholder %s" % token)

banner = ("<!-- GENERATED FILE – do not edit. Source: src/ + data/ in this repository; rebuild with build.py.\n"
          "     HINO OCC SCADA %s · build %s · HINO Systech Vietnam Co., Ltd. -->\n" % (VERSION, BUILD["id"]))
# Standards-mode document (a page without <!doctype> renders in quirks mode, where e.g. #id selectors ignore case)
head = ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')
html = (head + banner + read(src_files[0]) + "\n</head>\n<body>\n" + read(src_files[1]) + "\n<script>" + geo_js +
        "</script>\n<script type=\"module\">\n" + js + "\n</script>\n</body>\n</html>\n")
with open(OUT, "w", encoding="utf-8", newline="\n") as f: f.write(html)
print("build %s → %s (%d KB)" % (BUILD["id"], os.path.relpath(OUT, ROOT) if OUT.startswith(ROOT) else OUT, len(html.encode()) // 1024))
