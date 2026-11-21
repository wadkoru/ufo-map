import sys, json; sys.path.insert(0,'.')
from cats import api
r=api("nl",action="query",titles="Lijst van hunebedden in Nederland",prop="links",pllimit=500)
t=sorted({l["title"] for p in r["query"]["pages"] for l in p.get("links",[]) if "(hunebed)" in l["title"]})
print(len(t))
out=[]
for i in range(0,len(t),20):
    r=api("nl",action="query",titles="|".join(t[i:i+20]),prop="coordinates|extracts|info",inprop="url",exintro=1,explaintext=1,exlimit=20,colimit=20,exsentences=3)
    for p in r["query"]["pages"]:
        c=p.get("coordinates",[{}])[0]
        out.append(dict(title=p["title"],lat=c.get("lat"),lon=c.get("lon"),extract=p.get("extract",""),url=p.get("fullurl")))
json.dump(out,open("hunebedden.json","w"),ensure_ascii=False,indent=1)
print(sum(1 for o in out if o["lat"]), out[0], out[5]["extract"][:300])
