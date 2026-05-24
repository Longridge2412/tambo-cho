/**
 * 下部ナビゲーション(漢字単字)
 *
 * Step 2 で「樋(設備)」「覚(覚書)」を有効化。
 */

const { createElement: h } = React;
const html = htm.bind(h);

const ITEMS = [
  { route: '#/',       kanji: '帳', label: '今日',    enabled: true },
  { route: '#/visit',  kanji: '見', label: '見回り',  enabled: true },
  { route: '#/facility', kanji: '樋', label: '設備',  enabled: true },
  { route: '#/duty',   kanji: '番', label: '当番',    enabled: false },
  { route: '#/notes',  kanji: '覚', label: '覚書',    enabled: true },
  { route: '#/history',kanji: '綴', label: '綴り',    enabled: false }
];

export function BottomNav({ current }) {
  const handleClick = (item, e) => {
    if (!item.enabled) {
      e.preventDefault();
      alert('この画面は今後のステップで実装します');
    }
  };

  return html`
    <nav class="bottom-nav">
      ${ITEMS.map(item => html`
        <a key=${item.route}
           href=${item.route}
           onClick=${(e) => handleClick(item, e)}
           class=${`nav-item ${current === item.route ? 'active' : ''} ${!item.enabled ? 'disabled' : ''}`}>
          <div class="nav-kanji">${item.kanji}</div>
          <div class="nav-label">${item.label}</div>
        </a>
      `)}
    </nav>
  `;
}
