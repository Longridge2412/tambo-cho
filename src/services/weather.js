/**
 * 6日間の天気予報を Open-Meteo から取得
 *   - 西会津の田の座標を使用
 *   - daily の weathercode + 最高/最低気温
 *   - WMO weather code を簡易タイプにマッピング
 */

import { PADDY_LAT, PADDY_LON } from './phenology.js';

let _cache = null;
let _cacheAt = 0;
const TTL_MS = 30 * 60 * 1000;  // 30分

/** WMO weather code → 簡易タイプ */
export function weatherType(code) {
  if (code == null) return 'unknown';
  if (code === 0) return 'sunny';
  if (code <= 3)  return 'partly';
  if (code <= 48) return 'cloudy';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'shower';
  if (code <= 86) return 'snow';
  return 'thunder';
}

export async function fetchForecast() {
  const now = Date.now();
  if (_cache && (now - _cacheAt) < TTL_MS) return _cache;

  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${PADDY_LAT}&longitude=${PADDY_LON}`
    + `&daily=weathercode,temperature_2m_max,temperature_2m_min`
    + `&timezone=Asia%2FTokyo&forecast_days=7`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const days = j.daily.time.map((d, i) => ({
      date: d,
      weathercode: j.daily.weathercode[i],
      type: weatherType(j.daily.weathercode[i]),
      tmax: j.daily.temperature_2m_max[i],
      tmin: j.daily.temperature_2m_min[i]
    }));
    _cache = days;
    _cacheAt = now;
    return days;
  } catch (e) {
    console.warn('weather fetch failed:', e.message);
    return null;
  }
}
