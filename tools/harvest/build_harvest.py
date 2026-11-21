"""Збирає data/points/nl-hunebedden.geojson і ua-wikipedia.geojson з Вікіпедії.
Усі точки мають посилання на статтю-джерело. Запуск: python3 -I tools/harvest/build_harvest.py (з кореня).
Існуючі файли ua.geojson / nl.geojson не чіпає; дублікати (за відстанню < 300 м) пропускає."""
import json, math, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from cats import api

ROOT = Path(__file__).resolve().parents[2]
PTS = ROOT / "data/points"
ADDED = "2026-11-21"
PROV = {"Drenthe": ("dr", "Дренте", "Drenthe"), "Groningen": ("gr", "Гронінген", "Groningen"),
        "Overijssel": ("ov", "Overijssel", "Overijssel"), "Flevoland": ("fl", "Флеволанд", "Flevoland"),
        "Friesland": ("fr", "Фрисландія", "Friesland"), "Gelderland": ("gd", "Гелдерланд", "Gelderland")}

existing = []
used = {}
for f in PTS.glob("*.geojson"):
    if f.name in ("nl-hunebedden.geojson", "ua-wikipedia.geojson"): continue
    for ft in json.load(open(f))["features"]:
        existing.append(ft["geometry"]["coordinates"][:2])
        pre = ft["properties"]["id"].rsplit("-", 1)[0]
        used[pre] = max(used.get(pre, 0), int(ft["properties"]["id"][-4:]))

def near(lat, lon):
    for x, y in existing:
        d = math.hypot((lat - y) * 111_000, (lon - x) * 111_000 * math.cos(math.radians(lat)))
        if d < 300: return True
    return False

def nid(pre):
    used[pre] = used.get(pre, 0) + 1
    return f"{pre}-{used[pre]:04d}"

def feat(id, lat, lon, tu, te, du, de, cat, st, src, cred, prec, region, tags, safety=None):
    p = dict(id=id, title=dict(uk=tu, en=te), description=dict(uk=du, en=de), category=cat, observed_at=None,
             added_at=ADDED, source_type=st, sources=src, credibility=cred, precision_m=prec,
             reporter="wikipedia-harvest", region=region, tags=tags, media=[], status="published")
    if safety: p["safety_note"] = safety
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}, "properties": p}

def fetch(lang, titles):
    out = []
    for i in range(0, len(titles), 20):
        r = api(lang, action="query", titles="|".join(titles[i:i+20]), prop="coordinates|extracts|info", inprop="url",
                exintro=1, explaintext=1, exlimit=20, colimit=20, exsentences=3, redirects=1)
        out += r["query"]["pages"]
    return out

# ---------- NL: хунебеди ----------
r = api("nl", action="query", titles="Lijst van hunebedden in Nederland", prop="links", pllimit=500)
titles = sorted({l["title"] for p in r["query"]["pages"] for l in p.get("links", []) if "(hunebed)" in l["title"]})
nl = []
for p in fetch("nl", titles):
    if "coordinates" not in p: continue
    c = p["coordinates"][0]
    if near(c["lat"], c["lon"]): continue
    m = re.search(r"\b[DG]\d+[a-z]?\b", p["title"])
    if not m: print("пропуск:", p["title"]); continue
    name = m.group(0)
    ext = p.get("extract", "").replace("\n", " ").strip()
    pm = re.search(r"provincie (\w+)", ext)
    prov = pm.group(1) if pm and pm.group(1) in PROV else "Drenthe"
    code, pu, pe = PROV[prov]
    ctx = f" Вікіпедія (nl): «{ext}»" if ext else ""
    ctxe = f" Wikipedia (nl): “{ext}”" if ext else ""
    nl.append(feat(nid(f"nl-{code}"), c["lat"], c["lon"], f"Гунебед {name}", f"Hunebed {name}",
        f"Гунебед {name} — неолітична мегалітична гробниця (бл. 3400–3100 рр. до н. е.) культури лійчастих кубків, провінція {pu}. "
        f"Мегаліти часто згадують в езотеричній літературі як місця сили; з погляду археології це поховання.{ctx}",
        f"Hunebed {name} is a Neolithic megalithic tomb (c. 3400–3100 BC) of the Funnelbeaker culture in {pe}. "
        f"Megaliths are often cited in esoteric literature as places of power; archaeologically they are burials.{ctxe}",
        "place_of_power", "media", [p["fullurl"]], 1, 100, pu, ["мегаліт", "гунебед", "неоліт"]))

# ---------- UA: мегаліти ----------
OCC = "Тимчасово окупована територія — відвідування неможливе й небезпечне."
ua = []
for p in fetch("uk", ["Межові камені", "Таврські кам'яні ящики"]):
    if "coordinates" not in p: continue
    c = p["coordinates"][0]
    if near(c["lat"], c["lon"]): continue
    crimea = c["lat"] < 46
    pre = "ua-crm" if crimea else "ua-kir"
    ext = p.get("extract", "").replace("\n", " ").strip()
    tu = p["title"]; te = {"Межові камені": "Boundary Stones (Mezhovi Kameni)", "Таврські кам'яні ящики": "Taurian stone boxes (Tash-Koy)"}[tu]
    ua.append(feat(nid(pre), c["lat"], c["lon"], tu, te,
        f"{ext} Мегалітичні об'єкти часто розглядають в езотеричній літературі як місця сили.",
        f"Megalithic site in Ukraine (source: Ukrainian Wikipedia). Often described in esoteric literature as a place of power. Original summary: {ext}",
        "place_of_power", "media", [p["fullurl"]], 1, 300 if not crimea else 500,
        "Крим" if crimea else "Кіровоградська обл.", ["мегаліт"], OCC if crimea else None))

for name, feats in (("nl-hunebedden", nl), ("ua-wikipedia", ua)):
    (PTS / f"{name}.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, indent=2) + "\n")
    print(name, len(feats))
