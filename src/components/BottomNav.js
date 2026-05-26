/**
 * ボトムナビゲーション
 *
 * 3タブ + 中央フローティング「+」ボタン構成。
 *   ホーム / Todo / カレンダー
 *   中央の「+」は共有フォーム(#/compose)へ
 */

const { createElement: h } = React;
const html = htm.bind(h);

const TABS = [
  { route: '#/',         label: 'ホーム',     symbol: '宀' },
  { route: '#/todo',     label: 'Todo',       symbol: '✓' },
  { route: '#/calendar', label: 'カレンダー', symbol: '田' }
];

export function BottomNav({ current }) {
  return html`
    <nav class="bottom-nav-v2">
      <a href=${TABS[0].route}
         class=${`navv2-item ${current === TABS[0].route ? 'active' : ''}`}>
        <div class="navv2-sym">${TABS[0].symbol}</div>
        <div class="navv2-label">${TABS[0].label}</div>
      </a>
      <a href=${TABS[1].route}
         class=${`navv2-item ${current === TABS[1].route ? 'active' : ''}`}>
        <div class="navv2-sym">${TABS[1].symbol}</div>
        <div class="navv2-label">${TABS[1].label}</div>
      </a>
      <a href="#/compose"
         class=${`navv2-fab ${current === '#/compose' ? 'active' : ''}`}
         aria-label="共有">
        <div class="navv2-fab-plus">＋</div>
      </a>
      <a href=${TABS[2].route}
         class=${`navv2-item ${current === TABS[2].route ? 'active' : ''}`}>
        <div class="navv2-sym">${TABS[2].symbol}</div>
        <div class="navv2-label">${TABS[2].label}</div>
      </a>
      <div class="navv2-spacer"></div>
    </nav>
  `;
}
