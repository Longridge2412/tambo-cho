/**
 * 画面ヘッダー
 */

const { createElement: h } = React;
const html = htm.bind(h);

import { formatJapaneseDate } from '../utils.js';

export function Header({ title, subtitle, showDate = true }) {
  const dateStr = showDate ? formatJapaneseDate(new Date()) : null;

  return html`
    <header class="screen-header">
      <div class="header-row">
        <div class="h-title">${title}</div>
        ${dateStr && html`<div class="h-meta">${dateStr}</div>`}
      </div>
      ${subtitle && html`<div class="header-sub">${subtitle}</div>`}
      <div class="header-divider"></div>
    </header>
  `;
}
