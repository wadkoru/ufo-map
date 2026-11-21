import Fuse from 'fuse.js';
import type { PointFeature } from '../types';
import { getLang } from '../i18n';

export function createSearch(features: PointFeature[]) {
  const lang = getLang();
  const fuse = new Fuse(features, {
    keys: [`properties.title.${lang}`, 'properties.region', 'properties.tags'],
    threshold: 0.35, ignoreLocation: true,
  });
  return (q: string): PointFeature[] => (q.trim() ? fuse.search(q.trim(), { limit: 8 }).map((r) => r.item) : []);
}
