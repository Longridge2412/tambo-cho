/**
 * 履歴画面(綴り)
 *
 * 見回り(visits)と共用設備操作(facility_ops)を
 * 時系列で1つのタイムラインに統合表示。
 *
 * 構成:
 *   - フィルタチップ(すべて / 見回り / 共用設備)
 *   - 日付ごとのグルーピング(今日 / 昨日 / 一昨日 / それ以前は日付)
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { formatShort } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

// Drive の /file/d/XXX/view URL を画像表示用に変換
function convertDriveUrl(url) {
  if (!url) return '';
  const match = String(url).match(/\/file\/d\/([^/]+)\//);
  if (!match) return url;
  return `https://lh3.googleusercontent.com/d/${match[1]}=w400`;
}

function truncate(s, n) {
  if (!s) return '';
  s = String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// 日付グループのラベル(今日 / 昨日 / 一昨日 / M月D日 曜)
function dateGroupLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((tDay - dDay) / 86400000);
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays === 2) return '一昨日';
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${dow}`;
}

// グルーピング用の日付キー
function dateKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 見回り記録の1行
function VisitRow({ item }) {
  const v = item.data;
  return html`
    <div class="hist-item">
      ${v.water_level_photo_url
        ? html`<img class="hist-thumb" src=${convertDriveUrl(v.water_level_photo_url)} alt=""/>`
        : html`<div class="hist-thumb placeholder">見</div>`
      }
      <div class="hist-info">
        <div class="hist-top">
          <span class="hist-badge visit">見回り</span>
          <span class="hist-by">${item.display_name}</span>
          <span class="hist-time">${formatShort(item.timestamp)}</span>
        </div>
        <div class="hist-note">
          ${v.water_level_eval && html`<span class="hist-tag">水 ${v.water_level_eval}</span>`}
          ${v.stream_status && html`<span class="hist-tag water">小川 ${v.stream_status}</span>`}
          ${v.free_note && html`<span class="hist-free">${truncate(v.free_note, 40)}</span>`}
        </div>
      </div>
    </div>
  `;
}

// 共用設備操作の1行
function FacilityRow({ item }) {
  const o = item.data;
  return html`
    <div class="hist-item">
      ${o.photo_url
        ? html`<img class="hist-thumb" src=${convertDriveUrl(o.photo_url)} alt=""/>`
        : html`<div class="hist-thumb placeholder">${(o.target || '・').charAt(0)}</div>`
      }
      <div class="hist-info">
        <div class="hist-top">
          <span class="hist-badge facility">共用設備</span>
          <span class="hist-by">${item.display_name}</span>
          <span class="hist-time">${formatShort(item.timestamp)}</span>
        </div>
        <div class="hist-note">
          <span class="hist-tag">${o.target}${o.action ? ' ' + o.action : ''}</span>
          ${o.reason && html`<span class="hist-free">${truncate(o.reason, 40)}</span>`}
        </div>
      </div>
    </div>
  `;
}

export function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all / visit / facility

  useEffect(() => {
    Promise.all([
      api.listVisits({ limit: 50 }),
      api.listFacilityOps({ limit: 50 }),
      api.listMembers()
    ])
      .then(([visits, ops, membersData]) => {
        const memberMap = {};
        membersData.forEach(m => { memberMap[m.member_id] = m.display_name; });

        const visitItems = visits.map(v => ({
          type: 'visit',
          id: v.visit_id,
          timestamp: v.visited_at,
          display_name: memberMap[v.member_id] || '?',
          data: v
        }));
        const opItems = ops.map(o => ({
          type: 'facility',
          id: o.op_id,
          timestamp: o.operated_at,
          display_name: memberMap[o.member_id] || '?',
          data: o
        }));
        const merged = [...visitItems, ...opItems]
          .filter(x => x.timestamp)
          .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

        setItems(merged);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) {
    return html`<div class="loading"><div class="loading-mark">綴</div><div class="loading-text">読み込み中</div></div>`;
  }
  if (error) {
    return html`
      <div class="error-screen">
        <div class="error-title">うまく読み込めませんでした</div>
        <div class="error-detail">${error}</div>
        <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
      </div>
    `;
  }

  // フィルタ適用
  const filtered = items.filter(x => filter === 'all' || x.type === filter);

  // 日付グルーピング
  const groups = [];
  let currentKey = null;
  filtered.forEach(item => {
    const k = dateKey(item.timestamp);
    if (k !== currentKey) {
      currentKey = k;
      groups.push({ key: k, label: dateGroupLabel(item.timestamp), items: [] });
    }
    groups[groups.length - 1].items.push(item);
  });

  const FILTERS = [
    { key: 'all', label: 'すべて' },
    { key: 'visit', label: '見回り' },
    { key: 'facility', label: '共用設備' }
  ];

  return html`
    <div class="screen">
      <${Header} title="綴 り" subtitle="これまでの 田んぼの記録" />
      <main class="screen-body">

        <div class="filter-row">
          ${FILTERS.map(f => html`
            <button key=${f.key} type="button"
              class=${`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick=${() => setFilter(f.key)}>${f.label}</button>
          `)}
        </div>

        ${groups.length === 0
          ? html`<div class="empty-note">まだ記録がありません</div>`
          : groups.map(g => html`
            <section class="hist-group" key=${g.key}>
              <div class="hist-date">${g.label}</div>
              ${g.items.map(item => html`
                ${item.type === 'visit'
                  ? html`<${VisitRow} key=${item.id} item=${item} />`
                  : html`<${FacilityRow} key=${item.id} item=${item} />`}
              `)}
            </section>
          `)
        }

      </main>
      <${BottomNav} current="#/history" />
    </div>
  `;
}
