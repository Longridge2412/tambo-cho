/**
 * カレンダー画面
 *
 *   - 月表示・前後切替
 *   - 各日:投稿量で色分け(ヒートマップ)、当番の○印
 *   - 日付タップ → その日の投稿一覧
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { formatShort } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isSameYmd(a, b) { return a === b; }

function convertDriveUrl(url) {
  if (!url) return '';
  const m = String(url).match(/\/file\/d\/([^/]+)\//);
  if (!m) return url;
  return `https://lh3.googleusercontent.com/d/${m[1]}=w600`;
}

export function CalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());  // 0-11
  const [selectedYmd, setSelectedYmd] = useState(ymd(today));

  const [members, setMembers] = useState([]);
  const [visits, setVisits]   = useState([]);
  const [ops, setOps]         = useState([]);
  const [notes, setNotes]     = useState([]);
  const [dutyMaster, setDutyMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    Promise.all([
      api.listMembers(),
      api.listVisits({ limit: 200 }),
      api.listFacilityOps({ limit: 200 }),
      api.listNotes(),
      api.listDutyMaster()
    ]).then(([m, v, o, n, dm]) => {
      setMembers(m);
      setVisits(v); setOps(o); setNotes(n);
      setDutyMaster(dm);
      setLoading(false);
    }).catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return html`<div class="loading"><div class="loading-mark">田</div><div class="loading-text">読み込み中</div></div>`;
  if (error) return html`
    <div class="error-screen">
      <div class="error-title">うまく読み込めませんでした</div>
      <div class="error-detail">${error}</div>
      <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
    </div>
  `;

  // メンバーマップ
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  // 日付ごとの投稿リストを構築
  const postsByDate = {};
  const pushPost = (dateStr, post) => {
    if (!dateStr) return;
    const k = dateStr.slice(0, 10);
    if (!postsByDate[k]) postsByDate[k] = [];
    postsByDate[k].push(post);
  };
  visits.forEach(v => pushPost(v.visited_at, {
    type: 'visit', id: v.visit_id, ts: v.visited_at, by: memberMap[v.member_id] || '?', data: v
  }));
  ops.forEach(o => pushPost(o.operated_at, {
    type: 'facility', id: o.op_id, ts: o.operated_at, by: memberMap[o.member_id] || '?', data: o
  }));
  notes.forEach(n => pushPost(n.created_at, {
    type: 'note', id: n.note_id, ts: n.created_at, by: memberMap[n.created_by] || '?', data: n
  }));
  Object.values(postsByDate).forEach(arr => arr.sort((a,b) => String(b.ts).localeCompare(String(a.ts))));

  // ヒートマップ色:0/1/2-3/4+
  function intensity(n) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    return 3;
  }

  // 月のセル一覧構築(日曜始まり)
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();  // 日曜=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // 当番:曜日マスター取得関数
  function dutyForDate(yy, mm, dd) {
    // 曜日マスターから当番を返す(週単位の上書きは反映されない簡易版)
    const dow = DOW[new Date(yy, mm, dd).getDay()];
    const ms = dutyMaster.filter(r => r.day_of_week === dow);
    return ms.map(r => memberMap[r.member_id] || '').filter(Boolean);
  }

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  };
  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear()); setMonth(d.getMonth());
    setSelectedYmd(ymd(d));
  };

  const todayYmd = ymd(today);
  const selectedPosts = postsByDate[selectedYmd] || [];
  const selectedDuty = (() => {
    if (!selectedYmd) return [];
    const [yy, mm, dd] = selectedYmd.split('-').map(Number);
    return dutyForDate(yy, mm - 1, dd);
  })();

  return html`
    <div class="screen">
      <${Header} title="カ レ ン ダ ー" subtitle="月ごとに 過去を辿る" />

      <main class="screen-body">

        <!-- 月ヘッダ -->
        <div class="cal-monthnav">
          <button class="cal-monthbtn" onClick=${prevMonth}>‹</button>
          <button class="cal-monthtitle" onClick=${goToday}>${year}年 ${month + 1}月</button>
          <button class="cal-monthbtn" onClick=${nextMonth}>›</button>
        </div>

        <!-- 曜日ヘッダ -->
        <div class="cal-dow">
          ${DOW.map((d, i) => html`<div class=${`cal-dow-cell ${i===0?'sun':''} ${i===6?'sat':''}`} key=${d}>${d}</div>`)}
        </div>

        <!-- セル -->
        <div class="cal-grid">
          ${cells.map((d, i) => {
            if (d === null) return html`<div class="cal-cell empty" key=${'e'+i}></div>`;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const posts = postsByDate[dateStr] || [];
            const inten = intensity(posts.length);
            const dow = new Date(year, month, d).getDay();
            const isToday = isSameYmd(dateStr, todayYmd);
            const isSelected = isSameYmd(dateStr, selectedYmd);
            const duties = dutyForDate(year, month, d);
            return html`
              <button type="button"
                class=${`cal-cell heat-${inten} ${dow===0?'sun':''} ${dow===6?'sat':''} ${isToday?'today':''} ${isSelected?'selected':''}`}
                key=${dateStr}
                onClick=${() => setSelectedYmd(dateStr)}>
                <span class="cal-day-num">${d}</span>
                ${duties.length > 0 && html`<span class="cal-duty-mark">${duties.length === 1 ? '・' : '・・'}</span>`}
              </button>
            `;
          })}
        </div>

        <!-- 凡例 -->
        <div class="cal-legend">
          <span class="cal-legend-label">投稿:</span>
          <span class="cal-legend-swatch heat-0"></span><span class="cal-legend-text">なし</span>
          <span class="cal-legend-swatch heat-1"></span><span class="cal-legend-text">1</span>
          <span class="cal-legend-swatch heat-2"></span><span class="cal-legend-text">2-3</span>
          <span class="cal-legend-swatch heat-3"></span><span class="cal-legend-text">4+</span>
        </div>

        <!-- 選択日詳細 -->
        <section class="cal-day-detail">
          <div class="cal-day-detail-head">
            <span class="cal-day-detail-date">
              ${selectedYmd.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年 $2月 $3日')}
              <span class="cal-day-detail-dow">${DOW[new Date(selectedYmd+'T00:00:00').getDay()]}</span>
            </span>
          </div>

          ${selectedDuty.length > 0 && html`
            <div class="cal-day-duty">
              <span class="cal-day-duty-label">当 番</span>
              <span class="cal-day-duty-names">${selectedDuty.join(' ・ ')}</span>
            </div>
          `}

          ${selectedPosts.length === 0
            ? html`<div class="empty-note">この日の投稿はありません</div>`
            : selectedPosts.map(item => html`<${PostCard} key=${item.type + ':' + item.id} item=${item} />`)
          }
        </section>

      </main>

      <${BottomNav} current="#/calendar" />
    </div>
  `;
}

// (Home の PostCard と同じ構造。表示一貫性のためここに置く)
function PostCard({ item }) {
  const v = item.data;
  const initial = (item.by || '?').charAt(0);
  let photos = [];
  if (item.type === 'visit') {
    if (v.water_level_photo_url) photos.push({label:'三畝', url: convertDriveUrl(v.water_level_photo_url)});
    if (v.field2_photo_url)      photos.push({label:'一反', url: convertDriveUrl(v.field2_photo_url)});
  } else if (item.type === 'facility' && v.photo_url) {
    photos.push({label:'', url: convertDriveUrl(v.photo_url)});
  }
  let tags = [];
  if (item.type === 'visit') {
    if (v.water_level_eval) tags.push(`三畝 ${v.water_level_eval}`);
    if (v.field2_eval)      tags.push(`一反 ${v.field2_eval}`);
    if (v.stream_status)    tags.push(`疎水 ${v.stream_status}`);
  } else if (item.type === 'facility') {
    tags.push(`${v.target}${v.action ? ' ' + v.action : ''}`);
  }
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
