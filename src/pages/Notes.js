/**
 * 覚書画面(自由ノート)
 *
 * 構成:
 *   - 留め書き(ピン留め)セクション
 *   - その他の覚書セクション
 *   - FAB「書く」→ 入力フォーム
 *
 * 日付に縛られない長期的メモ。全員が編集可能。
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { formatShort } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

// pinned はシートから true / 'true' / 'TRUE' のいずれかで返り得るので吸収
function isPinned(note) {
  return note.pinned === true || note.pinned === 'true' || note.pinned === 'TRUE';
}

// 1件のノート表示
function NoteCard({ note, name, pinned }) {
  return html`
    <div class=${`note-card ${pinned ? 'pinned' : ''}`}>
      ${pinned && html`<div class="note-pin">留</div>`}
      <div class="note-content">${note.content}</div>
      <div class="note-meta">
        ${name && html`<span class="note-by">${name}</span>`}
        <span class="note-date">${formatShort(note.updated_at || note.created_at)}</span>
      </div>
    </div>
  `;
}

export function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [composing, setComposing] = useState(false);

  // 入力フォーム
  const [content, setContent] = useState('');
  const [memberId, setMemberId] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.listNotes(), api.listMembers()])
      .then(([notesData, membersData]) => {
        setNotes(notesData);
        setMembers(membersData);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const memberName = (id) => {
    const m = members.find(mm => mm.member_id === id);
    return m ? m.display_name : (id || '');
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('内容を書いてください');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.addNote({
        content: content.trim(),
        created_by: memberId,
        pinned: pinned
      });
      const updated = await api.listNotes();
      setNotes(updated);
      setContent('');
      setPinned(false);
      setMemberId('');
      setComposing(false);
    } catch (err) {
      setError(`送信失敗: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return html`<div class="loading"><div class="loading-mark">覚</div><div class="loading-text">読み込み中</div></div>`;
  }

  if (error && !composing) {
    return html`
      <div class="error-screen">
        <div class="error-title">うまく読み込めませんでした</div>
        <div class="error-detail">${error}</div>
        <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
      </div>
    `;
  }

  // ── 入力フォーム画面 ──
  if (composing) {
    return html`
      <div class="screen">
        <${Header} title="覚 書 を 記 す" />
        <main class="screen-body">
          <section class="form-section">

            <div class="form-group">
              <div class="f-label">覚 え 書 き</div>
              <textarea
                class="f-input f-textarea note-textarea"
                value=${content}
                onInput=${e => setContent(e.target.value)}
                placeholder=${`例:\n・中干しは6月末から7月20日まで\n・水路掃除は◯日\n・健さんの連絡先`}
              />
            </div>

            <div class="form-group">
              <div class="f-label">名 前 <span class="f-hint">任意</span></div>
              <select class="f-input f-select" value=${memberId} onChange=${e => setMemberId(e.target.value)}>
                <option value="">── 選択 ──</option>
                ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
              </select>
            </div>

            <div class="form-group">
              <div class="f-label">留 め 書 き</div>
              <div class="pin-toggle-row">
                <button type="button"
                  class=${`toggle-btn ${pinned ? 'active' : ''}`}
                  onClick=${() => setPinned(!pinned)}>
                  ${pinned ? '✓ 上に留める' : '上に留める'}
                </button>
              </div>
              <div class="pin-hint">大事な覚書は、一覧の上に固定できます</div>
            </div>

            ${error && html`<div class="form-error">${error}</div>`}

            <button class="btn-primary" onClick=${handleSubmit} disabled=${submitting}>
              ${submitting ? '記 し て い ま す...' : '記 す'}
            </button>
            <button class="btn-ghost" onClick=${() => { setComposing(false); setError(null); }}>
              やめる
            </button>

          </section>
        </main>
        <${BottomNav} current="#/notes" />
      </div>
    `;
  }

  // ── 一覧画面 ──
  const pinnedNotes = notes.filter(isPinned);
  const otherNotes = notes.filter(n => !isPinned(n));

  return html`
    <div class="screen">
      <${Header} title="覚 書" subtitle="日付に縛られない 留め書き" />
      <main class="screen-body">

        ${pinnedNotes.length > 0 && html`
          <section class="section">
            <div class="sec-head">
              <div class="sec-mark"></div>
              <div class="sec-title">留 め 書 き</div>
              <div class="sec-line"></div>
            </div>
            ${pinnedNotes.map(n => html`
              <${NoteCard} key=${n.note_id} note=${n} name=${memberName(n.created_by)} pinned=${true} />
            `)}
          </section>
        `}

        <section class="section">
          <div class="sec-head">
            <div class="sec-mark"></div>
            <div class="sec-title">覚 書</div>
            <div class="sec-line"></div>
          </div>
          ${otherNotes.length > 0
            ? otherNotes.map(n => html`
              <${NoteCard} key=${n.note_id} note=${n} name=${memberName(n.created_by)} pinned=${false} />
            `)
            : html`<div class="empty-note">まだ覚書がありません</div>`
          }
        </section>

      </main>

      <button class="fab" onClick=${() => setComposing(true)} aria-label="覚書を書く">
        <span class="fab-mark">筆</span>
        <span class="fab-label">書く</span>
      </button>

      <${BottomNav} current="#/notes" />
    </div>
  `;
}
