/**
 * 積算温度(GDD)と出穂見込みの計算
 *
 * - 過去気温: Open-Meteo Archive API
 * - 直近〜16日先: Open-Meteo Forecast API
 * - それ以遠: 西会津アメダス30年平年値(同梱データ)
 *
 * 全員が同じ計算式・同じデータを使うので、誰が見ても同じ数字になる。
 */

import { AIZU_NORMALS } from '../data/aizu_normals.js';

// 西会津 田んぼ位置(上野尻沢入)
export const PADDY_LAT = 37.620032;
export const PADDY_LON = 139.628529;

// GDD 基準温度・目標値
//   コシヒカリ目安。出穂→刈取りは文献の1,025°C・日。
//   田植え→出穂は地域経験値で 1,100°C・日 を仮置き(品種・気候で変動大)。
export const GDD_PRESETS = {
  transplant_to_heading: { base: 10, target: 1100 },
  heading_to_harvest:    { base: 0,  target: 1025 }
};

// ──────────────────────────────────────
// 日付ユーティリティ
// ──────────────────────────────────────

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseYmd(s) {
  return new Date(s + 'T00:00:00');
}
function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function mdKey(s) { return s.slice(5); }  // 'YYYY-MM-DD' -> 'MM-DD'

// ──────────────────────────────────────
// Open-Meteo 取得 (in-memory cache)
// ──────────────────────────────────────

let _seriesCache = null;
let _seriesCacheAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;  // 1時間

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 過去〜+16日の日別気温を取得し、'YYYY-MM-DD' -> {tmax, tmin, source} で返す。
 */
async function fetchObservedSeries(startYmd) {
  const now = Date.now();
  if (_seriesCache && (now - _seriesCacheAt) < CACHE_TTL_MS) return _seriesCache;

  const today = ymd(new Date());
  const archiveEnd = addDays(today, -2);  // archive は ~2日遅延
  const result = {};

  // 過去(archive)
  if (startYmd <= archiveEnd) {
    try {
      const url = `https://archive-api.open-meteo.com/v1/archive`
        + `?latitude=${PADDY_LAT}&longitude=${PADDY_LON}`
        + `&start_date=${startYmd}&end_date=${archiveEnd}`
        + `&daily=temperature_2m_max,temperature_2m_min`
        + `&timezone=Asia%2FTokyo`;
      const j = await fetchJson(url);
      const days = j.daily && j.daily.time || [];
      for (let i = 0; i < days.length; i++) {
        const tmax = j.daily.temperature_2m_max[i];
        const tmin = j.daily.temperature_2m_min[i];
        if (tmax == null || tmin == null) continue;
        result[days[i]] = { tmax, tmin, source: 'archive' };
      }
    } catch (e) {
      console.warn('archive fetch failed:', e.message);
    }
  }

  // 直近+forecast(past_days=14 を重ねて archive のラグを埋める)
  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${PADDY_LAT}&longitude=${PADDY_LON}`
      + `&daily=temperature_2m_max,temperature_2m_min`
      + `&timezone=Asia%2FTokyo&past_days=14&forecast_days=16`;
    const j = await fetchJson(url);
    const days = j.daily && j.daily.time || [];
    for (let i = 0; i < days.length; i++) {
      const tmax = j.daily.temperature_2m_max[i];
      const tmin = j.daily.temperature_2m_min[i];
      if (tmax == null || tmin == null) continue;
      // forecast は archive より新しいので上書き
      result[days[i]] = { tmax, tmin, source: 'forecast' };
    }
  } catch (e) {
    console.warn('forecast fetch failed:', e.message);
  }

  _seriesCache = result;
  _seriesCacheAt = now;
  return result;
}

/**
 * 任意の日の気温を返す。観測/予報 > 平年値 の優先順。
 */
function tempOnDate(date, observed) {
  if (observed[date]) return observed[date];
  const n = AIZU_NORMALS[mdKey(date)];
  if (n && n.tmax != null && n.tmin != null) return { tmax: n.tmax, tmin: n.tmin, source: 'normal' };
  return null;
}

// ──────────────────────────────────────
// 計算API
// ──────────────────────────────────────

/**
 * 田植え日から今日までの実積算GDDを返す。
 */
export async function currentGdd(transplantYmd, base) {
  const observed = await fetchObservedSeries(transplantYmd);
  const today = ymd(new Date());
  let cum = 0;
  let days = 0;
  let cur = transplantYmd;
  while (cur <= today) {
    const r = observed[cur];
    if (r) {
      const avg = (r.tmax + r.tmin) / 2;
      cum += Math.max(0, avg - base);
      days++;
    }
    cur = addDays(cur, 1);
  }
  return { gdd: Math.round(cum), days };
}

/**
 * 開始日から base/target で出穂(または刈取り)見込み日を予測。
 * 観測/予報がない日は平年値で補完。
 */
export async function predictTargetDate(startYmd, base, target) {
  const observed = await fetchObservedSeries(startYmd);
  let cum = 0;
  let cur = startYmd;
  for (let i = 0; i < 200; i++) {
    const r = tempOnDate(cur, observed);
    if (r) {
      const avg = (r.tmax + r.tmin) / 2;
      cum += Math.max(0, avg - base);
      if (cum >= target) return { predicted: cur, days: i + 1, gddAchieved: Math.round(cum) };
    }
    cur = addDays(cur, 1);
  }
  return null;
}

/**
 * 田植え日(必須) + 出穂日(任意) から、現在表示すべきフェーズと進捗を返す。
 * 出穂日が空: 田植え→出穂フェーズ
 * 出穂日あり: 出穂→刈取りフェーズ
 */
export async function getPaddyProgress(transplantYmd, headingYmd) {
  if (!transplantYmd) return null;

  if (!headingYmd) {
    const p = GDD_PRESETS.transplant_to_heading;
    const cur = await currentGdd(transplantYmd, p.base);
    const pred = await predictTargetDate(transplantYmd, p.base, p.target);
    return {
      phase: 'transplant_to_heading',
      phase_label: '田植え→出穂',
      base: p.base,
      target: p.target,
      gdd: cur.gdd,
      days: cur.days,
      predicted_date: pred ? pred.predicted : null,
      pct: Math.min(100, Math.round(cur.gdd / p.target * 100))
    };
  } else {
    const p = GDD_PRESETS.heading_to_harvest;
    const cur = await currentGdd(headingYmd, p.base);
    const pred = await predictTargetDate(headingYmd, p.base, p.target);
    return {
      phase: 'heading_to_harvest',
      phase_label: '出穂→刈取り',
      base: p.base,
      target: p.target,
      gdd: cur.gdd,
      days: cur.days,
      predicted_date: pred ? pred.predicted : null,
      pct: Math.min(100, Math.round(cur.gdd / p.target * 100))
    };
  }
}
