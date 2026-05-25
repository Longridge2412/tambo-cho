/**
 * ホーム画面
 *
 * 構成:
 *   - 本日の水加減(目標 + 直近)
 *   - 本日の当番
 *   - 近ごろの見回り
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { formatShort, formatElapsed } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

export function HomePage() {
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTodayContext()
      .then(data => { setCtx(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return html`<div class="loading"><div class="loading-mark">帳</div><div class="loading-text">読み込み中</div></div>`;
  if (error) return html`
    <div class="error-screen">
      <div class="error-title">うまく読み込めませんでした</div>
      <div class="error-detail">${error}</div>
      <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
    </div>
  `;

  const target = ctx.target;
  const latest = ctx.latest_visit;
  const todayDuty = ctx.today.today_duty || [];
  const tomorrowDuty = ctx.today.tomorrow_duty || [];
  const tomorrowDow = ctx.today.tomorrow_day_of_week || '';

  return html`
    <div class="screen">
      <${Header} title="田 ・ 帳" />

      <main class="screen-body">

        <!-- 本日の水加減 -->
        <section class="mizu-card">
          <div class="mizu-head">
            <div class="mizu-title">本 日 の 水 加 減</div>
          </div>
          <div class="mizu-grid">

            <!-- 目標 -->
            <div class="mizu-col">
              <div class="mizu-col-label">目 標</div>
              <div class="mizu-visual">${TargetVisual({ target })}</div>
              <div class="mizu-text">
                ${target
                  ? html`
                    <div class="mizu-main">${target.target_label}</div>
                    <div class="mizu-sub">${target.period_label}</div>
                  `
                  : html`
                    <div class="mizu-main warn">設定未完了</div>
                    <div class="mizu-sub">時期データを<br/>登録してください</div>
                  `
                }
              </div>
            </div>

            <!-- 直近 -->
            <div class="mizu-col">
              <div class="mizu-col-label">直 近</div>
              <div class="mizu-visual">
                ${latest && latest.water_level_photo_url
                  ? html`<img class="mizu-photo" src=${convertDriveUrl(latest.water_level_photo_url)} alt="直近の田んぼ"/>`
                  : html`<div class="mizu-photo placeholder">写真なし</div>`
                }
              </div>
              <div class="mizu-text">
                ${latest
                  ? html`
                    <div class="mizu-main">${latest.display_name} ${formatShort(latest.visited_at).split(' ')[0]}</div>
                    <div class="mizu-sub">${formatElapsed(latest.visited_at)}</div>
                    <div class="mizu-tags">
                      ${latest.water_level_eval && html`<span class="mizu-tag">三畝 ${latest.water_level_eval}</span>`}
                      ${latest.field2_eval && html`<span class="mizu-tag">一反 ${latest.field2_eval}</span>`}
                      ${latest.stream_status && html`<span class="mizu-tag water">疎水 ${latest.stream_status}</span>`}
                    </div>
                  `
                  : html`
                    <div class="mizu-main">まだ記録なし</div>
                    <a class="mizu-action" href="#/visit">最初の見回りをする ›</a>
                  `
                }
              </div>
            </div>
          </div>
        </section>

        <!-- 堤の未完了リマインダー(該当時のみ、警告色を使わずさりげなく) -->
        ${ctx.pending_tsutsumi && ctx.pending_tsutsumi.length > 0 && html`
          <section class="reminder-card">
            <div class="reminder-head">
              <div class="reminder-mark">堤</div>
              <div class="reminder-label">開 け た ま ま</div>
            </div>
            <div class="reminder-body">
              ${ctx.pending_tsutsumi.map(op => html`
                <div class="reminder-row" key=${op.op_id}>
                  <span class="reminder-by">${op.display_name}</span>
                  <span class="reminder-time">${formatShort(op.operated_at)}</span>
                  <span class="reminder-elapsed">${formatElapsed(op.operated_at)}</span>
                </div>
              `)}
            </div>
            <a class="reminder-action" href="#/facility">閉めに行く ›</a>
          </section>
        `}

        <!-- 本日の当番 -->
        <section class="section">
          <div class="sec-head">
            <div class="sec-mark"></div>
            <div class="sec-title">本 日 の 当 番</div>
            <div class="sec-line"></div>
          </div>
          <div class="duty-card">
            <div class="duty-row">
              <div class="duty-day">${ctx.today.day_of_week}曜日</div>
            </div>
            ${todayDuty.length > 0
              ? html`
                <div class="duty-names">
                  ${todayDuty.map((d, i) => html`
                    <div class="duty-person" key=${d.member_id}>
                      <div class=${`shuin ${i === 1 ? 's2' : ''}`}>${(d.display_name || '?').charAt(0)}</div>
                      <div class="duty-name">${d.display_name}</div>
                    </div>
                  `)}
                </div>
              `
              : html`<div class="duty-empty">当番表が未設定です</div>`
            }
            ${tomorrowDuty.length > 0 && html`
              <div class="duty-tomorrow">
                <span class="duty-tomorrow-label">明日 ${tomorrowDow}</span>
                <span class="duty-tomorrow-names">
                  ${tomorrowDuty.map(d => d.display_name).join(' ・ ')}
                </span>
              </div>
            `}
          </div>
        </section>

        <!-- 近ごろの見回り -->
        <section class="section">
          <div class="sec-head">
            <div class="sec-mark"></div>
            <div class="sec-title">近 ご ろ の 見 回 り</div>
            <div class="sec-line"></div>
            <a class="sec-action" href="#/visit">記す ›</a>
          </div>
          ${ctx.recent_visits.length > 0
            ? ctx.recent_visits.map(v => html`
              <div class="visit-item" key=${v.visit_id}>
                ${v.water_level_photo_url
                  ? html`<img class="visit-thumb" src=${convertDriveUrl(v.water_level_photo_url)} alt=""/>`
                  : html`<div class="visit-thumb placeholder"></div>`
                }
                <div class="visit-info">
                  <div class="visit-top">
                    <div class="visit-by">${v.display_name}</div>
                    <div class="visit-time">${formatShort(v.visited_at)}</div>
                  </div>
                  <div class="visit-note">
                    ${v.water_level_eval && html`<span class="visit-tag">三畝 ${v.water_level_eval}</span>`}
                    ${v.field2_eval && html`<span class="visit-tag">一反 ${v.field2_eval}</span>`}
                    ${v.stream_status && html`<span class="visit-tag water">疎水 ${v.stream_status}</span>`}
                    ${v.free_note && html`<span class="visit-free">${truncate(v.free_note, 30)}</span>`}
                  </div>
                </div>
              </div>
            `)
            : html`<div class="empty-note">まだ記録がありません</div>`
          }
        </section>

        <!-- 共用設備の動き(直近2件) -->
        <section class="section">
          <div class="sec-head">
            <div class="sec-mark"></div>
            <div class="sec-title">共 用 設 備 の 動 き</div>
            <div class="sec-line"></div>
            <a class="sec-action" href="#/facility">記す ›</a>
          </div>
          ${ctx.recent_facility_ops && ctx.recent_facility_ops.length > 0
            ? ctx.recent_facility_ops.map(op => html`
              <div class="facility-item" key=${op.op_id}>
                <div class=${`facility-icon ${op.target === '堤' ? (op.action === '開けた' ? 'open' : 'close') : 'other'}`}>
                  ${(op.target || '').charAt(0)}
                </div>
                <div class="facility-info">
                  <div class="facility-top">
                    <div class="facility-by">${op.display_name}</div>
                    <div class="facility-time">${formatShort(op.operated_at)}</div>
                  </div>
                  <div class="facility-note">
                    <span class="facility-action">${op.target}を ${op.action || '操作'}</span>
                    ${op.reason && html`<span class="facility-reason">${truncate(op.reason, 30)}</span>`}
                  </div>
                </div>
              </div>
            `)
            : html`<div class="empty-note">まだ記録がありません</div>`
          }
        </section>

      </main>

      <${BottomNav} current="#/" />
    </div>
  `;
}

// 目標水位のビジュアル(SVG)
function TargetVisual({ target }) {
  if (!target) {
    return html`<div class="target-empty">─</div>`;
  }

  const label = target.target_label || '';
  // 表示パターン:中干しは水なし
  const isDry = label.includes('中干し') || label.includes('乾');
  const isLow = label.includes('浅め') || label.includes('低');
  const waterTop = isDry ? 50 : (isLow ? 38 : 32);  // 水面のY座標

  return html`
    <svg width="100" height="60" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="50" width="100" height="10" fill="#8b6f47" opacity="0.3"/>
      ${!isDry && html`
        <rect x="0" y=${waterTop} width="100" height=${50 - waterTop} fill="#7a9aa0" opacity="0.4"/>
        <line x1="0" y1=${waterTop} x2="100" y2=${waterTop} stroke="#7a9aa0" stroke-width="1" stroke-dasharray="3,2"/>
      `}
      <g stroke="#6b7a3a" stroke-width="1.5" fill="none">
        <path d="M 15 50 L 15 10 M 15 18 L 12 15 M 15 22 L 18 19"/>
        <path d="M 38 50 L 38 8 M 38 16 L 35 13 M 38 20 L 41 17"/>
        <path d="M 62 50 L 62 12 M 62 18 L 59 15 M 62 22 L 65 19"/>
        <path d="M 85 50 L 85 10 M 85 18 L 82 15 M 85 22 L 88 19"/>
      </g>
    </svg>
  `;
}

/**
 * Google Drive の /file/d/XXX/view URL を、画像として埋め込める形式に変換。
 * 「リンクを知っている全員」設定でも、img タグから表示するには変換が必要。
 */
function convertDriveUrl(url) {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (!match) return url;
  return `https://lh3.googleusercontent.com/d/${match[1]}=w400`;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
