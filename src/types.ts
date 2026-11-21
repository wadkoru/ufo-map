// Типи відповідають schema/point.schema.json
export type Category =
  | 'ufo_sighting' | 'energy_anomaly' | 'place_of_power' | 'magnetic_anomaly'
  | 'crop_circle' | 'ley_line' | 'paranormal' | 'other';
export type SourceType = 'ufologist' | 'esoteric' | 'eyewitness' | 'media' | 'measurement';
export type Status = 'published' | 'disputed' | 'debunked';
export type Lang = 'uk' | 'en';
export interface I18n { uk: string; en: string }
export type Position = [number, number] | [number, number, number];

export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'Polygon'; coordinates: Position[][] };

export interface PointProperties {
  id: string;
  title: I18n;
  description: I18n;
  category: Category;
  observed_at?: string | null;
  added_at: string;
  source_type: SourceType;
  sources: string[];
  credibility: 1 | 2 | 3 | 4 | 5;
  precision_m: number;
  reporter?: string;
  region?: string;
  tags?: string[];
  media?: string[];
  status: Status;
  safety_note?: string;
}

export interface PointFeature { type: 'Feature'; geometry: Geometry; properties: PointProperties }
export interface PointCollection { type: 'FeatureCollection'; features: PointFeature[] }
