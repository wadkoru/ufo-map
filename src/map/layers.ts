import type {} from 'geojson';
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap, MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
import type { PointFeature } from '../types';
import { CATEGORY_COLORS, DEBUNKED_COLOR } from './categories';

const colorExpr = [
  'case', ['==', ['get', 'status'], 'debunked'], DEBUNKED_COLOR,
  ['match', ['get', 'category'], ...Object.entries(CATEGORY_COLORS).flatMap(([k, v]) => [k, v]), '#9aa5b1'],
] as unknown as ExpressionSpecification;

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
export const POINT_LAYER = 'points';

/** Додає службову властивість _r0 (радіус кола у «пікселях на zoom 0») для precision_m ≥ 500. */
function prepare(features: PointFeature[]) {
  return features.map((f) => {
    const { id, category, status } = f.properties;
    const props: Record<string, unknown> = { id, category, status };
    if (f.geometry.type === 'Point' && f.properties.precision_m >= 500) {
      const lat = f.geometry.coordinates[1];
      props._r0 = f.properties.precision_m / (78271.484 * Math.cos((lat * Math.PI) / 180));
    }
    return { type: 'Feature' as const, geometry: f.geometry, properties: props };
  });
}

export function addLayers(map: MlMap): void {
  map.addSource('areas', { type: 'geojson', data: EMPTY });
  map.addSource('pts', { type: 'geojson', data: EMPTY, cluster: true, clusterRadius: 45, clusterMaxZoom: 11 });

  map.addLayer({ id: 'area-fill', type: 'fill', source: 'areas', filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': colorExpr, 'fill-opacity': 0.2 } });
  map.addLayer({ id: 'area-line', type: 'line', source: 'areas',
    paint: { 'line-color': colorExpr, 'line-width': 2, 'line-dasharray': [2, 1] } });

  map.addLayer({ id: 'precision', type: 'circle', source: 'pts',
    filter: ['all', ['!', ['has', 'point_count']], ['has', '_r0']],
    paint: {
      'circle-color': colorExpr, 'circle-opacity': 0.12,
      'circle-stroke-color': colorExpr, 'circle-stroke-opacity': 0.5, 'circle-stroke-width': 1,
      'circle-pitch-alignment': 'map',
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'],
        0, ['get', '_r0'], 22, ['*', ['get', '_r0'], 4194304]],
    } });
  map.addLayer({ id: 'clusters', type: 'circle', source: 'pts', filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#2b3445', 'circle-stroke-color': '#8fb3ff', 'circle-stroke-width': 2,
      'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
    } });
  map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'pts', filter: ['has', 'point_count'],
    layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 13, 'text-font': ['Montserrat Medium'] },
    paint: { 'text-color': '#fff' } });
  map.addLayer({ id: POINT_LAYER, type: 'circle', source: 'pts', filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': colorExpr, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 12, 9],
      'circle-stroke-color': '#0b0f17', 'circle-stroke-width': 1.5,
    } });
  map.addLayer({ id: 'selected', type: 'circle', source: 'pts', filter: ['==', ['get', 'id'], ''],
    paint: { 'circle-radius': 14, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });

  map.on('click', 'clusters', async (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
    if (!f) return;
    const src = map.getSource('pts') as GeoJSONSource;
    const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id);
    map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
  });
  for (const l of ['clusters', POINT_LAYER]) {
    map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
  }
}

export function setData(map: MlMap, features: PointFeature[]): void {
  const prepared = prepare(features);
  const isPoint = (g: { type: string }) => g.type === 'Point';
  (map.getSource('pts') as GeoJSONSource).setData({
    type: 'FeatureCollection', features: prepared.filter((f) => isPoint(f.geometry)) } as GeoJSON.FeatureCollection);
  (map.getSource('areas') as GeoJSONSource).setData({
    type: 'FeatureCollection', features: prepared.filter((f) => !isPoint(f.geometry)) } as GeoJSON.FeatureCollection);
}

export function highlight(map: MlMap, id: string | null): void {
  map.setFilter('selected', ['==', ['get', 'id'], id ?? '']);
}

export function onFeatureClick(map: MlMap, cb: (id: string) => void): void {
  const handler = (e: MapLayerMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const id = e.features?.[0]?.properties?.id;
    if (id) cb(id);
  };
  for (const l of [POINT_LAYER, 'area-fill', 'area-line']) map.on('click', l, handler);
}
