import type { Category, PointFeature, SourceType } from '../types';
import { getLang, setLang, t } from '../i18n';
import { CATEGORIES } from '../map/categories';
import { countryOf, defaultFilters, type FilterState } from '../filters';
import { createSearch } from './search';

const SOURCE_TYPES: SourceType[] = ['ufologist', 'esoteric', 'eyewitness', 'media', 'measurement'];

interface Opts {
  el: HTMLElement;
  features: PointFeature[];
  years: [number, number];
  state: FilterState;
  onChange: () => void;
  onPick: (f: PointFeature) => void;
  onLang: () => void;
  onAbout: () => void;
}

export function renderToolbar(o: Opts): { setCount(n: number): void } {
  const { el, state } = o;
  const countries = [...new Set(o.features.map((f) => countryOf(f.properties.id)))].sort();
  const sel = (id: string, label: string, opts: [string, string][]) =>
    `<label>${label}<select id="${id}"><option value="">${t('filters.all')}</option>${opts
      .map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>`;
  const [y0, y1] = o.years;

  el.innerHTML = `
    <div class="bar">
      <div class="searchbox"><input id="q" type="search" placeholder="${t('search.placeholder')}" autocomplete="off"><ul id="results"></ul></div>
      <button id="ftoggle">${t('filters.toggle')}</button>
      <button id="lang">${getLang() === 'uk' ? 'EN' : 'UK'}</button>
      <button id="about-btn" title="${t('about.button')}">?</button>
    </div>
    <div class="filters" id="filters">
      ${sel('f-country', t('filters.country'), countries.map((c) => [c, t('country.' + c)]))}
      ${sel('f-category', t('filters.category'), CATEGORIES.map((c) => [c, t('category.' + c)]))}
      ${sel('f-source', t('filters.source_type'), SOURCE_TYPES.map((s) => [s, t('source_type.' + s)]))}
      <label>${t('filters.credibility')}: <b id="cred-v">1</b>
        <input id="f-cred" type="range" min="1" max="5" step="1" value="1"></label>
      <label>${t('time.label')}: <b id="year-v">${y1}</b>
        <input id="f-year" type="range" min="${y0}" max="${y1}" step="1" value="${y1}"></label>
      <small>${t('time.undated')}</small>
      <button id="reset">${t('filters.reset')}</button>
      <div id="count"></div>
    </div>`;

  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const changed = () => o.onChange();
  $('f-country').addEventListener('change', (e) => { state.country = (e.target as HTMLSelectElement).value; changed(); });
  $('f-category').addEventListener('change', (e) => { state.category = (e.target as HTMLSelectElement).value as Category | ''; changed(); });
  $('f-source').addEventListener('change', (e) => { state.sourceType = (e.target as HTMLSelectElement).value as SourceType | ''; changed(); });
  $('f-cred').addEventListener('input', (e) => {
    state.minCredibility = +(e.target as HTMLInputElement).value; $('cred-v').textContent = String(state.minCredibility); changed();
  });
  $('f-year').addEventListener('input', (e) => {
    const v = +(e.target as HTMLInputElement).value;
    state.maxYear = v >= y1 ? null : v; $('year-v').textContent = String(v); changed();
  });
  $('reset').addEventListener('click', () => { Object.assign(state, defaultFilters()); renderToolbar(o); changed(); });
  $('ftoggle').addEventListener('click', () => $('filters').classList.toggle('open'));
  $('lang').addEventListener('click', () => { setLang(getLang() === 'uk' ? 'en' : 'uk'); o.onLang(); });
  $('about-btn').addEventListener('click', o.onAbout);

  // відновити значення після перерисовки
  ($('f-country') as HTMLSelectElement).value = state.country;
  ($('f-category') as HTMLSelectElement).value = state.category;
  ($('f-source') as HTMLSelectElement).value = state.sourceType;
  ($('f-cred') as HTMLInputElement).value = String(state.minCredibility);
  $('cred-v').textContent = String(state.minCredibility);
  ($('f-year') as HTMLInputElement).value = String(state.maxYear ?? y1);
  $('year-v').textContent = String(state.maxYear ?? y1);

  const search = createSearch(o.features);
  const input = $('q') as HTMLInputElement;
  const results = $('results');
  input.value = state.query;
  input.addEventListener('input', () => {
    state.query = input.value;
    const found = search(input.value);
    results.innerHTML = found.map((f, i) =>
      `<li data-i="${i}">${f.properties.title[getLang()].replace(/</g, '&lt;')}<small>${(f.properties.region ?? '').replace(/</g, '&lt;')}</small></li>`).join('');
    results.onclick = (ev) => {
      const li = (ev.target as HTMLElement).closest('li');
      if (!li) return;
      o.onPick(found[+li.dataset.i!]);
      results.innerHTML = '';
    };
  });

  return { setCount: (n) => { $('count').textContent = t('count', { n }); } };
}
