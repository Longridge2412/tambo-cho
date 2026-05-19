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
  if (error) return html`<div class="error-screen">通信に失敗しました<br/><small>${error}</small></div>`;

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
                      ${latest.water_level_eval && html`<span class="mizu-tag">水 ${latest.water_level_eval}</span>`}
                      ${latest.stream_status && html`<span class="mizu-tag water">小川 ${latest.stream_status}</span>`}
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
                    ${v.water_level_eval && html`<span class="visit-tag">水 ${v.water_level_eval}</span>`}
                    ${v.stream_status && html`<span class="visit-tag water">小川 ${v.stream_status}</span>`}
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
          ${ctx.recent_facility_ops && ct