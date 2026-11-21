// Cloudflare Worker: приймає id/дані точки, просить Claude написати опис/легенду/контекст.
// Ключ ANTHROPIC_API_KEY живе лише тут (wrangler secret), у браузер не потрапляє.

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;       // напр. https://wadkoru.github.io
  MODEL: string;                // напр. claude-haiku-5-5
  RATE: KVNamespace;            // прості ліміти запитів на IP
}

interface Body {
  lang: 'uk' | 'en';
  title: string; region?: string; category: string; observed_at?: string | null;
  description: string; sources: string[]; extra?: string;
}

const MAX_PER_HOUR = 20;

const cors = (env: Env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
});

const json = (env: Env, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(env) } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (req.method !== 'POST') return json(env, { error: 'method' }, 405);
    if (req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return json(env, { error: 'origin' }, 403);

    const ip = req.headers.get('CF-Connecting-IP') ?? 'x';
    const key = `r:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const n = Number((await env.RATE.get(key)) ?? 0);
    if (n >= MAX_PER_HOUR) return json(env, { error: 'rate_limit' }, 429);
    await env.RATE.put(key, String(n + 1), { expirationTtl: 3600 });

    let b: Body;
    try { b = (await req.json()) as Body; } catch { return json(env, { error: 'bad_json' }, 400); }
    if (!b.title || !b.description || (b.lang !== 'uk' && b.lang !== 'en')) return json(env, { error: 'bad_input' }, 400);
    const clip = (s: string | undefined, n: number) => (s ?? '').slice(0, n);

    const langName = b.lang === 'uk' ? 'українською' : 'in English';
    const prompt = `Ти редактор довідкової вебкарти аномальних місць. Напиши ${langName} розгорнутий опис місця на основі ЛИШЕ наданих фактів.
Структура (markdown, без вступів): 1) «Опис» — 2–3 речення; 2) «Легенда / історія» — що розповідають про місце (познач, що це легенди чи свідчення, а не факти); 3) «Що відомо науці» — приземлені пояснення, якщо вони є у фактах; 4) «Як ставитися» — 1 речення про достовірність і безпеку.
Не вигадуй дат, імен, цифр і подій, яких немає в даних. Якщо даних мало — скажи про це. Не називай приватних осіб.

Назва: ${clip(b.title, 200)}
Регіон: ${clip(b.region, 200)}
Категорія: ${clip(b.category, 50)}
Дата спостереження: ${clip(b.observed_at ?? '', 20) || 'невідомо'}
Дані: ${clip(b.description, 2000)}
Додатковий контекст (Вікіпедія): ${clip(b.extra, 2500)}
Джерела: ${b.sources.slice(0, 5).map((s) => clip(s, 200)).join(', ')}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL, max_tokens: 900, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return json(env, { error: 'upstream', status: r.status }, 502);
    const data = (await r.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
    return json(env, { text });
  },
};
