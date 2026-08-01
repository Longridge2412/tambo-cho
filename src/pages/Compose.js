/**
 * 共有(投稿作成)画面 — #/compose
 *
 * 統合フォーム。すべての項目は任意。
 *   - 自由メモ(+任意の写真)
 *   - 水位(三畝/一反) + 写真2枚 + カイヌマ疎水
 *   - 堤の操作(開けた/閉めた)
 *   - Todo 追加
 *
 * 送信の流れ(2026-08 改訂 / 「写真ありだと送信失敗」対策):
 *   1. 写真は1枚ずつ uploadPhoto で先に送る(小さい通信に分割。失敗した枚だけ再送)
 *   2. 本体は addPost 1回。写真は URL だけ渡すので軽い
 *   3. batch_id はフロントで作り、再送しても同じものを使う
 *      → GAS 側が「この batch_id はもう保存済み」と判定して二重投稿を防ぐ
 *   4. 成功済みの写真URLは画面内に保持。再送で写真を上げ直さない
 *   5. 入力内容(文字・選択)は自動で下書き保存。アプリを閉じても消えない
 *
 * 作られたレコードには共通の batch_id が付き、ホームでは1カードに統合表示される。
 */

const { createElement: h, useState, useEffect, useRef } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { compressImageToDataUrl, buildComposeShareText, copyToClipboard } from '../utils.js';
import { getCurrentUser, setCurrentUser } from '../services/currentUser.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';
import { ToggleGroup } from '../components/ToggleGroup.js';

const DRAFT_KEY = 'tambo_compose_draft';
const DRAFT_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;  // 3日たった下書きは捨てる

function draftHasSomething(d) {
  return !!(d.memo || d.eval1 || d.eval2 || d.streamStatus || d.opAction || d.todoText ||
    (d.uploaded && Object.keys(d.uploaded).length));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.saved_at) return null;
    if (Date.now() - d.saved_at > DRAFT_MAX_AGE_MS) { localStorage.removeItem(DRAFT_KEY); return null; }
    return draftHasSomething(d) ? d : null;
  } catch (e) { return null; }
}

function saveDraft(d) {
  try {
    if (!draftHasSomething(d)) { localStorage.removeItem(DRAFT_KEY); return; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(Object.assign({ saved_at: Date.now() }, d)));
  } catch (e) {}
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

/** 送信1回分の識別子。再送しても同じものを使い回すことで二重投稿を防ぐ。 */
function newBatchId() {
  return 'b' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

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
  const [progress, setProgress] = useState('');     // 送信中の進捗文言
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState(false);      // 失敗後の「もう一度送る」表示用
  const [submitted, setSubmitted] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [keptPhotos, setKeptPhotos] = useState(0);   // 復元した「送信済み写真」の枚数
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);

  // 送信1回分の batch_id と、アップ済み写真URL。
  // 失敗しても保持し、再送時に「同じ batch_id」「上げ直さない写真」で送る。
  const batchIdRef = useRef(null);
  const uploadedRef = useRef({});   // { p1: url, p2: url, memo: url }

  useEffect(() => {
    api.listMembers()
      .then(d => { setMembers(d); setMembersLoading(false); })
      .catch(err => { setError(`メンバー取得失敗: ${err.message}`); setMembersLoading(false); });
  }, []);

  // 圏外/復帰の検知(送信前に気づけるように)
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // 書きかけの復元(写真そのものは復元できないが、送信済み写真のURLは引き継ぐ)
  useEffect(() => {
    const d = loadDraft();
    if (!d) return;
    if (d.memo) setMemo(d.memo);
    if (d.eval1) setEval1(d.eval1);
    if (d.eval2) setEval2(d.eval2);
    if (d.streamStatus) setStreamStatus(d.streamStatus);
    if (d.opAction) setOpAction(d.opAction);
    if (d.todoText) setTodoText(d.todoText);
    if (d.todoDue) setTodoDue(d.todoDue);
    if (d.batch_id) batchIdRef.current = d.batch_id;
    if (d.uploaded) uploadedRef.current = d.uploaded;
    setKeptPhotos(Object.keys(d.uploaded || {}).length);
    setDraftRestored(true);
  }, []);

  /** 現在の入力内容(+ アップ済み写真URL)を下書きとして保存 */
  const persistDraft = () => saveDraft({
    memo, eval1, eval2, streamStatus, opAction, todoText, todoDue,
    batch_id: batchIdRef.current,
    uploaded: uploadedRef.current
  });

  // 入力のたびに下書き保存(送信完了時に消す)
  useEffect(() => {
    if (submitted) return;
    persistDraft();
  }, [memo, eval1, eval2, streamStatus, opAction, todoText, todoDue, submitted]);

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
    // 写真を選び直したら、アップ済みURLは無効化(次の送信で上げ直す)
    const slot = (field === 'memo') ? 'memo' : ('p' + field);
    delete uploadedRef.current[slot];
    if (!file) { setFile(null); setPrev(null); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPrev(ev.target.result);
    reader.readAsDataURL(file);
  };

  const hasVisit = () =>
    !!(eval1 || eval2 || streamStatus || photoFile1 || photoFile2 ||
       uploadedRef.current.p1 || uploadedRef.current.p2);
  const hasFacility = () => !!opAction;  // 開けた/閉めたが選ばれていれば対象は堤

  /**
   * 写真を1枚だけ先に Drive へ送る。成功した URL は覚えておき、再送では上げ直さない。
   * @param {string} slot - 'p1' | 'p2' | 'memo'
   */
  const uploadOne = async (slot, file, folder, idx, count) => {
    if (!file) return '';
    if (uploadedRef.current[slot]) return uploadedRef.current[slot];

    setProgress(`写真を送っています(${idx}/${count})…`);
    const dataUrl = await compressImageToDataUrl(file);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const filename = `${stamp}_${memberId}_${slot}.jpg`;

    const res = await api.uploadPhoto(
      { data_url: dataUrl, filename: filename, folder: folder },
      { onRetry: (n) => setProgress(`写真を送っています(${idx}/${count})… 再試行 ${n} 回目`) }
    );
    uploadedRef.current[slot] = res.url;
    persistDraft();   // アプリが落ちても、送信済み写真は失わない
    return res.url;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!memberId) { setError('名前を選んでください'); return; }
    if (!hasVisit() && !hasFacility() && !memo.trim() && !memoPhotoFile && !todoText.trim()) {
      setError('何か1つは入力してください');
      return;
    }
    setSubmitting(true);
    setError(null);
    setFailed(false);
    // 再送のときは前回と同じ batch_id を使う(GAS 側が二重書き込みを弾く)
    if (!batchIdRef.current) batchIdRef.current = newBatchId();
    try {
      const hasMemoPhoto = !!memoPhotoFile || !!uploadedRef.current.memo;
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

      // ── 写真を先に1枚ずつ送る(通信を小さく分け、失敗した枚だけ再送できる)
      const photoJobs = [];
      if (visitFilled && photoFile1) photoJobs.push({ slot: 'p1', file: photoFile1, folder: '見回り写真' });
      if (visitFilled && photoFile2) photoJobs.push({ slot: 'p2', file: photoFile2, folder: '見回り写真' });
      if (memoTarget === 'note' && memoPhotoFile) photoJobs.push({ slot: 'memo', file: memoPhotoFile, folder: '覚書写真' });

      const photoUrls = {};
      for (let i = 0; i < photoJobs.length; i++) {
        const job = photoJobs[i];
        photoUrls[job.slot] = await uploadOne(job.slot, job.file, job.folder, i + 1, photoJobs.length);
      }
      // 前回の送信でアップ済み(下書きから復元した分を含む)の写真も反映
      ['p1', 'p2', 'memo'].forEach(s => {
        if (!photoUrls[s] && uploadedRef.current[s]) photoUrls[s] = uploadedRef.current[s];
      });

      setProgress('記録しています…');

      // ── 本体(写真は URL だけ)を1回で送る
      const payload = { member_id: memberId, client_batch_id: batchIdRef.current };
      let recVisit = null, recFacility = null, recNote = null, recTodo = null;

      if (visitFilled) {
        const visitFreeNote = (memoTarget === 'visit') ? memoText : '';
        payload.visit = {
          water_level_eval: eval1 || '',
          field2_eval: eval2 || '',
          stream_status: streamStatus || '',
          free_note: visitFreeNote,
          photo_url: photoUrls.p1 || '',
          field2_photo_url: photoUrls.p2 || ''
        };
        recVisit = {
          water_level_eval: eval1 || '', field2_eval: eval2 || '',
          stream_status: streamStatus || '', free_note: visitFreeNote,
          photos: (photoUrls.p1 ? 1 : 0) + (photoUrls.p2 ? 1 : 0)
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
        payload.note = { content: memoText, photo_url: photoUrls.memo || '' };
        recNote = { content: memoText, has_photo: !!photoUrls.memo };
      }
      if (todoText.trim()) {
        payload.todo = { content: todoText.trim(), due_date: todoDue || '' };
        recTodo = { content: todoText.trim(), due_date: todoDue || '' };
      }

      // 1回の POST でまとめて保存(再送されても batch_id で重複は弾かれる)
      const res = await api.addPost(payload, {
        onRetry: (n) => setProgress(`記録しています… 再試行 ${n} 回目`)
      });

      clearDraft();
      batchIdRef.current = null;
      uploadedRef.current = {};

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
      const uploadedCount = Object.keys(uploadedRef.current).length;
      const keep = uploadedCount
        ? `(写真 ${uploadedCount} 枚は送信済みなので、もう一度押しても上げ直しません)`
        : '';
      setError(`送信できませんでした。${err.message}${keep}`);
      setFailed(true);
    } finally {
      setSubmitting(false);
      setProgress('');
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

          ${offline && html`
            <div class="compose-banner compose-banner-warn">
              いま圏外です。電波の届く場所で「記す」を押してください(入力は消えません)
            </div>
          `}
          ${draftRestored && html`
            <div class="compose-banner">
              書きかけを復元しました
              ${keptPhotos > 0
                ? html`(送信済みの写真 ${keptPhotos} 枚もそのまま一緒に記録されます)`
                : html`(写真はもう一度選んでください)`}
            </div>
          `}

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
          ${submitting && progress && html`<div class="compose-progress">${progress}</div>`}

          <button class="btn-primary" onClick=${handleSubmit} disabled=${submitting}>
            ${submitting ? '送 信 中...' : (failed ? 'も う 一 度 送 る' : '記 す')}
          </button>
          ${failed && !submitting && html`
            <div class="compose-foot-hint">
              同じ内容を送り直しても、二重に記録されることはありません
            </div>
          `}

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
