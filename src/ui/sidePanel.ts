import type { PointFeature } from '../types';
import { getLang, t } from '../i18n';
import { fetchEnrichment } from './enrich';
import { CATEGORY_COLORS, DEBUNKED_COLOR } from '../map/categories';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function precision(m: number): string {
  return m >= 1000 ? t('panel.km', { n: +(m / 1000).toFixed(1) }) : t('panel.meters', { n: m });
}

export function renderPanel(el: HTMLElement, f: PointFeature, onClose: () => void): void {
  const p = f.properties;
  const lang = getLang();
  const color = p.status === 'debunked' ? DEBUNKED_COLOR : CATEGORY_COLORS[p.category];
  const row = (k: string, v: string) => `<div class="row"><span>${esc(t(k))}</span><b>${v}</b></div>`;
  el.innerHTML = `
    <button class="close" aria-label="${esc(t('close'))}">×</button>
    ${p.safety_note ? `<div class="safety"><b>${esc(t('panel.safety'))}:</b> ${esc(p.safety_note)}</div>` : ''}
    <h2>${esc(p.title[lang])}</h2>
    <div class="badge" style="--c:${color}">${esc(t('category.' + p.category))}</div>
    <p class="desc">${esc(p.description[lang])}</p>
    ${p.region ? row('panel.region', esc(p.region)) : ''}
    ${row('panel.observed', p.observed_at ? esc(p.observed_at) : esc(t('panel.undated')))}
    ${row('panel.credibility', `${p.credibility}/5 — ${esc(t('credibility.' + p.credibility))}`)}
    ${row('panel.precision', precision(p.precision_m))}
    ${row('filters.source_type', esc(t('source_type.' + p.source_type)))}
    ${row('panel.status', esc(t('status.' + p.status)))}
    ${p.tags?.length ? `<div class="tags">${p.tags.map((x) => `<span>#${esc(x)}</span>`).join('')}</div>` : ''}
    <button class="enrich">${esc(t('enrich.button'))}</button>
    <div class="enriched" aria-live="polite"></div>
    <h3>${esc(t('panel.sources'))}</h3>
    <ul>${p.sources.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(new URL(u).hostname)}</a></li>`).join('')}</ul>`;
  el.querySelector('.close')!.addEventListener('click', onClose);
  const btn = el.querySelector<HTMLButtonElement>('.enrich')!;
  const box = el.querySelector<HTMLElement>('.enriched')!;
  btn.addEventListener('click', async () => {
    btn.disabled = true; box.textContent = t('enrich.loading');
    try {
      const e = await fetchEnrichment(f, lang);
      if (!e.extract && !e.photos.length) { box.textContent = t('enrich.none'); btn.disabled = false; return; }
      box.innerHTML = `${e.extract ? `<h3>${esc(t('enrich.about'))}</h3><p><b>${esc(e.title ?? '')}</b></p><p>${esc(e.extract)}</p>${e.pageUrl ? `<a href="${esc(e.pageUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia</a>` : ''}` : ''}
        ${e.photos.length ? `<h3>${esc(t('enrich.photos'))}</h3><div class="photos">${e.photos.map((p) =>
          `<figure><a href="${esc(p.page)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(p.thumb)}" alt="${esc(p.title)}"></a><figcaption>${esc(p.author)} ${esc(p.license)}</figcaption></figure>`).join('')}</div>` : ''}
        <small>${esc(t('enrich.note'))}</small>`;
    } catch { box.textContent = t('enrich.error'); btn.disabled = false; }
  });
  el.hidden = false;
  el.scrollTop = 0;
}
