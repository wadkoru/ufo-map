import { t } from '../i18n';
import { CATEGORIES, CATEGORY_COLORS, DEBUNKED_COLOR } from '../map/categories';

export function renderLegend(el: HTMLElement): void {
  el.innerHTML = [
    ...CATEGORIES.map((c) => `<div><i style="background:${CATEGORY_COLORS[c]}"></i>${t('category.' + c)}</div>`),
    `<div><i style="background:${DEBUNKED_COLOR}"></i>${t('status.debunked')}</div>`,
  ].join('');
}
