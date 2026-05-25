/**
 * 田んぼ帳 - エントリポイント
 *
 * ハッシュベースの簡易ルーティング。
 * 認証なしのオープン構成なのでルートガードも不要。
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
