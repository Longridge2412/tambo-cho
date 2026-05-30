/**
 * 田んぼ帳 - エントリポイント
 *
 * ハッシュベースの簡易ルーティング。
 * 起動時はスプラッシュ(白地 NEO百ロゴ)を表示し、描画後に観音開きで閉じる。
 */

const { createElement: h, useState, useEffect } = React;
const { createRoot } = ReactDOM;

import { HomePage } from './pages/Home.js';
import { ComposePage } from './pages/Compose.js';
import { TodoPage } from './pages/Todo.js';
import { CalendarPage } from './pages/Calendar.js';
// 旧画面(直URLで残す。新ナビからは見えない)
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
    case '#/compose':
      return html`<${ComposePage} />`;
    case '#/todo':
      return html`<${TodoPage} />`;
    case '#/calendar':
      return html`<${CalendarPage} />`;
    // 旧URL互換(新ナビからは見えない)
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

