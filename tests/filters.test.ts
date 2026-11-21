import { describe, expect, it } from 'vitest';
import { defaultFilters, matches, observedYear } from '../src/filters';
import { formatHash, parseHash } from '../src/state/url';
import type { PointProperties } from '../src/types';

const base: PointProperties = {
  id: 'ua-zht-0001', title: { uk: 'a', en: 'a' }, description: { uk: 'a', en: 'a' },
  category: 'ufo_sighting', observed_at: '1990-05', added_at: '2026-11-21', source_type: 'eyewitness',
  sources: ['https://x.y'], credibility: 3, precision_m: 100, status: 'published',
};

describe('filters', () => {
  it('за замовчуванням пропускає все', () => expect(matches(base, defaultFilters())).toBe(true));
  it('країна за префіксом id', () => {
    expect(matches(base, { ...defaultFilters(), country: 'nl' })).toBe(false);
    expect(matches(base, { ...defaultFilters(), country: 'ua' })).toBe(true);
  });
  it('категорія, достовірність, тип джерела', () => {
    expect(matches(base, { ...defaultFilters(), category: 'paranormal' })).toBe(false);
    expect(matches(base, { ...defaultFilters(), minCredibility: 4 })).toBe(false);
    expect(matches(base, { ...defaultFilters(), sourceType: 'media' })).toBe(false);
  });
  it('повзунок часу; без дати — завжди', () => {
    expect(matches(base, { ...defaultFilters(), maxYear: 1980 })).toBe(false);
    expect(matches(base, { ...defaultFilters(), maxYear: 1990 })).toBe(true);
    expect(matches({ ...base, observed_at: null }, { ...defaultFilters(), maxYear: 1000 })).toBe(true);
  });
  it('observedYear', () => {
    expect(observedYear('2001-02-03')).toBe(2001);
    expect(observedYear(null)).toBeNull();
  });
});

describe('url hash', () => {
  it('туди й назад', () => {
    const h = formatHash({ z: 5, lat: 50.45, lng: 30.52, p: 'ua-zht-0001' });
    expect(parseHash(h)).toEqual({ z: 5, lat: 50.45, lng: 30.52, p: 'ua-zht-0001' });
  });
  it('ігнорує сміття', () => expect(parseHash('#p=<script>&map=a/b/c')).toEqual({}));
});
