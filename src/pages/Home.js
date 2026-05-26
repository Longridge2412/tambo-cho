/**
 * ホーム画面(投稿フィード)
 *
 * 構成:
 *   - 上部固定:今の目安(目標水位 + 稲の暦/積算温度)
 *   - 下部:投稿フィード(見回り + 共用設備 + 覚書 を時系列マージ)
 *
 * Phase A の中心画面。当番表示はカレンダータブに移譲。
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { getPaddyProgress } from '../services/phenology.js';
import { formatShort, formatElapsed } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

export function HomePage() {
  const [ctx, setCtx] = useState(null);
  const [visits, setVisits] = useState([]);
  const [ops, setOps] = useState([]);
  const [notes, setNotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phenology, setPhenology] = useState(null);
  const [phenologyError, setPhenologyError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getTodayContext(),
      api.listVisits({ limit: 50 }),
      api.listFacilityOps({ limit: 50 }),
      api.listNotes(),
      api.listMembers()
    ])
      .then(([c, v, o, n, m]) => {
        setCtx(c); setVisits(v); setOps(o); setNotes(n); setMembers(m);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await api.listPaddyPhenology();
        const withProgress = await Promise.all(rows.map(async (r) => ({
          ...r,
          progress: r.transplant_date ? await getPaddyProgress(r.transplant_date, r.heading_date) : null
        })));
        if (!cancelled) setPhenology(withProgress);
      } catch (err) {
        if (!cancelled) setPhenologyError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return html`<div class="loading"><div class="loading-mark">宀</div><div class="loading-text">読み込み中</div></div>`;
  if (error) return html`
    <div class="error-screen">
      <div class="error-title">うまく読み込めませんでした</div>
      <div class="error-detail">${error}</div>
      <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
    </div>
  `;

  const target = ctx.target;
  const pendingTsutsumi = ctx.pending_tsutsumi || [];

  // メンバーID → 表示名
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  // 統合フィード(visits + facility_ops + notes)
  const feed = [];
  visits.forEach(v => v.visited_at && feed.push({
    type: 'visit', id: v.visit_id, ts: v.visited_at,
    by: memberMap[v.member_id] || '?', data: v
  }));
  ops.forEach(o => o.operated_at && feed.push({
    type: 'facility', id: o.op_id, ts: o.operated_at,
    by: memberMap[o.member_id] || '?', data: o
  }));
  notes.forEach(n => n.created_at && feed.push({
    type: 'note', id: n.note_id, ts: n.created_at,
    by: memberMap[n.created_by] || '?', data: n
  }));
  feed.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));

  return html`
    <div class="screen">
      <${Header} title="N E O 百" />

      <main class="screen-body home-v2">

        <!-- 上部固定:今の目安 -->
        <section class="meyasu-card">
          <div class="meyasu-head">
            <div class="meyasu-title">今 の 目 安</div>
          </div>

          <!-- 目標水位 -->
          <div class="meyasu-row">
            <div class="meyasu-visual">${TargetVisual({ target })}</div>
            <div class="meyasu-text">
              ${target
                ? html`
                  <div class="meyasu-main">${target.target_label}</div>
                  <div class="meyasu-sub">${target.period_label}</div>
                `
                : html`<div class="meyasu-main warn">目標未設定</div>`
              }
            </div>
          </div>

          <!-- 稲の暦(積算温度) -->
          ${!phenology && !phenologyError && html`<div class="meyasu-loading">気温データ読み込み中…</div>`}
          ${phenologyError && html`<div class="meyasu-loading">気温データ取得失敗</div>`}
          ${phenology && phenology.map(r => html`
            <div class="gdd-line" key=${r.paddy_key}>
              <span class="gdd-paddy">${r.paddy_name}</span>
              ${r.progress
                ? html`
                  <span class="gdd-info">
                    ${r.progress.days}日目 ・ 積算 ${r.progress.gdd}°C·日
                    ${r.progress.predicted_date && html`
                      ・ <span class="gdd-pred">
                        ${r.progress.phase === 'transplant_to_heading' ? '出穂' : '刈取り'}
                        ${ymdToMd(r.progress.predicted_date)}ごろ
                      </span>
                    `}
                  </span>
                `
                : html`<span class="gdd-info dim">田植え日未設定</span>`
              }
            </div>
          `)}
        </section>

        <!-- 堤の未完了リマインダー(該当時のみ) -->
        ${pendingTsutsumi.length > 0 && html`
          <section class="reminder-card">
            <div class="reminder-head">
              <div class="reminder-mark">堤</div>
              <div class="reminder-label">開 け た ま ま</div>
            </div>
            <div class="reminder-body">
              ${pendingTsutsumi.map(op => html`
                <div class="reminder-row" key=${op.op_id}>
                  <span class="reminder-by">${op.display_name}</span>
                  <span class="reminder-time">${formatShort(op.operated_at)}</span>
                  <span class="reminder-elapsed">${formatElapsed(op.operated_at)}</span>
                </div>
              `)}
            </div>
            <a class="reminder-action" href="#/compose">閉めに行く ›</a>
          </section>
        `}

        <!-- 投稿フィード -->
        <section class="feed">
          ${feed.length === 0
            ? html`<div class="empty-note">まだ投稿がありません</div>`
            : feed.map(item => html`<${PostCard} key=${item.type + ':' + item.id} item=${item} />`)
          }
        </section>

      </main>

      <${BottomNav} current="#/" />
    </div>
  `;
}

// ─────────────────────────────────────
// 投稿カード(共通)
// ─────────────────────────────────────
function PostCard({ item }) {
  const v = item.data;
  const initial = (item.by || '?').charAt(0);

  // 写真URL(visit のみ 最大2枚)
  let photos = [];
  if (item.type === 'visit') {
    if (v.water_level_photo_url) photos.push({label:'三畝', url: convertDriveUrl(v.water_level_photo_url)});
    if (v.field2_photo_url)      photos.push({label:'一反', url: convertDriveUrl(v.field2_photo_url)});
  } else if (item.type === 'facility' && v.photo_url) {
    photos.push({label:'', url: convertDriveUrl(v.photo_url)});
  } else if (item.type === 'note' && v.photo_url) {
    photos.push({label:'', url: convertDriveUrl(v.photo_url)});
  }

  // タグ
  let tags = [];
  if (item.type === 'visit') {
    if (v.water_level_eval) tags.push(`三畝 ${v.water_level_eval}`);
    if (v.field2_eval)      tags.push(`一反 ${v.field2_eval}`);
    if (v.stream_status)    tags.push(`疎水 ${v.stream_status}`);
  } else if (item.type === 'facility') {
    tags.push(`${v.target}${v.action ? ' ' + v.action : ''}`);
  }

  // 本文
  let body = '';
  if (item.type === 'visit')        body = v.free_note || '';
  else if (item.type === 'facility') body = v.reason || v.coordination_note || '';
  else if (item.type === 'note')     body = v.content || v.body || '';

  return html`
    <article class="post">
      <header class="post-head">
        <div class="post-avatar">${initial}</div>
        <div class="post-meta">
          <div class="post-by">${item.by}</div>
          <div class="post-time">${formatShort(item.ts)}</div>
        </div>
      </header>

      ${photos.length > 0 && html`
        <div class=${`post-photos count-${photos.length}`}>
          ${photos.map(p => html`
            <div class="post-photo-cell" key=${p.url}>
              <img class="post-photo" src=${p.url} alt=${p.label}/>
              ${p.label && html`<span class="post-photo-label">${p.label}</span>`}
            </div>
          `)}
        </div>
      `}

      ${tags.length > 0 && html`
        <div class="post-tags">
          ${tags.map(t => html`<span class="post-tag" key=${t}>${t}</span>`)}
        </div>
      `}

      ${body && html`<div class="post-body">${body}</div>`}
    </article>
  `;
}

// 目標水位のビジュアル(SVG)
function TargetVisual({ target }) {
  if (!target) return html`<div class="target-empty">─</div>`;
  const label = target.target_label || '';
  const isDry = label.includes('中干し') || label.includes('乾');
  const isLow = label.includes('浅め') || label.includes('低');
  const waterTop = isDry ? 50 : (isLow ? 38 : 32);
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

function convertDriveUrl(url) {
  if (!url) return '';
  const m = String(url).match(/\/file\/d\/([^/]+)\//);
  if (!m) return url;
  return `https://lh3.googleusercontent.com/d/${m[1]}=w600`;
}
function ymdToMd(ymd) {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
