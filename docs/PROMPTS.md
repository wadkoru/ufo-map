# Промпти для Claude Code

Один етап — одна сесія і один коміт. Після кожного: `npm run dev`, перевірити в браузері, потім наступний.
Перед великим етапом вмикайте Plan mode (Shift+Tab).

---

## Етап 1. Каркас проєкту
```
Прочитай CLAUDE.md, docs/PLAN.md і docs/PROMPTS.md. Нічого не змінюй у data/ і schema/.
Створи Vite + TypeScript (strict) проєкт прямо в цій папці, структуру папок із розділу
«Структура репозиторію» в docs/PLAN.md, встанови maplibre-gl, налаштуй base: '/ufo-map/'
у vite.config.ts і скрипти в package.json: dev, build, preview, test, validate, build:data.
Додай .gitignore для Node. Ініціалізуй git і зроби перший коміт.
```
Перевірка: `npm run dev` відкриває сторінку без помилок у консолі.

## Етап 2. Карта
```
Додай повноекранну темну карту MapLibre з безкоштовною підкладкою без ключа
(OpenFreeMap або CARTO Dark Matter), стартовий вид — Європа з Україною та Нідерландами,
атрибуція OSM. Код у src/map/createMap.ts.
```

## Етап 3. Типи, валідація, збірка даних
```
Дані вже є: data/points/ua.geojson і nl.geojson, схема schema/point.schema.json.
НЕ змінюй і не доповнюй точки. Зроби:
1) src/types.ts — типи, що точно відповідають схемі;
2) scripts/validate-data.ts — ajv-перевірка всіх data/points/*.geojson за схемою + перевірка дублікатів id;
3) scripts/build-data.ts — склеює їх у public/data/all.geojson;
4) npm run validate і npm run build:data; build:data запускається перед build.
```
Перевірка: `npm run validate` → усі 45 точок валідні.

## Етап 4. Шари на карті
```
Виведи точки з public/data/all.geojson: колір за category (src/map/categories.ts),
кластеризація при віддаленні, коло невизначеності радіусом precision_m (якщо ≥ 500 м),
status=debunked — сірим, підтримка LineString і Polygon. Додай легенду (src/ui/legend.ts).
```

## Етап 5. Картка точки і посилання
```
Клік по точці відкриває бокову панель (на екрані < 700px — нижню) з усіма полями:
назва, категорія, регіон, дата, опис, достовірність X/5 з підписом, точність, джерела-посилання,
статус. Якщо є safety_note — червона плашка вгорі картки.
Стан карти й обрана точка пишуться в URL hash (src/state/url.ts) і відновлюються при відкритті.
```

## Етап 6. Фільтри, повзунок часу, пошук
```
Додай фільтри за країною (за префіксом id), category, credibility, source_type; повзунок дати
за observed_at (точки без дати показуються завжди); пошук Fuse.js за назвою й регіоном.
Фільтрація через setFilter MapLibre. Напиши Vitest-тести логіки фільтрів.
```

## Етап 7. Мови і дисклеймер
```
Перемикач uk/en (тексти в src/i18n), назви й описи точок — з title/description.{uk,en}.
Вікно «Про проєкт» з дисклеймером із розділу «Ризики і правила» docs/PLAN.md.
```

## Етап 8. Онлайн на GitHub Pages
```
Створи .github/workflows/validate.yml (на PR: npm ci → validate → test → build)
і deploy.yml (на push у main: build → upload-pages-artifact → deploy-pages).
Потім підключи remote https://github.com/<ЛОГІН>/ufo-map.git і запуш.
```
Вручну: на GitHub **Settings → Pages → Source: GitHub Actions**. Сайт: `https://<ЛОГІН>.github.io/ufo-map/`.
Після цього `preview.html` можна видалити.

## Етап 9. Форма для інших людей (пізніше, коли вирішите)
```
Створи Issue Form .github/ISSUE_TEMPLATE/new-point.yml (поля з docs/PLAN.md),
скрипт scripts/issue-to-point.ts і workflow issue-to-pr.yml: лейбл approved на issue →
гілка point/<id> → PR. Кнопка «Додати точку тут» на карті відкриває форму з координатами кліку.
```

## Етап 10. Полірування
```
Перевір сайт на мобільному (360px), Lighthouse, доступність (фокус, контраст, клавіатура),
додай Playwright smoke-тест і README з описом проєкту.
```

---

## Корисні промпти між етапами
- Додати точку: «Додай у data/points/ua.geojson точку: <назва>, <координати>, <опис>, джерело <url>. Перевір validate.»
- Щось зламалось: «npm run dev показує помилку: <текст>. Знайди причину й виправ, не чіпаючи data/.»
- Перевірити все: «Запусти validate, test і build і виправ усе, що падає.»
