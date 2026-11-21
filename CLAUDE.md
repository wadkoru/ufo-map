# UFO Map

Статична вебкарта точок аномальної енергії, НЛО та місць сили в стилі DeepStateMap
(темна карта, кольорові маркери, бокова панель, повзунок часу).
Хостинг — GitHub Pages, без бекенду. Мова інтерфейсу: українська (за замовчуванням) + англійська.

Повний технічний план: `docs/PLAN.md`. Покрокові промпти: `docs/PROMPTS.md`.

## Стек
- Vite + TypeScript (strict), vanilla TS (Preact — лише якщо UI справді ускладниться)
- MapLibre GL JS, безкоштовна підкладка без ключа: OpenFreeMap або CARTO Dark Matter; атрибуція OSM обов'язкова
- Fuse.js (пошук), Vitest (тести), ajv (валідація даних)
- GitHub Actions → GitHub Pages, `base: '/ufo-map/'` у `vite.config.ts`

## Дані — головне правило
- Джерело правди: `data/points/*.geojson` (зараз `ua.geojson` — 30 точок, `nl.geojson` — 15).
- Схема: `schema/point.schema.json`. Типи в `src/types.ts` мають їй відповідати.
- `public/data/all.geojson` — згенерований файл (скрипт `build:data`), руками не редагувати.
- НЕ видаляй і НЕ переписуй наявні точки, не вигадуй нові. Нові точки — лише коли автор попросить, з реальним джерелом. Автоматичний збір: `tools/harvest/build_harvest.py` (Вікіпедія) → `data/points/nl-hunebedden.geojson`, `ua-wikipedia.geojson`; світові точки (Wikidata+Вікіпедія) — `tools/harvest/harvest_world.py` → `data/points/world.geojson`.
- id: `<країна>-<регіон>-<номер>`, напр. `ua-zht-0001`. Дублікати id заборонені.
- `precision_m` ≥ 500 → на карті малюється коло невизначеності. `status: debunked` → сірий маркер.
- `safety_note` (окуповані/небезпечні місця) → червона плашка в картці точки.

## Етап 1 (зараз)
- Точки додає лише автор. Форму GitHub Issue для сторонніх поки НЕ вмикаємо (є в плані на потім).
- `preview.html` — тимчасове прев'ю на Leaflet; після того як запрацює основна карта, його можна видалити.

## Правила коду
- Жодних API-ключів у фронтенді й трекерів. Єдиний виняток — бекенд `backend/` (Cloudflare Worker) із ключем Anthropic у секретах Worker-а; фронтенд знає лише `VITE_API_URL`.
- Маршрутизація через `#hash` (GitHub Pages не має SPA-rewrite).
- Усі тексти інтерфейсу — через `src/i18n/{uk,en}.json`.
- Мобільна версія обов'язкова: на вузькому екрані бокова панель стає нижньою.
- Перед кожним комітом: `npm run validate && npm test && npm run build`.
- Працюємо етапами з `docs/PROMPTS.md`; один етап — один коміт.

## Команди (після етапу 1)
npm run dev | build | preview | test | validate | build:data
