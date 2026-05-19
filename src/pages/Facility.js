/**
 * 共用設備操作画面
 *
 * 構成:
 *   - 操作対象トグル(じょうご/三つ又/その他)
 *   - じょうご → 開けた/閉めた
 *   - 「開けた」選択時の控えめな注意喚起
 *   - 「閉めた」選択時の対応(paired_op_id)選択
 *   - 理由、調整・申し送り
 *   - 送信後の LINE 共有テキスト
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import {
  compressImageToDataUrl,
  buildFacilityShareText,
  copyToClipboard,
  formatShort
} from '../utils.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

export function FacilityPage() {
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [target, setTarget] = useState('じょうご');     // じょうご / 三つ又 / その他
  const [action, setAction] = useState('開けた');        // 開けた / 閉めた(じょうご時)
  const [pairedOpId, setPairedOpId] = useState('');     // 閉めた時に紐付ける op_id
  const [otherActionText, setOtherActionText] = useState('');
  const [reason, setReason] = useState('');
  const [coordinationNote, setCoordinationNote] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [openJoUgoList, setOpenJoUgoList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);

  // メンバー一覧
  useEffect(() => {
    api.listMembers()
      .then(setMembers)
      .catch(err => setError(`メンバー取得失敗: ${err.message}`));
  }, []);

  // 「閉めた」を選んだ時に「未完了の開けた」を取得
  useEffect(() => {
    if (target === 'じょうご' && action === '閉めた') {
      api.listFacilityOps({ limit: 100 })
        .then(ops => {
          // 既に「閉めた」が紐付けている paired_op_id を集合化
          const pairedSet = new Set(
            ops
              .filter(o => o.target === 'じょうご' && o.action === '閉めた' && o.paired_op_id)
              .map(o => o.paired_op_id)
          );
          // 「開けた」のうち、ペアリングされていないものを抽出(新しい順)
          const opens = ops
            .filter(o => o.target === 'じょうご' && o.action === '開けた' && !pairedSet.has(o.op_id))
            .sort((a, b) => (b.operated_at || '').localeCompare(a.operated_at || ''));
          // メンバー名を付与
          const memberMap = {};
          members.forEach(m => { memberMap[m.member_id] = m.display_name; });
          setOpenJoUgoList(opens.map(o => ({ ...o, display_name: memberMap[o.member_id] || '?' })));
        })
        .catch(err => setError(`未完了一覧の取得失敗: ${err.message}`));
    } else {
      setOpenJoUgoList([]);
      setPairedOpId('');
    }
  }, [target, action, members]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) { setPhotoFile(null); setPhotoPreview(null); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!memberId) {
      setError('名前を選んでください');
      return;
    }
    if (target === 'じょうご' && action === '閉めた' && openJoUgoList.length > 0 && !pairedOpId) {
      setError('どの「開けた」に対応するか選んでください');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      let photoDataUrl = null;
      if (photoFile) {
        photoDataUrl = await compressImageToDataUrl(photoFile);
      }

      // 実際の action 値:じょうごは「開けた/閉めた」、他は自由テキストか「その他」
      const actualAction = (target === 'じょうご')
        ? action
        : (otherActionText.trim() || 'その他');

      const op = await api.addFacilityOp({
        member_id: memberId,
        target,
        action: actualAction,
        photo_data_url: photoDataUrl,
        reason: reason.trim(),
        coordination_note: coordinationNote.trim(),
        paired_op_id: pairedOpId
      });

      const memberName = members.find(m => m.member_id === memberId)?.display_name || '?';
      const pairedOp = pairedOpId ? openJoUgoList.find(o => o.op_id === pairedOpId) : null;
      const shareText = buildFacilityShareText(op, memberName, pairedOp);

      setSubmitted({ op, shareText, memberName });
    } catch (err) {
      setError(`送信失敗: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return html`<${SubmittedView} data=${submitted} onReset=${() => {
      setSubmitted(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setReason('');
      setCoordinationNote('');
      setOtherActionText('');
      setPairedOpId('');
      setAction('開けた');
    }} />`;
  }

  return html`
    <div class="screen">
      <${Header} title="樋" subtitle="共用設備の操作を 記す" />

      <main class="screen-body">

        <section class="form-section">

          <div class="form-group">
            <div class="f-label">名 前</div>
            <select class="f-input f-select" value=${memberId} onChange=${e => setMemberId(e.target.value)}>
              <option value="">── 選択 ──</option>
              ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
            </select>
          </div>

          <div class="form-group">
            <div class="f-label">何 を 操 作 し た か</div>
            <div class="toggle-group">
              ${['じょうご', '三つ又', 'その他'].map(opt => html`
                <button key=${opt} type="button"
                  class=${`toggle-btn ${target === opt ? 'active' : ''}`}
                  onClick=${() => { setTarget(opt); setAction(opt === 'じょうご' ? '開けた' : '開けた'); }}>${opt}</button>
              `)}
            </div>
          </div>

          ${target === 'じょうご' && html`
            <div class="form-group">
              <div class="f-label">ど う し た</div>
              <div class="toggle-group">
                ${['開けた', '閉めた'].map(opt => html`
                  <button key=${opt} type="button"
                    class=${`toggle-btn ${action === opt ? 'active' : ''}`}
                    onClick=${() => setAction(opt)}>${opt}</button>
                `)}
              </div>
              ${action === '開けた' && html`
                <div class="hint-soft">・ ・ ・   後で じょうごを 閉めるのを 忘れずに   ・ ・ ・</div>
              `}
              ${action === '閉めた' && html`
                <div class="paired-section">
                  <div class="paired-label">どの「開けた」を 閉めますか</div>
                  ${openJoUgoList.length === 0
                    ? html`<div class="paired-empty">「開けたまま」の記録がありません</div>`
                    : openJoUgoList.map(o => html`
                      <button key=${o.op_id} type="button"
                        class=${`paired-item ${pairedOpId === o.op_id ? 'active' : ''}`}
                        onClick=${() => setPairedOpId(o.op_id)}>
                        <div class="paired-by">${o.display_name}</div>
                        <div class="paired-time">${formatShort(o.operated_at)}</div>
                        ${o.reason && html`<div class="paired-reason">${o.reason}</div>`}
                      </button>
                    `)
                  }
                </div>
              `}
            </div>
          `}

          ${target !== 'じょうご' && html`
            <div class="form-group">
              <div class="f-label">操 作 内 容 <span class="f-hint">任意</span></div>
              <input type="text" class="f-input"
                value=${otherActionText}
                onChange=${e => setOtherActionText(e.target.value)}
                placeholder=${target === '三つ又' ? '例:こちら側に向けた' : '例:水路の砂を除けた'}/>
            </div>
          `}

          <div class="form-group">
            <div class="f-label">写 真 <span class="f-hint">${target === '三つ又' ? '残しておくと共有しやすい' : '任意'}</span></div>
            ${photoPreview
              ? html`
                <div class="photo-preview" onClick=${() => document.getElementById('photo-input').click()}>
                  <img src=${photoPreview} alt="プレビュー"/>
                  <div class="photo-preview-overlay">タップで変更</div>
                </div>
              `
              : html`
                <label class="photo-up" for="photo-input">
                  <div class="photo-up-icon">+</div>
                  <div class="photo-up-label">撮 影 す る</div>
                  <div class="photo-up-hint">またはアルバムから</div>
                </label>
              `
            }
            <input id="photo-input" type="file" accept="image/*" capture="environment"
              onChange=${handlePhotoChange} style=${{display: 'none'}}/>
          </div>

          <div class="form-group">
            <div class="f-label">理 由 <span class="f-hint">任意</span></div>
            <input type="text" class="f-input"
              value=${reason}
              onChange=${e => setReason(e.target.value)}
              placeholder="例:小川が細っていたため"/>
          </div>

          <div class="form-group">
            <div class="f-label">調 整 ・ 申 し 送 り <span class="f-hint">任意</span></div>
            <textarea class="f-input f-textarea"
              value=${coordinationNote}
              onChange=${e => setCoordinationNote(e.target.value)}
              placeholder=${`例:\n・健さんに一声かけた\n・明朝の当番に伝えておく`}/>
          </div>

          ${error && html`<div class="form-error">${error}</div>`}

          <button class="btn-primary" onClick=${handleSubmit} disabled=${submitting}>
            ${submitting ? '送 信 中...' : '記 す'}
          </button>

        </section>

      </main>

      <${BottomNav} current="#/facility" />
    </div>
  `;
}

// 送信完了画面
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
            ${data.memberName} の共用設備操作を<br/>
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

      <${BottomNav} current="#/facility" />
    </div>
  `;
}
