import type { PointFeature } from '../types';
import { getLang, t } from '../i18n';
import { fetchEnrichment, fetchPhotos, generateText, hasBackend, type Photo } from './enrich';
import { CATEGORY_COLORS, DEBUNKED_COLOR } from '../map/categories';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Мінімальний markdown: екрануємо все, потім **жирний**, ## заголовки, абзаци. */
function md(src: string): string {
  return esc(src).split(/\n{2,}/).map((blk) => blk.replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')).map((x) => `<p>${x}</p>`).join('');
}

const photosHtml = (ps: Photo[]) => ps.map((p) =>
  `<figure><a href="${esc(p.page)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(p.thumb)}" alt="${esc(p.title)}"></a><figcaption>${esc([p.author, p.license].filter(Boolean).join(' · '))}</figcaption></figure>`).join('');

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
    <div class="photos photos-auto" aria-live="polite"><small class="muted">${esc(t('photos.loading'))}</small></div>
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
  const auto = el.querySelector<HTMLElement>('.photos-auto')!;
  fetchPhotos(f, lang).then((ps) => {
    auto.innerHTML = ps.length ? photosHtml(ps) : `<small class="muted">${esc(t('photos.none'))}</small>`;
  }).catch(() => { auto.innerHTML = `<small class="muted">${esc(t('photos.none'))}</small>`; });
  const btn = el.querySelector<HTMLButtonElement>('.enrich')!;
  const box = el.querySelector<HTMLElement>('.enriched')!;
  btn.addEventListener('click', async () => {
    btn.disabled = true; box.textContent = t('enrich.loading');
    try {
      const e = await fetchEnrichment(f, lang);
      let ai = '';
      if (hasBackend()) {
        try { ai = await generateText(f, lang, e.extract); }
        catch (err) { ai = (err as Error).message === 'rate_limit' ? t('enrich.rate') : ''; }
      }
      if (!e.extract && !ai) { box.textContent = t('enrich.none'); btn.disabled = false; return; }
      box.innerHTML = `${ai ? `<h3>${esc(t('enrich.ai'))}</h3><div class="ai">${md(ai)}</div><small>${esc(t('enrich.ainote'))}</small>` : ''}${e.extract ? `<h3>${esc(t('enrich.about'))}</h3><p><b>${esc(e.title ?? '')}</b></p><p>${esc(e.extract)}</p>${e.pageUrl ? `<a href="${esc(e.pageUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia</a>` : ''}` : ''}
        <small>${esc(t('enrich.note'))}</small>`;
    } catch { box.textContent = t('enrich.error'); btn.disabled = false; }
  });
  el.hidden = false;
  el.scrollTop = 0;
}
