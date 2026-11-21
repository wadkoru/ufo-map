import json, sys, time, urllib.parse, urllib.request, urllib.error
AG = "ufo-map-harvest/0.1 (open-source hobby project)"
def api(lang, **p):
    p.update(format="json", formatversion=2)
    req = urllib.request.Request(f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(p), headers={"User-Agent": AG})
    for w in (3, 10, 30, 60):
        try:
            time.sleep(1.5); return json.load(urllib.request.urlopen(req, timeout=30))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(w)
    raise RuntimeError("429")
def members(lang, cat):
    r = api(lang, action="query", list="categorymembers", cmtitle=cat, cmlimit=500, cmtype="page|subcat")
    return r.get("query", {}).get("categorymembers", [])
if __name__ == "__main__":
  for lang, cat in [(a.split("|")[0], a.split("|")[1]) for a in sys.argv[1:]]:
      try: m = members(lang, cat)
      except Exception as e: print(lang, cat, "ERR", e); continue
      pages = [x["title"] for x in m if x["ns"] == 0]; subs = [x["title"] for x in m if x["ns"] == 14]
      print(f"{lang}|{cat}: {len(pages)} pages; subcats: {subs[:12]}; sample: {pages[:6]}")
