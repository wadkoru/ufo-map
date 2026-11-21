import type { Lang, PointFeature } from '../types';

// Без ключів і бекенду: Wikipedia (опис/легенда) + Wikimedia Commons (фото) за координатами.
export interface Photo { thumb: string; page: string; title: string; author: string; license: string }
export interface Enrichment {
  title?: string; extract?: string; pageUrl?: string; photos: Photo[];
}

const strip = (s: string) => s.replace(/<[^>]*>/g, '').trim();
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function getJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function fetchEnrichment(f: PointFeature, lang: Lang): Promise<Enrichment> {
  const [lng, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates
    : (f.geometry.type === 'LineString' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0]);
  const radius = Math.min(10000, Math.max(1500, f.properties.precision_m * 2));
  const wiki = `https://${lang}.wikipedia.org`;
  const out: Enrichment = { photos: [] };

  const [pagesRes] = await Promise.allSettled([
    getJson(`${wiki}/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=${radius}&gslimit=10&format=json&origin=*`),
  ]);

  if (pagesRes.status === 'fulfilled') {
    const list: { title: string; dist: number }[] = pagesRes.value.query?.geosearch ?? [];
    const words = norm(f.properties.title[lang]).split(' ').filter((w) => w.length > 3);
    const scored = list.map((p) => ({ p, hit: words.filter((w) => norm(p.title).includes(w)).length }));
    scored.sort((a, b) => b.hit - a.hit || a.p.dist - b.p.dist);
    const best = scored[0]?.p;
    if (best) {
      try {
        const s = await getJson(`${wiki}/api/rest_v1/page/summary/${encodeURIComponent(best.title)}`);
        out.title = s.title; out.extract = s.extract; out.pageUrl = s.content_urls?.desktop?.page;
      } catch { /* без опису */ }
    }
  }

  return out;
}

const API_URL: string = import.meta.env.VITE_API_URL ?? '';
export const hasBackend = (): boolean => API_URL !== '';

/** Текст від Claude через бекенд (Cloudflare Worker). Кидає помилку, якщо бекенд недоступний. */
export async function generateText(f: PointFeature, lang: Lang, extra?: string): Promise<string> {
  const p = f.properties;
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lang, title: p.title[lang], region: p.region, category: p.category, observed_at: p.observed_at,
      description: p.description[lang], sources: p.sources, extra,
    }),
  });
  if (r.status === 429) throw new Error('rate_limit');
  if (!r.ok) throw new Error(String(r.status));
  return ((await r.json()) as { text: string }).text;
}

// ---------------- Шукач фото ----------------
const BAD = /logo|flag|icon|symbol|locator|location map|coat of arms|commons-|wiki|blank|diagram|\.svg/i;
const wanted = 6;

function toPhotos(pages: any[]): Photo[] {
  return pages
    .filter((p) => /\.(jpe?g|png)$/i.test(p.title ?? '') && !BAD.test(p.title) && p.imageinfo?.[0]?.thumburl)
    .map((p) => {
      const i = p.imageinfo[0];
      return {
        thumb: i.thumburl, page: i.descriptionurl ?? '', title: String(p.title).replace(/^File:/, ''),
        author: strip(i.extmetadata?.Artist?.value ?? ''), license: strip(i.extmetadata?.LicenseShortName?.value ?? ''),
      } as Photo;
    });
}
const IMG = 'prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json&origin=*';
const pagesOf = (r: any): any[] => Object.values(r?.query?.pages ?? {});

function wikiSources(f: PointFeature): { lang: string; title: string }[] {
  const out: { lang: string; title: string }[] = [];
  for (const u of f.properties.sources) {
    const m = u.match(/^https?:\/\/([a-z-]+)\.wikipedia\.org\/wiki\/([^#?]+)/);
    if (m) out.push({ lang: m[1], title: decodeURIComponent(m[2]).replace(/_/g, ' ') });
  }
  return out;
}

/** Каскад: (1) зображення статті-джерела → (2) Commons за координатами 1.5/10/50 км → (3) Commons за текстом назви. */
export async function fetchPhotos(f: PointFeature, lang: Lang): Promise<Photo[]> {
  const found: Photo[] = [];
  const key = (u: string) => {
    const parts = decodeURIComponent(u).split('/');
    return (u.includes('/thumb/') ? parts[parts.length - 2] : parts[parts.length - 1]).toLowerCase();
  };
  const add = (ph: Photo[]) => {
    for (const x of ph) if (found.length < wanted && !found.some((y) => key(y.thumb) === key(x.thumb))) found.push(x);
  };
  const safe = async (url: string) => { try { return await getJson(url); } catch { return null; } };

  // 1. статті Вікіпедії, на які посилається точка
  for (const w of wikiSources(f).sort((a) => (a.lang === lang ? -1 : 1)).slice(0, 2)) {
    const base = `https://${w.lang}.wikipedia.org/w/api.php?action=query&redirects=1`;
    const t = encodeURIComponent(w.title);
    const [lead, imgs] = await Promise.all([
      safe(`${base}&titles=${t}&generator=images&gimlimit=30&${IMG}`),
      safe(`${base}&titles=${t}&prop=pageimages&piprop=thumbnail&pithumbsize=480&format=json&origin=*`),
    ]);
    const leadPage = pagesOf(imgs)[0];
    if (leadPage?.thumbnail?.source) {
      add([{ thumb: leadPage.thumbnail.source, page: `https://${w.lang}.wikipedia.org/wiki/${t}`, title: w.title, author: '', license: 'Wikipedia' }]);
    }
    add(toPhotos(pagesOf(lead)));
    if (found.length >= wanted) return found;
  }

  // 2. Commons за координатами, радіус поступово росте
  const [lng, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates
    : (f.geometry.type === 'LineString' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0]);
  for (const radius of [1500, 10000]) {
    const r = await safe(`https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=${radius}&ggsnamespace=6&ggslimit=20&${IMG}`);
    add(toPhotos(pagesOf(r)));
    if (found.length >= 3) break;
  }

  // 3. Commons за назвою
  if (found.length < wanted) {
    for (const q of [f.properties.title.en, f.properties.title[lang]]) {
      const r = await safe(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrlimit=12&${IMG}`);
      add(toPhotos(pagesOf(r)));
      if (found.length >= wanted) break;
    }
  }
  return found;
}
