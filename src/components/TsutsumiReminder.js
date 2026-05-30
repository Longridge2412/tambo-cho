/**
 * 堤「開けたまま」リマインダーカード(独立コンポーネント)
 *
 * props:
 *   - items: 開けっぱの operation 配列 (ctx.pending_tsutsumi)
 *   - members: 「あなた」selector 用のメンバー配列
 *   - operatorId / onOperatorChange: 現在の操作者
 *   - onClose(opId): 「閉めた」ボタンタップ時の Promise を返すハンドラ
 */

const { createElement: h, useState } = React;
const html = htm.bind(h);

import { formatShort, formatElapsed } from '../utils.js';

export function TsutsumiReminder({ items, members, operatorId, onOperatorChange, onClose }) {
  const [closingOpId, setClosingOpId] = useState('');

  if (!items || items.length === 0) return null;

  const handleClose = async (opId) => {
    if (!operatorId) return;  // 親側で flash 想定
    setClosingOpId(opId);
    try { await onClose(opId); } finally { setClosingOpId(''); }
  };

  return html`
    <section class="reminder-card">
      <div class="reminder-head">
        <div class="reminder-mark">堤</div>
        <div class="reminder-label">開 け た ま ま</div>
      </div>
      <div class="reminder-body">
        ${items.map(op => html`
          <div class="reminder-row" key=${op.op_id}>
            <div class="reminder-row-info">
              <span class="reminder-by">${op.display_name}</span>
              <span class="reminder-time">${formatShort(op.operated_at)}</span>
              <span class="reminder-elapsed">${formatElapsed(op.operated_at)}</span>
            </div>
            <button class="reminder-close-btn"
              disabled=${closingOpId === op.op_id || !operatorId}
              onClick=${() => handleClose(op.op_id)}>
              ${closingOpId === op.op_id ? '送信中…' : '閉めた'}
            </button>
          </div>
        `)}
      </div>
      <div class="reminder-operator">
        <span class="reminder-operator-label">あなた</span>
        <select class="reminder-operator-select"
          value=${operatorId} onChange=${e => onOperatorChange(e.target.value)}>
          <option value="">── 選択 ──</option>
          ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
        </select>
      </div>
    </section>
  `;
}
