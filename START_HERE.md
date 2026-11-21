# Як почати (5 хвилин)

## 1. Що потрібно встановити
- **Node.js 20+** — https://nodejs.org
- **Git** — https://git-scm.com
- **VS Code** + розширення **Claude Code**
- Акаунт **GitHub**

## 2. Відкрити проєкт
1. Розпакуйте цей архів, наприклад у `Documents/ufo-map`.
2. У VS Code: **File → Open Folder** → оберіть папку `ufo-map`.
3. Відкрийте панель Claude Code.

## 3. Перший промпт (скопіюйте як є)

```
Прочитай CLAUDE.md, docs/PLAN.md і docs/PROMPTS.md. Нічого не змінюй у data/ і schema/.
Виконай Етап 1 з docs/PROMPTS.md: створи Vite + TypeScript проєкт у цій папці
(не в підпапці), структуру з плану, встанови залежності, налаштуй base для GitHub Pages
і скрипти в package.json. Потім ініціалізуй git і зроби перший коміт.
Наприкінці скажи, як перевірити результат.
```

Далі йдіть по `docs/PROMPTS.md`: Етап 2, 3, 4… Після кожного етапу:
`npm run dev` → подивитися в браузері → якщо все добре, переходити до наступного.

> Порада: перед великим етапом натисніть **Shift+Tab** (Plan mode) — Claude спершу покаже план, а код писатиме після вашого «так».

## 4. Онлайн на GitHub (Етап 8)
1. На github.com створіть **публічний** репозиторій `ufo-map` (без README).
2. Скажіть Claude Code: «Підключи репозиторій https://github.com/<ваш-логін>/ufo-map.git і запуш».
3. На GitHub: **Settings → Pages → Source: GitHub Actions**.
4. Через 1–2 хв карта буде тут: `https://<ваш-логін>.github.io/ufo-map/`

## Що в архіві
| Файл / папка | Що це |
| --- | --- |
| `CLAUDE.md` | Правила проєкту — Claude Code читає їх автоматично |
| `docs/PLAN.md` | Технічний план |
| `docs/PROMPTS.md` | Готові промпти для 10 етапів |
| `data/points/ua.geojson` | 30 точок в Україні (з джерелами) |
| `data/points/nl.geojson` | 15 точок у Нідерландах |
| `schema/point.schema.json` | Схема точки (обидва файли її проходять) |
| `public/data/all.geojson` | Усі точки в одному файлі (для карти) |
| `preview.html` | Карта-прев'ю: відкрийте подвійним кліком уже зараз |
| `tools/seed/` | Python-скрипт, з якого зібрано стартові дані |
