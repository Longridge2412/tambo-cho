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
  const [operatorId, setOperatorId] = useState(getCurrentUser());
  const [closingOpId, setClosingOpId] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [editingKey, setEditingKey] = useState(null);

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

  const updateOperator = (id) => {
    setOperatorId(id);
    setCurrentUser(id);
  };

  const flash = (text) => {
    setActionMsg(text);
    setTimeout(() => setActionMsg(''), 2500);
  };

  const handleCloseTsutsumi = async (opId) => {
    if (!operatorId) {
      flash('「あなた」を選んでください');
      return;
    }
    setClosingOpId(opId);
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
    } finally {
      setClosingOpId('');
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

        <!-- 堤の未完了リマインダー(該当時のみ・インラインで閉められる) -->
        ${pendingTsutsumi.length > 0 && html`
          <section class="reminder-card">
            <div class="reminder-head">
              <div class="reminder-mark">堤</div>
              <div class="reminder-label">開 け た ま ま</div>
            </div>
            <div class="reminder-body">
              ${pendingTsutsumi.map(op => html`
                <div class="reminder-row" key=${op.op_id}>
                  <div class="reminder-row-info">
                    <span class="reminder-by">${op.display_name}</span>
                    <span class="reminder-time">${formatShort(op.operated_at)}</span>
                    <span class="reminder-elapsed">${formatElapsed(op.operated_at)}</span>
                  </div>
                  <button class="reminder-close-btn"
                    disabled=${closingOpId === op.op_id || !operatorId}
                    onClick=${() => handleCloseTsutsumi(op.op_id)}>
                    ${closingOpId === op.op_id ? '送信中…' : '閉めた'}
                  </button>
                </div>
              `)}
            </div>
            <div class="reminder-operator">
              <span class="reminder-operator-label">あなた</span>
              <select class="reminder-operator-select"
                value=${operatorId} onChange=${e => updateOperator(e.target.value)}>
                <option value="">── 選択 ──</option>
                ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
              </select>
            </div>
          </section>
        `}

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
                  onEdit=${handleEditStart} onDelete=${handleDeletePost} />`;
              })
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
function PostCard({ item, onEdit, onDelete }) {
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
      ${(onEdit || onDelete) && html`
        <div class="post-foot">
          ${onEdit && html`<button class="post-edit-btn" type="button"
            onClick=${() => onEdit(item)}>編集</button>`}
          ${onDelete && html`<button class="post-delete-btn" type="button"
            onClick=${() => onDelete(item)}>削除</button>`}
        </div>
      `}
    </article>
  `;
}

// ─────────────────────────────────────
// 投稿編集フォーム(インライン)
// ─────────────────────────────────────
function EditPost({ item, onSave, onCancel }) {
  const v = item.data;
  const [eval1, setEval1]               = useState(v.water_level_eval || '');
  const [eval2, setEval2]               = useState(v.field2_eval || '');
  const [streamStatus, setStreamStatus] = useState(v.stream_status || '');
  const [freeNote, setFreeNote]         = useState(v.free_note || '');
  const [opAction, setOpAction]         = useState(v.action || '');
  const [opReason, setOpReason]         = useState(v.reason || '');
  const [noteContent, setNoteContent]   = useState(v.content || v.body || '');
  const [busy, setBusy]                 = useState(false);

  const handleSave = async () => {
    setBusy(true);
    let updates = {};
    if (item.type === 'visit') {
      updates = {
        water_level_eval: eval1, field2_eval: eval2,
        stream_status: streamStatus, free_note: freeNote
      };
    } else if (item.type === 'facility') {
      updates = { action: opAction, reason: opReason };
    } else if (item.type === 'note') {
      updates = { content: noteContent };
    }
    try { await onSave(item, updates); } finally { setBusy(false); }
  };

  return html`
    <article class="post post-edit">
      <header class="post-head">
        <div class="post-avatar">${(item.by || '?').charAt(0)}</div>
        <div class="post-meta">
          <div class="post-by">${item.by}</div>
          <div class="post-time">編集中…</div>
        </div>
      </header>
      <div class="post-edit-body">
        ${item.type === 'visit' && html`
          <div class="form-group">
            <div class="f-label">水位(三畝)</div>
            <div class="toggle-group">
              ${['高', '適', '低'].map(opt => html`
                <button key=${opt} type="button"
                  class=${`toggle-btn ${eval1 === opt ? 'active' : ''}`}
                  onClick=${() => setEval1(eval1 === opt ? '' : opt)}>${opt}</button>
              `)}
            </div>
          </div>
          <div class="form-group">
            <div class="f-label">水位(一反)</div>
            <div class="toggle-group">
              ${['高', '適', '低'].map(opt => html`
                <button key=${opt} type="button"
                  class=${`toggle-btn ${eval2 === opt ? 'active' : ''}`}
                  onClick=${() => setEval2(eval2 === opt ? '' : opt)}>${opt}</button>
              `)}
            </div>
          </div>
          <div class="form-group">
            <div class="f-label">カイヌマ疎水</div>
            <div class="toggle-group">
              ${['通常', '弱い', 'ほぼなし'].map(opt => html`
                <button key=${opt} type="button"
                  class=${`toggle-btn ${streamStatus === opt ? 'active' : ''}`}
                  onClick=${() => setStreamStatus(streamStatus === opt ? '' : opt)}>${opt}</button>
              `)}
            </div>
          </div>
          <div class="form-group">
            <div class="f-label">本文</div>
            <textarea class="f-input f-textarea"
              value=${freeNote} onChange=${e => setFreeNote(e.target.value)}/>
          </div>
        `}
        ${item.type === 'facility' && html`
          <div class="form-group">
            <div class="f-label">動作</div>
            <div class="toggle-group">
              ${['開けた', '閉めた'].map(opt => html`
                <button key=${opt} type="button"
                  class=${`toggle-btn ${opAction === opt ? 'active' : ''}`}
                  onClick=${() => setOpAction(opAction === opt ? '' : opt)}>${opt}</button>
              `)}
            </div>
          </div>
          <div class="form-group">
            <div class="f-label">理由・メモ</div>
            <textarea class="f-input f-textarea"
              value=${opReason} onChange=${e => setOpReason(e.target.value)}/>
          </div>
        `}
        ${item.type === 'note' && html`
          <div class="form-group">
            <div class="f-label">本文</div>
            <textarea class="f-input f-textarea"
              value=${noteContent} onChange=${e => setNoteContent(e.target.value)}/>
          </div>
        `}
      </div>
      <div class="post-edit-actions">
        <button class="btn-ghost" type="button" onClick=${onCancel} disabled=${busy}>キャンセル</button>
        <button class="btn-primary" type="button" onClick=${handleSave} disabled=${busy}>
          ${busy ? '保存中…' : '保存'}
        </button>
      </div>
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
