import type { Category } from '../types';

export const CATEGORY_COLORS: Record<Category, string> = {
  ufo_sighting: '#4dd2ff',
  energy_anomaly: '#ffd23f',
  place_of_power: '#b36bff',
  magnetic_anomaly: '#ff7a3d',
  crop_circle: '#5be37d',
  ley_line: '#ff5fa2',
  paranormal: '#ff4d4d',
  other: '#9aa5b1',
};
export const CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];
export const DEBUNKED_COLOR = '#6b7280';
