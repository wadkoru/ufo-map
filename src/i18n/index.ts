import uk from './uk.json';
import en from './en.json';
import type { Lang } from '../types';

const dict: Record<Lang, Record<string, string>> = { uk, en };
let lang: Lang = 'uk';

export function initLang(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'uk' || saved === 'en') lang = saved;
    else if (navigator.language.toLowerCase().startsWith('en')) lang = 'en';
  } catch { /* ignore */ }
  document.documentElement.lang = lang;
  return lang;
}
export const getLang = (): Lang => lang;
export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('lang', l); } catch { /* ignore */ }
}
export function t(key: string, vars: Record<string, string | number> = {}): string {
  let s = dict[lang][key] ?? dict.uk[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
