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
import { PaddyIllustration } from '../components/PaddyIllustration.js';
import { WaterPlanChart } from '../components/WaterPlanChart.js';
import { currentWaterStage } from '../data/water_plan.js';
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
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [editTransplant, setEditTransplant] = useState(false);
  const [transplantEdit, setTransplantEdit] = useState({});

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

  // 田植え日を編集モードに切り替えたとき、現在値で初期化
  useEffect(() => {
    if (phenology && editTransplant) {
      const o = {};
      phenology.forEach(p => { o[p.paddy_key] = p.transplant_date || ''; });
      setTransplantEdit(o);
    }
  }, [editTransplant, phenology]);

  const saveTransplant = async () => {
    try {
      for (const p of (phenology || [])) {
        const newVal = transplantEdit[p.paddy_key] || '';
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
      setEditTransplant(false);
      flash('田植え日を更新しました');
    } catch (err) {
      flash(`更新失敗: ${err.message}`);
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

  // 田植え日(三畝・一反は同じ前提で1つ目を使う)
  const transplantYmd = phenology && phenology.length > 0 ? phenology[0].transplant_date : '';
  const currentStage = transplantYmd ? currentWaterStage(transplantYmd) : null;

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

        <!-- 今の目安:苗イラスト + 段階ラベル + 水位プラン -->
        <section class="meyasu-card">
          <div class="meyasu-row meyasu-row-v2">
            <div class="meyasu-visual">
              <${PaddyIllustration} waterLevel=${stageToLevel(currentStage)} />
            </div>
            <div class="meyasu-text">
              <div class="meyasu-label">目 安</div>
              <div class="meyasu-main-v2">${currentStage ? currentStage.label : '田植え日未設定'}</div>
              ${currentStage && html`<div class="meyasu-sub">田植え${currentStage.days_since_transplant}日目</div>`}
            </div>
          </div>
          <${WaterPlanChart} transplantYmd=${transplantYmd} />

          <!-- 田植え日編集ボタン -->
          <div class="meyasu-edit-row">
            ${editTransplant
              ? html`
                <div class="transplant-edit">
                  ${(phenology || []).map(p => html`
                    <div class="transplant-edit-row" key=${p.paddy_key}>
                      <span class="transplant-edit-label">${p.paddy_name}</span>
                      <input type="date" class="f-input f-date"
                        value=${transplantEdit[p.paddy_key] || ''}
                        onChange=${e => setTransplantEdit({...transplantEdit, [p.paddy_key]: e.target.value})}/>
                    </div>
                  `)}
                  <div class="transplant-edit-actions">
                    <button class="btn-ghost" onClick=${() => setEditTransplant(false)}>キャンセル</button>
                    <button class="btn-primary" onClick=${saveTransplant}>保存</button>
                  </div>
                </div>
              `
              : html`<button class="meyasu-edit-link" onClick=${() => setEditTransplant(true)}>田植え日を編集</button>`
            }
          </div>
        </section>

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
function PostCard({ item, onEdit, onDelete, onPhotoClick }) {
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
    if (v.water_level_eval) tags.push(`三畝 ${evalSymbol(v.water_level_eval)}`);
    if (v.field2_eval)      tags.push(`一反 ${evalSymbol(v.field2_eval)}`);
    if (v.stream_status)    tags.push(`疎水 ${v.stream_status}`);
  } else if (item.type === 'facility') {
    tags.push(`${v.target}${v.action ? ' ' + v.action : ''}`);
  }

  // 本文
  let body = '';
  if (item.type === 'visit')        body = v.free_note || '';
  else if (item.type === 'facility') body = v.reason || v.coordination_note || '';
  else if (item.type === 'note')     body = v.content || v.body || '';

  const avatarUrl = avatarFor(item.by);
  const colorClass = cardColorClass(item.ts);
  return html`
    <article class=${`post ${colorClass}`}>
      <header class="post-head">
        ${avatarUrl
          ? html`<img class="post-avatar-img" src=${avatarUrl} alt=${item.by}/>`
          : html`<div class="post-avatar">${initial}</div>`
        }
        <div class="post-meta">
          <div class="post-by">${item.by}</div>
          <div class="post-time">${formatShort(item.ts)}</div>
        </div>
      </header>

      ${photos.length > 0 && html`
        <div class=${`post-photos count-${photos.length}`}>
          ${photos.map(p => html`
            <div class="post-photo-cell" key=${p.url}
              onClick=${() => onPhotoClick && onPhotoClick(p.url)}>
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

function stageToLevel(stage) {
  if (!stage) return 0.5;
  const cm = stage.depth_cm || 0;
  return Math.min(1, cm / 5);
}