/**
 * ボトムナビ(ピル型 + FAB 分離)
 *
 * 配置:
 *   左下に大きめの朱色「+」FAB(独立)
 *   右下に白い角丸ピル(3アイコン:家/Todo/カレンダー)
 */

const { createElement: h } = React;
const html = htm.bind(h);

const TABS = [
  { route: '#/',         label: 'ホーム',     symbol: '家' },
  { route: '#/todo',     label: 'Todo',       symbol: '✓' },
  { route: '#/calendar', label: 'カレンダー', symbol: '田' }
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
            <div class="navp-sym">${t.symbol}</div>
          </a>
        `)}
      </nav>
    </div>
  `;
}
