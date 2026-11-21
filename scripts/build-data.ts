import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'data/points';
const features = readdirSync(dir)
  .filter((n) => n.endsWith('.geojson'))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).features);
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/all.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');
console.log(`public/data/all.geojson: ${features.length} точок`);
