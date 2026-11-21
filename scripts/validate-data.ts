import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'data/points';
const schema = JSON.parse(readFileSync('schema/point.schema.json', 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

let errors = 0;
let total = 0;
const seen = new Map<string, string>();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.geojson'))) {
  const data = JSON.parse(readFileSync(join(dir, f), "utf8")) as { features: { properties: { id: string } }[] };
  if (!validate(data as unknown)) {
    errors++;
    console.error(`✗ ${f}`, JSON.stringify(validate.errors, null, 2));
    continue;
  }
  for (const ft of data.features) {
    total++;
    const id = ft.properties.id;
    if (seen.has(id)) { errors++; console.error(`✗ дублікат id ${id} (${seen.get(id)}, ${f})`); }
    seen.set(id, f);
  }
  console.log(`✓ ${f}: ${data.features.length}`);
}
if (errors) { console.error(`Помилок: ${errors}`); process.exit(1); }
console.log(`Усі ${total} точок валідні.`);
