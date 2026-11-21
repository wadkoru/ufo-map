# Бекенд (Cloudflare Worker)

Проксі між сайтом і Claude API. Ключ лежить лише в секретах Worker-а.

```bash
cd backend
npm i -D wrangler @cloudflare/workers-types
npx wrangler login
npx wrangler kv namespace create RATE      # id вставити у wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY  # ввести ключ
npx wrangler deploy                        # покаже URL https://ufo-map-api.<акаунт>.workers.dev
```

Потім у GitHub: Settings → Secrets and variables → Actions → **Variables** → `VITE_API_URL` = URL Worker-а.
Після наступного push сайт підхопить URL; без нього кнопка працює у режимі Вікіпедії.

Захист: перевірка Origin, ліміт 20 запитів/год на IP, обрізання вхідних даних.
