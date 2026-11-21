import sys, json; sys.path.insert(0,'.')
from cats import api
t=["Кам'яна Могила","Скельські менгіри","Таврські кам'яні ящики","Межові камені","Мегаліти Криму","Сарсени Докучаєвська","Тотоха (гора)","Дівич-гора (Трипілля)","Озеро Журавлине","Камінь Довбуша","Скелі Довбуша","Чортів Камінь","Бубнище","Дольмени Криму","Богит","Мшанець (Самбірський район)","Тихе (Прилуцький район)","Лиса гора (Київ)","Козацька Могила","Медвин"]
r=api("uk",action="query",titles="|".join(t),prop="coordinates|extracts|info",inprop="url",exintro=1,explaintext=1,exlimit=20,colimit=20,exsentences=3,redirects=1)
for p in r["query"]["pages"]:
    c=p.get("coordinates",[{}])[0]
    print(p["title"],p.get("missing"),c.get("lat"),c.get("lon"),"|",p.get("extract","")[:140].replace("\n"," "))
