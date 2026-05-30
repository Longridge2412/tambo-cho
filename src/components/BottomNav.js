/**
 * ボトムナビ(ピル型 + FAB 分離)
 *
 * 左下に大きめの朱色「+」FAB(独立)、右下に白い角丸ピル(3 SVGアイコン)
 */

const { createElement: h } = React;
const html = htm.bind(h);

// SVG アイコン(モジュールロード時に1度だけ生成)
const ICONS = {
  home: html`
    <svg viewBox="0 0 24 24" class="navp-svg" fill="none"
      stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 11 L12 3 L21 11 L21 20 L14 20 L14 14 L10 14 L10 20 L3 20 Z"/>
    </svg>
  `,
  todo: html`
    <svg viewBox="0 0 24 24" class="navp-svg" fill="none"
      stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <polyline points="4 12 10 18 20 6"/>
    </svg>
  `,
  calendar: html`
    <svg viewBox="0 0 24 24" class="navp-svg" fill="none"
      stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="1.5"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="3" x2="8" y2="7"/>
      <line x1="16" y1="3" x2="16" y2="7"/>
    </svg>
  `
};

const TABS = [
  { route: '#/',         icon: 'home',     label: 'ホーム' },
  { route: '#/todo',     icon: 'todo',     label: 'Todo' },
  { route: '#/calendar', icon: 'calendar', label: 'カレンダー' }
];

export function BottomNav({ current }) {
  return html`
    <div class="bottom-zone">
      <a href="#/compose"
         class=${`navp-fab ${current === '#/compose' ? 'active' : ''}`}
         aria-label="共有">
        <div class="navp-fab-plus">＋</div>
      </a>
      <nav class="navp-pill">
        ${TABS.map(t => html`
          <a key=${t.route} href=${t.route}
             class=${`navp-item ${current === t.route ? 'active' : ''}`}
             aria-label=${t.label}>
            ${ICONS[t.icon]}
          </a>
        `)}
      </nav>
    </div>
  `;
}
