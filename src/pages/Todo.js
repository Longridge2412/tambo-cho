/**
 * Todo 画面
 *
 *   - 未完了 Todo 一覧(期日昇順、なし=末尾)
 *   - 完了済みは折りたたみで直近のみ表示
 *   - 新規追加(テキスト + 任意の期日)
 *   - 各行は編集可能(内容・期日)
 *   - 完了済みは「戻す」で未完了に
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh.js';

function ymdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function ymdToMd(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return s;
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function dueLabel(s) {
  if (!s) return '';
  const t = new Date(ymdToday() + 'T00:00:00');
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return ymdToMd(s);
  const diff = Math.round((d - t) / 86400000);
  if (diff < 0) return `${ymdToMd(s)} (${-diff}日過ぎ)`;
  if (diff === 0) return `${ymdToMd(s)} (今日)`;
  if (diff === 1) return `${ymdToMd(s)} (明日)`;
  return ymdToMd(s);
}

export function TodoPage() {
  const [members, setMembers] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [memberId, setMemberId] = useState('');
  const [membersLoading, setMembersLoading] = useState(true);

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newText, setNewText] = useState('');
  const [newDue, setNewDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // 編集中の todo_id 1つ + 編集中の値
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDue, setEditDue] = useState('');

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const refresh = async () => {
    const list = await api.listTodos();
    setTodos(list);
  };

  useEffect(() => {
    Promise.all([api.listMembers(), api.listTodos()])
      .then(([m, t]) => {
        setMembers(m);
        const mm = {}; m.forEach(x => { mm[x.member_id] = x.display_name; });
        setMemberMap(mm);
        setTodos(t);
        setMembersLoading(false);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); setMembersLoading(false); });
  }, []);

  // 画面復帰時の自動再取得
  useVisibilityRefresh(async () => {
    try {
      const t = await api.listTodos();
      setTodos(t);
    } catch (err) {
      console.warn('todo refresh failed:', err);
    }
  });

  const handleAdd = async () => {
    if (!newText.trim()) { setError('内容を入れてください'); return; }
    setBusy(true);
    setError(null);
    try {
      await api.addTodo({
        content: newText.trim(),
        due_date: newDue || '',
        created_by: memberId || ''
      });
      setNewText('');
      setNewDue('');
      await refresh();
      flash('追加しました');
    } catch (err) {
      setError(`追加失敗: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (todo_id) => {
    if (!todo_id) {
      const keys = todos[0] ? Object.keys(todos[0]).join(', ') : '(空)';
      setError('完了処理失敗:Todo の ID が読めません。todos シートの1行目の列名を確認してください(期待: todo_id)。現状のキー: ' + keys);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.completeTodo({ todo_id, completed_by: memberId || '' });
      await refresh();
      flash('完了にしました');
    } catch (err) {
      setError(`完了処理失敗: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async (todo_id) => {
    if (!todo_id) { setError('戻す処理失敗:Todo の ID が読めません'); return; }
    setBusy(true);
    setError(null);
    try {
      await api.updateTodo({ todo_id, status: 'open' });
      await refresh();
      flash('未完了に戻しました');
    } catch (err) {
      setError(`戻す処理失敗: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (t) => {
    setEditingId(t.todo_id);
    setEditContent(t.content || '');
    setEditDue(t.due_date || '');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditDue('');
  };
  const saveEdit = async () => {
    if (!editContent.trim()) { setError('内容を入れてください'); return; }
    setBusy(true);
    setError(null);
    try {
      await api.updateTodo({
        todo_id: editingId,
        content: editContent.trim(),
        due_date: editDue || ''
      });
      await refresh();
      cancelEdit();
      flash('更新しました');
    } catch (err) {
      setError(`更新失敗: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return html`<div class="loading"><div class="loading-text">読み込み中</div></div>`;
  if (error && todos.length === 0) return html`
    <div class="error-screen">
      <div class="error-title">うまく読み込めませんでした</div>
      <div class="error-detail">${error}</div>
      <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
    </div>
  `;

  // 並び替え:未完了は due_date 昇順、空は最後
  const open = todos
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  // 完了は completed_at 降順、直近10件
  const done = todos
    .filter(t => t.status === 'done')
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .slice(0, 10);

  // 編集中の行を描画
  const renderEditRow = (t, isDone) => html`
    <div class=${`todo-row ${isDone ? 'done' : ''} editing`} key=${t.todo_id}>
      <div class="todo-edit-body">
        <input type="text" class="f-input"
          value=${editContent}
          onChange=${e => setEditContent(e.target.value)}
          placeholder="内容"/>
        <div class="todo-add-row">
          <label class="todo-add-due-label">期日</label>
          <input type="date" class="f-input f-date"
            value=${editDue}
            onChange=${e => setEditDue(e.target.value)}/>
        </div>
        <div class="todo-edit-actions">
          <button class="btn-ghost" disabled=${busy} onClick=${cancelEdit}>キャンセル</button>
          <button class="btn-primary" disabled=${busy} onClick=${saveEdit}>保存</button>
        </div>
      </div>
    </div>
  `;

  return html`
    <div class="screen">
      <${Header} title="T o d o" subtitle="忘れない・つみのこさない" />

      <main class="screen-body">

        <!-- あなた -->
        <div class="duty-operator">
          <span class="duty-operator-label">あ な た</span>
          <select class="f-input f-select duty-operator-select"
            value=${memberId}
            disabled=${membersLoading}
            onChange=${e => setMemberId(e.target.value)}>
            <option value="">${membersLoading ? '読み込み中…' : '── 選択 ──'}</option>
            ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
          </select>
        </div>

        <!-- 未完了 -->
        <section class="todo-list">
          ${open.length === 0
            ? html`<div class="empty-note">未完了のTodoはありません</div>`
            : open.map(t => editingId === t.todo_id
              ? renderEditRow(t, false)
              : html`
                <div class="todo-row" key=${t.todo_id}>
                  <button type="button" class="todo-check"
                    disabled=${busy}
                    aria-label="完了"
                    onClick=${() => handleComplete(t.todo_id)}>○</button>
                  <div class="todo-body">
                    <div class="todo-text">${t.content}</div>
                    <div class="todo-meta">
                      ${t.due_date && html`<span class="todo-due">${dueLabel(t.due_date)}</span>`}
                      ${t.created_by && html`<span class="todo-by">${memberMap[t.created_by] || ''}</span>`}
                    </div>
                  </div>
                  <button type="button" class="todo-edit-btn"
                    disabled=${busy}
                    onClick=${() => startEdit(t)}>編集</button>
                </div>
              `)
          }
        </section>

        <!-- 完了済み(折りたたみ) -->
        ${done.length > 0 && html`
          <details class="todo-done-section">
            <summary>完了済み <span class="compose-sub">直近${done.length}件</span></summary>
            <div class="compose-section-body">
              ${done.map(t => editingId === t.todo_id
                ? renderEditRow(t, true)
                : html`
                  <div class="todo-row done" key=${t.todo_id}>
                    <button type="button" class="todo-check done"
                      disabled=${busy}
                      aria-label="未完了に戻す"
                      title="未完了に戻す"
                      onClick=${() => handleReopen(t.todo_id)}>✓</button>
                    <div class="todo-body">
                      <div class="todo-text">${t.content}</div>
                      <div class="todo-meta">
                        ${t.completed_at && html`<span class="todo-due">${ymdToMd(t.completed_at.slice(0,10))} 完了</span>`}
                        ${t.completed_by && html`<span class="todo-by">${memberMap[t.completed_by] || ''}</span>`}
                      </div>
                    </div>
                    <button type="button" class="todo-edit-btn"
                      disabled=${busy}
                      onClick=${() => startEdit(t)}>編集</button>
                  </div>
                `)}
            </div>
          </details>
        `}

        <!-- 新規追加 -->
        <section class="todo-add">
          <div class="f-label">＋ 新しいTodo</div>
          <input type="text" class="f-input"
            value=${newText}
            onChange=${e => setNewText(e.target.value)}
            placeholder="例: 水もれの穴をふさぐ"/>
          <div class="todo-add-row">
            <label class="todo-add-due-label">期日(任意)</label>
            <input type="date" class="f-input f-date"
              value=${newDue}
              onChange=${e => setNewDue(e.target.value)}/>
          </div>
          <button class="btn-primary" disabled=${busy} onClick=${handleAdd}>追加する</button>
        </section>

        ${error && html`<div class="form-error">${error}</div>`}
        ${msg && html`<div class="duty-flash">${msg}</div>`}

      </main>

      <${BottomNav} current="#/todo" />
    </div>
  `;
}
