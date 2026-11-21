"""Збирає ~1000 точок по світу з Wikidata + Вікіпедії → data/points/world.geojson.
Класи: мегаліти, кола з каменів, менгіри, дольмени, святі джерела, священні місця, геогліфи, НЛО-випадки, «примарні» будівлі.
Кожна точка має посилання на статтю Вікіпедії та елемент Wikidata. Запуск з кореня: python3 -I tools/harvest/harvest_world.py"""
import json, math, re, sys, time, urllib.parse, urllib.request
from collections import defaultdict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from cats import api

AG = "ufo-map-harvest/0.1 (open-source hobby project)"
ROOT = Path(__file__).resolve().parents[2]
PTS = ROOT / "data/points"
ADDED = "2026-11-21"
TARGET, PER_COUNTRY = 1000, 90

# (qid, код, категорія, source_type, достовірність, точність_м, статус, теги)
CLASSES = [
    ("Q40728071", "ufo", "ufo_sighting", "media", 2, 1000, "disputed", ["НЛО"]),
    ("Q45791",    "geo", "other",         "media", 1, 300,  "published", ["геогліф"]),
    ("Q545599",   "hnt", "paranormal",    "media", 1, 200,  "published", ["привиди"]),
    ("Q16412466", "sac", "place_of_power","media", 1, 500,  "published", ["священне місце"]),
    ("Q1371047",  "wel", "place_of_power","media", 1, 200,  "published", ["святе джерело"]),
    ("Q1935728",  "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт", "коло з каменів"]),
    ("Q193475",   "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт", "менгір"]),
    ("Q101659",   "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт", "дольмен"]),
    ("Q1426772",  "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт"]),
    ("Q1433492",  "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт", "кам'яний корабель"]),
    ("Q688292",   "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт", "нурагa"]),
    ("Q12516",    "pyr", "place_of_power","media", 1, 150,  "published", ["піраміда"]),
    ("Q15135589", "plg", "place_of_power","media", 1, 400,  "published", ["паломництво"]),
    ("Q34023",    "tum", "place_of_power","media", 1, 200,  "published", ["курган"]),
    ("Q55818",    "crt", "magnetic_anomaly","media", 2, 2000, "published", ["кратер", "імпактна структура"]),
    ("Q164240",   "mgl", "place_of_power","media", 1, 150,  "published", ["мегаліт"]),
]
OCC = "Тимчасово окупована територія — відвідування неможливе й небезпечне."
NOTE = {"mgl": "Мегаліти часто згадують в езотеричній літературі як місця сили; з погляду археології — давні пам'ятки.",
        "wel": "Святі джерела в народній традиції пов'язують з цілющою силою; наукових підтверджень цьому немає.",
        "sac": "Місце має духовне значення в традиції; це не наукове твердження.",
        "geo": "Геогліфи іноді трактують у псевдонауковій літературі; за археологією — рукотворні зображення.",
        "pyr": "Піраміди часто фігурують у псевдонауковій літературі; за археологією — гробниці й храми.",
        "plg": "Місця паломництва пов'язані з вірою й традицією; це не наукове твердження.",
        "tum": "Кургани в народній традиції пов'язують з легендами; за археологією — поховання.",
        "crt": "Імпактні структури — сліди падіння метеоритів; іноді пов'язані з магнітними й гравітаційними аномаліями.",
        "hnt": "Повідомлення про привидів — легенди й свідчення, не підтверджені факти.",
        "ufo": "Повідомлення про НЛО — свідчення очевидців; офіційного підтвердження позаземного походження немає."}
NOTE_EN = {"mgl": "Megaliths are often cited in esoteric literature as places of power; archaeologically they are ancient monuments.",
           "wel": "Holy wells are traditionally linked with healing powers; there is no scientific confirmation.",
           "sac": "The site has spiritual significance in tradition; this is not a scientific claim.",
           "geo": "Geoglyphs are sometimes interpreted in pseudoscientific literature; archaeologically they are man-made figures.",
           "pyr": "Pyramids often feature in pseudoscientific literature; archaeologically they are tombs and temples.",
           "plg": "Pilgrimage sites are tied to faith and tradition; this is not a scientific claim.",
           "tum": "Burial mounds are linked with legends in folk tradition; archaeologically they are burials.",
           "crt": "Impact structures are traces of meteorite falls; sometimes associated with magnetic and gravity anomalies.",
           "hnt": "Ghost reports are legends and testimony, not confirmed facts.",
           "ufo": "UFO reports are eyewitness accounts; there is no official confirmation of extraterrestrial origin."}

def sparql(q):
    req = urllib.request.Request("https://query.wikidata.org/sparql?" + urllib.parse.urlencode(dict(query=q, format="json")), headers={"User-Agent": AG})
    for w in (5, 20, 60):
        try:
            time.sleep(2); return json.load(urllib.request.urlopen(req, timeout=170))["results"]["bindings"]
        except Exception as e:
            print("retry", str(e)[:80], flush=True); time.sleep(w)
    return []

existing, used = [], {}
for f in PTS.glob("*.geojson"):
    if f.name == "world.geojson": continue
    for ft in json.load(open(f))["features"]:
        existing.append(tuple(ft["geometry"]["coordinates"][:2]))
        pre = ft["properties"]["id"].rsplit("-", 1)[0]
        used[pre] = max(used.get(pre, 0), int(ft["properties"]["id"][-4:]))

def near(lat, lon):
    for x, y in existing:
        if abs(lat - y) < 0.01 and abs(lon - x) < 0.02 and math.hypot((lat - y) * 111000, (lon - x) * 111000 * math.cos(math.radians(lat))) < 300: return True
    return False

cands, seen = [], set()
for qid, code, *rest in CLASSES:
    q = f"""SELECT ?i ?c ?cc ?cl ?en ?uk ?ae ?au ?t ?sl WHERE {{
      ?i wdt:P31/wdt:P279* wd:{qid}; wdt:P625 ?c; wdt:P17 ?co; wikibase:sitelinks ?sl.
      ?co wdt:P297 ?cc. ?co rdfs:label ?cl FILTER(LANG(?cl)="en")
      ?ae schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>.
      OPTIONAL {{ ?i rdfs:label ?en FILTER(LANG(?en)="en") }}
      OPTIONAL {{ ?i rdfs:label ?uk FILTER(LANG(?uk)="uk") }}
      OPTIONAL {{ ?au schema:about ?i; schema:isPartOf <https://uk.wikipedia.org/>. }}
      OPTIONAL {{ ?i wdt:P585 ?t. }}
    }} ORDER BY DESC(?sl) LIMIT 700"""
    rows = sparql(q); n = 0
    for r in rows:
        iid = r["i"]["value"].rsplit("/", 1)[1]
        if iid in seen or "en" not in r: continue
        m = re.match(r"Point\(([-\d.eE]+) ([-\d.eE]+)\)", r["c"]["value"])
        if not m: continue
        lon, lat = float(m.group(1)), float(m.group(2))
        if abs(lat) < 0.001 and abs(lon) < 0.001: continue
        seen.add(iid); n += 1
        cands.append(dict(qid=iid, cls=(qid, code, *rest), lat=lat, lon=lon, cc=r["cc"]["value"].lower(), country=r["cl"]["value"],
                          en=r["en"]["value"], uk=r.get("uk", {}).get("value"), ae=r["ae"]["value"], au=r.get("au", {}).get("value"),
                          year=(r["t"]["value"][:4] if "t" in r and re.match(r"-?\d{4}", r["t"]["value"]) else None), sl=int(r["sl"]["value"])))
    print(qid, code, "рядків", len(rows), "нових", n, flush=True)

# розподіл: обмеження на країну, потім за кількістю мов статті
cands.sort(key=lambda c: -c["sl"])
percountry, picked = defaultdict(int), []
for c in cands:
    if percountry[c["cc"]] >= PER_COUNTRY or near(c["lat"], c["lon"]): continue
    percountry[c["cc"]] += 1; picked.append(c)
    existing.append((c["lon"], c["lat"]))
picked = picked[:TARGET]
print("відібрано", len(picked), "країн", len(percountry), flush=True)

def titles_of(url): return urllib.parse.unquote(url.rsplit("/wiki/", 1)[1]).replace("_", " ")
def extracts(lang, urls):
    out = {}
    ts = [titles_of(u) for u in urls]
    for i in range(0, len(ts), 20):
        r = api(lang, action="query", titles="|".join(ts[i:i+20]), prop="extracts", exintro=1, explaintext=1, exlimit=20, exsentences=3, redirects=1)
        q = r["query"]
        mp = {x["from"]: x["to"] for x in q.get("redirects", []) + q.get("normalized", [])}
        ex = {p["title"]: p.get("extract", "").replace("\n", " ").strip() for p in q["pages"]}
        for t in ts[i:i+20]:
            tt = t
            for _ in range(3): tt = mp.get(tt, tt)
            out[t] = ex.get(tt, "")
    return out

en_ex = extracts("en", [c["ae"] for c in picked]); print("en extracts", flush=True)
uk_ex = extracts("uk", [c["au"] for c in picked if c["au"]]); print("uk extracts", flush=True)

def clip(s, n=420):
    if len(s) <= n: return s
    s = s[:n].rsplit(" ", 1)[0]
    return s.rstrip(",;:") + "…"

feats = []
for c in picked:
    qid, code, cat, st, cred, prec, status, tags = c["cls"]
    e = clip(en_ex.get(titles_of(c["ae"]), ""))
    u = clip(uk_ex.get(titles_of(c["au"]), "")) if c["au"] else ""
    if not e and not u: continue
    pre = f"{c['cc']}-{code}"; used[pre] = used.get(pre, 0) + 1
    if used[pre] > 9999: continue
    desc_en = f"{e or u} {NOTE_EN[code]}"
    desc_uk = f"{u} {NOTE[code]}" if u else f"(англ. Вікіпедія) {e} {NOTE[code]}"
    crimea = 44.3 <= c["lat"] <= 46.2 and 32.4 <= c["lon"] <= 36.7 and c["cc"] == "ua"
    props = dict(id=f"{pre}-{used[pre]:04d}", title=dict(uk=c["uk"] or c["en"], en=c["en"]), description=dict(uk=desc_uk, en=desc_en),
                 category=cat, observed_at=c["year"] if c["year"] and re.fullmatch(r"\d{4}", c["year"]) else None, added_at=ADDED,
                 source_type=st, sources=[c["ae"]] + ([c["au"]] if c["au"] else []) + [f"https://www.wikidata.org/wiki/{c['qid']}"],
                 credibility=cred, precision_m=max(prec, 500) if crimea else prec, reporter="wikidata-harvest", region=c["country"],
                 tags=tags, media=[], status=status)
    if crimea: props["safety_note"] = OCC
    feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c["lon"], 6), round(c["lat"], 6)]}, "properties": props})

(PTS / "world.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, indent=1) + "\n")
print("world.geojson", len(feats), flush=True)
