import './styles.css';
import type { PointCollection, PointFeature } from './types';
import { createMap } from './map/createMap';
import { addLayers, highlight, onFeatureClick, setData } from './map/layers';
import { renderPanel } from './ui/sidePanel';
import { renderLegend } from './ui/legend';
import { renderToolbar } from './ui/toolbar';
import { defaultFilters, filterFeatures, yearRange } from './filters';
import { formatHash, parseHash } from './state/url';
import { initLang, t } from './i18n';

initLang();
const $ = (id: string) => document.getElementById(id)!;
const initial = parseHash(location.hash);
const map = createMap('map',
  initial.lat !== undefined ? [initial.lng!, initial.lat] : undefined, initial.z);

const state = defaultFilters();
let all: PointFeature[] = [];
let selected: string | null = initial.p ?? null;
let toolbar: ReturnType<typeof renderToolbar>;

function writeHash(): void {
  const c = map.getCenter();
  history.replaceState(null, '', formatHash({ z: map.getZoom(), lat: c.lat, lng: c.lng, p: selected ?? undefined }) || location.pathname);
}

function select(id: string | null, fly = false): void {
  selected = id;
  highlight(map, id);
  const f = all.find((x) => x.properties.id === id);
  if (!f) { $('panel').hidden = true; selected = null; writeHash(); return; }
  renderPanel($('panel'), f, () => select(null));
  if (fly && f.geometry.type === 'Point') map.flyTo({ center: f.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 9) });
  writeHash();
}

function apply(): void {
  const shown = filterFeatures(all, state);
  setData(map, shown);
  toolbar.setCount(shown.length);
}

function buildUi(): void {
  document.title = t('app.title');
  toolbar = renderToolbar({
    el: $('toolbar'), features: all, years: yearRange(all), state,
    onChange: apply, onPick: (f) => select(f.properties.id, true),
    onLang: () => { buildUi(); if (selected) select(selected); },
    onAbout: () => {
      const a = $('about');
      a.innerHTML = `<div class="box"><button class="close">×</button><h2>${t('about.title')}</h2><p>${t('about.text')}</p><small>${t('about.credit')}</small></div>`;
      a.querySelector('.close')!.addEventListener('click', () => (a.hidden = true));
      a.hidden = false;
    },
  });
  renderLegend($('legend'));
  apply();
}

map.on('load', async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}data/all.geojson`);
  all = ((await res.json()) as PointCollection).features;
  addLayers(map);
  buildUi();
  onFeatureClick(map, (id) => select(id));
  map.on('click', (e) => {
    if (!map.queryRenderedFeatures(e.point, { layers: ['points', 'area-fill', 'area-line', 'clusters'] }).length) select(null);
  });
  map.on('moveend', writeHash);
  if (selected) select(selected, !initial.lat);
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });
