/**
 * 下部ナビゲーション(漢字単字)
 *
 * Step 2 完了:全6画面が稼働。
 */

const { createElement: h } = React;
const html = htm.bind(h);

const ITEMS = [
  { route: '#/',       kanji: '帳', label: '今日',    enabled: true },
  { route: '#/visit',  kanji: '見', label: '見回り',  enabled: true },
  { route: '#/facility', kanji: '水', label: '設備',  enabled: true },
  { route: '#/duty',   kanji: '番', label: '当番',    enabled: true },
  { route: '#/notes',  kanji: '覚', label: '覚書',    enabled: true },
  { route: '#/history',kanji: '綴', label: '綴り',    enabled: true }
];

export function BottomNav({ current }) {
  return html`
    <nav class="bottom-nav">
      ${ITEMS.map(item => html`
        <a key=${item.route}
           href=${item.route}
           class=${`nav-item ${current === item.route ? 'active' : ''}`}>
          <div class="nav-kanji">${item.kanji}</div>
          <div class="nav-label">${item.label}</div>
        </a>
      `)}
    </nav>
  `;
}
