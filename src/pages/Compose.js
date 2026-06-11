/**
 * 共有(投稿作成)画面 — #/compose
 *
 * 統合フォーム。すべての項目は任意。
 *   - 自由メモ(+任意の写真)
 *   - 水位(三畝/一反) + 写真2枚 + カイヌマ疎水
 *   - 堤の操作(開けた/閉めた)
 *   - Todo 追加
 *
 * 送信は GAS の addPost 1回にまとめる(従来は最大4回直列だった)。
 * 作られたレコードには共通の batch_id が付き、ホームでは1カードに統合表示される。
 * 途中失敗時は GAS が「どこまで保存されたか」をエラー文言で返す。
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { compressImageToDataUrl, buildComposeShareText, copyToClipboard } from '../utils.js';
import { getCurrentUser, setCurrentUser } from '../services/currentUser.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';
import { ToggleGroup } from '../components/ToggleGroup.js';

export function ComposePage() {
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  // 前回使った「あなた」を初期選択(堤リマインダーと同じ localStorage を共用)
  const [memberId, setMemberId] = useState(getCurrentUser());

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

  const updateMember = (id) => {
    setMemberId(id);
    if (id) setCurrentUser(id);
  };

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
    try {
      const hasMemoPhoto = !!memoPhotoFile;
      const memoText = memo.trim();
      const visitFilled = hasVisit();
      const facilityFilled = hasFacility();

      // メモは1か所だけに収める(ホームでは batch_id で1カードに見えるため、
      // どこに入っても表示は同じ。データ上の置き場所のルール):
      //   写真あり → 覚書 / 見回りあり → free_note / 堤のみ → reason / 単独 → 覚書
      let memoTarget = 'none';
      if (hasMemoPhoto)                    memoTarget = 'note';
      else if (memoText && visitFilled)    memoTarget = 'visit';
      else if (memoText && facilityFilled) memoTarget = 'facility';
      else if (memoText)                   memoTarget = 'note';

      // 一括送信ペイロードを組み立て
      const payload = { member_id: memberId };
      let recVisit = null, recFacility = null, recNote = null, recTodo = null;

      if (visitFilled) {
        const p1 = photoFile1 ? await compressImageToDataUrl(photoFile1) : null;
        const p2 = photoFile2 ? await compressImageToDataUrl(photoFile2) : null;
        const visitFreeNote = (memoTarget === 'visit') ? memoText : '';
        payload.visit = {
          water_level_eval: eval1 || '',
          field2_eval: eval2 || '',
          stream_status: streamStatus || '',
          free_note: visitFreeNote,
          photo_data_url: p1,
          field2_photo_data_url: p2
        };
        recVisit = {
          water_level_eval: eval1 || '', field2_eval: eval2 || '',
          stream_status: streamStatus || '', free_note: visitFreeNote,
          photos: (p1 ? 1 : 0) + (p2 ? 1 : 0)
        };
      }
      if (facilityFilled) {
        const opReason = (memoTarget === 'facility') ? memoText : '';
        payload.facility = {
          target: '堤',
          action: opAction,
          reason: opReason,
          coordination_note: ''
        };
        recFacility = { action: opAction, reason: opReason };
      }
      if (memoTarget === 'note') {
        const mp = memoPhotoFile ? await compressImageToDataUrl(memoPhotoFile) : null;
        payload.note = { content: memoText, photo_data_url: mp };
        recNote = { content: memoText, has_photo: !!mp };
      }
      if (todoText.trim()) {
        payload.todo = { content: todoText.trim(), due_date: todoDue || '' };
        recTodo = { content: todoText.trim(), due_date: todoDue || '' };
      }

      // 1回の POST でまとめて保存
      const res = await api.addPost(payload);

      const memberName = members.find(m => m.member_id === memberId)?.display_name || '';
      const shareText = buildComposeShareText({
        memberName,
        visit: recVisit,
        facility: recFacility,
        note: recNote,
        todo: recTodo
      });
      setSubmitted({ created: res.created || [], shareText, memberName });
    } catch (err) {
      setError(`送信失敗: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return html`<${SubmittedView} data=${submitted} />`;
  }

  return html`
    <div class="screen">
      <${Header} title="共 有" subtitle="入っているものだけ 送る" />

      <main class="screen-body">
        <section class="form-section">

          <!-- 名前(必須・前回の選択を記憶) -->
          <div class="form-group">
            <div class="f-label">名 前</div>
            <select class="f-input f-select" value=${memberId}
              disabled=${membersLoading}
              onChange=${e => updateMember(e.target.value)}>
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
                <${ToggleGroup} options=${['高', '適', '低']} value=${eval1} onChange=${setEval1} />
              </div>

              ${photoBlock(2, '一 反 の 田', photoPreview2, handlePhoto)}
              <div class="form-group">
                <div class="f-label">水 位 (一反)</div>
                <${ToggleGroup} options=${['高', '適', '低']} value=${eval2} onChange=${setEval2} />
              </div>

              <div class="form-group">
                <div class="f-label">カ イ ヌ マ 疎 水</div>
                <${ToggleGroup} options=${['通常', '弱い', 'ほぼなし']} value=${streamStatus} onChange=${setStreamStatus} />
              </div>
            </div>
          </details>

          <!-- 堤の開け閉め -->
          <details class="compose-section">
            <summary>堤 の 開 け 閉 め <span class="compose-sub">任意</span></summary>
            <div class="compose-section-body">
              <div class="form-group">
                <${ToggleGroup} options=${['開けた', '閉めた']} value=${opAction} onChange=${setOpAction} />
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

function SubmittedView({ data }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(data.shareText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return html`
    <div class="screen">
      <${Header} title="共 有 完 了" />

      <main class="screen-body">
        <section class="success-card">
          <div class="success-mark">了</div>
          <div class="success-text">
            ${data.memberName ? data.memberName + ' の' : ''}
            ${data.created.length === 0 ? '投稿' : data.created.join(' と ')}
            を記録しました
          </div>
        </section>

        <section class="share-card">
          <div class="share-head">
            <div class="share-title">L I N E に 報 告</div>
            <div class="share-sub">下のテキストをコピーして<br/>全体LINEに貼り付けてください</div>
          </div>
          <pre class="share-text">${data.shareText}</pre>
          <button class="btn-primary" onClick=${handleCopy}>
            ${copied ? '✓ コピーしました' : 'テキストをコピー'}
          </button>
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
