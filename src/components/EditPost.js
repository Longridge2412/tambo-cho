/**
 * 投稿のインライン編集フォーム(共通)
 *
 * Home / Calendar の両方で使う。
 * 投稿タイプ別に編集可能な項目:
 *   - visit: 三畝/一反水位 + カイヌマ疎水 + 本文
 *   - facility: 開けた/閉めた + 理由・メモ
 *   - note: 本文
 */

const { createElement: h, useState } = React;
const html = htm.bind(h);

export function EditPost({ item, onSave, onCancel }) {
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
