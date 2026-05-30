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
import { getCurrentUser, setCurrentUser } from '../services/currentUser.js';
import { Lightbox, toLightboxUrl } from '../components/Lightbox.js';
import { formatShort, formatElapsed, evalSymbol, cardColorClass } from '../utils.js';
import { Header } from '../components/Header.js';
import { HomeHeader } from '../components/HomeHeader.js';
import { avatarFor } from '../data/member_avatars.js';
import { PostCard } from '../components/PostCard.js';
import { EditPost } from '../components/EditPost.js';
import { MeyasuCard } from '../components/MeyasuCard.js';
import { TsutsumiReminder } from '../components/TsutsumiReminder.js';
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
  const [operatorId, setOperatorId] = useState(getCurrentUser());
  const [actionMsg, setActionMsg] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState('');

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

  const saveTransplant = async (edits) => {
    try {
      for (const p of (phenology || [])) {
        const newVal = edits[p.paddy_key] || '';
        if (newVal !== (p.transplant_date || '')) {
          await api.updatePaddyPhenology({ paddy_key: p.paddy_key, transplant_date: newVal });
        }
      }
      const rows = await api.listPaddyPhenology();
      const withProgress = await Promise.all(rows.map(async (r) => ({
        ...r,
        progress: r.transplant_date ? await getPaddyProgress(r.transplant_date, r.heading_date) : null
      })));
      setPhenology(withProgress);
      flash('田植え日を更新しました');
    } catch (err) {
      flash(`更新失敗: ${err.message}`);
      throw err;
    }
  };

  const updateOperator = (id) => {
    setOperatorId(id);
    setCurrentUser(id);
  };

  const flash = (text) => {
    setActionMsg(text);
    setTimeout(() => setActionMsg(''), 2500);
  };

  const handleCloseTsutsumi = async (opId) => {
    try {
      await api.addFacilityOp({
        member_id: operatorId,
        target: '堤',
        action: '閉めた',
        reason: '',
        coordination_note: '',
        paired_op_id: opId
      });
      const [c, o] = await Promise.all([
        api.getTodayContext(),
        api.listFacilityOps({ limit: 50 })
      ]);
      setCtx(c); setOps(o);
      flash('閉めました');
    } catch (err) {
      flash(`閉める処理に失敗: ${err.message}`);
    }
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
      // 開けっぱリマインダーも変わる可能性があるので ctx 再取得
      const c = await api.getTodayContext();
      setCtx(c);
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
      <${HomeHeader} />

      <main class="screen-body home-v2">

        <${MeyasuCard} phenology=${phenology} onSaveTransplant=${saveTransplant} />

        <!-- 稲の暦(積算温度) — 独立カードで大きく -->
        <section class="gdd-section">
          <div class="gdd-section-title">稲 の 暦</div>
          ${!phenology && !phenologyError && html`<div class="empty-note">気温データを読み込み中…</div>`}
          ${phenologyError && html`<div class="empty-note">気温データの取得に失敗しました</div>`}
          ${phenology && phenology.map(r => html`
            <div class="gdd-bigcard" key=${r.paddy_key}>
              <div class="gdd-bigcard-head">
                <span class="gdd-bigcard-name">${r.paddy_name}</span>
                ${r.progress && html`<span class="gdd-bigcard-days">田植え ${r.progress.days}日目</span>`}
              </div>
              ${r.progress
                ? html`
                  <div class="gdd-bigcard-figure">${r.progress.gdd}<span class="gdd-bigcard-unit">°C·日</span></div>
                  <div class="gdd-bigcard-bar"><div class="gdd-bigcard-bar-fill" style=${`width:${r.progress.pct}%`}></div></div>
                  <div class="gdd-bigcard-meta">
                    <span>目標 ${r.progress.target}°C·日</span>
                    ${r.progress.predicted_date && html`
                      <span class="gdd-bigcard-pred">
                        ${r.progress.phase === 'transplant_to_heading' ? '出穂見込み' : '刈取り適期'}
                        ${ymdToMd(r.progress.predicted_date)}ごろ
                      </span>
                    `}
                  </div>
                `
                : html`<div class="gdd-bigcard-empty">田植え日が未設定</div>`
              }
            </div>
          `)}
        </section>

        <!-- 堤の未完了リマインダー(該当時のみ・インラインで閉められる) -->
        <${TsutsumiReminder}
          items=${pendingTsutsumi}
          members=${members}
          operatorId=${operatorId}
          onOperatorChange=${updateOperator}
          onClose=${(opId) => operatorId
            ? handleCloseTsutsumi(opId)
            : (flash('「あなた」を選んでください'), Promise.resolve())} />

        ${actionMsg && html`<div class="duty-flash">${actionMsg}</div>`}

        <!-- 投稿フィード -->
        <section class="feed">
          ${feed.length === 0
            ? html`<div class="empty-note">まだ投稿がありません</div>`
            : feed.map(item => {
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

      <${BottomNav} current="#/" />
      <${Lightbox} url=${lightboxUrl} onClose=${() => setLightboxUrl('')} />
    </div>
  `;
}

// ─────────────────────────────────────
// 投稿カード(共通)
// ─────────────────────────────────────

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

function ymdToMd(ymd) {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
