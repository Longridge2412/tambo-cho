/**
 * 6日間の天気予報を横並びで表示
 *   今日 + 5日先 まで(7日)
 *   今日を強調(濃い字)
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { fetchForecast } from '../services/weather.js';

const ICONS = {
  sunny: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.5" y1="4.5" x2="6.5" y2="6.5"/>
      <line x1="17.5" y1="17.5" x2="19.5" y2="19.5"/>
      <line x1="4.5" y1="19.5" x2="6.5" y2="17.5"/>
      <line x1="17.5" y1="6.5" x2="19.5" y2="4.5"/>
    </svg>
  `,
  partly: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="10" r="3"/>
      <line x1="8" y1="3" x2="8" y2="5"/>
      <line x1="2" y1="10" x2="3" y2="10"/>
      <line x1="3.5" y1="5.5" x2="4.5" y2="6.5"/>
      <path d="M9 17 a4 4 0 0 1 4 -4 a3 3 0 0 1 6 0 a3 3 0 0 1 0 6 H9 a3 3 0 0 1 0 -2 z"/>
    </svg>
  `,
  cloudy: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17 a4 4 0 0 1 4 -4 a4 4 0 0 1 7 0 a3 3 0 0 1 0 6 H5 a3 3 0 0 1 0 -2 z"/>
    </svg>
  `,
  rain: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 14 a4 4 0 0 1 4 -4 a4 4 0 0 1 7 0 a3 3 0 0 1 0 6 H5 a3 3 0 0 1 0 -2 z"/>
      <line x1="8" y1="19" x2="7" y2="22"/>
      <line x1="12" y1="19" x2="11" y2="22"/>
      <line x1="16" y1="19" x2="15" y2="22"/>
    </svg>
  `,
  shower: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12 a4 4 0 0 1 4 -4 a4 4 0 0 1 7 0 a3 3 0 0 1 0 6 H5 a3 3 0 0 1 0 -2 z"/>
      <line x1="7" y1="17" x2="6" y2="22"/>
      <line x1="11" y1="17" x2="10" y2="22"/>
      <line x1="15" y1="17" x2="14" y2="22"/>
      <line x1="19" y1="17" x2="18" y2="22"/>
    </svg>
  `,
  snow: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12 a4 4 0 0 1 4 -4 a4 4 0 0 1 7 0 a3 3 0 0 1 0 6 H5 a3 3 0 0 1 0 -2 z"/>
      <line x1="8" y1="19" x2="8" y2="21"/>
      <line x1="12" y1="19" x2="12" y2="21"/>
      <line x1="16" y1="19" x2="16" y2="21"/>
    </svg>
  `,
  thunder: html`
    <svg viewBox="0 0 24 24" class="wx-svg" fill="none"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12 a4 4 0 0 1 4 -4 a4 4 0 0 1 7 0 a3 3 0 0 1 0 6 H5 a3 3 0 0 1 0 -2 z"/>
      <polyline points="11 17 9 20 13 20 11 23"/>
    </svg>
  `,
  unknown: html`<svg viewBox="0 0 24 24" class="wx-svg"></svg>`
};

export function WeatherRow() {
  const [days, setDays] = useState(null);
  useEffect(() => {
    fetchForecast().then(setDays).catch(() => setDays(null));
  }, []);

  if (!days) {
    return html`<div class="wx-row wx-row-loading">天気データ読み込み中…</div>`;
  }

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  // 7日(今日 + 6日先)
  const showDays = days.slice(0, 7);

  return html`
    <div class="wx-row">
      ${showDays.map(day => {
        const d = new Date(day.date + 'T00:00:00');
        const isToday = day.date === todayKey;
        return html`
          <div class=${`wx-cell ${isToday ? 'today' : ''}`} key=${day.date}>
            <div class="wx-day">${d.getDate()}</div>
            <div class="wx-icon">${ICONS[day.type] || ICONS.unknown}</div>
          </div>
        `;
      })}
    </div>
  `;
}
