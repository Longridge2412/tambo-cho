/**
 * 投稿のインライン編集フォーム(共通)
 *
 * Home / Calendar の両方で使う。
 * item は services/feed.js のグループ { key, ts, by, parts: {visit?, facility?, note?} }。
 * グループに含まれる部分だけ編集欄を出す:
 *   - visit:    三畝/一反水位 + カイヌマ疎水 + 本文
 *   - facility: 開けた/閉めた + 理由・メモ
 *   - note:     本文
 *
 * 保存時は onSave(item, updatesByType) を呼ぶ。
 *   updatesByType = { visit?: {...}, facility?: {...}, note?: {...} }
 */

const { createElement: h, useState } = React;
const html = htm.bind(h);

import { ToggleGroup } from './ToggleGroup.js';

export function EditPost({ item, onSave, onCancel }) {
  const { visit, facility, note } = item.parts;

  const [eval1, setEval1]               = useState(visit ? (visit.water_level_eval || '') : '');
  const [eval2, setEval2]               = useState(visit ? (visit.field2_eval || '') : '');
  const [streamStatus, setStreamStatus] = useState(visit ? (visit.stream_status || '') : '');
  const [freeNote, setFreeNote]         = useState(visit ? (visit.free_note || '') : '');
  const [opAction, setOpAction]         = useState(facility ? (facility.action || '') : '');
  const [opReason, setOpReason]         = useState(facility ? (facility.reason || '') : '');
  const [noteContent, setNoteContent]   = useState(note ? (note.content || note.body || '') : '');
  const [busy, setBusy]                 = useState(false);

  const handleSave = async () => {
    setBusy(true);
    const updates = {};
    if (visit) {
      updates.visit = {
        water_level_eval: eval1, field2_eval: eval2,
        stream_status: streamStatus, free_note: freeNote
      };
    }
    if (facility) {
      updates.facility = { action: opAction, reason: opReason };
    }
    if (note) {
      updates.note = { content: noteContent };
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
        ${visit && html`
          <div class="form-group">
            <div class="f-label">水位(三畝)</div>
            <${ToggleGroup} options=${['高', '適', '低']} value=${eval1} onChange=${setEval1} />
          </div>
          <div class="form-group">
            <div class="f-label">水位(一反)</div>
            <${ToggleGroup} options=${['高', '適', '低']} value=${eval2} onChange=${setEval2} />
          </div>
          <div class="form-group">
            <div class="f-label">カイヌマ疎水</div>
            <${ToggleGroup} options=${['通常', '弱い', 'ほぼなし']} value=${streamStatus} onChange=${setStreamStatus} />
          </div>
          <div class="form-group">
            <div class="f-label">本文</div>
            <textarea class="f-input f-textarea"
              value=${freeNote} onChange=${e => setFreeNote(e.target.value)}/>
          </div>
        `}
        ${facility && html`
          <div class="form-group">
            <div class="f-label">${facility.target || '堤'} の動作</div>
            <${ToggleGroup} options=${['開けた', '閉めた']} value=${opAction} onChange=${setOpAction} />
          </div>
          <div class="form-group">
            <div class="f-label">理由・メモ</div>
            <textarea class="f-input f-textarea"
              value=${opReason} onChange=${e => setOpReason(e.target.value)}/>
          </div>
        `}
        ${note && html`
          <div class="form-group">
            <div class="f-label">${visit || facility ? '覚書' : '本文'}</div>
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
