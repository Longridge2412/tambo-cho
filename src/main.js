/**
 * 田んぼ帳 - エントリポイント
 *
 * ハッシュベースの簡易ルーティング。
 * 起動時はスプラッシュ(緑地ロゴ)を表示し、描画後に観音開きで閉じる。
 */

const { createElement: h, useState, useEffect } = React;
const { createRoot } = ReactDOM;

import { HomePage } from './pages/Home.js';
import { VisitPage } from './pages/Visit.js';
import { FacilityPage } from './pages/Facility.js';
import { NotesPage } from './pages/Notes.js';
import { HistoryPage } from './pages/History.js';
import { DutyPage } from './pages/Duty.js';

const html = htm.bind(h);

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  switch (route) {
    case '#/visit':
      return html`<${VisitPage} />`;
    case '#/facility':
      return html`<${FacilityPage} />`;
    case '#/notes':
      return html`<${NotesPage} />`;
    case '#/history':
      return html`<${HistoryPage} />`;
    case '#/duty':
      return html`<${DutyPage} />`;
    case '#/':
    default:
      return html`<${HomePage} />`;
  }
}

const root = createRoot(document.getElementById('root'));
root.render(h(App));

(function closeSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const MIN_SHOW = 1200;
  const start = window.__appStart || Date.now();
  const wait = Math.max(0, MIN_SHOW - (Date.now() - start));
  setTimeout(() => {
    splash.classList.add('open');
    setTimeout(() => splash.classList.add('gone'), 750);
  }, wait);
})();
