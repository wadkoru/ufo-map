import type { Category, PointFeature, PointProperties, SourceType } from './types';

export interface FilterState {
  country: string;            // '' = усі
  category: Category | '';
  minCredibility: number;     // 1..5
  sourceType: SourceType | '';
  maxYear: number | null;     // null = без обмеження
  query: string;
}
export const defaultFilters = (): FilterState => ({
  country: '', category: '', minCredibility: 1, sourceType: '', maxYear: null, query: '',
});

export const countryOf = (id: string): string => id.slice(0, 2);

export function observedYear(observedAt: string | null | undefined): number | null {
  if (!observedAt) return null;
  const y = Number(observedAt.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

export function matches(p: PointProperties, f: FilterState): boolean {
  if (f.country && countryOf(p.id) !== f.country) return false;
  if (f.category && p.category !== f.category) return false;
  if (p.credibility < f.minCredibility) return false;
  if (f.sourceType && p.source_type !== f.sourceType) return false;
  if (f.maxYear !== null) {
    const y = observedYear(p.observed_at);
    if (y !== null && y > f.maxYear) return false; // без дати — показуємо завжди
  }
  return true;
}

export function filterFeatures(features: PointFeature[], f: FilterState, ids?: Set<string> | null): PointFeature[] {
  return features.filter((ft) => matches(ft.properties, f) && (!ids || ids.has(ft.properties.id)));
}

export function yearRange(features: PointFeature[]): [number, number] {
  const ys = features.map((f) => observedYear(f.properties.observed_at)).filter((y): y is number => y !== null);
  const now = new Date().getFullYear();
  return [ys.length ? Math.min(...ys) : now - 100, now];
}
