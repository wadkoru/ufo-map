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

  const [pagesRes, photosRes] = await Promise.allSettled([
    getJson(`${wiki}/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=${radius}&gslimit=10&format=json&origin=*`),
    getJson(`https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=${radius}&ggsnamespace=6&ggslimit=12&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json&origin=*`),
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

  if (photosRes.status === 'fulfilled') {
    const pages = Object.values(photosRes.value.query?.pages ?? {}) as any[];
    out.photos = pages
      .filter((p) => /\.(jpe?g|png)$/i.test(p.title) && p.imageinfo?.[0]?.thumburl)
      .slice(0, 6)
      .map((p) => {
        const i = p.imageinfo[0];
        return {
          thumb: i.thumburl, page: i.descriptionurl ?? '', title: p.title.replace(/^File:/, ''),
          author: strip(i.extmetadata?.Artist?.value ?? ''), license: strip(i.extmetadata?.LicenseShortName?.value ?? ''),
        };
      });
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
