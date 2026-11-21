import { Map as MlMap, NavigationControl, AttributionControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Два провайдери: перемкнути можна одним рядком.
const STYLES = {
  carto: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  openfreemap: 'https://tiles.openfreemap.org/styles/positron',
};
const STYLE = STYLES.carto;

export function createMap(container: string, center: [number, number] = [18, 49.5], zoom = 4.3): MlMap {
  const map = new MlMap({
    container, style: STYLE, center, zoom, minZoom: 2, attributionControl: false,
  });
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new AttributionControl({
    compact: true,
    customAttribution: '© OpenStreetMap contributors © CARTO',
  }));
  return map;
}
