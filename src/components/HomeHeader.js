/**
 * ホーム専用ヘッダ(ロゴ・格言・大型日付)
 *
 *   左上に NEO百姓 ロゴ
 *   右上に今日の格言
 *   下に大型ミンチョ体の日付(5/31 形式)+時刻+曜日
 */

const { createElement: h } = React;
const html = htm.bind(h);

import { quoteForToday } from '../data/quotes.js';

const DOW = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];

export function HomeHeader() {
  const now = new Date();
  const q = quoteForToday(now);
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dow = DOW[now.getDay()];

  return html`
    <header class="home-header">
      <div class="hh-top">
        <img class="hh-logo" src="./assets/logo/neo-hyaku-h.png" alt="NEO百姓"/>
        <div class="hh-quote">
          <div class="hh-quote-title">今日の格言</div>
          <div class="hh-quote-text">「${q.text}」</div>
        </div>
      </div>
      <div class="hh-date-row">
        <div class="hh-date-major"><span class="hh-date-month">${m}</span><span class="hh-date-slash">/</span><span class="hh-date-day">${d}</span></div>
        <div class="hh-date-side">
          <div class="hh-date-time">${hh} : ${mm}</div>
          <div class="hh-date-dow">${dow}</div>
        </div>
      </div>
    </header>
  `;
}
