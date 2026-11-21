export interface ViewState { z?: number; lat?: number; lng?: number; p?: string }

export function parseHash(hash: string): ViewState {
  const out: ViewState = {};
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const m = params.get('map')?.split('/').map(Number);
  if (m && m.length === 3 && m.every(Number.isFinite)) [out.z, out.lat, out.lng] = m;
  const p = params.get('p');
  if (p && /^[a-z]{2}-[a-z]{2,4}-\d{4}$/.test(p)) out.p = p;
  return out;
}

export function formatHash(s: ViewState): string {
  const params = new URLSearchParams();
  if (s.z !== undefined && s.lat !== undefined && s.lng !== undefined) {
    params.set('map', `${s.z.toFixed(2)}/${s.lat.toFixed(4)}/${s.lng.toFixed(4)}`);
  }
  if (s.p) params.set('p', s.p);
  const str = params.toString().replace(/%2F/g, '/');
  return str ? `#${str}` : '';
}
