/**
 * 田んぼ帳 - エントリポイント
 *
 * ハッシュベースの簡易ルーティング。
 * 起動時のスプラッシュ(白地 NEO百ロゴ)は index.html 側の closeSplash で閉じる。
 */

const { createElement: h, useState, useEffect } = React;
const { createRoot } = ReactDOM;

import { HomePage } from './pages/Home.js';
import { ComposePage } from './pages/Compose.js';
import { TodoPage } from './pages/Todo.js';
import { CalendarPage } from './pages/Calendar.js';

const html = htm.bind(h);

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  switch (route) {
    case '#/compose':
      return html`<${ComposePage} />`;
    case '#/todo':
      return html`<${TodoPage} />`;
    case '#/calendar':
      return html`<${CalendarPage} />`;
    case '#/':
    default:
      return html`<${HomePage} />`;
  }
}

const root = createRoot(document.getElementById('root'));
root.render(h(App));
