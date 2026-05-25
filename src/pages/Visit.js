/**
 * 見回り記録画面
 *
 * 田んぼ2枚(三畝・一反)それぞれに写真と水位を記録。
 * カイヌマ疎水の状態・自由メモは共通。
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { compressImageToDataUrl, getCurrentPeriod, buildVisitShareText, copyToClipboard } from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

const MORNING_TASKS = [
  '水量チェック(目安:苗半分)',
  '足りなければ堤開け・水入れ',
  '堤は必ず閉める(掛矢を使う)',
  '水口も閉める(勝手に水が入らないように)',
  '水口・落し口の決壊や崩れチェック',
  '崩れていたら泥で適宜修復',
  '適宜、畔まわり・田んぼ内の草刈り'
];

const EVENING_TASKS = [
  '水量チェック',
  '足りなければ水入れ、または次の当番に連絡',
  '※水入れは基本日中、日暮れ後は止めるが原則'
];

export function VisitPage() {
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [eval1, setEval1] = useState('適');
  const [eval2, setEval2] = useState('適');
  const [streamStatus, setStreamStatus] = useState('通常');
  const [freeNote, setFreeNote] = useState('');
  const [photoFile1, setPhotoFile1] = useState(null);
  const [photoPreview1, setPhotoPreview1] = useState(null);
  const [photoFile2, setPhotoFile2] = useState(null);
  const [photoPreview2, setPhotoPreview2] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);

  const period = getCurrentPeriod();

  useEffect(() => {
    api.listMembers()
      .then(data => { setMembers(data); setMembersLoading(false); })
      .catch(err => { setError(`メンバー取得失敗: ${err.message}`); setMembersLoading(false); });
  }, []);

  const handlePhoto = (field, e) => {
    const file = e.target.files[0];
    const setFile = field === 1 ? setPhotoFile1 : setPhotoFile2;
    const setPrev = field === 1 ? setPhotoPreview1 : setPhotoPreview2;
    if (!file) { setFile(null); setPrev(null); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPrev(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!memberId) {
      setError('名前を選んでください');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let photo1 = null, photo2 = null;
      if (photoFile1) photo1 = await compressImageToDataUrl(photoFile1);
      if (photoFile2) photo2 = await compressImageToDataUrl(photoFile2);

      const visit = await api.addVisit({
        member_id: memberId,
        water_level_eval: eval1,
        field2_eval: eval2,
        stream_status: streamStatus,
        free_note: freeNote,
        photo_data_url: photo1,
        field2_photo_data_url: photo2
      });

      const memberName = members.find(m => m.member_id === memberId)?.display_name || '?';
      const shareText = buildVisitShareText(visit, memberName);
      setSubmitted({ visit, shareText, memberName });
    } catch (err) {
      setError(`送信失敗: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return html`<${SubmittedView} data=${submitted} onReset=${() => {
      setSubmitted(null);
      setPhotoFile1(null); setPhotoPreview1(null);
      setPhotoFile2(null); setPhotoPreview2(null);
      setFreeNote('');
    }} />`;
  }

  const fieldBlock = (field, label, evalVal, setEval, preview) => html`
    <div class="field-block">
      <div class="field-block-head">${label}</div>
      <div class="form-group">
        <div class="f-label">水 位 の 写 真 <span class="f-hint">稲と定規を当てて</span></div>
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
      <div class="form-group">
        <div class="f-label">水 位</div>
        <div class="toggle-group">
          ${['高', '適', '低'].map(opt => html`
            <button key=${opt} type="button"
              class=${`toggle-btn ${evalVal === opt ? 'active' : ''}`}
              onClick=${() => setEval(opt)}>${opt}</button>
          `)}
        </div>
      </div>
    </div>
  `;

  return html`
    <div class="screen">
      <${Header} title="見 回 り" subtitle="行ってきたら 簡単に記す" />

      <main class="screen-body">

        <section class="tasks-card">
          <div class="tasks-head">
            <span class="tasks-period ${period}">
              ${period === 'morning' ? '朝のしごと' : period === 'evening' ? '夕のしごと' : 'やること'}
            </span>
            <span class="tasks-meta">参考メモ・任意</span>
          </div>
          <ul class="tasks-list">
            ${(period === 'evening' ? EVENING_TASKS : MORNING_TASKS).map((t, i) => html`
              <li key=${i}>${t}</li>
            `)}
          </ul>
        </section>

        <section class="form-section">

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

          ${fieldBlock(1, '三 畝 の 田', eval1, setEval1, photoPreview1)}
          ${fieldBlock(2, '一 反 の 田', eval2, setEval2, photoPreview2)}

          <div class="form-group">
            <div class="f-label">カ イ ヌ マ 疎 水</div>
            <div class="toggle-group">
              ${['通常', '弱い', 'ほぼなし'].map(opt => html`
                <button key=${opt} type="button"
                  class=${`toggle-btn ${streamStatus === opt ? 'active' : ''}`}
                  onClick=${() => setStreamStatus(opt)}>${opt}</button>
              `)}
            </div>
          </div>

          <div class="form-group">
            <div class="f-label">自 由 メ モ <span class="f-hint">任意</span></div>
            <textarea
              class="f-input f-textarea"
              value=${freeNote}
              onChange=${e => setFreeNote(e.target.value)}
              placeholder=${`例:\n・田んぼの状態(水位適、稲は元気)\n・やったこと(堤開けて水入れた)\n・健さんや集落から(水路掃除が来週)\n・懸念(南東の畔が崩れそう)`}
            />
          </div>

          ${error && html`<div class="form-error">${error}</div>`}

          <button class="btn-primary" onClick=${handleSubmit} disabled=${submitting}>
            ${submitting ? '送 信 中...' : '記 す'}
          </button>

        </section>

      </main>

      <${BottomNav} current="#/visit" />
    </div>
  `;
}

function SubmittedView({ data, onReset }) {
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
      <${Header} title="記 録 完 了" />

      <main class="screen-body">
        <section class="success-card">
          <div class="success-mark">了</div>
          <div class="success-text">
            ${data.memberName} の見回り記録を<br/>
            田んぼ帳に記しました
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
          <button class="btn-ghost" onClick=${onReset}>続けて記録する</button>
        </div>
      </main>

      <${BottomNav} current="#/visit" />
    </div>
  `;
}
