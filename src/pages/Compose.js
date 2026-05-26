/**
 * 共有(投稿作成)画面 — #/compose
 *
 * 統合フォーム。すべての項目は任意。
 *   - 自由メモ
 *   - 水位(三畝/一反) + 写真2枚 + カイヌマ疎水 → 入っていれば addVisit
 *   - 堤の操作(対象/動作/理由) → 入っていれば addFacilityOp
 *   - いずれも無く自由メモだけ → addNote
 *   - 上記併用も可(複数APIを順に呼ぶ)
 *   - Todo追加 はPhase Bで実装。今はプレースホルダ表示。
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { compressImageToDataUrl } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

export function ComposePage() {
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberId, setMemberId] = useState('');

  const [memo, setMemo] = useState('');
  const [memoPhotoFile, setMemoPhotoFile] = useState(null);
  const [memoPhotoPreview, setMemoPhotoPreview] = useState(null);

  // 水位セクション
  const [eval1, setEval1] = useState('');
  const [eval2, setEval2] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const [photoFile1, setPhotoFile1] = useState(null);
  const [photoPreview1, setPhotoPreview1] = useState(null);
  const [photoFile2, setPhotoFile2] = useState(null);
  const [photoPreview2, setPhotoPreview2] = useState(null);

  // 堤の開け閉め
  const [opAction, setOpAction] = useState('');  // '' / '開けた' / '閉めた'

  // Todo
  const [todoText, setTodoText] = useState('');
  const [todoDue, setTodoDue] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    api.listMembers()
      .then(d => { setMembers(d); setMembersLoading(false); })
      .catch(err => { setError(`メンバー取得失敗: ${err.message}`); setMembersLoading(false); });
  }, []);

  const handlePhoto = (field, e) => {
    const file = e.target.files[0];
    let setFile, setPrev;
    if (field === 1) { setFile = setPhotoFile1; setPrev = setPhotoPreview1; }
    else if (field === 2) { setFile = setPhotoFile2; setPrev = setPhotoPreview2; }
    else if (field === 'memo') { setFile = setMemoPhotoFile; setPrev = setMemoPhotoPreview; }
    else return;
    if (!file) { setFile(null); setPrev(null); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPrev(ev.target.result);
    reader.readAsDataURL(file);
  };

  const hasVisit = () =>
    !!(eval1 || eval2 || streamStatus || photoFile1 || photoFile2);
  const hasFacility = () => !!opAction;  // 開けた/閉めたが選ばれていれば対象は堤

  const handleSubmit = async () => {
    if (!memberId) { setError('名前を選んでください'); return; }
    if (!hasVisit() && !hasFacility() && !memo.trim() && !memoPhotoFile && !todoText.trim()) {
      setError('何か1つは入力してください');
      return;
    }
    setSubmitting(true);
    setError(null);
    const created = [];
    try {
      // メモに写真がある場合は、メモ全体(テキスト+写真)を「覚書」として独立保存。
      // visit/facility の free_note には memo を入れない。
      const hasMemoPhoto = !!memoPhotoFile;
      const memoText = memo.trim();

      // 1) 見回りパート
      if (hasVisit()) {
        let p1 = null, p2 = null;
        if (photoFile1) p1 = await compressImageToDataUrl(photoFile1);
        if (photoFile2) p2 = await compressImageToDataUrl(photoFile2);
        await api.addVisit({
          member_id: memberId,
          water_level_eval: eval1 || '',
          field2_eval: eval2 || '',
          stream_status: streamStatus || '',
          free_note: hasMemoPhoto ? '' : memoText,
          photo_data_url: p1,
          field2_photo_data_url: p2
        });
        created.push('見回り');
      }
      // 2) 堤の開け閉めパート
      if (hasFacility()) {
        await api.addFacilityOp({
          member_id: memberId,
          target: '堤',
          action: opAction,
          reason: hasMemoPhoto ? '' : memoText,
          coordination_note: ''
        });
        created.push('堤の操作');
      }
      // 3) 覚書(メモ写真があれば必ず、無くて visit/facility も無くてテキストがあるとき)
      if (hasMemoPhoto || (!hasVisit() && !hasFacility() && memoText)) {
        let mp = null;
        if (memoPhotoFile) mp = await compressImageToDataUrl(memoPhotoFile);
        await api.addNote({
          created_by: memberId,
          content: memoText,
          photo_data_url: mp
        });
        created.push('覚書');
      }
      // 4) Todo 追加
      if (todoText.trim()) {
        await api.addTodo({
          content: todoText.trim(),
          due_date: todoDue || '',
          created_by: memberId
        });
        created.push('Todo');
      }

      setSubmitted({ created, count: created.length });
    } catch (err) {
      setError(`送信失敗: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return html`
      <div class="screen">
        <${Header} title="共 有 完 了" />
        <main class="screen-body">
          <section class="success-card">
            <div class="success-mark">了</div>
            <div class="success-text">
              ${submitted.created.length === 0
                ? html`送信しました`
                : html`${submitted.created.join(' と ')} を記録しました`
              }
            </div>
          </section>
          <div class="action-row">
            <a class="btn-ghost" href="#/">ホームへ</a>
            <button class="btn-ghost" onClick=${() => window.location.reload()}>続けて投稿する</button>
          </div>
        </main>
        <${BottomNav} current="#/compose" />
      </div>
    `;
  }

  return html`
    <div class="screen">
      <${Header} title="共 有" subtitle="入っているものだけ 送る" />

      <main class="screen-body">
        <section class="form-section">

          <!-- 名前(必須) -->
          <div class="form-group">
            <div class="f-label">名 前</div>
            <select class="f-input f-select" value=${memberId}
              disabled=${membersLoading}
              onChange=${e => setMemberId(e.target.value)}>
              <option value="">${membersLoading ? '読み込み中…' : '── 選択 ──'}</option>
              ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
            </select>
            ${membersLoading && html`<div class="f-loading-hint">名前リストを読み込んでいます…</div>`}
          </div>

          <!-- 自由メモ + 任意の写真 -->
          <div class="form-group">
            <div class="f-label">メ モ <span class="f-hint">任意</span></div>
            <textarea
              class="f-input f-textarea"
              value=${memo}
              onChange=${e => setMemo(e.target.value)}
              placeholder=${`今日の様子・気づき・誰かに言われたこと…`}
            />
            <div class="memo-photo-wrap">
              ${memoPhotoPreview
                ? html`
                  <div class="photo-preview memo-photo-preview" onClick=${() => document.getElementById('photo-memo').click()}>
                    <img src=${memoPhotoPreview} alt="プレビュー"/>
                    <div class="photo-preview-overlay">タップで変更</div>
                  </div>
                `
                : html`
                  <label class="photo-up memo-photo-up" for="photo-memo">
                    <div class="photo-up-icon">+</div>
                    <div class="photo-up-label">メ モ に 写 真 を 添 え る</div>
                    <div class="photo-up-hint">任意 ・ 1 枚</div>
                  </label>
                `
              }
              <input id="photo-memo" type="file" accept="image/*"
                onChange=${e => handlePhoto('memo', e)} style=${{display: 'none'}}/>
            </div>
          </div>

          <!-- 水位(任意) -->
          <details class="compose-section">
            <summary>水 位 と 写 真 <span class="compose-sub">任意</span></summary>
            <div class="compose-section-body">
              ${photoBlock(1, '三 畝 の 田', photoPreview1, handlePhoto)}
              <div class="form-group">
                <div class="f-label">水 位 (三畝)</div>
                <div class="toggle-group">
                  ${['高', '適', '低'].map(opt => html`
                    <button key=${opt} type="button"
                      class=${`toggle-btn ${eval1 === opt ? 'active' : ''}`}
                      onClick=${() => setEval1(eval1 === opt ? '' : opt)}>${opt}</button>
                  `)}
                </div>
              </div>

              ${photoBlock(2, '一 反 の 田', photoPreview2, handlePhoto)}
              <div class="form-group">
                <div class="f-label">水 位 (一反)</div>
                <div class="toggle-group">
                  ${['高', '適', '低'].map(opt => html`
                    <button key=${opt} type="button"
                      class=${`toggle-btn ${eval2 === opt ? 'active' : ''}`}
                      onClick=${() => setEval2(eval2 === opt ? '' : opt)}>${opt}</button>
                  `)}
                </div>
              </div>

              <div class="form-group">
                <div class="f-label">カ イ ヌ マ 疎 水</div>
                <div class="toggle-group">
                  ${['通常', '弱い', 'ほぼなし'].map(opt => html`
                    <button key=${opt} type="button"
                      class=${`toggle-btn ${streamStatus === opt ? 'active' : ''}`}
                      onClick=${() => setStreamStatus(streamStatus === opt ? '' : opt)}>${opt}</button>
                  `)}
                </div>
              </div>
            </div>
          </details>

          <!-- 堤の開け閉め -->
          <details class="compose-section">
            <summary>堤 の 開 け 閉 め <span class="compose-sub">任意</span></summary>
            <div class="compose-section-body">
              <div class="form-group">
                <div class="toggle-group">
                  ${['開けた', '閉めた'].map(opt => html`
                    <button key=${opt} type="button"
                      class=${`toggle-btn ${opAction === opt ? 'active' : ''}`}
                      onClick=${() => setOpAction(opAction === opt ? '' : opt)}>${opt}</button>
                  `)}
                </div>
              </div>
              <div class="compose-foot-hint">どれくらい開けたか・理由・状況は上の「メモ」欄に書いてください</div>
            </div>
          </details>

          <!-- Todo 追加 -->
          <details class="compose-section">
            <summary>Todo に 追 加 <span class="compose-sub">任意</span></summary>
            <div class="compose-section-body">
              <input type="text" class="f-input"
                value=${todoText}
                placeholder="例: 水もれの穴をふさぐ"
                onChange=${e => setTodoText(e.target.value)}/>
              <div class="todo-add-row">
                <label class="todo-add-due-label">期日</label>
                <input type="date" class="f-input f-date"
                  value=${todoDue}
                  onChange=${e => setTodoDue(e.target.value)}/>
              </div>
              <div class="compose-foot-hint">入っていれば送信時にTodo一覧に追加されます</div>
            </div>
          </details>

          ${error && html`<div class="form-error">${error}</div>`}

          <button class="btn-primary" onClick=${handleSubmit} disabled=${submitting}>
            ${submitting ? '送 信 中...' : '記 す'}
          </button>

        </section>
      </main>

      <${BottomNav} current="#/compose" />
    </div>
  `;
}

function photoBlock(field, label, preview, handlePhoto) {
  return html`
    <div class="form-group">
      <div class="f-label">${label} の 写 真 <span class="f-hint">任意</span></div>
      ${preview
        ? html`
          <div class="photo-preview" onClick=${() => document.getElementById(`photo-${field}`).click()}>
            <img src=${preview} alt="プレビュー"/>
            <div class="photo-preview-overlay">タップで変更</div>
          </div>
        `
        : html`
          <label class="photo-up" for=${`photo-${field}`}>
            <div class="photo-up-icon">+</div>
            <div class="photo-up-label">写 真 を 選 ぶ</div>
            <div class="photo-up-hint">撮影 または アルバムから</div>
          </label>
        `
      }
      <input id=${`photo-${field}`} type="file" accept="image/*"
        onChange=${e => handlePhoto(field, e)} style=${{display: 'none'}}/>
    </div>
  `;
}
