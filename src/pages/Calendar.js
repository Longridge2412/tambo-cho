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
import { formatShort, evalSymbol, cardColorClass } from '../utils.js';
import { avatarFor } from '../data/member_avatars.js';
import { Header } from '../components/Header.js';
import { Lightbox, toLightboxUrl } from '../components/Lightbox.js';
import { PostCard } from '../components/PostCard.js';
import { EditPost } from '../components/EditPost.js';
import { BottomNav } from '../components/BottomNav.js';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isSameYmd(a, b) { return a === b; }


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
  const [actionMsg, setActionMsg] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState('');

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

  const flash = (text) => {
    setActionMsg(text);
    setTimeout(() => setActionMsg(''), 2500);
  };
  const handleEditStart = (item) => setEditingKey(`${item.type}:${item.id}`);
  const handleEditCancel = () => setEditingKey(null);
  const handleEditSave = async (item, updates) => {
    try {
      if (item.type === 'visit') {
        await api.updateVisit({ visit_id: item.id, ...updates });
        setVisits(visits.map(v => v.visit_id === item.id ? { ...v, ...updates } : v));
      } else if (item.type === 'facility') {
        await api.updateFacilityOp({ op_id: item.id, ...updates });
        setOps(ops.map(o => o.op_id === item.id ? { ...o, ...updates } : o));
      } else if (item.type === 'note') {
        await api.updateNote({ note_id: item.id, ...updates });
        setNotes(notes.map(n => n.note_id === item.id ? { ...n, ...updates } : n));
      }
      setEditingKey(null);
      flash('保存しました');
    } catch (err) {
      flash(`保存失敗: ${err.message}`);
    }
  };

  const handleDeletePost = async (item) => {
    if (!confirm('この投稿を削除しますか?\n取り消せません。')) return;
    try {
      if (item.type === 'visit') {
        await api.deleteVisit({ visit_id: item.id });
        setVisits(visits.filter(v => v.visit_id !== item.id));
      } else if (item.type === 'facility') {
        await api.deleteFacilityOp({ op_id: item.id });
        setOps(ops.filter(o => o.op_id !== item.id));
      } else if (item.type === 'note') {
        await api.deleteNote({ note_id: item.id });
        setNotes(notes.filter(n => n.note_id !== item.id));
      }
      flash('削除しました');
    } catch (err) {
      flash(`削除失敗: ${err.message}`);
    }
  };

    if (loading) return html`<div class="loading"><div class="loading-text">読み込み中</div></div>`;
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

  // 日付ごとの投稿リストを構築(ローカル時刻基準でバケツ分け)
  function localYmd(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const postsByDate = {};
  const pushPost = (dateStr, post) => {
    if (!dateStr) return;
    const k = localYmd(dateStr);
    if (!k) return;
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

          ${actionMsg && html`<div class="duty-flash">${actionMsg}</div>`}
          ${selectedPosts.length === 0
            ? html`<div class="empty-note">この日の投稿はありません</div>`
            : selectedPosts.map(item => {
                const k = item.type + ':' + item.id;
                if (editingKey === k) {
                  return html`<${EditPost} key=${k} item=${item}
                    onSave=${handleEditSave} onCancel=${handleEditCancel} />`;
                }
                return html`<${PostCard} key=${k} item=${item}
                  onEdit=${handleEditStart} onDelete=${handleDeletePost}
                  onPhotoClick=${(url) => setLightboxUrl(toLightboxUrl(url))} />`;
              })
          }
        </section>

      </main>

      <${BottomNav} current="#/calendar" />
      <${Lightbox} url=${lightboxUrl} onClose=${() => setLightboxUrl('')} />
    </div>
  `;
}

